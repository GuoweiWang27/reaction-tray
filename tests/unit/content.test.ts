import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { levels } from '../../src/content/levels'
import { reactions } from '../../src/content/reactions'
import { species } from '../../src/content/species'
import { validateAllContent, validateChemistry, validateLevels } from '../../src/content/validateContent'
import { validateExecutableLevels } from '../../src/content/validateExecutableLevels'
import type { ConditionId, LevelDefinition, ReactionDefinition, SpeciesDefinition } from '../../src/domain/types'

const conditionCount = (level: LevelDefinition, conditionId: ConditionId) =>
  level.standardSolutionSteps.filter((step) => step.type === 'activate-condition' && step.conditionId === conditionId).length

describe('content baseline', () => {
  it('contains exactly 17 balanced core reactions', () => {
    expect(reactions).toHaveLength(17)
    expect(validateChemistry(species, reactions)).toEqual([])
  })

  it('contains twenty structurally valid canonical levels', () => {
    expect(levels).toHaveLength(20)
    expect(levels.map((level) => level.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    expect([1, 2, 3, 4].map((chapter) => levels.filter((level) => level.chapter === chapter))).toHaveLength(4)
    expect([1, 2, 3, 4].map((chapter) => levels.filter((level) => level.chapter === chapter).length)).toEqual([5, 5, 5, 5])
    expect(validateAllContent(species, reactions, conditions, levels)).toEqual([])
  })

  it('stores every standard solution as executable progress commands', () => {
    expect(levels.every((level) => Array.isArray(level.standardSolutionSteps))).toBe(true)
    expect(validateExecutableLevels(levels, reactions, conditions)).toEqual([])
  })

  it('keeps the two ignition phases in both Chapter 2 combustion levels', () => {
    for (const level of levels.slice(8, 10)) {
      expect(level.availableConditionIds).toEqual(['ignite'])
      expect(level.standardSolutionSteps.filter((step) => step.type === 'activate-condition')).toEqual([
        { type: 'activate-condition', conditionId: 'ignite' },
        { type: 'activate-condition', conditionId: 'ignite' },
      ])
    }
  })

  it('stores the exact Chapter 3 condition counts', () => {
    expect(levels).toHaveLength(20)
    if (levels.length < 20) return
    expect(conditionCount(levels[10], 'mno2')).toBe(1)
    expect(conditionCount(levels[11], 'light')).toBe(2)
    expect(conditionCount(levels[12], 'heat')).toBe(2)
  })

  it('rejects unavailable condition steps, duplicate orders and ambiguous priorities', () => {
    const source = levels[0]
    const standardSolutionSteps = source.standardSolutionSteps
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
