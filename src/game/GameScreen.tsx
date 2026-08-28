import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { conditions } from '../content/conditions'
import { chapters, levels } from '../content/levels'
import { reactions } from '../content/reactions'
import { species } from '../content/species'
import { applyCommand, createGame, selectableTileIds, type EngineContext, type GameCommand, type GameEffect } from './engine'
import { getLossFeedback, getReactionFeedback, getSafetyNotes } from './feedback'
import { buildGoalView } from './goalProgress'
import { solveLevel } from './solver'
import { ChapterNavigator } from './components/ChapterNavigator'
import { GoalPanel } from './components/GoalPanel'
import { OutcomePanel } from './components/OutcomePanel'
import { mergeResult, readStoredProgress, score, writeProgress, type BestStars, type StoredProgressV2 } from './progress'
import './game.css'

const requestedLevel = Number(new URLSearchParams(window.location.search).get('level') ?? '1')
const initialLevel = Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= levels.length ? requestedLevel - 1 : 0

const phaseLabel = (phase: string): string => ({ aq: 'AQUEOUS', s: 'SOLID', l: 'LIQUID', g: 'GAS' }[phase] ?? 'SPECIMEN')
const phaseShortLabel = (phase: string): string => ({ aq: 'AQ', s: 'S', l: 'L', g: 'G' }[phase] ?? '?')
const accessibleSpeciesName = (item: (typeof species)[number]): string => item.kind === 'ion' ? `水溶液中的${item.nameZh}` : item.nameZh
type ReactionEffect = Extract<GameEffect, { type: 'reaction' }>
type ReactionCueKind = 'precipitate' | 'product' | 'gas' | 'light' | 'metal' | 'color-change'
type ReactionCue = { id: number; kind: ReactionCueKind; label: string; marker: string; formula: string; equation: string }
type EffectReceipt = ReactionCue & { effectCount: number; total: number }
type DirectionKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
type TileActionSource = 'pointer' | 'keyboard'
type SoundKind = 'select' | 'reaction' | 'win' | 'gas' | 'light' | 'metal' | 'color-change'
type SoundProfile = { oscillator: OscillatorType; frequencies: number[]; duration: number; gain: number }

const soundEnabledStorageKey = 'reaction-tray.sound-enabled.v1'

const soundProfiles: Record<SoundKind, SoundProfile> = {
  select: { oscillator: 'sine', frequencies: [440, 660], duration: 0.08, gain: 0.045 },
  reaction: { oscillator: 'triangle', frequencies: [262, 392, 523], duration: 0.18, gain: 0.055 },
  win: { oscillator: 'sine', frequencies: [523, 659, 784], duration: 0.36, gain: 0.065 },
  gas: { oscillator: 'sine', frequencies: [196, 247, 294], duration: 0.22, gain: 0.05 },
  light: { oscillator: 'sine', frequencies: [880, 1175, 1568], duration: 0.16, gain: 0.05 },
  metal: { oscillator: 'square', frequencies: [220, 277, 330], duration: 0.2, gain: 0.04 },
  'color-change': { oscillator: 'triangle', frequencies: [330, 415, 370], duration: 0.24, gain: 0.045 },
}

const readSoundEnabled = (): boolean => {
  try {
    return JSON.parse(window.localStorage.getItem(soundEnabledStorageKey) ?? 'false') === true
  } catch {
    return false
  }
}

const directionKeys = new Set<DirectionKey>(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

const nextDirectionalTileId = (
  tileId: string,
  key: string,
  visibleTiles: typeof levels[number]['board'],
): string | null => {
  if (!directionKeys.has(key as DirectionKey)) return null
  const currentIndex = visibleTiles.findIndex((tile) => tile.tileId === tileId)
  if (currentIndex < 0) return null
  const current = visibleTiles[currentIndex]
  const direction = key as DirectionKey
  const candidates = visibleTiles.filter((tile) => {
    if (tile.tileId === tileId) return false
    if (direction === 'ArrowRight') return tile.x > current.x
    if (direction === 'ArrowLeft') return tile.x < current.x
    if (direction === 'ArrowDown') return tile.y > current.y
    return tile.y < current.y
  })
  if (!candidates.length) return null

  const horizontal = direction === 'ArrowLeft' || direction === 'ArrowRight'
  const alignedCandidates = candidates.filter((tile) => horizontal ? tile.y === current.y : tile.x === current.x)
  const pool = alignedCandidates.length ? alignedCandidates : candidates
  pool.sort((left, right) => {
    const leftPrimary = horizontal ? Math.abs(left.x - current.x) : Math.abs(left.y - current.y)
    const rightPrimary = horizontal ? Math.abs(right.x - current.x) : Math.abs(right.y - current.y)
    const leftCross = horizontal ? Math.abs(left.y - current.y) : Math.abs(left.x - current.x)
    const rightCross = horizontal ? Math.abs(right.y - current.y) : Math.abs(right.x - current.x)
    return leftPrimary - rightPrimary
      || leftCross - rightCross
      || visibleTiles.indexOf(left) - visibleTiles.indexOf(right)
  })
  return pool[0]?.tileId ?? null
}

const nextKeyboardFocusTileId = (
  selectedTileId: string,
  nextState: ReturnType<typeof createGame>,
  level: typeof levels[number],
): string | null => {
  const selectedTile = level.board.find((tile) => tile.tileId === selectedTileId)
  if (!selectedTile) return null
  const remaining = new Set(nextState.remainingTileIds)
  const visibleTiles = level.board.filter((tile) => remaining.has(tile.tileId) && tile.tileId !== selectedTileId)
  if (!visibleTiles.length) return null
  const selectable = nextState.status === 'playing' ? new Set(selectableTileIds(nextState, level)) : new Set<string>()
  return [...visibleTiles].sort((left, right) => {
    const leftOpen = selectable.has(left.tileId) ? 0 : 1
    const rightOpen = selectable.has(right.tileId) ? 0 : 1
    const leftLayer = left.z === selectedTile.z ? 0 : 1
    const rightLayer = right.z === selectedTile.z ? 0 : 1
    const leftDistance = Math.abs(left.x - selectedTile.x) + Math.abs(left.y - selectedTile.y)
    const rightDistance = Math.abs(right.x - selectedTile.x) + Math.abs(right.y - selectedTile.y)
    return leftOpen - rightOpen
      || leftLayer - rightLayer
      || leftDistance - rightDistance
      || Math.abs(left.x - selectedTile.x) - Math.abs(right.x - selectedTile.x)
      || level.board.indexOf(left) - level.board.indexOf(right)
  })[0]?.tileId ?? null
}

const cueDetails: Record<ReactionCueKind, { label: string; marker: string }> = {
  product: { label: '产物生成', marker: 'OUTPUT +' },
  precipitate: { label: '沉淀生成', marker: 'PRECIPITATE ↓' },
  gas: { label: '气体逸出', marker: 'GAS ↑' },
  light: { label: '强光反馈', marker: 'LIGHT ✦' },
  metal: { label: '金属析出', marker: 'METAL ▰' },
  'color-change': { label: '颜色变化', marker: 'COLOR SHIFT ◐' },
}

const cueKind = (effect: ReactionEffect): ReactionCueKind => effect.observableCue === 'water' ? 'product' : effect.observableCue
const cueSoundKind = (kind: ReactionCueKind): SoundKind => kind === 'product' || kind === 'precipitate' ? 'reaction' : kind

export function GameScreen() {
  const [levelIndex, setLevelIndex] = useState(initialLevel)
  const level = levels[levelIndex]
  const context = useMemo<EngineContext>(() => ({ level, reactions, conditions }), [level])
  const [state, setState] = useState(() => createGame(levels[initialLevel]))
  const [feedback, setFeedback] = useState('选择未被遮挡的物质卡，观察它们如何在槽中相遇。')
  const speciesById = useMemo(() => new Map(species.map((item) => [item.id, item])), [])
  const conditionById = useMemo(() => new Map(conditions.map((item) => [item.id, item])), [])
  const [activeCues, setActiveCues] = useState<ReactionCue[]>([])
  const [effectReceipts, setEffectReceipts] = useState<EffectReceipt[]>([])
  const [latestReceiptId, setLatestReceiptId] = useState<number | null>(null)
  const [hintedTileId, setHintedTileId] = useState<string | null>(null)
  const [hintFocus, setHintFocus] = useState<{ kind: 'tile'; tileId: string } | { kind: 'condition'; conditionId: string } | null>(null)
  const [hintMessage, setHintMessage] = useState<string | null>(null)
  const [progressState, setProgressState] = useState<StoredProgressV2>(() => readStoredProgress())
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled)
  const [targetHighlightActive, setTargetHighlightActive] = useState(false)
  const [targetHighlightCycle, setTargetHighlightCycle] = useState(0)
  const [slotFloat, setSlotFloat] = useState<{ slotNumber: number; formula: string } | null>(null)
  const cueTimer = useRef<number | null>(null)
  const slotFloatTimer = useRef<number | null>(null)
  const targetHighlightTimer = useRef<number | null>(null)
  const effectSequence = useRef(0)
  const previousStatus = useRef(state.status)
  const tileRefs = useRef(new Map<string, HTMLButtonElement>())
  const pendingKeyboardFocus = useRef<{ preferredTileId: string | null } | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const mounted = useRef(true)
  const selectable = new Set(selectableTileIds(state, level))
  const remaining = new Set(state.remainingTileIds)
  const visibleTiles = useMemo(
    () => level.board.filter((tile) => state.remainingTileIds.includes(tile.tileId)),
    [level, state.remainingTileIds],
  )
  const hintedTile = hintedTileId ? level.board.find((tile) => tile.tileId === hintedTileId) : undefined
  const hintedBlockerIds = new Set(hintedTile?.blockedByTileIds.filter((id) => remaining.has(id)) ?? [])
  const hintedBlockerFormulas = [...hintedBlockerIds]
    .map((tileId) => level.board.find((tile) => tile.tileId === tileId))
    .map((tile) => tile ? speciesById.get(tile.speciesId)?.formula : undefined)
    .filter((formula): formula is string => Boolean(formula))
  const goalView = useMemo(() => buildGoalView(level, state, reactions, species), [level, state])
  const targetReactantSpeciesIds = useMemo(() => {
    const allowedReactionIds = new Set(level.allowedReactions.map((entry) => entry.reactionId))
    const currentReaction = reactions.find((reaction) => reaction.id === goalView.currentReactionId && allowedReactionIds.has(reaction.id))
    return new Set(currentReaction?.reactants.map((reactant) => reactant.speciesId) ?? [])
  }, [goalView.currentReactionId, level.allowedReactions])
  const safetyNotes = useMemo(() => getSafetyNotes(level, reactions, species), [level])
  const latestReceipt = effectReceipts.find((receipt) => receipt.id === latestReceiptId) ?? effectReceipts[0]
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
  const feedbackCopy = hintCopy ?? hintMessage ?? coachCopy ?? feedback
  const feedbackClassName = hintCopy || hintMessage
    ? 'feedback feedback--hint'
    : coachCopy
      ? 'feedback feedback--coach'
      : awaitingCondition
        ? 'feedback feedback--awaiting'
        : 'feedback'
  const undoRemaining = Math.max(0, level.toolLimits.undo - state.undoUsed)
  const undoLabel = undoRemaining === 0 ? 'LIMIT REACHED' : `UNDO ${undoRemaining}/${level.toolLimits.undo}`
  const currentProgress = progressState.levels[level.id]
  const currentStars: 0 | BestStars = state.status === 'won' ? score(state, level.starRules) : 0
  const hintRemaining = Math.max(0, level.toolLimits.hint - state.hintUsed)
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
    if (resetSequence) {
      setEffectReceipts([])
      setLatestReceiptId(null)
    }
  }

  const clearSlotFloat = () => {
    if (slotFloatTimer.current !== null) {
      window.clearTimeout(slotFloatTimer.current)
      slotFloatTimer.current = null
    }
    setSlotFloat(null)
  }

  const showSlotFloat = (slotNumber: number, formula: string) => {
    if (slotFloatTimer.current !== null) window.clearTimeout(slotFloatTimer.current)
    setSlotFloat({ slotNumber, formula })
    slotFloatTimer.current = window.setTimeout(() => {
      setSlotFloat(null)
      slotFloatTimer.current = null
    }, 600)
  }

  const clearTargetHighlight = () => {
    if (targetHighlightTimer.current !== null) {
      window.clearTimeout(targetHighlightTimer.current)
      targetHighlightTimer.current = null
    }
    setTargetHighlightActive(false)
  }

  const triggerTargetHighlight = () => {
    if (targetHighlightTimer.current !== null) window.clearTimeout(targetHighlightTimer.current)
    setTargetHighlightActive(true)
    setTargetHighlightCycle((cycle) => cycle + 1)
    targetHighlightTimer.current = window.setTimeout(() => {
      setTargetHighlightActive(false)
      targetHighlightTimer.current = null
    }, 900)
  }

  const presentReactionEffects = (effects: ReactionEffect[]) => {
    if (!effects.length) return
    const firstId = effectSequence.current + 1
    const cues = effects.map((effect, index) => {
      const kind = cueKind(effect)
      const details = cueDetails[kind]
      const formula = effect.productSpeciesIds.map((speciesId) => speciesById.get(speciesId)?.formula).filter(Boolean).join(' + ') || '—'
      return { id: firstId + index, kind, label: details.label, marker: details.marker, formula, equation: effect.equation }
    })
    effectSequence.current += cues.length
    const newReceipts = cues.map((cue, index) => ({
      ...cue,
      effectCount: effects.length,
      total: firstId + index,
    }))
    setLatestReceiptId(newReceipts.at(-1)?.id ?? null)
    setActiveCues(cues)
    setEffectReceipts((current) => [...newReceipts, ...current].slice(0, 3))
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (cueTimer.current !== null) window.clearTimeout(cueTimer.current)
    cueTimer.current = window.setTimeout(() => {
      setActiveCues([])
      cueTimer.current = null
    }, reducedMotion ? 80 : 900)
  }

  const createAudioContext = (): AudioContext | null => {
    if (!soundEnabled || audioContext.current) return audioContext.current
    try {
      const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext }
      const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext
      if (!AudioContextConstructor) return null
      audioContext.current = new AudioContextConstructor()
      return audioContext.current
    } catch {
      return null
    }
  }

  const playSound = (kind: SoundKind) => {
    if (!soundEnabled) return
    const context = createAudioContext()
    if (!context) return
    try {
      const profile = soundProfiles[kind]
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      const step = profile.duration / profile.frequencies.length
      oscillator.type = profile.oscillator
      profile.frequencies.forEach((frequency, index) => oscillator.frequency.setValueAtTime(frequency, now + index * step))
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(profile.gain, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + profile.duration + 0.02)
      void context.resume().catch(() => undefined)
    } catch {
      // Audio failure is non-blocking; the game remains usable without sound.
    }
  }

  const disposeAudioContext = () => {
    const context = audioContext.current
    audioContext.current = null
    if (!context) return
    try {
      void context.close().catch(() => undefined)
    } catch {
      // Browser audio cleanup is best effort.
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    try {
      window.localStorage.setItem(soundEnabledStorageKey, JSON.stringify(next))
    } catch {
      // Keep the in-memory preference when browser storage is unavailable.
    }
    if (!next) disposeAudioContext()
  }

  const copyResult = async () => {
    const resultStars = score(state, level.starRules)
    const resultText = `REACTION TRAY L${level.order} · ${state.moveCount} MOVES · ${'★'.repeat(resultStars)} · COMPLETE`
    if (typeof navigator.clipboard?.writeText !== 'function') {
      if (mounted.current) setFeedback('复制失败，请手动记录。')
      return
    }
    try {
      await navigator.clipboard.writeText(resultText)
      if (mounted.current) setFeedback('成绩已复制。')
    } catch {
      if (mounted.current) setFeedback('复制失败，请手动记录。')
    }
  }

  useEffect(() => {
    const previous = previousStatus.current
    previousStatus.current = state.status
    if (previous !== 'won' && state.status === 'won') {
      setProgressState((previousProgress) => {
        const next = mergeResult(previousProgress, { levelId: level.id, moves: state.moveCount, stars: score(state, level.starRules) as BestStars })
        writeProgress(next)
        return next
      })
    }
  }, [level.id, state, state.status, state.moveCount, level.starRules])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (cueTimer.current !== null) window.clearTimeout(cueTimer.current)
      if (slotFloatTimer.current !== null) window.clearTimeout(slotFloatTimer.current)
      if (targetHighlightTimer.current !== null) window.clearTimeout(targetHighlightTimer.current)
      disposeAudioContext()
    }
  }, [])

  useEffect(() => {
    const pending = pendingKeyboardFocus.current
    if (!pending) return
    const candidateIds = [...new Set([pending.preferredTileId, ...visibleTiles.map((tile) => tile.tileId)].filter((tileId): tileId is string => Boolean(tileId)))]
    pendingKeyboardFocus.current = null
    const focusable = candidateIds
      .map((tileId) => tileRefs.current.get(tileId))
      .find((element): element is HTMLButtonElement => Boolean(element && !element.disabled && element.tabIndex >= 0))
    focusable?.focus()
  }, [visibleTiles])

  const handleHint = () => {
    if (state.status !== 'playing' && state.status !== 'awaiting-condition') return
    const result = solveLevel(context, { maxNodes: 200000, timeoutMs: 3000 }, state)
    const nextCommand = result.status === 'solved' ? result.path[0] : undefined
    if (!nextCommand) {
      setHintFocus(null)
      setHintMessage(result.status === 'unsolved'
        ? '当前局面没有可验证路线。'
        : '当前局面没有在提示预算内找到可验证路线。')
      return
    }

    const applied = applyCommand(state, { type: 'use-hint' }, context)
    if (applied.state === state || applied.state.hintUsed === state.hintUsed) {
      setHintFocus(null)
      setHintMessage('提示次数已用尽。')
      return
    }
    setState(applied.state)
    if (nextCommand.type === 'select-tile') {
      setHintFocus({ kind: 'tile', tileId: nextCommand.tileId })
      setHintMessage(`提示 · 建议取出 ${speciesById.get(level.board.find((tile) => tile.tileId === nextCommand.tileId)?.speciesId ?? '')?.formula ?? '高亮物质'}。`)
    } else {
      const condition = conditionById.get(nextCommand.conditionId)
      setHintFocus({ kind: 'condition', conditionId: nextCommand.conditionId })
      setHintMessage(`提示 · 下一步使用${condition?.nameZh ?? nextCommand.conditionId}条件。`)
    }
  }

  const send = (command: GameCommand, restoreKeyboardFocus = false) => {
    clearReactionCue(command.type === 'undo')
    if (command.type === 'select-tile' || command.type === 'undo') clearSlotFloat()
    setHintedTileId(null)
    setHintFocus(null)
    setHintMessage(null)
    const result = applyCommand(state, command, context)
    if (restoreKeyboardFocus && command.type === 'select-tile') {
      pendingKeyboardFocus.current = { preferredTileId: nextKeyboardFocusTileId(command.tileId, result.state, level) }
    }
    setState(result.state)
    const reactionEffects = result.effects.filter((effect): effect is ReactionEffect => effect.type === 'reaction')
    presentReactionEffects(reactionEffects)
    if (command.type === 'select-tile') {
      const trayIndex = result.state.tray.findIndex((entry) => entry.tileId === command.tileId)
      const trayEntry = trayIndex >= 0 ? result.state.tray[trayIndex] : undefined
      const item = trayEntry ? speciesById.get(trayEntry.speciesId) : undefined
      if (trayEntry && item) showSlotFloat(trayIndex + 1, item.formula)
    }
    const reactionFeedback = getReactionFeedback(reactionEffects.map((effect) => effect.reactionId), reactions)
    const activatedCondition = command.type === 'activate-condition' && result.state.moveCount > state.moveCount
      ? conditionById.get(command.conditionId)
      : undefined
    const conditionFeedback = activatedCondition
      ? ` · ${activatedCondition.nameZh}${activatedCondition.lifecycle === 'persistent' ? '保持激活' : '已使用'}`
      : ''
    const acceptedCommand = result.state.moveCount > state.moveCount
    if (acceptedCommand) {
      if (reactionEffects.length > 0) playSound(cueSoundKind(cueKind(reactionEffects[0])))
      else playSound('select')
      if (result.state.status === 'won') playSound('win')
    }

    if (result.state.status === 'won') {
      const detail = goalView.kind === 'sequence'
        ? '反应序列已按顺序完成'
        : reactionFeedback
          ? reactionFeedback.replace(/^反应完成 · /, '')
          : '目标产物已达到标准'
      setFeedback(`关卡完成 · ${detail}`)
    } else if (result.state.status === 'lost') setFeedback(`本轮实验失败 · ${getLossFeedback(result.state)}`)
    else if (result.effects.some((effect) => effect.type === 'restored')) setFeedback('已撤回上一步及其自动反应。')
    else if (reactionFeedback) setFeedback(`${reactionFeedback}${conditionFeedback}`)
    else if (activatedCondition) setFeedback(`条件已激活${conditionFeedback}`)
    else if (result.state.status === 'awaiting-condition') setFeedback('反应槽已满 · 等待使用可用条件继续观察。')
    else if (command.type === 'select-tile') setFeedback('样本已入槽 · 继续寻找能形成反应的组合。')
  }

  const restartLevel = () => {
    clearReactionCue(true)
    clearSlotFloat()
    clearTargetHighlight()
    pendingKeyboardFocus.current = null
    setHintedTileId(null)
    setHintFocus(null)
    setHintMessage(null)
    setState(createGame(level))
    setFeedback('实验台已复位 · 选择未被遮挡的物质卡。')
  }

  const chooseLevel = (index: number) => {
    clearReactionCue(true)
    clearSlotFloat()
    clearTargetHighlight()
    pendingKeyboardFocus.current = null
    setHintedTileId(null)
    setHintFocus(null)
    setHintMessage(null)
    setLevelIndex(index)
    setState(createGame(levels[index]))
    const url = new URL(window.location.href)
    url.searchParams.set('level', String(index + 1))
    window.history.replaceState(null, '', url)
    setFeedback('实验台已切换 · 选择未被遮挡的物质卡。')
  }

  const handleTileAction = (tileId: string, source: TileActionSource = 'pointer') => {
    const isSelectable = state.status === 'playing' && selectable.has(tileId)
    if (!isSelectable) {
      setHintFocus(null)
      setHintMessage(null)
      setHintedTileId(tileId)
      return
    }
    setHintedTileId(null)
    send({ type: 'select-tile', tileId }, source === 'keyboard')
  }

  const handleTileKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tileId: string) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      handleTileAction(tileId, 'keyboard')
      return
    }
    const nextTileId = nextDirectionalTileId(tileId, event.key, visibleTiles)
    if (!nextTileId) return
    event.preventDefault()
    tileRefs.current.get(nextTileId)?.focus()
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      const key = event.key.toLowerCase()
      if (key === 'u' && state.history.length && state.undoUsed < level.toolLimits.undo) {
        event.preventDefault()
        send({ type: 'undo' })
      } else if (key === 'r') {
        event.preventDefault()
        restartLevel()
      }
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  })

  return (
    <main className="game-shell" data-game-status={state.status}>
      <div className="console">
        <header className="instrument-header">
          <div className="title-lockup">
            <p className="brand-mark">CHEMISTRY PUZZLE <span>/</span> FIELD UNIT</p>
            <h1 aria-label="反应槽，Reaction Tray">
              <span className="game-title-zh">反应槽</span>
              <span className="game-title-en" lang="en">Reaction<br />Tray</span>
            </h1>
          </div>
          <div className="header-actions">
            <div className="run-status" aria-label={`当前状态 ${statusLabel}`}>
              <span className="status-led" aria-hidden="true" />
              <span>{statusLabel}</span>
            </div>
            <button
              type="button"
              className={soundEnabled ? 'sound-toggle sound-toggle--active' : 'sound-toggle'}
              data-testid="sound-toggle"
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? '音效已开启，点击关闭' : '音效已关闭，点击开启'}
              onClick={toggleSound}
            >
              <span className="sound-toggle-indicator" aria-hidden="true">{soundEnabled ? '●' : '○'}</span>
              <span>{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
            </button>
          </div>
        </header>

        <ChapterNavigator
          chapters={chapters}
          levels={levels}
          currentLevelOrder={level.order}
          progress={progressState}
          onSelectLevel={chooseLevel}
        />

        <GoalPanel
          view={goalView}
          won={state.status === 'won'}
          targetHighlightActive={targetHighlightActive}
          onTargetClick={triggerTargetHighlight}
          safetyNotes={safetyNotes}
        />

        <section className="field-panel" aria-labelledby="field-heading">
          <div className="panel-bar">
            <h2 id="field-heading">SPECIMEN FIELD</h2>
            <span>{state.remainingTileIds.length} CARDS REMAINING</span>
          </div>
          <div className="board" aria-describedby="field-instruction">
            <div className="board-grid" aria-hidden="true" />
            {visibleTiles.map((tile) => {
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
                  key={targetHighlightActive ? `${tile.tileId}-${targetHighlightCycle}` : tile.tileId}
                  type="button"
                  data-testid={tile.tileId}
                  className={[
                    'tile',
                    isSelectable ? 'tile--open' : 'tile--locked',
                    hintedBlockerIds.has(tile.tileId) ? 'tile--blocking' : '',
                    hintFocus?.kind === 'tile' && hintFocus.tileId === tile.tileId ? 'tile--solver-hint' : '',
                    targetHighlightActive && targetReactantSpeciesIds.has(tile.speciesId) ? 'tile--target-reactant' : '',
                  ].filter(Boolean).join(' ')}
                  style={style}
                  data-hint-focus={hintFocus?.kind === 'tile' && hintFocus.tileId === tile.tileId ? 'tile' : undefined}
                  aria-disabled={isSelectable ? undefined : true}
                  aria-describedby={hintFocus?.kind === 'tile' && hintFocus.tileId === tile.tileId ? 'feedback-message' : undefined}
                  ref={(element) => {
                    if (element) tileRefs.current.set(tile.tileId, element)
                    else tileRefs.current.delete(tile.tileId)
                  }}
                  onMouseEnter={() => setHintedTileId(isSelectable ? null : tile.tileId)}
                  onMouseLeave={(event) => {
                    if (event.currentTarget !== document.activeElement) {
                      setHintedTileId((current) => current === tile.tileId ? null : current)
                    }
                  }}
                  onFocus={() => setHintedTileId(isSelectable ? null : tile.tileId)}
                  onBlur={() => setHintedTileId((current) => current === tile.tileId ? null : current)}
                  onKeyDown={(event) => handleTileKeyDown(event, tile.tileId)}
                  onClick={() => handleTileAction(tile.tileId)}
                  aria-label={`${item.formula}，${accessibleSpeciesName(item)}，${isSelectable ? '可取出' : state.status !== 'playing' ? '关卡已结束，剩余牌不可操作' : blockerIds.length ? '被其他卡牌遮挡' : '当前不可操作'}`}
                >
                  <span className="tile-tag tile-status">
                    <span className="tile-status-marker" aria-hidden="true" />
                    <span>{isSelectable ? 'READY' : 'COVERED'}</span>
                  </span>
                  <strong className="tile-formula">{item.formula}</strong>
                  <span className="tile-meta">
                    <span className="tile-name">{item.nameZh}</span>
                    <abbr className="tile-phase" title={`物态：${phaseLabel(item.defaultPhase)}`} aria-label={`物态：${phaseLabel(item.defaultPhase)}`}>
                      {phaseShortLabel(item.defaultPhase)}
                    </abbr>
                  </span>
                </button>
              )
            })}
            {activeCues.length > 0 && (
              <div className="reaction-cue-layer" aria-hidden="true">
                {activeCues.map((cue) => (
                  <div key={cue.id} className={`reaction-cue reaction-cue--${cue.kind}`}>
                    <span>{cue.label}</span>
                    <strong>{cue.formula}</strong>
                    <small>{cue.marker}</small>
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
                {effectReceipts.map((receipt) => (
                  <div key={receipt.id} className={receipt.id === latestReceipt.id ? 'effect-receipt-item' : 'effect-receipt-item effect-receipt-item--history'}>
                    {receipt.id === latestReceipt.id ? (
                      <>
                        <span>{receipt.marker} · {receipt.label}</span>
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
            <span className="legend-dot legend-dot--open legend-dot--ready" aria-hidden="true" /> READY 可取出
            <span className="legend-dot legend-dot--locked legend-dot--covered" aria-hidden="true" /> COVERED 被遮挡
          </p>
        </section>

        <section className={awaitingCondition ? 'tray-panel tray-panel--awaiting' : 'tray-panel'} aria-labelledby="tray-heading">
          <div className="panel-bar">
            <h2 id="tray-heading">REACTION TRAY</h2>
            <span>{state.tray.length} / {level.trayCapacity} SLOTS</span>
          </div>
          {awaitingCondition && <p className="panel-status panel-status--awaiting">AWAITING CONDITION</p>}
          {slotFloat && (
            <p className="slot-float" aria-hidden="true">
              SLOT {String(slotFloat.slotNumber).padStart(2, '0')} ← {slotFloat.formula}
            </p>
          )}
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
                    data-testid={`condition-${conditionId}`}
                    data-hint-focus={hintFocus?.kind === 'condition' && hintFocus.conditionId === conditionId ? 'condition' : undefined}
                    className={[
                      'condition-button',
                      active ? 'condition-button--active' : '',
                      hintFocus?.kind === 'condition' && hintFocus.conditionId === conditionId ? 'condition-button--hinted' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={state.status !== 'playing' && state.status !== 'awaiting-condition'}
                    aria-pressed={active}
                    aria-describedby={hintFocus?.kind === 'condition' && hintFocus.conditionId === conditionId ? 'feedback-message' : undefined}
                    onClick={() => send({ type: 'activate-condition', conditionId })}
                  >
                    <span>{condition?.nameZh ?? conditionId}</span>
                    <small>
                      {active
                        ? `本轮已激活 · ${condition?.lifecycle === 'persistent' ? 'PERSISTENT' : 'ONE-SHOT'}`
                        : awaitingCondition
                          ? `等待使用 · ${condition?.lifecycle === 'persistent' ? 'PERSISTENT' : 'ONE-SHOT'}`
                          : condition?.lifecycle === 'persistent' ? 'PERSISTENT' : 'ONE-SHOT'}
                    </small>
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
          <button
            type="button"
            className="hint-button"
            data-testid="hint-button"
            disabled={(state.status !== 'playing' && state.status !== 'awaiting-condition') || hintRemaining === 0}
            aria-label={`提示（剩余 ${hintRemaining}/${level.toolLimits.hint}）`}
            onClick={handleHint}
          >
            <span>提示</span>
            <small>HINT {hintRemaining}/{level.toolLimits.hint}</small>
          </button>
          <span className="move-readout">MOVE {String(state.moveCount).padStart(2, '0')}</span>
        </div>

        <p
          id="feedback-message"
          className={feedbackClassName}
          data-hint-kind={hintFocus?.kind}
          role="status"
          aria-live="polite"
        >{feedbackCopy}</p>

        {(state.status === 'won' || state.status === 'lost') && (
          <OutcomePanel
            status={state.status}
            moves={state.moveCount}
            stars={currentStars}
            bestMoves={currentProgress?.bestMoves ?? (state.status === 'won' ? state.moveCount : undefined)}
            onRestart={restartLevel}
            onCopy={copyResult}
          />
        )}

        <footer className="console-footer">
          <span>V1.1 / CHAPTER {String(level.chapter).padStart(2, '0')}</span>
          <span>RULES LOCKED · ENGINE ONLINE</span>
        </footer>
      </div>
    </main>
  )
}
