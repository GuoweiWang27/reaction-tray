import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { verticalSliceLevels } from '../../src/content/levels/vertical-slice'
import { reactions } from '../../src/content/reactions'
import { species } from '../../src/content/species'
import { validateAllContent, validateChemistry, validateLevels } from '../../src/content/validateContent'
import { validateExecutableLevels } from '../../src/content/validateExecutableLevels'
import type { ReactionDefinition, SpeciesDefinition } from '../../src/domain/types'

describe('content baseline', () => {
  it('contains exactly 17 balanced core reactions', () => {
    expect(reactions).toHaveLength(17)
    expect(validateChemistry(species, reactions)).toEqual([])
  })

  it('contains three structurally valid vertical-slice levels', () => {
    expect(verticalSliceLevels).toHaveLength(3)
    expect(validateAllContent(species, reactions, conditions, verticalSliceLevels)).toEqual([])
  })

  it('stores every standard solution as executable progress commands', () => {
    const levels = verticalSliceLevels as Array<typeof verticalSliceLevels[number] & { standardSolutionSteps?: unknown[] }>
    expect(levels.every((level) => Array.isArray(level.standardSolutionSteps))).toBe(true)
    expect(validateExecutableLevels(levels, reactions, conditions)).toEqual([])
  })

  it('rejects unavailable condition steps, duplicate orders and ambiguous priorities', () => {
    const source = verticalSliceLevels[0] as typeof verticalSliceLevels[number] & {
      standardSolutionSteps?: Array<{ type: 'select-tile'; tileId: string }>
      standardSolutionTileIds?: string[]
    }
    const standardSolutionSteps = source.standardSolutionSteps
      ?? source.standardSolutionTileIds?.map((tileId) => ({ type: 'select-tile' as const, tileId }))
      ?? []
    const unavailableCondition = {
      ...source,
      standardSolutionSteps: [...standardSolutionSteps, { type: 'activate-condition' as const, conditionId: 'ignite' as const }],
    }
    const duplicateOrder = { ...source, id: 'fixture.duplicate-order' }
    const ambiguous = {
      ...source,
      id: 'fixture.ambiguous-priority',
      allowedReactions: [
        { reactionId: 'reaction.hydrogen-hydroxide', priority: 10 },
        { reactionId: 'reaction.silver-chloride-precipitation', priority: 10 },
      ],
    }
    const errors = validateLevels(
      [unavailableCondition, duplicateOrder, ambiguous],
      species,
      reactions,
      conditions,
    )

    expect(errors).toContain('level.01.first-water: standard solution condition ignite is not available')
    expect(errors).toContain('duplicate level order 1')
    expect(errors).toContain('fixture.ambiguous-priority: allowed reaction priorities must be unique')
  })

  it('rejects an atom-unbalanced reaction', () => {
    const fixtureSpecies: SpeciesDefinition[] = [
      { id: 'h2', formula: 'H₂', machineFormula: 'H2', nameZh: '氢气', kind: 'element', composition: { H: 2 }, charge: 0, defaultPhase: 'g' },
      { id: 'o2', formula: 'O₂', machineFormula: 'O2', nameZh: '氧气', kind: 'element', composition: { O: 2 }, charge: 0, defaultPhase: 'g' },
      { id: 'h2o', formula: 'H₂O', machineFormula: 'H2O', nameZh: '水', kind: 'compound', composition: { H: 2, O: 1 }, charge: 0, defaultPhase: 'l' },
    ]
    const badReaction: ReactionDefinition = {
      id: 'bad-water', equationDisplay: 'H₂ + O₂ → H₂O',
      reactants: [{ speciesId: 'h2', coefficient: 1, phase: 'g' }, { speciesId: 'o2', coefficient: 1, phase: 'g' }],
      products: [{ speciesId: 'h2o', coefficient: 1, phase: 'l' }], requiredConditionIds: ['ignite'],
      reactionType: 'combustion', observableCue: 'water', explanationZh: '测试用错误反应', review: { status: 'pending', version: 'test' },
    }
    expect(validateChemistry(fixtureSpecies, [badReaction])).toContain('bad-water: atom O is not conserved')
  })
})
