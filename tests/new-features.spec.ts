import { test, expect } from '@playwright/test';
import { purgeTestMessages } from './test-cleanup';

test.describe('Unique Routing, Markdown & Sandbox Tests', () => {
  test.afterEach(async ({ request }) => {
    await purgeTestMessages(request);
  });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('showup_welcome_dismissed', 'true');
    });
  });

  test('should support /r fallback and rewrite URL silently to root', async ({ page }) => {
    await page.goto('/r');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    // Spotlight modal should be auto-opened
    const spotlightModal = page.locator('div[role="dialog"]');
    await expect(spotlightModal).toBeVisible();

    // Browser URL should be silently replaced to '/'
    await page.waitForFunction(() => window.location.pathname === '/');
    expect(page.url()).not.toContain('/r');
  });

  test('should support direct message /r/[id] and rewrite URL silently to root', async ({ request, page }) => {
    // 1. Create a test message to get its unique_id
    const res = await request.post('/api/messages', {
      data: {
        name: 'Budi Test',
        message: 'Semangat ceria untuk testing routing note!',
        color: '#BBF7D0',
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const uniqueId = data.message?.unique_id;
    expect(uniqueId).toBeDefined();
    expect(uniqueId).toMatch(/^su-/);

    // 2. Navigate to /r/{uniqueId}
    await page.goto(`/r/${uniqueId}`);
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    // 3. Spotlight modal should open with this specific message
    const spotlightModal = page.locator('div[role="dialog"]');
    await expect(spotlightModal).toBeVisible();
    await expect(spotlightModal).toContainText('Semangat ceria untuk testing routing note!');

    // 4. URL should be silently rewritten to '/'
    await page.waitForFunction(() => window.location.pathname === '/');
  });

  test('should include /r/{unique_id} in copied text format', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    const firstCard = page.locator('.board-note').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click({ force: true });

    const spotlightModal = page.locator('div[role="dialog"]');
    await expect(spotlightModal).toBeVisible();

    const shareBtn = spotlightModal.locator('#spotlight-share-btn');
    await shareBtn.click();

    const shareMenu = spotlightModal.locator('div[role="menu"]');
    await expect(shareMenu).toBeVisible();

    const copyTextBtn = shareMenu.locator('button:has-text("Salin Format Teks")');
    await copyTextBtn.click();

    const clipboardText = await page.evaluate(async () => {
      return await navigator.clipboard.readText();
    });

    expect(clipboardText).toContain('via SorakSora •');
    expect(clipboardText).toMatch(/\/r\/su-[a-f0-9]+/);
    expect(clipboardText.replace(/\r\n/g, '\n')).toMatch(/^"[\s\S]+" — [^\n]+\n\nvia SorakSora • https?:\/\/[^\s]+\/r\/su-[a-f0-9]+/);
  });

  test('should disallow typing manual "Anonim" when anonymous toggle is OFF and show inline error', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    const dockBtn = page.locator('#dock-drop-cheer-btn');
    await expect(dockBtn).toBeVisible();
    await dockBtn.click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    const nameInput = modal.locator('#cheer-sender-name');
    const messageInput = modal.locator('#cheer-message-text');
    const submitBtn = modal.locator('#pin-to-wall-btn');

    // Fill message first
    await messageInput.fill('Semangat pantang menyerah!');

    // Type "Anonim" manually when toggle is OFF
    await nameInput.fill('Anonim');
    const anonimError = modal.locator('#name-anonim-error');
    await expect(anonimError).toBeVisible();
    await expect(anonimError).toContainText(
      "Nama tidak boleh diisi 'Anonim'. Aktifkan toggle 'Kirim sebagai Anonim' jika ingin mengirim tanpa nama."
    );
    await expect(submitBtn).toBeDisabled();

    // Type case-insensitive "aNoNiM"
    await nameInput.fill('aNoNiM');
    await expect(anonimError).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Toggle anonymous switch ON: error disappears, name becomes disabled
    const anonSwitch = modal.locator('button[role="switch"]');
    await anonSwitch.click();
    await expect(anonSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(anonimError).not.toBeVisible();
    await expect(nameInput).toBeDisabled();
    await expect(submitBtn).toBeEnabled();

    // Toggle back OFF: user enters authentic name
    await anonSwitch.click();
    await expect(anonSwitch).toHaveAttribute('aria-checked', 'false');
    await nameInput.fill('Kawan Baik');
    await expect(anonimError).not.toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test('should normalize line breaks strictly into single spaces upon form submission', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    const dockBtn = page.locator('#dock-drop-cheer-btn');
    await expect(dockBtn).toBeVisible();
    await dockBtn.click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    const uniqueId = Date.now();
    const authorName = `Pelari Cepat ${uniqueId}`;
    const rawMultilineMessage = `Lari pagi bersama kawan.\n\nTetap semangat dan ceria!\r\n\r\nSampai jumpa di garis akhir! [${uniqueId}]`;
    const expectedCollapsedMessage = `Lari pagi bersama kawan. Tetap semangat dan ceria! Sampai jumpa di garis akhir! [${uniqueId}]`;

    const nameInput = modal.locator('#cheer-sender-name');
    const messageInput = modal.locator('#cheer-message-text');
    const submitBtn = modal.locator('#pin-to-wall-btn');

    await nameInput.fill(authorName);
    // User types normal multiline text with newlines
    await messageInput.fill(rawMultilineMessage);
    // Verify textarea retains newlines while editing
    const currentVal = await messageInput.inputValue();
    expect(currentVal).toContain('\n');

    // Submit
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify on board: message appears collapsed into single spaces
    const submittedCard = page.locator('.board-note', { hasText: expectedCollapsedMessage });
    const messageParagraph = submittedCard.locator('p');
    await expect(messageParagraph).toContainText(expectedCollapsedMessage);
    const paragraphText = await messageParagraph.innerText();
    expect(paragraphText).not.toContain('\n');
  });

  test('should render complete "Penulis Pesan Dukungan" on export card without truncation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    const firstCard = page.locator('.board-note').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click({ force: true });

    const spotlightModal = page.locator('div[role="dialog"]');
    await expect(spotlightModal).toBeVisible();

    const exportCardNode = page.locator('#export-canvas-node');
    await expect(exportCardNode).toBeAttached();

    const subtitleEl = exportCardNode.locator('text=Penulis Pesan Dukungan');
    await expect(subtitleEl).toBeAttached();
    const subtitleText = await subtitleEl.innerText();
    expect(subtitleText).toBe('Penulis Pesan Dukungan');
    expect(subtitleText).not.toContain('Dukun...');
  });

  test('should render markdown in announcement banner and welcome modal', async ({ page, request }) => {
    // Set announcement banner with markdown formatting
    await request.patch('/api/admin/settings', {
      headers: {
        'Authorization': 'Bearer kmzway87aa',
      },
      data: {
        announcement_enabled: true,
        announcement_text: 'Pengumuman **Tebal** dan *Miring* serta ~~Coret~~ dan [Tautan](https://example.com)',
      },
    });

    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    // Verify markdown rendered elements
    const strongEl = page.locator('strong', { hasText: 'Tebal' });
    await expect(strongEl).toBeVisible();

    const emEl = page.locator('em', { hasText: 'Miring' });
    await expect(emEl).toBeVisible();

    const delEl = page.locator('del', { hasText: 'Coret' });
    await expect(delEl).toBeVisible();

    const linkEl = page.locator('a[href="https://example.com"]', { hasText: 'Tautan' });
    await expect(linkEl).toBeVisible();

    // Restore announcement to disabled
    await request.patch('/api/admin/settings', {
      headers: {
        'Authorization': 'Bearer kmzway87aa',
      },
      data: {
        announcement_enabled: false,
      },
    });
  });

  test('should interact with Profanity Testing Sandbox in Admin', async ({ page }) => {
    // Login to admin
    await page.goto('/admin');
    await expect(page.locator('text=Memeriksa autentikasi admin...')).toHaveCount(0, { timeout: 15000 });
    const passcodeInput = page.locator('input[placeholder="Masukkan passcode..."]');
    if (await passcodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passcodeInput.fill('kmzway87aa');
      await page.locator('button:has-text("Masuk ke Dashboard")').click();
    }
    await expect(page.locator('header').locator('text=SorakSora! Admin')).toBeVisible({ timeout: 15000 });

    // Navigate to Pengaturan tab
    const settingsTab = page.locator('button:has-text("Pengaturan")');
    await expect(settingsTab).toBeVisible({ timeout: 10000 });
    await settingsTab.click();

    // Ensure Moderate preset is selected
    const moderateBtn = page.locator('button:has-text("Moderate")').first();
    await moderateBtn.click();

    // Find Profanity Sandbox section
    const sandboxHeading = page.locator('span', { hasText: 'Uji Coba Filter Kata (Profanity Sandbox)' });
    await expect(sandboxHeading).toBeVisible({ timeout: 10000 });

    const textarea = page.locator('textarea[placeholder="Ketik kalimat untuk menguji filter..."]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Ayo anjing lu bangsat');

    const testBtn = page.locator('button:has-text("Uji Kalimat")');
    await testBtn.click();

    // Verify diagnostic output card
    await expect(page.locator('text=Terdeteksi Pelanggaran (Flagged)')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Kata yang Tertangkap:')).toBeVisible();
    await expect(page.locator('text=Hasil Sensor (Masking Preview):')).toBeVisible();
  });
});
