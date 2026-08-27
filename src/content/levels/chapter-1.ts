import type { LevelDefinition } from '../../domain/types'
import { createLayeredBoard, level, selectSteps, tile } from './helpers'

const l4Board = createLayeredBoard(
  'l4',
  ['species.carbon-dioxide', 'species.calcium-hydroxide', 'species.carbon-dioxide', 'species.calcium-hydroxide'],
  ['species.sodium-chloride', 'species.water'],
)

const l5Board = createLayeredBoard(
  'l5',
  [
    'species.calcium-carbonate', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
    'species.calcium-carbonate', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
  ],
  ['species.sodium-chloride', 'species.water'],
)

export const chapter1Levels: LevelDefinition[] = [
  level({
    id: 'level.01.first-water', chapter: 1, order: 1, titleZh: '第一滴水',
    objectiveTextZh: '让水溶液中的氢离子和氢氧根离子相遇，生成 3 份水。', trayCapacity: 8,
    allowedReactions: [{ reactionId: 'reaction.hydrogen-hydroxide', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.water', count: 3 }], intermediateProductSpeciesIds: [],
    board: [
      tile('l1-h-1', 'species.hydrogen-ion', 0, 0, 1), tile('l1-oh-1', 'species.hydroxide-ion', 3, 0, 1),
      tile('l1-h-2', 'species.hydrogen-ion', 6, 0, 1), tile('l1-oh-2', 'species.hydroxide-ion', 9, 0, 1),
      tile('l1-h-3', 'species.hydrogen-ion', 1.5, 1, 0, ['l1-h-1', 'l1-oh-1']),
      tile('l1-oh-3', 'species.hydroxide-ion', 7.5, 1, 0, ['l1-h-2', 'l1-oh-2']),
    ],
    standardSolutionSteps: selectSteps(['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3']),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.02.silver-mist', chapter: 1, order: 2, titleZh: '银色迷雾',
    objectiveTextZh: '让银离子和氯离子相遇，生成 3 份氯化银沉淀。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.silver-chloride-precipitation', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.silver-chloride', count: 3 }], intermediateProductSpeciesIds: [],
    board: [
      tile('l2-ag-1', 'species.silver-ion', 0, 0, 1), tile('l2-cl-1', 'species.chloride-ion', 2, 0, 1),
      tile('l2-decoy-h-1', 'species.hydrogen-ion', 4, 0, 1), tile('l2-decoy-h-2', 'species.hydrogen-ion', 6, 0, 1),
      tile('l2-ag-2', 'species.silver-ion', 8, 0, 1), tile('l2-cl-2', 'species.chloride-ion', 10, 0, 1),
      tile('l2-ag-3', 'species.silver-ion', 1, 1, 0, ['l2-ag-1', 'l2-cl-1']),
      tile('l2-decoy-h-3', 'species.hydrogen-ion', 3, 1, 0, ['l2-cl-1', 'l2-decoy-h-1']),
      tile('l2-decoy-h-4', 'species.hydrogen-ion', 5, 1, 0, ['l2-decoy-h-1', 'l2-decoy-h-2']),
      tile('l2-decoy-h-5', 'species.hydrogen-ion', 7, 1, 0, ['l2-decoy-h-2', 'l2-ag-2']),
      tile('l2-cl-3', 'species.chloride-ion', 9, 1, 0, ['l2-ag-2', 'l2-cl-2']),
      tile('l2-decoy-h-6', 'species.hydrogen-ion', 5, 2, 0, ['l2-decoy-h-1', 'l2-decoy-h-2']),
    ],
    standardSolutionSteps: selectSteps(['l2-ag-1', 'l2-cl-1', 'l2-ag-2', 'l2-cl-2', 'l2-ag-3', 'l2-cl-3']),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.03.blue-precipitate', chapter: 1, order: 3, titleZh: '蓝色沉淀',
    objectiveTextZh: '每个铜离子需要两个氢氧根离子，生成 2 份氢氧化铜沉淀。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.copper-hydroxide-ionic', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.copper-ii-hydroxide', count: 2 }], intermediateProductSpeciesIds: [],
    board: [
      tile('l3-cu-1', 'species.copper-ii-ion', 0, 0, 1), tile('l3-oh-1', 'species.hydroxide-ion', 2, 0, 1),
      tile('l3-decoy-h-1', 'species.hydrogen-ion', 4, 0, 1), tile('l3-decoy-cl-1', 'species.chloride-ion', 6, 0, 1),
      tile('l3-cu-2', 'species.copper-ii-ion', 8, 0, 1), tile('l3-oh-3', 'species.hydroxide-ion', 10, 0, 1),
      tile('l3-oh-2', 'species.hydroxide-ion', 1, 1, 0, ['l3-cu-1', 'l3-oh-1']),
      tile('l3-decoy-h-2', 'species.hydrogen-ion', 3, 1, 0, ['l3-oh-1', 'l3-decoy-h-1']),
      tile('l3-decoy-cl-2', 'species.chloride-ion', 5, 1, 0, ['l3-decoy-h-1', 'l3-decoy-cl-1']),
      tile('l3-decoy-h-3', 'species.hydrogen-ion', 7, 1, 0, ['l3-decoy-cl-1', 'l3-cu-2']),
      tile('l3-oh-4', 'species.hydroxide-ion', 9, 1, 0, ['l3-cu-2', 'l3-oh-3']),
      tile('l3-decoy-cl-3', 'species.chloride-ion', 5, 2, 0, ['l3-decoy-h-1', 'l3-decoy-cl-1']),
    ],
    standardSolutionSteps: selectSteps(['l3-cu-1', 'l3-oh-1', 'l3-oh-2', 'l3-cu-2', 'l3-oh-3', 'l3-oh-4']),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.04.limewater-signal', chapter: 1, order: 4, titleZh: '石灰水信号',
    objectiveTextZh: '让二氧化碳和石灰水反应，生成 2 份碳酸钙沉淀。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.limewater-carbon-dioxide', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.calcium-carbonate', count: 2 }], intermediateProductSpeciesIds: [],
    board: l4Board.board,
    standardSolutionSteps: selectSteps(l4Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 4 },
  }),
  level({
    id: 'level.05.bubble-escape', chapter: 1, order: 5, titleZh: '气泡脱身',
    objectiveTextZh: '让碳酸钙与盐酸反应，生成 2 份二氧化碳。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.calcium-carbonate-hcl', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.carbon-dioxide', count: 2 }], intermediateProductSpeciesIds: [],
    board: l5Board.board,
    standardSolutionSteps: selectSteps(l5Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
]
