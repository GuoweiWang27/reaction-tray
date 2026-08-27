import { expect, test } from '@playwright/test'

test('level 3 resolves two 1:2 reactions and completes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /选择第 3 关/ }).click()
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2']) await page.getByTestId(name).click()
  await expect(page.getByTestId('reaction-effect')).toHaveAttribute('data-cue-kind', 'precipitate')
  await expect(page.getByTestId('reaction-effect')).toHaveAttribute('data-effect-total', '1')
  await expect(page.getByTestId('reaction-effect')).toContainText('沉淀生成')
  for (const name of ['l3-cu-2', 'l3-oh-3', 'l3-oh-4']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡完成')
  await expect(page.getByText('2 / 2')).toBeVisible()
  await expect(page.getByTestId('reaction-effect')).toHaveAttribute('data-effect-total', '2')
  await page.getByRole('button', { name: '再做一次' }).click()
  await expect(page.getByTestId('reaction-effect')).toHaveCount(0)
})

test('undo restores the selection and automatic reaction together', async ({ page }) => {
  await page.goto('/?level=3')
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2']) await page.getByTestId(name).click()
  await expect(page.getByTestId('reaction-effect')).toHaveCount(1)
  await page.getByRole('button', { name: /撤回上一步/ }).click()
  await expect(page.getByText('0 / 2')).toBeVisible()
  await expect(page.getByTestId('l3-oh-2')).toBeEnabled()
  await expect(page.getByTestId('reaction-effect')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('已撤回')
})

test('level 1 completes with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('/?level=1')
  for (const name of ['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡完成')
  await expect(page.getByText('3 / 3')).toBeVisible()
  await expect(page.getByTestId('reaction-effect')).toHaveAttribute('data-cue-kind', 'product')
  await expect(page.getByTestId('reaction-effect')).toContainText('产物生成')
  await context.close()
})

test('reaction effect receipt clears when switching levels', async ({ page }) => {
  await page.goto('/?level=3')
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2']) await page.getByTestId(name).click()
  await expect(page.getByTestId('reaction-effect')).toBeVisible()
  await page.getByRole('button', { name: /选择第 1 关/ }).click()
  await expect(page.getByTestId('reaction-effect')).toHaveCount(0)
})

test('level 3 keeps the lower layer physically overlapped and under the upper layer', async ({ page }) => {
  await page.goto('/?level=3')
  const upper = page.getByTestId('l3-cu-1')
  const lower = page.getByTestId('l3-oh-2')
  const upperBox = await upper.boundingBox()
  const lowerBox = await lower.boundingBox()
  expect(upperBox).not.toBeNull()
  expect(lowerBox).not.toBeNull()
  expect(lowerBox!.y).toBeLessThan(upperBox!.y + upperBox!.height)
  expect(lowerBox!.x).toBeLessThan(upperBox!.x + upperBox!.width)
  const zIndexes = await page.evaluate(() => {
    const upperTile = document.querySelector('[data-testid="l3-cu-1"]')
    const lowerTile = document.querySelector('[data-testid="l3-oh-2"]')
    return {
      upper: Number(upperTile && getComputedStyle(upperTile).zIndex),
      lower: Number(lowerTile && getComputedStyle(lowerTile).zIndex),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })
  expect(zIndexes.upper).toBeGreaterThan(zIndexes.lower)
  expect(zIndexes.documentWidth).toBeLessThanOrEqual(zIndexes.viewportWidth)
})

test('level 3 exposes failure and supports a clean retry', async ({ page }) => {
  await page.goto('/?level=3')
  for (const name of ['l3-decoy-h-1', 'l3-decoy-cl-1', 'l3-oh-1', 'l3-decoy-h-2', 'l3-decoy-cl-2', 'l3-oh-3', 'l3-decoy-cl-3']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡失败')
  await expect(page.getByRole('button', { name: '重新开始' })).toBeVisible()
  await page.getByRole('button', { name: '重新开始' }).click()
  await expect(page.getByText('0 / 2')).toBeVisible()
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2', 'l3-cu-2', 'l3-oh-3', 'l3-oh-4']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡完成')
  await expect(page.getByText('2 / 2')).toBeVisible()
})
