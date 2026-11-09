import { test, expect } from '@playwright/test';
import { purgeTestMessages } from './test-cleanup';

test.describe('Admin Moderation & Safety Dashboard Flow', () => {
  test.afterEach(async ({ request }) => {
    await purgeTestMessages(request);
  });
  test('should authenticate admin, display dashboard metrics, and navigate settings', async ({ page }) => {
    await page.goto('/admin');

    // 1. Verify Login Form
    const passcodeInput = page.locator('input[placeholder="Masukkan passcode..."]');
    await expect(passcodeInput).toBeVisible({ timeout: 15000 });

    const loginSubmitBtn = page.locator('button:has-text("Masuk ke Dashboard")');
    await expect(loginSubmitBtn).toBeVisible({ timeout: 15000 });

    // 2. Test Invalid Passcode
    await passcodeInput.fill('wrong-passcode-test');
    await loginSubmitBtn.click();
    const errorMsg = page.locator('text=/Passcode.*salah/i');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });

    // 3. Test Valid Passcode Authentication
    await passcodeInput.fill('kmzway87aa');
    await loginSubmitBtn.click();

    // Verify successful login into dashboard
    const adminHeader = page.locator('header').locator('text=SorakSora! Admin');
    await expect(adminHeader).toBeVisible({ timeout: 10000 });

    // 4. Verify Dashboard Metrics Overview Cards
    await expect(page.locator('text=Total Pesan')).toBeVisible();

    // 5. Verify Moderation Queue Tabs
    const tabAll = page.locator('button:has-text("Semua Pesan")');
    const tabApproved = page.locator('button:has-text("Disetujui")');
    const tabPending = page.locator('button:has-text("Menunggu Review")');
    const tabRejected = page.locator('button:has-text("Ditolak")');

    await expect(tabAll).toBeVisible();
    await expect(tabApproved).toBeVisible();
    await expect(tabPending).toBeVisible();
    await expect(tabRejected).toBeVisible();

    // Click tabs to verify state switching
    await tabApproved.click();
    await expect(tabApproved).toHaveClass(/bg-\[#BBF7D0\]/);

    await tabAll.click();
    await expect(tabAll).toHaveClass(/bg-\[#1A1A1A\]/);

    // 6. Test Navigation to Settings View
    const settingsNavBtn = page.locator('button:has-text("Pengaturan")');
    await expect(settingsNavBtn).toBeVisible();
    await settingsNavBtn.click();

    // Verify Settings Sections
    await expect(page.locator('text=Pengaturan Sistem & Konfigurasi Cheer Wall')).toBeVisible();
    await expect(page.locator('text=Auto-Accept Mode')).toBeVisible();

    // Verify Unified Content Safety Suite Master Toggle
    const masterToggleTitle = page.locator('text=Aktifkan Filter Kata & Moderasi Konten');
    await expect(masterToggleTitle).toBeVisible();

    // Verify manual save buttons are completely removed
    const manualSaveBtn = page.locator('text=SIMPAN SELURUH PENGATURAN FILTER');
    await expect(manualSaveBtn).toHaveCount(0);

    // Verify subtle auto-save status indicator is visible and strictly unified (count 1)
    const autoSaveIndicator = page.locator('text=/Tersimpan Otomatis/i');
    await expect(autoSaveIndicator).toHaveCount(1);
    await expect(autoSaveIndicator).toBeVisible();

    // Verify standardized header switches for Auto-Accept Mode and Banner Pengumuman
    const autoAcceptSwitch = page.locator('button[role="switch"][title*="Auto-Accept Mode"]');
    await expect(autoAcceptSwitch).toBeVisible();

    const bannerSwitch = page.locator('button[role="switch"][title*="Banner Pengumuman Cheer Wall"]');
    await expect(bannerSwitch).toBeVisible();

    // Verify old bottom-row toggle buttons are removed
    await expect(page.locator('text=/^(Aktifkan|Matikan) Auto-Accept$/i')).toHaveCount(0);
    await expect(page.locator('text=/^(Aktifkan|Matikan) Banner$/i')).toHaveCount(0);

    // Verify Content Safety Controls are available with clean "Profanity Filter" labeling
    await expect(page.locator('text=Profanity Filter').first()).toBeVisible();
    await expect(page.locator('text=/Blacklist/i').first()).toBeVisible();
    await expect(page.locator('text=/Whitelist/i').first()).toBeVisible();

    // Verify "AKTIF" / "NONAKTIF" and "OTOMATIS AKTIF" badges and rigid numbers are removed
    await expect(page.locator('text=OTOMATIS AKTIF')).toHaveCount(0);
    await expect(page.locator('text=1. Kamus Otomatis')).toHaveCount(0);
    await expect(page.locator('text=/^(AKTIF|NONAKTIF)$/')).toHaveCount(0);

    // Verify Profanity Sub-settings rows are present
    await expect(page.locator('text=Gaya Sensor Kata (Censor Styling Mode)')).toBeVisible();
    await expect(page.locator('text=Sensitivitas / Ambang Batas Skor Keparahan')).toBeVisible();

    // Verify 4 Censor Styling Mode options in grid
    await expect(page.locator('button:has-text("Normal")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Depan & Belakang")')).toBeVisible();
    await expect(page.locator('button:has-text("Grawlix")')).toBeVisible();
    await expect(page.locator('button:has-text("Bintang")')).toBeVisible();

    // Verify Clean Subheadings without repetitive (X dari Y)
    await expect(page.locator('text=Daftar Blacklist')).toBeVisible();
    await expect(page.locator('text=/Terdaftar \\(\\d+ dari \\d+\\)/')).toHaveCount(0);

    // Verify Standalone Card for "Deteksi Spam URL & Domain Eksternal"
    await expect(page.locator('text=Deteksi Spam URL & Domain Eksternal')).toBeVisible();
    const urlSwitch = page.locator('button[role="switch"][title*="deteksi spam URL"]');
    await expect(urlSwitch).toBeVisible();

    // Verify Dedicated Card for "Rate Limiting"
    await expect(page.getByRole('heading', { name: 'Rate Limiting' })).toBeVisible();
    await expect(page.locator('text=Mencegah spam bot')).toBeVisible();
    const rateLimitSwitch = page.locator('button[role="switch"][title*="Rate Limiting"]');
    await expect(rateLimitSwitch).toBeVisible();

    // Verify compact chip container sizing
    await expect(page.locator('.items-start.content-start').first()).toBeVisible();

    // Test Master Toggle State & Sub-features Grey-Out
    const masterSwitch = page.locator('button[role="switch"][title*="filter kata & moderasi konten"]');
    await expect(masterSwitch).toBeVisible();

    // If currently checked, toggle OFF and check grey-out class
    const isChecked = await masterSwitch.getAttribute('aria-checked');
    if (isChecked === 'true') {
      try {
        await masterSwitch.click();
        // Should now have greyed-out class on profanity card
        await expect(page.locator('.space-y-6.opacity-50.pointer-events-none.select-none')).toBeVisible();
      } finally {
        const currentlyChecked = await masterSwitch.getAttribute('aria-checked');
        if (currentlyChecked !== 'true') {
          await masterSwitch.click();
          await expect(page.locator('.space-y-6.opacity-50.pointer-events-none.select-none')).toHaveCount(0);
        }
      }
    }

    // 7. Return to Dashboard View & Test Real-Time Live Message Arrival
    const dashboardNavBtn = page.locator('button:has-text("Dashboard")');
    await expect(dashboardNavBtn).toBeVisible();
    await dashboardNavBtn.click();

    await expect(page.locator('text=Total Pesan')).toBeVisible();

    // Create a new message via POST request to test real-time SSE arrival
    const testUniqueText = `Semangat RealTime Test ${Date.now()}`;
    const postRes = await page.request.post('/api/messages', {
      data: {
        message: testUniqueText,
        name: 'Tester Live',
        is_anonymous: false,
      },
    });
    expect(postRes.ok()).toBeTruthy();

    // Verify that the new message card appears automatically on the dashboard without reloading!
    const liveCard = page.locator(`text=${testUniqueText}`);
    await expect(liveCard).toBeVisible({ timeout: 10000 });
  });

  test('should support unflagging / hapus tanda filter on flagged pending messages', async ({ page }) => {
    // 1. Submit a flagged message via API (contains link / spam trigger)
    const flaggedMsgText = `Pesan Terkena Filter ${Date.now()} kunjungi https://spam-link-test.com`;
    const postRes = await page.request.post('/api/messages', {
      data: {
        message: flaggedMsgText,
        name: 'Flagged Sender',
        is_anonymous: false,
      },
    });
    expect(postRes.ok()).toBeTruthy();

    // 2. Log in to Admin Dashboard
    await page.goto('/admin');
    await expect(page.locator('text=Memeriksa autentikasi admin...')).toHaveCount(0, { timeout: 15000 });
    const passcodeInput = page.locator('input[placeholder="Masukkan passcode..."]');
    if (await passcodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passcodeInput.fill('kmzway87aa');
      await page.locator('button:has-text("Masuk ke Dashboard")').click();
    }
    await expect(page.locator('header').locator('text=SorakSora! Admin')).toBeVisible({ timeout: 15000 });

    // 3. Navigate to Pending Review tab
    const tabPending = page.locator('button:has-text("Menunggu Review")');
    await expect(tabPending).toBeVisible({ timeout: 10000 });
    await tabPending.click();

    // 4. Find the card containing the flagged message
    const card = page.locator('[data-testid="message-card"]').filter({ hasText: flaggedMsgText });
    await expect(card).toBeVisible({ timeout: 10000 });

    // 5. Verify the "Tertahan Filter" badge is displayed
    const flagBadge = card.locator('text=Tertahan Filter');
    await expect(flagBadge).toBeVisible();

    // 6. Expand the "Rincian Filter" dropdown
    const filterSummary = card.locator('summary:has-text("Rincian Filter")');
    await expect(filterSummary).toBeVisible();
    await filterSummary.click();

    // 7. Verify the "Bukan Pelanggaran (Unflag)" button is visible at the bottom of details
    const unflagBtn = card.locator('button:has-text("Bukan Pelanggaran (Unflag)")');
    await expect(unflagBtn).toBeVisible();

    // 8. Click the Unflag button
    await unflagBtn.click();

    // 9. Verify toast feedback is displayed
    const toast = page.locator('text=Tanda filter berhasil dihapus');
    await expect(toast).toBeVisible({ timeout: 5000 });

    // 10. Verify that "Tertahan Filter" badge is now removed from the card
    await expect(flagBadge).toHaveCount(0);

    // 11. Message remains in the pending tab
    await expect(page.locator(`text=${flaggedMsgText}`)).toBeVisible();
  });
});


