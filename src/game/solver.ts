import { applyCommand, createGame, selectableTileIds, type EngineContext, type GameState } from './engine'

export type SolveResult = { status: 'solved'; path: string[]; visitedNodes: number } | { status: 'node-limit' | 'timeout' | 'unsolved'; path: []; visitedNodes: number }
const stateKey = (state: GameState) => JSON.stringify({ remaining: [...state.remainingTileIds].sort(), tray: state.tray.map((entry) => entry.speciesId).sort(), produced: state.produced, performed: state.performed, active: [...state.activeConditionIds].sort(), status: state.status })

export function solveLevel(context: EngineContext, limits: { maxNodes: number; timeoutMs: number }): SolveResult {
  const startedAt = performance.now()
  const initial = createGame(context.level)
  const queue: Array<{ state: GameState; path: string[] }> = [{ state: initial, path: [] }]
  const seen = new Set([stateKey(initial)])
  let visitedNodes = 0
  while (queue.length) {
    if (performance.now() - startedAt > limits.timeoutMs) return { status: 'timeout', path: [], visitedNodes }
    if (visitedNodes >= limits.maxNodes) return { status: 'node-limit', path: [], visitedNodes }
    const current = queue.shift()!
    visitedNodes += 1
    if (current.state.status === 'won') return { status: 'solved', path: current.path, visitedNodes }
    if (current.state.status !== 'playing') continue
    for (const tileId of selectableTileIds(current.state, context.level)) {
      const next = applyCommand(current.state, { type: 'select-tile', tileId }, context).state
      const key = stateKey(next)
      if (seen.has(key)) continue
      seen.add(key)
      queue.push({ state: next, path: [...current.path, tileId] })
    }
  }
  return { status: 'unsolved', path: [], visitedNodes }
}
