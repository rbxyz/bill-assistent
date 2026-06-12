/**
 * pets.ts — registro dos mascotes disponíveis no app.
 *
 * Cada pet tem um sprite (qual componente renderizar no Pet.tsx), um nome
 * exibido no balão de chat e uma saudação inicial. O id é usado também como
 * "persona" enviada ao chat (o main monta o system prompt a partir dele).
 *
 * Para adicionar um novo mascote: crie o sprite, registre aqui e ele já aparece
 * no autocomplete do comando /pet e pode ser ativado.
 */

export type PetId = 'bill' | 'buddy' | 'dino'
export type SpriteKind = 'trino' | 'buddy' | 'dino'

export type PetDef = {
  id: PetId
  name: string
  /** qual sprite o Pet.tsx renderiza para este mascote */
  sprite: SpriteKind
  /** ícone curtinho exibido no autocomplete */
  icon: string
  /** primeira mensagem do mascote ao abrir o chat */
  greeting: string
}

export const PETS: Record<PetId, PetDef> = {
  bill: {
    id: 'bill',
    name: 'Bill',
    sprite: 'trino',
    icon: '🔺',
    greeting: 'Oi! Eu sou o Bill 👋 Pode me perguntar qualquer coisa! (digite /exit para eu sumir)'
  },
  buddy: {
    id: 'buddy',
    name: 'Buddy',
    sprite: 'buddy',
    icon: '👾',
    greeting:
      'Bip bop! Eu sou o Buddy 👾 Pousei aqui na sua tela vindo de longe. No que posso ajudar, humano?'
  },
  dino: {
    id: 'dino',
    name: 'Dino',
    sprite: 'dino',
    icon: '🦖',
    greeting:
      'Rawr! Sou o Dino 🦖 do "sem internet". Corro, pulo obstáculos e, se me irritarem, viro Godzilla! Me arrasta pra brincar.'
  }
}

export const PET_LIST: PetDef[] = Object.values(PETS)

export function isPetId(value: string): value is PetId {
  return value in PETS
}
