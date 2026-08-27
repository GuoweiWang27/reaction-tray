# Pre-development Baseline Verification

日期：2026-08-27

## 已执行

- `npm install`：PASS；安装并审计 63 个包，0 个已知漏洞。
- `npm run check`：PASS。
  - TypeScript project build：PASS。
  - Oxlint：PASS。
  - Vitest：1 个测试文件、3 个测试通过。
  - 内容校验：37 种物质、17 条反应、3 个垂直切片关卡通过。
  - Vite production build：PASS；JS gzip 60.60 kB，CSS gzip 0.46 kB。
- `npm run test:e2e`：PASS；移动 Chromium 1/1、移动 WebKit 1/1。

## 过程事实

首次运行 E2E 时 Playwright 浏览器二进制不存在，Chromium/WebKit 均失败。执行 `npx playwright install chromium webkit` 后重跑，2/2 通过。该失败属于本地测试环境准备，不是页面断言失败。

## 当前未完成

- 纯 TypeScript 游戏引擎尚未实施；
- 求解器尚未实施，因此当前标准解只验证 tile 引用与遮挡顺序，不构成完整可解性证明；
- 化学内容仍为 `pending`，自动守恒不等于教师审核；
- 当前页面是开发基线页，不是游戏 UI；
- 未做目标学生观察测试、真实 iOS/Android 设备测试、GitHub 远端或部署。
