import { useMemo } from 'react'
import { COLORS, GRID_W, GRID_H, type Frame } from './invaderFrames'

/**
 * InvaderSprite — renderiza UM frame do blob invasor como SVG de <rect>s 1×1,
 * nearest-neighbor (shapeRendering="crispEdges" + image-rendering: pixelated).
 * Pixels quadrados perfeitos, sem anti-aliasing, exatamente 2 cores.
 *
 *   <InvaderSprite rows={FRAME_A} scale={8} />
 */
export function InvaderSprite({
  rows,
  scale = 8,
  invert = false
}: {
  rows: Frame
  scale?: number
  invert?: boolean
}): React.JSX.Element {
  const body = invert ? COLORS.bg : COLORS.body
  const bg = invert ? COLORS.body : COLORS.bg

  // agrupa pixels contíguos da mesma cor numa run -> menos <rect>
  const runs = useMemo(() => {
    const out: Array<{ x: number; y: number; w: number }> = []
    for (let y = 0; y < GRID_H; y++) {
      const line = rows[y]
      let x = 0
      while (x < GRID_W) {
        if (line[x] !== '#') { x++; continue }
        let w = 1
        while (x + w < GRID_W && line[x + w] === '#') w++
        out.push({ x, y, w })
        x += w
      }
    }
    return out
  }, [rows])

  return (
    <svg
      width={GRID_W * scale}
      height={GRID_H * scale}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      <rect x={0} y={0} width={GRID_W} height={GRID_H} fill={bg} />
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={body} />
      ))}
    </svg>
  )
}
