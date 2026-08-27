import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { verticalSliceLevels } from '../../src/content/levels/vertical-slice'
import { reactions } from '../../src/content/reactions'
import { applyCommand, createGame, selectableTileIds, type EngineContext } from '../../src/game/engine'

const fixtureTile = (tileId: string, speciesId: string) => ({
  tileId,
  speciesId,
  x: 0,
  y: 0,
  z: 1,
  width: 2,
  height: 1,
  blockedByTileIds: [],
})

const igniteLevel = {
  ...verticalSliceLevels[0],
  id: 'fixture.ignite',
  order: 1,
  trayCapacity: 3,
  allowedReactions: [{ reactionId: 'reaction.hydrogen-combustion', priority: 10 }],
  availableConditionIds: ['ignite', 'mno2'],
  goals: [{ kind: 'produce' as const, targetSpeciesId: 'species.water', count: 2 }],
  board: [
    fixtureTile('fixture-h-1', 'species.hydrogen'),
    fixtureTile('fixture-h-2', 'species.hydrogen'),
    fixtureTile('fixture-o-1', 'species.oxygen'),
  ],
}

const catalystLevel = {
  ...verticalSliceLevels[0],
  id: 'fixture.catalyst',
  order: 1,
  trayCapacity: 2,
  allowedReactions: [{ reactionId: 'reaction.hydrogen-peroxide-decomposition', priority: 10 }],
  availableConditionIds: ['mno2'],
  goals: [{ kind: 'produce' as const, targetSpeciesId: 'species.oxygen', count: 2 }],
  board: [
    fixtureTile('fixture-peroxide-1', 'species.hydrogen-peroxide'),
    fixtureTile('fixture-peroxide-2', 'species.hydrogen-peroxide'),
    fixtureTile('fixture-peroxide-3', 'species.hydrogen-peroxide'),
    fixtureTile('fixture-peroxide-4', 'species.hydrogen-peroxide'),
  ],
}

const l19Level = {
  ...verticalSliceLevels[0],
  id: 'fixture.l19',
  order: 1,
  trayCapacity: 4,
  allowedReactions: [
    { reactionId: 'reaction.iron-hcl', priority: 20 },
    { reactionId: 'reaction.hydrogen-combustion', priority: 10 },
  ],
  availableConditionIds: ['ignite'],
  intermediateProductSpeciesIds: ['species.hydrogen'],
  goals: [{
    kind: 'sequence' as const,
    steps: [
      { reactionId: 'reaction.iron-hcl', count: 2 },
      { reactionId: 'reaction.hydrogen-combustion', count: 1 },
    ],
  }],
  board: [
    fixtureTile('fixture-iron-1', 'species.iron'),
    fixtureTile('fixture-acid-1', 'species.hydrochloric-acid'),
    fixtureTile('fixture-acid-2', 'species.hydrochloric-acid'),
    fixtureTile('fixture-iron-2', 'species.iron'),
    fixtureTile('fixture-acid-3', 'species.hydrochloric-acid'),
    fixtureTile('fixture-acid-4', 'species.hydrochloric-acid'),
    fixtureTile('fixture-oxygen', 'species.oxygen'),
  ],
}

const run = (state: ReturnType<typeof createGame>, commands: Array<{ type: 'select-tile'; tileId: string } | { type: 'activate-condition'; conditionId: 'ignite' | 'mno2' }>, context: EngineContext) => {
  let next = state
  for (const command of commands) next = applyCommand(next, command, context).state
  return next
}

const context = (levelIndex: number): EngineContext => ({ level: verticalSliceLevels[levelIndex], reactions, conditions })
const contextWithIgnite = (): EngineContext => ({
  level: { ...verticalSliceLevels[0], availableConditionIds: ['ignite'] },
  reactions,
  conditions,
})

describe('game engine', () => {
  it('resolves level 3 at 1:2 and completes the stored solution', () => {
    const ctx = context(2)
    let state = createGame(ctx.level)
    for (const step of ctx.level.standardSolutionSteps) state = applyCommand(state, step, ctx).state
    expect(state.status).toBe('won')
    expect(state.produced['species.copper-ii-hydroxide']).toBe(2)
    expect(state.tray).toEqual([])
  })

  it('settles a reaction before evaluating a temporarily full tray', () => {
    const ctx = context(2)
    const cappedContext: EngineContext = { ...ctx, level: { ...ctx.level, trayCapacity: 3 } }
    let state = createGame(cappedContext.level)
    for (const tileId of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2']) state = applyCommand(state, { type: 'select-tile', tileId }, cappedContext).state
    expect(state.status).toBe('playing')
    expect(state.produced['species.copper-ii-hydroxide']).toBe(1)
    expect(state.tray).toEqual([])
  })

  it('returns presentation details with each reaction effect', () => {
    const ctx = context(2)
    let state = createGame(ctx.level)
    for (const tileId of ['l3-cu-1', 'l3-oh-1']) state = applyCommand(state, { type: 'select-tile', tileId }, ctx).state
    const result = applyCommand(state, { type: 'select-tile', tileId: 'l3-oh-2' }, ctx)
    expect(result.effects).toContainEqual(expect.objectContaining({
      type: 'reaction',
      reactionId: 'reaction.copper-hydroxide-ionic',
      observableCue: 'precipitate',
      productSpeciesIds: ['species.copper-ii-hydroxide'],
    }))
  })

  it('loses when an inert decoy fills a one-slot tray', () => {
    const ctx = context(2)
    const cappedContext: EngineContext = { ...ctx, level: { ...ctx.level, trayCapacity: 1 } }
    const state = applyCommand(createGame(cappedContext.level), { type: 'select-tile', tileId: 'l3-decoy-h-1' }, cappedContext).state
    expect(state.status).toBe('lost')
  })

  it('recovers from one wrong selection and still completes level 3', () => {
    const ctx = context(2)
    let state = createGame(ctx.level)
    state = applyCommand(state, { type: 'select-tile', tileId: 'l3-decoy-h-1' }, ctx).state
    for (const step of ctx.level.standardSolutionSteps) state = applyCommand(state, step, ctx).state
    expect(state.status).toBe('won')
    expect(state.produced['species.copper-ii-hydroxide']).toBe(2)
  })

  it('undoes one selection and its automatic reaction as one transaction', () => {
    const ctx = context(2)
    let state = createGame(ctx.level)
    for (const tileId of ['l3-cu-1', 'l3-oh-1']) state = applyCommand(state, { type: 'select-tile', tileId }, ctx).state
    const beforeReaction = state
    state = applyCommand(state, { type: 'select-tile', tileId: 'l3-oh-2' }, ctx).state
    expect(state.produced['species.copper-ii-hydroxide']).toBe(1)
    state = applyCommand(state, { type: 'undo' }, ctx).state
    expect({ ...state, history: [], undoUsed: 0 }).toEqual({ ...beforeReaction, history: [], undoUsed: 0 })
    expect(state.undoUsed).toBe(1)
  })

  it('never exposes a blocked tile as selectable', () => {
    const ctx = context(0)
    const state = createGame(ctx.level)
    expect(selectableTileIds(state, ctx.level)).not.toContain('l1-h-3')
  })

  it.each(['won', 'lost'] as const)('treats condition activation after %s as a no-op', (status) => {
    const ctx = contextWithIgnite()
    const state = { ...createGame(ctx.level), status }
    const result = applyCommand(state, { type: 'activate-condition', conditionId: 'ignite' }, ctx)
    expect(result.state).toEqual(state)
    expect(result.state.history).toEqual([])
    expect(result.effects).toEqual([])
  })

  it('counts a condition activation once and treats a repeated activation as a no-op', () => {
    const ctx: EngineContext = { level: igniteLevel, reactions, conditions }
    const activated = applyCommand(createGame(ctx.level), { type: 'activate-condition', conditionId: 'ignite' }, ctx).state
    const repeated = applyCommand(activated, { type: 'activate-condition', conditionId: 'ignite' }, ctx).state
    const withCatalyst = applyCommand(activated, { type: 'activate-condition', conditionId: 'mno2' }, ctx).state
    const repeatedWithCatalyst = applyCommand(withCatalyst, { type: 'activate-condition', conditionId: 'ignite' }, ctx).state

    expect(activated.moveCount).toBe(1)
    expect(activated.history).toHaveLength(1)
    expect(repeated).toEqual(activated)
    expect(repeatedWithCatalyst).toEqual(withCatalyst)
  })

  it('uses a hint without changing chemistry history and preserves it through undo', () => {
    const ctx: EngineContext = { level: igniteLevel, reactions, conditions }
    const activated = applyCommand(createGame(ctx.level), { type: 'activate-condition', conditionId: 'ignite' }, ctx).state
    const beforeHint = { ...activated, history: structuredClone(activated.history) }
    const afterHint = applyCommand(activated, { type: 'use-hint' }, ctx).state
    const afterUndo = applyCommand(afterHint, { type: 'undo' }, ctx).state

    expect(afterHint.hintUsed).toBe(1)
    expect(afterHint.moveCount).toBe(beforeHint.moveCount)
    expect(afterHint.history).toEqual(beforeHint.history)
    expect(afterUndo.hintUsed).toBe(1)
    expect(afterUndo.activeConditionIds).toEqual([])
    expect(afterUndo.undoUsed).toBe(1)
  })

  it('keeps persistent catalyst active while consuming a one-shot condition after reaction', () => {
    const catalystContext: EngineContext = { level: catalystLevel, reactions, conditions }
    let catalystState = applyCommand(createGame(catalystLevel), { type: 'activate-condition', conditionId: 'mno2' }, catalystContext).state
    catalystState = run(catalystState, [
      { type: 'select-tile', tileId: 'fixture-peroxide-1' },
      { type: 'select-tile', tileId: 'fixture-peroxide-2' },
    ], catalystContext)
    expect(catalystState.activeConditionIds).toContain('mno2')

    const igniteContext: EngineContext = { level: igniteLevel, reactions, conditions }
    let igniteState = applyCommand(createGame(igniteLevel), { type: 'activate-condition', conditionId: 'ignite' }, igniteContext).state
    igniteState = run(igniteState, [
      { type: 'select-tile', tileId: 'fixture-h-1' },
      { type: 'select-tile', tileId: 'fixture-h-2' },
      { type: 'select-tile', tileId: 'fixture-o-1' },
    ], igniteContext)
    expect(igniteState.activeConditionIds).not.toContain('ignite')
  })

  it('wins only when an ordered sequence matches reaction history exactly', () => {
    const ctx: EngineContext = { level: l19Level, reactions, conditions }
    const correctSequence = run(createGame(l19Level), [
      { type: 'select-tile', tileId: 'fixture-iron-1' },
      { type: 'select-tile', tileId: 'fixture-acid-1' },
      { type: 'select-tile', tileId: 'fixture-acid-2' },
      { type: 'select-tile', tileId: 'fixture-iron-2' },
      { type: 'select-tile', tileId: 'fixture-acid-3' },
      { type: 'select-tile', tileId: 'fixture-acid-4' },
      { type: 'activate-condition', conditionId: 'ignite' },
      { type: 'select-tile', tileId: 'fixture-oxygen' },
    ], ctx)

    const wrongGoal = {
      ...l19Level,
      goals: [{
        kind: 'sequence' as const,
        steps: [
          { reactionId: 'reaction.hydrogen-combustion', count: 1 },
          { reactionId: 'reaction.iron-hcl', count: 2 },
        ],
      }],
    }
    const wrongSequence = run(createGame(wrongGoal), [
      { type: 'select-tile', tileId: 'fixture-iron-1' },
      { type: 'select-tile', tileId: 'fixture-acid-1' },
      { type: 'select-tile', tileId: 'fixture-acid-2' },
      { type: 'select-tile', tileId: 'fixture-iron-2' },
      { type: 'select-tile', tileId: 'fixture-acid-3' },
      { type: 'select-tile', tileId: 'fixture-acid-4' },
      { type: 'activate-condition', conditionId: 'ignite' },
      { type: 'select-tile', tileId: 'fixture-oxygen' },
    ], { ...ctx, level: wrongGoal })

    expect(correctSequence.status).toBe('won')
    expect(correctSequence.reactionHistory).toEqual([
      'reaction.iron-hcl',
      'reaction.iron-hcl',
      'reaction.hydrogen-combustion',
    ])
    expect(wrongSequence.status).not.toBe('won')
  })
})
