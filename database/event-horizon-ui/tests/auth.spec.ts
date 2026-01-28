import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('should display OAuth provider buttons', async ({ page }) => {
        // Verify the logo and title persist
        await expect(page.locator('h1')).toContainText('EventHorizon');

        // Check if both provider buttons are present
        const googleButton = page.getByRole('button', { name: /Continue with Google/i });
        const ssoButton = page.getByRole('button', { name: /Enterprise SSO/i });

        await expect(googleButton).toBeVisible();
        await expect(ssoButton).toBeVisible();
    });

    test('should trigger loading state on Google login click', async ({ page }) => {
        const googleButton = page.getByRole('button', { name: /Continue with Google/i });

        // Click and check for redirect/loading behavior
        await googleButton.click();

        // In our simulation, it redirects to home after 1.2s
        await page.waitForURL('**/');
        await expect(page).toHaveURL(/.*localhost:3000\/$/);
    });

    test('should allow switching to Lattice Secret login', async ({ page }) => {
        const latticeToggle = page.getByRole('button', { name: /Lattice Secret Key/i });
        await latticeToggle.click();

        // Verify form fields for Lattice login
        const passwordInput = page.getByPlaceholder(/•••• •••• •••• ••••/i);
        await expect(passwordInput).toBeVisible();

        // Switch back
        await page.getByRole('button', { name: /Cancel/i }).click();
        await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    });
});
