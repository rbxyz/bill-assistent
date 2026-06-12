import { useEffect, useMemo, useState } from 'react'

/**
 * DinoSprite — o dinossauro do "sem internet" do Chrome, em pixel art.
 * Grade 22×22, virado para a direita (o Pet.tsx espelha quando anda à esquerda).
 *
 * Poses:
 *  - stand : parado (usado também no "segurar", onde ele fica estático e pisca)
 *  - runA/runB : caminhada (pernas alternam)
 *  - jump : pernas recolhidas (pulo / queda)
 *
 * Modo fúria = vira um "Godzilla": corpo verde, espinhos dorsais, olho vermelho,
 * cospe fogo pelo focinho e solta raios em volta (tudo animado por um tick fx).
 */

export type DinoPose = 'stand' | 'runA' | 'runB' | 'jump'

type DinoProps = {
  pose: DinoPose
  /** modo Godzilla (fúria por arremessos) */
  rage?: boolean
  /** segurado: fica estático (a piscada é interna, sempre ativa) */
  grabbed?: boolean
}

const W = 22
const H = 22
const SCALE = 2.5 // 22*2.5 = 55px

const COLORS: Record<string, string> = {
  G: '#535353', // corpo cinza (dino do Chrome)
  K: '#3a3a3a', // contorno/boca (cinza escuro)
  E: '#f7f7f7', // olho aberto
  // Godzilla
  V: '#3f7d3a', // verde do corpo
  D: '#2c5a2a', // verde escuro (boca/sombra)
  S: '#8fe06a', // espinhos dorsais
  R: '#ff4a32', // olho furioso
  F: '#ff8a1e', // fogo (laranja)
  Y: '#ffe24a', // fogo (amarelo)
  M: '#ff3b2f', // fogo (vermelho)
  L: '#9be8ff', // raio (ciano)
  N: '#ffffff' // raio (branco)
}

type Cell = string | null

// torso + cabeça + cauda como faixas [linha, colInício, colFim]
const SPANS: Array<[number, number, number]> = [
  [1, 14, 20],
  [2, 14, 20],
  [3, 14, 20],
  [4, 14, 20],
  [5, 14, 20],
  [6, 13, 21],
  [7, 9, 20],
  [8, 6, 20],
  [9, 4, 20],
  [10, 1, 19],
  [11, 0, 18],
  [12, 2, 17],
  [13, 4, 16],
  [14, 5, 15],
  [15, 6, 14]
]

function buildGrid(pose: DinoPose, rage: boolean, eyeClosed: boolean): Cell[][] {
  const g: Cell[][] = Array.from({ length: H }, () => Array<Cell>(W).fill(null))
  const put = (y: number, x: number, c: string): void => {
    if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c
  }
  const hl = (y: number, x1: number, x2: number, c: string): void => {
    for (let x = x1; x <= x2; x++) put(y, x, c)
  }
  const body = rage ? 'V' : 'G'

  for (const [y, l, r] of SPANS) hl(y, l, r, body)
  // braço curto na frente-baixo
  put(12, 18, body)
  put(13, 18, body)
  put(13, 19, body)

  // pernas conforme a pose
  if (pose === 'jump') {
    put(16, 7, body); put(17, 6, body); put(18, 6, body)
    put(16, 12, body); put(17, 13, body); put(18, 14, body)
  } else if (pose === 'runA') {
    for (let y = 16; y <= 21; y++) put(y, 7, body)
    put(21, 8, body)
    put(16, 12, body); put(17, 12, body); put(18, 13, body)
  } else if (pose === 'runB') {
    put(16, 7, body); put(17, 7, body); put(18, 8, body)
    for (let y = 16; y <= 21; y++) put(y, 12, body)
    put(21, 13, body)
  } else {
    for (let y = 16; y <= 21; y++) {
      put(y, 7, body)
      put(y, 12, body)
    }
    put(21, 8, body); put(21, 13, body)
  }

  // boca (sombra sob o focinho)
  put(6, 20, rage ? 'D' : 'K')
  put(6, 21, rage ? 'D' : 'K')

  // olho
  if (eyeClosed) {
    hl(3, 17, 19, rage ? 'D' : 'K')
  } else {
    put(3, 18, rage ? 'R' : 'E')
    if (rage) {
      put(2, 17, 'R')
      put(3, 17, 'R')
    }
  }

  // Godzilla: espinhos dorsais ao longo das costas
  if (rage) {
    const spine: Array<[number, number]> = [
      [6, 12],
      [7, 8],
      [8, 5],
      [9, 2],
      [10, 0]
    ]
    for (const [y, x] of spine) {
      put(y, x, 'S')
      put(y - 1, x, 'S')
    }
  }

  return g
}

type Run = { x: number; y: number; w: number; c: string }

function toRects(g: Cell[][]): Run[] {
  const out: Run[] = []
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      const c = g[y][x]
      if (!c) {
        x++
        continue
      }
      let w = 1
      while (x + w < W && g[y][x + w] === c) w++
      out.push({ x, y, w, c })
      x += w
    }
  }
  return out
}

// Sopro de fogo saindo do focinho (~x21,y5), avançando para a direita/cima.
// Coordenadas podem passar de W (renderizadas com overflow visível).
function fireCells(fx: number): Array<{ x: number; y: number; c: string }> {
  const ox = 21
  const oy = 6
  const base: Array<[number, number, string]> = [
    [1, 0, 'Y'],
    [2, 0, 'F'],
    [2, -1, 'F'],
    [3, 0, 'M'],
    [3, 1, 'F'],
    [4, 0, 'M'],
    [4, -1, 'F'],
    [5, 0, 'Y'],
    [5, 1, 'F'],
    [6, 0, 'F'],
    [6, 2, 'M'],
    [7, 1, 'F']
  ]
  const out = base.map(([dx, dy, c]) => ({
    x: ox + dx,
    y: oy + dy + ((fx + dx) % 3 === 0 ? -1 : 0),
    c
  }))
  if (fx % 2 === 0) {
    out.push({ x: ox + 7, y: oy, c: 'Y' }, { x: ox + 8, y: oy + 1, c: 'M' })
  } else {
    out.push({ x: ox + 6, y: oy - 1, c: 'F' }, { x: ox + 7, y: oy + 2, c: 'F' })
  }
  return out
}

// Raios em volta (zigue-zague vindo de cima), piscando com fx.
const BOLT_A: Array<[number, number]> = [[4, -3], [5, -1], [4, 1], [5, 3], [3, 4]]
const BOLT_B: Array<[number, number]> = [[24, -3], [23, -1], [24, 1], [23, 3], [25, 4]]

function lightningCells(fx: number): Array<{ x: number; y: number; c: string }> {
  const out: Array<{ x: number; y: number; c: string }> = []
  const phase = fx % 3
  if (phase !== 2) {
    for (const [x, y] of BOLT_A) {
      out.push({ x, y, c: 'N' })
      out.push({ x: x + 1, y, c: 'L' })
    }
  }
  if (phase !== 0) {
    for (const [x, y] of BOLT_B) {
      out.push({ x, y, c: 'N' })
      out.push({ x: x - 1, y, c: 'L' })
    }
  }
  return out
}

export function DinoSprite({ pose, rage = false, grabbed = false }: DinoProps): React.JSX.Element {
  const [eyeClosed, setEyeClosed] = useState(false)
  const [fx, setFx] = useState(0)

  // Piscada: a cada ~220ms, fecha o olho por um instante de tempos em tempos.
  useEffect(() => {
    const id = window.setInterval(() => {
      setEyeClosed((closed) => (closed ? false : Math.random() < 0.16))
    }, 220)
    return () => window.clearInterval(id)
  }, [])

  // Tick do fogo/raios só enquanto está em fúria.
  useEffect(() => {
    if (!rage) return
    const id = window.setInterval(() => setFx((f) => (f + 1) % 6), 110)
    return () => window.clearInterval(id)
  }, [rage])

  const rects = useMemo(() => toRects(buildGrid(pose, rage, eyeClosed)), [pose, rage, eyeClosed])
  const fire = rage ? fireCells(fx) : []
  const bolts = rage ? lightningCells(fx) : []

  return (
    <div
      style={{
        width: 54,
        height: 64,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 6
      }}
    >
      <svg
        width={W * SCALE}
        height={H * SCALE}
        viewBox={`0 0 ${W} ${H}`}
        shapeRendering="crispEdges"
        style={{ display: 'block', imageRendering: 'pixelated', overflow: 'visible' }}
      >
        {rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={COLORS[r.c]} />
        ))}
        {bolts.map((b, i) => (
          <rect key={`b${i}`} x={b.x} y={b.y} width={1} height={1} fill={COLORS[b.c]} />
        ))}
        {fire.map((f, i) => (
          <rect key={`f${i}`} x={f.x} y={f.y} width={1} height={1} fill={COLORS[f.c]} />
        ))}
      </svg>
    </div>
  )
}
