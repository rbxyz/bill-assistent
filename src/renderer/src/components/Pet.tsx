import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { TrinoSprite, SPRITE_HEIGHT } from './TrinoSprite'
import type { SpriteState } from './TrinoSprite'
import { BuddySprite } from './BuddySprite'
import { PortalSprite } from './PortalSprite'
import { BallSprite } from './BallSprite'
import { BuddyVanish } from './BuddyVanish'
import { DinoSprite, type DinoPose } from './DinoSprite'
import { CactusSprite } from './CactusSprite'
import { HoleSprite } from './HoleSprite'
import type { SpriteKind } from '../pets'

export const PET_WIDTH = 54

const FLY_SPEED = 85 // px por segundo
const EDGE_MARGIN = 24
const HOVER_H = 16 // altura de flutuação acima do chão
const GRAVITY = 2400 // px/s²
const BOUNCE = 0.35 // restituição do quique
const DRAG_THRESHOLD = 5 // px até virar arrasto (menos que isso = clique)
const DANGLE_FRAME_MS = 240
const AURA_FRAME_MS = 140
const TRAVEL_CHANCE = 0.35 // chance de migrar para a tela vizinha ao escolher destino
const TELEPORT_OUT_MS = 700 // portal abre e suga o Bill
const TELEPORT_IN_MS = 780 // portal reabre e o Bill ressurge
const RAGE_MS = 2600 // duração da fúria depois de ser arremessado demais
const RAGE_FROM_THROW = 5 // a partir deste arremesso a fúria pode estourar
const RAGE_STEP = 0.2 // +20% de chance de fúria por arremesso após o limite
const DINO_JUMP_VY = -780 // impulso do pulo do dino (negativo = para cima)
const DINO_RUN_FRAME_MS = 150 // troca dos frames de caminhada do dino

const BASE: SpriteState = {
  legs: 'dangleA',
  eye: 'open',
  pupil: 0,
  hatLift: 0,
  wave: 0,
  aura: 1,
  grabbed: false,
  ball: null
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

// Embaixadinhas ("jogar bola"): a bola quica entre os pés (chutes alternados),
// o olho acompanha, e no fim um chutão manda a bola embora pelo alto. Funciona
// para ambos os mascotes — a bola é um overlay (BallSprite) e o Buddy também dá
// o pulinho (hop), mesmo sem as poses de chute.
// Coordenadas em px do contêiner do pet (54×64): pé direito ≈ x36, pé esquerdo
// ≈ x18, linha dos pés ≈ y50, ápice do arco ≈ y30.
const KEEPY_UPPY: Step[] = [
  { d: 140, s: { legs: 'kickA', pupil: 1, ball: { x: 36, y: 50 } }, hop: true },
  { d: 110, s: { legs: 'dangleA', pupil: 1, ball: { x: 33, y: 40 } }, hop: true },
  { d: 130, s: { legs: 'dangleB', pupil: 0, ball: { x: 29, y: 33 } } },
  { d: 110, s: { legs: 'dangleA', pupil: -1, ball: { x: 24, y: 38 } } },
  { d: 140, s: { legs: 'kickB', pupil: -1, ball: { x: 18, y: 50 } }, hop: true },
  { d: 110, s: { legs: 'dangleB', pupil: -1, ball: { x: 21, y: 40 } } },
  { d: 130, s: { legs: 'dangleA', pupil: 0, ball: { x: 26, y: 33 } } },
  { d: 110, s: { legs: 'dangleB', pupil: 1, ball: { x: 31, y: 40 } } },
  { d: 140, s: { legs: 'kickA', pupil: 1, ball: { x: 36, y: 50 } }, hop: true },
  { d: 110, s: { legs: 'dangleA', pupil: 1, ball: { x: 41, y: 34 } } }, // chutão
  { d: 110, s: { legs: 'dangleB', pupil: 1, ball: { x: 47, y: 18 } } },
  { d: 100, s: { legs: 'dangleA', pupil: 1, ball: { x: 52, y: 4 } } },
  { d: 160, s: { eye: 'happy', ball: null } }, // comemora
  { d: 60, s: { eye: 'open', ball: null } }
]

// Fúria: sobrancelha franzida + labaredas subindo (rage), com a chama tremulando
const FURY: Step[] = [
  { d: 120, s: { brow: true, rage: true, aura: 1, eye: 'open' } },
  { d: 120, s: { brow: true, rage: true, aura: 2 } },
  { d: 120, s: { brow: true, rage: true, aura: 1 } },
  { d: 120, s: { brow: true, rage: true, aura: 2 } },
  { d: 120, s: { brow: true, rage: true, aura: 1 } },
  { d: 140, s: { brow: true, rage: true, aura: 2, eye: 'closed' } },
  { d: 80, s: { eye: 'open' } }
]

// Embaixadinhas do Buddy: ele não tem poses de chute, então "joga bola" parando
// no lugar e dando pulinhos (hop) a cada toque, com a bola quicando entre as
// perninhas. É mais longa que a do Trino — o Buddy se empolga.
const BUDDY_KEEPY: Step[] = [
  { d: 130, s: { ball: { x: 27, y: 46 } }, hop: true },
  { d: 120, s: { ball: { x: 24, y: 33 } } },
  { d: 130, s: { ball: { x: 21, y: 45 } }, hop: true },
  { d: 120, s: { ball: { x: 24, y: 31 } } },
  { d: 130, s: { ball: { x: 30, y: 46 } }, hop: true },
  { d: 120, s: { ball: { x: 33, y: 33 } } },
  { d: 130, s: { ball: { x: 33, y: 45 } }, hop: true },
  { d: 120, s: { ball: { x: 30, y: 30 } } },
  { d: 130, s: { ball: { x: 27, y: 46 } }, hop: true },
  { d: 120, s: { ball: { x: 27, y: 29 } } },
  { d: 130, s: { ball: { x: 27, y: 46 } }, hop: true },
  { d: 110, s: { ball: { x: 34, y: 30 } } }, // chutão para o alto
  { d: 110, s: { ball: { x: 42, y: 14 } } },
  { d: 100, s: { ball: { x: 50, y: 2 } } },
  { d: 240, s: { ball: null } } // comemora
]

// Pulinhos simples (Buddy ignora poses do Trino; só o hop aparece)
const BUDDY_HOPS: Step[] = [
  { d: 220, s: {}, hop: true },
  { d: 260, s: {} },
  { d: 220, s: {}, hop: true },
  { d: 200, s: {} }
]

const IDLE_ACTIONS = [LOOK_AROUND, HAT_TIP, WAVE, DOUBLE_BLINK, KEEPY_UPPY, FURY]
// O Buddy só "vê" hop e a bola; suas ações de idle são a embaixadinha + pulinhos.
const BUDDY_ACTIONS = [BUDDY_KEEPY, BUDDY_HOPS]

// soma das durações de uma ação (para travar o movimento enquanto ela roda)
function actionDuration(steps: Step[]): number {
  return steps.reduce((sum, s) => sum + s.d, 0)
}

// travel = fora da tela, aguardando a janela migrar de monitor
// tpOut/tpIn = fases do teletransporte (sugado pelo portal / ressurgindo)
type Mode = 'hover' | 'fly' | 'grabbed' | 'fall' | 'travel' | 'tpOut' | 'tpIn'

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
  /** saindo de cena por troca de mascote (/pet): o dino cai e não volta */
  leaving?: boolean
  /** qual sprite renderizar (mascote ativo); trocado pelo comando /pet */
  character: SpriteKind
  onActivate: () => void
}

export function Pet({
  xRef,
  paused,
  exiting,
  leaving = false,
  character,
  onActivate
}: PetProps): React.JSX.Element {
  const elRef = useRef<HTMLDivElement>(null)
  const liftRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const [hovered, setHovered] = useState(false)
  const [grabbed, setGrabbed] = useState(false)
  const [landed, setLanded] = useState(false)
  const [sprite, setSprite] = useState<SpriteState>(BASE)
  const [hopping, setHopping] = useState(false)
  const [teleportPhase, setTeleportPhase] = useState<'out' | 'in' | null>(null)
  // contador local que dirige a orquestração do sumiço em pixel art (PortalSprite)
  const [vanishTick, setVanishTick] = useState(0)
  // contador que dirige o teletransporte em pixel art (portal/sparkles)
  const [tpTick, setTpTick] = useState(0)
  // fala efêmera sobre o mascote (ex.: "Vai, Pelé!" durante a embaixadinha)
  const [emote, setEmote] = useState<string | null>(null)
  // pose do dino (parado/correndo/pulando) e obstáculo (cacto) durante o pulo
  const [dinoPose, setDinoPose] = useState<DinoPose>('stand')
  const [obstacle, setObstacle] = useState(false)

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
  const nextTeleportRef = useRef(0)
  // contagem de arremessos e fúria acumulada: a partir de RAGE_FROM_THROW a
  // chance de surtar sobe RAGE_STEP a cada jogada até 100%
  const throwCountRef = useRef(0)
  const pendingRageRef = useRef(false)
  const rageUntilRef = useRef(0)
  const screenRef = useRef<ScreenInfo>({ hasLeft: false, hasRight: false, width: 0 })
  const travelDirRef = useRef<'left' | 'right' | null>(null)
  // arrasto cruzando monitores: 'pending' = janela migrando; 'remap' = migrou,
  // o próximo pointermove precisa rebasear as coordenadas do arrasto
  const dragTravelRef = useRef<'pending' | 'remap' | null>(null)
  const spriteRef = useRef<SpriteState>(BASE)
  const pausedRef = useRef(false)
  pausedRef.current = paused || hovered
  const exitingRef = useRef(false)
  exitingRef.current = exiting
  const leavingRef = useRef(false)
  leavingRef.current = leaving
  // o loop de animação roda numa closure estável; lê o mascote ativo por ref
  const characterRef = useRef(character)
  characterRef.current = character
  const emoteTimerRef = useRef(0)
  // dino: pose atual (evita re-render por frame) e flag de pulo (não quica nem some)
  const dinoPoseRef = useRef<DinoPose>('stand')
  const jumpingRef = useRef(false)

  const startAction = (steps: Step[]): void => {
    actionRef.current = { steps, index: 0, until: performance.now() + steps[0].d }
  }

  // Saída de cena (/exit ou troca de mascote): avança o tick a cada 140ms. Trava
  // em 12 para o sprite não reaparecer antes de encerrar/trocar.
  useEffect(() => {
    if (!exiting && !leaving) {
      setVanishTick(0)
      return
    }
    const id = window.setInterval(() => setVanishTick((v) => Math.min(v + 1, 12)), 140)
    return () => window.clearInterval(id)
  }, [exiting, leaving])

  // Teletransporte em pixel art: avança o tick do portal/sparkles a cada 130ms;
  // zera quando a fase muda (out → in) para reiniciar a animação.
  useEffect(() => {
    setTpTick(0)
    if (!teleportPhase) return
    const id = window.setInterval(() => setTpTick((v) => Math.min(v + 1, 12)), 130)
    return () => window.clearInterval(id)
  }, [teleportPhase])

  // limpa o timer da fala efêmera ao desmontar
  useEffect(() => () => window.clearTimeout(emoteTimerRef.current), [])

  useEffect(() => {
    if (xRef.current === 0) {
      xRef.current = window.innerWidth / 2 - PET_WIDTH / 2
    }
    const now = performance.now()
    motionRef.current.until = now + 1200
    nextBlinkRef.current = now + 2500
    nextActionRef.current = now + 2000
    nextTeleportRef.current = now + 18000 + Math.random() * 30000
    window.api.screenInfo().then((info) => {
      screenRef.current = info
    })

    let raf = 0
    const tick = (t: number): void => {
      const m = motionRef.current
      const dt = m.last ? Math.min((t - m.last) / 1000, 0.05) : 0
      m.last = t
      const maxX = window.innerWidth - PET_WIDTH
      // o dino anda no chão (altura 0); os demais flutuam a HOVER_H
      const groundH = characterRef.current === 'dino' ? 0 : HOVER_H

      // Saindo (encerrar ou trocar de mascote): congela; a animação de saída assume
      if (exitingRef.current || leavingRef.current) {
        raf = requestAnimationFrame(tick)
        return
      }

      // ---- movimento ----
      if (m.mode === 'hover') {
        m.h += (groundH - m.h) * Math.min(1, dt * 5)
        if (pausedRef.current) {
          m.until = t + 600
        } else if (t >= m.until) {
          // Às vezes o destino é a tela vizinha: voa até sumir pela borda
          const info = screenRef.current
          const dirs: Array<'left' | 'right'> = []
          if (info.hasLeft) dirs.push('left')
          if (info.hasRight) dirs.push('right')
          if (dirs.length > 0 && Math.random() < TRAVEL_CHANCE) {
            const dir = dirs[Math.floor(Math.random() * dirs.length)]
            travelDirRef.current = dir
            m.target = dir === 'right' ? maxX + PET_WIDTH * 2 : -PET_WIDTH * 2
          } else {
            travelDirRef.current = null
            m.target = EDGE_MARGIN + Math.random() * (maxX - 2 * EDGE_MARGIN)
          }
          m.mode = 'fly'
          setFacing(m.target > xRef.current ? 'right' : 'left')
        }
      } else if (m.mode === 'fly') {
        m.h += (groundH - m.h) * Math.min(1, dt * 5)
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
            const travel = travelDirRef.current
            if (travel) {
              // Sumiu pela borda: migra a janela para o monitor vizinho e
              // entra pela borda oposta da nova tela
              travelDirRef.current = null
              m.mode = 'travel'
              window.api.travel(travel).then((info) => {
                screenRef.current = info
                xRef.current = travel === 'right' ? -PET_WIDTH : info.width
                m.target = EDGE_MARGIN + Math.random() * (info.width - PET_WIDTH - 2 * EDGE_MARGIN)
                setFacing(travel === 'right' ? 'right' : 'left')
                m.mode = 'fly'
              })
            } else {
              xRef.current = m.target
              m.mode = 'hover'
              m.until = t + 1500 + Math.random() * 4000
            }
          }
        }
      } else if (m.mode === 'tpOut') {
        m.h += (groundH - m.h) * Math.min(1, dt * 5)
        if (t >= m.until) {
          if (characterRef.current === 'dino') {
            // Dino: caiu num buraco e sai de outro em OUTRO ponto da mesma tela
            xRef.current = EDGE_MARGIN + Math.random() * (maxX - 2 * EDGE_MARGIN)
            setFacing(Math.random() < 0.5 ? 'left' : 'right')
            m.mode = 'tpIn'
            m.until = t + TELEPORT_IN_MS
            setTeleportPhase('in')
          } else {
            // Sugado: janela pula para um monitor aleatório enquanto está invisível
            m.mode = 'travel'
            window.api.teleport().then((info) => {
              screenRef.current = info
              xRef.current = EDGE_MARGIN + Math.random() * (info.width - PET_WIDTH - 2 * EDGE_MARGIN)
              setFacing(Math.random() < 0.5 ? 'left' : 'right')
              const m2 = motionRef.current
              m2.mode = 'tpIn'
              m2.until = performance.now() + TELEPORT_IN_MS
              setTeleportPhase('in')
            })
          }
        }
      } else if (m.mode === 'tpIn') {
        m.h += (groundH - m.h) * Math.min(1, dt * 5)
        if (t >= m.until) {
          m.mode = 'hover'
          m.until = t + 1200 + Math.random() * 2500
          setTeleportPhase(null)
          nextTeleportRef.current = t + 25000 + Math.random() * 45000
        }
      } else if (m.mode === 'fall') {
        m.vy += GRAVITY * dt
        m.h -= m.vy * dt
        m.vx *= Math.max(0, 1 - dt * 1.2)
        xRef.current += m.vx * dt
        if (xRef.current <= 0 || xRef.current >= maxX) {
          // Arremessado contra a borda: se há monitor vizinho, atravessa;
          // ao sumir por completo, a janela migra e ele entra pelo outro lado
          const dir: 'left' | 'right' = xRef.current <= 0 ? 'left' : 'right'
          const canCross = dir === 'left' ? screenRef.current.hasLeft : screenRef.current.hasRight
          if (canCross) {
            if (xRef.current <= -PET_WIDTH || xRef.current >= maxX + PET_WIDTH) {
              m.mode = 'travel'
              window.api.travel(dir).then((info) => {
                screenRef.current = info
                xRef.current = dir === 'right' ? -PET_WIDTH : info.width
                motionRef.current.mode = 'fall'
              })
            }
          } else {
            xRef.current = Math.min(Math.max(xRef.current, 0), maxX)
            m.vx = -m.vx * 0.5 // rebate nas bordas
          }
        }
        if (m.h <= 0) {
          m.h = 0
          if (m.vy > 250 && !jumpingRef.current) {
            m.vy = -m.vy * BOUNCE // quica (só em arremesso, nunca no pulo do dino)
          } else {
            // pousou: amassa e volta a flutuar
            m.vy = 0
            m.vx = 0
            m.mode = 'hover'
            m.until = t + 800 + Math.random() * 1500
            setLanded(true)
            window.setTimeout(() => setLanded(false), 240)
            // fim do pulo do dino: tira o obstáculo (cacto) da frente
            if (jumpingRef.current) {
              jumpingRef.current = false
              setObstacle(false)
            }
            // estourou a fúria neste arremesso: fica furioso parado no lugar
            // (Trino flameja e treme; Buddy pula; o dino vira Godzilla — via .angry)
            if (pendingRageRef.current) {
              pendingRageRef.current = false
              rageUntilRef.current = t + RAGE_MS
              m.until = t + RAGE_MS + 400 // não voa nem teleporta enquanto surta
            }
          }
        }
      }
      // (modo 'grabbed': posição vem dos eventos de pointer)

      // o dino não flutua: anda firme no chão (sem bob senoidal)
      const bob =
        characterRef.current !== 'dino' && (m.mode === 'hover' || m.mode === 'fly')
          ? Math.sin(t / 340) * 3
          : 0
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

      // ---- agendamento: piscar, teletransporte e ações de idle ----
      if (!actionRef.current && (m.mode === 'hover' || m.mode === 'fly')) {
        if (t >= nextBlinkRef.current) {
          startAction(BLINK)
          nextBlinkRef.current = t + 2800 + Math.random() * 3800
        } else if (
          m.mode === 'hover' &&
          !pausedRef.current &&
          t >= rageUntilRef.current &&
          t >= nextTeleportRef.current
        ) {
          m.mode = 'tpOut'
          m.until = t + TELEPORT_OUT_MS
          setTeleportPhase('out')
          setHovered(false)
          window.api.setInteractive(false)
        } else if (
          m.mode === 'hover' &&
          !pausedRef.current &&
          t >= rageUntilRef.current &&
          t >= nextActionRef.current
        ) {
          if (characterRef.current === 'dino') {
            // Dino: pula sobre um obstáculo (cacto que surge na frente)
            m.mode = 'fall'
            m.vy = DINO_JUMP_VY
            m.vx = 0
            jumpingRef.current = true
            setObstacle(true)
            nextActionRef.current = t + 2600 + Math.random() * 4000
          } else {
            const acts = characterRef.current === 'buddy' ? BUDDY_ACTIONS : IDLE_ACTIONS
            const chosen = acts[Math.floor(Math.random() * acts.length)]
            startAction(chosen)
            // trava o voo enquanto a ação roda: o mascote "para" para brincar
            m.until = Math.max(m.until, t + actionDuration(chosen) + 300)
            // evento raro: o Buddy comemora a embaixadinha gritando "Vai, Pelé!"
            if (chosen === BUDDY_KEEPY && Math.random() < 0.18) {
              setEmote('Vai, Pelé! ⚽')
              window.clearTimeout(emoteTimerRef.current)
              emoteTimerRef.current = window.setTimeout(
                () => setEmote(null),
                actionDuration(chosen) + 200
              )
            }
            nextActionRef.current = t + 3000 + Math.random() * 5000
          }
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
      } else if (m.mode === 'fall' || m.mode === 'tpOut' || m.mode === 'tpIn' || m.mode === 'travel') {
        next.legs = 'tuck'
      }
      const action = actionRef.current
      if (action) {
        const step = action.steps[action.index]
        Object.assign(next, step.s)
        if (step.hop) setHopping(true)
      }

      // fúria sustentada por arremessos: labaredas + tremor no Trino; o pulo do
      // Buddy vem do CSS (.pet.char-buddy.angry) ao ver sprite.rage ligado
      if (t < rageUntilRef.current) {
        next.rage = true
        next.brow = true
        next.eye = 'open'
      }

      const prev = spriteRef.current
      if (
        next.legs !== prev.legs ||
        next.eye !== prev.eye ||
        next.pupil !== prev.pupil ||
        next.hatLift !== prev.hatLift ||
        next.wave !== prev.wave ||
        next.aura !== prev.aura ||
        next.grabbed !== prev.grabbed ||
        next.brow !== prev.brow ||
        next.rage !== prev.rage ||
        next.gem !== prev.gem ||
        next.ball?.x !== prev.ball?.x ||
        next.ball?.y !== prev.ball?.y
      ) {
        spriteRef.current = next
        setSprite(next)
      }

      // ---- pose do dino (correndo/pulando/parado) ----
      if (characterRef.current === 'dino') {
        let dp: DinoPose = 'stand'
        if (m.mode === 'fall' || m.mode === 'tpOut' || m.mode === 'tpIn' || m.mode === 'travel') {
          dp = 'jump'
        } else if (m.mode === 'fly') {
          dp = Math.floor(t / DINO_RUN_FRAME_MS) % 2 === 0 ? 'runA' : 'runB'
        }
        if (dp !== dinoPoseRef.current) {
          dinoPoseRef.current = dp
          setDinoPose(dp)
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [xRef])

  // Renderiza o sprite do mascote ativo. O Trino é dirigido pelo estado completo
  // (olhos, pernas, fúria…); o Buddy se auto-anima e só recebe o "grabbed".
  const renderSprite = (grabbedOverride?: boolean): React.JSX.Element => {
    const g = grabbedOverride ?? sprite.grabbed
    if (character === 'dino') {
      // segurado = parado e piscando (a piscada é interna do DinoSprite)
      return <DinoSprite pose={g ? 'stand' : dinoPose} rage={sprite.rage} grabbed={g} />
    }
    return character === 'buddy' ? (
      <BuddySprite grabbed={g} />
    ) : (
      <TrinoSprite {...sprite} grabbed={g} accent="ciano" />
    )
  }

  // Teletransporte em pixel art: o Trino é sugado por um PortalSprite; o Buddy se
  // desfaz/reconstitui em sparkles. Dirigido por tpTick (≈5 frames por fase).
  const renderTeleport = (): React.JSX.Element => {
    const phase = teleportPhase ?? 'out'
    const q = Math.min(tpTick / 5, 1)
    if (character === 'dino') {
      // out: cai dentro de um buraco; in: cai de cima saindo de outro buraco
      const sink = phase === 'out'
      const dy = sink ? Math.round(q * 30) : Math.round(-(1 - q) * 38)
      // afunda recortando a parte de baixo do sprite (some dentro do buraco)
      const clip = sink ? `inset(0 0 ${Math.round(q * 95)}% 0)` : 'inset(0 0 0 0)'
      const opacity = sink ? (q > 0.85 ? 0 : 1) : Math.min(1, q * 2)
      return (
        <>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 2,
              transform: 'translateX(-50%)',
              zIndex: 0,
              pointerEvents: 'none'
            }}
          >
            <HoleSprite />
          </div>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              transform: `translateY(${dy}px)`,
              clipPath: clip,
              opacity,
              transition: 'transform .12s linear, opacity .12s linear, clip-path .12s linear'
            }}
          >
            {renderSprite()}
          </div>
        </>
      )
    }
    if (character === 'buddy') {
      const bodyScale = phase === 'out' ? Math.max(0, 1 - q * 1.2) : Math.min(1, q * 1.2)
      const bodyOpacity = phase === 'out' ? 1 - q * 1.5 : q * 1.5 - 0.2
      return (
        <>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              transformOrigin: '50% 55%',
              transform: `scale(${bodyScale.toFixed(2)})`,
              opacity: Math.max(0, Math.min(1, bodyOpacity)),
              transition: 'transform .12s linear, opacity .12s linear'
            }}
          >
            {renderSprite()}
          </div>
          <BuddyVanish progress={q} mode={phase} />
        </>
      )
    }
    const suck = phase === 'out'
    const bodyTransform = suck
      ? `rotate(${Math.round(q * 360)}deg) scale(${Math.max(0, 1 - q).toFixed(2)})`
      : `rotate(${Math.round(-(1 - q) * 360)}deg) scale(${Math.min(1, q).toFixed(2)})`
    const bodyOpacity = suck ? 1 - q * 1.3 : q * 1.4
    // o portal abre rápido, segura aberto e só encolhe bem no fim
    const portalScale = q < 0.3 ? q / 0.3 : q > 0.85 ? (1 - q) / 0.15 : 1
    return (
      <>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '55%',
            transform: `translate(-50%,-50%) scale(${Math.max(0.05, portalScale).toFixed(2)})`,
            transition: 'transform .12s linear',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        >
          <PortalSprite frame={tpTick % 3} accent="ciano" scale={4} />
        </div>
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            transformOrigin: '50% 60%',
            transform: bodyTransform,
            opacity: Math.max(0, Math.min(1, bodyOpacity)),
            transition: 'transform .12s linear, opacity .12s linear'
          }}
        >
          {renderSprite()}
        </div>
      </>
    )
  }

  return (
    <div
      ref={elRef}
      className={[
        'pet',
        `char-${character}`,
        hovered ? 'hovered' : '',
        grabbed ? 'grabbed' : '',
        exiting ? 'vanishing' : '',
        teleportPhase === 'out' ? 'tp-out' : '',
        teleportPhase === 'in' ? 'tp-in' : '',
        sprite.rage ? 'angry' : '',
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
        const mode = motionRef.current.mode
        if (mode === 'tpOut' || mode === 'tpIn' || mode === 'travel') return
        dragTravelRef.current = null
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
          // a janela acabou de migrar de monitor: clientX agora é relativo à
          // nova posição — rebaseia o cálculo de inércia para não dar pico
          if (dragTravelRef.current === 'remap') {
            dragTravelRef.current = null
            d.lastX = e.clientX
            d.lastT = performance.now()
            m.vx = 0
          }
          // com pointer capture, os eventos seguem chegando mesmo com o cursor
          // fora da janela; cruzou para o monitor vizinho? migra a janela junto
          if (!dragTravelRef.current) {
            const info = screenRef.current
            const dir: 'left' | 'right' | null =
              e.clientX < -2 && info.hasLeft
                ? 'left'
                : e.clientX > window.innerWidth + 2 && info.hasRight
                  ? 'right'
                  : null
            if (dir) {
              dragTravelRef.current = 'pending'
              window.api.travel(dir).then((next) => {
                screenRef.current = next
                dragTravelRef.current = dragRef.current ? 'remap' : null
              })
            }
          }
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
          // arremesso: do 5º em diante a chance de fúria sobe 20% por jogada;
          // a fúria estoura no pouso (marcada aqui, disparada no landing)
          throwCountRef.current += 1
          if (throwCountRef.current >= RAGE_FROM_THROW) {
            const chance = Math.min(1, (throwCountRef.current - (RAGE_FROM_THROW - 1)) * RAGE_STEP)
            if (Math.random() < chance) {
              pendingRageRef.current = true
              throwCountRef.current = 0 // reinicia o acúmulo após surtar
            }
          }
        } else {
          onActivate() // foi um clique: abre/fecha o chat
        }
      }}
      title="Clique para conversar; arraste para me jogar!"
    >
      <div ref={liftRef} className="pet-lift">
        <div className="pet-flip">
          {exiting || leaving
            ? character === 'dino'
              ? (() => {
                  // Saída do dino (/exit ou troca): cai e não volta
                  const fp = vanishTick / 5
                  const dy = Math.round(fp * fp * 150)
                  const op = Math.max(0, 1 - fp * 0.55)
                  return (
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        transform: `translateY(${dy}px) rotate(${Math.round(fp * 28)}deg)`,
                        opacity: op,
                        transition: 'transform .14s linear, opacity .14s linear'
                      }}
                    >
                      {renderSprite()}
                    </div>
                  )
                })()
              : character === 'buddy'
              ? (() => {
                  // Sumiço do Buddy: o corpo encolhe e some enquanto sparks
                  // (pixels marrons) se espalham para fora — sem portal.
                  const vp = Math.min(vanishTick / 10, 1)
                  const spriteScale = Math.max(0, 1 - vp * 1.1)
                  const spriteOpacity = Math.max(0, 1 - vp * 1.5)
                  return (
                    <>
                      <div
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          transformOrigin: '50% 55%',
                          transform: `scale(${spriteScale.toFixed(2)})`,
                          opacity: spriteOpacity,
                          transition: 'transform .14s linear, opacity .14s linear'
                        }}
                      >
                        {renderSprite()}
                      </div>
                      <BuddyVanish progress={vp} mode="out" />
                    </>
                  )
                })()
              : (() => {
                // Sumiço em pixel art: portal atrás, Trino sugado girando à frente
                const p = vanishTick % 24
                const k = (p - 2) / 6
                const sucked = p >= 3 && p <= 8
                const spriteTransform = sucked
                  ? `translateY(${Math.round(k * 26)}px) rotate(${Math.round(k * 420)}deg) scale(${(1 - 0.93 * k).toFixed(2)})`
                  : p >= 9 && p <= 12
                    ? 'scale(0.05)'
                    : p >= 13 && p <= 15
                      ? `rotate(${Math.round(-(1 - (p - 12) / 3) * 300)}deg) scale(${(0.05 + 0.95 * ((p - 12) / 3)).toFixed(2)})`
                      : 'none'
                const spriteOpacity = p >= 9 && p <= 12 ? 0 : 1
                const portalOn = p >= 1 && p <= 17
                const portalScale =
                  p === 1 ? 0.35 : p === 2 ? 0.7 : p === 16 ? 0.6 : p === 17 ? 0.3 : 1
                return (
                  <>
                    {portalOn && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '55%',
                          transform: `translate(-50%,-50%) scale(${portalScale})`,
                          transition: 'transform .14s linear',
                          zIndex: 0,
                          pointerEvents: 'none'
                        }}
                      >
                        <PortalSprite frame={vanishTick % 3} accent="ciano" />
                      </div>
                    )}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        transformOrigin: '50% 60%',
                        transform: spriteTransform,
                        opacity: spriteOpacity,
                        transition: 'transform .14s linear, opacity .14s linear'
                      }}
                    >
                      {renderSprite(sucked)}
                    </div>
                  </>
                )
              })()
            : teleportPhase
              ? renderTeleport()
              : (
                  <>
                    <div className="pet-glow" />
                    <div className={`pet-sprite${hopping ? ' hop' : ''}${landed ? ' land' : ''}`}>
                      {renderSprite()}
                    </div>
                    {sprite.ball && (
                      <div className="pet-ball" style={{ left: sprite.ball.x, top: sprite.ball.y }}>
                        <BallSprite />
                      </div>
                    )}
                  </>
                )}
        </div>
      </div>
      {/* obstáculo (cacto) no chão, na frente do dino, durante o pulo */}
      {obstacle && character === 'dino' && (
        <div className={`pet-cactus ${facing === 'left' ? 'front-left' : 'front-right'}`}>
          <CactusSprite />
        </div>
      )}
      {emote && <div className="pet-emote">{emote}</div>}
      <div ref={shadowRef} className="pet-shadow" />
    </div>
  )
}
