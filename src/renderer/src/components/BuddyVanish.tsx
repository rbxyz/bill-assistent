/**
 * BuddyVanish — "sparkles" do Buddy: pixels quadrados marrons (a cor do corpo)
 * que se espalham para fora ou convergem para dentro.
 *
 * Usado em dois lugares:
 *  - /exit (sumiço): o corpo encolhe e some enquanto os sparkles explodem para
 *    fora (mode 'out').
 *  - teletransporte: no lugar do portal, o Buddy se desfaz em sparkles ('out')
 *    e se reconstitui com os sparkles convergindo ('in').
 *
 * Dirigido por um `progress` 0..1; o Pet.tsx deriva esse progresso de um tick.
 */

const BROWN = ['#c77257', '#a85940', '#83442f', '#e0906a', '#5e3322']

// Sparks pré-calculados (determinísticos): ângulo de saída, distância, tamanho,
// gravidade e cor. Espalhados em volta com um leve embaralhamento por índice.
const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 4) * 0.21
  const dist = 20 + ((i * 13) % 20) // 20..39px
  const size = 3 + ((i * 7) % 3) // 3..5px
  const gravity = 10 + ((i * 5) % 16) // arrasto para baixo
  const color = BROWN[i % BROWN.length]
  return { angle, dist, size, gravity, color }
})

type VanishProps = {
  /** progresso da animação, 0..1 */
  progress: number
  /** 'out' = explode para fora (some); 'in' = converge para dentro (reaparece) */
  mode?: 'out' | 'in'
}

export function BuddyVanish({ progress, mode = 'out' }: VanishProps): React.JSX.Element {
  const p = Math.max(0, Math.min(1, progress))
  const ease = 1 - (1 - p) * (1 - p) // ease-out: rápido no começo, desacelera
  // 'out': sai do centro (f 0→1). 'in': chega ao centro (f 1→0).
  const f = mode === 'in' ? 1 - ease : ease
  // sparks visíveis no começo e somem no fim, nos dois modos
  const opacity = Math.max(0, Math.min(1, (1 - p) * 1.6))

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      {SPARKS.map((s, i) => {
        const dx = Math.cos(s.angle) * s.dist * f
        const grav = mode === 'in' ? s.gravity * (1 - p) * (1 - p) : s.gravity * p * p
        const dy = Math.sin(s.angle) * s.dist * f + grav
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '52%',
              width: s.size,
              height: s.size,
              background: s.color,
              opacity,
              transform: `translate(${dx}px, ${dy}px) translate(-50%, -50%)`,
              transition: 'transform .12s linear, opacity .12s linear'
            }}
          />
        )
      })}
    </div>
  )
}
