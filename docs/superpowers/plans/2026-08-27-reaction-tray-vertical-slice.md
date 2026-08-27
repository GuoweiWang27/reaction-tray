# Reaction Tray Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, mobile-first playable version of levels 1–3 that proves blocking, 1:1 and 1:2 reactions, tray failure, goals, effects, atomic undo, and solver-backed solvability.

**Architecture:** Keep the existing structured chemistry and level registries as content SSOT. Add one pure TypeScript engine module and one solver module; React only sends commands and renders returned state/effects. Split the engine only after the vertical slice makes a file boundary necessary.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Playwright 1.62, npm.

---

## Existing preparation baseline

- `src/domain/types.ts`: chemistry, condition and level contracts.
- `src/content/species.ts`: 37 structured species.
- `src/content/reactions.ts`: 17 balanced reaction definitions.
- `src/content/levels/vertical-slice.ts`: exact level 1–3 boards and standard tile sequences.
- `src/content/validateContent.ts`: chemistry and level-graph validation.
- `playwright.config.ts`: 390 x 844 mobile Chromium/WebKit projects.

### Task 1: Add the pure game engine with atomic undo

**Files:**
- Create: `src/game/engine.ts`
- Create: `tests/unit/engine.test.ts`

- [ ] **Step 1: Write the complete failing engine test**

```ts
import { describe, expect, it } from 'vitest'
import { conditions } from '../../src/content/conditions'
import { verticalSliceLevels } from '../../src/content/levels/vertical-slice'
import { reactions } from '../../src/content/reactions'
import { applyCommand, createGame, selectableTileIds, type EngineContext } from '../../src/game/engine'

const context = (levelIndex: number): EngineContext => ({ level: verticalSliceLevels[levelIndex], reactions, conditions })

describe('game engine', () => {
  it('resolves level 3 at 1:2 and completes the stored solution', () => {
    const ctx = context(2)
    let state = createGame(ctx.level)
    for (const tileId of ctx.level.standardSolutionTileIds) state = applyCommand(state, { type: 'select-tile', tileId }, ctx).state
    expect(state.status).toBe('won')
    expect(state.produced['species.copper-ii-hydroxide']).toBe(2)
    expect(state.tray).toEqual([])
  })

  it('undoes one selection and its automatic reaction as one transaction', () => {
    const ctx = context(2)
    let state = createGame(ctx.level)
    for (const tileId of ['l3-cu-1', 'l3-oh-1']) state = applyCommand(state, { type: 'select-tile', tileId }, ctx).state
    const beforeReaction = state
    state = applyCommand(state, { type: 'select-tile', tileId: 'l3-oh-2' }, ctx).state
    expect(state.produced['species.copper-ii-hydroxide']).toBe(1)
    state = applyCommand(state, { type: 'undo' }, ctx).state
    expect({ ...state, history: [], undoUsed: 0 }).toEqual({ ...beforeReaction, history: [], undoUsed: 0 })
    expect(state.undoUsed).toBe(1)
  })

  it('never exposes a blocked tile as selectable', () => {
    const ctx = context(0)
    const state = createGame(ctx.level)
    expect(selectableTileIds(state, ctx.level)).not.toContain('l1-h-3')
  })
})
```

- [ ] **Step 2: Run the test and confirm the red state**

Run: `npm test -- tests/unit/engine.test.ts`

Expected: FAIL with a missing `src/game/engine.ts` module.

- [ ] **Step 3: Add the complete engine implementation**

```ts
import type { ConditionDefinition, ConditionId, LevelDefinition, ReactionDefinition } from '../domain/types'

export type GameStatus = 'playing' | 'awaiting-condition' | 'won' | 'lost'
export type GameCommand = { type: 'select-tile'; tileId: string } | { type: 'activate-condition'; conditionId: ConditionId } | { type: 'undo' }
export type GameEffect = { type: 'reaction'; reactionId: string; equation: string } | { type: 'restored' }
export type TrayEntry = { tileId: string; speciesId: string }
export interface GameSnapshot { remainingTileIds: string[]; tray: TrayEntry[]; produced: Record<string, number>; performed: Record<string, number>; activeConditionIds: ConditionId[]; moveCount: number; status: GameStatus; undoUsed: number }
export interface GameState extends GameSnapshot { history: GameSnapshot[] }
export interface EngineContext { level: LevelDefinition; reactions: ReactionDefinition[]; conditions: ConditionDefinition[] }

const snapshot = ({ history: _history, ...state }: GameState): GameSnapshot => structuredClone(state)
const withHistory = (state: GameSnapshot, history: GameSnapshot[]): GameState => ({ ...state, history })

export function createGame(level: LevelDefinition): GameState {
  return { remainingTileIds: level.board.map((tile) => tile.tileId), tray: [], produced: {}, performed: {}, activeConditionIds: [], moveCount: 0, status: 'playing', undoUsed: 0, history: [] }
}

export function selectableTileIds(state: GameState, level: LevelDefinition): string[] {
  const remaining = new Set(state.remainingTileIds)
  return level.board.filter((tile) => remaining.has(tile.tileId) && tile.blockedByTileIds.every((id) => !remaining.has(id))).map((tile) => tile.tileId)
}

function eligible(state: GameSnapshot, context: EngineContext): ReactionDefinition | null {
  const counts = state.tray.reduce<Record<string, number>>((all, entry) => ({ ...all, [entry.speciesId]: (all[entry.speciesId] ?? 0) + 1 }), {})
  const byId = new Map(context.reactions.map((reaction) => [reaction.id, reaction]))
  const matches = context.level.allowedReactions.flatMap((entry) => {
    const reaction = byId.get(entry.reactionId)
    if (!reaction) throw new Error(`missing reaction ${entry.reactionId}`)
    const hasReactants = reaction.reactants.every((term) => (counts[term.speciesId] ?? 0) >= term.coefficient)
    const hasConditions = reaction.requiredConditionIds.every((id) => state.activeConditionIds.includes(id))
    return hasReactants && hasConditions ? [{ reaction, priority: entry.priority }] : []
  }).sort((a, b) => b.priority - a.priority)
  if (!matches.length) return null
  if (matches[1]?.priority === matches[0].priority) throw new Error('ambiguous eligible reactions')
  return matches[0].reaction
}

function consume(tray: TrayEntry[], reaction: ReactionDefinition): TrayEntry[] {
  const next = [...tray]
  for (const term of reaction.reactants) for (let index = 0; index < term.coefficient; index += 1) {
    const trayIndex = next.findIndex((entry) => entry.speciesId === term.speciesId)
    if (trayIndex < 0) throw new Error(`missing reactant ${term.speciesId}`)
    next.splice(trayIndex, 1)
  }
  return next
}

function goalsMet(state: GameSnapshot, level: LevelDefinition): boolean {
  return level.goals.every((goal) => {
    if (goal.kind === 'produce') return (state.produced[goal.targetSpeciesId] ?? 0) >= goal.count
    if (goal.kind === 'perform-reaction') return (state.performed[goal.reactionId] ?? 0) >= goal.count
    return false
  })
}

function usefulConditionExists(state: GameSnapshot, context: EngineContext): boolean {
  return context.level.availableConditionIds.some((conditionId) => {
    if (state.activeConditionIds.includes(conditionId)) return false
    const condition = context.conditions.find((item) => item.id === conditionId)
    const active = condition?.category === 'energy'
      ? [...state.activeConditionIds.filter((id) => context.conditions.find((item) => item.id === id)?.category !== 'energy'), conditionId]
      : [...state.activeConditionIds, conditionId]
    return eligible({ ...state, activeConditionIds: active }, context) !== null
  })
}

function settle(input: GameSnapshot, context: EngineContext): { state: GameSnapshot; effects: GameEffect[] } {
  let state = structuredClone(input)
  const effects: GameEffect[] = []
  for (let reaction = eligible(state, context); reaction; reaction = eligible(state, context)) {
    state.tray = consume(state.tray, reaction)
    state.performed[reaction.id] = (state.performed[reaction.id] ?? 0) + 1
    for (const product of reaction.products) {
      state.produced[product.speciesId] = (state.produced[product.speciesId] ?? 0) + product.coefficient
      if (context.level.intermediateProductSpeciesIds.includes(product.speciesId)) for (let index = 0; index < product.coefficient; index += 1) state.tray.push({ tileId: `product.${reaction.id}.${state.performed[reaction.id]}.${index}`, speciesId: product.speciesId })
    }
    const oneShot = new Set(context.conditions.filter((item) => item.lifecycle === 'one-shot').map((item) => item.id))
    state.activeConditionIds = state.activeConditionIds.filter((id) => !reaction.requiredConditionIds.includes(id) || !oneShot.has(id))
    effects.push({ type: 'reaction', reactionId: reaction.id, equation: reaction.equationDisplay })
  }
  if (goalsMet(state, context.level)) state.status = 'won'
  else if (state.tray.length >= context.level.trayCapacity) state.status = usefulConditionExists(state, context) ? 'awaiting-condition' : 'lost'
  else if (!state.remainingTileIds.length) state.status = 'lost'
  else state.status = 'playing'
  return { state, effects }
}

export function applyCommand(current: GameState, command: GameCommand, context: EngineContext): { state: GameState; effects: GameEffect[] } {
  if (command.type === 'undo') {
    if (!current.history.length || current.undoUsed >= context.level.toolLimits.undo) return { state: current, effects: [] }
    const restored = current.history.at(-1)!
    return { state: withHistory({ ...restored, undoUsed: current.undoUsed + 1 }, current.history.slice(0, -1)), effects: [{ type: 'restored' }] }
  }
  const before = snapshot(current)
  let next = structuredClone(before)
  if (command.type === 'select-tile') {
    if (current.status !== 'playing' || !selectableTileIds(current, context.level).includes(command.tileId)) return { state: current, effects: [] }
    const tile = context.level.board.find((item) => item.tileId === command.tileId)!
    next.remainingTileIds = next.remainingTileIds.filter((id) => id !== command.tileId)
    next.tray.push({ tileId: tile.tileId, speciesId: tile.speciesId })
    next.moveCount += 1
  } else {
    if (!context.level.availableConditionIds.includes(command.conditionId)) return { state: current, effects: [] }
    const condition = context.conditions.find((item) => item.id === command.conditionId)!
    next.activeConditionIds = condition.category === 'energy'
      ? [...next.activeConditionIds.filter((id) => context.conditions.find((item) => item.id === id)?.category !== 'energy'), command.conditionId]
      : [...new Set([...next.activeConditionIds, command.conditionId])]
  }
  const settled = settle(next, context)
  return { state: withHistory(settled.state, [...current.history, before]), effects: settled.effects }
}
```

- [ ] **Step 4: Run the focused and full unit suites**

Run: `npm test -- tests/unit/engine.test.ts && npm test`

Expected: the focused file reports 3 passing tests and the full suite has zero failures.

- [ ] **Step 5: Commit the engine**

Run: `git add src/game/engine.ts tests/unit/engine.test.ts && git commit -m "feat: add deterministic game engine"`

### Task 2: Prove all three levels with a bounded solver

**Files:**
- Create: `src/game/solver.ts`
- Create: `tests/unit/solver.test.ts`

- [ ] **Step 1: Write the complete failing solver test**

```ts
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
```

- [ ] **Step 2: Run the test and confirm the red state**

Run: `npm test -- tests/unit/solver.test.ts`

Expected: FAIL with a missing `src/game/solver.ts` module.

- [ ] **Step 3: Add the complete bounded breadth-first solver**

```ts
import { applyCommand, createGame, selectableTileIds, type EngineContext, type GameState } from './engine'

export type SolveResult = { status: 'solved'; path: string[]; visitedNodes: number } | { status: 'node-limit' | 'timeout' | 'unsolved'; path: []; visitedNodes: number }
const stateKey = (state: GameState) => JSON.stringify({ remaining: [...state.remainingTileIds].sort(), tray: state.tray.map((entry) => entry.speciesId).sort(), produced: state.produced, performed: state.performed, active: [...state.activeConditionIds].sort(), status: state.status })

export function solveLevel(context: EngineContext, limits: { maxNodes: number; timeoutMs: number }): SolveResult {
  const startedAt = performance.now()
  const initial = createGame(context.level)
  const queue: Array<{ state: GameState; path: string[] }> = [{ state: initial, path: [] }]
  const seen = new Set([stateKey(initial)])
  let visitedNodes = 0
  while (queue.length) {
    if (performance.now() - startedAt > limits.timeoutMs) return { status: 'timeout', path: [], visitedNodes }
    if (visitedNodes >= limits.maxNodes) return { status: 'node-limit', path: [], visitedNodes }
    const current = queue.shift()!
    visitedNodes += 1
    if (current.state.status === 'won') return { status: 'solved', path: current.path, visitedNodes }
    if (current.state.status !== 'playing') continue
    for (const tileId of selectableTileIds(current.state, context.level)) {
      const next = applyCommand(current.state, { type: 'select-tile', tileId }, context).state
      const key = stateKey(next)
      if (seen.has(key)) continue
      seen.add(key)
      queue.push({ state: next, path: [...current.path, tileId] })
    }
  }
  return { status: 'unsolved', path: [], visitedNodes }
}
```

- [ ] **Step 4: Run and commit**

Run: `npm test -- tests/unit/solver.test.ts && git add src/game/solver.ts tests/unit/solver.test.ts && git commit -m "feat: prove vertical slice solvability"`

Expected: three solver cases pass before the commit runs.

### Task 3: Replace the readiness screen with the playable mobile slice

**Files:**
- Create: `src/game/GameScreen.tsx`
- Create: `src/game/game.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the complete game screen**

```tsx
import { useMemo, useState, type CSSProperties } from 'react'
import { conditions } from '../content/conditions'
import { verticalSliceLevels } from '../content/levels/vertical-slice'
import { reactions } from '../content/reactions'
import { species } from '../content/species'
import { applyCommand, createGame, selectableTileIds, type GameCommand } from './engine'
import './game.css'

const initialLevel = Math.min(2, Math.max(0, Number(new URLSearchParams(location.search).get('level') ?? 1) - 1))

export function GameScreen() {
  const [levelIndex, setLevelIndex] = useState(initialLevel)
  const level = verticalSliceLevels[levelIndex]
  const context = useMemo(() => ({ level, reactions, conditions }), [level])
  const [state, setState] = useState(() => createGame(level))
  const [feedback, setFeedback] = useState('选择未被遮挡的物质卡。')
  const speciesById = useMemo(() => new Map(species.map((item) => [item.id, item])), [])
  const selectable = new Set(selectableTileIds(state, level))
  const goal = level.goals[0]
  const target = goal.kind === 'produce' ? speciesById.get(goal.targetSpeciesId) : undefined
  const produced = goal.kind === 'produce' ? (state.produced[goal.targetSpeciesId] ?? 0) : 0

  const send = (command: GameCommand) => {
    const result = applyCommand(state, command, context)
    setState(result.state)
    if (result.state.status === 'won') setFeedback('关卡完成')
    else if (result.state.status === 'lost') setFeedback('反应槽已满且没有可触发反应，关卡失败。')
    else if (result.effects[0]?.type === 'reaction') setFeedback(`反应完成：${result.effects[0].equation}`)
    else if (result.effects[0]?.type === 'restored') setFeedback('已撤回上一步及其自动反应。')
  }

  const chooseLevel = (index: number) => {
    setLevelIndex(index)
    setState(createGame(verticalSliceLevels[index]))
    setFeedback('选择未被遮挡的物质卡。')
  }

  return (
    <main className="game-shell">
      <header><p className="eyebrow">REACTION TRAY</p><h1>反应槽</h1></header>
      <nav aria-label="垂直切片关卡">{verticalSliceLevels.map((item, index) => <button key={item.id} onClick={() => chooseLevel(index)} aria-pressed={index === levelIndex}>选择第 {index + 1} 关</button>)}</nav>
      <section className="goal" aria-label="关卡目标"><strong>{level.titleZh}</strong><span>{target?.formula} {produced} / {goal.kind === 'produce' ? goal.count : 0}</span></section>
      <div className="board" aria-label="物质卡牌棋盘">{level.board.filter((tile) => state.remainingTileIds.includes(tile.tileId)).map((tile) => {
        const item = speciesById.get(tile.speciesId)!
        const style = { '--x': tile.x, '--y': tile.y, '--z': tile.z, '--w': tile.width } as CSSProperties
        return <button key={tile.tileId} data-testid={tile.tileId} className="tile" style={style} disabled={!selectable.has(tile.tileId)} onClick={() => send({ type: 'select-tile', tileId: tile.tileId })} aria-label={`${item.formula} ${item.nameZh}`}><b>{item.formula}</b><small>{item.nameZh}</small></button>
      })}</div>
      <div className="tray" aria-label={`反应槽，容量 ${level.trayCapacity}`}>{Array.from({ length: level.trayCapacity }, (_, index) => <div key={index} className="tray-slot">{state.tray[index] ? speciesById.get(state.tray[index].speciesId)?.formula : ''}</div>)}</div>
      <button className="undo" disabled={!state.history.length || state.undoUsed >= level.toolLimits.undo} onClick={() => send({ type: 'undo' })}>撤回</button>
      <p className="feedback" role="status" aria-live="polite">{feedback}</p>
    </main>
  )
}
```

- [ ] **Step 2: Wire the app entry**

Replace `src/App.tsx` with:

```tsx
import { GameScreen } from './game/GameScreen'

export default function App() {
  return <GameScreen />
}
```

- [ ] **Step 3: Add the exact responsive CSS acceptance rules**

```css
.game-shell { width: min(430px, 100%); min-height: 100svh; margin: 0 auto; padding: 16px; background: #f7faf8; }
.game-shell header { display: flex; align-items: baseline; justify-content: space-between; }
.game-shell h1, .game-shell p { margin: 0; }
.eyebrow { color: #176b5b; font-size: .72rem; font-weight: 800; letter-spacing: .12em; }
nav { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
button { min-height: 44px; font: inherit; }
button:focus-visible { outline: 3px solid #0f766e; outline-offset: 2px; }
.goal { display: flex; justify-content: space-between; padding: 12px; border-radius: 12px; background: #e5f2ed; }
.board { position: relative; height: 350px; margin: 12px 0; border-radius: 18px; background: #dcebe5; overflow: hidden; }
.tile { position: absolute; left: calc(var(--x) * 8.333%); top: calc(18px + var(--y) * 92px); z-index: var(--z); width: calc(var(--w) * 8.333% - 4px); min-width: 58px; padding: 8px 4px; border: 1px solid #9ab9ae; border-radius: 10px; background: #fff; color: #17211f; }
.tile:disabled { opacity: .48; }
.tile b, .tile small { display: block; }
.tile b { font-size: 1.1rem; }
.tile small { margin-top: 2px; font-size: .68rem; }
.tray { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
.tray-slot { min-width: 0; min-height: 48px; display: grid; place-items: center; border: 1px solid #a8bdb5; border-radius: 8px; background: #fff; font-size: .75rem; }
.undo { width: 100%; margin-top: 12px; }
.feedback { min-height: 3em; margin-top: 12px !important; color: #334155; }
@media (max-width: 380px) { .game-shell { padding-inline: 10px; } .tile { min-width: 54px; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Run the static gate and commit**

Run: `npm run check && git add src && git commit -m "feat: add playable mobile vertical slice"`

Expected: typecheck, lint, unit tests, content validation and build all exit 0 before the commit.

### Task 4: Replace the scaffold E2E with complete game flows

**Files:**
- Delete: `tests/e2e/scaffold.spec.ts`
- Create: `tests/e2e/vertical-slice.spec.ts`

- [ ] **Step 1: Add the complete level 3 and reduced-motion tests**

```ts
import { expect, test } from '@playwright/test'

test('level 3 resolves two 1:2 reactions and completes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '选择第 3 关' }).click()
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2', 'l3-cu-2', 'l3-oh-3', 'l3-oh-4']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡完成')
  await expect(page.getByText('2 / 2')).toBeVisible()
})

test('undo restores the selection and automatic reaction together', async ({ page }) => {
  await page.goto('/?level=3')
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2']) await page.getByTestId(name).click()
  await page.getByRole('button', { name: '撤回' }).click()
  await expect(page.getByText('0 / 2')).toBeVisible()
  await expect(page.getByTestId('l3-oh-2')).toBeEnabled()
})

test('level 1 completes with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('/?level=1')
  for (const name of ['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡完成')
  await context.close()
})
```

- [ ] **Step 2: Run both browser projects and commit**

Run: `npm run test:e2e && git add tests/e2e && git commit -m "test: cover mobile vertical slice flows"`

Expected: six tests pass: three scenarios in mobile Chromium and three in mobile WebKit.

### Task 5: Record the release gate without overstating review

**Files:**
- Create: `docs/verification/vertical-slice-report.md`

- [ ] **Step 1: Run the complete fresh gate**

Run: `npm run check && npm run test:e2e`

Expected: zero command failures; record the exact unit and E2E pass counts from this run.

- [ ] **Step 2: Add the factual verification record**

Use this exact structure and replace only the bracketed run values with observed output:

```md
# Vertical Slice Verification

- Date: 2026-08-27
- Commit: `[git rev-parse --short HEAD]`
- `npm run check`: PASS — `[unit count]` unit tests; 37 species; 17 reactions; 3 levels; production build PASS.
- `npm run test:e2e`: PASS — `[E2E count]` tests across mobile Chromium and mobile WebKit.
- Solver: PASS — level 1–3 node counts `[observed counts]` under 100,000 nodes and 2,000 ms each.
- Chemistry review: PENDING — automated conservation is not teacher approval.
- Student observation test: PENDING — no participant result is claimed.
- Real-device Safari/Chrome QA: PENDING — Playwright emulation is not a physical-device result.
```

- [ ] **Step 3: Commit the verification record**

Run: `git add docs/verification/vertical-slice-report.md && git commit -m "docs: record vertical slice verification"`
