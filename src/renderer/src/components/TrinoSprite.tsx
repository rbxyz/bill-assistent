import { useMemo } from 'react'

/**
 * TrinoSprite — substituto do BillSprite.tsx (personagem original).
 * Grade de pixel art 32×40; cada célula vira um <rect> 1×1 no viewBox.
 * Mesma arquitetura do sprite anterior: buildGrid → toRects → SVG crispEdges.
 */

export type Accent = 'violeta' | 'esmeralda' | 'ciano'

export type SpriteState = {
  /** dangleA/B = pernas balançando (voo); tuck = encolhidas (agarrado/queda);
   *  kickA/B = embaixadinha com a perna direita/esquerda */
  legs: 'dangleA' | 'dangleB' | 'tuck' | 'kickA' | 'kickB'
  /** open | half (meia piscada — use como frame intermediário) | closed | happy (arco feliz) */
  eye: 'open' | 'half' | 'closed' | 'happy'
  /** -1 olha à esquerda, 0 centro, 1 à direita */
  pupil: -1 | 0 | 1
  /** quanto o chapéu sobe (0 a 2 pixels) */
  hatLift: 0 | 1 | 2
  /** 0 = braço abaixado, 1/2 = frames do aceno */
  wave: 0 | 1 | 2
  /** frames da chama (3 frames: 0, 1, 2) */
  aura: 0 | 1 | 2
  /** pose de agarrado: braços erguidos, pupila pequena de susto */
  grabbed: boolean
  /** sobrancelha franzida (modo furioso) */
  brow?: boolean
  /** fúria: labaredas sobem pelas bordas do corpo + pluma alta no chapéu */
  rage?: boolean
  /** flutuação da gema peitoral (0/1) — alterne a cada ~560ms */
  gem?: 0 | 1
  /** bola de futebol (embaixadinhas): centro em px do contêiner do pet, ou null.
   *  Desenhada como overlay no Pet.tsx (BallSprite), não na grade deste sprite,
   *  para que Trino e Buddy compartilhem a mesma bola. */
  ball?: { x: number; y: number } | null
}

const W = 32 // colunas da grade interna (viewBox)
const H = 40 // linhas da grade interna (viewBox)
const CX = 15 // coluna do ápice do triângulo
const T = 10 // linha do ápice

// O SVG é renderizado a 54px de largura para casar com o PET_WIDTH = 54 que o
// seu Pet.tsx já usa — assim o sprite é drop-in e nada no posicionamento muda.
// A grade interna continua 32×40 (mais detalhe), só o tamanho de saída é 54×68.
export const SPRITE_WIDTH = 54
export const SPRITE_HEIGHT = 68

// meia-largura do triângulo em cada linha (ápice → base de 25px)
const HW = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9, 9, 10, 11, 11, 12]

export const ACCENTS: Record<Accent, { V: string; F: string; G: string; I: string }> = {
  violeta: { V: '#8a4bff', F: '#b78cff', G: '#5f2ad0', I: '#17b3a2' },
  esmeralda: { V: '#2fbf71', F: '#8be8b0', G: '#178a4e', I: '#8a4bff' },
  ciano: { V: '#22b8e6', F: '#8fe0ff', G: '#1577c2', I: '#ffb13d' }
}

const BASE_COLORS: Record<string, string> = {
  K: '#2b1a0d', // contorno/membros/chapéu (marrom quente, não preto chapado)
  Y: '#f6b73c', // âmbar do corpo
  L: '#ffd98a', // realce (luz vinda da esquerda)
  S: '#d68f2c', // sombra (borda direita)
  D: '#a8691c', // detalhe escuro
  M: '#e0a02f', // argamassa dos tijolos
  W: '#f4ecd8', // branco-creme do olho e da bola
  X: '#ffffff', // brilho da íris
  P: '#112520' // pupila
}

type Cell = string | null

function buildGrid(s: SpriteState): Cell[][] {
  const g: Cell[][] = Array.from({ length: H }, () => Array<Cell>(W).fill(null))
  const put = (y: number, x: number, c: string): void => {
    if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c
  }
  const hl = (y: number, x1: number, x2: number, c: string): void => {
    for (let x = x1; x <= x2; x++) put(y, x, c)
  }
  const gem = s.gem ?? 0
  const aura = s.aura
  const rage = s.rage ?? false

  // ---- chama lateral (desenhada primeiro; o corpo cobre sobreposições) ----
  // línguas de fogo onduladas e assimétricas: cada lado tem fase própria
  const tongue = (i: number, side: -1 | 1, ph: number): void => {
    const y = T + i
    const e = CX + side * HW[i]
    const o = (d: number): number => e + side * d
    if (ph === 1) {
      put(y, o(2), 'F')
    } else if (ph === 2) {
      put(y, o(2), 'F')
      put(y, o(3), 'G')
    } else if (ph === 3) {
      put(y, o(2), 'F')
      put(y, o(3), 'F')
      put(y, o(4), 'G')
      put(y - 1, o(3), 'F')
    } else if (ph === 4) {
      put(y, o(2), 'G')
    }
    if (rage) {
      put(y, o(2), 'F')
      if (ph % 2 === 0) {
        put(y, o(3), 'G')
        put(y - 1, o(2), 'F')
      }
    }
  }
  for (let i = 2; i <= 17; i++) {
    tongue(i, -1, (i * 2 + aura * 2) % 5)
    tongue(i, 1, (i * 2 + aura * 2 + 3) % 5)
  }
  // fúria: labaredas sobem pelas bordas do corpo
  if (rage) {
    const f = aura
    put(22, 5, 'F'); put(21, 5, 'F'); put(20 - f, 5, 'G')
    put(22, 25, 'F'); put(21, 25, 'F'); put(20 - f, 25, 'G')
    put(17, 7, 'F'); put(16 - f, 7, 'G')
    put(17, 23, 'F'); put(16 - f, 23, 'G')
    put(13 - f, 6, 'G'); put(14 - f, 24, 'G')
  }
  // brasas subindo perto da base
  if (aura === 0) { put(30, 5, 'F'); put(31, 26, 'G'); put(29, 3, 'G'); put(32, 22, 'F') }
  else if (aura === 1) { put(31, 4, 'G'); put(30, 25, 'F'); put(29, 27, 'G'); put(33, 7, 'F') }
  else { put(32, 6, 'F'); put(32, 24, 'F'); put(30, 2, 'G'); put(29, 28, 'F') }

  // ---- corpo: triângulo âmbar com contorno marrom quente ----
  HW.forEach((hw, i) => {
    const y = T + i
    if (i === HW.length - 1) {
      hl(y, CX - hw, CX + hw, 'K') // base
      return
    }
    hl(y, CX - hw, CX + hw, 'Y')
    put(y, CX - hw, 'K')
    put(y, CX + hw, 'K')
  })

  // ---- alvenaria: cursos de tijolos com juntas alternadas ----
  for (let i = 2; i <= 17; i++) {
    const y = T + i
    const x1 = CX - HW[i] + 1
    const x2 = CX + HW[i] - 1
    if ((i - 2) % 3 === 2) {
      hl(y, x1, x2, 'M') // junta horizontal (argamassa)
    } else {
      const off = Math.floor((i - 2) / 3) % 2 === 0 ? 0 : 2
      for (let x = x1; x <= x2; x++) if ((x + off) % 4 === 0) put(y, x, 'M')
    }
  }
  // luz direcional: realce à esquerda, sombra à direita
  for (let i = 2; i <= 15; i++) put(T + i, CX - HW[i] + 1, 'L')
  for (let i = 5; i <= 17; i++) put(T + i, CX + HW[i] - 1, 'S')

  // ---- olho único com íris colorida (7px de largura) ----
  const px = 14 + s.pupil
  const startled = s.grabbed
  if (s.eye === 'closed') {
    hl(18, 11, 19, 'K')
    put(19, 12, 'K'); put(19, 15, 'K'); put(19, 18, 'K')
  } else if (s.eye === 'happy') {
    hl(16, 14, 16, 'K')
    put(17, 13, 'K'); put(17, 17, 'K')
    put(18, 12, 'K'); put(18, 18, 'K')
  } else if (s.eye === 'half') {
    hl(16, 12, 18, 'K')
    hl(17, 11, 19, 'K')
    put(18, 11, 'K'); hl(18, 12, 18, 'W'); put(18, 19, 'K')
    put(19, 11, 'K'); hl(19, 12, 18, 'W'); put(19, 19, 'K')
    hl(20, 12, 18, 'K')
    put(19, px, 'I'); put(19, px + 1, 'I')
  } else {
    hl(16, 12, 18, 'K')
    for (const y of [17, 18, 19]) {
      put(y, 11, 'K'); hl(y, 12, 18, 'W'); put(y, 19, 'K')
    }
    hl(20, 12, 18, 'K')
    if (startled) {
      put(18, 15, 'P') // pupila pequena: olho arregalado de susto
    } else {
      for (const y of [17, 18, 19]) { put(y, px, 'I'); put(y, px + 1, 'I') }
      put(18, px, 'P'); put(18, px + 1, 'P')
      put(17, px, 'X') // brilho
    }
  }
  if (s.brow) { put(15, 12, 'K'); put(15, 13, 'K'); put(15, 17, 'K'); put(15, 18, 'K') }

  // ---- chapéu cônico flutuante com ponta dobrada e faixa colorida ----
  const a = 2 - s.hatLift
  put(a, 16, 'V') // pingente na ponta
  put(a + 1, 15, 'K'); put(a + 1, 16, 'K')
  hl(a + 2, 14, 16, 'K')
  hl(a + 3, 14, 16, 'K')
  hl(a + 4, 13, 17, 'V') // faixa
  hl(a + 5, 12, 18, 'K')
  hl(a + 6, 10, 20, 'K') // aba
  // coroa de chama dançando na ponta + fagulhas na aba
  if (aura === 0) {
    put(a - 1, 16, 'F'); put(a - 2, 16, 'G')
    put(a + 6, 8, 'F'); put(a + 6, 22, 'G')
  } else if (aura === 1) {
    put(a - 1, 16, 'F'); put(a - 2, 15, 'F'); put(a - 3, 15, 'G')
    put(a + 5, 20, 'F'); put(a + 6, 9, 'G')
  } else {
    put(a - 1, 15, 'F'); put(a - 1, 17, 'G'); put(a - 2, 16, 'F')
    put(a + 5, 10, 'F'); put(a + 6, 21, 'F')
  }
  // fúria: pluma de fogo alta sobre o chapéu
  if (rage) {
    hl(a - 2, 15, 17, 'F')
    put(a - 3, 15 + aura, 'F')
    put(a - 4, 16, 'G')
  }

  // ---- braços ----
  if (s.grabbed) {
    for (const p of [[21, 7], [20, 6], [19, 6], [18, 5], [17, 5], [16, 4], [15, 4]]) put(p[0], p[1], 'K')
    for (const p of [[21, 23], [20, 24], [19, 24], [18, 25], [17, 25], [16, 26], [15, 26]]) put(p[0], p[1], 'K')
  } else {
    for (const p of [[22, 6], [23, 5], [24, 4], [25, 4], [25, 3]]) put(p[0], p[1], 'K')
    if (s.wave === 0) {
      for (const p of [[22, 24], [23, 25], [24, 26], [25, 26], [25, 27]]) put(p[0], p[1], 'K')
    } else if (s.wave === 1) {
      for (const p of [[21, 23], [20, 24], [19, 25], [18, 25], [17, 25], [17, 26]]) put(p[0], p[1], 'K')
    } else {
      for (const p of [[21, 23], [20, 24], [19, 24], [18, 25], [17, 25], [16, 26], [15, 26], [15, 27]]) put(p[0], p[1], 'K')
    }
  }

  // ---- gema levitante (no lugar de gravata) ----
  const gy = 31 + gem
  put(gy, 15, 'V')
  put(gy + 1, 14, 'V'); put(gy + 1, 15, 'F'); put(gy + 1, 16, 'V')
  put(gy + 2, 15, 'V')

  // ---- pernas ----
  const leg = (x: number, yEnd: number): void => {
    for (let y = 29; y <= yEnd; y++) put(y, x, 'K')
  }
  if (s.legs === 'tuck') {
    leg(11, 30); leg(19, 30)
    hl(31, 10, 11, 'K'); hl(31, 19, 20, 'K')
  } else if (s.legs === 'dangleA') {
    leg(11, 34); leg(19, 34)
    hl(35, 9, 11, 'K'); hl(35, 19, 21, 'K')
  } else if (s.legs === 'kickA') {
    // perna esquerda firme; direita dobrada com o pé erguido para o chute
    leg(11, 34); hl(35, 9, 11, 'K')
    put(29, 20, 'K'); put(30, 21, 'K'); hl(31, 21, 23, 'K')
  } else if (s.legs === 'kickB') {
    // perna direita firme; esquerda dobrada com o pé erguido
    leg(19, 34); hl(35, 19, 21, 'K')
    put(29, 10, 'K'); put(30, 9, 'K'); hl(31, 7, 9, 'K')
  } else {
    leg(11, 33); leg(19, 33)
    hl(34, 11, 13, 'K'); hl(34, 17, 19, 'K')
  }

  // A bola de futebol é desenhada por cima como overlay no Pet.tsx (BallSprite),
  // em px do contêiner, e não aqui na grade — assim Trino e Buddy a compartilham.

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

export function TrinoSprite(props: SpriteState & { accent?: Accent }): React.JSX.Element {
  const accent = props.accent ?? 'ciano'
  const colors = useMemo<Record<string, string>>(
    () => ({ ...BASE_COLORS, ...ACCENTS[accent] }),
    [accent]
  )
  const rects = useMemo(
    () => toRects(buildGrid(props)),
    [
      props.legs, props.eye, props.pupil, props.hatLift, props.wave, props.aura,
      props.grabbed, props.brow, props.rage, props.gem
    ]
  )

  return (
    <svg
      width={SPRITE_WIDTH}
      height={SPRITE_HEIGHT}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={colors[r.c]} />
      ))}
    </svg>
  )
}
