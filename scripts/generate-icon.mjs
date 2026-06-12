// Gera o ícone do app proceduralmente: triângulo do Bill com olho no centro
// e fogo azul ao redor. Sem dependências externas — PNG e ICO escritos na mão.
// Saída: build/icon.png (512, Linux) e build/icon.ico (256..16, Windows).
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'build')
const BASE = 1024

// ---------------------------------------------------------------- arte

// Coordenadas normalizadas [0,1], y para baixo
const TRI = [
  [0.5, 0.3],
  [0.18, 0.84],
  [0.82, 0.84]
]
const CENTER = [0.5, 0.66]
const EYE = { cx: 0.5, cy: 0.615, rx: 0.115, ry: 0.072 }
const PUPIL = { rx: 0.02, ry: 0.046 }

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// distância assinada ao triângulo (negativa dentro)
function sdTriangle(px, py) {
  let d = Infinity
  let s = 1
  for (let i = 0, j = 2; i < 3; j = i++) {
    const [vix, viy] = TRI[i]
    const [vjx, vjy] = TRI[j]
    const ex = vjx - vix
    const ey = vjy - viy
    const wx = px - vix
    const wy = py - viy
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
    const bx = wx - ex * t
    const by = wy - ey * t
    d = Math.min(d, bx * bx + by * by)
    const c0 = py >= viy
    const c1 = py < vjy
    const c2 = ex * wy > ey * wx
    if ((c0 && c1 && c2) || (!c0 && !c1 && !c2)) s = -s
  }
  return s * Math.sqrt(d)
}

// comprimento das labaredas em função do ângulo (senos com fases fixas = determinístico)
function flameLen(theta, d) {
  const th = theta + 0.2 * Math.sin(theta * 2 + d * 30)
  const n =
    0.55 * Math.sin(th * 3 + 1.7) +
    0.45 * Math.sin(th * 7 + 0.3) +
    0.3 * Math.sin(th * 13 + 4.1) +
    0.2 * Math.sin(th * 23 + 2.2)
  const n01 = clamp(0.5 + n / 2.2, 0, 1)
  return 0.045 + 0.115 * Math.pow(n01, 1.5)
}

// rampa de cor do fogo: t=0 ponta da chama, t=1 colado no triângulo
const FIRE_STOPS = [
  [0.0, [16, 38, 130]],
  [0.3, [28, 88, 220]],
  [0.55, [70, 170, 255]],
  [0.8, [165, 235, 255]],
  [1.0, [242, 252, 255]]
]
function fireColor(t) {
  for (let i = 1; i < FIRE_STOPS.length; i++) {
    if (t <= FIRE_STOPS[i][0]) {
      const [t0, c0] = FIRE_STOPS[i - 1]
      const [t1, c1] = FIRE_STOPS[i]
      return mix(c0, c1, (t - t0) / (t1 - t0))
    }
  }
  return FIRE_STOPS[FIRE_STOPS.length - 1][1]
}

// cor RGBA de um ponto (x, y) em [0,1]
function shade(x, y) {
  const d = sdTriangle(x, y)

  if (d > 0) {
    // fora do triângulo: fogo + brilho
    const theta = Math.atan2(y - CENTER[1], x - CENTER[0])
    const len = flameLen(theta, d)
    const t = 1 - d / len
    if (t > 0) {
      const c = fireColor(clamp(t, 0, 1))
      return [c[0], c[1], c[2], 255 * clamp(t * 2, 0, 1)]
    }
    const glow = 1 - d / (len * 1.7)
    if (glow > 0) return [60, 140, 255, glow * glow * 70]
    return [0, 0, 0, 0]
  }

  // corpo do triângulo: gradiente amarelo → âmbar
  let col = mix([255, 226, 110], [235, 158, 38], smoothstep(0.3, 0.84, y))

  // tijolos na parte de baixo (abaixo do olho), como o Bill
  if (y > 0.665) {
    const rowH = 0.045
    const row = Math.floor((y - 0.665) / rowH)
    const fy = (y - 0.665) % rowH
    if (fy < 0.0055) {
      col = col.map((c) => c * 0.84)
    } else {
      const seamW = 0.085
      const off = row % 2 ? seamW / 2 : 0
      const fx = (((x + off) % seamW) + seamW) % seamW
      if (fx < 0.0045) col = col.map((c) => c * 0.87)
    }
  }

  // contorno escuro do triângulo
  col = mix(col, [62, 38, 10], smoothstep(-0.014, -0.005, d) * 0.92)

  // olho central com pupila em fenda vertical
  const ex = (x - EYE.cx) / EYE.rx
  const ey = (y - EYE.cy) / EYE.ry
  const q = ex * ex + ey * ey
  if (q < 1.32) {
    if (q < 1) {
      col = [252, 250, 240]
      const px = (x - EYE.cx) / PUPIL.rx
      const py = (y - EYE.cy) / PUPIL.ry
      const pq = px * px + py * py
      if (pq < 1) col = [22, 16, 12]
      else if (pq < 1.6) col = mix([22, 16, 12], col, smoothstep(1, 1.6, pq))
    } else {
      col = mix(col, [40, 26, 8], smoothstep(1.32, 1.1, q))
    }
  }

  return [col[0], col[1], col[2], 255]
}

// renderiza com supersampling 2x2, acumulando em alfa pré-multiplicado
function render(size) {
  const px = new Uint8Array(size * size * 4)
  const offsets = [0.25, 0.75]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (const oy of offsets) {
        for (const ox of offsets) {
          const s = shade((x + ox) / size, (y + oy) / size)
          const sa = s[3] / 255
          r += s[0] * sa
          g += s[1] * sa
          b += s[2] * sa
          a += sa
        }
      }
      const i = (y * size + x) * 4
      if (a > 0) {
        px[i] = Math.round(r / a)
        px[i + 1] = Math.round(g / a)
        px[i + 2] = Math.round(b / a)
      }
      px[i + 3] = Math.round((a / 4) * 255)
    }
  }
  return px
}

// redução por média de área (suporta razões não inteiras), em alfa pré-multiplicado
function downscale(src, sw, dw) {
  const dst = new Uint8Array(dw * dw * 4)
  const r = sw / dw
  for (let dy = 0; dy < dw; dy++) {
    const y0 = dy * r
    const y1 = y0 + r
    for (let dx = 0; dx < dw; dx++) {
      const x0 = dx * r
      const x1 = x0 + r
      let R = 0
      let G = 0
      let B = 0
      let A = 0
      let W = 0
      for (let sy = Math.floor(y0); sy < y1; sy++) {
        const hy = Math.min(sy + 1, y1) - Math.max(sy, y0)
        for (let sx = Math.floor(x0); sx < x1; sx++) {
          const w = (Math.min(sx + 1, x1) - Math.max(sx, x0)) * hy
          const i = (sy * sw + sx) * 4
          const sa = src[i + 3] / 255
          R += src[i] * sa * w
          G += src[i + 1] * sa * w
          B += src[i + 2] * sa * w
          A += sa * w
          W += w
        }
      }
      const j = (dy * dw + dx) * 4
      if (A > 0) {
        dst[j] = Math.round(R / A)
        dst[j + 1] = Math.round(G / A)
        dst[j + 2] = Math.round(B / A)
      }
      dst[j + 3] = Math.round((A / W) * 255)
    }
  }
  return dst
}

// ---------------------------------------------------------------- PNG/ICO

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y++) {
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ICO com entradas PNG (suportado do Vista em diante)
function encodeICO(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = []
  for (const { size, data } of images) {
    const e = Buffer.alloc(16)
    e[0] = size === 256 ? 0 : size
    e[1] = size === 256 ? 0 : size
    e.writeUInt16LE(1, 4) // planos
    e.writeUInt16LE(32, 6) // bits por pixel
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    entries.push(e)
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

// ---------------------------------------------------------------- main

mkdirSync(OUT_DIR, { recursive: true })

const base = render(BASE)
const at = (size) => (size === BASE ? base : downscale(base, BASE, size))

writeFileSync(join(OUT_DIR, 'icon.png'), encodePNG(at(512), 512))

const icoSizes = [256, 128, 64, 48, 32, 16]
writeFileSync(
  join(OUT_DIR, 'icon.ico'),
  encodeICO(icoSizes.map((size) => ({ size, data: encodePNG(at(size), size) })))
)

console.log('build/icon.png e build/icon.ico gerados')
