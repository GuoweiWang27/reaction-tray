import { expect, test, type Page } from '@playwright/test'
import { levels } from '../../src/content/levels'

const replayStandardSolution = async (page: Page, order: number) => {
  const level = levels[order - 1]
  await page.goto(`/?level=${order}`)
  for (const step of level.standardSolutionSteps) {
    if (step.type === 'select-tile') await page.getByTestId(step.tileId).click()
    else await page.getByTestId(`condition-${step.conditionId}`).click()
  }
  await expect(page.locator('[data-game-status="won"]')).toBeVisible()
}

test('completes canonical standard solutions with browser-specific coverage', async ({ page }, testInfo) => {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  const orders = testInfo.project.name === 'mobile-chromium'
    ? levels.map((level) => level.order)
    : [3, 9, 11, 19, 20]
  for (const order of orders) await replayStandardSolution(page, order)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
