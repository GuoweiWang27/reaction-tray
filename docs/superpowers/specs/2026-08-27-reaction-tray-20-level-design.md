# Reaction Tray 20 关代码 MVP 设计

> 版本：Design v1.0 · 2026-08-27
> 状态：弈沐哥已批准“机制阶梯＋三关链式综合”方向
> 范围：本地可发布级 20 关代码 MVP；不代表化学审核或公开发布获批
> 上游：`docs/specs/reaction-tray-mvp-spec-v1.1.md`、`docs/specs/uiux-ssot-v1.md`

## 1. 权威关系

本文件冻结第 4～20 关扩展的产品设计、领域语义和验收边界。实施冲突时按以下顺序处理：

1. 化学物质和反应机器数据以 `src/content/species.ts`、`src/content/reactions.ts` 为事实源；
2. 本文件决定 20 关的教学顺序、目标、条件、链式关系、评分和交互；
3. `reaction-tray-mvp-spec-v1.1.md` 继续记录前三关垂直切片历史，但“只做三关”的范围约束由本文件替代；
4. `uiux-ssot-v1.md` 的 CHEMAI101 暖纸视觉与无障碍契约继续生效；为 20 关新增的章节、评分、提示和安全区以本文件为准；
5. 化学审核状态保持 `pending`，Agent 不得写成 `approved`。

原始 V1.0 桌面文件已经不在原路径。本设计不凭记忆复原旧关卡表，而是从仓库现有 17 条结构化反应重新建立可执行的 20 关序列。

## 2. 设计选择

采用“机制阶梯＋链式综合”而不是“每反应一关”或“先做高复杂谜题”：

- 第 1～17 关逐步引入比例、沉淀、气体、置换、点燃、催化、光照、加热和分子式表达；
- 第 18～20 关复用已学反应，验证中间产物自动入槽与同一玩家操作内的连续结算；
- 每章 5 关，章节导航固定为四组，不把 20 个按钮挤在同一行；
- 关卡不做硬锁，方便课堂自由选关和测试；完成态、最佳步数与星级提供进度反馈。

## 3. 当前基线与必须补齐的能力

当前代码已经具备：

- 37 种物质、17 条守恒反应、4 个条件；
- 三关叠层牌局、自动反应、失败、原子撤回；
- fresh-state tile solver；
- CHEMAI101 UI/UX、键盘操作、音效、成绩复制和移动端 E2E。

扩展前必须补齐：

- solver 目前只搜索取牌，不搜索条件命令，也不能从任意当前状态求解；
- engine 的 `sequence` 目标尚未结算；
- 标准解只能保存 tile ID，无法表达点燃、加热、光照和催化；
- 条件激活目前不计步，无法公平比较成绩；
- UI 只展示第一个 `produce` 目标，不能展示反应目标和链式步骤；
- 三关平铺选择器、单一 signal 动画和旧 footer 不适合 20 关。

## 4. 范围与不做项

### 4.1 本期完成

- 第 1～20 关可执行内容；
- 所有关卡 fresh 可解，并可从当前可继续状态请求安全提示；
- 条件、顺序目标、中间产物和链式反应由生产 engine 统一结算；
- 四章导航、目标进度、最佳步数、星级、提示、安全说明和六类观察反馈；
- Chromium/WebKit、360/375/390 移动端验证；
- 本地生产构建、发布边界文档与干净 Git 提交链。

### 4.2 本期不做

- 后端、登录、云排行榜、班级系统、AI 接口；
- 可改变牌局的 shuffle；所有关卡 `shuffle: 0`；
- 真实实验步骤或危险反应操作指导；
- 完整化学图鉴、背景音乐、付费、埋点；
- 伪造化学教师签字、学生测试结果或真实设备 QA。

## 5. 领域契约

### 5.1 标准解动作

`standardSolutionTileIds` 升级为可表达条件的 `standardSolutionSteps`：

```ts
export type LevelSolutionStep =
  | { type: 'select-tile'; tileId: string }
  | { type: 'activate-condition'; conditionId: ConditionId }
```

旧三关迁移为纯 `select-tile` step。内容校验必须逐步用生产 engine 重放标准解，最终状态必须为 `won`。

### 5.2 玩家操作与计步

- 成功取牌计 1 move；
- 改变条件状态的激活计 1 move；重复点击已经激活的同一条件是 no-op，不记历史、不计步；
- 切换能量条件会替换旧能量条件并计 1 move；
- undo 恢复命令前完整快照，不额外增加 move，但增加 `undoUsed`；
- hint 先调用 solver；只有得到可验证下一步时才向 engine 发送 `use-hint`，增加 `hintUsed`，不创建化学历史帧，也不能被 undo 退还；
- shuffle 保留类型和计数位，但本期无入口、限额恒为 0。

`GameCommand` 因此包含 `select-tile`、`activate-condition`、`undo` 和 `use-hint`。solver 只搜索前两类会推进关卡的命令。

### 5.3 顺序目标

领域状态新增有序 `reactionHistory`。`sequence` 目标将 steps 展开为严格反应序列，例如：

```ts
[
  'reaction.iron-hcl',
  'reaction.iron-hcl',
  'reaction.hydrogen-combustion',
]
```

只有实际反应历史的目标前缀按顺序完成才增加链式进度；全部目标序列完成即获胜。错误顺序不会被 UI 修正或由 solver 猜测，玩家需要撤回或重开。

### 5.4 中间产物

`intermediateProductSpeciesIds` 继续决定哪些反应产物写回 tray。写回的每个产物都有稳定、可哈希的产品 tile ID。settle 在一次玩家命令内循环：

1. 消耗反应物；
2. 记录产物和 `reactionHistory`；
3. 把声明的中间体写回 tray；
4. 消耗一次性条件；
5. 继续寻找下一条唯一高优先级反应；
6. 最后统一判断目标、满槽和无牌失败。

链式关卡必须在一个 command result 中返回多个 reaction effects，UI 日志按真实顺序显示。

### 5.5 条件生命周期

- `ignite`、`heat`、`light`：one-shot，只在实际参与反应时消耗；
- `mno2`：persistent，激活后保留到重开、切关或撤回到激活前；
- 同一时刻最多一个 energy 条件，catalyst 可与一个 energy 并存；
- tray 满且某个未激活条件可立即触发反应时进入 `awaiting-condition`；
- 条件按钮在 `playing` 与 `awaiting-condition` 可操作，在 `won`/`lost` 禁用。

## 6. Solver 与提示

solver 对生产 `GameCommand` 做有界 BFS：

- 输入可以是 fresh state 或当前 `GameState`；
- 搜索动作包含所有可选 tile 和所有会改变领域状态的可用条件；
- 不搜索 undo、hint、shuffle；
- 状态哈希包含剩余牌、tray 物质顺序的规范化表示、产物、反应次数、`reactionHistory`、激活条件、目标进度和 status；
- 返回 `GameCommand[]`、visitedNodes 和安全首步集合；
- 每关 CI 上限初始为 200,000 nodes / 3,000ms，实际通过后记录真实节点数；
- 内容若超限，优先简化牌局和歧义，不盲目提高上限。

“提示”按钮每次从当前 state 重算：

- 下一步是 tile 时高亮该牌并播报公式；
- 下一步是 condition 时高亮条件台并播报条件名；
- 无解、超时或节点超限时明确提示“当前局面没有可验证路线”，不伪造建议；
- 每关最多 2 次提示，使用提示影响星级。

## 7. 计分、星级与本地记录

完成关卡后计算：

- 3 星：`moveCount <= threeStarMaxMoves` 且 `undoUsed + hintUsed <= threeStarMaxTools`；
- 2 星：完成且 `undoUsed + hintUsed <= twoStarMaxTools`；
- 1 星：完成；
- 未完成：0 星。

localStorage 按 level ID 保存：`cleared`、bestMoves、bestStars。写入采用 schema version；解析失败回退为空记录。结果条展示本轮 moves、最佳 moves 和星级。

复制格式统一为：

`REACTION TRAY L19 · 8 MOVES · ★★★ · COMPLETE`

复制只进入剪贴板，不上传、不形成排行榜。

## 8. 四章 20 关

所有目标数指 engine 的产物计数，不是卡片数。标准 moves 包含条件激活。

| 关 | 章 | 标题 | 反应与目标 | 条件 | 槽 | 标准 moves | 设计重点 |
|---:|---:|---|---|---|---:|---:|---|
| 1 | 1 | 第一滴水 | 3× H⁺＋OH⁻，产 3 H₂O | — | 8 | 6 | 1:1 与遮挡入门，保留现状 |
| 2 | 1 | 银色迷雾 | 3× Ag⁺＋Cl⁻，产 3 AgCl | — | 7 | 6 | 沉淀与干扰牌，保留现状 |
| 3 | 1 | 蓝色沉淀 | 2× Cu²⁺＋2OH⁻，产 2 Cu(OH)₂ | — | 7 | 6 | 1:2、失败和撤回，保留现状 |
| 4 | 1 | 石灰水信号 | 2× CO₂＋Ca(OH)₂，产 2 CaCO₃ | — | 7 | 4 | 气体与沉淀同时出现 |
| 5 | 1 | 气泡脱身 | 2× CaCO₃＋2HCl，产 2 CO₂ | — | 7 | 6 | 固体与酸、1:2、气体 |
| 6 | 2 | 碳酸盐气泡 | 2× Na₂CO₃＋2HCl，产 2 CO₂ | — | 7 | 6 | 可溶碳酸盐与酸 |
| 7 | 2 | 铁与酸 | 2× Fe＋2HCl，产 2 H₂ | — | 7 | 6 | 置换与气体 |
| 8 | 2 | 铜的接力 | 3× Zn＋CuSO₄，产 3 Cu | — | 7 | 6 | 1:1 置换与金属析出 |
| 9 | 2 | 点燃水滴 | 2× 2H₂＋O₂，产 4 H₂O | ignite×2 | 3 | 8 | 满槽等待条件、one-shot |
| 10 | 2 | 镁光时刻 | 2× 2Mg＋O₂，产 4 MgO | ignite×2 | 3 | 8 | 强光反馈与 reduced-motion |
| 11 | 3 | 催化氧气 | 2× 2H₂O₂，产 2 O₂ | mno2×1 | 2 | 5 | persistent 催化剂只激活一次 |
| 12 | 3 | 光下变暗 | 2× 2AgCl，产 4 Ag | light×2 | 2 | 6 | 光照 one-shot、颜色变化 |
| 13 | 3 | 受热逸气 | 2× 2NaHCO₃，产 2 CO₂ | heat×2 | 2 | 6 | 加热 one-shot |
| 14 | 3 | 黑色消退 | 2× CuO＋2HCl，产 2 CuCl₂ | — | 7 | 6 | 颜色变化与酸碱氧化物 |
| 15 | 3 | 分子式蓝沉淀 | 2× CuSO₄＋2NaOH，产 2 Cu(OH)₂ | — | 7 | 6 | 分子式与净离子式关联 |
| 16 | 4 | 白色硫酸盐 | 3× BaCl₂＋Na₂SO₄，产 3 BaSO₄ | — | 7 | 6 | 沉淀复习与安全说明 |
| 17 | 4 | 炉中还原 | 2× Fe₂O₃＋3CO，产 4 Fe | heat×2 | 4 | 10 | 1:3、高温、金属生成 |
| 18 | 4 | 碳循环 | CO₂＋Ca(OH)₂→CaCO₃；CaCO₃＋2HCl→CO₂ | — | 4 | 4 | 两反应在最后一次取牌后连续结算 |
| 19 | 4 | 氢气接力 | 2× Fe＋2HCl→2H₂；2H₂＋O₂→2H₂O | ignite×1 | 4 | 8 | 中间 H₂ 占槽；点燃后最后取 O₂ |
| 20 | 4 | 双沉淀终局 | CuSO₄＋2NaOH→Na₂SO₄；Na₂SO₄＋BaCl₂→BaSO₄ | — | 4 | 4 | 中间 Na₂SO₄ 与双 reaction effect |

### 8.1 关卡 18～20 的冻结顺序

- L18 标准动作：HCl、HCl、CO₂、Ca(OH)₂；最后一次选择先生成 CaCO₃，再立即消耗它并放出 CO₂；
- L19 标准动作：Fe、HCl、HCl、Fe、HCl、HCl、ignite、O₂；槽容量固定为 4，不能降为 3；
- L20 标准动作：BaCl₂、CuSO₄、NaOH、NaOH；最后一次选择返回两条 reaction effect。

上述三条已用当前生产 engine 的中间体循环做只读探针。当前 engine 能执行产物链，但 sequence 目标和 condition solver 仍需按本设计补齐。

### 8.2 牌局规则

- 每关 6～12 张棋盘卡，最多三层；标准动作中的 tile 在对应时点必须可选；
- 关卡 9～13、17 的 tray 容量用于明确制造条件门，不能用大槽绕开教学；
- 干扰牌优先使用 NaCl、H₂O 或本关已声明条件下不会触发已知反应的物质；
- 不再出现“CaCO₃ 与 HCl 同场但白名单禁止真实反应”的设计；
- 所有可发生的本关核心反应必须进入 `allowedReactions`，优先级必须唯一；
- 关卡 18～20 的链式目标使用 `sequence`，其他关卡使用 `produce`；
- 每关标准解由 solver 和生产 engine 双重验证，不接受只靠手写数组的声明。

## 9. 内容文件结构

关卡从单文件拆为：

```text
src/content/levels/
  helpers.ts       # tile、review、level 构造辅助
  chapter-1.ts     # L1–L5
  chapter-2.ts     # L6–L10
  chapter-3.ts     # L11–L15
  chapter-4.ts     # L16–L20
  index.ts         # levels、chapters 和唯一导出
```

`vertical-slice.ts` 在迁移完成后删除。消费者统一导入 `levels`，不得继续使用 `verticalSliceLevels` 名称。

## 10. UI/UX

### 10.1 章节与关卡导航

- 顶部使用四个 chapter tab：比例与沉淀、气体与置换、条件控制、链式综合；
- 当前章下只显示 5 个关卡按钮；360px 保持两列或自适应，不横向滚动；
- 每关显示编号、短标题、CLEARED、最佳步数和星级；不做硬锁；
- URL `?level=1..20` 可直达，非法值回退 L1。

### 10.2 目标区

- `produce`：显示目标化学式和产物计数；
- `perform-reaction`：显示反应名称和已完成次数；
- `sequence`：显示纵向步骤，当前步骤高亮、已完成打勾；
- 点击当前目标仍可联动真实反应物；链式目标只提示当前步骤；
- 目标和反应说明来自内容定义，不硬编码 reaction ID。

### 10.3 条件、提示与反馈

- condition 控制显示 one-shot/persistent，并显示“本轮已激活/等待使用”；
- awaiting-condition 同时高亮 tray、condition 和教练条；
- hint 按钮显示剩余次数，tile/condition 两种提示有不同可访问文案；
- 失败主文案改为“本轮实验失败”，具体原因保留在 status 行；不再使用“反应槽已封存”；
- 链式反应日志保留最多三条，单次多反应按发生顺序成组显示。

### 10.4 观察反馈

cue kind 扩为六类且保留既有 `data-cue-kind`：

- `product`：产物；
- `precipitate`：沉淀；
- `gas`：气泡上升；
- `light`：短促暖色闪光；
- `metal`：金属沉积；
- `color-change`：颜色渐变。

`prefers-reduced-motion` 下取消位移、呼吸、闪烁和缩放，只保留静态色块、文字和图形标识。

### 10.5 安全说明

若 allowed reaction 或棋盘 species 含 `safetyNote`，目标区下显示安全条：

- 只说明风险和“本游戏不提供实验操作步骤”；
- 不显示配制、剂量、点燃、收集或装置方法；
- H₂/O₂、Mg 燃烧、AgCl 光解、可溶性钡盐和 CO 还原必须显示；
- 安全条不等于化学审核通过。

## 11. 测试与验收

### 11.1 内容与领域

- 37 species、17 balanced reactions、20 levels；
- level ID/order 唯一且 1～20 连续，每章正好 5 关；
- 标准解 step 引用存在、条件可用、每步合法，最终 `won`；
- 同状态同优先级多反应直接校验失败；
- sequence 顺序正确、错误顺序、撤回、one-shot、persistent、awaiting-condition 分别有单测；
- 条件 no-op 不创建历史、不计步。

### 11.2 Solver

- 20/20 fresh solved；
- L9/L10 必须包含两次 ignite；L11 只包含一次 mno2；L12/L13 两次对应 condition；
- L18/L20 最后一个 tile command 产生两个 reaction effects；
- L19 路线严格为两次 iron-hcl 后 ignite/oxygen combustion；
- 从至少一个偏离但可恢复的 L3、L9、L19 当前状态返回安全下一步；
- timeout/node-limit/unsolved 三种失败显式测试。

### 11.3 UI 与 E2E

- 20 个关卡可导航且 URL 直达；
- L3 比例/失败/撤回回归；
- L9 awaiting-condition＋ignite；
- L11 persistent catalyst 连续两次反应；
- L19 condition＋中间体＋链式完成；
- L20 单命令双日志；
- hint tile 与 condition 两种路径；
- 星级、best moves、复制文本与 localStorage 损坏回退；
- Chromium 与 WebKit 12 个以上关键流程；
- 360×844、375×667、390×844 无横向溢出、可滚到底、console/page error 为 0；
- reduced-motion 下全部新增动画 `animation-name: none`。

### 11.4 最终门禁

```bash
npm run check
npm run test:e2e
git diff --check
git status --short --branch
```

最终还需一次性浏览器探针遍历 20 关标准解、章节导航、所有 cue kind、安全条、键盘操作和移动视口。

## 12. 分批实施与 Git 门

每批从干净提交开始，红灯立即停止：

1. **Foundation**：类型、engine sequence/condition 计步、solver command path、内容校验；
2. **Chapter 1–2**：迁移 L1–3，新增 L4–10；
3. **Chapter 3**：L11–15 与条件生命周期；
4. **Chapter 4**：L16–20 与三条链；
5. **Product UI**：章节导航、目标、提示、星级、best moves、安全条、六类 cue；
6. **Unified polish**：20 关难度、文案、移动端、无障碍、音效和分享统一调整；
7. **Release audit**：README、验证报告、本地 production build 和外部门禁清单。

每批必须提交独立 commit，并至少运行受影响单测；内容批必须运行全量 `npm run test`；UI 批必须运行 `npx playwright test`。主任务逐批检查 diff、测试覆盖、solver 证据和浏览器结果后才允许下一批。

## 13. 外部发布边界

代码完成时仍必须如实记录：

- 化学教师审核：`PENDING`；
- 5～8 名目标学生观察测试：`PENDING`；
- 15～30 名完整 MVP 用户测试：`PENDING`；
- 真实 iOS Safari / Android Chrome QA：`PENDING`；
- 远端仓库、域名和部署：未获单独授权时不执行。

本地 build、自动守恒、20/20 solver 和模拟浏览器通过，只能证明代码 MVP 达标，不能替代上述外部门禁。
