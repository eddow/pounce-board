import { test, expect } from '@playwright/test'

test.describe('Minimal App Consumer', () => {
	test.use({ baseURL: 'http://localhost:3000' })

	test('User profile shows middleware context and SSR data', async ({ page }) => {
		// Go to user 123
		await page.goto('/users/123')

		// Wait for the profile box
		const profile = page.locator('#user-profile')
		await expect(profile).toBeVisible()

		// Check name (from API)
		await expect(profile.locator('p:has-text("Name: User 123")')).toBeVisible()

		// Check context info (from middleware)
		await expect(page.locator('#context-info')).toContainText('Auth: admin (root)')

		// Check timestamp (from middleware)
		await expect(page.locator('#timestamp')).toContainText('Time:')
        
        // Check if SSR data script is present (technical verification of hydration source)
        const script = await page.locator('script[id^="pounce-data-"]').count()
        expect(script).toBeGreaterThan(0)
	})

    test('API directly returns context data', async ({ request }) => {
        const res = await request.get('/users/123')
        expect(res.ok()).toBeTruthy()
        const data = await res.json()
        expect(data.contextUser).toEqual({ id: 'admin', role: 'root' })
        expect(data.requestTimestamp).toBeDefined()
    })
})
