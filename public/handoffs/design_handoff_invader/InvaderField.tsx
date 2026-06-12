import { useEffect, useRef, useState } from 'react'
import { InvaderSprite } from './InvaderSprite'
import { framesFor, position, GRID_W, GRID_H, type InvaderMode } from './invaderFrames'

/**
 * InvaderField — exemplo completo: o blob invasor animado se movendo numa arena.
 * Um único `tick` (setInterval ~170ms) dirige TANTO a troca de frame quanto o
 * deslocamento — por isso o movimento é "em degraus", igual ao arcade.
 *
 * Troque `mode` para: 'march' | 'fast' | 'float' | 'blink' | 'hit'.
 */
export function InvaderField({
  mode = 'march',
  scale = 8,
  height = 320,
  tickMs = 170
}: {
  mode?: InvaderMode
  scale?: number
  height?: number
  tickMs?: number
}): React.JSX.Element {
  const [t, setT] = useState(0)
  const [arenaW, setArenaW] = useState(680)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const measure = (): void => {
      if (ref.current) setArenaW(ref.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    const id = setInterval(() => setT((v) => v + 1), tickMs)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', measure)
    }
  }, [tickMs])

  const sw = GRID_W * scale
  const sh = GRID_H * scale
  const fr = framesFor(mode, t)
  const pos = position(mode, t, arenaW, height, sw, sh)

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: '#1F1F1D',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: Math.round(pos.x),
          top: Math.round(pos.y),
          transition:
            mode === 'float'
              ? 'top 0.16s ease-in-out'
              : 'left 0.14s linear, top 0.2s linear',
          willChange: 'left, top'
        }}
      >
        <InvaderSprite rows={fr.rows} scale={scale} invert={fr.invert} />
      </div>
    </div>
  )
}
