import { contextBridge, ipcRenderer } from 'electron'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ChatResult = { ok: true; content: string } | { ok: false; error: string }

contextBridge.exposeInMainWorld('api', {
  setInteractive: (interactive: boolean): void => {
    ipcRenderer.send('pet:set-interactive', interactive)
  },
  chat: (messages: ChatMessage[]): Promise<ChatResult> => {
    return ipcRenderer.invoke('chat:send', messages)
  },
  quit: (): void => {
    ipcRenderer.send('app:quit')
  }
})
