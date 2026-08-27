import type { GameState } from './engine'

export function getLossFeedback(state: Pick<GameState, 'remainingTileIds'>): string {
  return state.remainingTileIds.length === 0
    ? '牌局已无可取物质，目标未完成。'
    : '反应槽已满且没有可触发反应。'
}
