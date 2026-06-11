/// <reference types="vite/client" />

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ChatResult = { ok: true; content: string } | { ok: false; error: string }

interface Window {
  api: {
    setInteractive(interactive: boolean): void
    chat(messages: ChatMessage[]): Promise<ChatResult>
    quit(): void
  }
}
