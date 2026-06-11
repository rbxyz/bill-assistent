# Bill — Assistente de Desktop 🟣

Um mascote que vive na parte inferior da sua tela (acima da barra de tarefas do Windows), passeia
aleatoriamente de um lado para o outro e, ao ser clicado, abre um chat conectado à **Azure OpenAI**.

## Stack

- **Electron** — janela transparente, sem borda, sempre no topo, com click-through
  (cliques atravessam as áreas vazias; só o mascote e o chat são interativos)
- **React 19 + TypeScript** — UI do mascote e do chat
- **electron-vite (Vite 7)** — build e dev server com HMR
- **Azure OpenAI** — modelo conversacional, chamado pelo processo *main* do Electron
  (as credenciais nunca chegam ao renderer)

## Como rodar

1. Instale as dependências (já feito se você acabou de gerar o projeto):

   ```powershell
   npm install
   ```

2. Configure as credenciais da Azure no arquivo `.env` (veja a seção abaixo).

3. Inicie o app:

   ```powershell
   npm run dev
   ```

O mascote aparece na parte de baixo da tela. **Clique nele** para abrir o chat,
**clique com o botão direito** para fechar o assistente. `Esc` fecha o balão de chat.

## Configurando a Azure OpenAI

1. No [portal Azure](https://portal.azure.com), crie um recurso **Azure OpenAI**
   (ou use um existente).
2. No [Azure AI Foundry](https://ai.azure.com), faça o **deploy de um modelo de chat**
   (ex.: `gpt-4o-mini` — barato e rápido, ideal para esse caso).
3. No recurso, em **Keys and Endpoint**, copie a chave e o endpoint.
4. Preencha o `.env`:

   ```env
   AZURE_OPENAI_ENDPOINT=https://seu-recurso.openai.azure.com
   AZURE_OPENAI_API_KEY=sua-chave-aqui
   AZURE_OPENAI_DEPLOYMENT=nome-do-deployment
   AZURE_OPENAI_API_VERSION=2024-10-21
   ```

   > `AZURE_OPENAI_DEPLOYMENT` é o **nome que você deu ao deployment**, não o nome do modelo.

5. Reinicie o app (`npm run dev`).

## Arquitetura

```
src/
├── main/index.ts            # Janela transparente + IPC + chamada à Azure OpenAI
├── preload/index.ts         # Ponte segura (contextBridge) entre main e renderer
└── renderer/
    ├── index.html
    └── src/
        ├── App.tsx                    # Orquestra mascote, chat e menu
        ├── components/Pet.tsx         # Movimento aleatório (rAF) + visual do mascote
        ├── components/ChatBalloon.tsx # Balão de chat acima do mascote
        └── styles.css                 # Visual, animações (andar, piscar, digitando)
```

**Como funciona o click-through:** a janela cobre uma faixa de ~440px na parte inferior da
tela, mas inicia com `setIgnoreMouseEvents(true, { forward: true })` — todos os cliques
atravessam para o que estiver atrás. O renderer continua recebendo `mousemove` e, quando o
ponteiro entra no mascote ou no balão, envia um IPC que reativa a interatividade. Ao sair,
volta a ser "fantasma".

## Próximos passos (roadmap)

- [ ] Trocar o shape CSS por **sprites/GIFs animados** (andar, parado, falando) —
      basta substituir o conteúdo de `.pet-body` por um `<img>` trocando frames por estado
- [ ] **Streaming** das respostas (token a token) via `ReadableStream` + IPC
- [ ] Ícone na bandeja do sistema (tray) com menu
- [ ] Memória de conversa persistente entre sessões
- [ ] Suporte a múltiplos monitores
- [ ] Empacotamento com `electron-builder` para gerar instalador `.exe`
