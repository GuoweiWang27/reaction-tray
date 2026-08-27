import { useMemo, useState, type CSSProperties } from 'react'
import { conditions } from '../content/conditions'
import { verticalSliceLevels } from '../content/levels/vertical-slice'
import { reactions } from '../content/reactions'
import { species } from '../content/species'
import { applyCommand, createGame, selectableTileIds, type EngineContext, type GameCommand } from './engine'
import './game.css'

const requestedLevel = Number(new URLSearchParams(window.location.search).get('level') ?? '1')
const initialLevel = Number.isInteger(requestedLevel) ? Math.min(2, Math.max(0, requestedLevel - 1)) : 0

const phaseLabel = (phase: string): string => ({ aq: 'AQUEOUS', s: 'SOLID', l: 'LIQUID', g: 'GAS' }[phase] ?? 'SPECIMEN')
const accessibleSpeciesName = (item: (typeof species)[number]): string => item.kind === 'ion' ? `水溶液中的${item.nameZh}` : item.nameZh

export function GameScreen() {
  const [levelIndex, setLevelIndex] = useState(initialLevel)
  const level = verticalSliceLevels[levelIndex]
  const context = useMemo<EngineContext>(() => ({ level, reactions, conditions }), [level])
  const [state, setState] = useState(() => createGame(verticalSliceLevels[initialLevel]))
  const [feedback, setFeedback] = useState('选择未被遮挡的物质卡，观察它们如何在槽中相遇。')
  const speciesById = useMemo(() => new Map(species.map((item) => [item.id, item])), [])
  const conditionById = useMemo(() => new Map(conditions.map((item) => [item.id, item])), [])
  const selectable = new Set(selectableTileIds(state, level))
  const remaining = new Set(state.remainingTileIds)
  const goal = level.goals[0]
  const target = goal?.kind === 'produce' ? speciesById.get(goal.targetSpeciesId) : undefined
  const produced = goal?.kind === 'produce' ? (state.produced[goal.targetSpeciesId] ?? 0) : 0
  const goalCount = goal?.kind === 'produce' ? goal.count : 0
  const statusLabel = state.status === 'won'
    ? 'COMPLETE'
    : state.status === 'lost'
      ? 'FAILED'
      : state.status === 'awaiting-condition'
        ? 'AWAIT CONDITION'
        : 'READY'

  const send = (command: GameCommand) => {
    const result = applyCommand(state, command, context)
    setState(result.state)
    const reactionEffect = result.effects.find((effect) => effect.type === 'reaction')

    if (result.state.status === 'won') setFeedback('关卡完成 · 目标产物已达到标准。')
    else if (result.state.status === 'lost') setFeedback('关卡失败 · 反应槽已满且没有可触发反应。')
    else if (result.effects.some((effect) => effect.type === 'restored')) setFeedback('已撤回上一步及其自动反应。')
    else if (reactionEffect?.type === 'reaction') setFeedback(`反应完成 · ${reactionEffect.equation}`)
    else if (result.state.status === 'awaiting-condition') setFeedback('反应槽已满 · 选择本关条件以继续观察。')
    else if (command.type === 'select-tile') setFeedback('样本已入槽 · 继续寻找能形成反应的组合。')
  }

  const restartLevel = () => {
    setState(createGame(level))
    setFeedback('实验台已复位 · 选择未被遮挡的物质卡。')
  }

  const chooseLevel = (index: number) => {
    setLevelIndex(index)
    setState(createGame(verticalSliceLevels[index]))
    setFeedback('实验台已切换 · 选择未被遮挡的物质卡。')
  }

  return (
    <main className="game-shell">
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
                  className={isSelectable ? 'tile tile--open' : 'tile tile--locked'}
                  style={style}
                  disabled={!isSelectable}
                  onClick={() => send({ type: 'select-tile', tileId: tile.tileId })}
                  aria-label={`${item.formula}，${accessibleSpeciesName(item)}，${isSelectable ? '可取出' : '被其他卡牌遮挡'}`}
                >
                  <span className="tile-tag">{isSelectable ? 'OPEN' : 'LOCKED'}</span>
                  <strong className="tile-formula">{item.formula}</strong>
                  <span className="tile-name">{item.nameZh}</span>
                  <span className="tile-phase">{phaseLabel(item.defaultPhase)}</span>
                </button>
              )
            })}
          </div>
          <p className="field-instruction" id="field-instruction">
            <span className="legend-dot legend-dot--open" aria-hidden="true" /> OPEN 可取出
            <span className="legend-dot legend-dot--locked" aria-hidden="true" /> LOCKED 被遮挡
          </p>
        </section>

        <section className="tray-panel" aria-labelledby="tray-heading">
          <div className="panel-bar">
            <h2 id="tray-heading">REACTION TRAY</h2>
            <span>{state.tray.length} / {level.trayCapacity} SLOTS</span>
          </div>
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
          <section className="condition-panel" aria-labelledby="condition-heading">
            <div className="panel-bar">
              <h2 id="condition-heading">CONDITION CONTROL</h2>
              <span>OPTIONAL INPUT</span>
            </div>
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
            <small>{state.undoUsed >= level.toolLimits.undo ? 'LIMIT REACHED' : 'ATOMIC RESTORE'}</small>
          </button>
          <span className="move-readout">MOVE {String(state.moveCount).padStart(2, '0')}</span>
        </div>

        <p className="feedback" role="status" aria-live="polite">{feedback}</p>

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
