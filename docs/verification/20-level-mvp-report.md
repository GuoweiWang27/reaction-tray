# Reaction Tray 20 关代码 MVP 验证报告

> 验证日期：2026-08-28
>
> 代码证据 HEAD：`b7a2c4f65c2382a4db6c94c3bb7c9fdb07d84eea`（Task 7 文档改动前，工作树干净）
>
> 文档提交：本报告随 `docs: verify 20-level reaction tray MVP` 提交；最终提交 hash 在交接回报中给出，避免在提交内容中自引用。

本报告只记录本地 code MVP 的 fresh evidence。自动守恒、生产引擎、solver、模拟浏览器和本地 production build 通过，不等于化学审核、学生观察测试或真实设备 QA 已完成。

## 1. Fresh release gate

按计划顺序执行：

```text
npm ci
npm run check
npm run test:e2e
npm test -- tests/unit/solver.test.ts
git diff --check
git status --short --branch
```

结果：

| Gate | Fresh result |
|---|---|
| `npm ci` | PASS；added 65 packages，audited 66 packages，0 vulnerabilities；随后无 tracked diff |
| TypeScript typecheck | PASS；`tsc -b --pretty false` |
| Oxlint | PASS；0 warnings / 0 errors |
| Unit suite（`npm run check`） | PASS；6 files，58 tests |
| Content validation | PASS；`37 species, 17 reactions, 20 levels` |
| Production build | PASS；Vite transformed 35 modules，生成 `dist/` |
| E2E suite | PASS；36/36 tests |
| Solver focused suite | PASS；1 file，26/26 tests |
| `git diff --check` | PASS |
| Git status | 文档提交前仅有本 Task 7 三个文件；提交后已复核 clean |

`npm run test:e2e` 输出过一条 Node 环境 warning：`The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.` 这是非功能性的终端环境 warning，不是产品 failure；测试仍为 36/36，页面和 console error 均为 0。

### 主审复核补充

主审在最终 fresh gate 的第一次默认 E2E 运行中观察到一次 WebKit 导航层偶发：L3 用例停在 `page.goto('/')` 并于 30 秒超时，结果为 35/36；该用例尚未进入任何游戏交互。随即完成以下定向排查，期间未改代码或配置：

- 本地服务连续 10 次返回 HTTP 200，响应时间为 1.1–1.8ms；
- 同一 WebKit L3 用例串行重复 10 次，结果 10/10 通过；
- 以未改动的默认配置重跑完整 E2E，结果 36/36 通过；
- solver 专项仍为 26/26，独立逐关探针仍为 20/20 solved，节点与本报告表格完全一致。

因此该事件记录为一次浏览器运行器导航偶发，而非已复现的产品缺陷；报告保留首次红灯与复核过程，不以重跑结果掩盖它。现有 CI 配置在 CI 环境保留 2 次 retry，本地默认仍为 0 次 retry。

## 2. Content 与 solver

内容校验的精确输出为：

```text
content validation passed: 37 species, 17 reactions, 20 levels
```

以下为在代码证据 HEAD、限制 `maxNodes: 200000, timeoutMs: 3000` 下，对 canonical `levels` 逐关 fresh solver 的原始摘要。`path` 为返回路径长度，包含条件激活命令。

| L | Level ID | Status | Path | Visited nodes |
|---:|---|---|---:|---:|
| 1 | `level.01.first-water` | solved | 6 | 61 |
| 2 | `level.02.silver-mist` | solved | 6 | 707 |
| 3 | `level.03.blue-precipitate` | solved | 6 | 707 |
| 4 | `level.04.limewater-signal` | solved | 4 | 49 |
| 5 | `level.05.bubble-escape` | solved | 6 | 324 |
| 6 | `level.06.carbonate-bubbles` | solved | 6 | 324 |
| 7 | `level.07.iron-acid` | solved | 6 | 324 |
| 8 | `level.08.copper-relay` | solved | 6 | 324 |
| 9 | `level.09.ignite-water` | solved | 8 | 803 |
| 10 | `level.10.magnesium-light` | solved | 8 | 803 |
| 11 | `level.11.catalytic-oxygen` | solved | 5 | 87 |
| 12 | `level.12.light-darkening` | solved | 6 | 148 |
| 13 | `level.13.heated-gas` | solved | 6 | 148 |
| 14 | `level.14.black-fades` | solved | 6 | 324 |
| 15 | `level.15.molecular-blue-precipitate` | solved | 6 | 324 |
| 16 | `level.16.white-sulfate` | solved | 6 | 324 |
| 17 | `level.17.furnace-reduction` | solved | 10 | 1532 |
| 18 | `level.18.carbon-cycle` | solved | 4 | 49 |
| 19 | `level.19.hydrogen-relay` | solved | 8 | 967 |
| 20 | `level.20.double-precipitate` | solved | 4 | 49 |

结论：`20/20 solved`；无 node-limit 或 timeout 结果。

## 3. Automated browser evidence

`npm run test:e2e` 在两个 Playwright project 均通过：

- mobile Chromium：18/18 tests；`all-levels.spec.ts` 使用 canonical `standardSolutionSteps` 完成 20/20 关，page error 0、console error 0；
- mobile WebKit：18/18 tests；代表关 L3/L9/L11/L19/L20 为 5/5，page error 0、console error 0；
- 总计：36/36 tests。

因此自动化浏览器覆盖的 canonical completion 为 Chromium `20/20`，代表性 WebKit `5/5`。

## 4. Final clean-context acceptance probe

使用全新 Playwright CLI browser session `task7-clean2`，探针从 `src/content/levels/index.ts` 读取 20 关 `standardSolutionSteps` 后逐关 replay。临时截图共 8 张，仅写入 `/tmp/reaction-tray-task7-probe.7tcTRn/`，未进入仓库。

### 导航、标准解与损坏存储

| Check | Raw result |
|---|---|
| Chapter tabs | 4/4 selected；每章 level buttons 为 5、5、5、5（总计 20） |
| Canonical standard solutions | 20/20 `data-game-status="won"`；URL L1–L20 均正确 |
| Corrupt progress reload | reload 后当前章仍有 5 个按钮、页面 `playing`；切回 L1 标题为“第一滴水”，L1 `CLEARED` 出现次数 0 |
| Tile hint | aria `提示（剩余 1/2）`；focus count 1；`l1-h-1` |
| Condition hint | aria `提示（剩余 1/2）`；focus count 1；`condition-ignite` |
| Keyboard-only L1 | 6 次 Enter；最终 `won` |

### SOUND 与 clipboard

| Check | Raw result |
|---|---|
| SOUND OFF | `AudioContext` 0；audio events 0；标准 L1 `won` |
| SOUND ON | `AudioContext` 1；audio events 67；oscillator types `sine`, `triangle`；频率包含 440/660（select）、262/392/523（reaction）、523/659/784（win）；标准 L1 `won` |
| Clipboard resolve | status `成绩已复制。`；写入 `REACTION TRAY L1 · 6 MOVES · ★★★ · COMPLETE` |
| Clipboard reject | status `复制失败，请手动记录。`；写入数组为空 |

clipboard 两条路径均通过注入的 `navigator.clipboard.writeText` resolve/reject 探针验证了应用真实状态反馈；未把注入成功冒充为操作系统剪贴板成功。

### Reduced motion

在 L10、L12、L20 设置 `prefers-reduced-motion: reduce`；对 cue、pseudo-element、slot float、filled slot、tile、target highlight、awaiting panel、feedback 和胜利 target 的现存节点读取 computed `animationName`。所有现存节点及 `::before` / `::after` 的动画名均为 `none`。

| Case | Raw visible nodes |
|---|---|
| L10 awaiting | slot-float 1；filled slots 3；target-reactant 3；awaiting tray/condition/feedback 各 1；均 `none` |
| L10 reaction | reaction cue 1；target-reactant 3；均 `none`（cue pseudo-elements 亦为 `none`） |
| L12 reaction | reaction cue 1；target-reactant 2；均 `none`（cue pseudo-elements 亦为 `none`） |
| L20 reaction | reaction cues 2；均 `none`（cue pseudo-elements 亦为 `none`） |

### Mobile matrix

每个 case 均从页面顶端载入、滚到文档底部后读取；所有 case 的 page error 和 console error 均为 0。

| Level | Viewport | Min computed font | Scroll width / viewport | Scroll height | Bottom reached |
|---:|---:|---:|---:|---:|---|
| 1 | 390×844 | 10px | 390 / 390 | 1153 | true |
| 9 | 390×844 | 10px | 390 / 390 | 1337 | true |
| 11 | 390×844 | 10px | 390 / 390 | 1270 | true |
| 17 | 390×844 | 10px | 390 / 390 | 1337 | true |
| 19 | 390×844 | 10px | 390 / 390 | 1416 | true |
| 20 | 390×844 | 10px | 390 / 390 | 1289 | true |
| 20 | 360×844 | 10px | 360 / 360 | 1296 | true |
| 20 | 375×667 | 10px | 375 / 375 | 1275 | true |

## 5. Cue、safety 与 chain coverage

| Observable cue | Stable mapping | Automated evidence |
|---|---|---|
| water | `product` | L1 |
| precipitate | `precipitate` | L3 |
| gas | `gas` | L6 |
| light | `light` | L10 |
| metal | `metal` | L8 |
| color-change | `color-change` | L12 |

每页保持恰好一个 `reaction-effect` 容器，并保留 `data-cue-kind`、`data-effect-count`、`data-effect-total`。L20 fresh browser flow 返回 `effect-count=2`、`effect-total=2`，两个 receipt 按 chronological order 为 `Cu(OH)₂` 后 `BaSO₄`。

- Safety strips：L9/L10/L12/L16/L17 均显示；信息从 allowed reactions 与 board species 的既有 `safetyNote` 派生，事实 clause 去重，并唯一追加 `本游戏只呈现反应关系，不提供实验操作步骤。`。
- 去重结果：L16/L20 仅一条“可溶性钡盐有毒。”事实；L9 仅一条“氢气与氧气混合并点燃具有危险性。”事实；L12 的“氯气有毒。”、L17 的“一氧化碳有毒。”均不重复；L10 保留燃烧镁强光事实及可访问的 reduced-motion 提示。
- L15 教学反馈同时连接分子式与净离子式 `Cu²⁺ + 2OH⁻`。
- Conditions：L9/L10 `ignite`、L11 `mno2`、L12 `light`、L13 `heat`、L17 `heat` 的 lifecycle 和一次/持续反馈均由现有 E2E 覆盖；L11 持续催化剂保持激活，L12/L13 一次性条件在使用后清除。
- Chains：L18 严格先 limewater 再 calcium-carbonate-hcl；L19 history 为 iron-hcl×2 → hydrogen-combustion，且 O₂ 在 ignite 后最后取入；L20 记录双 reaction effect。错序不能直接 `won` 的 engine/E2E 契约保持通过。

## 6. 变更边界与外部门禁

Task 7 的最终 modified-file boundary 精确为：

```text
README.md
docs/specs/reaction-tray-mvp-spec-v1.1.md
docs/verification/20-level-mvp-report.md
```

`npm ci` 后确认无 tracked diff；文档改动前 evidence HEAD 为 `b7a2c4f65c2382a4db6c94c3bb7c9fdb07d84eea` 且 clean。提交前执行 `git diff --check` 和 scoped diff 检查，提交后复核 `git status --short --branch` clean。未 push、未 deploy、未创建后端。

以下门禁不以本地代码证据替代，均保持 `PENDING`：

| External gate | Status |
|---|---|
| Chemistry teacher review | `PENDING` |
| 5–8 名目标学生观察测试 | `PENDING` |
| 15–30 名完整 MVP 用户测试 | `PENDING` |
| Real iOS Safari QA | `PENDING` |
| Real Android Chrome QA | `PENDING` |
| Public release / remote repository / domain / deployment | `PENDING`；未获单独授权，不执行 |

## 7. Release-audit conclusion

20-level local code MVP 的结构校验、自动化测试、fresh solver、production build、Chromium/WebKit 模拟覆盖、clean-context interaction probe 和移动端/reduced-motion probe 均通过。以上结果只证明代码 MVP 的当前门禁，不构成化学教师签字、学生观察结论、真实 iOS/Android QA 或公开发布批准。
