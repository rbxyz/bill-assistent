import { useRef, useState } from 'react'
import { Pet, PET_WIDTH } from './components/Pet'
import { ChatBalloon } from './components/ChatBalloon'

// Duração da animação de "sugado pelo buraco negro" antes de encerrar o app
const VANISH_MS = 1400

export default function App(): React.JSX.Element {
  // Posição x do mascote, mutada a cada frame pelo Pet (fora do ciclo de render)
  const petXRef = useRef(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [anchorX, setAnchorX] = useState(0)
  const [exiting, setExiting] = useState(false)

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
      <Pet xRef={petXRef} paused={chatOpen} exiting={exiting} onActivate={toggleChat} />

      {chatOpen && (
        <ChatBalloon anchorX={anchorX} onClose={() => setChatOpen(false)} onExit={beginExit} />
      )}
    </div>
  )
}
