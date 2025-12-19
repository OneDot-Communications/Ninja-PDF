import { test, expect } from '@playwright/test';

test.describe('RBAC Access Control', () => {

    test('Admin can access admin dashboard', async ({ page }) => {
        // Navigate to login
        await page.goto('/login');

        // Fill login form (assuming mock or seed data)
        await page.fill('input[name="email"]', 'admin@ninja.com'); // Seeded admin
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard');

        // Navigate to Admin pages
        await page.goto('/admin');
        await expect(page).toHaveURL(/.*admin/);
        await expect(page.locator('h1')).toContainText('Admin Dashboard');
    });

    test('Regular user cannot access admin pages', async ({ page }) => {
        // Navigate to login
        await page.goto('/login');

        // Fill login form
        await page.fill('input[name="email"]', 'user@ninja.com');
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Wait for redirect to dashboard
        await page.waitForURL('**/dashboard');

        // Try to go to admin
        await page.goto('/admin');

        // Should be redirected back or show 403
        // Expect URL not to be admin or see "Access Denied"
        // await expect(page).not.toHaveURL(/.*admin/); 
        // OR
        await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 5000 }).catch(() => {
            // If redirected
            expect(page.url()).not.toContain('/admin');
        });
    });

});
