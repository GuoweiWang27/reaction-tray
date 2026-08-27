import type { LevelDefinition } from '../../domain/types'
import { createLayeredBoard, level, selectSteps } from './helpers'

const l16Board = createLayeredBoard(
  'l16',
  [
    'species.barium-chloride', 'species.sodium-sulfate', 'species.barium-chloride',
    'species.sodium-sulfate', 'species.barium-chloride', 'species.sodium-sulfate',
  ],
  ['species.sodium-chloride', 'species.water'],
)

const l17Board = createLayeredBoard(
  'l17',
  [
    'species.iron-iii-oxide', 'species.carbon-monoxide', 'species.carbon-monoxide', 'species.carbon-monoxide',
    'species.iron-iii-oxide', 'species.carbon-monoxide', 'species.carbon-monoxide', 'species.carbon-monoxide',
  ],
  ['species.iron', 'species.carbon-dioxide'],
)

const l18Board = createLayeredBoard(
  'l18',
  ['species.hydrochloric-acid', 'species.hydrochloric-acid', 'species.carbon-dioxide', 'species.calcium-hydroxide'],
  ['species.sodium-chloride', 'species.water'],
)

const l19Board = createLayeredBoard(
  'l19',
  [
    'species.iron', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
    'species.iron', 'species.hydrochloric-acid', 'species.hydrochloric-acid', 'species.oxygen',
  ],
  ['species.sodium-chloride', 'species.water'],
)

const l20Board = createLayeredBoard(
  'l20',
  ['species.barium-chloride', 'species.copper-ii-sulfate', 'species.sodium-hydroxide', 'species.sodium-hydroxide'],
  ['species.sodium-chloride', 'species.water'],
)

const heat = { type: 'activate-condition' as const, conditionId: 'heat' as const }
const ignite = { type: 'activate-condition' as const, conditionId: 'ignite' as const }

export const chapter4Levels: LevelDefinition[] = [
  level({
    id: 'level.16.white-sulfate', chapter: 4, order: 16, titleZh: '白色硫酸盐',
    objectiveTextZh: '让氯化钡和硫酸钠反应，生成 3 份硫酸钡沉淀。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.barium-sulfate-precipitation', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.barium-sulfate', count: 3 }], intermediateProductSpeciesIds: [],
    board: l16Board.board,
    standardSolutionSteps: selectSteps(l16Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.17.furnace-reduction', chapter: 4, order: 17, titleZh: '炉中还原',
    objectiveTextZh: '分两次加热氧化铁与一氧化碳，生成 4 份铁。', trayCapacity: 4,
    allowedReactions: [{ reactionId: 'reaction.iron-oxide-carbon-monoxide', priority: 10 }], availableConditionIds: ['heat'],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.iron', count: 4 }], intermediateProductSpeciesIds: [],
    board: l17Board.board,
    standardSolutionSteps: [...selectSteps(l17Board.primaryTileIds.slice(0, 4)), heat, ...selectSteps(l17Board.primaryTileIds.slice(4)), heat],
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 10 },
  }),
  level({
    id: 'level.18.carbon-cycle', chapter: 4, order: 18, titleZh: '碳循环',
    objectiveTextZh: '先让二氧化碳与石灰水生成碳酸钙，再让碳酸钙与盐酸反应放出二氧化碳。', trayCapacity: 4,
    allowedReactions: [
      { reactionId: 'reaction.limewater-carbon-dioxide', priority: 20 },
      { reactionId: 'reaction.calcium-carbonate-hcl', priority: 10 },
    ], availableConditionIds: [],
    goals: [{ kind: 'sequence', steps: [
      { reactionId: 'reaction.limewater-carbon-dioxide', count: 1 },
      { reactionId: 'reaction.calcium-carbonate-hcl', count: 1 },
    ] }], intermediateProductSpeciesIds: ['species.calcium-carbonate'],
    board: l18Board.board,
    standardSolutionSteps: selectSteps(l18Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 4 },
  }),
  level({
    id: 'level.19.hydrogen-relay', chapter: 4, order: 19, titleZh: '氢气接力',
    objectiveTextZh: '先由铁与盐酸生成氢气，再在点燃条件下让氢气与氧气反应生成水。', trayCapacity: 4,
    allowedReactions: [
      { reactionId: 'reaction.iron-hcl', priority: 20 },
      { reactionId: 'reaction.hydrogen-combustion', priority: 10 },
    ], availableConditionIds: ['ignite'],
    goals: [{ kind: 'sequence', steps: [
      { reactionId: 'reaction.iron-hcl', count: 2 },
      { reactionId: 'reaction.hydrogen-combustion', count: 1 },
    ] }], intermediateProductSpeciesIds: ['species.hydrogen'],
    board: l19Board.board,
    standardSolutionSteps: [...selectSteps(l19Board.primaryTileIds.slice(0, 6)), ignite, ...selectSteps(l19Board.primaryTileIds.slice(6))],
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 8 },
  }),
  level({
    id: 'level.20.double-precipitate', chapter: 4, order: 20, titleZh: '双沉淀终局',
    objectiveTextZh: '先由硫酸铜和氢氧化钠生成中间产物硫酸钠，再生成硫酸钡沉淀。', trayCapacity: 4,
    allowedReactions: [
      { reactionId: 'reaction.copper-sulfate-sodium-hydroxide', priority: 20 },
      { reactionId: 'reaction.barium-sulfate-precipitation', priority: 10 },
    ], availableConditionIds: [],
    goals: [{ kind: 'sequence', steps: [
      { reactionId: 'reaction.copper-sulfate-sodium-hydroxide', count: 1 },
      { reactionId: 'reaction.barium-sulfate-precipitation', count: 1 },
    ] }], intermediateProductSpeciesIds: ['species.sodium-sulfate'],
    board: l20Board.board,
    standardSolutionSteps: selectSteps(l20Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 4 },
  }),
]
