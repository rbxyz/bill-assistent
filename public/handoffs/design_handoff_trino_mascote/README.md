# Handoff — Mascote "Trino" (pixel art original)

Pacote para substituir o `BillSprite` por um **personagem original** (trickster
triangular de um olho só), mantendo a **mesma arquitetura** e a **API de estado**
que o seu `Pet.tsx` já consome — drop-in, sem mexer no posicionamento.

> **Por que um personagem novo?** Redesenho como criação original — silhueta,
> paleta (âmbar + chama ciano/violeta/esmeralda), chapéu cônico de ponta dobrada,
> gema levitante e expressões próprias. Sem cartola, gravata-borboleta nem a
> paleta amarelo/azul do personagem licenciado.

---

## Arquivos deste pacote

| Arquivo | O que é |
|---|---|
| `TrinoSprite.tsx` | Mascote. Mesmo motor do `BillSprite` (grade → `<rect>` 1×1, `crispEdges`). **Substitui** `BillSprite.tsx`. |
| `PortalSprite.tsx` | Buraco negro em pixel art (anéis em losango + redemoinho girante). Para a animação de sumiço. **Novo.** |
| `Preview.html` | Showcase navegável de todas as poses (abra no navegador). |

---

## 1. Trocar o sprite (drop-in)

1. Copie `TrinoSprite.tsx` para `src/renderer/src/components/`.
2. No `Pet.tsx`, ajuste os imports:

   ```diff
   - import { BillSprite, SPRITE_HEIGHT } from './BillSprite'
   - import type { SpriteState } from './BillSprite'
   + import { TrinoSprite, SPRITE_HEIGHT } from './TrinoSprite'
   + import type { SpriteState } from './TrinoSprite'
   ```

   E o uso no JSX (linha ~525):

   ```diff
   - <BillSprite {...sprite} />
   + <TrinoSprite {...sprite} accent="ciano" />
   ```

3. **Dimensões — nada muda no layout.** O sprite é renderizado a **54×68** de
   propósito, para casar com o seu `PET_WIDTH = 54`. A grade interna é mais
   detalhada (32×40) mas o tamanho de saída continua 54px de largura. O
   `SPRITE_HEIGHT` exportado passa de 64 → **68** (3px mais alto); como o `Pet.tsx`
   já importa `SPRITE_HEIGHT`, o clamp de arrasto se ajusta sozinho.

4. Remova `BillSprite.tsx` quando terminar.

### Compatibilidade da `SpriteState`

A `SpriteState` do `TrinoSprite` é um **superconjunto** da sua atual — tudo que o
seu `Pet.tsx` já seta continua válido (`legs` com `kickA/kickB`, `ball`, etc.).
Campos novos são **opcionais**:

| Campo | Antes | Agora | Uso |
|---|---|---|---|
| `eye` | `'open' \| 'closed'` | `+ 'half' \| 'happy'` | `half` = meia-piscada; `happy` = arco feliz |
| `aura` | `1 \| 2` | `0 \| 1 \| 2` | frame da chama (seu loop manda 1/2 — segue funcionando) |
| `brow` | — | `boolean?` | sobrancelha franzida |
| `rage` | — | `boolean?` | **fúria: labaredas sobem pelas bordas + pluma alta no chapéu** |
| `gem` | — | `0 \| 1?` | flutuação da gema peitoral |

`legs`, `pupil`, `hatLift`, `wave`, `grabbed`, `ball` são **idênticos** aos seus.

---

## 2. Embaixadinhas (futebol) — você já tem isso

Seu `KEEPY_UPPY` (em `Pet.tsx`) já funciona com o novo sprite. A única coisa a
ajustar são as **coordenadas da bola**, porque a grade interna mudou de 27×32 para
32×40 — então os pés de chute estão em posições novas. Substitua o array
`KEEPY_UPPY` por esta versão recalibrada (mesmo ritmo, bola alinhada aos novos pés):

```ts
const KEEPY_UPPY: Step[] = [
  { d: 140, s: { legs: 'kickA',   pupil:  1, ball: { x: 22, y: 28 } }, hop: true },
  { d: 110, s: { legs: 'dangleA', pupil:  1, ball: { x: 19, y: 25 } } },
  { d: 130, s: { legs: 'dangleB', pupil:  0, ball: { x: 16, y: 24 } } },
  { d: 110, s: { legs: 'dangleA', pupil: -1, ball: { x: 13, y: 25 } } },
  { d: 140, s: { legs: 'kickB',   pupil: -1, ball: { x:  9, y: 28 } } },
  { d: 110, s: { legs: 'dangleB', pupil: -1, ball: { x: 12, y: 25 } } },
  { d: 130, s: { legs: 'dangleA', pupil:  0, ball: { x: 14, y: 24 } } },
  { d: 110, s: { legs: 'dangleB', pupil:  1, ball: { x: 18, y: 25 } } },
  { d: 140, s: { legs: 'kickA',   pupil:  1, ball: { x: 22, y: 28 } } },
  { d: 110, s: { legs: 'dangleA', pupil:  1, ball: { x: 24, y: 22 } } }, // chutão
  { d: 110, s: { legs: 'dangleB', pupil:  1, ball: { x: 27, y: 13 } } },
  { d: 100, s: { legs: 'dangleA', pupil:  1, ball: { x: 29, y:  6 } } },
  { d: 160, s: { eye: 'happy', ball: null } }, // comemora
  { d:  60, s: { eye: 'open',  ball: null } }
]
```

`kickA` = pé direito erguido (bola à direita, x≈22); `kickB` = pé esquerdo
(bola à esquerda, x≈9). A bola é desenhada **na frente** do corpo.

---

## 3. Modo furioso (chamas que sobem) — novo

Hoje não existe um estado "irritado" no `Pet.tsx` — as ações de idle saem de
`IDLE_ACTIONS`. Para ter o Trino furioso, adicione uma ação `FURY` e (opcional)
um gatilho. A fúria liga `brow` + `rage`, e ciclar `aura` faz as labaredas
tremularem subindo:

```ts
const FURY: Step[] = [
  { d: 120, s: { brow: true, rage: true, aura: 1, eye: 'open' } },
  { d: 120, s: { brow: true, rage: true, aura: 2 } },
  { d: 120, s: { brow: true, rage: true, aura: 1 } },
  { d: 120, s: { brow: true, rage: true, aura: 2 } },
  { d: 120, s: { brow: true, rage: true, aura: 1 } },
  { d: 140, s: { brow: true, rage: true, aura: 2, eye: 'closed' } },
  { d:  80, s: { eye: 'open' } }
]

// para sair às vezes do nada:
const IDLE_ACTIONS = [LOOK_AROUND, HAT_TIP, WAVE, DOUBLE_BLINK, KEEPY_UPPY, FURY]
```

Combine com seu CSS de tremor no wrapper, se quiser (ex.: classe `.pet.angry`
com um `@keyframes` curto de `translateX`). O `rage` faz o fogo subir pelas
bordas do corpo e uma pluma alta dançar sobre o chapéu.

> ⚠️ O diff que decide quando re-renderizar o sprite (no `tick`, ~linha 372)
> compara apenas alguns campos. Acrescente os novos:
> ```diff
>   next.aura !== prev.aura ||
>   next.grabbed !== prev.grabbed ||
> + next.brow !== prev.brow ||
> + next.rage !== prev.rage ||
>   next.ball?.x !== prev.ball?.x ||
> ```
> (Se você setar `gem` ou `eye:'half'/'happy'`, inclua-os no diff também.)

---

## 4. Sumiço com buraco negro em pixel art — novo

Hoje o sumiço usa o `.pet-blackhole` em CSS (`bh-swirl`/`bh-ring`/`bh-core`/
`bh-spark`/`bh-flash`) e o `.pet-portal` do teletransporte. Para o portal em
pixel art, copie `PortalSprite.tsx` e troque o bloco `{exiting && (...)}` no JSX
do `Pet.tsx` por uma orquestração em 3 fases (ciclo de ~24 ticks de 140ms).

Como o seu sumiço é dirigido pela prop `exiting` (não por um contador de ticks),
adicione um pequeno contador local enquanto `exiting` estiver ativo:

```tsx
// dentro do componente Pet:
const [vanishTick, setVanishTick] = useState(0)
useEffect(() => {
  if (!exiting) { setVanishTick(0); return }
  const id = setInterval(() => setVanishTick((v) => v + 1), 140)
  return () => clearInterval(id)
}, [exiting])
```

E no JSX, substitua o `<div className="pet-blackhole">…</div>` por:

```tsx
{exiting && (() => {
  const p = vanishTick % 24
  const k = (p - 2) / 6
  const sucked = p >= 3 && p <= 8
  const spriteTransform =
    sucked ? `translateY(${Math.round(k*26)}px) rotate(${Math.round(k*420)}deg) scale(${(1-0.93*k).toFixed(2)})`
    : (p >= 9 && p <= 12) ? 'scale(0.05)'
    : (p >= 13 && p <= 15) ? `rotate(${Math.round(-(1-(p-12)/3)*300)}deg) scale(${(0.05+0.95*(p-12)/3).toFixed(2)})`
    : 'none'
  const spriteOpacity = (p >= 9 && p <= 12) ? 0 : 1
  const portalOn = p >= 1 && p <= 17
  const portalScale = (p === 1) ? 0.35 : (p === 2) ? 0.7 : (p === 16) ? 0.6 : (p === 17) ? 0.3 : 1
  return (
    <>
      {portalOn && (
        <div style={{ position:'absolute', left:'50%', top:'55%',
                      transform:`translate(-50%,-50%) scale(${portalScale})`,
                      transition:'transform .14s linear', zIndex:0, pointerEvents:'none' }}>
          <PortalSprite frame={vanishTick % 3} accent="ciano" />
        </div>
      )}
      <div style={{ position:'relative', zIndex:1, transformOrigin:'50% 60%',
                    transform:spriteTransform, opacity:spriteOpacity,
                    transition:'transform .14s linear, opacity .14s linear' }}>
        <TrinoSprite {...sprite} grabbed={sucked} accent="ciano" />
      </div>
    </>
  )})()}
```

Mantenha o `<TrinoSprite {...sprite}/>` normal fora do bloco `exiting` (renderiza
quando não está sumindo). Você pode aposentar as regras `.pet-blackhole*` do
`styles.css` depois que isso entrar.

---

## 5. Paleta / `accent`

`accent`: `'violeta' | 'esmeralda' | 'ciano'` (default `ciano`). Controla a cor da
chama, da faixa do chapéu, da gema e do portal. Cores base (âmbar/tijolo/contorno)
são fixas. Tabela `ACCENTS` no topo de `TrinoSprite.tsx`.

---

## Checklist

- [ ] Copiar `TrinoSprite.tsx` e `PortalSprite.tsx` para `components/`
- [ ] Trocar imports + JSX no `Pet.tsx` (`BillSprite` → `TrinoSprite`)
- [ ] Substituir o array `KEEPY_UPPY` pelas coordenadas recalibradas (seção 2)
- [ ] Adicionar a ação `FURY` (+ ao `IDLE_ACTIONS`) e os campos `brow`/`rage` no diff de re-render
- [ ] Trocar o `.pet-blackhole` pela orquestração do `PortalSprite` (seção 4)
- [ ] `PET_WIDTH` permanece 54 — nada a mudar
- [ ] Remover `BillSprite.tsx`
