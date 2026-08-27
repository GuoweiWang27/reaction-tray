# Reaction Tray — UI/UX 设计 SSOT（适配 CHEMAI101 风格）

> 版本：v1.1 · 2026-08-27 · Codex 主审定稿
> 地位：本文件是 reaction-tray 视觉与交互改造的唯一权威源。任何样式/交互改动以此为准；冲突时修改本文件再改代码。
> 参照系：CHEMAI101（`../chemai101/tailwind.config.cjs`、`App.tsx`、`HomeModule.tsx`）

---

## 0. 改造原则

1. **不换骨架，只换皮肤**。现有"仪器面板"信息架构（instrument-header / panel-bar / readout / LED 状态 / mono 标注）是好资产，全部保留；只把视觉语言从"深石墨冷战仪器"换成"CHEMAI101 暖纸实验记录本"。
2. **令牌先行**。所有颜色、字体、圆角、阴影必须先落到 CSS 变量，禁止组件内裸值。
3. **可回滚**。改动集中在 `src/game/game.css` + `GameScreen.tsx` 的 className/结构微调，不碰 `engine.ts` / `solver.ts` / 内容层。

### 0.1 文件权限与实施边界（硬性）

- 本 SSOT 由主审在实施前提交；实施批次只能修改 `src/game/game.css`、`src/game/GameScreen.tsx`、`index.html`。
- 禁止修改 `src/game/engine.ts`、`src/game/solver.ts`、`src/content/*`、测试文件、构建配置和依赖清单；禁止新增运行时代码或资源文件。
- 所有新增行为必须从 `GameScreen.tsx` 已取得的 `state`、`level.board`、`level.allowedReactions`、`reactions` 和 engine effects 派生，不复制或猜测化学规则。
- 若需求看似需要越界，先使用现有只读数据完成；仍不可完成时停止该批并报告，不得自行扩大范围。

---

## 1. 两套风格差异诊断

| 维度 | reaction-tray 现状 | CHEMAI101 体系 | 改造方向 |
|---|---|---|---|
| 基调 | 深石墨底 `#171d1c` | 暖纸底 `#faf8f5` + 白面板 | 全局转浅色 |
| 主色 | 蓝 `#4d7e9b` / 铜 `#b76f4f` | 深红 `#8C1515` / 沙金 `#D4A76A` | 语义映射，见 §3 |
| 字体 | mono 标签 + 衬线化学式 | 正文 Source Serif 4、展示 Playfair Display、mono JetBrains Mono | 三字体全部对齐 |
| 形状 | 直角 2-3px + 硬偏移阴影 `2px 3px 0` | 大圆角 12-24px + 暖色软阴影 | 全面替换 |
| 微字号 | 大量 0.42-0.62rem（≈7-10px） | 最小 text-[10px] | 下限抬到 10px |

---

## 2. 设计令牌（SSOT，直接替换 `game.css` 的 `.game-shell` 变量块）

```css
.game-shell {
  /* —— 色板（对齐 CHEMAI101 tailwind science/sand） —— */
  --paper:        #faf8f5;  /* 页面底，替换 graphite-950 */
  --paper-warm:   #f0ece4;  /* 次级面板/槽位区底，替换 ivory-200 */
  --panel:        #ffffff;  /* 主面板 */
  --line:         #e8d5b8;  /* 面板边框（暖沙），替换 rgba(41,55,51,.18) */
  --line-strong:  #d9c9a8;  /* 棋盘/槽位等需要更深一档的边框 */

  --crimson:      #8C1515;  /* 主强调：目标、OPEN 可选、激活态（替换 blue） */
  --crimson-deep: #6f1010;  /* hover/文字加深（science-700） */
  --crimson-pale: #f7ecec;  /* 主强调浅底（替换 blue-pale） */

  --sand:         #D4A76A;  /* 次强调：产物、入槽填充、序号（替换 copper） */
  --sand-dark:    #866027;  /* 次强调文字色 */
  --sand-pale:    #f7eedd;  /* 次强调浅底（替换 copper-pale） */

  --ink:          #1a1a1a;
  --muted:        #6f685d;
  --faint:        #a39a8b;  /* 锁定态、占位文字 */

  /* —— 字体（对齐 CHEMAI101 fontFamily） —— */
  --body-font:    "Source Serif 4", Georgia, "Songti SC", serif;
  --display-font: "Playfair Display", Georgia, serif;   /* 仅 H1 大标题 */
  --formula-font: "Source Serif 4", Georgia, "Songti SC", serif; /* 化学式与正文同源 */
  --mono-font:    "JetBrains Mono", "SF Mono", Menlo, monospace;

  /* —— 形状 —— */
  --radius-panel: 16px;   /* 各大面板 */
  --radius-card:  12px;   /* tile、按钮 */
  --radius-chip:  999px;  /* 徽章、LED 外圈 */
  --shadow-panel: 0 4px 16px rgba(90, 60, 20, 0.08);
  --shadow-lift:  0 8px 24px rgba(90, 60, 20, 0.14);

  /* —— 字号下限 —— */
  --text-micro: 0.625rem;  /* 10px，mono 标注的下限；现状 0.42-0.48rem 一律抬到此值 */
}
```

**阴影规则**：废弃全部 `Npx Npx 0` 硬偏移阴影，统一暖色软阴影；hover 用 `--shadow-lift` + `translateY(-2px)`，与 CHEMAI101 卡片行为一致。

**字体加载**：`index.html` 增加 Google Fonts（Source Serif 4 + Playfair Display + JetBrains Mono），与 chemai101 的 index.html 保持一致。

---

## 3. 颜色语义映射（蓝/铜 → 深红/沙金）

| 语义 | 现状 | 改为 | 涉及位置 |
|---|---|---|---|
| 目标产物 / TARGET | 蓝 | **深红 crimson** | target-panel 左边条、target-formula、panel-kicker |
| OPEN 可选 tile | 蓝 | **深红 crimson** | tile--open hover 边框、tile-tag、legend-dot--open |
| 产物 / 入槽填充 | 铜 | **沙金 sand** | tray-slot--filled、effect-receipt--product、reaction-cue--product |
| 关卡序号 / brand 分隔符 | 铜 | **沙金 sand-dark** | level-index、brand-mark span |
| 条件按钮激活 | 铜深底 | **沙金深底 `#866027`** | condition-button--active |
| 完成态（won） | 蓝 | **深红 crimson** | outcome--won 边条与按钮 |
| 失败/中断态（lost） | 铜 | **沙金 sand-dark** | outcome 默认边条与按钮 |
| READY LED | 绿 `#82ad91` | **保留绿色**（仪器语义，全局唯一绿点） | status-led |

> 纪律：深红 = "要去拿的东西"（目标、可取、主行动）；沙金 = "已经生成/已放入的东西"（产物、填充）。两色不交叉使用。

---

## 4. 分区改造细则

### 4.1 页面骨架（.game-shell / .console）
- 背景：`#faf8f5` 纯色或极浅暖渐变；删除深色 blueprint 网格背景。
- 页面只裁切横向溢出：使用 `overflow-x: clip`（兼容回退可为 `hidden`），纵向必须允许整页滚动。

### 4.2 头部（.instrument-header）
- `brand-mark`、`run-status` 文字色从灰绿改为 `--muted`；LED 保留绿色。
- H1「反应槽」用 `--display-font`（Playfair Display），颜色 `--ink`，去掉 `letter-spacing: -0.08em`（中文不适用负字距）。
- run-status 边框改 `--line`，底 `rgba(255,255,255,0.7)`。

### 4.3 关卡选择器（.level-selector）
- 当前垂直切片有 3 关；移除数量耦合，改为 `repeat(auto-fit, minmax(96px, 1fr))`，保证未来增加关卡时不改 CSS。
- 按钮：白底 + `--line` 边框 + `--radius-card`；激活态 `--crimson-pale` 底 + `--crimson` 边框文字。

### 4.4 目标面板（.target-panel）
- 左边条 4px 改 `--crimson`；面板白底 + `--shadow-panel` + `--radius-panel`。
- `target-readout` 的 0/2 进度增加一条 4px 高进度条（`--crimson` 填充），百分比 = produced/goalCount。

### 4.5 样本区（.field-panel / .board / .tile）
- 棋盘底从 `#dce3db` 灰绿改为 `--paper-warm`；网格线从绿色改 `rgba(134,96,39,0.08)` 暖沙；角标 `FIELD 01 · TOP VIEW` 字号抬到 10px、色 `--faint`。
- tile：白底 + `--radius-card` + `--shadow-panel`；`tile-reveal` 动画保留。
- tile--open：hover 边框 `--crimson` + `--shadow-lift` + translateY(-2px)（现有行为保留，换色即可）。
- tile--locked：底 `--paper-warm`、文字 `--faint`、去掉 opacity 0.72（与浅色底叠加后过淡），改用 `filter: saturate(0.6)`。
- 遮挡关系可视化（新交互，P1）：hover、focus 或点击锁定 tile 时，直接读取该 tile 的 `blockedByTileIds` 与 `state.remainingTileIds`，让仍在棋盘上的实际遮挡牌显示 `--sand` 虚线描边，并在教练条说明“先取走高亮牌”。不得改 engine。锁定 tile 使用 `aria-disabled="true"` 而不是原生 `disabled`，以便键盘聚焦；点击锁定牌只显示提示，不发送 engine command。

### 4.6 反应提示（.reaction-cue / .effect-receipt）
- cue 底色改 `--crimson-pale` / `--sand-pale`，描边对应深色；`cue-pop` 动画保留。
- effect-receipt 从“只保留最近一条”改为**反应日志**（P1）：UI state 保存最近 3 条 receipt，纵向堆叠，最新在顶，旧的 60% 透明度；首条带方程全文，其余只留 formula。这是纯 UI 日志，不进入领域历史。撤回、重开、切关沿用现有契约清空日志。
- `data-testid="reaction-effect"` 必须继续且只出现一次：放在日志容器上，并让容器继续携带最新 effect 的 `data-cue-kind`、`data-effect-count`、`data-effect-total`；历史子项使用新的 class，不复用 testid。

### 4.7 反应槽（.tray-panel / .tray-slot）
- 空槽编号 `01/02` 保留；填充态换 `--sand-pale` 底 + `--sand` 边框 + `--sand-dark` 文字。
- 新增入槽动效增强（P2）：填充瞬间槽位上方浮现 10px mono 小字 `SLOT 02 ← Na₂CO₃`，600ms 淡出。
- awaiting-condition 状态（P1）：槽满等条件时，整个 tray-panel 加 `--sand` 2px 外描边 + 呼吸动画（opacity 1↔0.6，1.2s），condition-panel 同步高亮。现状只有一行 feedback 文字，太弱。

### 4.8 条件控制（.condition-panel）
- 激活态底 `#866027`、文字白；`PERSISTENT / ONE-SHOT` 徽章用 `--radius-chip` 胶囊。

### 4.9 操作行（.action-row / .undo-button）
- 撤回按钮右侧小字改为**剩余次数**：`UNDO {limit - undoUsed}/{limit}`，用完显示 `LIMIT REACHED`。现状不显示剩余，违反状态可见性。
- move-readout 保留 mono，字号抬到 10px。

### 4.10 反馈行（.feedback）
- 文字色 `--muted` → 关键状态加前缀色点：成功 `--crimson`、失败 `--sand-dark`、提示 `--muted`。
- 首关前 3 步做新手引导（P1）：feedback 区升级为"教练条"，依次提示「取一张未被遮挡的卡」→「再找能与它反应的卡」→「观察槽中产物」，之后恢复普通反馈。实现上只需按 moveCount 与 status 切换文案，不改引擎。

### 4.11 结算条（.outcome）
- 保留 inline 条，不加全屏遮罩（符合仪器气质）。
- 胜利条左边条 `--crimson`，按钮 `--crimson-pale` 底；失败条 `--sand-dark`。
- 胜利时 target-formula 处加一次 `slot-fill` 同款缩放脉冲（P3）。

### 4.12 页脚（.console-footer）
- 色 `--faint`，字号 10px，内容不变。

---

## 5. 字号与可读性（硬性）

| 元素 | 现状 | 改为 |
|---|---|---|
| tile-tag / tile-phase / readout-caption / cue small | 0.42-0.48rem | **≥0.625rem（10px）** |
| feedback / 正文 | 0.76rem | 0.8125rem（13px） |
| panel-bar / console-footer | 0.46-0.55rem | ≥0.625rem |
| 中文正文 | — | ≥13px，行高 1.55 |

mono 大写标注风格保留（仪器气质来源），但任何低于 10px 的实例视为缺陷。

---

## 6. UX / 交互专项

1. **P1 反应日志**：见 §4.6。教学核心，优先做。
2. **P1 遮挡提示**：见 §4.5。降低"为什么点不了"的认知成本。
3. **P1 awaiting-condition 高亮**：见 §4.7。状态可见性。
4. **P1 撤回剩余次数**：见 §4.9。
5. **P1 新手引导教练条**：见 §4.10。
6. **P2 键盘操作**：方向键在当前仍可见的 tile 间移动焦点，Enter/Space 对 OPEN tile 取卡、对 LOCKED tile显示遮挡提示；焦点不在表单控件时，U 撤回、R 重开。必须保留正常 Tab 顺序和可见焦点，不能只支持快捷键。
7. **P2 关卡进度记忆**：localStorage 记录已过关卡，level-selector 显示 `CLEARED` 徽章（沙金）。
8. **P2 目标联动**：点击 target-panel 的化学式，从本关 `allowedReactions` 对应的现有 reaction definitions 读取目标产物与反应物，给棋盘上相关原料 tile 描边一次；不得调用或修改 solver，不得硬编码 reaction ID。
9. **P2 入槽提示**：见 §4.7；只从本次选择后的 tray/UI 差异生成，600ms 后移除，不进入领域状态。
10. **P3 音效**：使用 Web Audio 合成入槽/反应/胜利三个短音，不新增音频资产或依赖；默认关闭，显式开关与设置存 localStorage。关闭时不得创建 AudioContext。
11. **P3 结算分享**：胜利条加「复制成绩」按钮，文案 `REACTION TRAY L1 · 6 MOVES · COMPLETE`；复制成功或失败均通过现有 `role="status"` 反馈，不假装成功。

### 移动端与可访问性
- 保持 480px 单列；`min-height: 100svh` 下确认 iPhone SE（375×667）整页可滚动，必要时把 `.game-shell` 的 `overflow: hidden` 改为 `overflow-x: clip`。
- `prefers-reduced-motion` 现有处理保留；新增的呼吸、闪烁、浮字和胜利脉冲必须完全取消，只保留静态状态样式。
- 所有新交互保持 aria-label 中文文案同步更新；色不作为唯一信息载体（锁定态已有 LOCKED 文字，保持）。

---

## 7. 实施优先级与验收

| 批次 | 内容 | 验收点 |
|---|---|---|
| **P0 皮肤迁移** | §2 令牌 + §3 映射 + §4.1-4.5 换色/圆角/阴影/字号 + 字体加载 | 全页无深色残留；无硬偏移阴影；无 <10px 字号；肉眼对比 CHEMAI101 首页风格一致 |
| **P1 交互补强** | 反应日志、遮挡提示、awaiting-condition 高亮、撤回次数、教练条 | 日志最多 3 条且 testid 契约不变；鼠标与键盘均能触发遮挡提示；状态类能同时高亮 tray/condition；撤回显示剩余次数；第 1 关前三步教练文案正确；既有 E2E 不红 |
| **P2 效率层** | 键盘操作、关卡记忆、目标联动、入槽提示 | 仅用键盘完成第 1 关；刷新后已完成徽章仍在；目标联动只高亮真实反应物；入槽提示出现后自动移除；360/390 无溢出 |
| **P3 风味层** | 音效、分享、胜利脉冲 | 音效默认关闭且显式开启后才创建声音；复制文本包含关卡/步数/完成态并反馈结果；胜利脉冲仅一次；reduced-motion 下所有新增动画为静态 |

**回归纪律**：实施前先提交本 SSOT/执行计划；P0、P1、P2、P3 每批完成并验证后各自提交，下一批只能从干净提交开始。现有每张 tile 的动态 `data-testid={tile.tileId}`、`data-testid="reaction-effect"` 与 `data-cue-kind`/`data-effect-count`/`data-effect-total` 属性是测试契约，**不得删除、改名或产生多个 reaction-effect**；新增 UI 元素如需 testid 必须使用新值。

**测试基线**：改前运行 `npm run test` + `npx playwright test`；每批次后原样重跑，任一红灯立即停止、修复、复跑后才允许提交。测试文件不在本次权限范围内；新增验收通过主审的一次性 Playwright 探针和 390/360/375×667 截图取证，不把探针写入仓库。

### 7.1 主审验收清单

- P0：计算样式确认正文与标签字号下限；源码扫描无旧 graphite/blue/copper token、无硬偏移阴影；390/360/375×667 截图与 CHEMAI101 参照系对比。
- P1：连续完成第 3 关两次反应验证日志顺序/上限；鼠标和键盘触发 LOCKED 遮挡提示；检查 `awaiting-condition` 条件渲染分支；验证撤回、重开、切关清空日志。
- P2：键盘独立通关第 1 关；刷新验证 CLEARED；目标联动高亮 H⁺/OH⁻ 而非干扰牌；入槽浮字在 reduced-motion 下无动画。
- P3：默认无 AudioContext，开启后入槽/反应/胜利有不同合成提示；复制成功/失败均可访问反馈；reduced-motion 下 cue、呼吸、闪烁、浮字、胜利脉冲全部无动画。
- 最终：`npm run check`、`npm run test:e2e`、solver 三关 fresh 通过；`git diff --check` 无输出；工作树干净；仅允许文件和 SSOT/计划文档发生变化。

---

## 8. 不做清单（防止范围蔓延）

- 不改游戏引擎、规则、关卡数据。
- 不引入 Tailwind/组件库；reaction-tray 保持纯 CSS 变量体系，仅令牌值对齐 CHEMAI101。
- 不加全屏弹窗、不加深色模式切换（本期只出浅色版）。
- 不做多语言（CHEMAI101 有 zh/en，tray 本期维持中文 + 英文仪器标注现状）。
