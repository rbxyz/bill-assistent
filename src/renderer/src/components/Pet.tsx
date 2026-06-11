import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { BillSprite } from './BillSprite'
import type { SpriteState } from './BillSprite'

export const PET_WIDTH = 54
const SPEED = 60 // px por segundo
const EDGE_MARGIN = 24
const WALK_FRAME_MS = 150

const BASE: SpriteState = { legs: 'stand', eye: 'open', pupil: 0, hatLift: 0, wave: 0 }

// Cada ação é uma sequência de frames com duração; o patch é aplicado sobre o sprite base
type Step = { d: number; s: Partial<SpriteState>; hop?: boolean }

const BLINK: Step[] = [
  { d: 140, s: { eye: 'closed' } },
  { d: 60, s: { eye: 'open' } }
]

const LOOK_AROUND: Step[] = [
  { d: 450, s: { pupil: -1 } },
  { d: 450, s: { pupil: 1 } },
  { d: 250, s: { pupil: 0 } }
]

const HAT_TIP: Step[] = [
  { d: 90, s: { hatLift: 1 } },
  { d: 420, s: { hatLift: 2 }, hop: true },
  { d: 90, s: { hatLift: 1 } },
  { d: 60, s: { hatLift: 0 } }
]

const WAVE: Step[] = [
  { d: 180, s: { wave: 1 } },
  { d: 180, s: { wave: 2 } },
  { d: 180, s: { wave: 1 } },
  { d: 180, s: { wave: 2 } },
  { d: 120, s: { wave: 0 } }
]

const DOUBLE_BLINK: Step[] = [
  { d: 140, s: { eye: 'closed' } },
  { d: 120, s: { eye: 'open' } },
  { d: 140, s: { eye: 'closed' } },
  { d: 80, s: { eye: 'open' } }
]

const IDLE_ACTIONS = [LOOK_AROUND, HAT_TIP, WAVE, DOUBLE_BLINK]

type WanderState = {
  mode: 'idle' | 'walk'
  target: number
  until: number
  last: number
}

type ActionState = { steps: Step[]; index: number; until: number }

type PetProps = {
  xRef: MutableRefObject<number>
  paused: boolean
  onActivate: () => void
  onMenu: (x: number, y: number) => void
}

export function Pet({ xRef, paused, onActivate, onMenu }: PetProps): React.JSX.Element {
  const elRef = useRef<HTMLDivElement>(null)
  const [walking, setWalking] = useState(false)
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const [hovered, setHovered] = useState(false)
  const [sprite, setSprite] = useState<SpriteState>(BASE)
  const [hopping, setHopping] = useState(false)

  const wanderRef = useRef<WanderState>({ mode: 'idle', target: 0, until: 0, last: 0 })
  const actionRef = useRef<ActionState | null>(null)
  const nextBlinkRef = useRef(0)
  const nextActionRef = useRef(0)
  const spriteRef = useRef<SpriteState>(BASE)
  const pausedRef = useRef(false)
  pausedRef.current = paused || hovered

  const startAction = (steps: Step[]): void => {
    actionRef.current = { steps, index: 0, until: performance.now() + steps[0].d }
  }

  useEffect(() => {
    if (xRef.current === 0) {
      xRef.current = window.innerWidth / 2 - PET_WIDTH / 2
    }
    const now = performance.now()
    wanderRef.current.until = now + 1200
    nextBlinkRef.current = now + 2500
    nextActionRef.current = now + 2000

    let raf = 0
    const tick = (t: number): void => {
      const w = wanderRef.current
      const dt = w.last ? Math.min((t - w.last) / 1000, 0.05) : 0
      w.last = t

      // ---- movimento (passeio aleatório) ----
      if (pausedRef.current) {
        if (w.mode === 'walk') {
          w.mode = 'idle'
          setWalking(false)
        }
        w.until = t + 600
      } else if (w.mode === 'idle') {
        if (t >= w.until) {
          const min = EDGE_MARGIN
          const max = window.innerWidth - PET_WIDTH - EDGE_MARGIN
          w.target = min + Math.random() * (max - min)
          w.mode = 'walk'
          setWalking(true)
          setFacing(w.target > xRef.current ? 'right' : 'left')
        }
      } else {
        const dir = Math.sign(w.target - xRef.current)
        xRef.current += dir * SPEED * dt
        const arrived =
          dir === 0 ||
          (dir > 0 && xRef.current >= w.target) ||
          (dir < 0 && xRef.current <= w.target)
        if (arrived) {
          xRef.current = w.target
          w.mode = 'idle'
          w.until = t + 1500 + Math.random() * 4000
          setWalking(false)
        }
      }
      if (elRef.current) {
        elRef.current.style.transform = `translateX(${xRef.current}px)`
      }

      // ---- avanço da ação em andamento ----
      const running = actionRef.current
      if (running && t >= running.until) {
        running.index++
        if (running.index >= running.steps.length) {
          actionRef.current = null
          setHopping(false)
        } else {
          running.until = t + running.steps[running.index].d
        }
      }

      // ---- agendamento: piscar (sempre) e ações de idle (parado) ----
      if (!actionRef.current) {
        if (t >= nextBlinkRef.current) {
          startAction(BLINK)
          nextBlinkRef.current = t + 2800 + Math.random() * 3800
        } else if (w.mode === 'idle' && !pausedRef.current && t >= nextActionRef.current) {
          startAction(IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)])
          nextActionRef.current = t + 3000 + Math.random() * 5000
        }
      }

      // ---- composição do sprite deste frame ----
      const next: SpriteState = { ...BASE }
      if (w.mode === 'walk') {
        next.legs = Math.floor(t / WALK_FRAME_MS) % 2 === 0 ? 'walkA' : 'walkB'
        next.pupil = 1 // olha para a frente; o flip espelha quando anda à esquerda
      }
      const action = actionRef.current
      if (action) {
        const step = action.steps[action.index]
        Object.assign(next, step.s)
        if (step.hop) setHopping(true)
      }

      const prev = spriteRef.current
      if (
        next.legs !== prev.legs ||
        next.eye !== prev.eye ||
        next.pupil !== prev.pupil ||
        next.hatLift !== prev.hatLift ||
        next.wave !== prev.wave
      ) {
        spriteRef.current = next
        setSprite(next)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [xRef])

  return (
    <div
      ref={elRef}
      className={[
        'pet',
        walking ? 'walking' : '',
        hovered ? 'hovered' : '',
        `facing-${facing}`
      ].join(' ')}
      onMouseEnter={() => {
        setHovered(true)
        window.api.setInteractive(true)
        if (!actionRef.current) startAction(WAVE) // cumprimenta quem chega
      }}
      onMouseLeave={() => {
        setHovered(false)
        window.api.setInteractive(false)
      }}
      onClick={onActivate}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(e.clientX, e.clientY)
      }}
      title="Clique para conversar comigo!"
    >
      <div className="pet-flip">
        <div className={`pet-sprite${hopping ? ' hop' : ''}`}>
          <BillSprite {...sprite} />
        </div>
      </div>
      <div className="pet-shadow" />
    </div>
  )
}
