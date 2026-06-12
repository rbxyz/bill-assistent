# Handoff — Blob Invasor (pixel art animado)

Sprite original estilo *space invader*: criatura "blob" em **grade 11×8**, **2 cores**,
nearest-neighbor (pixels quadrados nítidos, sem anti-aliasing). Vem com **march de
2 frames** (asas/perninhas alternam), movimento pela tela e estados extras.

> Paleta fixa: corpo `#C77257` · fundo e olhos `#1F1F1D`.

---

## Arquivos

| Arquivo | O que é |
|---|---|
| `invaderFrames.ts` | Dados dos frames (A/B), `closeEyes`, paleta, e a lógica pura: `framesFor(mode,t)` + `position(mode,t,…)`. Sem dependências. |
| `InvaderSprite.tsx` | Renderiza **um** frame como SVG de `<rect>`s 1×1 (crispEdges + `image-rendering: pixelated`). |
| `InvaderField.tsx` | Exemplo pronto: arena responsiva com o invasor animado se movendo. |
| `Preview.html` | Showcase navegável (abra no navegador). |

Todos os `.tsx` assumem React 18+. Sem libs externas.

---

## Uso mínimo

```tsx
import { InvaderField } from './InvaderField'

<InvaderField mode="march" scale={8} height={320} />
```

`mode`: `'march' | 'fast' | 'float' | 'blink' | 'hit'`.

### Só o sprite, sem movimento

```tsx
import { InvaderSprite } from './InvaderSprite'
import { FRAME_A } from './invaderFrames'

<InvaderSprite rows={FRAME_A} scale={10} />
```

### Animar você mesmo (frame + posição num único tick)

```tsx
const [t, setT] = useState(0)
useEffect(() => { const id = setInterval(() => setT(v => v + 1), 170); return () => clearInterval(id) }, [])

const { rows, invert } = framesFor('march', t)
const { x, y } = position('march', t, arenaW, arenaH, 11 * scale, 8 * scale)
```

> O **mesmo tick** dirige a troca de frame E o deslocamento — por isso o movimento
> fica "em degraus", igual ao fliperama. ~170ms por passo é o sweet spot; baixe
> para acelerar a marcha.

---

## Os frames

A animação é só a alternância de duas grades (`#` = corpo, `.` = fundo/olho):

```
FRAME A            FRAME B
..#######..        ..#######..
..#.###.#..        ..#.###.#..   <- olhos (buracos na cor do fundo)
..#######..        ..#######..
###########        .#########.   <- asas: pontas sobem
###########        ###########
..#######..        #.#######.#   <- asas: pontas descem (batida)
..#######..        ..#######..
..#.#.#.#..        .#.#...#.#.   <- perninhas se abrem
```

- **blink**: `closeEyes()` preenche a linha dos olhos por alguns ticks.
- **hit**: flash — `invert` troca corpo ⇄ fundo (sem cor nova).

---

## Integração no desktop pet (estilo `Pet.tsx`)

Se quiser usar este invasor como mais um mascote do app (ao lado de `BillSprite`/
`TrinoSprite`/`SolSprite`), o padrão é o mesmo: um componente de sprite dirigido por
estado, num loop de `requestAnimationFrame`/`setInterval`. Diferenças:

- O invasor é **simétrico** — não precisa de flip por direção.
- Movimento é **discreto** (degraus a cada frame), não suave; combina com o
  `transition: left .14s linear` do exemplo.
- A "grade interna" é 11×8; com `scale` você define o tamanho final em px
  (ex.: `scale=8` → 88×64). Ajuste `PET_WIDTH` para `11 * scale` se for posicionar
  pela borda da janela.

---

## Exportar como PNG / sprite-sheet

Cada `<InvaderSprite>` é um SVG nítido — para PNG, rasterize no `scale` desejado
(múltiplos inteiros mantêm os pixels perfeitos). Para uma sprite-sheet 2×1
(frame A | frame B), renderize os dois lado a lado num `<svg>` de `22×8` e exporte
em `scale` 8/16/32.

---

## Checklist

- [ ] Copiar `invaderFrames.ts`, `InvaderSprite.tsx`, `InvaderField.tsx`
- [ ] `<InvaderField mode="march" />` para validar o movimento
- [ ] Ajustar `scale`/`height`/`tickMs` ao seu layout
- [ ] (Opcional) Plugar no sistema de mascote como sprite simétrico
- [ ] Manter a paleta fixa de 2 cores — é a identidade do sprite
