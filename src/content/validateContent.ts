import type { ConditionDefinition, LevelDefinition, ReactionDefinition, SpeciesDefinition } from '../domain/types'

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  return ids.filter((id) => seen.has(id) || !seen.add(id))
}

export function validateChemistry(species: SpeciesDefinition[], reactions: ReactionDefinition[]): string[] {
  const errors: string[] = []
  const speciesById = new Map(species.map((item) => [item.id, item]))
  for (const duplicate of findDuplicates(species.map((item) => item.id))) errors.push(`duplicate species ${duplicate}`)
  for (const duplicate of findDuplicates(reactions.map((item) => item.id))) errors.push(`duplicate reaction ${duplicate}`)

  for (const reaction of reactions) {
    const totals = (terms: ReactionDefinition['reactants']) => terms.reduce((sum, term) => {
      const item = speciesById.get(term.speciesId)
      if (!item) {
        errors.push(`${reaction.id}: missing species ${term.speciesId}`)
        return sum
      }
      if (!Number.isInteger(term.coefficient) || term.coefficient <= 0) errors.push(`${reaction.id}: coefficient must be a positive integer`)
      for (const [atom, count] of Object.entries(item.composition)) sum.atoms[atom] = (sum.atoms[atom] ?? 0) + count * term.coefficient
      sum.charge += item.charge * term.coefficient
      return sum
    }, { atoms: {} as Record<string, number>, charge: 0 })
    const left = totals(reaction.reactants)
    const right = totals(reaction.products)
    for (const atom of new Set([...Object.keys(left.atoms), ...Object.keys(right.atoms)])) {
      if ((left.atoms[atom] ?? 0) !== (right.atoms[atom] ?? 0)) errors.push(`${reaction.id}: atom ${atom} is not conserved`)
    }
    if (left.charge !== right.charge) errors.push(`${reaction.id}: charge is not conserved`)
  }
  return errors
}

export function validateLevels(
  levels: LevelDefinition[],
  species: SpeciesDefinition[],
  reactions: ReactionDefinition[],
  conditions: ConditionDefinition[],
): string[] {
  const errors: string[] = []
  const speciesIds = new Set(species.map((item) => item.id))
  const reactionIds = new Set(reactions.map((item) => item.id))
  const conditionIds = new Set(conditions.map((item) => item.id))

  for (const duplicate of findDuplicates(levels.map((item) => item.id))) errors.push(`duplicate level id ${duplicate}`)
  for (const duplicate of findDuplicates(levels.map((item) => String(item.order)))) errors.push(`duplicate level order ${duplicate}`)
  const orderedLevels = [...levels].sort((left, right) => left.order - right.order)
  orderedLevels.forEach((level, index) => {
    if (level.order !== index + 1) errors.push(`${level.id}: level order must be contiguous (expected ${index + 1}, found ${level.order})`)
  })
  if (levels.length > 3) {
    const maxChapter = Math.max(...levels.map((level) => level.chapter))
    for (let chapter = 1; chapter <= maxChapter; chapter += 1) {
      const count = levels.filter((level) => level.chapter === chapter).length
      if (count !== 5) errors.push(`chapter ${chapter} must contain exactly five levels (found ${count})`)
    }
  }

  for (const level of levels) {
    const tileById = new Map(level.board.map((item) => [item.tileId, item]))
    for (const duplicate of findDuplicates(level.board.map((item) => item.tileId))) errors.push(`${level.id}: duplicate tile ${duplicate}`)
    for (const tile of level.board) {
      if (!speciesIds.has(tile.speciesId)) errors.push(`${level.id}: tile ${tile.tileId} has missing species ${tile.speciesId}`)
      if (tile.x < 0 || tile.y < 0 || tile.width <= 0 || tile.height <= 0 || tile.x + tile.width > 12) errors.push(`${level.id}: tile ${tile.tileId} is outside the 12-column board`)
      for (const blockerId of tile.blockedByTileIds) {
        const blocker = tileById.get(blockerId)
        if (!blocker) errors.push(`${level.id}: tile ${tile.tileId} has missing blocker ${blockerId}`)
        else if (blocker.z <= tile.z) errors.push(`${level.id}: blocker ${blockerId} must be above ${tile.tileId}`)
      }
    }
    for (const entry of level.allowedReactions) if (!reactionIds.has(entry.reactionId)) errors.push(`${level.id}: missing reaction ${entry.reactionId}`)
    if (new Set(level.allowedReactions.map((entry) => entry.priority)).size !== level.allowedReactions.length) errors.push(`${level.id}: allowed reaction priorities must be unique`)
    for (const conditionId of level.availableConditionIds) if (!conditionIds.has(conditionId)) errors.push(`${level.id}: missing condition ${conditionId}`)
    for (const speciesId of level.intermediateProductSpeciesIds) if (!speciesIds.has(speciesId)) errors.push(`${level.id}: missing intermediate ${speciesId}`)
    for (const goal of level.goals) {
      if (goal.kind === 'produce' && !speciesIds.has(goal.targetSpeciesId)) errors.push(`${level.id}: missing goal species ${goal.targetSpeciesId}`)
      if (goal.kind === 'perform-reaction' && !reactionIds.has(goal.reactionId)) errors.push(`${level.id}: missing goal reaction ${goal.reactionId}`)
      if (goal.kind === 'sequence') for (const step of goal.steps) if (!reactionIds.has(step.reactionId)) errors.push(`${level.id}: missing sequence reaction ${step.reactionId}`)
    }

    const removed = new Set<string>()
    for (const step of level.standardSolutionSteps) {
      if (step.type === 'activate-condition') {
        if (!conditionIds.has(step.conditionId)) errors.push(`${level.id}: standard solution references missing condition ${step.conditionId}`)
        else if (!level.availableConditionIds.includes(step.conditionId)) errors.push(`${level.id}: standard solution condition ${step.conditionId} is not available`)
        continue
      }
      const tile = tileById.get(step.tileId)
      if (!tile) {
        errors.push(`${level.id}: standard solution references missing tile ${step.tileId}`)
        continue
      }
      if (removed.has(step.tileId)) errors.push(`${level.id}: standard solution repeats tile ${step.tileId}`)
      const remainingBlockers = tile.blockedByTileIds.filter((blockerId) => !removed.has(blockerId))
      if (remainingBlockers.length) errors.push(`${level.id}: standard solution selects blocked tile ${step.tileId}`)
      removed.add(step.tileId)
    }
  }
  return errors
}

export function validateAllContent(
  species: SpeciesDefinition[],
  reactions: ReactionDefinition[],
  conditions: ConditionDefinition[],
  levels: LevelDefinition[],
): string[] {
  return [...validateChemistry(species, reactions), ...validateLevels(levels, species, reactions, conditions)]
}
