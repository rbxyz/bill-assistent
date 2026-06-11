# Bill 🟣

Mascote de desktop em pixel art que flutua na parte inferior da tela e conversa via Azure OpenAI.
Electron + React + TypeScript.

## Configurar

Copie o `.env` e preencha as credenciais da Azure OpenAI:

```bash
cp .env.example .env
```

```env
AZURE_OPENAI_ENDPOINT=https://seu-recurso.openai.azure.com
AZURE_OPENAI_API_KEY=sua-chave
AZURE_OPENAI_DEPLOYMENT=nome-do-deployment
```

## Rodar (dev)

```bash
pnpm install
pnpm dev
```

> No Linux, se o Electron reclamar do sandbox, dê permissão SUID ao helper uma vez:
> `sudo chown root node_modules/.pnpm/electron@*/node_modules/electron/dist/chrome-sandbox && sudo chmod 4755 node_modules/.pnpm/electron@*/node_modules/electron/dist/chrome-sandbox`

## Empacotar para Linux

```bash
pnpm dist
```

Gera em `release/`:

- **`Bill-*.deb`** — app desktop instalável (aparece no menu de aplicativos)
- **`Bill-*.AppImage`** — portátil, roda direto pelo terminal: `./release/Bill-*.AppImage`

Coloque um `.env` ao lado do executável para o chat funcionar.

## Controles

- **Clique** no Bill → abre o chat · **arraste** → arremessa (cai com gravidade)
- Ele fica sempre na tela e não minimiza. Para fechar: encerre o processo ou digite **`/exit`** no chat (ele some num buraco negro 🕳️).
