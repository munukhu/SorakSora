import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Failure Handling & Artifacts Verification', () => {
  test('should handle non-existent routes with clean 404 status without unhandled routing errors', async ({ page }) => {
    // Navigate to a non-existent route to verify clean 404 handling
    const response = await page.goto('/_non_existent_page_e2e_test_route_');
    
    // Server should return 404 status code cleanly
    expect(response?.status()).toBe(404);

    // Verify deprecated /random route returns 404 cleanly without redirect
    const randomRes = await page.goto('/random');
    expect(randomRes?.status()).toBe(404);

    // Verify 404 page is rendered cleanly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should capture page screenshots reliably without routing or file system errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SorakSora!/);

    const artifactDir = path.join(process.cwd(), 'test-results', 'artifacts');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    const screenshotPath = path.join(artifactDir, 'e2e-homepage-verification.png');

    // Take screenshot to ensure screenshot pipeline functions cleanly
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Verify screenshot file exists and has content
    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(1000);
  });
});
