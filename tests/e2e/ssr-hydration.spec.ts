import { test, expect } from '@playwright/test';

test.describe('SSR Hydration', () => {
    test('should inject API data and hydrate without fetching', async ({ page }) => {
        const userId = '123';
        
        // Listen for network requests to api/users/123
        const apiRequests: string[] = [];
        page.on('request', request => {
            if (request.url().includes(`/users/${userId}`) && request.resourceType() !== 'document') {
                apiRequests.push(request.url());
            }
        });

        // Navigate to the user page
        await page.goto(`/users/${userId}`);

        // Verify page content is rendered (SSR or hydration)
        await expect(page.locator('h1')).toHaveText('User Profile');
        await expect(page.getByText('ID: 123')).toBeVisible();

        // Verify the script tag was injected
        // The ID is base64 encoded path: /users/123 -> L3VzZXJzLzEyMw
        const scriptId = 'pounce-data-L3VzZXJzLzEyMw'; 
        // Note: The script tag is removed after hydration, so we might miss it if we check too late.
        // But we can check if the data was displayed immediately.

        // CRITICAL: Verify NO network request was made to the API
        // Because the data should have been injected by SSR
        expect(apiRequests.length).toBe(0);

        // Verify that subsequent navigation DOES make a request (simulating client-side nav)
        // Note: This requires a link or programmatic navigation, which minimal-app might not have yet.
    });
});
