import { useMemo } from 'react'

/**
 * BallSprite — bola de futebol em pixel art, usada na animação de "jogar bola"
 * (embaixadinhas) tanto pelo Trino quanto pelo Buddy.
 *
 * Padrão pedido (3×3, xadrez branco/preto):
 *
 *   X Y X
 *   Y X Y
 *   X Y X
 *
 *   X = pixel branco (#ffffff)   Y = pixel preto (#000000)
 *
 * É renderizada como overlay sobre o mascote (em coordenadas do contêiner do
 * pet), então independe da grade interna de cada sprite e serve para ambos.
 */

const PATTERN = ['XYX', 'YXY', 'XYX']
const BALL_COLORS: Record<string, string> = {
  X: '#ffffff', // branco
  Y: '#000000' // preto
}

type BallProps = {
  /** multiplicador de pixel (default 3 → bola de 9×9px) */
  scale?: number
}

export function BallSprite({ scale = 3 }: BallProps): React.JSX.Element {
  const cells = useMemo(() => {
    const out: Array<{ x: number; y: number; c: string }> = []
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        out.push({ x, y, c: BALL_COLORS[PATTERN[y][x]] })
      }
    }
    return out
  }, [])

  return (
    <svg
      width={3 * scale}
      height={3 * scale}
      viewBox="0 0 3 3"
      shapeRendering="crispEdges"
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      {cells.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={r.c} />
      ))}
    </svg>
  )
}
