import { useEffect, useMemo, useRef, useState } from 'react'
import { PET_LIST, PETS, isPetId, type PetDef, type PetId } from '../pets'

const BALLOON_WIDTH = 330

type Msg = ChatMessage & { error?: boolean }

type ChatBalloonProps = {
  anchorX: number
  /** mascote ativo (define nome/persona/saudação) */
  pet: PetDef
  /** troca o mascote ativo (comando /pet) */
  onSwitchPet: (id: PetId) => void
  onClose: () => void
  onExit: () => void
}

export function ChatBalloon({
  anchorX,
  pet,
  onSwitchPet,
  onClose,
  onExit
}: ChatBalloonProps): React.JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: pet.greeting }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hi, setHi] = useState(0) // índice destacado no autocomplete
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // mantém a persona atual acessível dentro do send() sem recriá-lo
  const petRef = useRef(pet)
  petRef.current = pet

  // Centraliza o balão sobre o mascote, sem sair da tela
  const left = Math.min(
    Math.max(anchorX - BALLOON_WIDTH / 2, 8),
    window.innerWidth - BALLOON_WIDTH - 8
  )
  const tailLeft = Math.min(Math.max(anchorX - left - 8, 16), BALLOON_WIDTH - 32)

  // ---- autocomplete do comando /pet ----
  // Ativa quando o texto começa com "/pet"; sugere mascotes cujo id/nome casa
  // com o que já foi digitado depois do comando.
  const petQuery = input.match(/^\/pet\s*(.*)$/i)
  const suggestions = useMemo<PetDef[]>(() => {
    if (!petQuery) return []
    const q = petQuery[1].trim().toLowerCase()
    return PET_LIST.filter(
      (p) => p.id.startsWith(q) || p.name.toLowerCase().startsWith(q)
    )
  }, [petQuery])
  const showSuggest = !!petQuery && suggestions.length > 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // mantém o destaque dentro dos limites quando a lista muda
  useEffect(() => {
    setHi((h) => (h >= suggestions.length ? 0 : h))
  }, [suggestions.length])

  const say = (content: string): void =>
    setMessages((prev) => [...prev, { role: 'assistant', content }])

  // Aplica a troca de mascote (via autocomplete ou comando digitado)
  const applyPet = (id: PetId): void => {
    setInput('')
    if (id === petRef.current.id) {
      say(`Você já está conversando comigo, o ${PETS[id].name}. 🙂`)
      return
    }
    const target = PETS[id]
    onSwitchPet(id)
    say(`✨ Pronto! Agora você está com o ${target.name} ${target.icon}`)
  }

  const send = async (): Promise<void> => {
    const text = input.trim()
    if (!text || loading) return

    // Comando de saída: aceita "/exit" (com ou sem espaço) e encerra o app
    if (/^\/\s*exit$/i.test(text)) {
      setInput('')
      onExit()
      return
    }

    // Comando /pet <nome>: troca de mascote
    const petCmd = text.match(/^\/\s*pet(?:\s+(\S+))?$/i)
    if (petCmd) {
      const name = petCmd[1]?.toLowerCase()
      if (!name) {
        say(`Use /pet <nome>. Mascotes disponíveis: ${PET_LIST.map((p) => p.name).join(', ')}.`)
        setInput('')
      } else if (isPetId(name)) {
        applyPet(name)
      } else {
        const match = PET_LIST.find((p) => p.name.toLowerCase() === name)
        if (match) applyPet(match.id)
        else {
          say(
            `Não conheço o mascote "${name}". Tente: ${PET_LIST.map((p) => p.id).join(', ')}.`
          )
          setInput('')
        }
      }
      return
    }

    const history: Msg[] = [...messages.filter((m) => !m.error), { role: 'user', content: text }]
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    const result = await window.api.chat(
      history.map(({ role, content }) => ({ role, content })),
      petRef.current.id
    )
    setLoading(false)

    if (result.ok) {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.content }])
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${result.error}`, error: true }
      ])
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
        <span className="balloon-title">{pet.name} · seu assistente</span>
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

      <div className="balloon-input-wrap">
        {showSuggest && (
          <div className="pet-suggest">
            <div className="pet-suggest-label">Trocar de mascote</div>
            {suggestions.map((p, i) => (
              <button
                key={p.id}
                className={`pet-suggest-item${i === hi ? ' active' : ''}`}
                // onMouseDown (não onClick) para não perder o foco do input antes
                onMouseDown={(e) => {
                  e.preventDefault()
                  applyPet(p.id)
                }}
                onMouseEnter={() => setHi(i)}
              >
                <span className="pet-suggest-icon">{p.icon}</span>
                <span className="pet-suggest-name">{p.name}</span>
                <span className="pet-suggest-cmd">/pet {p.id}</span>
              </button>
            ))}
          </div>
        )}

        <div className="balloon-input">
          <input
            ref={inputRef}
            value={input}
            placeholder="Pergunte algo…  (tente /pet)"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (showSuggest) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHi((h) => (h + 1) % suggestions.length)
                  return
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHi((h) => (h - 1 + suggestions.length) % suggestions.length)
                  return
                }
                if (e.key === 'Tab') {
                  e.preventDefault()
                  setInput(`/pet ${suggestions[hi].id}`)
                  return
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyPet(suggestions[hi].id)
                  return
                }
                if (e.key === 'Escape') {
                  setInput('')
                  return
                }
              }
              if (e.key === 'Enter') void send()
              if (e.key === 'Escape') onClose()
            }}
          />
          <button onClick={() => void send()} disabled={loading || !input.trim()}>
            ➤
          </button>
        </div>
      </div>

      <div className="balloon-tail" style={{ left: tailLeft }} />
    </div>
  )
}
