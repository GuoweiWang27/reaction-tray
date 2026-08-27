import { expect, test } from '@playwright/test'

test('level 3 resolves two 1:2 reactions and completes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /选择第 3 关/ }).click()
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2', 'l3-cu-2', 'l3-oh-3', 'l3-oh-4']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡完成')
  await expect(page.getByText('2 / 2')).toBeVisible()
})

test('undo restores the selection and automatic reaction together', async ({ page }) => {
  await page.goto('/?level=3')
  for (const name of ['l3-cu-1', 'l3-oh-1', 'l3-oh-2']) await page.getByTestId(name).click()
  await page.getByRole('button', { name: /撤回上一步/ }).click()
  await expect(page.getByText('0 / 2')).toBeVisible()
  await expect(page.getByTestId('l3-oh-2')).toBeEnabled()
  await expect(page.getByRole('status')).toContainText('已撤回')
})

test('level 1 completes with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('/?level=1')
  for (const name of ['l1-h-1', 'l1-oh-1', 'l1-h-2', 'l1-oh-2', 'l1-h-3', 'l1-oh-3']) await page.getByTestId(name).click()
  await expect(page.getByRole('status')).toContainText('关卡完成')
  await expect(page.getByText('3 / 3')).toBeVisible()
  await context.close()
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
