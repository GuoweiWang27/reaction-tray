import type { BoardTileDefinition, LevelDefinition, LevelSolutionStep } from '../../domain/types'

export const tile = (
  tileId: string,
  speciesId: string,
  x: number,
  y: number,
  z: number,
  blockedByTileIds: string[] = [],
): BoardTileDefinition => ({ tileId, speciesId, x, y, z, width: 2, height: 1, blockedByTileIds })

export function createLayeredBoard(prefix: string, primarySpeciesIds: string[], decoySpeciesIds: string[]) {
  const upper = primarySpeciesIds.slice(0, 6).map((speciesId, index) =>
    tile(`${prefix}-p-${String(index + 1).padStart(2, '0')}`, speciesId, index * 2, 0, 1))
  const lowerSpecies = [...primarySpeciesIds.slice(6), ...decoySpeciesIds]
  const lower = lowerSpecies.map((speciesId, index) =>
    tile(
      `${prefix}-${index < primarySpeciesIds.length - 6 ? 'p' : 'd'}-${String(index + 7).padStart(2, '0')}`,
      speciesId,
      1 + index * 2,
      1,
      0,
      [upper[index]?.tileId, upper[index + 1]?.tileId].filter((id): id is string => Boolean(id)),
    ))
  return {
    board: [...upper, ...lower],
    primaryTileIds: [...upper, ...lower.slice(0, Math.max(0, primarySpeciesIds.length - 6))].map((item) => item.tileId),
  }
}

export const selectSteps = (tileIds: string[]): LevelSolutionStep[] => tileIds.map((tileId) => ({ type: 'select-tile', tileId }))

export const pendingReview: LevelDefinition['chemistryReview'] = { status: 'pending', version: '1.1.0' }

export const level = (definition: Omit<LevelDefinition, 'toolLimits' | 'chemistryReview'>): LevelDefinition => ({
  ...definition,
  toolLimits: { undo: 1, shuffle: 0, hint: 2 },
  chemistryReview: pendingReview,
})
