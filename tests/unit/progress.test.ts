import { describe, expect, it } from 'vitest'
import { emptyProgress, legacyProgressKey, mergeResult, progressKey, readProgress, readStoredProgress, score, writeProgress } from '../../src/game/progress'

describe('progress persistence and scoring', () => {
  const rules = { twoStarMaxTools: 1, threeStarMaxTools: 0, threeStarMaxMoves: 8 }

  it('scores the exact three, two, and one star boundaries', () => {
    expect(score({ status: 'won', moveCount: 8, undoUsed: 0, hintUsed: 0 }, rules)).toBe(3)
    expect(score({ status: 'won', moveCount: 9, undoUsed: 0, hintUsed: 0 }, rules)).toBe(2)
    expect(score({ status: 'won', moveCount: 8, undoUsed: 1, hintUsed: 1 }, rules)).toBe(1)
    expect(score({ status: 'lost', moveCount: 8, undoUsed: 0, hintUsed: 0 }, rules)).toBe(0)
  })

  it('parses corrupt storage as an empty versioned record', () => {
    expect(readProgress('{bad json')).toEqual(emptyProgress())
    expect(progressKey).toBe('reaction-tray.progress.v2')
  })

  it('preserves a faster and higher-star best result when a slower run is merged', () => {
    const previousBest = {
      version: 2 as const,
      levels: {
        'level.01.first-water': { cleared: true as const, bestMoves: 8, bestStars: 3 as const },
      },
    }
    const slowerRun = { levelId: 'level.01.first-water', moves: 9, stars: 2 as const }

    expect(mergeResult(previousBest, slowerRun)).toEqual(previousBest)
  })

  it('migrates cleared v1 ids without inventing a best result', () => {
    expect(readProgress(JSON.stringify(['level.01.first-water']))).toEqual({
      version: 2,
      levels: { 'level.01.first-water': { cleared: true } },
    })
  })

  it('writes v2, removes the legacy key after migration, and catches storage failures', () => {
    const values = new Map<string, string>([[legacyProgressKey, JSON.stringify(['level.01.first-water'])]])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    }

    expect(readStoredProgress(storage)).toEqual({
      version: 2,
      levels: { 'level.01.first-water': { cleared: true } },
    })
    expect(values.has(progressKey)).toBe(true)
    expect(values.has(legacyProgressKey)).toBe(false)

    const brokenStorage = {
      setItem: () => { throw new Error('storage unavailable') },
      getItem: () => null,
      removeItem: () => undefined,
    }
    expect(writeProgress(emptyProgress(), brokenStorage)).toBe(false)
  })
})
