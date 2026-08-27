import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { conditions } from '../content/conditions'
import { verticalSliceLevels } from '../content/levels/vertical-slice'
import { reactions } from '../content/reactions'
import { species } from '../content/species'
import { applyCommand, createGame, selectableTileIds, type EngineContext, type GameCommand, type GameEffect } from './engine'
import { getLossFeedback } from './feedback'
import './game.css'

const requestedLevel = Number(new URLSearchParams(window.location.search).get('level') ?? '1')
const initialLevel = Number.isInteger(requestedLevel) ? Math.min(2, Math.max(0, requestedLevel - 1)) : 0

const phaseLabel = (phase: string): string => ({ aq: 'AQUEOUS', s: 'SOLID', l: 'LIQUID', g: 'GAS' }[phase] ?? 'SPECIMEN')
const accessibleSpeciesName = (item: (typeof species)[number]): string => item.kind === 'ion' ? `水溶液中的${item.nameZh}` : item.nameZh
type ReactionEffect = Extract<GameEffect, { type: 'reaction' }>
type ReactionCueKind = 'precipitate' | 'product' | 'signal'
type ReactionCue = { id: number; kind: ReactionCueKind; label: string; formula: string; equation: string }
type EffectReceipt = ReactionCue & { effectCount: number; total: number }

const cueKind = (effect: ReactionEffect): ReactionCueKind => effect.observableCue === 'precipitate'
  ? 'precipitate'
  : effect.observableCue === 'water'
    ? 'product'
    : 'signal'
const cueLabel = (kind: ReactionCueKind): string => kind === 'precipitate' ? '沉淀生成' : kind === 'product' ? '产物生成' : '反应信号'

export function GameScreen() {
  const [levelIndex, setLevelIndex] = useState(initialLevel)
  const level = verticalSliceLevels[levelIndex]
  const context = useMemo<EngineContext>(() => ({ level, reactions, conditions }), [level])
  const [state, setState] = useState(() => createGame(verticalSliceLevels[initialLevel]))
  const [feedback, setFeedback] = useState('选择未被遮挡的物质卡，观察它们如何在槽中相遇。')
  const speciesById = useMemo(() => new Map(species.map((item) => [item.id, item])), [])
  const conditionById = useMemo(() => new Map(conditions.map((item) => [item.id, item])), [])
  const [activeCues, setActiveCues] = useState<ReactionCue[]>([])
  const [effectReceipts, setEffectReceipts] = useState<EffectReceipt[]>([])
  const [hintedTileId, setHintedTileId] = useState<string | null>(null)
  const cueTimer = useRef<number | null>(null)
  const effectSequence = useRef(0)
  const selectable = new Set(selectableTileIds(state, level))
  const remaining = new Set(state.remainingTileIds)
  const hintedTile = hintedTileId ? level.board.find((tile) => tile.tileId === hintedTileId) : undefined
  const hintedBlockerIds = new Set(hintedTile?.blockedByTileIds.filter((id) => remaining.has(id)) ?? [])
  const hintedBlockerFormulas = [...hintedBlockerIds]
    .map((tileId) => level.board.find((tile) => tile.tileId === tileId))
    .map((tile) => tile ? speciesById.get(tile.speciesId)?.formula : undefined)
    .filter((formula): formula is string => Boolean(formula))
  const goal = level.goals[0]
  const target = goal?.kind === 'produce' ? speciesById.get(goal.targetSpeciesId) : undefined
  const produced = goal?.kind === 'produce' ? (state.produced[goal.targetSpeciesId] ?? 0) : 0
  const goalCount = goal?.kind === 'produce' ? goal.count : 0
  const progress = goalCount > 0 ? Math.min(100, (produced / goalCount) * 100) : 0
  const latestReceipt = effectReceipts[0]
  const awaitingCondition = state.status === 'awaiting-condition'
  const hintCopy = hintedTileId
    ? state.status !== 'playing'
      ? '关卡已结束，剩余牌不可操作。'
      : hintedBlockerFormulas.length > 0
        ? `遮挡关系 · 先取走高亮牌：${hintedBlockerFormulas.join('、')}。`
        : '当前牌没有可见遮挡关系。'
    : null
  const coachCopy = level.order === 1 && state.status === 'playing'
    ? state.moveCount === 0
      ? '第 1 步 · 取一张未被遮挡的卡'
      : state.moveCount === 1
        ? '第 2 步 · 再找能与它反应的卡'
        : state.moveCount <= 2
          ? '第 3 步 · 观察槽中产物与目标变化'
          : null
    : null
  const feedbackCopy = hintCopy ?? coachCopy ?? feedback
  const feedbackClassName = hintCopy ? 'feedback feedback--hint' : coachCopy ? 'feedback feedback--coach' : 'feedback'
  const undoRemaining = Math.max(0, level.toolLimits.undo - state.undoUsed)
  const undoLabel = undoRemaining === 0 ? 'LIMIT REACHED' : `UNDO ${undoRemaining}/${level.toolLimits.undo}`
  const statusLabel = state.status === 'won'
    ? 'COMPLETE'
    : state.status === 'lost'
      ? 'FAILED'
      : state.status === 'awaiting-condition'
        ? 'AWAIT CONDITION'
        : 'READY'

  const clearReactionCue = (resetSequence = false) => {
    if (cueTimer.current !== null) {
      window.clearTimeout(cueTimer.current)
      cueTimer.current = null
    }
    if (resetSequence) effectSequence.current = 0
    setActiveCues([])
    if (resetSequence) setEffectReceipts([])
  }

  const presentReactionEffects = (effects: ReactionEffect[]) => {
    if (!effects.length) return
    const firstId = effectSequence.current + 1
    const cues = effects.map((effect, index) => {
      const kind = cueKind(effect)
      const formula = effect.productSpeciesIds.map((speciesId) => speciesById.get(speciesId)?.formula).filter(Boolean).join(' + ') || '—'
      return { id: firstId + index, kind, label: cueLabel(kind), formula, equation: effect.equation }
    })
    effectSequence.current += cues.length
    const newReceipts = cues.map((cue, index) => ({
      ...cue,
      effectCount: effects.length,
      total: firstId + index,
    })).reverse()
    setActiveCues(cues)
    setEffectReceipts((current) => [...newReceipts, ...current].slice(0, 3))
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (cueTimer.current !== null) window.clearTimeout(cueTimer.current)
    cueTimer.current = window.setTimeout(() => {
      setActiveCues([])
      cueTimer.current = null
    }, reducedMotion ? 80 : 900)
  }

  useEffect(() => () => {
    if (cueTimer.current !== null) window.clearTimeout(cueTimer.current)
  }, [])

  const send = (command: GameCommand) => {
    clearReactionCue(command.type === 'undo')
    setHintedTileId(null)
    const result = applyCommand(state, command, context)
    setState(result.state)
    const reactionEffects = result.effects.filter((effect): effect is ReactionEffect => effect.type === 'reaction')
    presentReactionEffects(reactionEffects)
    const reactionEffect = reactionEffects[0]

    if (result.state.status === 'won') setFeedback('关卡完成 · 目标产物已达到标准。')
    else if (result.state.status === 'lost') setFeedback(`关卡失败 · ${getLossFeedback(result.state)}`)
    else if (result.effects.some((effect) => effect.type === 'restored')) setFeedback('已撤回上一步及其自动反应。')
    else if (reactionEffect?.type === 'reaction') setFeedback(`反应完成 · ${reactionEffect.equation}`)
    else if (result.state.status === 'awaiting-condition') setFeedback('反应槽已满 · 选择本关条件以继续观察。')
    else if (command.type === 'select-tile') setFeedback('样本已入槽 · 继续寻找能形成反应的组合。')
  }

  const restartLevel = () => {
    clearReactionCue(true)
    setHintedTileId(null)
    setState(createGame(level))
    setFeedback('实验台已复位 · 选择未被遮挡的物质卡。')
  }

  const chooseLevel = (index: number) => {
    clearReactionCue(true)
    setHintedTileId(null)
    setLevelIndex(index)
    setState(createGame(verticalSliceLevels[index]))
    setFeedback('实验台已切换 · 选择未被遮挡的物质卡。')
  }

  return (
    <main className="game-shell" data-game-status={state.status}>
      <div className="console">
        <header className="instrument-header">
          <div>
            <p className="brand-mark">REACTION TRAY <span>/</span> FIELD UNIT</p>
            <h1>反应槽</h1>
          </div>
          <div className="run-status" aria-label={`当前状态 ${statusLabel}`}>
            <span className="status-led" aria-hidden="true" />
            <span>{statusLabel}</span>
          </div>
        </header>

        <nav className="level-selector" aria-label="垂直切片关卡">
          {verticalSliceLevels.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === levelIndex ? 'level-button level-button--active' : 'level-button'}
              onClick={() => chooseLevel(index)}
              aria-pressed={index === levelIndex}
            >
              <span className="level-index">0{index + 1}</span>
              <span>选择第 {index + 1} 关</span>
            </button>
          ))}
        </nav>

        <section className="target-panel" aria-labelledby="target-heading">
          <div className="target-copy">
            <p className="panel-kicker">TARGET OUTPUT / {level.id.replace('level.', '').toUpperCase()}</p>
            <h2 id="target-heading">{level.titleZh}</h2>
            <p>{level.objectiveTextZh}</p>
          </div>
          <div className="target-readout" aria-label={`目标进度 ${produced} / ${goalCount}`}>
            <span className="target-formula">{target?.formula ?? '—'}</span>
            <strong>{produced} / {goalCount}</strong>
            <span className="target-progress" aria-hidden="true">
              <span style={{ '--target-progress': `${progress}%` } as CSSProperties} />
            </span>
            <span className="readout-caption">OUTPUT COUNT</span>
          </div>
        </section>

        <section className="field-panel" aria-labelledby="field-heading">
          <div className="panel-bar">
            <h2 id="field-heading">SPECIMEN FIELD</h2>
            <span>{state.remainingTileIds.length} CARDS REMAINING</span>
          </div>
          <div className="board" aria-describedby="field-instruction">
            <div className="board-grid" aria-hidden="true" />
            {level.board.filter((tile) => remaining.has(tile.tileId)).map((tile) => {
              const item = speciesById.get(tile.speciesId)
              if (!item) return null
              const isSelectable = state.status === 'playing' && selectable.has(tile.tileId)
              const blockerIds = tile.blockedByTileIds.filter((id) => remaining.has(id))
              const style = {
                '--x': tile.x,
                '--y': tile.y,
                '--z': tile.z,
                '--w': tile.width,
              } as CSSProperties
              return (
                <button
                  key={tile.tileId}
                  type="button"
                  data-testid={tile.tileId}
                  className={[
                    'tile',
                    isSelectable ? 'tile--open' : 'tile--locked',
                    hintedBlockerIds.has(tile.tileId) ? 'tile--blocking' : '',
                  ].filter(Boolean).join(' ')}
                  style={style}
                  aria-disabled={isSelectable ? undefined : true}
                  onMouseEnter={() => setHintedTileId(isSelectable ? null : tile.tileId)}
                  onMouseLeave={(event) => {
                    if (event.currentTarget !== document.activeElement) {
                      setHintedTileId((current) => current === tile.tileId ? null : current)
                    }
                  }}
                  onFocus={() => setHintedTileId(isSelectable ? null : tile.tileId)}
                  onBlur={() => setHintedTileId((current) => current === tile.tileId ? null : current)}
                  onClick={() => {
                    if (!isSelectable) {
                      setHintedTileId(tile.tileId)
                      return
                    }
                    setHintedTileId(null)
                    send({ type: 'select-tile', tileId: tile.tileId })
                  }}
                  aria-label={`${item.formula}，${accessibleSpeciesName(item)}，${isSelectable ? '可取出' : state.status !== 'playing' ? '关卡已结束，剩余牌不可操作' : blockerIds.length ? '被其他卡牌遮挡' : '当前不可操作'}`}
                >
                  <span className="tile-tag">{isSelectable ? 'OPEN' : 'LOCKED'}</span>
                  <strong className="tile-formula">{item.formula}</strong>
                  <span className="tile-name">{item.nameZh}</span>
                  <span className="tile-phase">{phaseLabel(item.defaultPhase)}</span>
                </button>
              )
            })}
            {activeCues.length > 0 && (
              <div className="reaction-cue-layer" aria-hidden="true">
                {activeCues.map((cue) => (
                  <div key={cue.id} className={`reaction-cue reaction-cue--${cue.kind}`}>
                    <span>{cue.label}</span>
                    <strong>{cue.formula}</strong>
                    <small>{cue.kind === 'precipitate' ? '↓' : 'OUTPUT'}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
          {latestReceipt && (
            <div
              className={`effect-receipt effect-receipt--${latestReceipt.kind}`}
              data-testid="reaction-effect"
              data-cue-kind={latestReceipt.kind}
              data-effect-count={latestReceipt.effectCount}
              data-effect-total={latestReceipt.total}
              role="img"
              aria-label={`反应日志，最新 ${latestReceipt.label}，${latestReceipt.formula}，已消费 ${latestReceipt.total} 个反应效果，共 ${effectReceipts.length} 条`}
            >
              <div className="effect-receipt-list">
                {effectReceipts.map((receipt, index) => (
                  <div key={receipt.id} className={index === 0 ? 'effect-receipt-item' : 'effect-receipt-item effect-receipt-item--history'}>
                    {index === 0 ? (
                      <>
                        <span>{receipt.label}</span>
                        <strong>{receipt.formula}</strong>
                        <small>EFFECT {String(receipt.total).padStart(2, '0')} · {receipt.equation}</small>
                      </>
                    ) : (
                      <strong>{receipt.formula}</strong>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="field-instruction" id="field-instruction">
            <span className="legend-dot legend-dot--open" aria-hidden="true" /> OPEN 可取出
            <span className="legend-dot legend-dot--locked" aria-hidden="true" /> LOCKED 被遮挡
          </p>
        </section>

        <section className={awaitingCondition ? 'tray-panel tray-panel--awaiting' : 'tray-panel'} aria-labelledby="tray-heading">
          <div className="panel-bar">
            <h2 id="tray-heading">REACTION TRAY</h2>
            <span>{state.tray.length} / {level.trayCapacity} SLOTS</span>
          </div>
          {awaitingCondition && <p className="panel-status panel-status--awaiting">AWAITING CONDITION</p>}
          <div
            className="tray"
            style={{ '--tray-columns': level.trayCapacity } as CSSProperties}
            aria-label={`反应槽，容量 ${level.trayCapacity}，当前 ${state.tray.length} 格`}
          >
            {Array.from({ length: level.trayCapacity }, (_, index) => {
              const entry = state.tray[index]
              const item = entry ? speciesById.get(entry.speciesId) : undefined
              return (
                <div
                  key={index}
                  className={entry ? 'tray-slot tray-slot--filled' : 'tray-slot'}
                  aria-label={entry && item ? `${item.formula} ${item.nameZh}，已入槽` : `空槽 ${index + 1}`}
                >
                  {item?.formula ?? <span className="slot-index">{String(index + 1).padStart(2, '0')}</span>}
                </div>
              )
            })}
          </div>
        </section>

        {level.availableConditionIds.length > 0 && (
          <section className={awaitingCondition ? 'condition-panel condition-panel--awaiting' : 'condition-panel'} aria-labelledby="condition-heading">
            <div className="panel-bar">
              <h2 id="condition-heading">CONDITION CONTROL</h2>
              <span>OPTIONAL INPUT</span>
            </div>
            {awaitingCondition && <p className="panel-status panel-status--awaiting">AWAITING CONDITION</p>}
            <div className="condition-list">
              {level.availableConditionIds.map((conditionId) => {
                const condition = conditionById.get(conditionId)
                const active = state.activeConditionIds.includes(conditionId)
                return (
                  <button
                    key={conditionId}
                    type="button"
                    className={active ? 'condition-button condition-button--active' : 'condition-button'}
                    disabled={state.status !== 'playing' && state.status !== 'awaiting-condition'}
                    aria-pressed={active}
                    onClick={() => send({ type: 'activate-condition', conditionId })}
                  >
                    <span>{condition?.nameZh ?? conditionId}</span>
                    <small>{condition?.lifecycle === 'persistent' ? 'PERSISTENT' : 'ONE-SHOT'}</small>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <div className="action-row">
          <button
            type="button"
            className="undo-button"
            disabled={!state.history.length || state.undoUsed >= level.toolLimits.undo}
            onClick={() => send({ type: 'undo' })}
          >
            <span>撤回上一步</span>
            <small>{undoLabel}</small>
          </button>
          <span className="move-readout">MOVE {String(state.moveCount).padStart(2, '0')}</span>
        </div>

        <p className={feedbackClassName} role="status" aria-live="polite">{feedbackCopy}</p>

        {(state.status === 'won' || state.status === 'lost') && (
          <section className={`outcome outcome--${state.status}`} aria-label={state.status === 'won' ? '关卡完成' : '关卡失败'}>
            <div>
              <span className="outcome-kicker">{state.status === 'won' ? 'RUN COMPLETE' : 'RUN INTERRUPTED'}</span>
              <strong>{state.status === 'won' ? '样本链已完成' : '反应槽已封存'}</strong>
            </div>
            <button type="button" onClick={restartLevel}>{state.status === 'won' ? '再做一次' : '重新开始'}</button>
          </section>
        )}

        <footer className="console-footer">
          <span>V1.1 / CHAPTER 01</span>
          <span>RULES LOCKED · ENGINE ONLINE</span>
        </footer>
      </div>
    </main>
  )
}
