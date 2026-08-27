import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { verticalSliceLevels } from '../../src/content/levels/vertical-slice'
import { reactions } from '../../src/content/reactions'
import { species } from '../../src/content/species'
import { validateAllContent, validateChemistry } from '../../src/content/validateContent'
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
