import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { levels } from '../../src/content/levels'
import { reactions } from '../../src/content/reactions'
import { applyCommand, createGame, type EngineContext } from '../../src/game/engine'
import { solveLevel } from '../../src/game/solver'

const tile = (tileId: string, speciesId: string) => ({
  tileId,
  speciesId,
  x: 0,
  y: 0,
  z: 1,
  width: 2,
  height: 1,
  blockedByTileIds: [],
})

const conditionLevel = {
  ...levels[0],
  id: 'fixture.solver-ignite',
  order: 1,
  trayCapacity: 3,
  allowedReactions: [{ reactionId: 'reaction.hydrogen-combustion', priority: 10 }],
  availableConditionIds: ['ignite'],
  goals: [{ kind: 'produce' as const, targetSpeciesId: 'species.water', count: 2 }],
  board: [
    tile('solver-h-1', 'species.hydrogen'),
    tile('solver-h-2', 'species.hydrogen'),
    tile('solver-o-1', 'species.oxygen'),
  ],
}

const impossibleLevel = {
  ...levels[0],
  id: 'fixture.solver-unsolved',
  order: 1,
  board: [tile('solver-decoy', 'species.sodium-chloride')],
  goals: [{ kind: 'produce' as const, targetSpeciesId: 'species.water', count: 1 }],
}

const frontierLevel = {
  ...levels[0],
  id: 'fixture.solver-frontier',
  order: 1,
  trayCapacity: 3,
  allowedReactions: [{ reactionId: 'reaction.hydrogen-hydroxide', priority: 10 }],
  goals: [{ kind: 'produce' as const, targetSpeciesId: 'species.water', count: 1 }],
  board: [
    tile('frontier-h-1', 'species.hydrogen-ion'),
    tile('frontier-h-2', 'species.hydrogen-ion'),
    tile('frontier-oh', 'species.hydroxide-ion'),
  ],
}

describe.each(levels)('$id', (level) => {
  it('has a no-tool solution within the CI bound', () => {
    const result = solveLevel({ level, reactions, conditions }, { maxNodes: 200_000, timeoutMs: 3_000 })
    expect(result.status).toBe('solved')
    expect(result.path.length).toBeGreaterThan(0)
    expect(result.safeFirstSteps.length).toBeGreaterThan(0)
    expect(result.path[0]).toMatchObject({ type: 'select-tile' })
    if (level.order >= 9) {
      expect(result.path.filter((step) => step.type === 'activate-condition' && step.conditionId === 'ignite')).toHaveLength(2)
    }
  })
})

describe('progress command solver', () => {
  it('finds condition commands and exposes safe first steps', () => {
    const context: EngineContext = { level: conditionLevel, reactions, conditions }
    const result = solveLevel(context, { maxNodes: 200_000, timeoutMs: 3_000 })

    expect(result.status).toBe('solved')
    if (result.status !== 'solved') throw new Error('expected solved')
    expect(result.path).toContainEqual({ type: 'activate-condition', conditionId: 'ignite' })
    expect(result.safeFirstSteps.length).toBeGreaterThan(0)
  })

  it('solves from an arbitrary current state without replaying removed tiles', () => {
    const level = levels[2]
    const context: EngineContext = { level, reactions, conditions }
    const partial = applyCommand(createGame(level), { type: 'select-tile', tileId: 'l3-cu-1' }, context).state
    const result = solveLevel(context, { maxNodes: 200_000, timeoutMs: 3_000 }, partial)

    expect(result.status).toBe('solved')
    if (result.status !== 'solved') throw new Error('expected solved')
    expect(result.path).not.toContainEqual({ type: 'select-tile', tileId: 'l3-cu-1' })
  })

  it('reports bounded search outcomes explicitly', () => {
    const context: EngineContext = { level: levels[0], reactions, conditions }
    const nodeLimited = solveLevel(context, { maxNodes: 0, timeoutMs: 2_000 })
    const timedOut = solveLevel(context, { maxNodes: 100_000, timeoutMs: 0 })
    const unsolved = solveLevel({ level: impossibleLevel, reactions, conditions }, { maxNodes: 100_000, timeoutMs: 2_000 })

    expect(nodeLimited).toMatchObject({ status: 'node-limit', path: [], safeFirstSteps: [] })
    expect(timedOut).toMatchObject({ status: 'timeout', path: [], safeFirstSteps: [] })
    expect(unsolved).toMatchObject({ status: 'unsolved', path: [], safeFirstSteps: [] })
  })

  it('does not report solved before the shortest-solution frontier is complete', () => {
    const context: EngineContext = { level: frontierLevel, reactions, conditions }
    const complete = solveLevel(context, { maxNodes: 100_000, timeoutMs: 2_000 })
    const capped = solveLevel(context, { maxNodes: 6, timeoutMs: 2_000 })

    expect(complete.status).toBe('solved')
    if (complete.status !== 'solved') throw new Error('expected solved')
    expect(complete.safeFirstSteps).toHaveLength(3)
    expect(capped).toMatchObject({ status: 'node-limit', path: [], safeFirstSteps: [] })
  })
})
