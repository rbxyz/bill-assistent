import { useRef, useState } from 'react'
import { Pet, PET_WIDTH } from './components/Pet'
import { ChatBalloon } from './components/ChatBalloon'

export default function App(): React.JSX.Element {
  // Posição x do mascote, mutada a cada frame pelo Pet (fora do ciclo de render)
  const petXRef = useRef(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [anchorX, setAnchorX] = useState(0)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  const toggleChat = (): void => {
    setMenu(null)
    setAnchorX(petXRef.current + PET_WIDTH / 2)
    setChatOpen((open) => !open)
  }

  return (
    <div className="stage">
      <Pet
        xRef={petXRef}
        paused={chatOpen}
        onActivate={toggleChat}
        onMenu={(x, y) => setMenu({ x, y })}
      />

      {chatOpen && <ChatBalloon anchorX={anchorX} onClose={() => setChatOpen(false)} />}

      {menu && (
        <div
          className="context-menu"
          style={{ left: menu.x, top: Math.max(menu.y - 48, 8) }}
          onMouseEnter={() => window.api.setInteractive(true)}
          onMouseLeave={() => {
            window.api.setInteractive(false)
            setMenu(null)
          }}
        >
          <button onClick={() => window.api.quit()}>✕ Fechar assistente</button>
        </div>
      )}
    </div>
  )
}
