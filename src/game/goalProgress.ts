import type { LevelDefinition, ReactionDefinition, SpeciesDefinition } from '../domain/types'
import { expandedSequence, type GameState } from './engine'

export type SequenceRowStatus = 'complete' | 'current' | 'pending'

export interface SequenceRow {
  index: number
  reactionId: string
  label: string
  status: SequenceRowStatus
}

interface GoalViewBase {
  titleZh: string
  objectiveTextZh: string
  label: string
  current: number
  target: number
  progressPercent: number
  currentReactionId?: string
}

export type GoalView =
  | (GoalViewBase & {
      kind: 'produce'
      targetSpeciesId: string
      targetFormula: string
      targetNameZh: string
    })
  | (GoalViewBase & {
      kind: 'perform'
      reactionId: string
      equationDisplay: string
    })
  | (GoalViewBase & {
      kind: 'sequence'
      sequenceRows: SequenceRow[]
    })

const percent = (current: number, target: number): number => target > 0
  ? Math.min(100, Math.floor((Math.min(current, target) / target) * 100))
  : 100

const reactionLabel = (reactionId: string, reactions: readonly ReactionDefinition[]): string =>
  reactions.find((reaction) => reaction.id === reactionId)?.equationDisplay ?? reactionId

export function buildGoalView(
  level: LevelDefinition,
  state: Pick<GameState, 'produced' | 'performed' | 'reactionHistory'>,
  reactions: readonly ReactionDefinition[],
  species: readonly SpeciesDefinition[],
): GoalView {
  const goal = level.goals[0]
  if (!goal) {
    return {
      kind: 'produce',
      titleZh: level.titleZh,
      objectiveTextZh: level.objectiveTextZh,
      label: '目标产物',
      current: 0,
      target: 0,
      progressPercent: 100,
      targetSpeciesId: '',
      targetFormula: '—',
      targetNameZh: '无目标',
    }
  }

  if (goal.kind === 'produce') {
    const targetSpecies = species.find((item) => item.id === goal.targetSpeciesId)
    const current = state.produced[goal.targetSpeciesId] ?? 0
    const currentReactionId = level.allowedReactions
      .map((entry) => entry.reactionId)
      .find((reactionId) => reactions.find((reaction) => reaction.id === reactionId)?.products.some((product) => product.speciesId === goal.targetSpeciesId))
    return {
      kind: 'produce',
      titleZh: level.titleZh,
      objectiveTextZh: level.objectiveTextZh,
      label: '目标产物',
      current,
      target: goal.count,
      progressPercent: percent(current, goal.count),
      currentReactionId,
      targetSpeciesId: goal.targetSpeciesId,
      targetFormula: targetSpecies?.formula ?? goal.targetSpeciesId,
      targetNameZh: targetSpecies?.nameZh ?? goal.targetSpeciesId,
    }
  }

  if (goal.kind === 'perform-reaction') {
    const current = state.performed[goal.reactionId] ?? 0
    return {
      kind: 'perform',
      titleZh: level.titleZh,
      objectiveTextZh: level.objectiveTextZh,
      label: '完成反应',
      current,
      target: goal.count,
      progressPercent: percent(current, goal.count),
      currentReactionId: goal.reactionId,
      reactionId: goal.reactionId,
      equationDisplay: reactionLabel(goal.reactionId, reactions),
    }
  }

  const expected = expandedSequence(goal)
  let completed = 0
  while (completed < expected.length && state.reactionHistory[completed] === expected[completed]) completed += 1
  const sequenceRows = expected.map((reactionId, index) => ({
    index,
    reactionId,
    label: reactionLabel(reactionId, reactions),
    status: index < completed ? 'complete' : index === completed ? 'current' : 'pending',
  } satisfies SequenceRow))
  return {
    kind: 'sequence',
    titleZh: level.titleZh,
    objectiveTextZh: level.objectiveTextZh,
    label: '反应序列',
    current: completed,
    target: expected.length,
    progressPercent: percent(completed, expected.length),
    currentReactionId: expected[completed],
    sequenceRows,
  }
}
