import type { ProgressCommand } from '../domain/types'
import { applyCommand, createGame, selectableTileIds, type EngineContext, type GameState } from './engine'

export type SolveResult =
  | { status: 'solved'; path: ProgressCommand[]; safeFirstSteps: ProgressCommand[]; visitedNodes: number }
  | { status: 'node-limit' | 'timeout' | 'unsolved'; path: []; safeFirstSteps: []; visitedNodes: number }

const normalizedRecord = (record: Record<string, number>) => Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)))

const stateKey = (state: GameState) => JSON.stringify({
  remaining: [...state.remainingTileIds].sort(),
  tray: state.tray.map((entry) => entry.speciesId).sort(),
  produced: normalizedRecord(state.produced),
  performed: normalizedRecord(state.performed),
  reactionHistory: [...state.reactionHistory],
  active: [...state.activeConditionIds].sort(),
  status: state.status,
})

const commandKey = (command: ProgressCommand) => JSON.stringify(command)

type SearchNode = {
  state: GameState
  path: ProgressCommand[]
  firstCommand?: ProgressCommand
}

function progressCommands(state: GameState, context: EngineContext): ProgressCommand[] {
  if (state.status !== 'playing' && state.status !== 'awaiting-condition') return []

  const commands: ProgressCommand[] = state.status === 'playing'
    ? selectableTileIds(state, context.level).map((tileId) => ({ type: 'select-tile', tileId }))
    : []
  for (const conditionId of [...new Set(context.level.availableConditionIds)]) {
    commands.push({ type: 'activate-condition', conditionId })
  }
  return commands
}

export function solveLevel(
  context: EngineContext,
  limits: { maxNodes: number; timeoutMs: number },
  initialState = createGame(context.level),
): SolveResult {
  const startedAt = performance.now()
  const queue: SearchNode[] = [{ state: initialState, path: [] }]
  const seen = new Map<string, { depth: number; firstCommands: Set<string> }>()
  seen.set(stateKey(initialState), { depth: 0, firstCommands: new Set(['']) })
  let visitedNodes = 0
  let shortestPath: ProgressCommand[] | null = null
  const safeFirstSteps: ProgressCommand[] = []
  const safeFirstStepKeys = new Set<string>()

  const solvedResult = (): SolveResult => ({
    status: 'solved',
    path: shortestPath ?? [],
    safeFirstSteps,
    visitedNodes,
  })

  const failedResult = (status: 'node-limit' | 'timeout' | 'unsolved'): SolveResult => ({
    status,
    path: [],
    safeFirstSteps: [],
    visitedNodes,
  })

  while (queue.length) {
    if (shortestPath && queue[0].path.length > shortestPath.length) return solvedResult()
    if (visitedNodes >= limits.maxNodes) return failedResult('node-limit')
    if (performance.now() - startedAt >= limits.timeoutMs) return failedResult('timeout')

    const current = queue.shift()!
    visitedNodes += 1
    if (current.state.status === 'won') {
      if (!shortestPath) shortestPath = current.path
      if (current.path.length === shortestPath.length && current.firstCommand) {
        const firstKey = commandKey(current.firstCommand)
        if (!safeFirstStepKeys.has(firstKey)) {
          safeFirstStepKeys.add(firstKey)
          safeFirstSteps.push(current.firstCommand)
        }
      }
      continue
    }
    if (current.state.status !== 'playing' && current.state.status !== 'awaiting-condition') continue
    if (shortestPath && current.path.length >= shortestPath.length) continue

    for (const command of progressCommands(current.state, context)) {
      const next = applyCommand(current.state, command, context).state
      if (next === current.state) continue
      const path = [...current.path, command]
      if (shortestPath && path.length > shortestPath.length) continue
      const firstCommand = current.firstCommand ?? command
      const key = stateKey(next)
      const depth = path.length
      const existing = seen.get(key)
      if (existing) {
        if (depth > existing.depth) continue
        const firstKey = commandKey(firstCommand)
        if (depth === existing.depth && existing.firstCommands.has(firstKey)) continue
        existing.firstCommands.add(firstKey)
      } else {
        seen.set(key, { depth, firstCommands: new Set([commandKey(firstCommand)]) })
      }
      queue.push({ state: next, path, firstCommand })
    }
  }

  return shortestPath ? solvedResult() : failedResult('unsolved')
}
