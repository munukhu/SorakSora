import { test, expect } from '@playwright/test';

test.describe('Spotlight Modal & Share Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Automatically dismiss the startup welcome modal
    await page.addInitScript(() => {
      localStorage.setItem('showup_welcome_dismissed', 'true');
    });
  });

  test('should open spotlight modal, display white author avatar, and support share actions', async ({ page, context }) => {
    // Grant clipboard permissions for copy text test
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await expect(page).toHaveTitle(/SorakSora!/);
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    // Wait for at least one note card to appear on the board
    const firstCard = page.locator('.board-note').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    // Click note using force:true to smoothly bypass continuous wind-sway CSS animation
    await firstCard.click({ force: true });

    // Verify modal dialog opens
    const spotlightModal = page.locator('div[role="dialog"]');
    await expect(spotlightModal).toBeVisible();
    await expect(spotlightModal).toContainText(/Sorotan Pesan/i);

    // Verify Spotlight Message blockquote is present
    const quote = spotlightModal.locator('blockquote');
    await expect(quote).toBeVisible();
    const quoteText = await quote.innerText();
    expect(quoteText.length).toBeGreaterThan(0);

    // Verify Author Avatar container styling:
    // Pure white (#FFFFFF) background, 2px solid border, cleanly centered
    const avatarContainer = spotlightModal.locator('div.w-8.h-8.bg-white');
    await expect(avatarContainer).toBeVisible();
    const avatarBgColor = await avatarContainer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // rgb(255, 255, 255) represents pure white #FFFFFF
    expect(avatarBgColor).toBe('rgb(255, 255, 255)');

    // Verify User icon SVG is inside avatar container
    const userIcon = avatarContainer.locator('svg');
    await expect(userIcon).toBeVisible();

    // Test Love Button interaction
    const loveBtn = spotlightModal.locator('button[aria-label="Beri Love"]');
    await expect(loveBtn).toBeVisible();
    await loveBtn.click();
    await expect(spotlightModal.locator('.animate-float-heart').first()).toBeVisible();

    // Test Share Button & Dropdown Menu
    const shareBtn = spotlightModal.locator('#spotlight-share-btn');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Verify dropdown menu opens
    const shareMenu = spotlightModal.locator('div[role="menu"]');
    await expect(shareMenu).toBeVisible();
    await expect(shareMenu).toContainText(/Persegi \(1:1\)/i);
    await expect(shareMenu).toContainText(/Cerita \(9:16\)/i);
    await expect(shareMenu).toContainText(/Lanskap \(16:9\)/i);
    await expect(shareMenu).toContainText(/Salin Format Teks/i);

    // Test Salin Format Teks (Copy Text)
    const copyTextBtn = shareMenu.locator('button:has-text("Salin Format Teks")');
    await expect(copyTextBtn).toBeVisible();
    await copyTextBtn.click();

    // Verify Toast notification for copied text appears
    const copyToast = page.locator('div[role="status"]', { hasText: 'Teks pesan berhasil disalin!' });
    await expect(copyToast).toBeVisible({ timeout: 5000 });

    // Close Spotlight Modal
    const closeBtn = spotlightModal.locator('button[aria-label="Tutup jendela spotlight"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify modal is closed
    await expect(spotlightModal).not.toBeVisible({ timeout: 5000 });
  });

  test('should preserve persistent note color during shuffle and "Acak Lagi" random selection', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    // 1. Verify direct note click preserves card background in spotlight modal
    const firstCard = page.locator('.board-note').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    const firstCardBg = await firstCard.evaluate((el) => window.getComputedStyle(el).backgroundColor);

    await firstCard.click({ force: true });
    const spotlightModal = page.locator('div[role="dialog"]');
    await expect(spotlightModal).toBeVisible();

    const spotlightCard = spotlightModal.locator('> div:not(.fixed)');
    const modalBg = await spotlightCard.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(modalBg).toBe(firstCardBg);

    // Close modal
    await spotlightModal.locator('button[aria-label="Tutup jendela spotlight"]').click();
    await expect(spotlightModal).not.toBeVisible();

    // 2. Trigger header shuffle action (Dices icon)
    const headerShuffleBtn = page.locator('#header-shuffle-btn');
    await expect(headerShuffleBtn).toBeVisible();
    await headerShuffleBtn.click();

    // Wait for spotlight modal to open after kinetic shuffle
    await expect(spotlightModal).toBeVisible({ timeout: 10000 });
    const shuffledText1 = await spotlightModal.locator('blockquote').innerText();
    expect(shuffledText1.length).toBeGreaterThan(0);

    // Find the matching card on the corkboard wall to verify color consistency
    const cleanQuote1 = shuffledText1.replace(/^[“"']|[”"']$/g, '').trim();
    const matchingCard1 = page.locator('.board-note', { hasText: cleanQuote1 }).first();
    if (await matchingCard1.count() > 0) {
      const expectedBg1 = await matchingCard1.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      const actualBg1 = await spotlightCard.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(actualBg1).toBe(expectedBg1);
    }

    // 3. Trigger "Acak Lagi" button inside the spotlight modal
    const shuffleAgainBtn = page.locator('#spotlight-shuffle-again-btn');
    await expect(shuffleAgainBtn).toBeVisible();
    await shuffleAgainBtn.click();

    // Wait for second shuffle to complete
    await page.waitForTimeout(1200);
    await expect(spotlightModal).toBeVisible();

    const shuffledText2 = await spotlightModal.locator('blockquote').innerText();
    expect(shuffledText2.length).toBeGreaterThan(0);

    const cleanQuote2 = shuffledText2.replace(/^[“"']|[”"']$/g, '').trim();
    const matchingCard2 = page.locator('.board-note', { hasText: cleanQuote2 }).first();
    if (await matchingCard2.count() > 0) {
      const expectedBg2 = await matchingCard2.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      const actualBg2 = await spotlightCard.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(actualBg2).toBe(expectedBg2);
    }
  });
});
