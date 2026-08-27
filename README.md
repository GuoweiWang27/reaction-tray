# Reaction Tray / 反应槽

手机优先的化学反应益智游戏。本仓库当前交付的是本地可运行的 20 关 code MVP：四章、结构化物质与反应、纯 TypeScript 游戏引擎、求解器和 CHEMAI101 暖纸实验记录本界面。

## 四章内容

- 第 1 章：比例与沉淀（L1–L5）
- 第 2 章：气体与置换（L6–L10）
- 第 3 章：条件控制（L11–L15）
- 第 4 章：链式综合（L16–L20）

20 关均由 `src/content/levels/` 的 canonical level 数据驱动；内容校验、生产引擎和 solver 共同验证标准解。化学教师审核、目标学生观察、真实 iOS/Android QA 和公开发布仍是独立的 `PENDING` 外部门禁。

## 本地开发

```bash
npm ci
npm run check
npm run test:e2e
npm test -- tests/unit/solver.test.ts
npm run dev
```

这是 local-only 静态前端 MVP：不包含后端、登录、云排行榜、AI 接口或部署配置；本仓库不执行 push 或 deploy。`npm run check` 包含 typecheck、lint、unit、content validation 和 production build。

## 权威文档

- [20 关产品设计（content、领域语义、交互和外部门禁）](docs/superpowers/specs/2026-08-27-reaction-tray-20-level-design.md)
- [20 关实施计划与逐批门禁](docs/superpowers/plans/2026-08-27-reaction-tray-20-level-mvp.md)
- [CHEMAI101 UI/UX SSOT](docs/specs/uiux-ssot-v1.md)
- [Reaction Tray MVP V1.1 历史规格](docs/specs/reaction-tray-mvp-spec-v1.1.md)
- [20 关验证报告](docs/verification/20-level-mvp-report.md)

20 关设计决定新增章节、目标、评分、提示、链式反馈和安全区；UI/UX SSOT 继续决定暖纸视觉、无障碍、键盘、音效与移动端契约。V1.1 中前三关的化学决策保留为历史记录，但其“三关优先”的 content scope 已由批准的 20-level design supersede；详见 V1.1 文件中的醒目范围说明。

## 工程边界

- UI 不决定化学反应；唯一状态转移位于纯 TypeScript 引擎。
- 求解器复用生产引擎，不复制规则；提示从当前状态重新求解。
- 反应和关卡自动校验通过不等于化学审核完成；发布前外部门禁仍保持 `PENDING`。
