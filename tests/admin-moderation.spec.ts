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

  test('should verify header cleanup, status badge parity, and JSON import/export with destructive overwrite', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Memeriksa autentikasi admin...')).toHaveCount(0, { timeout: 15000 });
    const passcodeInput = page.locator('input[placeholder="Masukkan passcode..."]');
    if (await passcodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passcodeInput.fill('kmzway87aa');
      await page.locator('button:has-text("Masuk ke Dashboard")').click();
    }
    await expect(page.locator('header').locator('text=SorakSora! Admin')).toBeVisible({ timeout: 15000 });

    // 1. Header Navigation Cleanup: Verify only "Cheer Wall Live" and "Keluar" are present in the top header
    const header = page.locator('header');
    await expect(header.locator('text=Cheer Wall Live')).toBeVisible();
    await expect(header.locator('button:has-text("Keluar")')).toBeVisible();
    await expect(header.locator('a:has-text("JSON")')).toHaveCount(0);
    await expect(header.locator('a:has-text("CSV")')).toHaveCount(0);

    // 2. Status Badge Parity: When Auto Live is Off, verify badge exists and is visible
    const statusBadge = page.locator('#admin-platform-status-badge');
    await expect(statusBadge).toBeVisible();

    // 3. Navigate to Settings View
    await page.locator('button:has-text("Pengaturan")').click();
    await expect(page.locator('text=Pengaturan Sistem & Konfigurasi Cheer Wall')).toBeVisible();

    // 4. Verify JSON Import & Export Card is placed beside Card 6
    const importExportCard = page.locator('h3:has-text("Import & Export Data Pesan (JSON)")');
    await expect(importExportCard).toBeVisible();
    const exportBtn = page.locator('a:has-text("Export JSON")');
    await expect(exportBtn).toBeVisible();
    const importBtn = page.locator('button:has-text("Import JSON")');
    await expect(importBtn).toBeVisible();

    // 5. Test JSON Schema Validation: Malformed / Invalid JSON file rejection
    let alertHandled = false;
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Format file JSON tidak valid atau struktur data tidak sesuai');
      await dialog.accept();
      alertHandled = true;
    });

    const fileInput = page.locator('input[type="file"][accept*=".json"]');
    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ not_messages: 'invalid data' })),
    });

    // Wait for alert to trigger
    await page.waitForTimeout(500);
    expect(alertHandled).toBeTruthy();

    // 6. Test Valid Import Payload: opens destructive overwrite modal
    const validPayload = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      total_messages: 2,
      messages: [
        {
          unique_id: 'test-import-1',
          message: 'Pesan Impor Pertama Sukses!',
          author: 'Tester Import 1',
          is_anonymous: false,
          color: 'yellow',
          likes_count: 5,
          status: 'approved',
          created_at: new Date().toISOString(),
        },
        {
          unique_id: 'test-import-2',
          message: 'Pesan Impor Kedua Sukses!',
          author: 'Tester Import 2',
          is_anonymous: true,
          color: 'green',
          likes_count: 10,
          status: 'approved',
          created_at: new Date().toISOString(),
        },
      ],
    };

    await fileInput.setInputFiles({
      name: 'valid-messages.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(validPayload)),
    });

    // Verify Destructive Overwrite Modal is visible with naked icon and punchy copy
    const modalTitle = page.locator('#import-modal-title');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toHaveText(/TIMPA SEMUA PESAN\?/i);
    await expect(page.locator('text=Semua pesan cheer wall saat ini akan dihapus permanen dan digantikan data dari file JSON. Tindakan ini tidak dapat dibatalkan.')).toBeVisible();

    // Confirm overwrite
    const confirmBtn = page.locator('#confirm-import-button');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify success toast
    const successToast = page.locator('text=/Berhasil mengimpor 2 pesan/i');
    await expect(successToast).toBeVisible({ timeout: 10000 });

    // 7. Return to Dashboard and verify overwritten messages exist
    await page.locator('button:has-text("Dashboard")').click();
    await page.locator('button:has-text("Disetujui")').click();
    await expect(page.locator('text=Pesan Impor Pertama Sukses!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Pesan Impor Kedua Sukses!')).toBeVisible();
  });
});


