import { test, expect } from '@playwright/test'

test('homepage loads without crash', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Homegrown/)
  await expect(page.locator('header')).toBeVisible()
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()
})

test('empty state shows correct message', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/check back soon/i)).toBeVisible()
})
