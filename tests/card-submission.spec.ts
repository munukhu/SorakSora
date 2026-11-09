import { test, expect } from '@playwright/test';
import { purgeTestMessages } from './test-cleanup';

test.describe('Card Submission Flow', () => {
  test.afterEach(async ({ request }) => {
    await purgeTestMessages(request);
  });
  test('should display startup welcome modal on first visit and dismiss properly', async ({ page }) => {
    // Brand new user visit: ensure no dismissed flag in localStorage
    await page.addInitScript(() => {
      localStorage.removeItem('showup_welcome_dismissed');
    });

    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    const enterBtn = page.locator('#enter-wall-btn');
    await expect(enterBtn).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1')).toContainText(/SorakSora!/i);

    // Click to dismiss
    await enterBtn.click();
    await expect(enterBtn).not.toBeVisible();
  });

  test('should submit a named note with custom color cycle and display it on the wall', async ({ page }) => {
    // Dismiss welcome modal
    await page.addInitScript(() => {
      localStorage.setItem('showup_welcome_dismissed', 'true');
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/SorakSora!/);
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    const dockBtn = page.locator('#dock-drop-cheer-btn');
    await expect(dockBtn).toBeVisible();

    // Open Drop Cheer modal
    await dockBtn.click();

    // Verify modal is visible
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toContainText(/KIRIM DUKUNGAN/i);

    // Test Palette Cycler Button
    const paletteBtn = modal.locator('button[title^="Ganti Warna Note"]');
    await expect(paletteBtn).toBeVisible();
    const initialTitle = await paletteBtn.getAttribute('title');

    // Click palette button to cycle color
    await paletteBtn.click();
    const nextTitle = await paletteBtn.getAttribute('title');
    expect(nextTitle).not.toBe(initialTitle);

    // Fill form fields
    const uniqueId = Date.now();
    const authorName = `Kawan Antigravity ${uniqueId}`;
    const cheerMessage = `Semangat terus meraih mimpi dan pantang menyerah! [ID: ${uniqueId}]`;

    const nameInput = modal.locator('#cheer-sender-name');
    const messageInput = modal.locator('#cheer-message-text');

    await nameInput.fill(authorName);
    await messageInput.fill(cheerMessage);

    // Submit note
    const submitBtn = modal.locator('#pin-to-wall-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify note appears on corkboard wall
    const submittedCard = page.locator('.board-note', { hasText: cheerMessage });
    await expect(submittedCard).toBeVisible({ timeout: 10000 });
    await expect(submittedCard).toContainText(authorName);
  });

  test('should submit an anonymous note successfully', async ({ page }) => {
    // Dismiss welcome modal
    await page.addInitScript(() => {
      localStorage.setItem('showup_welcome_dismissed', 'true');
    });

    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    const dockBtn = page.locator('#dock-drop-cheer-btn');
    await expect(dockBtn).toBeVisible();
    await dockBtn.click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Toggle anonymous switch
    const anonSwitch = modal.locator('button[role="switch"]');
    await expect(anonSwitch).toBeVisible();
    await anonSwitch.click();
    await expect(anonSwitch).toHaveAttribute('aria-checked', 'true');

    // Verify name input is disabled and set to Anonim
    const nameInput = modal.locator('#cheer-sender-name');
    await expect(nameInput).toBeDisabled();
    await expect(nameInput).toHaveValue('Anonim');

    // Fill message
    const uniqueId = Date.now();
    const cheerMessage = `Dukungan tulus penuh doa dari teman rahasia [ID: ${uniqueId}]`;
    const messageInput = modal.locator('#cheer-message-text');
    await messageInput.fill(cheerMessage);

    // Submit
    const submitBtn = modal.locator('#pin-to-wall-btn');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify modal closes
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify note is displayed with author Anonim
    const submittedCard = page.locator('.board-note', { hasText: cheerMessage });
    await expect(submittedCard).toBeVisible({ timeout: 10000 });
    await expect(submittedCard).toContainText('Anonim');
  });
});
