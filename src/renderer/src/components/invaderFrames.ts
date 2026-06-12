/**
 * invaderFrames.ts — dados e lógica do "blob invasor" (pixel art 11×8, 2 cores).
 * Adaptado do handoff de design (public/handoffs/design_handoff_invader) para o
 * mascote Buddy. Sem dependências.
 *
 *   # = corpo (#C77257)   . = fundo/olho (#1F1F1D)
 *
 * O sprite tem 2 frames de "march" (asas e perninhas alternam) + variação de
 * olhos fechados (piscar).
 */

export const COLORS = {
  body: '#C77257', // laranja-terroso
  bg: '#1F1F1D' // quase-preto (olhos)
} as const

export const GRID_W = 11
export const GRID_H = 8

export type Frame = string[] // 8 strings de 11 chars

// Frame A — pernas de 2px (linhas 6–7) nas colunas 2,4,6,8; corpo 1px mais baixo.
//   linhas 0–2: bloco-corpo (olhos na linha 1, colunas 3 e 7)
//   linhas 3–4: saliências laterais que estendem até as bordas
//   linha  5  : base do corpo
//   linhas 6–7: quatro pernas de 2px de altura
export const FRAME_A: Frame = [
  '..#######..',
  '..#.###.#..',
  '..#######..',
  '###########',
  '###########',
  '..#######..',
  '..#.#.#.#..',
  '..#.#.#.#..'
]

// Frame B — pernas se abrem para fora (colunas 1,3,7,9), mantendo os 2px de altura.
export const FRAME_B: Frame = [
  '..#######..',
  '..#.###.#..',
  '..#######..',
  '###########',
  '###########',
  '..#######..',
  '.#.#...#.#.',
  '.#.#...#.#.'
]

/** Fecha os olhos (linha 1 vira corpo cheio) — use para piscar. */
export function closeEyes(rows: Frame): Frame {
  const r = rows.slice()
  r[1] = '..#######..'
  return r
}
