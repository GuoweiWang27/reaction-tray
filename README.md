# Reaction Tray / 反应槽

手机优先的化学反应益智游戏。当前仓库处于“开发准备完成、垂直切片待实施”状态；首个交付只覆盖第 1～3 关，不直接批量制作 20 关。

## 当前基线

- React 19 + TypeScript + Vite 静态前端；
- Vitest 内容与领域单元测试；
- Playwright 390 x 844 Chromium/WebKit 骨架；
- 17 条核心反应的结构化机器数据和守恒校验；
- 第 1～3 关精确牌局、遮挡图和标准取牌序列；
- MVP V1.1 规则规格和逐任务实施计划；
- 本地独立 Git 仓库；未创建远端、未部署。

## 开始工作

```bash
nvm use
npm install
npm run check
npm run test:e2e
npm run dev
```

## 权威文档

- 修订规格：`docs/specs/reaction-tray-mvp-spec-v1.1.md`
- 垂直切片计划：`docs/superpowers/plans/2026-08-27-reaction-tray-vertical-slice.md`
- 技术决策：`docs/decisions/0001-project-baseline.md`
- 原始 V1.0：`/Users/yimu/Desktop/chem-reaction-slot-mvp-development-plan-v1.md`（只作来源，不由仓库修改）

## 开发边界

- UI 不决定化学反应；唯一状态转移必须位于纯 TypeScript 引擎。
- 求解器复用生产引擎，不复制规则。
- 内容自动校验通过不等于化学审核完成；前三关目前仍为 `pending`。
- V1.1 明确删除第 7 关“CaCO3 与 HCl 被白名单禁止反应”的错误设计。
- 第一阶段 `shuffle` 次数为 0，避免在任意中途状态下制造未经证明的死局。
