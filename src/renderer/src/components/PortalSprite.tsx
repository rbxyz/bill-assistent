import { useMemo } from 'react'
import { ACCENTS, type Accent } from './TrinoSprite'

/**
 * PortalSprite — buraco negro em pixel art para a animação de sumiço.
 * Substitui o .pet-blackhole feito em CSS por um portal desenhado pixel a pixel:
 * anéis em losango (distância Manhattan) com redemoinho que gira a cada frame.
 *
 * Use 3 frames (0/1/2) avançando a cada ~140ms para o redemoinho girar.
 * O portal deve ficar ATRÁS do sprite, centrado em ~55% da altura dele.
 */

export const PORTAL_GRID = 25
export const PORTAL_SIZE = PORTAL_GRID * 6 // 150px no tamanho padrão

type PortalProps = {
  /** frame do redemoinho: 0 | 1 | 2 (avance a cada tick de 140ms) */
  frame: number
  /** multiplicador de pixel (default 6 → 150px) */
  scale?: number
  accent?: Accent
}

export function PortalSprite({ frame, scale = 6, accent = 'ciano' }: PortalProps): React.JSX.Element {
  const cells = useMemo(() => {
    const pal = ACCENTS[accent]
    const C = 12
    const out: Array<{ x: number; y: number; c: string }> = []
    for (let y = 0; y < PORTAL_GRID; y++) {
      for (let x = 0; x < PORTAL_GRID; x++) {
        const dx = x - C
        const dy = y - C
        const d = Math.abs(dx) + Math.abs(dy)
        let c: string | null = null
        if (d <= 4) c = '#0d0716' // núcleo do buraco negro
        else if (d <= 6) c = (dx * 2 + dy + frame * 3) % 5 === 0 ? pal.G : pal.V // anel interno com redemoinho
        else if (d === 7) { if ((dx - dy + frame * 2) % 3 !== 0) c = pal.G } // anel externo serrilhado
        else if (d === 8) { if ((dx * 3 + dy * 2 + frame * 4) % 9 === 0) c = pal.F } // fagulhas orbitando
        else if (d === 9) { if ((dx * 2 - dy + frame * 5) % 11 === 0) c = '#ffffff' } // faíscas brancas
        if (c) out.push({ x, y, c })
      }
    }
    return out
  }, [frame, accent])

  return (
    <svg
      width={PORTAL_GRID * scale}
      height={PORTAL_GRID * scale}
      viewBox={`0 0 ${PORTAL_GRID} ${PORTAL_GRID}`}
      shapeRendering="crispEdges"
    >
      {cells.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={r.c} />
      ))}
    </svg>
  )
}
