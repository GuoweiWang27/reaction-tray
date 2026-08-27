import type { LevelDefinition, ReactionDefinition, SpeciesDefinition } from '../domain/types'
import type { GameState } from './engine'

export const safetyDisclaimer = '本游戏只呈现反应关系，不提供实验操作步骤。'

const safetyPolicyPrefixes = ['不展示', '游戏', '本游戏', '只展示', '仅展示', '不提供']

const normalizeSafetyNote = (note: string): string[] => note
  .split(/[；。]/u)
  .map((clause) => clause.trim().replace(/[.!！？?]+$/u, ''))
  .filter((clause) => clause.length > 0)
  .filter((clause) => !safetyPolicyPrefixes.some((prefix) => clause.startsWith(prefix)))
  .map((clause) => `${clause}。`)

export function getSafetyNotes(
  level: Pick<LevelDefinition, 'allowedReactions' | 'board'>,
  reactions: readonly ReactionDefinition[],
  species: readonly SpeciesDefinition[],
): string[] {
  const reactionsById = new Map(reactions.map((reaction) => [reaction.id, reaction]))
  const speciesById = new Map(species.map((item) => [item.id, item]))
  const sourceNotes = [
    ...level.allowedReactions.map((entry) => reactionsById.get(entry.reactionId)?.safetyNote),
    ...level.board.map((tile) => speciesById.get(tile.speciesId)?.safetyNote),
  ].filter((note): note is string => Boolean(note))
  if (!sourceNotes.length) return []
  const facts = sourceNotes.flatMap(normalizeSafetyNote)
  return [...new Set([...facts, safetyDisclaimer])]
}

export function getReactionFeedback(
  reactionIds: readonly string[],
  reactions: readonly ReactionDefinition[],
): string {
  const reactionsById = new Map(reactions.map((reaction) => [reaction.id, reaction]))
  const definitions = reactionIds
    .map((reactionId) => reactionsById.get(reactionId))
    .filter((reaction): reaction is ReactionDefinition => Boolean(reaction))
  if (!definitions.length) return ''
  if (definitions.length > 1) {
    return `连续反应 ${definitions.length} 项 · ${definitions.map((reaction) => reaction.equationDisplay).join(' → ')}`
  }
  const reaction = definitions[0]
  return `反应完成 · ${reaction.equationDisplay} · ${reaction.explanationZh}`
}

export function getLossFeedback(state: Pick<GameState, 'remainingTileIds'>): string {
  return state.remainingTileIds.length === 0
    ? '牌局已无可取物质，目标未完成。'
    : '反应槽已满且没有可触发反应。'
}
