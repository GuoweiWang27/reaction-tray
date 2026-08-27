# Reaction Tray 关卡与卡片 UI/UX 精修计划

> 日期：2026-08-28
>
> 权威源：`docs/specs/uiux-ssot-v1.md` v1.2
>
> 实施方式：Luna Max 分两批实施，主任务逐批复核；每批从干净提交开始，测试绿后提交。

## 1. 目标与边界

本轮只解决两个已由实机截图确认的问题：

1. 章节/关卡选择区层级重复，五关出现 3+2 残缺栅格，通关成绩使按钮高度和节奏失衡；
2. 样本卡的 `OPEN / formula / 中文名 / phase` 四层信息权重过近，被遮挡牌仍露出大量文字，导致棋盘噪声偏高。

设计方向固定为 CHEMAI101 暖纸体系中的“实验册索引 + 标本标签卡”。不换整体信息架构，不引入组件库、图片资产或新依赖。

允许修改：

- `src/game/components/ChapterNavigator.tsx`
- `src/game/GameScreen.tsx`
- `src/game/game.css`

禁止修改：

- `src/game/engine.ts`
- `src/game/solver.ts`
- `src/content/*`
- tests、构建配置、依赖、进度存储结构

必须保留全部现有 `data-testid`、`data-cue-kind`、`data-effect-count`、`data-effect-total`、键盘操作、遮挡提示、目标联动和 reduced-motion 契约。

## 2. 批次 A：五联实验索引

实现：

- 4 个 chapter tab 降低视觉重量，但保留四等分和 tab 语义；
- 每章 5 关固定为单行五联同尺寸索引，不出现 3+2 换行；
- 按钮可见内容改为两位编号、短标题、状态点/短状态，移除“选择第 N 关”重复文案；
- 关卡按钮下新增当前关摘要，展示完整标题和最佳步数/星级，按钮本身高度不受成绩影响；
- 360/375/390/480px 无横向溢出，长标题截断而非撑宽。

验收：

- chapter tabs 数量 4，当前章 level buttons 数量 5；
- 5 个按钮 bounding box 等宽、等高、同一行；
- L19 active 与 L20 cleared 状态可同时辨认；L20 成绩不改变按钮高度；
- `aria-label`、`aria-pressed`、chapter `aria-selected` 与全部既有 testid 不变；
- `npm run check`、`npm run test:e2e` 通过后提交，建议 commit：`feat: refine chapter level index`。

## 3. 批次 B：标本标签卡

实现：

- tile 顶部状态行改为低权重的状态点 + `READY / COVERED`；
- formula 成为唯一一级信息；中文名和 `AQ / S / L / G` 合并为底部 metadata footer；
- locked 卡降低 footer 对比、增加轻微纸张压痕，open/locked 仍有文字或形状差异；
- 保留牌局绝对坐标、尺寸变量、z-index、遮挡关系和所有 interaction class；
- hover/focus、solver hint、target reactant、blocking、reduced-motion 状态继续清楚且互不覆盖。

验收：

- L3、L10、L17、L19、L20 棋盘无文字溢出、牌面内部重叠或横向溢出；
- 被遮挡牌仍可识别公式，但 footer 不从卡缝中形成高对比噪声；
- OPEN/COVERED 的中文可访问语义、锁定牌 focus/click 提示、方向键操作保持；
- `tile-id` 动态 testid 与 reaction-effect 属性契约原样保留；
- 所有新动画在 `prefers-reduced-motion` 下为 `none`；
- `npm run check`、`npm run test:e2e`、逐关 solver 20/20 通过后提交，建议 commit：`feat: refine specimen card hierarchy`。

## 4. 主审最终验收

- 对比 390px 的 L19/L20 关卡索引与 L19 样本区；
- 360×844、375×667、390×844 三档截图和 `scrollWidth === innerWidth`；
- computed style 检查最小字号不低于 10px；
- 浏览器 console/page errors 为 0；
- fresh `npm run check && npm run test:e2e && npm test -- tests/unit/solver.test.ts`；
- `git diff --check` 无输出，工作树 clean；
- 不 push、不 deploy。
