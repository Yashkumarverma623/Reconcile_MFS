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
    await expect(page.locator('h1')).toContainText('Reconciliation Workbench');

    // 2. Data Sources Page
    await page.goto('http://localhost:3000/data-sources');
    await page.click('button:has-text("Add Connector")');
    await page.fill('input[placeholder="e.g. Gateway CSV Report"]', 'Gateway CSV Source');
    await page.click('button:has-text("Save Connector")');
    await expect(page.locator('span:has-text("Gateway CSV Source")')).toBeVisible();

    // 3. Exceptions Workbench Page
    await page.goto('http://localhost:3000/exceptions');
    await expect(page.locator('h1')).toContainText('Exception Investigation Queue');

    // 4. Analytics Dashboard Page
    await page.goto('http://localhost:3000/analytics');
    await expect(page.locator('h1')).toContainText('Operational Analytics');

    // 5. Settings Page
    await page.goto('http://localhost:3000/settings');
    await expect(page.locator('td:has-text("E2E Tester")')).toBeVisible();
  });
});
