import { expect, test, type Page } from '@playwright/test'

const clickTiles = async (page: Page, tileIds: string[]) => {
  for (const tileId of tileIds) await page.getByTestId(tileId).click()
}

const activate = async (page: Page, conditionId: string) => {
  await page.getByTestId(`condition-${conditionId}`).click()
}

test('maps all six observable cues to stable labels and shapes', async ({ page }) => {
  const cueCases = [
    { level: 1, tiles: ['l1-h-1', 'l1-oh-1'], kind: 'product', label: '产物生成', marker: 'OUTPUT +' },
    { level: 3, tiles: ['l3-cu-1', 'l3-oh-1', 'l3-oh-2'], kind: 'precipitate', label: '沉淀生成', marker: 'PRECIPITATE ↓' },
    { level: 6, tiles: ['l6-p-01', 'l6-p-02', 'l6-p-03'], kind: 'gas', label: '气体逸出', marker: 'GAS ↑' },
    { level: 8, tiles: ['l8-p-01', 'l8-p-02'], kind: 'metal', label: '金属析出', marker: 'METAL ▰' },
    { level: 10, tiles: ['l10-p-01', 'l10-p-02', 'l10-p-03'], conditionId: 'ignite', kind: 'light', label: '强光反馈', marker: 'LIGHT ✦' },
    { level: 12, tiles: ['l12-p-01', 'l12-p-02'], conditionId: 'light', kind: 'color-change', label: '颜色变化', marker: 'COLOR SHIFT ◐' },
  ]

  for (const cueCase of cueCases) {
    await page.goto(`/?level=${cueCase.level}`)
    await clickTiles(page, cueCase.tiles)
    if (cueCase.conditionId) await activate(page, cueCase.conditionId)
    await expect(page.getByTestId('reaction-effect')).toHaveCount(1)
    await expect(page.getByTestId('reaction-effect')).toHaveAttribute('data-cue-kind', cueCase.kind)
    const cue = page.locator(`.reaction-cue--${cueCase.kind}`)
    await expect(cue).toHaveCount(1)
    await expect(cue.getByText(cueCase.label)).toBeVisible()
    await expect(cue).toContainText(cueCase.marker)
  }
})

test('shows condition lifecycle feedback and derived safety strips', async ({ page }) => {
  const safetyCases = [
    { level: 9, text: /氢气|点燃/ },
    { level: 10, text: /镁|强光/ },
    { level: 12, text: /氯气/ },
    { level: 16, text: /钡盐/ },
    { level: 17, text: /一氧化碳/ },
  ]
  for (const safetyCase of safetyCases) {
    await page.goto(`/?level=${safetyCase.level}`)
    await expect(page.getByTestId('safety-strip')).toContainText(safetyCase.text)
    await expect(page.getByTestId('safety-strip')).toContainText('本游戏只呈现反应关系，不提供实验操作步骤。')
  }

  await page.goto('/?level=9')
  await clickTiles(page, ['l9-p-01', 'l9-p-02', 'l9-p-03'])
  await expect(page.locator('[data-game-status="awaiting-condition"]')).toBeVisible()
  await expect(page.locator('.tray-panel--awaiting')).toHaveCount(1)
  await expect(page.locator('.condition-panel--awaiting')).toHaveCount(1)
  await expect(page.getByTestId('condition-ignite')).toContainText('等待使用')
  await activate(page, 'ignite')
  await expect(page.getByRole('status')).toContainText('点燃')
  await expect(page.getByTestId('condition-ignite')).toHaveAttribute('aria-pressed', 'false')
  await clickTiles(page, ['l9-p-04', 'l9-p-05', 'l9-p-06'])
  await activate(page, 'ignite')
  await expect(page.locator('[data-game-status="won"]')).toBeVisible()

  await page.goto('/?level=11')
  await clickTiles(page, ['l11-p-01', 'l11-p-02'])
  await activate(page, 'mno2')
  await expect(page.getByRole('status')).toContainText('二氧化锰催化')
  await expect(page.getByTestId('condition-mno2')).toHaveAttribute('aria-pressed', 'true')
  await clickTiles(page, ['l11-p-03', 'l11-p-04'])
  await expect(page.locator('[data-game-status="won"]')).toBeVisible()
  await expect(page.getByTestId('condition-mno2')).toHaveClass(/condition-button--active/)
})

test('shows condition and chain feedback while completing L12 and L17', async ({ page }) => {
  await page.goto('/?level=12')
  await clickTiles(page, ['l12-p-01', 'l12-p-02'])
  await activate(page, 'light')
  await expect(page.getByTestId('reaction-effect')).toHaveAttribute('data-cue-kind', 'color-change')
  await expect(page.getByTestId('condition-light')).toHaveAttribute('aria-pressed', 'false')
  await clickTiles(page, ['l12-p-03', 'l12-p-04'])
  await activate(page, 'light')
  await expect(page.locator('[data-game-status="won"]')).toBeVisible()

  await page.goto('/?level=17')
  await clickTiles(page, ['l17-p-01', 'l17-p-02', 'l17-p-03', 'l17-p-04'])
  await activate(page, 'heat')
  await expect(page.getByTestId('reaction-effect')).toHaveAttribute('data-cue-kind', 'metal')
  await expect(page.getByTestId('condition-heat')).toHaveAttribute('aria-pressed', 'false')
  await clickTiles(page, ['l17-p-05', 'l17-p-06', 'l17-p-07', 'l17-p-08'])
  await activate(page, 'heat')
  await expect(page.locator('[data-game-status="won"]')).toBeVisible()
})

test('keeps L19 ordered chain feedback and L20 chronological double history', async ({ page }) => {
  await page.goto('/?level=19')
  await clickTiles(page, ['l19-p-01', 'l19-p-02', 'l19-p-03', 'l19-p-04', 'l19-p-05', 'l19-p-06'])
  await activate(page, 'ignite')
  await clickTiles(page, ['l19-p-07'])
  await expect(page.locator('[data-game-status="won"]')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('反应序列')
  await expect(page.locator('.goal-sequence-row--complete')).toHaveCount(3)

  await page.goto('/?level=20')
  await clickTiles(page, ['l20-p-01', 'l20-p-02', 'l20-p-03', 'l20-p-04'])
  const effect = page.getByTestId('reaction-effect')
  await expect(effect).toHaveCount(1)
  await expect(effect).toHaveAttribute('data-effect-count', '2')
  await expect(effect).toHaveAttribute('data-effect-total', '2')
  await expect(effect.locator('.effect-receipt-item')).toHaveCount(2)
  await expect(effect.locator('.effect-receipt-item').nth(0)).toContainText('Cu(OH)₂')
  await expect(effect.locator('.effect-receipt-item').nth(1)).toContainText('BaSO₄')
  await expect(effect).toContainText('Cu(OH)₂')
  await expect(effect).toContainText('BaSO₄')
})

test('connects L15 teaching feedback and reports rejected clipboard writes', async ({ page }) => {
  await page.goto('/?level=15')
  await clickTiles(page, ['l15-p-01', 'l15-p-02', 'l15-p-03', 'l15-p-04', 'l15-p-05', 'l15-p-06'])
  await expect(page.locator('[data-game-status="won"]')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('分子式')
  await expect(page.getByRole('status')).toContainText('Cu²⁺ + 2OH⁻')

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('clipboard denied') } },
    })
  })
  await page.goto('/?level=1')
  await clickTiles(page, ['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3'])
  await page.getByTestId('share-result').click()
  await expect(page.getByRole('status')).toContainText('复制失败')
  await expect(page.getByRole('status')).not.toContainText('成绩已复制')
})

test('does not create AudioContext while sound is off', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, '__reactionTrayAudioContextCount', { configurable: true, writable: true, value: 0 })
    class AudioContextProbe {
      constructor() {
        ;(window as Window & { __reactionTrayAudioContextCount?: number }).__reactionTrayAudioContextCount! += 1
      }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: AudioContextProbe })
  })
  await page.goto('/?level=1')
  await clickTiles(page, ['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3'])
  expect(await page.evaluate(() => (window as Window & { __reactionTrayAudioContextCount?: number }).__reactionTrayAudioContextCount)).toBe(0)
})
