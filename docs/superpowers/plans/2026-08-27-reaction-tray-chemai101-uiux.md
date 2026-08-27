# Reaction Tray CHEMAI101 UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. The sole product authority is `docs/specs/uiux-ssot-v1.md`; this document only fixes execution order and verification commands.

**Goal:** Migrate the three-level reaction-tray vertical slice to the CHEMAI101 warm-paper visual language and deliver every P0–P3 interaction in SSOT §7 without changing chemistry, engine, solver, content, tests, dependencies, or build configuration.

**Architecture:** Keep the pure game engine and content registries untouched. `GameScreen.tsx` may derive presentation state from existing engine state/effects and imported read-only level/reaction definitions; `game.css` owns layout, tokens, motion and responsive behavior; `index.html` owns the three CHEMAI101 font links. UI-only histories, hints, localStorage, audio and clipboard state never enter domain snapshots.

**Tech Stack:** React 19, TypeScript 6, CSS, Vite 8, Vitest 4, Playwright 1.62, Web Audio API, Clipboard API.

---

## File map and immutable boundaries

Implementation may modify only:

- `src/game/GameScreen.tsx` — UI-derived state, accessible interaction and markup.
- `src/game/game.css` — SSOT tokens, responsive layout and reduced-motion rules.
- `index.html` — CHEMAI101 Google Fonts preconnect and stylesheet links.

Never modify `engine.ts`, `solver.ts`, `src/content/*`, tests, config, dependencies or public assets. Existing dynamic tile test IDs and the single `reaction-effect` contract are immutable.

### Task 0: Prove and commit the implementation baseline

**Files:** none

- [ ] Run `git status --short --branch` and confirm the only pre-implementation changes are the SSOT and this plan.
- [ ] Run `npm run test`.
  - Expected: 4 Vitest files, 16/16 passing.
- [ ] Run `npx playwright test`.
  - Expected: 12/12 passing across mobile Chromium and mobile WebKit.
- [ ] Commit the SSOT and plan before P0 begins:

```bash
git add docs/specs/uiux-ssot-v1.md docs/superpowers/plans/2026-08-27-reaction-tray-chemai101-uiux.md
git commit -m "docs: define CHEMAI101 UIUX SSOT"
```

### Task 1 / P0: Migrate the visual skin

**Files:**

- Modify: `src/game/game.css`
- Modify: `src/game/GameScreen.tsx`
- Modify: `index.html`

- [ ] Replace the `.game-shell` variable block exactly with SSOT §2; eliminate all uses of the old graphite/ivory/blue/copper variables.
- [ ] Add the same preconnect and Google Fonts stylesheet used by `../chemai101/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet" />
```

- [ ] Apply SSOT §3 and §4.1–4.5 to every selector. Use `var(--text-micro)` for all former 0.38–0.59rem labels; no remaining rendered text may compute below 10px. Use only warm soft shadows, `--radius-panel`, `--radius-card`, `--radius-chip`.
- [ ] Add the target progress bar without adding domain state. The fill derives from the already computed `produced` and `goalCount`:

```tsx
const progress = goalCount > 0 ? Math.min(100, (produced / goalCount) * 100) : 0

<span className="target-progress" aria-hidden="true">
  <span style={{ '--target-progress': `${progress}%` } as CSSProperties} />
</span>
```

- [ ] Make the level selector `repeat(auto-fit, minmax(96px, 1fr))`, set horizontal clipping only, and preserve vertical page scrolling at 375×667.
- [ ] Run `npm run test && npx playwright test`; stop on any failure.
- [ ] Run `git diff --check`, confirm only the three allowed files changed, then commit:

```bash
git add src/game/game.css src/game/GameScreen.tsx index.html
git commit -m "style: migrate reaction tray to CHEMAI101"
```

### Task 2 / P1: Add teaching and state-visibility interactions

**Files:**

- Modify: `src/game/GameScreen.tsx`
- Modify: `src/game/game.css`

- [ ] Convert the latest receipt into a capped UI-only log while keeping exactly one `reaction-effect` container. The container retains the newest receipt attributes and children render at most three items:

```tsx
const [effectReceipts, setEffectReceipts] = useState<EffectReceipt[]>([])

const newReceipts = cues.map((cue, index) => ({
  ...cue,
  effectCount: effects.length,
  total: firstId + index,
})).reverse()
setEffectReceipts((current) => [...newReceipts, ...current].slice(0, 3))

const latestReceipt = effectReceipts[0]
```

`clearReactionCue(true)` must clear transient cues, the receipt list and sequence on undo/restart/level switch. Ordinary valid selections clear only transient cues, not prior receipts.

- [ ] Make LOCKED tiles focusable with `aria-disabled="true"`; do not send a select command when locked. Derive live blockers solely from `tile.blockedByTileIds` intersected with `remainingTileIds`. Mouse enter, focus and click set the hinted tile; blur/mouse leave clear it. A blocker gets `tile--blocking`; the coach/status copy names the required action.
- [ ] Add `data-game-status={state.status}` to the shell and conditional classes on tray/condition panels. When `awaiting-condition`, both panels receive a visible sand outline and explicit `AWAITING CONDITION` text; the breathing animation is disabled under reduced motion.
- [ ] Change undo secondary text to `UNDO ${Math.max(0, level.toolLimits.undo - state.undoUsed)}/${level.toolLimits.undo}`, switching to `LIMIT REACHED` only at zero.
- [ ] Render a coach bar for level 1 while playing:

```ts
const coachCopy = state.moveCount === 0
  ? '第 1 步 · 取一张未被遮挡的卡'
  : state.moveCount === 1
    ? '第 2 步 · 再找能与它反应的卡'
    : state.moveCount <= 2
      ? '第 3 步 · 观察槽中产物与目标变化'
      : null
```

The existing `role="status"` remains the sole live region; the coach bar must not create competing announcements.

- [ ] Run `npm run test && npx playwright test`; preserve 16/16 and 12/12.
- [ ] Run `git diff --check`, confirm only the two allowed files changed, then commit:

```bash
git add src/game/GameScreen.tsx src/game/game.css
git commit -m "feat: add reaction tray teaching feedback"
```

### Task 3 / P2: Add efficient keyboard and continuity controls

**Files:**

- Modify: `src/game/GameScreen.tsx`
- Modify: `src/game/game.css`

- [ ] Maintain tile refs by tile ID and handle ArrowLeft/Right/Up/Down within visible board order. Enter/Space calls the same open/locked handler as pointer input. Keep every visible tile reachable by Tab and keep focus visible.
- [ ] Add document-level U/R shortcuts only when the event target is not an input, textarea, select or contenteditable element. U invokes undo when available; R invokes restart. Do not intercept modified shortcuts or browser defaults unnecessarily.
- [ ] Store cleared level IDs in `reaction-tray.cleared-levels.v1`. Parse failures must fall back to an empty array. On transition to `won`, merge the current level ID; render a `CLEARED` chip in the corresponding level button after refresh.
- [ ] Derive target reactant species without hard-coded reaction IDs:

```ts
const targetReactantSpeciesIds = useMemo(() => {
  if (goal?.kind !== 'produce') return new Set<string>()
  const allowed = new Set(level.allowedReactions.map((entry) => entry.reactionId))
  return new Set(reactions
    .filter((reaction) => allowed.has(reaction.id) && reaction.products.some((product) => product.speciesId === goal.targetSpeciesId))
    .flatMap((reaction) => reaction.reactants.map((reactant) => reactant.speciesId)))
}, [goal, level])
```

Clicking the target formula toggles a one-shot `tile--target-reactant` highlight only on remaining cards whose species IDs are in this set.

- [ ] After a successful open-tile command that leaves a tray entry, show `SLOT NN ← formula` for 600ms as UI-only state. Clear its timer on unmount, undo, restart and level switch. Under reduced motion the label may appear statically but must not animate.
- [ ] Run `npm run test && npx playwright test`; preserve 16/16 and 12/12.
- [ ] Run `git diff --check`, confirm only the two allowed files changed, then commit:

```bash
git add src/game/GameScreen.tsx src/game/game.css
git commit -m "feat: add keyboard and progress UX"
```

### Task 4 / P3: Add opt-in sound, share feedback and completion motion

**Files:**

- Modify: `src/game/GameScreen.tsx`
- Modify: `src/game/game.css`

- [ ] Add an accessible sound toggle persisted as `reaction-tray.sound-enabled.v1`; default false. Lazily construct AudioContext only inside a user-initiated command when enabled. Synthesize distinct short oscillator envelopes for select, reaction and win; no asset or dependency.
- [ ] Add a victory share button. Build exactly `REACTION TRAY L${level.order} · ${state.moveCount} MOVES · COMPLETE`, call `navigator.clipboard.writeText`, and set the existing live feedback to either `成绩已复制。` or `复制失败，请手动记录。` based on the actual promise outcome.
- [ ] Add `target-formula--won` only while won and a one-time completion pulse. In `prefers-reduced-motion: reduce`, set animation to `none` for cue, awaiting highlight, blocker/target highlight, slot float and completion pulse.
- [ ] Run `npm run test && npx playwright test`; preserve 16/16 and 12/12.
- [ ] Run `git diff --check`, confirm only the two allowed files changed, then commit:

```bash
git add src/game/GameScreen.tsx src/game/game.css
git commit -m "feat: add reaction tray completion polish"
```

### Task 5: Stop for main-agent final audit

**Files:** none

- [ ] Run `npm run check && npm run test:e2e` from clean HEAD.
- [ ] Report all four implementation commit hashes, exact test counts, any deviation and `git status --short --branch`.
- [ ] Do not create or modify verification docs, tests, remote, deployment, engine, solver or content. The main task owns visual probes, SSOT checklist closure and final GOAL status.
