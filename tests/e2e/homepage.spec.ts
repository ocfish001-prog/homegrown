import { test, expect } from '@playwright/test'

test('homepage loads without crash', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Homegrown/)
  await expect(page.locator('main')).toBeVisible()
})

test('empty state or events grid renders', async ({ page }) => {
  await page.goto('/')
  // Either events load, or a loading/empty state is shown — page should not be blank
  await expect(page.locator('main')).toBeVisible()
  // The section heading always renders
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible()
})
