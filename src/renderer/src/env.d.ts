/// <reference types="vite/client" />

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ChatResult = { ok: true; content: string } | { ok: false; error: string }
type ScreenInfo = { hasLeft: boolean; hasRight: boolean; width: number }

interface Window {
  api: {
    setInteractive(interactive: boolean): void
    screenInfo(): Promise<ScreenInfo>
    travel(dir: 'left' | 'right'): Promise<ScreenInfo>
    teleport(): Promise<ScreenInfo>
    chat(messages: ChatMessage[], persona?: string): Promise<ChatResult>
    quit(): void
  }
}
