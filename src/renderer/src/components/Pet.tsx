import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { BillSprite, SPRITE_HEIGHT } from './BillSprite'
import type { SpriteState } from './BillSprite'

export const PET_WIDTH = 54

const FLY_SPEED = 85 // px por segundo
const EDGE_MARGIN = 24
const HOVER_H = 16 // altura de flutuação acima do chão
const GRAVITY = 2400 // px/s²
const BOUNCE = 0.35 // restituição do quique
const DRAG_THRESHOLD = 5 // px até virar arrasto (menos que isso = clique)
const DANGLE_FRAME_MS = 240
const AURA_FRAME_MS = 140

const BASE: SpriteState = {
  legs: 'dangleA',
  eye: 'open',
  pupil: 0,
  hatLift: 0,
  wave: 0,
  aura: 1,
  grabbed: false
}

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

type Mode = 'hover' | 'fly' | 'grabbed' | 'fall'

type Motion = {
  mode: Mode
  h: number // altura acima do chão
  vy: number // velocidade vertical (positiva = caindo)
  vx: number // inércia horizontal ao soltar
  target: number
  until: number
  last: number
}

type ActionState = { steps: Step[]; index: number; until: number }

type DragState = {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastT: number
  active: boolean
}

type PetProps = {
  xRef: MutableRefObject<number>
  paused: boolean
  exiting: boolean
  onActivate: () => void
}

export function Pet({ xRef, paused, exiting, onActivate }: PetProps): React.JSX.Element {
  const elRef = useRef<HTMLDivElement>(null)
  const liftRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const [hovered, setHovered] = useState(false)
  const [grabbed, setGrabbed] = useState(false)
  const [landed, setLanded] = useState(false)
  const [sprite, setSprite] = useState<SpriteState>(BASE)
  const [hopping, setHopping] = useState(false)

  const motionRef = useRef<Motion>({
    mode: 'hover',
    h: HOVER_H,
    vy: 0,
    vx: 0,
    target: 0,
    until: 0,
    last: 0
  })
  const dragRef = useRef<DragState | null>(null)
  const actionRef = useRef<ActionState | null>(null)
  const nextBlinkRef = useRef(0)
  const nextActionRef = useRef(0)
  const spriteRef = useRef<SpriteState>(BASE)
  const pausedRef = useRef(false)
  pausedRef.current = paused || hovered
  const exitingRef = useRef(false)
  exitingRef.current = exiting

  const startAction = (steps: Step[]): void => {
    actionRef.current = { steps, index: 0, until: performance.now() + steps[0].d }
  }

  useEffect(() => {
    if (xRef.current === 0) {
      xRef.current = window.innerWidth / 2 - PET_WIDTH / 2
    }
    const now = performance.now()
    motionRef.current.until = now + 1200
    nextBlinkRef.current = now + 2500
    nextActionRef.current = now + 2000

    let raf = 0
    const tick = (t: number): void => {
      const m = motionRef.current
      const dt = m.last ? Math.min((t - m.last) / 1000, 0.05) : 0
      m.last = t
      const maxX = window.innerWidth - PET_WIDTH

      // Saindo: congela posição e sprite; a animação CSS do buraco negro assume
      if (exitingRef.current) {
        raf = requestAnimationFrame(tick)
        return
      }

      // ---- movimento ----
      if (m.mode === 'hover') {
        m.h += (HOVER_H - m.h) * Math.min(1, dt * 5)
        if (pausedRef.current) {
          m.until = t + 600
        } else if (t >= m.until) {
          m.target = EDGE_MARGIN + Math.random() * (maxX - 2 * EDGE_MARGIN)
          m.mode = 'fly'
          setFacing(m.target > xRef.current ? 'right' : 'left')
        }
      } else if (m.mode === 'fly') {
        m.h += (HOVER_H - m.h) * Math.min(1, dt * 5)
        if (pausedRef.current) {
          m.mode = 'hover'
          m.until = t + 600
        } else {
          const dir = Math.sign(m.target - xRef.current)
          xRef.current += dir * FLY_SPEED * dt
          const arrived =
            dir === 0 ||
            (dir > 0 && xRef.current >= m.target) ||
            (dir < 0 && xRef.current <= m.target)
          if (arrived) {
            xRef.current = m.target
            m.mode = 'hover'
            m.until = t + 1500 + Math.random() * 4000
          }
        }
      } else if (m.mode === 'fall') {
        m.vy += GRAVITY * dt
        m.h -= m.vy * dt
        m.vx *= Math.max(0, 1 - dt * 1.2)
        xRef.current += m.vx * dt
        if (xRef.current <= 0 || xRef.current >= maxX) {
          xRef.current = Math.min(Math.max(xRef.current, 0), maxX)
          m.vx = -m.vx * 0.5 // rebate nas bordas
        }
        if (m.h <= 0) {
          m.h = 0
          if (m.vy > 250) {
            m.vy = -m.vy * BOUNCE // quica
          } else {
            // pousou: amassa e volta a flutuar
            m.vy = 0
            m.vx = 0
            m.mode = 'hover'
            m.until = t + 800 + Math.random() * 1500
            setLanded(true)
            window.setTimeout(() => setLanded(false), 240)
          }
        }
      }
      // (modo 'grabbed': posição vem dos eventos de pointer)

      const bob = m.mode === 'hover' || m.mode === 'fly' ? Math.sin(t / 340) * 3 : 0
      const renderH = m.h + bob
      if (elRef.current) {
        elRef.current.style.transform = `translateX(${xRef.current}px)`
      }
      if (liftRef.current) {
        liftRef.current.style.transform = `translateY(${-renderH}px)`
      }
      if (shadowRef.current) {
        const s = Math.max(0.3, 1 - renderH / 200)
        shadowRef.current.style.transform = `scaleX(${s})`
        shadowRef.current.style.opacity = String(0.55 * s)
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

      // ---- agendamento: piscar e ações de idle (só voando/flutuando) ----
      if (!actionRef.current && (m.mode === 'hover' || m.mode === 'fly')) {
        if (t >= nextBlinkRef.current) {
          startAction(BLINK)
          nextBlinkRef.current = t + 2800 + Math.random() * 3800
        } else if (m.mode === 'hover' && !pausedRef.current && t >= nextActionRef.current) {
          startAction(IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)])
          nextActionRef.current = t + 3000 + Math.random() * 5000
        }
      }

      // ---- composição do sprite deste frame ----
      const next: SpriteState = {
        ...BASE,
        aura: Math.floor(t / AURA_FRAME_MS) % 2 === 0 ? 1 : 2
      }
      if (m.mode === 'fly') {
        next.legs = Math.floor(t / DANGLE_FRAME_MS) % 2 === 0 ? 'dangleA' : 'dangleB'
        next.pupil = 1 // olha para a frente; o flip espelha quando voa à esquerda
      } else if (m.mode === 'grabbed') {
        next.legs = 'tuck'
        next.grabbed = true
      } else if (m.mode === 'fall') {
        next.legs = 'tuck'
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
        next.wave !== prev.wave ||
        next.aura !== prev.aura ||
        next.grabbed !== prev.grabbed
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
        hovered ? 'hovered' : '',
        grabbed ? 'grabbed' : '',
        exiting ? 'vanishing' : '',
        `facing-${facing}`
      ].join(' ')}
      onPointerEnter={() => {
        setHovered(true)
        window.api.setInteractive(true)
        if (!actionRef.current && motionRef.current.mode === 'hover') startAction(WAVE)
      }}
      onPointerLeave={() => {
        // com pointer capture ativo, só dispara depois de soltar o arrasto
        setHovered(false)
        window.api.setInteractive(false)
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastT: performance.now(),
          active: false
        }
      }}
      onPointerMove={(e) => {
        const d = dragRef.current
        if (!d || e.pointerId !== d.pointerId) return
        if (
          !d.active &&
          (Math.abs(e.clientX - d.startX) > DRAG_THRESHOLD ||
            Math.abs(e.clientY - d.startY) > DRAG_THRESHOLD)
        ) {
          d.active = true
          motionRef.current.mode = 'grabbed'
          motionRef.current.vx = 0
          setGrabbed(true)
        }
        if (d.active) {
          const m = motionRef.current
          xRef.current = Math.min(
            Math.max(e.clientX - PET_WIDTH / 2, 0),
            window.innerWidth - PET_WIDTH
          )
          m.h = Math.min(
            Math.max(window.innerHeight - e.clientY - SPRITE_HEIGHT / 2, 0),
            window.innerHeight - SPRITE_HEIGHT - 12
          )
          // inércia horizontal suavizada para o arremesso
          const now = performance.now()
          const dts = (now - d.lastT) / 1000
          if (dts > 0.016) {
            m.vx = 0.6 * m.vx + 0.4 * ((e.clientX - d.lastX) / dts)
            d.lastX = e.clientX
            d.lastT = now
          }
        }
      }}
      onPointerUp={(e) => {
        const d = dragRef.current
        if (!d || e.pointerId !== d.pointerId) return
        dragRef.current = null
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* já liberado */
        }
        if (d.active) {
          const m = motionRef.current
          m.mode = 'fall'
          m.vy = 0
          m.vx = Math.min(Math.max(m.vx, -600), 600)
          setGrabbed(false)
        } else {
          onActivate() // foi um clique: abre/fecha o chat
        }
      }}
      title="Clique para conversar; arraste para me jogar!"
    >
      <div ref={liftRef} className="pet-lift">
        <div className="pet-flip">
          {exiting && <div className="pet-blackhole" />}
          <div className="pet-glow" />
          <div className={`pet-sprite${hopping ? ' hop' : ''}${landed ? ' land' : ''}`}>
            <BillSprite {...sprite} />
          </div>
        </div>
      </div>
      <div ref={shadowRef} className="pet-shadow" />
    </div>
  )
}
