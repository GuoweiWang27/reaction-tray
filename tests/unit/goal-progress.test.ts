import { describe, expect, it } from 'vitest'
import { reactions } from '../../src/content/reactions'
import { levels } from '../../src/content/levels'
import { species } from '../../src/content/species'
import { createGame, expandedSequence, type GameState } from '../../src/game/engine'
import { buildGoalView } from '../../src/game/goalProgress'

describe('goal progress views', () => {
  it('builds a produce goal with bounded output progress', () => {
    const level = levels[0]
    const view = buildGoalView(level, createGame(level), reactions, species)

    expect(view).toMatchObject({
      kind: 'produce',
      label: '目标产物',
      current: 0,
      target: 3,
      progressPercent: 0,
      targetSpeciesId: 'species.water',
      targetFormula: 'H₂O',
    })
  })

  it('builds a perform goal from reaction counts', () => {
    const level = {
      ...levels[15],
      goals: [{ kind: 'perform-reaction' as const, reactionId: 'reaction.barium-sulfate-precipitation', count: 3 }],
    }
    const state: GameState = {
      ...createGame(level),
      performed: { 'reaction.barium-sulfate-precipitation': 2 },
    }

    expect(buildGoalView(level, state, reactions, species)).toMatchObject({
      kind: 'perform',
      label: '完成反应',
      current: 2,
      target: 3,
      progressPercent: 66,
      reactionId: 'reaction.barium-sulfate-precipitation',
    })
  })

  it('marks the current step and pending steps in an ordered sequence goal', () => {
    const level = levels[17]
    const goal = level.goals[0]
    if (goal.kind !== 'sequence') throw new Error('expected sequence goal')
    const expected = expandedSequence(goal)
    const state: GameState = {
      ...createGame(level),
      reactionHistory: [expected[0]],
    }

    const view = buildGoalView(level, state, reactions, species)

    expect(view).toMatchObject({
      kind: 'sequence',
      label: '反应序列',
      current: 1,
      target: 2,
      progressPercent: 50,
      currentReactionId: expected[1],
    })
    expect(view.kind === 'sequence' ? view.sequenceRows : []).toEqual([
      expect.objectContaining({ reactionId: expected[0], status: 'complete' }),
      expect.objectContaining({ reactionId: expected[1], status: 'current' }),
    ])
  })
})
