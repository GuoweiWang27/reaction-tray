import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { verticalSliceLevels } from '../../src/content/levels/vertical-slice'
import { reactions } from '../../src/content/reactions'
import { solveLevel } from '../../src/game/solver'

describe.each(verticalSliceLevels)('$id', (level) => {
  it('has a no-tool solution within the CI bound', () => {
    const result = solveLevel({ level, reactions, conditions }, { maxNodes: 100_000, timeoutMs: 2_000 })
    expect(result.status).toBe('solved')
    expect(result.path.length).toBeGreaterThan(0)
  })
})
