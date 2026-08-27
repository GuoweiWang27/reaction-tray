# ADR 0001：项目与工具基线

日期：2026-08-27

## 决定

- 项目作为 `Guowei/Engineering/projects/reaction-tray` 下的独立 Git 仓库存在，不并入 ChemAI101。
- 使用 React、TypeScript、Vite、Vitest 和 Playwright，不引入后端、账号、AI 或游戏引擎。
- 使用 npm 和 lockfile；Node 要求 `>=22.12.0`，`.nvmrc` 以 major 24 作为本地基线。
- Vite `base` 使用相对路径，使构建产物可放在根域或子路径静态托管。
- 当前只建立本地仓库；GitHub 远端、域名和部署必须另行授权。

## 原因

玩法主要是确定性状态机、DOM 卡牌和短动画。独立仓库可以避免把新游戏与现有 ChemAI101 的 API、部署和维护历史耦合，同时符合 Guowei Engineering 的项目边界。
