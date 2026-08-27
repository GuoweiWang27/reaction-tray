# Reaction Tray 20-Level MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the verified three-level vertical slice into a locally release-grade, solver-proven 20-level chemistry puzzle MVP with conditions, ordered chains, chapters, hints, scoring, safety feedback, and unified CHEMAI101 UI/UX.

**Architecture:** Keep chemistry definitions and levels as content SSOT, keep every state transition in the pure TypeScript engine, and make the solver search production commands rather than duplicate rules. Split levels by chapter, add small progress/goal view helpers around `GameScreen`, and gate each batch with executable content, solver, unit, and browser evidence.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, pure CSS, Web Audio, localStorage.

---

## 0. Execution contract

Authoritative design: `docs/superpowers/specs/2026-08-27-reaction-tray-20-level-design.md` at baseline commit `cf63bc3`.

The worker must execute one numbered task, run its gates, commit, report the hash, and stop for main-task review. The next task starts only after the main task explicitly approves it. Never modify chemistry review metadata to `approved`, create remote/deploy state, add a backend, or broaden scope beyond the design.

Before every task:

```bash
cd /Users/yimu/Documents/Guowei/Engineering/projects/reaction-tray
git status --short --branch
git log -1 --oneline
```

Expected: branch `main`, clean worktree, HEAD equal to the last approved batch.

## 1. Locked file structure

```text
src/domain/types.ts                         # commands shared by content, engine and solver
src/game/engine.ts                         # only domain state transition implementation
src/game/solver.ts                         # bounded BFS over production commands
src/game/goalProgress.ts                   # read-only goal/sequence presentation helpers
src/game/progress.ts                       # stars and versioned local progress
src/game/GameScreen.tsx                    # orchestration and game interaction
src/game/components/ChapterNavigator.tsx   # four chapter tabs and five level buttons
src/game/components/GoalPanel.tsx           # produce/reaction/sequence target presentation
src/game/components/OutcomePanel.tsx        # result, best, stars and copy
src/game/game.css                           # CHEMAI101 responsive visual system
src/content/levels/helpers.ts               # deterministic layered board and level helpers
src/content/levels/chapter-1.ts             # L1-L5
src/content/levels/chapter-2.ts             # L6-L10
src/content/levels/chapter-3.ts             # L11-L15
src/content/levels/chapter-4.ts             # L16-L20
src/content/levels/index.ts                 # levels and chapters canonical exports
src/content/validateContent.ts              # structural chemistry/level validation
src/content/validateExecutableLevels.ts     # standard-step engine replay
tests/unit/engine.test.ts
tests/unit/solver.test.ts
tests/unit/content.test.ts
tests/unit/progress.test.ts
tests/unit/goal-progress.test.ts
tests/e2e/vertical-slice.spec.ts
tests/e2e/conditions-and-chains.spec.ts
tests/e2e/navigation-and-progress.spec.ts
tests/e2e/all-levels.spec.ts
```

Do not create a second engine, solver-only reaction matcher, or UI-owned chemistry state.

---

### Task 1: Foundation — commands, sequence goals, condition moves, executable validation, solver

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/game/engine.ts`
- Modify: `src/game/solver.ts`
- Modify: `src/content/levels/vertical-slice.ts`
- Modify: `src/content/validateContent.ts`
- Create: `src/content/validateExecutableLevels.ts`
- Modify: `scripts/validate-content.ts`
- Modify: `tests/unit/engine.test.ts`
- Modify: `tests/unit/solver.test.ts`
- Modify: `tests/unit/content.test.ts`

- [ ] **Step 1: Add failing domain tests for condition counting, no-op, hint use, sequence order, persistent catalyst and atomic undo**

Add focused tests using small inline `LevelDefinition` fixtures. The assertions must include:

```ts
expect(activated.moveCount).toBe(1)
expect(repeated).toEqual(activated)
expect(afterHint.hintUsed).toBe(1)
expect(afterHint.history).toEqual(beforeHint.history)
expect(afterUndo.hintUsed).toBe(1)
expect(correctSequence.status).toBe('won')
expect(wrongSequence.status).not.toBe('won')
expect(afterFirstCatalyzedReaction.activeConditionIds).toContain('mno2')
expect(afterOneShotReaction.activeConditionIds).not.toContain('ignite')
```

Use an L19-shaped fixture to assert reaction history exactly equals:

```ts
[
  'reaction.iron-hcl',
  'reaction.iron-hcl',
  'reaction.hydrogen-combustion',
]
```

- [ ] **Step 2: Run the domain tests and verify RED**

Run:

```bash
npm test -- tests/unit/engine.test.ts
```

Expected: failures for missing `hintUsed`, `reactionHistory`, `use-hint`, condition move counting, and sequence completion.

- [ ] **Step 3: Define the shared command and standard-solution types**

Add to `src/domain/types.ts`:

```ts
export type ProgressCommand =
  | { type: 'select-tile'; tileId: string }
  | { type: 'activate-condition'; conditionId: ConditionId }

export type GameCommand = ProgressCommand | { type: 'undo' } | { type: 'use-hint' }
export type LevelSolutionStep = ProgressCommand
```

Replace `standardSolutionTileIds: string[]` with:

```ts
standardSolutionSteps: LevelSolutionStep[]
```

Migrate L1-L3 to `{ type: 'select-tile', tileId }` entries without changing order.

- [ ] **Step 4: Implement the engine state and goal contracts**

Move `GameCommand` import to `src/domain/types.ts`. Add these fields to `GameSnapshot` and initialize them in `createGame`:

```ts
reactionHistory: string[]
hintUsed: number
```

Implement strict sequence evaluation with a pure helper:

```ts
export function expandedSequence(goal: Extract<LevelGoal, { kind: 'sequence' }>): string[] {
  return goal.steps.flatMap((step) => Array.from({ length: step.count }, () => step.reactionId))
}

function sequenceMet(history: string[], goal: Extract<LevelGoal, { kind: 'sequence' }>): boolean {
  const expected = expandedSequence(goal)
  return expected.length === history.length && expected.every((reactionId, index) => history[index] === reactionId)
}
```

Append every settled reaction ID before checking goals. A state-changing condition activation increments `moveCount` and enters history; activating the already active identical condition returns the original state with no history frame. `use-hint` increments `hintUsed` only while playing/awaiting and under the level limit, adds no history, no move, and no effect. Undo must preserve `current.hintUsed` while restoring chemistry and incrementing `undoUsed`.

- [ ] **Step 5: Add failing solver tests for commands and arbitrary current state**

Update solver expectations from tile strings to `ProgressCommand[]`. Add:

```ts
expect(result.status).toBe('solved')
if (result.status !== 'solved') throw new Error('expected solved')
expect(result.path).toContainEqual({ type: 'activate-condition', conditionId: 'ignite' })
expect(result.safeFirstSteps.length).toBeGreaterThan(0)
```

Build a state after one safe L3 selection and call the solver with that state; assert the path solves without replaying the removed tile. Add explicit fixtures for `timeout`, `node-limit`, and `unsolved` results.

- [ ] **Step 6: Run solver tests and verify RED**

Run:

```bash
npm test -- tests/unit/solver.test.ts
```

Expected: type/failing assertions because the solver only accepts fresh state and returns tile strings.

- [ ] **Step 7: Implement bounded BFS over production progress commands**

Expose:

```ts
export type SolveResult =
  | { status: 'solved'; path: ProgressCommand[]; safeFirstSteps: ProgressCommand[]; visitedNodes: number }
  | { status: 'node-limit' | 'timeout' | 'unsolved'; path: []; safeFirstSteps: []; visitedNodes: number }

export function solveLevel(
  context: EngineContext,
  limits: { maxNodes: number; timeoutMs: number },
  initialState = createGame(context.level),
): SolveResult
```

Generate candidates as selectable tiles plus every available condition that would change the current state. Apply all candidates through `applyCommand`; never call `eligible` or duplicate reaction logic. Hash remaining IDs, sorted tray species, produced, performed, `reactionHistory`, active conditions and status. BFS first discovery is the shortest command path; collect distinct first commands among solved shortest paths as `safeFirstSteps`.

- [ ] **Step 8: Add structural and executable standard-solution validation**

`validateLevels` must verify step tile IDs, condition availability, contiguous level order, unique level IDs/orders, and exactly five levels per completed chapter once those chapters exist. Create:

```ts
export function validateExecutableLevels(
  levels: LevelDefinition[],
  reactions: ReactionDefinition[],
  conditions: ConditionDefinition[],
): string[]
```

For each level, start with `createGame`, apply every `standardSolutionSteps` command, reject any step that returns the identical state, and require final `won`. Update the CLI to combine structural and executable errors.

- [ ] **Step 9: Run the full foundation gate**

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run validate:content
npm run build
git diff --check
```

Expected: all pass; content output remains `37 species, 17 reactions, 3 levels`.

- [ ] **Step 10: Commit Foundation and stop**

```bash
git add src/domain/types.ts src/game/engine.ts src/game/solver.ts src/content/levels/vertical-slice.ts src/content/validateContent.ts src/content/validateExecutableLevels.ts scripts/validate-content.ts tests/unit/engine.test.ts tests/unit/solver.test.ts tests/unit/content.test.ts
git commit -m "feat: support condition and sequence solving"
git status --short --branch
```

Expected: clean worktree. Report hash, exact test counts, solver fixture evidence, and stop.

---

### Task 2: Chapter 1–2 — migrate content structure and add L4–L10

**Files:**
- Create: `src/content/levels/helpers.ts`
- Create: `src/content/levels/chapter-1.ts`
- Create: `src/content/levels/chapter-2.ts`
- Create: `src/content/levels/index.ts`
- Delete: `src/content/levels/vertical-slice.ts`
- Modify: `src/game/GameScreen.tsx`
- Modify: `scripts/validate-content.ts`
- Modify: `tests/unit/content.test.ts`
- Modify: `tests/unit/engine.test.ts`
- Modify: `tests/unit/solver.test.ts`
- Modify: `tests/e2e/vertical-slice.spec.ts`

- [ ] **Step 1: Write failing 10-level content and solver tests**

Assert:

```ts
expect(levels).toHaveLength(10)
expect(levels.map((level) => level.order)).toEqual([1,2,3,4,5,6,7,8,9,10])
expect(validateAllContent(species, reactions, conditions, levels)).toEqual([])
expect(validateExecutableLevels(levels, reactions, conditions)).toEqual([])
```

For every level, require `solveLevel(..., { maxNodes: 200_000, timeoutMs: 3_000 }).status === 'solved'`. For L9/L10 require two ignite commands in the stored standard solution and solver path.

- [ ] **Step 2: Run content/solver tests and verify RED**

```bash
npm test -- tests/unit/content.test.ts tests/unit/solver.test.ts
```

Expected: missing `levels` export and length mismatch.

- [ ] **Step 3: Implement deterministic level helpers**

Create a helper that returns top-row primary cards first and lower-row decoys/overflow cards second:

```ts
export const tile = (
  tileId: string,
  speciesId: string,
  x: number,
  y: number,
  z: number,
  blockedByTileIds: string[] = [],
): BoardTileDefinition => ({ tileId, speciesId, x, y, z, width: 2, height: 1, blockedByTileIds })

export function createLayeredBoard(prefix: string, primarySpeciesIds: string[], decoySpeciesIds: string[]) {
  const upper = primarySpeciesIds.slice(0, 6).map((speciesId, index) =>
    tile(`${prefix}-p-${String(index + 1).padStart(2, '0')}`, speciesId, index * 2, 0, 1))
  const lowerSpecies = [...primarySpeciesIds.slice(6), ...decoySpeciesIds]
  const lower = lowerSpecies.map((speciesId, index) =>
    tile(
      `${prefix}-${index < primarySpeciesIds.length - 6 ? 'p' : 'd'}-${String(index + 7).padStart(2, '0')}`,
      speciesId,
      1 + index * 2,
      1,
      0,
      [upper[index]?.tileId, upper[index + 1]?.tileId].filter((id): id is string => Boolean(id)),
    ))
  return { board: [...upper, ...lower], primaryTileIds: [...upper, ...lower.slice(0, Math.max(0, primarySpeciesIds.length - 6))].map((item) => item.tileId) }
}
```

Also export `selectSteps(tileIds)`, `pendingReview`, and a `level` constructor that always sets undo 1, hint 2, shuffle 0 and chapter review pending.

- [ ] **Step 4: Migrate L1–L3 verbatim into chapter 1**

Keep all existing IDs, coordinates, blockers, objectives, capacities, goals and solution order. Only change imports and `standardSolutionSteps` representation. Add chapters metadata:

```ts
export const chapters = [
  { id: 1, titleZh: '比例与沉淀', levelOrders: [1,2,3,4,5] },
  { id: 2, titleZh: '气体与置换', levelOrders: [6,7,8,9,10] },
  { id: 3, titleZh: '条件控制', levelOrders: [11,12,13,14,15] },
  { id: 4, titleZh: '链式综合', levelOrders: [16,17,18,19,20] },
]
```

- [ ] **Step 5: Add exact L4–L8 content**

Use these primary/decoy arrays in order:

| Level | Primary species IDs | Decoys | Goal | Capacity | 3-star moves |
|---|---|---|---|---:|---:|
| L4 | `carbon-dioxide, calcium-hydroxide, carbon-dioxide, calcium-hydroxide` | `sodium-chloride, water` | 2 calcium-carbonate | 7 | 4 |
| L5 | `calcium-carbonate, hydrochloric-acid, hydrochloric-acid` ×2 | `sodium-chloride, water` | 2 carbon-dioxide | 7 | 6 |
| L6 | `sodium-carbonate, hydrochloric-acid, hydrochloric-acid` ×2 | `calcium-chloride, water` | 2 carbon-dioxide | 7 | 6 |
| L7 | `iron, hydrochloric-acid, hydrochloric-acid` ×2 | `sodium-chloride, water` | 2 hydrogen | 7 | 6 |
| L8 | `zinc, copper-ii-sulfate` ×3 | `sodium-chloride, water` | 3 copper | 7 | 6 |

Allowed reactions are respectively limewater-carbon-dioxide, calcium-carbonate-hcl, sodium-carbonate-hcl, iron-hcl, and zinc-copper-sulfate, each priority 10. Standard steps select all primary IDs in order.

- [ ] **Step 6: Add exact L9–L10 condition content**

L9 primary array:

```ts
['species.hydrogen','species.hydrogen','species.oxygen','species.hydrogen','species.hydrogen','species.oxygen']
```

L10 primary array:

```ts
['species.magnesium','species.magnesium','species.oxygen','species.magnesium','species.magnesium','species.oxygen']
```

Both use capacity 3, `availableConditionIds: ['ignite']`, goal counts 4, and these standard step indexes:

```ts
[p0, p1, p2, ignite, p3, p4, p5, ignite]
```

L9 decoys are water/NaCl; L10 decoys are magnesium-oxide/water. Three-star moves are 8.

- [ ] **Step 7: Switch every consumer to canonical `levels`**

Replace all `verticalSliceLevels` imports in production, scripts and tests. `GameScreen` may temporarily render ten flat buttons; do not redesign navigation in this content batch. Preserve existing test IDs and all L1–L3 E2E behavior.

- [ ] **Step 8: Run the Chapter 1–2 gate**

```bash
npm run check
npm run test:e2e
git diff --check
```

Expected: content output `37 species, 17 reactions, 10 levels`; all 10 solver cases pass; existing mobile E2E remains green.

- [ ] **Step 9: Commit Chapter 1–2 and stop**

```bash
git add src/content/levels src/game/GameScreen.tsx scripts/validate-content.ts tests
git commit -m "feat: add reaction tray chapters one and two"
```

Report hash, 10/10 solver results with visitedNodes, exact tests, and stop.

---

### Task 3: Chapter 3 — persistent catalyst, light, heat, molecular expression

**Files:**
- Create: `src/content/levels/chapter-3.ts`
- Modify: `src/content/levels/index.ts`
- Modify: `tests/unit/content.test.ts`
- Modify: `tests/unit/engine.test.ts`
- Modify: `tests/unit/solver.test.ts`

- [ ] **Step 1: Write failing 15-level and condition-lifecycle tests**

Require 15 contiguous orders, executable standard steps, 15 solved levels, and exact condition counts:

```ts
const conditionCount = (level: LevelDefinition, conditionId: ConditionId) =>
  level.standardSolutionSteps.filter((step) => step.type === 'activate-condition' && step.conditionId === conditionId).length

expect(conditionCount(levels[10], 'mno2')).toBe(1)
expect(conditionCount(levels[11], 'light')).toBe(2)
expect(conditionCount(levels[12], 'heat')).toBe(2)
```

Replay L11 and assert MnO₂ remains active after both reactions. Replay L12 and L13 and assert the one-shot condition is absent after each reaction and must be activated twice.

- [ ] **Step 2: Run tests and verify RED**

```bash
npm test -- tests/unit/content.test.ts tests/unit/engine.test.ts tests/unit/solver.test.ts
```

Expected: length 10 instead of 15.

- [ ] **Step 3: Add exact L11–L13 content**

| Level | Primary species | Decoys | Condition steps | Goal | Capacity | Moves |
|---|---|---|---|---|---:|---:|
| L11 | H₂O₂ ×4 | water, oxygen | `p0,p1,mno2,p2,p3` | 2 oxygen | 2 | 5 |
| L12 | AgCl ×4 | silver, NaCl | `p0,p1,light,p2,p3,light` | 4 silver | 2 | 6 |
| L13 | NaHCO₃ ×4 | sodium-carbonate, water | `p0,p1,heat,p2,p3,heat` | 2 carbon-dioxide | 2 | 6 |

Use only the corresponding decomposition reaction in each level. Store no intermediate products.

- [ ] **Step 4: Add exact L14–L15 content**

L14 primary is `[CuO,HCl,HCl] ×2`, decoys NaCl/water, capacity 7, goal 2 copper-ii-chloride, reaction copper-oxide-hcl, moves 6.

L15 primary is `[CuSO4,NaOH,NaOH] ×2`, decoys water/NaCl, capacity 7, goal 2 copper-ii-hydroxide, reaction copper-sulfate-sodium-hydroxide, moves 6. Its objective must explicitly say the molecular equation and `Cu²⁺ + 2OH⁻` describe the same precipitate at different representation levels.

- [ ] **Step 5: Run the Chapter 3 gate**

```bash
npm run check
npm run test:e2e
git diff --check
```

Expected: `37 species, 17 reactions, 15 levels`; 15/15 solver cases pass.

- [ ] **Step 6: Commit Chapter 3 and stop**

```bash
git add src/content/levels/chapter-3.ts src/content/levels/index.ts tests/unit
git commit -m "feat: add reaction tray condition chapter"
```

Report hash, lifecycle assertions, solver results, and stop.

---

### Task 4: Chapter 4 — high ratio and three ordered chains

**Files:**
- Create: `src/content/levels/chapter-4.ts`
- Modify: `src/content/levels/index.ts`
- Modify: `tests/unit/content.test.ts`
- Modify: `tests/unit/engine.test.ts`
- Modify: `tests/unit/solver.test.ts`

- [ ] **Step 1: Write failing 20-level and chain tests**

Require exactly 20 levels, 5 per chapter, 20 solved fresh states. Add engine replay assertions:

```ts
const reactionIds = (effects: GameEffect[]) => effects.flatMap((effect) => effect.type === 'reaction' ? [effect.reactionId] : [])
const replayStandard = (level: LevelDefinition) => {
  const context = { level, reactions, conditions }
  let state = createGame(level)
  const effects: GameEffect[] = []
  for (const step of level.standardSolutionSteps) {
    const result = applyCommand(state, step, context)
    state = result.state
    effects.push(...result.effects)
  }
  return { state, effects }
}

const l18 = replayStandard(levels[17])
const l19 = replayStandard(levels[18])
const l20 = replayStandard(levels[19])

expect(reactionIds(l18.effects)).toEqual([
  'reaction.limewater-carbon-dioxide',
  'reaction.calcium-carbonate-hcl',
])
expect(l19.state.reactionHistory).toEqual([
  'reaction.iron-hcl',
  'reaction.iron-hcl',
  'reaction.hydrogen-combustion',
])
expect(reactionIds(l20.effects)).toEqual([
  'reaction.copper-sulfate-sodium-hydroxide',
  'reaction.barium-sulfate-precipitation',
])
```

Also assert L19 capacity is 4, ignite occurs immediately before O₂ in the standard steps, and changing the reaction order cannot win.

- [ ] **Step 2: Run tests and verify RED**

```bash
npm test -- tests/unit/content.test.ts tests/unit/engine.test.ts tests/unit/solver.test.ts
```

Expected: length 15 and missing L18–L20 fixtures.

- [ ] **Step 3: Add L16 and L17**

L16 primary: `[BaCl2,Na2SO4] ×3`; decoys NaCl/water; capacity 7; goal 3 barium-sulfate; moves 6.

L17 primary:

```ts
['species.iron-iii-oxide','species.carbon-monoxide','species.carbon-monoxide','species.carbon-monoxide',
 'species.iron-iii-oxide','species.carbon-monoxide','species.carbon-monoxide','species.carbon-monoxide']
```

Decoys iron/carbon-dioxide; capacity 4; heat after p3 and p7; goal 4 iron; moves 10.

- [ ] **Step 4: Add the exact three chain levels**

L18:

```ts
primary = ['species.hydrochloric-acid','species.hydrochloric-acid','species.carbon-dioxide','species.calcium-hydroxide']
allowed = [limewater priority 20, calcium-carbonate-hcl priority 10]
intermediate = ['species.calcium-carbonate']
sequence = [limewater ×1, calcium-carbonate-hcl ×1]
capacity = 4
```

L19:

```ts
primary = ['species.iron','species.hydrochloric-acid','species.hydrochloric-acid','species.iron','species.hydrochloric-acid','species.hydrochloric-acid','species.oxygen']
allowed = [iron-hcl priority 20, hydrogen-combustion priority 10]
intermediate = ['species.hydrogen']
sequence = [iron-hcl ×2, hydrogen-combustion ×1]
steps = p0,p1,p2,p3,p4,p5,ignite,p6
capacity = 4
```

L20:

```ts
primary = ['species.barium-chloride','species.copper-ii-sulfate','species.sodium-hydroxide','species.sodium-hydroxide']
allowed = [copper-sulfate-sodium-hydroxide priority 20, barium-sulfate-precipitation priority 10]
intermediate = ['species.sodium-sulfate']
sequence = [copper-sulfate-sodium-hydroxide ×1, barium-sulfate-precipitation ×1]
capacity = 4
```

All three use NaCl/water decoys, pending chemistry review, and 3-star moves 4/8/4.

- [ ] **Step 5: Run the complete content gate**

```bash
npm run check
npm run test:e2e
git diff --check
```

Expected: `37 species, 17 reactions, 20 levels`; all 20 solver cases solved under 200,000 nodes / 3,000ms; L18/L20 dual effects and L19 ordered history pass.

- [ ] **Step 6: Commit Chapter 4 and stop**

```bash
git add src/content/levels/chapter-4.ts src/content/levels/index.ts tests/unit
git commit -m "feat: complete 20 reaction tray levels"
```

Report hash, 20-level solver table, chain effect evidence, and stop.

---

### Task 5: Product UI — chapters, goal types, hints, scoring and best records

**Files:**
- Create: `src/game/goalProgress.ts`
- Create: `src/game/progress.ts`
- Create: `src/game/components/ChapterNavigator.tsx`
- Create: `src/game/components/GoalPanel.tsx`
- Create: `src/game/components/OutcomePanel.tsx`
- Modify: `src/game/GameScreen.tsx`
- Modify: `src/game/game.css`
- Create: `tests/unit/goal-progress.test.ts`
- Create: `tests/unit/progress.test.ts`
- Create: `tests/e2e/navigation-and-progress.spec.ts`

- [ ] **Step 1: Write failing goal/progress unit tests**

Goal tests must cover produce, perform-reaction and sequence current-step presentation. Progress tests must cover:

```ts
expect(score({ status: 'won', moveCount: 8, undoUsed: 0, hintUsed: 0 }, rules)).toBe(3)
expect(score({ status: 'won', moveCount: 9, undoUsed: 0, hintUsed: 0 }, rules)).toBe(2)
expect(score({ status: 'won', moveCount: 8, undoUsed: 1, hintUsed: 1 }, rules)).toBe(1)
expect(readProgress('{bad json')).toEqual(emptyProgress())
expect(mergeResult(previousBest, slowerRun)).toEqual(previousBest)
```

- [ ] **Step 2: Run unit tests and verify RED**

```bash
npm test -- tests/unit/goal-progress.test.ts tests/unit/progress.test.ts
```

Expected: missing modules.

- [ ] **Step 3: Implement read-only goal presentation helpers**

Expose a `GoalView` union with `kind`, label, current, target, progressPercent, currentReactionId and ordered sequence rows. It may read `LevelDefinition`, `GameState`, reactions and species but must never mutate them. For sequence goals, compare `reactionHistory` with the expanded target and mark each row `complete`, `current`, or `pending`.

- [ ] **Step 4: Implement versioned local progress and scoring**

Use:

```ts
type StoredProgressV2 = {
  version: 2
  levels: Record<string, { cleared: true; bestMoves: number; bestStars: 1 | 2 | 3 }>
}
const progressKey = 'reaction-tray.progress.v2'
```

Migrate the old `reaction-tray.cleared-levels.v1` array once, preserving cleared state with best values omitted until the next win. All storage reads/writes catch exceptions.

- [ ] **Step 5: Write failing navigation, hint and result E2E**

Test four chapter tabs, five visible level buttons, URL `?level=20`, invalid URL fallback, a tile hint, a condition hint, hint count, stars, best-move persistence after reload, corrupt storage fallback, and exact share text with stars.

- [ ] **Step 6: Implement the three focused components**

`ChapterNavigator` receives chapters, current level, progress and callbacks; it renders four tabs and five level buttons with stable accessible labels.

`GoalPanel` receives `GoalView`, target formula, target-reactant callback and safety content; sequence rows use list semantics and visible complete/current labels.

`OutcomePanel` receives level order, moves, stars, bestMoves, status, restart and copy callbacks; lost title is exactly `本轮实验失败`.

- [ ] **Step 7: Integrate chapters and hints in GameScreen**

Replace the flat level selector. Keep all existing dynamic tile test IDs and exactly one `reaction-effect`. Add stable IDs:

```text
chapter-tab-1..4
hint-button
condition-ignite / condition-heat / condition-light / condition-mno2
share-result
```

On hint click, call `solveLevel(context, limits, state)`. If solved with a next command, send `use-hint`, store the command in UI hint state, and highlight the tile or condition. If not solved, update the existing role=status without consuming a hint.

- [ ] **Step 8: Add responsive CHEMAI101 styles**

Four chapter tabs stay one compact row; the current chapter level grid uses `repeat(auto-fit, minmax(132px, 1fr))`. Sequence steps, stars, best moves and hint focus use existing crimson/sand tokens. All new font sizes are at least 10px. At 360px there is no horizontal scrolling.

- [ ] **Step 9: Run the Product UI gate**

```bash
npm run check
npm run test:e2e
git diff --check
```

Also run one-time Playwright probes at 360×844, 375×667 and 390×844 for chapter 1 and chapter 4. Expected: no overflow, console/page errors 0, keyboard Tab/arrow/Enter/U/R remain usable.

- [ ] **Step 10: Commit Product UI and stop**

```bash
git add src/game tests/unit tests/e2e/navigation-and-progress.spec.ts
git commit -m "feat: add 20-level progression interface"
```

Report hash, screenshots/probe evidence, tests, and stop.

---

### Task 6: Unified polish — six cues, safety, condition/chain feedback, all-level E2E

**Files:**
- Modify: `src/game/GameScreen.tsx`
- Modify: `src/game/game.css`
- Modify: `src/game/components/GoalPanel.tsx`
- Modify: `src/game/components/OutcomePanel.tsx`
- Modify: `src/game/feedback.ts`
- Create: `tests/e2e/conditions-and-chains.spec.ts`
- Create: `tests/e2e/all-levels.spec.ts`
- Modify: `tests/e2e/vertical-slice.spec.ts`

- [ ] **Step 1: Write failing cue, safety, chain and all-level E2E**

Add representative flows in Chromium and WebKit:

- L9 reaches `awaiting-condition`, activates ignite, and completes two reactions;
- L11 activates MnO₂ once and completes twice while it remains active;
- L12 light cue and L17 heat/metal cue render safety text;
- L19 completes condition plus chain;
- L20 final tile yields one `reaction-effect` container with two new history entries;
- all 20 stored standard solutions complete in Chromium; representative L3/L9/L11/L19/L20 complete in WebKit.

The all-level test imports `levels`, converts each standard step to a tile click or `condition-${id}` click, and asserts `data-game-status="won"` and no console errors.

- [ ] **Step 2: Run new E2E and verify RED**

```bash
npx playwright test tests/e2e/conditions-and-chains.spec.ts tests/e2e/all-levels.spec.ts
```

Expected: missing cue/safety semantics before implementation.

- [ ] **Step 3: Expand observable cue mapping without breaking data contracts**

Map reaction cues exactly:

```ts
water -> product
precipitate -> precipitate
gas -> gas
light -> light
metal -> metal
color-change -> color-change
```

Keep `data-testid="reaction-effect"` unique and keep `data-cue-kind`, `data-effect-count`, `data-effect-total`. For a single command with multiple reactions, `data-effect-count` is the number of reactions in that command and log order is chronological.

- [ ] **Step 4: Add derived safety and teaching feedback**

Derive unique safety messages from allowed reactions and board species. Always append `本游戏只呈现反应关系，不提供实验操作步骤。` when safety content exists. Do not add operational details. L15 feedback must connect molecular and net-ionic representations. L9/L10/L12/L16/L17 safety strips are mandatory.

- [ ] **Step 5: Add static-safe cue visuals and semantic audio patterns**

Gas uses rising outlined bubbles, light uses a short warm flash, metal uses a settling plate, color-change uses a warm-to-cool wash. Under `prefers-reduced-motion`, every new animation is `none`; labels/icons remain. Extend Web Audio profiles so gas/light/metal/color-change are distinguishable but still require SOUND ON.

- [ ] **Step 6: Unify copy and result behavior**

Replace `反应槽已封存` with `本轮实验失败`. Keep specific full-tray/no-card reasons in role=status. Copy result format is:

```text
REACTION TRAY L{order} · {moves} MOVES · {stars} · COMPLETE
```

Clipboard success and rejection must both update the live status truthfully.

- [ ] **Step 7: Run complete automated and visual gates**

```bash
npm run check
npm run test:e2e
git diff --check
```

Run a full-page screenshot/probe matrix for L1, L9, L11, L17, L19, L20 at 390×844 and L20 at 360×844/375×667. Verify min computed font 10px, document width equals viewport, scroll reaches bottom, reduced animations are none, console/page errors 0.

- [ ] **Step 8: Commit unified polish and stop**

```bash
git add src/game tests/e2e
git commit -m "feat: unify reaction tray teaching feedback"
```

Report hash, exact test totals, 20/20 browser completion, cue/safety matrix, and stop.

---

### Task 7: Release audit — documentation, production build, external gates

**Files:**
- Modify: `README.md`
- Modify: `docs/specs/reaction-tray-mvp-spec-v1.1.md`
- Create: `docs/verification/20-level-mvp-report.md`

- [ ] **Step 1: Update authority and developer entry documentation**

README must say 20-level code MVP rather than “vertical slice pending”, list four chapters, commands, local-only status, and exact authority links. Add a V1.1 note that its three-level range is historical and superseded for content scope by the approved 20-level design; do not rewrite the historical chemistry decisions.

- [ ] **Step 2: Generate the verification report from fresh evidence**

The report must contain:

- verified HEAD hash and date;
- typecheck/lint/unit/content/build counts;
- 37 species / 17 reactions / 20 levels;
- table of 20 solver status, path length, visitedNodes;
- Chromium/WebKit totals;
- mobile/console/reduced-motion evidence;
- cue/safety/chain coverage;
- exact modified-file boundary and clean-tree proof;
- external gates all labeled `PENDING`.

- [ ] **Step 3: Run the final fresh release gate**

```bash
npm ci
npm run check
npm run test:e2e
npm test -- tests/unit/solver.test.ts
git diff --check
git status --short --branch
```

Expected: zero test failures, zero lint warnings/errors, 20/20 solver pass, production build generated. `npm ci` may update no tracked files.

- [ ] **Step 4: Run the final one-time acceptance probe**

Use a clean browser context. Traverse four chapters, complete all 20 stored solutions, corrupt progress storage and reload, exercise tile/condition hint, SOUND OFF/ON, clipboard resolve/reject, keyboard-only L1, reduced-motion L10/L12/L20, and 360/375/390 viewport checks. Record raw counts in the report; do not store temporary probe scripts or screenshots in the repository.

- [ ] **Step 5: Commit release evidence and stop**

```bash
git add README.md docs/specs/reaction-tray-mvp-spec-v1.1.md docs/verification/20-level-mvp-report.md
git commit -m "docs: verify 20-level reaction tray MVP"
git status --short --branch
```

Expected: clean worktree. Do not push or deploy. Report final hash and all external pending gates to the main task.

---

## Main-task review checklist after every batch

The main task independently checks:

1. commit touches only the batch files and preserves unrelated work;
2. tests were run fresh, not inferred from the worker report;
3. content uses existing 37 species and 17 reactions without changing chemistry silently;
4. standard steps replay through production engine and solver;
5. conditions and chains match the approved table;
6. existing dynamic tile test IDs and the single reaction-effect contract remain;
7. worktree is clean before approving the next batch.

Final GOAL completion additionally requires current-state evidence for every section of the authoritative design, not merely green generic tests.

## Spec coverage map

| Design section | Implemented by |
|---|---|
| §5 domain commands, moves, sequence, intermediates and condition lifecycle | Task 1 |
| §6 current-state solver and safe hints | Task 1, Task 5 |
| §7 stars, best records and share format | Task 5, Task 6 |
| §8 exact L1–L20 content and frozen chain order | Tasks 2–4 |
| §9 chapter file boundaries | Tasks 2–4 |
| §10 chapters, goals, feedback, six cues and safety | Tasks 5–6 |
| §11 executable, solver, E2E, mobile and reduced-motion gates | Tasks 1–7 |
| §12 batch commits and main review | Every task |
| §13 external review and deployment boundary | Task 7 |
