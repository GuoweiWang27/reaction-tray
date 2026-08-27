import type { GameStatus } from './engine'

export const progressKey = 'reaction-tray.progress.v2'
export const legacyProgressKey = 'reaction-tray.cleared-levels.v1'

export type BestStars = 1 | 2 | 3

export interface ProgressEntry {
  cleared: true
  bestMoves?: number
  bestStars?: BestStars
}

export interface StoredProgressV2 {
  version: 2
  levels: Record<string, ProgressEntry>
}

export interface ScoreRun {
  status: GameStatus
  moveCount: number
  undoUsed: number
  hintUsed: number
}

export interface StarRules {
  twoStarMaxTools: number
  threeStarMaxTools: number
  threeStarMaxMoves: number
}

export interface LevelResult {
  levelId: string
  moves: number
  stars: BestStars
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const emptyProgress = (): StoredProgressV2 => ({ version: 2, levels: {} })

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const validStars = (value: unknown): value is BestStars => value === 1 || value === 2 || value === 3

const validMoves = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

const readEntry = (value: unknown): ProgressEntry | null => {
  if (!isRecord(value) || value.cleared !== true) return null
  const entry: ProgressEntry = { cleared: true }
  if (validMoves(value.bestMoves)) entry.bestMoves = value.bestMoves
  if (validStars(value.bestStars)) entry.bestStars = value.bestStars
  return entry
}

const migrateLegacy = (value: unknown): StoredProgressV2 => {
  if (!Array.isArray(value)) return emptyProgress()
  const levels: Record<string, ProgressEntry> = {}
  for (const levelId of value) if (typeof levelId === 'string' && levelId.length > 0) levels[levelId] = { cleared: true }
  return { version: 2, levels }
}

export function readProgress(raw: string | null | undefined): StoredProgressV2 {
  if (typeof raw !== 'string' || raw.trim() === '') return emptyProgress()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return migrateLegacy(parsed)
    if (!isRecord(parsed) || parsed.version !== 2 || !isRecord(parsed.levels)) return emptyProgress()
    const levels: Record<string, ProgressEntry> = {}
    for (const [levelId, value] of Object.entries(parsed.levels)) {
      const entry = readEntry(value)
      if (entry) levels[levelId] = entry
    }
    return { version: 2, levels }
  } catch {
    return emptyProgress()
  }
}

export const serializeProgress = (progress: StoredProgressV2): string => JSON.stringify(progress)

export function writeProgress(progress: StoredProgressV2, storage?: StorageLike): boolean {
  const target = storage ?? (() => {
    try {
      return typeof window === 'undefined' ? undefined : window.localStorage
    } catch {
      return undefined
    }
  })()
  if (!target) return false
  try {
    target.setItem(progressKey, serializeProgress(progress))
    return true
  } catch {
    return false
  }
}

export function readStoredProgress(storage?: StorageLike): StoredProgressV2 {
  const target = storage ?? (() => {
    try {
      return typeof window === 'undefined' ? undefined : window.localStorage
    } catch {
      return undefined
    }
  })()
  if (!target) return emptyProgress()
  try {
    const current = target.getItem(progressKey)
    if (current !== null) return readProgress(current)
    const legacy = target.getItem(legacyProgressKey)
    if (legacy === null) return emptyProgress()
    const migrated = readProgress(legacy)
    if (writeProgress(migrated, target)) {
      try {
        target.removeItem(legacyProgressKey)
      } catch {
        // A successfully written v2 record is still usable when cleanup is blocked.
      }
    }
    return migrated
  } catch {
    return emptyProgress()
  }
}

export function mergeResult(previous: StoredProgressV2, result: LevelResult): StoredProgressV2 {
  if (!result.levelId || !validMoves(result.moves) || !validStars(result.stars)) return previous
  const existing = previous.levels[result.levelId]
  const nextEntry: ProgressEntry = {
    cleared: true,
    bestMoves: existing?.bestMoves === undefined ? result.moves : Math.min(existing.bestMoves, result.moves),
    bestStars: existing?.bestStars === undefined ? result.stars : Math.max(existing.bestStars, result.stars) as BestStars,
  }
  return {
    version: 2,
    levels: { ...previous.levels, [result.levelId]: nextEntry },
  }
}

export function score(run: ScoreRun, rules: StarRules): 0 | 1 | 2 | 3 {
  if (run.status !== 'won') return 0
  const tools = Math.max(0, run.undoUsed) + Math.max(0, run.hintUsed)
  if (run.moveCount <= rules.threeStarMaxMoves && tools <= rules.threeStarMaxTools) return 3
  if (tools <= rules.twoStarMaxTools) return 2
  return 1
}
