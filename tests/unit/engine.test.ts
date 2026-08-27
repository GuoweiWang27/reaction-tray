import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { verticalSliceLevels } from '../../src/content/levels/vertical-slice'
import { reactions } from '../../src/content/reactions'
import { applyCommand, createGame, selectableTileIds, type EngineContext } from '../../src/game/engine'

const context = (levelIndex: number): EngineContext => ({ level: verticalSliceLevels[levelIndex], reactions, conditions })

describe('game engine', () => {
  it('resolves level 3 at 1:2 and completes the stored solution', () => {
    const ctx = context(2)
    let state = createGame(ctx.level)
    for (const tileId of ctx.level.standardSolutionTileIds) state = applyCommand(state, { type: 'select-tile', tileId }, ctx).state
    expect(state.status).toBe('won')
    expect(state.produced['species.copper-ii-hydroxide']).toBe(2)
    expect(state.tray).toEqual([])
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
})
