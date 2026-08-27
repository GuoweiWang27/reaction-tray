import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { levels } from '../../src/content/levels'
import { reactions } from '../../src/content/reactions'
import { applyCommand, createGame, type EngineContext } from '../../src/game/engine'
import { getLossFeedback } from '../../src/game/feedback'

describe('game feedback', () => {
  it('distinguishes an exhausted board from a full reaction tray', () => {
    const sourceLevel = levels[2]
    const exhaustedLevel = {
      ...sourceLevel,
      board: [sourceLevel.board.find((tile) => tile.tileId === 'l3-decoy-h-1')!],
      trayCapacity: 2,
      goals: [{ kind: 'produce' as const, targetSpeciesId: 'species.copper-ii-hydroxide', count: 1 }],
    }
    const exhaustedContext: EngineContext = { level: exhaustedLevel, reactions, conditions }
    const exhausted = applyCommand(createGame(exhaustedLevel), { type: 'select-tile', tileId: 'l3-decoy-h-1' }, exhaustedContext).state

    const trayFullLevel = { ...sourceLevel, trayCapacity: 1 }
    const trayFullContext: EngineContext = { level: trayFullLevel, reactions, conditions }
    const trayFull = applyCommand(createGame(trayFullLevel), { type: 'select-tile', tileId: 'l3-decoy-h-1' }, trayFullContext).state

    expect(exhausted.status).toBe('lost')
    expect(exhausted.remainingTileIds).toEqual([])
    expect(getLossFeedback(exhausted)).toBe('牌局已无可取物质，目标未完成。')
    expect(trayFull.status).toBe('lost')
    expect(trayFull.remainingTileIds.length).toBeGreaterThan(0)
    expect(getLossFeedback(trayFull)).toBe('反应槽已满且没有可触发反应。')
  })
})
