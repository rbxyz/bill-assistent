import { useMemo } from 'react'

export type SpriteState = {
  /** dangleA/B = pernas penduradas balançando (voo); tuck = encolhidas (agarrado/queda) */
  legs: 'dangleA' | 'dangleB' | 'tuck'
  eye: 'open' | 'closed'
  /** -1 olha à esquerda, 0 centro, 1 à direita */
  pupil: -1 | 0 | 1
  /** quanto a cartola sobe (0 a 2 pixels) */
  hatLift: 0 | 1 | 2
  /** 0 = braço abaixado, 1/2 = frames do aceno */
  wave: 0 | 1 | 2
  /** frames do fogo azul (flicker) */
  aura: 1 | 2
  /** pose de agarrado: braços para cima, pupila pequena */
  grabbed: boolean
}

// Grid de pixel art: cada célula vira um <rect> de 1x1 no viewBox
const W = 27
const H = 32
const CX = 13 // coluna do ápice do triângulo
const SCALE = 2

export const SPRITE_WIDTH = W * SCALE
export const SPRITE_HEIGHT = H * SCALE

const COLORS: Record<string, string> = {
  Y: '#ffd84d', // amarelo do corpo
  S: '#d9a929', // amarelo escuro (tijolos)
  B: '#1a1a1a', // preto (contorno, cartola, membros, gravata)
  W: '#ffffff', // branco do olho
  F: '#54c8ff', // fogo azul claro
  G: '#1e6fe8' // fogo azul profundo (pontas)
}

const TRI_TOP = 8
// meia-largura do triângulo em cada linha (ápice → base de 21px)
const HALF_WIDTHS = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9, 9, 10]

type Cell = string | null

function buildGrid(s: SpriteState): Cell[][] {
  const g: Cell[][] = Array.from({ length: H }, () => Array<Cell>(W).fill(null))
  const put = (y: number, x: number, c: string): void => {
    if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c
  }
  const hline = (y: number, x1: number, x2: number, c: string): void => {
    for (let x = x1; x <= x2; x++) put(y, x, c)
  }

  // ---- fogo azul (desenhado primeiro: o corpo cobre o que sobrepõe) ----
  const f = s.aura
  for (let i = 2; i <= 14; i++) {
    const y = TRI_TOP + i
    const hw = HALF_WIDTHS[i]
    const phase = (i + f) % 3
    if (phase === 0) continue
    put(y, CX - hw - 2, 'F')
    put(y, CX + hw + 2, 'F')
    if (phase === 1) {
      put(y, CX - hw - 3, 'G')
      put(y, CX + hw + 3, 'G')
    }
  }
  // línguas de fogo acima da cartola
  for (const x of f === 1 ? [11, 13, 15] : [10, 12, 14, 16]) put(0, x, 'F')
  if (f === 1) {
    put(1, 9, 'F')
    put(1, 17, 'F')
  } else {
    put(1, 8, 'G')
    put(1, 18, 'G')
  }
  // brasas perto da base
  if (f === 1) {
    put(24, 4, 'G')
    put(24, 22, 'F')
    put(25, 2, 'F')
  } else {
    put(24, 3, 'F')
    put(24, 23, 'G')
    put(25, 24, 'F')
  }

  // ---- corpo: triângulo amarelo com contorno preto ----
  HALF_WIDTHS.forEach((hw, i) => {
    const y = TRI_TOP + i
    if (i === HALF_WIDTHS.length - 1) {
      hline(y, CX - hw, CX + hw, 'B') // base
    } else {
      hline(y, CX - hw, CX + hw, 'Y')
      put(y, CX - hw, 'B')
      put(y, CX + hw, 'B')
    }
  })

  // ---- padrão de "tijolos" na parte inferior ----
  hline(19, 7, 19, 'S')
  for (const x of [9, 13, 17]) {
    put(20, x, 'S')
    put(21, x, 'S')
    put(22, x, 'S')
  }

  // ---- olho único ----
  if (s.eye === 'open') {
    hline(13, 11, 15, 'B')
    for (const y of [14, 15, 16]) {
      put(y, 10, 'B')
      hline(y, 11, 15, 'W')
      put(y, 16, 'B')
    }
    hline(17, 11, 15, 'B')
    const px = 13 + s.pupil
    if (s.grabbed) {
      put(15, px, 'B') // pupila pequena: olho arregalado de susto
    } else {
      put(14, px, 'B')
      put(15, px, 'B')
    }
  } else {
    // olho fechado: linha com cílios
    for (const x of [10, 13, 16]) put(14, x, 'B')
    hline(15, 10, 16, 'B')
  }

  // ---- cartola flutuante (1px de vão acima do ápice) ----
  const lift = s.hatLift
  hline(6 - lift, 8, 18, 'B') // aba
  for (let y = 2 - lift; y <= 5 - lift; y++) hline(y, 10, 16, 'B')

  // ---- braços ----
  if (s.grabbed) {
    // os dois braços erguidos, se debatendo
    put(17, 6, 'B')
    put(16, 6, 'B')
    put(15, 5, 'B')
    put(14, 5, 'B')
    put(13, 4, 'B')
    put(12, 4, 'B')
    put(17, 20, 'B')
    put(16, 20, 'B')
    put(15, 21, 'B')
    put(14, 21, 'B')
    put(13, 22, 'B')
    put(12, 22, 'B')
  } else {
    put(17, 6, 'B')
    put(18, 5, 'B')
    put(19, 4, 'B')
    put(20, 3, 'B')
    put(21, 3, 'B')
    if (s.wave === 0) {
      put(17, 20, 'B')
      put(18, 21, 'B')
      put(19, 22, 'B')
      put(20, 23, 'B')
      put(21, 23, 'B')
    } else if (s.wave === 1) {
      put(17, 20, 'B') // ombro: conecta o braço erguido ao corpo
      put(16, 20, 'B')
      put(15, 21, 'B')
      put(14, 21, 'B')
      put(13, 22, 'B')
      put(12, 22, 'B')
    } else {
      put(17, 20, 'B')
      put(16, 21, 'B')
      put(15, 22, 'B')
      put(14, 23, 'B')
      put(13, 23, 'B')
      put(12, 24, 'B')
    }
  }

  // ---- gravata borboleta ----
  for (const x of [11, 12, 14, 15]) {
    put(24, x, 'B')
    put(26, x, 'B')
  }
  hline(25, 11, 15, 'B')

  // ---- pernas ----
  const leg = (x: number, footY: number, footX1: number, footX2: number): void => {
    for (let y = 24; y < footY; y++) put(y, x, 'B')
    hline(footY, footX1, footX2, 'B')
  }
  if (s.legs === 'tuck') {
    leg(10, 26, 9, 10)
    leg(16, 26, 16, 17)
  } else if (s.legs === 'dangleA') {
    leg(10, 30, 8, 10)
    leg(16, 30, 16, 18)
  } else {
    leg(10, 30, 10, 11)
    leg(16, 30, 15, 16)
  }

  return g
}

type Run = { x: number; y: number; w: number; c: string }

// Junta pixels consecutivos da mesma cor em um único <rect>
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

export function BillSprite(s: SpriteState): React.JSX.Element {
  const rects = useMemo(
    () => toRects(buildGrid(s)),
    [s.legs, s.eye, s.pupil, s.hatLift, s.wave, s.aura, s.grabbed]
  )

  return (
    <svg
      width={SPRITE_WIDTH}
      height={SPRITE_HEIGHT}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={COLORS[r.c]} />
      ))}
    </svg>
  )
}
