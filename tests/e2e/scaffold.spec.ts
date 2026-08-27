import { expect, test } from '@playwright/test'

test('development baseline renders at mobile width', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '《反应槽》开发准备完成' })).toBeVisible()
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll')
})
