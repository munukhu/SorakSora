import { test, expect } from '@playwright/test';

test.describe('Mobile Viewport & Responsive Layout Verification (320px)', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('should display DropCheerModal and palette cycler button cleanly on 320px viewport without clipping or horizontal overflow', async ({ page }) => {
    // Dismiss welcome modal
    await page.addInitScript(() => {
      localStorage.setItem('showup_welcome_dismissed', 'true');
    });

    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    // Verify no horizontal document overflow on 320px screen
    const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docScrollWidth).toBeLessThanOrEqual(320);

    // Open Drop Cheer modal
    const dockBtn = page.locator('#dock-drop-cheer-btn');
    await expect(dockBtn).toBeVisible();
    await dockBtn.click();

    // Verify modal is visible
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Check modal bounds fit inside 320px viewport
    const modalBox = await modal.boundingBox();
    expect(modalBox).not.toBeNull();
    if (modalBox) {
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(320);
    }

    // Verify Palette Cycler Button is visible and fully on screen
    const paletteBtn = modal.locator('button[title^="Ganti Warna Note"]');
    await expect(paletteBtn).toBeVisible();

    const paletteBox = await paletteBtn.boundingBox();
    expect(paletteBox).not.toBeNull();
    if (paletteBox) {
      expect(paletteBox.x).toBeGreaterThan(0);
      expect(paletteBox.x + paletteBox.width).toBeLessThanOrEqual(320);
    }

    // Click palette button to cycle color
    const initialTitle = await paletteBtn.getAttribute('title');
    await paletteBtn.click();
    const nextTitle = await paletteBtn.getAttribute('title');
    expect(nextTitle).not.toBe(initialTitle);

    // Verify Anonymous Switch fits cleanly
    const anonSwitch = modal.locator('button[role="switch"]');
    await expect(anonSwitch).toBeVisible();
    await anonSwitch.click();
    await expect(anonSwitch).toHaveAttribute('aria-checked', 'true');

    // Close modal
    const closeBtn = modal.locator('button[aria-label="Tutup jendela"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('should render admin blacklist & whitelist forms cleanly on 320px viewport without button clipping', async ({ page }) => {
    await page.goto('/admin');

    // Login
    const passcodeInput = page.locator('input[placeholder="Masukkan passcode..."]');
    await expect(passcodeInput).toBeVisible();
    await passcodeInput.fill('kmzway87aa');
    await page.locator('button:has-text("Masuk ke Dashboard")').click();

    await expect(page.locator('header').locator('text=SorakSora! Admin')).toBeVisible({ timeout: 10000 });

    // Navigate to Settings
    const settingsNavBtn = page.locator('button:has-text("Pengaturan")');
    await expect(settingsNavBtn).toBeVisible();
    await settingsNavBtn.click();

    // Verify Blacklist Form is rendered with responsive layout
    const blacklistTab = page.locator('button:has-text("Blacklist Kata")');
    if (await blacklistTab.isVisible()) {
      await blacklistTab.click({ force: true });
    }

    const addBlacklistBtn = page.locator('button:has-text("Tambah ke Blacklist")');
    await expect(addBlacklistBtn).toBeVisible();

    const btnBox = await addBlacklistBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(btnBox.x).toBeGreaterThanOrEqual(0);
      expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(320);
    }

    // Switch to Whitelist
    const whitelistTab = page.locator('button:has-text("Whitelist Kata")');
    await expect(whitelistTab).toBeVisible();
    await whitelistTab.click({ force: true });

    const addWhitelistBtn = page.locator('button:has-text("Tambah ke Whitelist")');
    await expect(addWhitelistBtn).toBeVisible();

    const wlBtnBox = await addWhitelistBtn.boundingBox();
    expect(wlBtnBox).not.toBeNull();
    if (wlBtnBox) {
      expect(wlBtnBox.x).toBeGreaterThanOrEqual(0);
      expect(wlBtnBox.x + wlBtnBox.width).toBeLessThanOrEqual(320);
    }
  });
});
