import { useRef, useState } from 'react'
import { Pet, PET_WIDTH } from './components/Pet'
import { ChatBalloon } from './components/ChatBalloon'
import { PETS, type PetId } from './pets'

// Duração da animação de sumiço (portal em pixel art) antes de encerrar o app.
// O Trino é sugado e fica "engolido" (fase ~12, em 140ms/fase ≈ 1,68s); fechamos
// um pouco depois, com o portal ainda aberto.
const VANISH_MS = 1750
// Ao trocar de mascote a partir do dino, ele cai antes de o novo entrar
const SWITCH_FALL_MS = 950

export default function App(): React.JSX.Element {
  // Posição x do mascote, mutada a cada frame pelo Pet (fora do ciclo de render)
  const petXRef = useRef(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [anchorX, setAnchorX] = useState(0)
  const [exiting, setExiting] = useState(false)
  // Mascote ativo; trocado pelo comando /pet dentro do chat
  const [petId, setPetId] = useState<PetId>('bill')
  // saindo de cena por troca (o dino cai antes de o próximo mascote entrar)
  const [leaving, setLeaving] = useState(false)
  const pet = PETS[petId]

  // Troca de mascote: se o atual é o dino, ele cai primeiro e só então o novo
  // assume a cena; para os demais, a troca é instantânea.
  const switchPet = (next: PetId): void => {
    if (next === petId) return
    if (petId === 'dino') {
      setLeaving(true)
      window.setTimeout(() => {
        setPetId(next)
        setLeaving(false)
      }, SWITCH_FALL_MS)
    } else {
      setPetId(next)
    }
  }

  const toggleChat = (): void => {
    if (exiting) return
    setAnchorX(petXRef.current + PET_WIDTH / 2)
    setChatOpen((open) => !open)
  }

  // Comando /exit: fecha o chat e dispara a animação de buraco negro; ao
  // terminar, encerra o processo.
  const beginExit = (): void => {
    setChatOpen(false)
    setExiting(true)
    window.setTimeout(() => window.api.quit(), VANISH_MS)
  }

  return (
    <div className="stage">
      <Pet
        xRef={petXRef}
        paused={chatOpen}
        exiting={exiting}
        leaving={leaving}
        character={pet.sprite}
        onActivate={toggleChat}
      />

      {chatOpen && (
        <ChatBalloon
          anchorX={anchorX}
          pet={pet}
          onSwitchPet={switchPet}
          onClose={() => setChatOpen(false)}
          onExit={beginExit}
        />
      )}
    </div>
  )
}
