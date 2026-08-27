import type { LevelDefinition } from '../../domain/types'
import { createLayeredBoard, level, selectSteps } from './helpers'

const l6Board = createLayeredBoard(
  'l6',
  [
    'species.sodium-carbonate', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
    'species.sodium-carbonate', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
  ],
  ['species.calcium-chloride', 'species.water'],
)

const l7Board = createLayeredBoard(
  'l7',
  [
    'species.iron', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
    'species.iron', 'species.hydrochloric-acid', 'species.hydrochloric-acid',
  ],
  ['species.sodium-chloride', 'species.water'],
)

const l8Board = createLayeredBoard(
  'l8',
  [
    'species.zinc', 'species.copper-ii-sulfate', 'species.zinc',
    'species.copper-ii-sulfate', 'species.zinc', 'species.copper-ii-sulfate',
  ],
  ['species.sodium-chloride', 'species.water'],
)

const l9Board = createLayeredBoard(
  'l9',
  ['species.hydrogen', 'species.hydrogen', 'species.oxygen', 'species.hydrogen', 'species.hydrogen', 'species.oxygen'],
  ['species.water', 'species.sodium-chloride'],
)

const l10Board = createLayeredBoard(
  'l10',
  ['species.magnesium', 'species.magnesium', 'species.oxygen', 'species.magnesium', 'species.magnesium', 'species.oxygen'],
  ['species.magnesium-oxide', 'species.water'],
)

const ignite = { type: 'activate-condition' as const, conditionId: 'ignite' as const }

export const chapter2Levels: LevelDefinition[] = [
  level({
    id: 'level.06.carbonate-bubbles', chapter: 2, order: 6, titleZh: '碳酸盐气泡',
    objectiveTextZh: '让碳酸钠和盐酸反应，生成 2 份二氧化碳。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.sodium-carbonate-hcl', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.carbon-dioxide', count: 2 }], intermediateProductSpeciesIds: [],
    board: l6Board.board,
    standardSolutionSteps: selectSteps(l6Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.07.iron-acid', chapter: 2, order: 7, titleZh: '铁与酸',
    objectiveTextZh: '让铁和盐酸反应，生成 2 份氢气。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.iron-hcl', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.hydrogen', count: 2 }], intermediateProductSpeciesIds: [],
    board: l7Board.board,
    standardSolutionSteps: selectSteps(l7Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.08.copper-relay', chapter: 2, order: 8, titleZh: '铜的接力',
    objectiveTextZh: '让锌置换硫酸铜中的铜，生成 3 份铜。', trayCapacity: 7,
    allowedReactions: [{ reactionId: 'reaction.zinc-copper-sulfate', priority: 10 }], availableConditionIds: [],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.copper', count: 3 }], intermediateProductSpeciesIds: [],
    board: l8Board.board,
    standardSolutionSteps: selectSteps(l8Board.primaryTileIds),
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 6 },
  }),
  level({
    id: 'level.09.ignite-water', chapter: 2, order: 9, titleZh: '点燃水滴',
    objectiveTextZh: '分两次在点燃条件下让氢气和氧气反应，生成 4 份水。', trayCapacity: 3,
    allowedReactions: [{ reactionId: 'reaction.hydrogen-combustion', priority: 10 }], availableConditionIds: ['ignite'],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.water', count: 4 }], intermediateProductSpeciesIds: [],
    board: l9Board.board,
    standardSolutionSteps: [...selectSteps(l9Board.primaryTileIds.slice(0, 3)), ignite, ...selectSteps(l9Board.primaryTileIds.slice(3)), ignite],
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 8 },
  }),
  level({
    id: 'level.10.magnesium-light', chapter: 2, order: 10, titleZh: '镁光时刻',
    objectiveTextZh: '分两次在点燃条件下让镁和氧气反应，生成 4 份氧化镁。', trayCapacity: 3,
    allowedReactions: [{ reactionId: 'reaction.magnesium-combustion', priority: 10 }], availableConditionIds: ['ignite'],
    goals: [{ kind: 'produce', targetSpeciesId: 'species.magnesium-oxide', count: 4 }], intermediateProductSpeciesIds: [],
    board: l10Board.board,
    standardSolutionSteps: [...selectSteps(l10Board.primaryTileIds.slice(0, 3)), ignite, ...selectSteps(l10Board.primaryTileIds.slice(3)), ignite],
    starRules: { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 8 },
  }),
]
