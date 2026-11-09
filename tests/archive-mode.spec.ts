import { test, expect, type APIRequestContext } from '@playwright/test';
import { purgeTestMessages } from './test-cleanup';

const ADMIN_HEADERS = { Authorization: 'Bearer kmzway87aa' };
const ARCHIVE_ERROR = 'Dinding pesan sedang diarsipkan. Pengiriman pesan baru ditutup.';
const DEFAULT_ARCHIVE_NOTICE =
  'Dinding sorakan ini telah **diarsipkan**. Pengiriman pesan baru telah ditutup, namun seluruh pesan yang ada tetap dapat dibaca dan dijelajahi.';
const CUSTOM_ARCHIVE_MARKDOWN = [
  '## Arsip Event',
  'Dinding ini telah **ditutup** dan __tetap dapat dibaca__.',
  '*Jelajahi pesan lama* melalui [arsip SorakSora](https://example.com/archive).',
  '- Baca pesan',
  '- Bagikan dukungan',
].join('\n');

async function updateSettings(
  request: APIRequestContext,
  settings: Record<string, boolean | string>
) {
  const response = await request.patch('/api/admin/settings', {
    headers: ADMIN_HEADERS,
    data: settings,
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function restoreSettings(request: APIRequestContext) {
  await updateSettings(request, {
    is_archived: false,
    auto_accept: true,
    archive_announcement: DEFAULT_ARCHIVE_NOTICE,
  });
}

test.describe('Archive Mode', () => {
  test.beforeEach(async ({ request }) => {
    await restoreSettings(request);
  });

  test.afterEach(async ({ request }) => {
    await restoreSettings(request);
    await purgeTestMessages(request);
  });

  test('auto-saves Markdown notice and reflects all admin header states', async ({ page, request }) => {
    await updateSettings(request, { auto_accept: false });
    await page.goto('/admin');
    await expect(page.locator('text=Memeriksa autentikasi admin...')).toHaveCount(0, { timeout: 15000 });

    const passcodeInput = page.locator('input[placeholder="Masukkan passcode..."]');
    if (await passcodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passcodeInput.fill('kmzway87aa');
      await page.locator('button:has-text("Masuk ke Dashboard")').click();
    }

    await expect(page.locator('header').locator('text=SorakSora! Admin')).toBeVisible({ timeout: 15000 });
    const statusBadge = page.locator('#admin-platform-status-badge');
    await expect(statusBadge).toHaveText('Auto Live (Off)');
    await expect(statusBadge).toHaveClass(/bg-red-400/);

    await updateSettings(request, { auto_accept: true });
    await expect(statusBadge).toHaveText('Auto Live (On)', { timeout: 10000 });
    await expect(statusBadge).toHaveClass(/bg-emerald-300/);

    await page.locator('button:has-text("Pengaturan")').click();
    const card = page.locator('#archive-mode-card');
    const toggle = card.locator('#toggle-archive-mode');
    const editor = card.locator('#archive-announcement');

    await expect(card).toContainText('Mode Arsip');
    await expect(card.locator('svg')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Verify textarea is disabled and non-editable when Mode Arsip is OFF
    await expect(editor).toBeDisabled();
    await expect(editor).toHaveClass(/cursor-not-allowed/);

    // Toggle Mode Arsip ON
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(toggle).toHaveClass(/bg-\[#BBF7D0\]/);
    await expect(statusBadge).toHaveText('Archive Mode');
    await expect(statusBadge).toHaveClass(/bg-gray-200/);

    // Verify textarea is now enabled and editable
    await expect(editor).toBeEnabled();
    await editor.fill(CUSTOM_ARCHIVE_MARKDOWN);

    await expect(page.locator('text=Tersimpan Otomatis')).toBeVisible({ timeout: 5000 });
    await expect.poll(async () => {
      const response = await request.get('/api/admin/settings', { headers: ADMIN_HEADERS });
      const data = await response.json();
      return data.settings.archive_announcement;
    }).toBe(CUSTOM_ARCHIVE_MARKDOWN);

    // Toggle Mode Arsip back OFF and verify textarea becomes disabled again
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(editor).toBeDisabled();
    await expect(editor).toHaveClass(/cursor-not-allowed/);
  });

  test('renders customized archive Markdown while preserving wall, spotlight, sharing, and likes', async ({
    page,
    request,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => {
      localStorage.setItem('showup_welcome_dismissed', 'true');
    });
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 10000 });

    // Open the form first, then activate Archive Mode to verify live/stale-dialog enforcement.
    await page.locator('#dock-drop-cheer-btn').click();
    await expect(page.locator('#cheer-message-text')).toBeVisible();
    await updateSettings(request, {
      archive_announcement: CUSTOM_ARCHIVE_MARKDOWN,
      is_archived: true,
    });

    const archivedDialog = page.locator('div[role="dialog"]');
    await expect(archivedDialog.locator('h2', { hasText: 'Dinding Diarsipkan' })).toBeVisible({ timeout: 10000 });
    await expect(archivedDialog.locator('h2', { hasText: 'Arsip Event' })).toBeVisible();
    await expect(archivedDialog.locator('strong', { hasText: 'ditutup' })).toHaveCSS('font-weight', '700');
    await expect(archivedDialog.locator('strong', { hasText: 'tetap dapat dibaca' })).toHaveCSS('font-weight', '700');
    await expect(archivedDialog.locator('ul li')).toHaveCount(2);
    await expect(archivedDialog.locator('#cheer-message-text')).toHaveCount(0);
    await archivedDialog.locator('button[aria-label="Tutup pemberitahuan arsip"]').click();

    const archiveNotice = page.locator('#archive-mode-notice');
    await expect(archiveNotice.locator('h2')).toHaveText('Arsip Event');
    await expect(archiveNotice.locator('strong', { hasText: 'ditutup' })).toHaveCSS('font-weight', '700');
    await expect(archiveNotice.locator('strong', { hasText: 'tetap dapat dibaca' })).toHaveCSS('font-weight', '700');
    await expect(archiveNotice.locator('em', { hasText: 'Jelajahi pesan lama' })).toBeVisible();
    await expect(archiveNotice.locator('a[href="https://example.com/archive"]')).toBeVisible();
    await expect(archiveNotice.locator('ul li')).toHaveCount(2);
    await expect(page.locator('#dock-drop-cheer-btn')).toHaveCount(0);
    await expect(page.locator('#archive-mode-dock-badge')).toHaveCount(0);

    const blockedResponse = await request.post('/api/messages', {
      data: {
        name: 'Archive Guard Test',
        message: `Pesan yang harus ditolak ${Date.now()}`,
        color: '#FEF08A',
      },
    });
    expect(blockedResponse.status()).toBe(403);
    const blockedData = await blockedResponse.json();
    expect(blockedData.error).toBe(ARCHIVE_ERROR);
    expect(blockedData.code).toBe('ARCHIVE_MODE');

    const firstCard = page.locator('.board-note').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('button[aria-label="Beri Love"]')).toBeEnabled();
    await firstCard.click({ force: true });

    const spotlight = page.locator('div[role="dialog"]');
    await expect(spotlight).toBeVisible();
    await expect(spotlight.locator('#spotlight-share-btn')).toBeEnabled();
    await spotlight.locator('#spotlight-share-btn').click();
    await expect(spotlight.locator('div[role="menu"]')).toBeVisible();
  });
});
