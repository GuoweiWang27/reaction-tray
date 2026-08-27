import type { ConditionDefinition, ConditionId, LevelDefinition, ReactionDefinition } from '../domain/types'

export type GameStatus = 'playing' | 'awaiting-condition' | 'won' | 'lost'
export type GameCommand = { type: 'select-tile'; tileId: string } | { type: 'activate-condition'; conditionId: ConditionId } | { type: 'undo' }
export type GameEffect = { type: 'reaction'; reactionId: string; equation: string } | { type: 'restored' }
export type TrayEntry = { tileId: string; speciesId: string }
export interface GameSnapshot { remainingTileIds: string[]; tray: TrayEntry[]; produced: Record<string, number>; performed: Record<string, number>; activeConditionIds: ConditionId[]; moveCount: number; status: GameStatus; undoUsed: number }
export interface GameState extends GameSnapshot { history: GameSnapshot[] }
export interface EngineContext { level: LevelDefinition; reactions: ReactionDefinition[]; conditions: ConditionDefinition[] }

const snapshot = ({ history: _history, ...state }: GameState): GameSnapshot => structuredClone(state)
const withHistory = (state: GameSnapshot, history: GameSnapshot[]): GameState => ({ ...state, history })

export function createGame(level: LevelDefinition): GameState {
  return { remainingTileIds: level.board.map((tile) => tile.tileId), tray: [], produced: {}, performed: {}, activeConditionIds: [], moveCount: 0, status: 'playing', undoUsed: 0, history: [] }
}

export function selectableTileIds(state: GameState, level: LevelDefinition): string[] {
  const remaining = new Set(state.remainingTileIds)
  return level.board.filter((tile) => remaining.has(tile.tileId) && tile.blockedByTileIds.every((id) => !remaining.has(id))).map((tile) => tile.tileId)
}

function eligible(state: GameSnapshot, context: EngineContext): ReactionDefinition | null {
  const counts = state.tray.reduce<Record<string, number>>((all, entry) => ({ ...all, [entry.speciesId]: (all[entry.speciesId] ?? 0) + 1 }), {})
  const byId = new Map(context.reactions.map((reaction) => [reaction.id, reaction]))
  const matches = context.level.allowedReactions.flatMap((entry) => {
    const reaction = byId.get(entry.reactionId)
    if (!reaction) throw new Error(`missing reaction ${entry.reactionId}`)
    const hasReactants = reaction.reactants.every((term) => (counts[term.speciesId] ?? 0) >= term.coefficient)
    const hasConditions = reaction.requiredConditionIds.every((id) => state.activeConditionIds.includes(id))
    return hasReactants && hasConditions ? [{ reaction, priority: entry.priority }] : []
  }).sort((a, b) => b.priority - a.priority)
  if (!matches.length) return null
  if (matches[1]?.priority === matches[0].priority) throw new Error('ambiguous eligible reactions')
  return matches[0].reaction
}

function consume(tray: TrayEntry[], reaction: ReactionDefinition): TrayEntry[] {
  const next = [...tray]
  for (const term of reaction.reactants) for (let index = 0; index < term.coefficient; index += 1) {
    const trayIndex = next.findIndex((entry) => entry.speciesId === term.speciesId)
    if (trayIndex < 0) throw new Error(`missing reactant ${term.speciesId}`)
    next.splice(trayIndex, 1)
  }
  return next
}

function goalsMet(state: GameSnapshot, level: LevelDefinition): boolean {
  return level.goals.every((goal) => {
    if (goal.kind === 'produce') return (state.produced[goal.targetSpeciesId] ?? 0) >= goal.count
    if (goal.kind === 'perform-reaction') return (state.performed[goal.reactionId] ?? 0) >= goal.count
    return false
  })
}

function usefulConditionExists(state: GameSnapshot, context: EngineContext): boolean {
  return context.level.availableConditionIds.some((conditionId) => {
    if (state.activeConditionIds.includes(conditionId)) return false
    const condition = context.conditions.find((item) => item.id === conditionId)
    const active = condition?.category === 'energy'
      ? [...state.activeConditionIds.filter((id) => context.conditions.find((item) => item.id === id)?.category !== 'energy'), conditionId]
      : [...state.activeConditionIds, conditionId]
    return eligible({ ...state, activeConditionIds: active }, context) !== null
  })
}

function settle(input: GameSnapshot, context: EngineContext): { state: GameSnapshot; effects: GameEffect[] } {
  let state = structuredClone(input)
  const effects: GameEffect[] = []
  for (let reaction = eligible(state, context); reaction; reaction = eligible(state, context)) {
    state.tray = consume(state.tray, reaction)
    state.performed[reaction.id] = (state.performed[reaction.id] ?? 0) + 1
    for (const product of reaction.products) {
      state.produced[product.speciesId] = (state.produced[product.speciesId] ?? 0) + product.coefficient
      if (context.level.intermediateProductSpeciesIds.includes(product.speciesId)) for (let index = 0; index < product.coefficient; index += 1) state.tray.push({ tileId: `product.${reaction.id}.${state.performed[reaction.id]}.${index}`, speciesId: product.speciesId })
    }
    const oneShot = new Set(context.conditions.filter((item) => item.lifecycle === 'one-shot').map((item) => item.id))
    state.activeConditionIds = state.activeConditionIds.filter((id) => !reaction.requiredConditionIds.includes(id) || !oneShot.has(id))
    effects.push({ type: 'reaction', reactionId: reaction.id, equation: reaction.equationDisplay })
  }
  if (goalsMet(state, context.level)) state.status = 'won'
  else if (state.tray.length >= context.level.trayCapacity) state.status = usefulConditionExists(state, context) ? 'awaiting-condition' : 'lost'
  else if (!state.remainingTileIds.length) state.status = 'lost'
  else state.status = 'playing'
  return { state, effects }
}

export function applyCommand(current: GameState, command: GameCommand, context: EngineContext): { state: GameState; effects: GameEffect[] } {
  if (command.type === 'undo') {
    if (!current.history.length || current.undoUsed >= context.level.toolLimits.undo) return { state: current, effects: [] }
    const restored = current.history.at(-1)!
    return { state: withHistory({ ...restored, undoUsed: current.undoUsed + 1 }, current.history.slice(0, -1)), effects: [{ type: 'restored' }] }
  }
  const before = snapshot(current)
  let next = structuredClone(before)
  if (command.type === 'select-tile') {
    if (current.status !== 'playing' || !selectableTileIds(current, context.level).includes(command.tileId)) return { state: current, effects: [] }
    const tile = context.level.board.find((item) => item.tileId === command.tileId)!
    next.remainingTileIds = next.remainingTileIds.filter((id) => id !== command.tileId)
    next.tray.push({ tileId: tile.tileId, speciesId: tile.speciesId })
    next.moveCount += 1
  } else {
    if (!context.level.availableConditionIds.includes(command.conditionId)) return { state: current, effects: [] }
    const condition = context.conditions.find((item) => item.id === command.conditionId)!
    next.activeConditionIds = condition.category === 'energy'
      ? [...next.activeConditionIds.filter((id) => context.conditions.find((item) => item.id === id)?.category !== 'energy'), command.conditionId]
      : [...new Set([...next.activeConditionIds, command.conditionId])]
  }
  const settled = settle(next, context)
  return { state: withHistory(settled.state, [...current.history, before]), effects: settled.effects }
}
