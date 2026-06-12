import { contextBridge, ipcRenderer } from 'electron'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }
export type ChatResult = { ok: true; content: string } | { ok: false; error: string }
export type ScreenInfo = { hasLeft: boolean; hasRight: boolean; width: number }

contextBridge.exposeInMainWorld('api', {
  setInteractive: (interactive: boolean): void => {
    ipcRenderer.send('pet:set-interactive', interactive)
  },
  screenInfo: (): Promise<ScreenInfo> => {
    return ipcRenderer.invoke('pet:screen-info')
  },
  travel: (dir: 'left' | 'right'): Promise<ScreenInfo> => {
    return ipcRenderer.invoke('pet:travel', dir)
  },
  teleport: (): Promise<ScreenInfo> => {
    return ipcRenderer.invoke('pet:teleport')
  },
  chat: (messages: ChatMessage[], persona?: string): Promise<ChatResult> => {
    return ipcRenderer.invoke('chat:send', messages, persona)
  },
  quit: (): void => {
    ipcRenderer.send('app:quit')
  }
})
