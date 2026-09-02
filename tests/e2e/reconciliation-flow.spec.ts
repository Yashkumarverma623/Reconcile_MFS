import { test, expect } from '@playwright/test';

test.describe('Reconcile Full E2E Workflow Spec', () => {
  const testEmail = `e2e-${Date.now()}@example.com`;

  test('Complete End-to-End User Flow', async ({ page }) => {
    // 1. Register User & Organization
    await page.goto('http://localhost:3000/register');
    await page.fill('input[placeholder="Jane Doe"]', 'E2E Tester');
    await page.fill('input[placeholder="jane@company.com"]', testEmail);
    await page.fill('input[placeholder="Acme Financials"]', 'E2E Test Corp');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to /dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('h1')).toContainText('Reconciliation Operations');

    // 2. Data Sources Page
    await page.goto('http://localhost:3000/data-sources');
    await page.click('button:has-text("Add Data Source")');
    await page.fill('input[placeholder="e.g. Stripe Gateway CSV"]', 'Gateway CSV Source');
    await page.click('button:has-text("Save Data Source")');
    await expect(page.locator('h3:has-text("Gateway CSV Source")')).toBeVisible();

    // 3. Exceptions Workbench Page
    await page.goto('http://localhost:3000/exceptions');
    await expect(page.locator('h1')).toContainText('Exception Management');

    // 4. Analytics Dashboard Page
    await page.goto('http://localhost:3000/analytics');
    await expect(page.locator('h1')).toContainText('Reconciliation Analytics');

    // 5. Settings Page
    await page.goto('http://localhost:3000/settings');
    await expect(page.locator('td:has-text("E2E Tester")')).toBeVisible();
  });
});
