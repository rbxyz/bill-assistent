/**
 * invaderFrames.ts — dados e lógica do "blob invasor" (pixel art 11×8, 2 cores).
 * Sem dependências. Pode ser usado em qualquer projeto React/TS.
 *
 *   # = corpo (#C77257)   . = fundo/olho (#1F1F1D)
 *
 * O sprite tem 2 frames de "march" (asas e perninhas alternam) + variações
 * (olhos fechados para piscar, e um flash invertido para "hit").
 */

export const COLORS = {
  body: '#C77257', // laranja-terroso
  bg: '#1F1F1D' // quase-preto (fundo e olhos)
} as const

export const GRID_W = 11
export const GRID_H = 8

export type Frame = string[] // 8 strings de 11 chars

// Frame A — asas retas, perninhas em 2,4,6,8
export const FRAME_A: Frame = [
  '..#######..',
  '..#.###.#..',
  '..#######..',
  '###########',
  '###########',
  '..#######..',
  '..#######..',
  '..#.#.#.#..'
]

// Frame B — asas batem (pontas descem), perninhas se abrem em 1,3,7,9
export const FRAME_B: Frame = [
  '..#######..',
  '..#.###.#..',
  '..#######..',
  '.#########.',
  '###########',
  '#.#######.#',
  '..#######..',
  '.#.#...#.#.'
]

/** Fecha os olhos (linha 1 vira corpo cheio) — use para piscar. */
export function closeEyes(rows: Frame): Frame {
  const r = rows.slice()
  r[1] = '..#######..'
  return r
}

export type InvaderMode = 'march' | 'fast' | 'float' | 'blink' | 'hit'

/** Linhas + flash invertido para um modo num dado tick `t`. */
export function framesFor(mode: InvaderMode, t: number): { rows: Frame; invert: boolean } {
  if (mode === 'blink') {
    const closed = t % 5 === 0 || t % 5 === 1
    return { rows: closed ? closeEyes(FRAME_A) : FRAME_A, invert: false }
  }
  if (mode === 'hit') {
    return { rows: FRAME_A, invert: t % 2 === 0 } // flash: troca corpo/fundo
  }
  if (mode === 'float') {
    const b = Math.floor(t / 2) % 2 ? FRAME_B : FRAME_A
    return { rows: t % 16 === 0 ? closeEyes(b) : b, invert: false }
  }
  // march / fast
  return { rows: t % 2 ? FRAME_B : FRAME_A, invert: false }
}

/**
 * Posição (px) do sprite na arena para um dado tick.
 * `sw`/`sh` = tamanho exibido do sprite (ex.: 11*scale, 8*scale).
 * march/fast = vai-e-volta clássico com descida em degraus; float = bob senoidal.
 */
export function position(
  mode: InvaderMode,
  t: number,
  arenaW: number,
  arenaH: number,
  sw: number,
  sh: number
): { x: number; y: number } {
  if (mode === 'float') {
    return { x: (arenaW - sw) / 2, y: (arenaH - sh) / 2 + Math.round(Math.sin(t * 0.5) * 12) }
  }
  if (mode === 'blink') {
    return { x: (arenaW - sw) / 2, y: (arenaH - sh) / 2 }
  }
  if (mode === 'hit') {
    return { x: (arenaW - sw) / 2 + (t % 2 ? 4 : -4), y: (arenaH - sh) / 2 }
  }
  const step = mode === 'fast' ? 22 : 12
  const span = Math.max(4, Math.floor((arenaW - sw - 8) / step))
  const phase = t % (2 * span)
  const pos = phase <= span ? phase : 2 * span - phase
  const x = 4 + pos * step
  const edges = Math.floor(t / span)
  const descend = 22
  const maxd = Math.max(1, arenaH - sh - 16)
  const y = 8 + ((edges * descend) % maxd)
  return { x, y }
}
