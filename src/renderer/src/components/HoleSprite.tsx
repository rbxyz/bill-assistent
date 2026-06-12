import { useMemo } from 'react'

/**
 * HoleSprite — um buraco escuro no chão, usado no teletransporte do dinossauro
 * (ele cai num buraco e sai de outro em outro lugar da tela). Elipse em pixel
 * art com uma borda mais clara para dar volume.
 */

const W = 16
const H = 7
const RIM = '#444'
const VOID = '#0c0c0c'
const SCALE = 3 // 16*3 = 48px largura

export function HoleSprite(): React.JSX.Element {
  const cells = useMemo(() => {
    const cx = (W - 1) / 2
    const cy = (H - 1) / 2
    const rx = W / 2
    const ry = H / 2
    const out: Array<{ x: number; y: number; c: string }> = []
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = (x - cx) / rx
        const ny = (y - cy) / ry
        const d = nx * nx + ny * ny
        if (d <= 1) out.push({ x, y, c: d > 0.62 ? RIM : VOID })
      }
    }
    return out
  }, [])

  return (
    <svg
      width={W * SCALE}
      height={H * SCALE}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={c.c} />
      ))}
    </svg>
  )
}
