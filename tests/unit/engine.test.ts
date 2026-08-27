import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { verticalSliceLevels } from '../../src/content/levels/vertical-slice'
import { reactions } from '../../src/content/reactions'
import { applyCommand, createGame, selectableTileIds, type EngineContext } from '../../src/game/engine'

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
    for (const tileId of ctx.level.standardSolutionTileIds) state = applyCommand(state, { type: 'select-tile', tileId }, ctx).state
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
    for (const tileId of ctx.level.standardSolutionTileIds) state = applyCommand(state, { type: 'select-tile', tileId }, ctx).state
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
})
