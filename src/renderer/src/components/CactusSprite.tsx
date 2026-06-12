import { useMemo } from 'react'

/**
 * CactusSprite — o cacto/obstáculo que aparece quando o dinossauro pula
 * (homenagem ao jogo do dino sem internet). Pixel art simples, 6×10.
 */

const PATTERN = [
  '..##..',
  '..##..',
  '#.##..',
  '#.##.#',
  '#.##.#',
  '####.#',
  '.#####',
  '..##..',
  '..##..',
  '..##..'
]

const GREEN = '#3c9a4e'
const SCALE = 3 // 6*3 = 18px largura, 10*3 = 30px altura

export function CactusSprite(): React.JSX.Element {
  const cells = useMemo(() => {
    const out: Array<{ x: number; y: number }> = []
    PATTERN.forEach((row, y) =>
      row.split('').forEach((ch, x) => {
        if (ch === '#') out.push({ x, y })
      })
    )
    return out
  }, [])

  return (
    <svg
      width={6 * SCALE}
      height={10 * SCALE}
      viewBox="0 0 6 10"
      shapeRendering="crispEdges"
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={GREEN} />
      ))}
    </svg>
  )
}
