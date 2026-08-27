export type Phase = 'aq' | 's' | 'l' | 'g' | 'unknown'
export type SpeciesKind = 'ion' | 'element' | 'compound'
export type ConditionId = 'ignite' | 'heat' | 'light' | 'mno2'

export type ProgressCommand =
  | { type: 'select-tile'; tileId: string }
  | { type: 'activate-condition'; conditionId: ConditionId }

export type GameCommand = ProgressCommand | { type: 'undo' } | { type: 'use-hint' }
export type LevelSolutionStep = ProgressCommand

export interface ReviewMetadata {
  status: 'pending' | 'approved'
  version: string
  reviewer?: string
  reviewedAt?: string
}

export interface SpeciesDefinition {
  id: string
  formula: string
  machineFormula: string
  nameZh: string
  kind: SpeciesKind
  composition: Record<string, number>
  charge: number
  defaultPhase: Phase
  safetyNote?: string
}

export interface ReactionTerm {
  speciesId: string
  coefficient: number
  phase: Phase
}

export interface ReactionDefinition {
  id: string
  equationDisplay: string
  reactants: ReactionTerm[]
  products: ReactionTerm[]
  requiredConditionIds: ConditionId[]
  reactionType:
    | 'neutralization'
    | 'precipitation'
    | 'decomposition'
    | 'combustion'
    | 'displacement'
    | 'other'
  observableCue:
    | 'water'
    | 'precipitate'
    | 'gas'
    | 'light'
    | 'metal'
    | 'color-change'
  explanationZh: string
  safetyNote?: string
  review: ReviewMetadata
}

export interface ConditionDefinition {
  id: ConditionId
  nameZh: string
  category: 'energy' | 'catalyst'
  lifecycle: 'one-shot' | 'persistent'
}

export interface BoardTileDefinition {
  tileId: string
  speciesId: string
  x: number
  y: number
  z: number
  width: number
  height: number
  blockedByTileIds: string[]
}

export type LevelGoal =
  | { kind: 'produce'; targetSpeciesId: string; count: number }
  | { kind: 'perform-reaction'; reactionId: string; count: number }
  | {
      kind: 'sequence'
      steps: Array<{ reactionId: string; count: number }>
    }

export interface LevelDefinition {
  id: string
  chapter: number
  order: number
  titleZh: string
  objectiveTextZh: string
  trayCapacity: number
  allowedReactions: Array<{ reactionId: string; priority: number }>
  availableConditionIds: ConditionId[]
  goals: LevelGoal[]
  intermediateProductSpeciesIds: string[]
  board: BoardTileDefinition[]
  standardSolutionSteps: LevelSolutionStep[]
  toolLimits: { undo: number; shuffle: number; hint: number }
  starRules: { twoStarMaxTools: number; threeStarMaxTools: number; threeStarMaxMoves: number }
  chemistryReview: ReviewMetadata
}
