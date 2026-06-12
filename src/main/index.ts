import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { dirname, join } from 'node:path'
import { config as loadEnv } from 'dotenv'

// Carrega o .env de locais prováveis, para funcionar tanto em dev quanto
// empacotado (ao lado do executável) ou rodando pelo terminal (diretório atual).
// No Windows portable o exe roda extraído em pasta temporária; o diretório do
// .exe original vem em PORTABLE_EXECUTABLE_DIR.
const envDirs = [process.cwd(), dirname(app.getPath('exe')), app.getAppPath()]
if (process.env.PORTABLE_EXECUTABLE_DIR) envDirs.unshift(process.env.PORTABLE_EXECUTABLE_DIR)
for (const dir of envDirs) {
  loadEnv({ path: join(dir, '.env') })
}

// No Wayland (GNOME) o compositor controla o empilhamento e ignora o
// "always on top" dos apps — o Bill acaba coberto ao clicar em outra janela.
// Forçando o backend X11 (XWayland), a janela respeita _NET_WM_STATE_ABOVE e
// fica de fato sempre no topo. Sobrescrevível com OZONE_PLATFORM=wayland.
if (process.platform === 'linux' && !process.env.OZONE_PLATFORM) {
  app.commandLine.appendSwitch('ozone-platform', 'x11')
  // Em XWayland com janela transparente, o processo de GPU costuma crashar e
  // cair para software mesmo; desligar a aceleração evita esse "crash spam" e
  // estabiliza o render (o mascote é leve e animado por CSS).
  app.disableHardwareAcceleration()
}

// Altura da faixa transparente na parte inferior da tela.
// Precisa caber o mascote + o balão de chat aberto acima dele.
const STRIP_HEIGHT = 440

// Personas dos mascotes (selecionadas pelo comando /pet no renderer). A chave
// casa com o PetId em src/renderer/src/pets.ts.
const BASE_PERSONA = `Responda sempre em português brasileiro, de forma direta, útil e amigável.
Mantenha as respostas curtas quando possível — você vive em um balão de chat pequeno.`

const PERSONAS: Record<string, string> = {
  bill: `Você é o Bill, um assistente pessoal simpático que mora na parte inferior da tela do usuário, em formato de mascote.
${BASE_PERSONA}`,
  buddy: `Você é o Buddy, um pequeno invasor alienígena pixelado e amigável que pousou na tela do usuário. Tem um jeito curioso e levemente atrapalhado com os costumes humanos, mas é prestativo e bem-humorado.
${BASE_PERSONA}`
}

const DEFAULT_PERSONA = 'bill'

let win: BrowserWindow | null = null

// Display que hospeda a faixa do Bill no momento; a janela migra entre
// monitores quando ele viaja ou se teletransporta.
let currentDisplayId: number | null = null

function stripBounds(display: Electron.Display): Electron.Rectangle {
  const { workArea } = display
  return {
    x: workArea.x,
    y: workArea.y + workArea.height - STRIP_HEIGHT,
    width: workArea.width,
    height: STRIP_HEIGHT
  }
}

// Displays ordenados da esquerda para a direita (vizinhança horizontal)
function sortedDisplays(): Electron.Display[] {
  return screen
    .getAllDisplays()
    .slice()
    .sort((a, b) => a.workArea.x - b.workArea.x)
}

function currentDisplayIndex(displays: Electron.Display[]): number {
  const i = displays.findIndex((d) => d.id === currentDisplayId)
  return i === -1 ? 0 : i
}

export type ScreenInfo = { hasLeft: boolean; hasRight: boolean; width: number }

function screenInfo(): ScreenInfo {
  const displays = sortedDisplays()
  const idx = currentDisplayIndex(displays)
  return {
    hasLeft: idx > 0,
    hasRight: idx < displays.length - 1,
    width: displays[idx].workArea.width
  }
}

function moveToDisplay(display: Electron.Display): void {
  currentDisplayId = display.id
  if (!win) return
  // setBounds em janela não-redimensionável não altera o tamanho no Windows;
  // libera momentaneamente para a faixa assumir a largura do novo monitor.
  win.setResizable(true)
  win.setBounds(stripBounds(display))
  win.setResizable(false)
  win.setAlwaysOnTop(true, 'screen-saver')
}

function createWindow(): void {
  const display = screen.getPrimaryDisplay()
  currentDisplayId = display.id
  const bounds = stripBounds(display)

  win = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false
    }
  })

  // Mantém o mascote acima de tudo: nível alto, em todos os workspaces e
  // inclusive sobre janelas em tela cheia.
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Alguns gerenciadores de janela rebaixam a janela quando ela perde o foco;
  // reaplica o "sempre no topo" para o Bill voltar à frente.
  win.on('blur', () => win?.setAlwaysOnTop(true, 'screen-saver'))

  // Cliques atravessam as áreas transparentes; `forward: true` continua
  // entregando eventos de mousemove ao renderer, que reativa a
  // interatividade quando o ponteiro está sobre o mascote/chat.
  win.setIgnoreMouseEvents(true, { forward: true })

  win.on('ready-to-show', () => win?.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

async function callAzure(messages: ChatMessage[], persona: string): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/+$/, '')
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      'Credenciais da Azure não configuradas. Preencha AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY e AZURE_OPENAI_DEPLOYMENT no arquivo .env e reinicie o app.'
    )
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: PERSONAS[persona] ?? PERSONAS[DEFAULT_PERSONA] },
        ...messages
      ]
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Azure OpenAI respondeu ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('A Azure OpenAI retornou uma resposta vazia.')
  return content
}

app.whenReady().then(() => {
  ipcMain.on('pet:set-interactive', (_event, interactive: boolean) => {
    win?.setIgnoreMouseEvents(!interactive, { forward: true })
  })

  ipcMain.on('app:quit', () => app.quit())

  ipcMain.handle('pet:screen-info', () => screenInfo())

  // Migra a faixa para o monitor vizinho (Bill voando para fora da borda)
  ipcMain.handle('pet:travel', (_event, dir: 'left' | 'right') => {
    const displays = sortedDisplays()
    const idx = currentDisplayIndex(displays)
    const next = displays[idx + (dir === 'right' ? 1 : -1)]
    if (next) moveToDisplay(next)
    return screenInfo()
  })

  // Teletransporte: leva a faixa para um monitor aleatório (pode ser o mesmo)
  ipcMain.handle('pet:teleport', () => {
    const displays = sortedDisplays()
    moveToDisplay(displays[Math.floor(Math.random() * displays.length)])
    return screenInfo()
  })

  // Se o monitor atual for desconectado ou mudar de resolução, reencaixa a faixa
  screen.on('display-removed', () => {
    const displays = sortedDisplays()
    if (!displays.some((d) => d.id === currentDisplayId)) {
      moveToDisplay(screen.getPrimaryDisplay())
    }
  })
  screen.on('display-metrics-changed', (_event, display) => {
    if (display.id === currentDisplayId) moveToDisplay(display)
  })

  ipcMain.handle('chat:send', async (_event, messages: ChatMessage[], persona?: string) => {
    try {
      // Mantém o histórico enviado curto para economizar tokens
      const recent = messages.slice(-12).map(({ role, content }) => ({ role, content }))
      return { ok: true as const, content: await callAzure(recent, persona ?? DEFAULT_PERSONA) }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
