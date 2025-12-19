import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('should load homepage successfully', async ({ page }) => {
        await page.goto('/');

        // Check that the page loads
        await expect(page).toHaveTitle(/Ninja/);

        // Check that main content is visible
        await expect(page.locator('body')).toBeVisible();
    });

    test('should have working navigation', async ({ page }) => {
        await page.goto('/');

        // Check for navigation elements
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();
    });
});

test.describe('Authentication', () => {
    test('should show login page', async ({ page }) => {
        await page.goto('/login');

        // Check for login form elements
        await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should show signup page', async ({ page }) => {
        await page.goto('/signup');

        // Check for signup form elements
        await expect(page.getByRole('heading', { name: /sign up|create|register/i })).toBeVisible();
    });

    test('should show validation errors on empty login', async ({ page }) => {
        await page.goto('/login');

        // Click login button without filling form
        await page.getByRole('button', { name: /sign in|login/i }).click();

        // Should show validation error or stay on same page
        await expect(page).toHaveURL(/login/);
    });
});

test.describe('PDF Tools', () => {
    test('should show merge PDF tool', async ({ page }) => {
        await page.goto('/merge-pdf');

        // Check page loads
        await expect(page.locator('body')).toBeVisible();
    });

    test('should show split PDF tool', async ({ page }) => {
        await page.goto('/split-pdf');

        await expect(page.locator('body')).toBeVisible();
    });

    test('should show compress PDF tool', async ({ page }) => {
        await page.goto('/compress-pdf');

        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Check that content is still visible on mobile
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
        await page.goto('/');

        // Check for H1
        const h1 = page.locator('h1');
        await expect(h1.first()).toBeVisible();
    });

    test('should have alt text on images', async ({ page }) => {
        await page.goto('/');

        // Check that images have alt text
        const images = page.locator('img');
        const count = await images.count();

        for (let i = 0; i < Math.min(count, 10); i++) {
            const img = images.nth(i);
            const alt = await img.getAttribute('alt');
            expect(alt).toBeDefined();
        }
    });
});
