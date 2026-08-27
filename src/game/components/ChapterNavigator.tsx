import type { LevelDefinition } from '../../domain/types'
import type { ProgressEntry, StoredProgressV2 } from '../progress'

export interface ChapterSummary {
  id: number
  titleZh: string
  levelOrders: readonly number[]
}

interface ChapterNavigatorProps {
  chapters: readonly ChapterSummary[]
  levels: readonly LevelDefinition[]
  currentLevelOrder: number
  progress: StoredProgressV2
  onSelectLevel: (levelIndex: number) => void
}

const recordText = (entry: ProgressEntry | undefined): string => {
  if (!entry?.cleared) return ''
  if (entry.bestMoves === undefined) return 'CLEARED'
  return `CLEARED · BEST ${entry.bestMoves}${entry.bestStars ? ` · ${'★'.repeat(entry.bestStars)}` : ''}`
}

export function ChapterNavigator({ chapters, levels, currentLevelOrder, progress, onSelectLevel }: ChapterNavigatorProps) {
  const currentChapter = chapters.find((chapter) => chapter.levelOrders.includes(currentLevelOrder)) ?? chapters[0]
  const visibleLevels = currentChapter
    ? currentChapter.levelOrders
      .map((order) => levels.find((level) => level.order === order))
      .filter((level): level is LevelDefinition => Boolean(level))
    : []

  const selectChapter = (chapter: ChapterSummary) => {
    const firstLevel = levels.find((level) => level.order === chapter.levelOrders[0])
    if (firstLevel) onSelectLevel(levels.indexOf(firstLevel))
  }

  return (
    <nav className="chapter-navigator" aria-label="章节与关卡">
      <div className="chapter-tabs" role="tablist" aria-label="实验章节">
        {chapters.map((chapter) => {
          const selected = chapter.id === currentChapter?.id
          return (
            <button
              key={chapter.id}
              type="button"
              className={selected ? 'chapter-tab chapter-tab--active' : 'chapter-tab'}
              data-testid={`chapter-tab-${chapter.id}`}
              role="tab"
              aria-selected={selected}
              onClick={() => selectChapter(chapter)}
            >
              <span className="chapter-tab-index">0{chapter.id}</span>
              <span>{chapter.titleZh}</span>
            </button>
          )
        })}
      </div>
      <div className="level-grid" id="level-grid" aria-label={`${currentChapter?.titleZh ?? '当前章节'}关卡`}>
        {visibleLevels.map((level) => {
          const levelIndex = levels.indexOf(level)
          const entry = progress.levels[level.id]
          return (
            <button
              key={level.id}
              type="button"
              className={level.order === currentLevelOrder ? 'level-button level-button--active' : 'level-button'}
              data-testid={`level-button-${level.order}`}
              onClick={() => onSelectLevel(levelIndex)}
              aria-pressed={level.order === currentLevelOrder}
              aria-label={`选择第 ${level.order} 关 · ${level.titleZh}${entry?.cleared ? ' · 已完成' : ''}`}
            >
              <span className="level-index">{String(level.order).padStart(2, '0')}</span>
              <span>{`选择第 ${level.order} 关`}</span>
              {entry?.cleared && <span className="level-cleared">{recordText(entry)}</span>}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
