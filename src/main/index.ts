import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: join(app.getAppPath(), '.env') })

// Altura da faixa transparente na parte inferior da tela.
// Precisa caber o mascote + o balão de chat aberto acima dele.
const STRIP_HEIGHT = 440

const SYSTEM_PROMPT = `Você é o Bill, um assistente pessoal simpático que mora na parte inferior da tela do usuário, em formato de mascote.
Responda sempre em português brasileiro, de forma direta, útil e amigável.
Mantenha as respostas curtas quando possível — você vive em um balão de chat pequeno.`

let win: BrowserWindow | null = null

function createWindow(): void {
  const { workArea } = screen.getPrimaryDisplay()

  win = new BrowserWindow({
    x: workArea.x,
    y: workArea.y + workArea.height - STRIP_HEIGHT,
    width: workArea.width,
    height: STRIP_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    fullscreenable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false
    }
  })

  // Mantém o mascote acima de praticamente tudo, inclusive janelas fullscreen leves
  win.setAlwaysOnTop(true, 'screen-saver')

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

async function callAzure(messages: ChatMessage[]): Promise<string> {
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
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
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

  ipcMain.handle('chat:send', async (_event, messages: ChatMessage[]) => {
    try {
      // Mantém o histórico enviado curto para economizar tokens
      const recent = messages.slice(-12).map(({ role, content }) => ({ role, content }))
      return { ok: true as const, content: await callAzure(recent) }
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
