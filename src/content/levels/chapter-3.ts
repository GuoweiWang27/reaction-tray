import type { LevelDefinition } from '../../domain/types'
import { createLayeredBoard, level, selectSteps } from './helpers'

const l11Board = createLayeredBoard(
  'l11',
  ['species.hydrogen-peroxide', 'species.hydrogen-peroxide', 'species.hydrogen-peroxide', 'species.hydrogen-peroxide'],
  ['species.water', 'species.oxygen'],
)

const l12Board = createLayeredBoard(
  'l12',
  ['species.silver-chloride', 'species.silver-chloride', 'species.silver-chloride', 'species.silver-chloride'],
  ['species.silver', 'species.sodium-chloride'],
)

const l13Board = createLayeredBoard(
  'l13',
  ['species.sodium-bicarbonate', 'species.sodium-bicarbonate', 'species.sodium-bicarbonate', 'species.sodium-bicarbonate'],
  ['species.sodium-carbonate', 'species.water'],
)

const l14Board = createLayeredBoard(
  'l14',
  [
    'species.copper-ii-oxide', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
    'species.copper-ii-oxide', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
  ],
  ['species.sodium-chloride', 'species.water'],
)

const l15Board = createLayeredBoard(
  'l15',
  [
    'species.copper-ii-sulfate', 'species.sodium-hydroxide', 'species.sodium-hydroxide',
    'species.copper-ii-sulfate', 'species.sodium-hydroxide', 'species.sodium-hydroxide',
  ],
  ['species.water', 'species.sodium-chloride'],
)

const mno2 = { type: 'activate-condition' as const, conditionId: 'mno2' as const }
const light = { type: 'activate-condition' as const, conditionId: 'light' as const }
const heat = { type: 'activate-condition' as const, conditionId: 'heat' as const }

export const chapter3Levels: LevelDefinition[] = [
  level({
    id: 'level.11.catalytic-oxygen', chapter: 3, order: 11, titleZh: '催化氧气',
    objectiveTextZh: '用二氧化锰催化过氧化氢分解，生成 2 份氧气。', trayCapacity: 2,
    allowedReactions: [{ reactionId: 'reaction.hydrogen-peroxide-decomposition', priority: 10 }], availableConditionIds: ['mno2'],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.oxygen', count: 2 }], intermediateProductSpeciesIds: [],
    board: l11Board.board,
    standardSolutionSteps: [...selectSteps(l11Board.primaryTileIds.slice(0, 2)), mno2, ...selectSteps(l11Board.primaryTileIds.slice(2))],
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 5 },
  }),
  level({
    id: 'level.12.light-darkening', chapter: 3, order: 12, titleZh: '光下变暗',
    objectiveTextZh: '分两次光解氯化银，生成 4 份银。', trayCapacity: 2,
    allowedReactions: [{ reactionId: 'reaction.silver-chloride-photolysis', priority: 10 }], availableConditionIds: ['light'],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.silver', count: 4 }], intermediateProductSpeciesIds: [],
    board: l12Board.board,
    standardSolutionSteps: [...selectSteps(l12Board.primaryTileIds.slice(0, 2)), light, ...selectSteps(l12Board.primaryTileIds.slice(2)), light],
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.13.heated-gas', chapter: 3, order: 13, titleZh: '受热逸气',
    objectiveTextZh: '分两次加热碳酸氢钠，生成 2 份二氧化碳。', trayCapacity: 2,
    allowedReactions: [{ reactionId: 'reaction.sodium-bicarbonate-decomposition', priority: 10 }], availableConditionIds: ['heat'],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.carbon-dioxide', count: 2 }], intermediateProductSpeciesIds: [],
    board: l13Board.board,
    standardSolutionSteps: [...selectSteps(l13Board.primaryTileIds.slice(0, 2)), heat, ...selectSteps(l13Board.primaryTileIds.slice(2)), heat],
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.14.black-fades', chapter: 3, order: 14, titleZh: '黑色消退',
    objectiveTextZh: '让氧化铜与盐酸反应，生成 2 份氯化铜。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.copper-oxide-hcl', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.copper-ii-chloride', count: 2 }], intermediateProductSpeciesIds: [],
    board: l14Board.board,
    standardSolutionSteps: selectSteps(l14Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.15.molecular-blue-precipitate', chapter: 3, order: 15, titleZh: '分子式蓝沉淀',
    objectiveTextZh: '理解分子方程式 CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄ 与净离子式 Cu²⁺ + 2OH⁻ → Cu(OH)₂↓：它们是同一沉淀反应的不同表示层级，生成 2 份氢氧化铜。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.copper-sulfate-sodium-hydroxide', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.copper-ii-hydroxide', count: 2 }], intermediateProductSpeciesIds: [],
    board: l15Board.board,
    standardSolutionSteps: selectSteps(l15Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
]
