import type { CSSProperties } from 'react'
import type { GoalView } from '../goalProgress'

interface GoalPanelProps {
  view: GoalView
  won: boolean
  targetHighlightActive: boolean
  onTargetClick: () => void
}

export function GoalPanel({ view, won, targetHighlightActive, onTargetClick }: GoalPanelProps) {
  const targetReadout = `${view.current} / ${view.target}`
  return (
    <section className="target-panel" data-goal-kind={view.kind} aria-labelledby="target-heading">
      <div className="target-copy">
        <p className="panel-kicker">TARGET OUTPUT / {view.kind.toUpperCase()}</p>
        <h2 id="target-heading">{view.titleZh}</h2>
        <p>{view.objectiveTextZh}</p>
      </div>
      <div className="target-readout" aria-label={`目标进度 ${targetReadout}`}>
        {view.kind === 'produce' ? (
          <button
            type="button"
            className={[
              'target-formula',
              targetHighlightActive ? 'target-formula--active' : '',
              won ? 'target-formula--won' : '',
            ].filter(Boolean).join(' ')}
            aria-pressed={targetHighlightActive}
            aria-label={`目标产物 ${view.targetFormula}，${targetHighlightActive ? '重新提示' : '查看'}对应反应物`}
            onClick={onTargetClick}
          >
            {view.targetFormula}
          </button>
        ) : view.kind === 'perform' ? (
          <span className="target-equation" aria-label={`目标反应 ${view.equationDisplay}`}>反应</span>
        ) : (
          <span className="target-equation" aria-label={`当前步骤 ${view.currentReactionId ?? '已完成'}`}>STEP</span>
        )}
        <strong>{targetReadout}</strong>
        <span className="target-progress" aria-hidden="true">
          <span style={{ '--target-progress': `${view.progressPercent}%` } as CSSProperties} />
        </span>
        <span className="readout-caption">{view.kind === 'sequence' ? 'SEQUENCE STEPS' : 'OUTPUT COUNT'}</span>
      </div>
      {view.kind === 'perform' && (
        <p className="goal-detail">{view.equationDisplay}</p>
      )}
      {view.kind === 'sequence' && (
        <ol className="goal-sequence" aria-label="有序反应步骤">
          {view.sequenceRows.map((row) => (
            <li key={`${row.reactionId}-${row.index}`} className={`goal-sequence-row goal-sequence-row--${row.status}`}>
              <span className="sequence-step-index">{String(row.index + 1).padStart(2, '0')}</span>
              <span>{row.label}</span>
              <span className="sequence-step-status">{row.status === 'complete' ? 'DONE' : row.status === 'current' ? 'NEXT' : 'PENDING'}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
