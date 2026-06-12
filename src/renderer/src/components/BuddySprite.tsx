import { useEffect, useMemo, useState } from 'react'
import { FRAME_A, FRAME_B, closeEyes, COLORS, GRID_W, GRID_H, type Frame } from './invaderFrames'

/**
 * BuddySprite — mascote "Buddy", o blob invasor (pixel art 11×8) adaptado do
 * handoff de design para conviver com o Bill/Trino no desktop pet.
 *
 * Diferenças em relação ao InvaderSprite original do handoff:
 *  - Fundo TRANSPARENTE (o pet flutua sobre o desktop): só desenhamos o corpo;
 *    os olhos são sobrepostos em cor escura, em vez de "buracos" na cor do fundo.
 *  - Auto-animado: alterna os 2 frames de "march" e pisca sozinho, num tick
 *    interno — não depende do estado do Trino, que tem outra anatomia.
 *  - Simétrico: o flip horizontal do Pet.tsx é inócuo aqui.
 *
 * O SVG é renderizado dentro de uma caixa 54×64 (mesma do .pet-sprite do Trino),
 * então é drop-in: posicionamento, sombra, hop e hover continuam valendo.
 */

const SCALE = 5 // 11*5 = 55px de largura, 8*5 = 40px de altura
const EYE = COLORS.bg // olhos escuros sobre o corpo laranja
const FLASH = '#f6d36b' // clarão âmbar quando arrastado (susto)

// Colunas dos olhos na linha 1 do frame (vide '..#.###.#..')
const EYE_COLS = [3, 7]

type Run = { x: number; y: number; w: number }

// agrupa pixels de corpo ('#') contíguos numa run -> menos <rect>
function bodyRuns(rows: Frame): Run[] {
  const out: Run[] = []
  for (let y = 0; y < GRID_H; y++) {
    const line = rows[y]
    let x = 0
    while (x < GRID_W) {
      if (line[x] !== '#') {
        x++
        continue
      }
      let w = 1
      while (x + w < GRID_W && line[x + w] === '#') w++
      out.push({ x, y, w })
      x += w
    }
  }
  return out
}

type BuddyProps = {
  /** pose de susto: clarão âmbar piscando enquanto está sendo arrastado */
  grabbed?: boolean
}

export function BuddySprite({ grabbed = false }: BuddyProps): React.JSX.Element {
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setT((v) => (v + 1) % 600), 180)
    return () => window.clearInterval(id)
  }, [])

  // Frame atual: march de 2 frames + piscada periódica; quando arrastado,
  // congela o frame A e troca a cor do corpo (clarão de susto).
  const rows = useMemo<Frame>(() => {
    if (grabbed) return FRAME_A
    const base = t % 2 ? FRAME_B : FRAME_A
    return t % 7 === 0 ? closeEyes(base) : base
  }, [t, grabbed])

  const runs = useMemo(() => bodyRuns(rows), [rows])
  const eyesOpen = rows[1][EYE_COLS[0]] === '.'
  const body = grabbed && t % 2 === 0 ? FLASH : COLORS.body

  return (
    <div
      style={{
        width: 54,
        height: 64,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 8
      }}
    >
      <svg
        width={GRID_W * SCALE}
        height={GRID_H * SCALE}
        viewBox={`0 0 ${GRID_W} ${GRID_H}`}
        shapeRendering="crispEdges"
        style={{ display: 'block', imageRendering: 'pixelated', overflow: 'visible' }}
      >
        {runs.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={body} />
        ))}
        {eyesOpen &&
          EYE_COLS.map((cx) => <rect key={`e${cx}`} x={cx} y={1} width={1} height={1} fill={EYE} />)}
      </svg>
    </div>
  )
}
