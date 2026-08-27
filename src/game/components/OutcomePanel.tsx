import type { GameStatus } from '../engine'
import type { BestStars } from '../progress'

interface OutcomePanelProps {
  status: Extract<GameStatus, 'won' | 'lost'>
  moves: number
  stars: 0 | BestStars
  bestMoves?: number
  onRestart: () => void
  onCopy: () => void
}

export function OutcomePanel({ status, moves, stars, bestMoves, onRestart, onCopy }: OutcomePanelProps) {
  const won = status === 'won'
  return (
    <section className={`outcome outcome--${status}`} aria-label={won ? '关卡完成' : '关卡失败'}>
      <div className="outcome-copy">
        <span className="outcome-kicker">{won ? 'RUN COMPLETE' : 'RUN INTERRUPTED'}</span>
        <strong>{won ? '样本链已完成' : '本轮实验失败'}</strong>
        {won && (
          <div className="outcome-score">
            <span className="outcome-stars" aria-label={`${stars} 星`}>{'★'.repeat(stars)}</span>
            <span>{moves} MOVES</span>
            {bestMoves !== undefined && <span>BEST {bestMoves}</span>}
          </div>
        )}
      </div>
      <div className="outcome-actions">
        {won && (
          <button type="button" className="outcome-share" data-testid="share-result" onClick={onCopy}>复制成绩</button>
        )}
        <button type="button" onClick={onRestart}>{won ? '再做一次' : '重新开始'}</button>
      </div>
    </section>
  )
}
