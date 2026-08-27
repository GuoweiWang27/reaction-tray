import { expect, test, type Page } from '@playwright/test'

const solveLevelOne = async (page: Page) => {
  for (const tileId of ['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3']) {
    await page.getByTestId(tileId).click()
  }
}

test('navigates four chapters, five levels, direct URLs, and invalid URLs', async ({ page }) => {
  await page.goto('/?level=20')
  await expect(page.getByRole('heading', { name: '双沉淀终局' })).toBeVisible()
  await expect(page.locator('[data-testid^="chapter-tab-"]')).toHaveCount(4)
  await expect(page.locator('.level-grid [data-testid^="level-button-"]')).toHaveCount(5)

  await page.getByTestId('chapter-tab-1').click()
  await expect(page.getByRole('heading', { name: '第一滴水' })).toBeVisible()
  await page.goto('/?level=999')
  await expect(page.getByRole('heading', { name: '第一滴水' })).toBeVisible()
})

test('validates tile and condition hints and consumes only available hint uses', async ({ page }) => {
  await page.goto('/?level=1')
  await page.getByTestId('hint-button').click()
  await expect(page.getByTestId('hint-button')).toHaveAccessibleName(/1\/2/)
  await expect(page.locator('[data-hint-focus="tile"]')).toHaveCount(1)
  await expect(page.getByRole('status')).toContainText('提示')
  await page.getByTestId('hint-button').click()
  await expect(page.getByTestId('hint-button')).toHaveAccessibleName(/0\/2/)
  await expect(page.getByTestId('hint-button')).toBeDisabled()

  await page.goto('/?level=9')
  for (const tileId of ['l9-p-01', 'l9-p-02', 'l9-p-03']) await page.getByTestId(tileId).click()
  await page.getByTestId('hint-button').click()
  await expect(page.getByTestId('hint-button')).toHaveAccessibleName(/1\/2/)
  await expect(page.locator('[data-hint-focus="condition"]')).toHaveCount(1)
  await expect(page.getByTestId('condition-ignite')).toHaveAttribute('data-hint-focus', 'condition')
})

test('persists stars and best results, handles corrupt storage, and shares exact stars', async ({ page }) => {
  await page.addInitScript(() => {
    const copied: string[] = []
    Object.defineProperty(window, '__reactionTrayCopied', { configurable: true, value: copied })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => copied.push(text) },
    })
  })
  await page.goto('/?level=1')
  await solveLevelOne(page)
  await expect(page.locator('.outcome-stars')).toHaveText('★★★')
  await page.getByTestId('share-result').click()
  await expect(page.getByRole('status')).toContainText('成绩已复制')
  const copied = await page.evaluate(() => (window as Window & { __reactionTrayCopied?: string[] }).__reactionTrayCopied)
  expect(copied).toEqual([
    'REACTION TRAY L1 · 6 MOVES · ★★★ · COMPLETE',
  ])

  await page.reload()
  await expect(page.locator('[data-testid="level-button-1"]')).toContainText('BEST 6')
  await page.evaluate(() => window.localStorage.setItem('reaction-tray.progress.v2', '{bad json'))
  await page.reload()
  await expect(page.locator('[data-testid="level-button-1"]')).not.toContainText('CLEARED')
})
