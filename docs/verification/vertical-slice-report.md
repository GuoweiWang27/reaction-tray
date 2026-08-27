# Vertical Slice Verification

## 可执行门禁

- 日期：2026-08-27
- Verified code commit：`38f7cb893274828f7daa1bdab01f27b3e392882d`（本报告验证的实现提交）
- `npm run check`：PASS
  - TypeScript 类型检查：PASS
  - Oxlint：PASS
  - Vitest：4 个测试文件，16/16 通过
  - 内容校验：37 species、17 reactions、3 levels
  - 生产构建：PASS
- `npm run test:e2e`：PASS
  - 移动 Chromium：6/6
  - 移动 WebKit：6/6
  - 合计：12/12
  - 运行输出中的 `NO_COLOR` / `FORCE_COLOR` 为 Node 环境 warning，不影响测试结果

## Solver 验证

使用生产 `solveLevel`，每关从 fresh 初始状态运行，参数为 `maxNodes: 100000`、`timeoutMs: 2000`：

| 关卡 | status | path length | visitedNodes |
| --- | --- | ---: | ---: |
| level.01.first-water | solved | 6 | 25 |
| level.02.silver-mist | solved | 6 | 166 |
| level.03.blue-precipitate | solved | 6 | 166 |

## 移动视觉与 Console QA

- Playwright 390×844：PASS；无横向溢出，叠层卡牌具有实际空间重叠，层级顺序正确，公式/名称可识别，Console errors 为 0。
- Playwright 360×844：PASS；无横向溢出，叠层卡牌可操作性与可读性保持，Console errors 为 0。
- Effect cue、撤回/重开/切关清除、reduced-motion 和两类失败反馈均由自动化回归覆盖。

## 外部审核与发布边界

代码 MVP 已完成并通过上述可执行门禁。这不等同于对外发布批准，也不等同于扩展至 20 关的产品验收；对外发布或扩展前仍需完成以下外部门禁：

- 化学教师签字：PENDING。自动守恒与 solver 结果不能替代化学教师审核。
- 5–8 名学生观察测试：PENDING。当前不声明任何真实参与者结果。
- 真实 iOS/Android 设备 QA：PENDING。Playwright 移动 Chromium/WebKit 仿真不能冒充真实设备结果。

本轮未创建远端、未部署。
