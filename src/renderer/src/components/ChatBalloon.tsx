import { useEffect, useRef, useState } from 'react'

const BALLOON_WIDTH = 330

type Msg = ChatMessage & { error?: boolean }

type ChatBalloonProps = {
  anchorX: number
  onClose: () => void
}

export function ChatBalloon({ anchorX, onClose }: ChatBalloonProps): React.JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Oi! Eu sou o Bill 👋 Pode me perguntar qualquer coisa!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Centraliza o balão sobre o mascote, sem sair da tela
  const left = Math.min(
    Math.max(anchorX - BALLOON_WIDTH / 2, 8),
    window.innerWidth - BALLOON_WIDTH - 8
  )
  const tailLeft = Math.min(Math.max(anchorX - left - 8, 16), BALLOON_WIDTH - 32)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (): Promise<void> => {
    const text = input.trim()
    if (!text || loading) return

    const history: Msg[] = [...messages.filter((m) => !m.error), { role: 'user', content: text }]
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    const result = await window.api.chat(history.map(({ role, content }) => ({ role, content })))
    setLoading(false)

    if (result.ok) {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.content }])
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${result.error}`, error: true }])
    }
  }

  return (
    <div
      className="balloon"
      style={{ left }}
      onMouseEnter={() => window.api.setInteractive(true)}
      onMouseLeave={() => window.api.setInteractive(false)}
    >
      <div className="balloon-header">
        <span className="balloon-title">Bill · seu assistente</span>
        <button className="balloon-close" onClick={onClose} aria-label="Fechar chat">
          ✕
        </button>
      </div>

      <div className="balloon-messages" ref={listRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.role}${msg.error ? ' error' : ''}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="bubble assistant typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      <div className="balloon-input">
        <input
          ref={inputRef}
          value={input}
          placeholder="Pergunte algo…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send()
            if (e.key === 'Escape') onClose()
          }}
        />
        <button onClick={() => void send()} disabled={loading || !input.trim()}>
          ➤
        </button>
      </div>

      <div className="balloon-tail" style={{ left: tailLeft }} />
    </div>
  )
}
