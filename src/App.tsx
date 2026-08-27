import './App.css'

function App() {
  return (
    <main className="readiness-shell">
      <p className="eyebrow">REACTION TRAY · DEVELOPMENT BASELINE</p>
      <h1>《反应槽》开发准备完成</h1>
      <p className="lede">当前只冻结第 1～3 关垂直切片。规则、化学数据、牌局契约和验证门已经进入仓库。</p>
      <section aria-labelledby="baseline-title">
        <h2 id="baseline-title">基线状态</h2>
        <ul>
          <li>17 条核心反应：结构化并通过自动守恒测试</li>
          <li>第 1～3 关：固定牌局、遮挡图与标准解已定义</li>
          <li>核心引擎与求解器：按实施计划进入 TDD</li>
          <li>GitHub 远端与部署：尚未创建</li>
        </ul>
      </section>
    </main>
  )
}

export default App
