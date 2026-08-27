import type { BoardTileDefinition, LevelDefinition } from '../../domain/types'

const tile = (
  tileId: string,
  speciesId: string,
  x: number,
  y: number,
  z: number,
  blockedByTileIds: string[] = [],
): BoardTileDefinition => ({ tileId, speciesId, x, y, z, width: 2, height: 1, blockedByTileIds })

const select = (tileId: string) => ({ type: 'select-tile' as const, tileId })

const pendingReview = { status: 'pending' as const, version: '1.1.0' }

export const verticalSliceLevels: LevelDefinition[] = [
  {
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
    standardSolutionSteps: ['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3'].map(select),
    toolLimits: { undo: 1, shuffle: 0, hint: 2 },
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 }, chemistryReview: pendingReview,
  },
  {
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
    standardSolutionSteps: ['l2-ag-1', 'l2-cl-1', 'l2-ag-2', 'l2-cl-2', 'l2-ag-3', 'l2-cl-3'].map(select),
    toolLimits: { undo: 1, shuffle: 0, hint: 2 },
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 }, chemistryReview: pendingReview,
  },
  {
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
    standardSolutionSteps: ['l3-cu-1', 'l3-oh-1', 'l3-oh-2', 'l3-cu-2', 'l3-oh-3', 'l3-oh-4'].map(select),
    toolLimits: { undo: 1, shuffle: 0, hint: 2 },
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 }, chemistryReview: pendingReview,
  },
]
