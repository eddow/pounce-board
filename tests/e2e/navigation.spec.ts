import { test, expect } from '@playwright/test'

test.describe('Minimal App Navigation', () => {
	test.use({ baseURL: 'http://localhost:3000' })

	test('Root page loads correctly', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('h1')).toHaveText('Index Page')
		await expect(page.locator('text=Welcome to the minimal app!')).toBeVisible()
	})

	test('Navigate to user profile', async ({ page }) => {
		await page.goto('/')
		await page.click('text=View User 1')

		// Wait for navigation and verify URL
		await expect(page).toHaveURL(/\/users\/1$/)

		// Verify content
		await expect(page.locator('h1')).toHaveText('User Profile')
		await expect(page.locator('text=Name: User 1')).toBeVisible()
	})

	test('Browser back/forward navigation', async ({ page }) => {
		await page.goto('/')
		await page.click('text=View User 1')
		await expect(page).toHaveURL(/\/users\/1$/)

		await page.goBack()
		await expect(page).toHaveURL(/\/$/)
		await expect(page.locator('h1')).toHaveText('Index Page')

		await page.goForward()
		await expect(page).toHaveURL(/\/users\/1$/)
		await expect(page.locator('h1')).toHaveText('User Profile')
	})

	test('Navigate to user list', async ({ page }) => {
		await page.goto('/users/list')
		await expect(page.locator('h1')).toHaveText('User List')
		await expect(page.locator('text=User 1')).toBeVisible()
	})

	test('404 behavior for unknown route', async ({ page }) => {
		const response = await page.goto('/unknown-route')

		// Currently server returns 200 OK for fallback index.html
		expect(response?.status()).toBe(200)

		// Client router doesn't match, so root should be empty
		const rootText = await page.locator('#root').innerText()
		expect(rootText.trim()).toBe('')
	})
})
