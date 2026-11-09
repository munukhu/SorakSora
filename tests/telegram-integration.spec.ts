import { test, expect } from '@playwright/test';
import {
  formatTelegramCheer,
  categorizeIntoTiers,
  fisherYatesShuffle,
  generateTieredCycleQueue,
  getMessageTier,
  getNextPeriodicCheerMessage,
  resetCycleQueue,
  getCycleQueue,
  getCycleDispatched,
  getCycleNumber,
} from '../src/lib/telegram';
import { Message } from '../src/lib/types';
import { purgeTestMessages } from './test-cleanup';

test.describe('Telegram Bot Notification & Periodic Broadcaster Flow', () => {
  test.afterEach(async ({ request }) => {
    await purgeTestMessages(request);
  });
  test('should format cheer payload strictly in minimalist format for smartwatch', () => {
    // 1. Standard author name
    const formatted1 = formatTelegramCheer('Ayo gas terus! KM 30 di depan mata!', 'Budi');
    expect(formatted1).toBe('"Ayo gas terus! KM 30 di depan mata!" — Budi');
    expect(formatted1).not.toContain('http');
    expect(formatted1).not.toContain('#');
    expect(formatted1).not.toContain('SorakSora!');

    // 2. Anonymous author name
    const formatted2 = formatTelegramCheer('Jangan menyerah, kamu sudah sejauh ini!', 'Anonim');
    expect(formatted2).toBe('"Jangan menyerah, kamu sudah sejauh ini!" — Anonim');

    // 3. Fallback when author name is empty or undefined
    const formatted3 = formatTelegramCheer('Semangat lari pagi!', '');
    expect(formatted3).toBe('"Semangat lari pagi!" — Anonim');

    const formatted4 = formatTelegramCheer('Fokus finis kuat!');
    expect(formatted4).toBe('"Fokus finis kuat!" — Anonim');
  });

  test('should manage Telegram settings via /api/admin/settings and reject unauthorized access', async ({ request }) => {
    // 1. Verify 401 when accessing without admin auth
    const unauthGet = await request.get('/api/admin/settings');
    expect(unauthGet.status()).toBe(401);

    const unauthPatch = await request.patch('/api/admin/settings', {
      data: { telegram_instant_enabled: true },
    });
    expect(unauthPatch.status()).toBe(401);

    // 2. Update Telegram settings with admin token
    const patchRes = await request.patch('/api/admin/settings', {
      headers: {
        Authorization: 'Bearer kmzway87aa',
      },
      data: {
        telegram_bot_token: '123456789:ABCDefghIJKlmNoPQRsTUVwxyZ_TEST',
        telegram_chat_id: '-1001234567890',
        telegram_instant_enabled: true,
        telegram_periodic_enabled: true,
        telegram_interval_minutes: 15,
      },
    });

    expect(patchRes.ok()).toBeTruthy();
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.settings.telegram_bot_token).toBe('123456789:ABCDefghIJKlmNoPQRsTUVwxyZ_TEST');
    expect(patchData.settings.telegram_chat_id).toBe('-1001234567890');
    expect(patchData.settings.telegram_instant_enabled).toBe(true);
    expect(patchData.settings.telegram_periodic_enabled).toBe(true);
    expect(patchData.settings.telegram_interval_minutes).toBe(15);

    // 3. Verify GET returns persisted settings
    const getRes = await request.get('/api/admin/settings', {
      headers: {
        Authorization: 'Bearer kmzway87aa',
      },
    });
    expect(getRes.ok()).toBeTruthy();
    const getData = await getRes.json();
    expect(getData.settings.telegram_bot_token).toBe('123456789:ABCDefghIJKlmNoPQRsTUVwxyZ_TEST');
    expect(getData.settings.telegram_chat_id).toBe('-1001234567890');
    expect(getData.settings.telegram_instant_enabled).toBe(true);
    expect(getData.settings.telegram_periodic_enabled).toBe(true);
    expect(getData.settings.telegram_interval_minutes).toBe(15);
  });

  test('should handle /api/admin/telegram/test validation cleanly', async ({ request }) => {
    // 1. Verify 401 without auth
    const unauthRes = await request.post('/api/admin/telegram/test', {
      data: { botToken: '', chatId: '' },
    });
    expect(unauthRes.status()).toBe(401);

    // 2. Verify 400 when credentials are empty
    const emptyCredsRes = await request.post('/api/admin/telegram/test', {
      headers: {
        Authorization: 'Bearer kmzway87aa',
      },
      data: { botToken: '', chatId: '' },
    });
    expect(emptyCredsRes.status()).toBe(400);
    const emptyData = await emptyCredsRes.json();
    expect(emptyData.success).toBe(false);
    expect(emptyData.error).toContain('belum dikonfigurasi');
  });

  test('should handle /api/cron/cheer-tick periodic dispatcher endpoint', async ({ request }) => {
    // 1. Verify GET /api/cron/cheer-tick with admin secret
    const cronRes = await request.get('/api/cron/cheer-tick?force=true', {
      headers: {
        Authorization: 'Bearer kmzway87aa',
      },
    });

    // Endpoint handles request and returns JSON status with scheduler metadata
    const cronData = await cronRes.json();
    expect(typeof cronData.success).toBe('boolean');
    expect(cronData.scheduler).toBeDefined();
    expect(typeof cronData.scheduler.isActive).toBe('boolean');
  });

  test('should autonomously arm periodic scheduler and reset cooldown on live submissions', async ({ request }) => {
    // 1. Enable periodic broadcaster via PATCH /api/admin/settings
    const beforeEnable = Date.now();
    const enableRes = await request.patch('/api/admin/settings', {
      headers: { Authorization: 'Bearer kmzway87aa' },
      data: {
        telegram_periodic_enabled: true,
        telegram_interval_minutes: 5,
      },
    });
    expect(enableRes.ok()).toBeTruthy();
    const enableData = await enableRes.json();
    expect(enableData.settings.telegram_periodic_enabled).toBe(true);
    const armedTime = parseInt(enableData.settings.telegram_last_sent_at, 10);
    expect(armedTime).toBeGreaterThanOrEqual(beforeEnable - 2000);

    // 2. Query cron tick without force: should report interval not reached
    const tickRes = await request.get('/api/cron/cheer-tick', {
      headers: { Authorization: 'Bearer kmzway87aa' },
    });
    expect(tickRes.ok()).toBeTruthy();
    const tickData = await tickRes.json();
    expect(tickData.success).toBe(true);
    expect(tickData.sent).toBe(false);
    expect(tickData.notice).toContain('Interval belum tercapai');
    expect(tickData.scheduler.isActive).toBe(true);
    expect(tickData.scheduler.isEnabled).toBe(true);

    // 3. Submit live approved message with instant push enabled
    await request.patch('/api/admin/settings', {
      headers: { Authorization: 'Bearer kmzway87aa' },
      data: { telegram_instant_enabled: true },
    });

    const submitTime = Date.now();
    const submitRes = await request.post('/api/messages', {
      data: {
        name: 'Live Runner Cheer',
        message: `Ayo semangat pelari live! ${Date.now()}`,
        color: '#BBF7D0',
      },
    });
    expect(submitRes.ok()).toBeTruthy();

    // 4. Verify cooldown was reset to the live submission time
    const settingsRes = await request.get('/api/admin/settings', {
      headers: { Authorization: 'Bearer kmzway87aa' },
    });
    const settingsData = await settingsRes.json();
    const resetTime = parseInt(settingsData.settings.telegram_last_sent_at, 10);
    expect(resetTime).toBeGreaterThanOrEqual(submitTime - 2000);

    // 5. Disable periodic broadcaster and verify disarmed
    const disableRes = await request.patch('/api/admin/settings', {
      headers: { Authorization: 'Bearer kmzway87aa' },
      data: { telegram_periodic_enabled: false },
    });
    expect(disableRes.ok()).toBeTruthy();
    const disarmTick = await request.get('/api/cron/cheer-tick', {
      headers: { Authorization: 'Bearer kmzway87aa' },
    });
    const disarmData = await disarmTick.json();
    expect(disarmData.scheduler.isEnabled).toBe(false);
  });

  test('should interact with Telegram Integration Card inside /admin Settings view', async ({ page }) => {
    // 1. Login to admin dashboard
    await page.goto('/admin');
    await expect(page.locator('text=Memeriksa autentikasi admin...')).toHaveCount(0, { timeout: 15000 });

    const passcodeInput = page.locator('input[placeholder="Masukkan passcode..."]');
    if (await passcodeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passcodeInput.fill('kmzway87aa');
      await page.locator('button:has-text("Masuk ke Dashboard")').click();
    }
    await expect(page.locator('header').locator('text=SorakSora! Admin')).toBeVisible({ timeout: 15000 });

    // 2. Navigate to Pengaturan tab
    const settingsTab = page.locator('button:has-text("Pengaturan")');
    await expect(settingsTab).toBeVisible({ timeout: 10000 });
    await settingsTab.click();

    // 3. Locate Telegram Integration Card and verify generalized description
    const telegramCard = page.locator('#telegram-integration-card');
    await expect(telegramCard).toBeVisible({ timeout: 10000 });
    await expect(telegramCard.locator('h3')).toContainText('Integrasi Notifikasi Pelari (Telegram Bot)');
    await expect(telegramCard).toContainText('Meneruskan pesan dukungan yang disetujui ke Telegram Bot / Channel secara otomatis agar notifikasi muncul di smartwatch pelari.');

    // 4. Verify input placeholders and helper text
    const botTokenInput = telegramCard.locator('#telegram-bot-token');
    const chatIdInput = telegramCard.locator('#telegram-chat-id');
    await expect(botTokenInput).toBeVisible();
    await expect(chatIdInput).toBeVisible();
    await expect(botTokenInput).toHaveAttribute('placeholder', '0000000:AAbbCCddEeFFggHH');
    await expect(chatIdInput).toHaveAttribute('placeholder', '@example_chat atau -100xxxxxxxxxx');
    await expect(telegramCard.locator('text=Bisa berupa User ID (misal: 12345678)')).toBeVisible();

    // 5. Verify manual save button is completely removed
    await expect(telegramCard.locator('#btn-save-telegram-credentials')).toHaveCount(0);
    await expect(telegramCard.locator('text=Simpan Kredensial')).toHaveCount(0);

    // 6. Fill credentials in form and verify debounced auto-save triggers "Tersimpan Otomatis"
    await botTokenInput.fill('987654321:XYZtestBotTokenForE2EAssertion   ');
    await chatIdInput.fill('   @runners_cheer_channel   ');
    await botTokenInput.blur();
    await chatIdInput.blur();

    await expect(page.locator('text=Tersimpan Otomatis')).toBeVisible({ timeout: 5000 });

    // 7. Test Instant Push Toggle
    const instantToggle = telegramCard.locator('#toggle-telegram-instant');
    await expect(instantToggle).toBeVisible();
    const initialInstantChecked = await instantToggle.getAttribute('aria-checked');
    await instantToggle.click();
    const nextInstantChecked = await instantToggle.getAttribute('aria-checked');
    expect(nextInstantChecked).not.toBe(initialInstantChecked);

    // 8. Test Periodic Broadcaster Toggle
    const periodicToggle = telegramCard.locator('#toggle-telegram-periodic');
    await expect(periodicToggle).toBeVisible();
    const initialPeriodicChecked = await periodicToggle.getAttribute('aria-checked');
    await periodicToggle.click();
    const nextPeriodicChecked = await periodicToggle.getAttribute('aria-checked');
    expect(nextPeriodicChecked).not.toBe(initialPeriodicChecked);

    // 9. Test Interval preset pill click
    const preset15mBtn = telegramCard.locator('button:has-text("15m")');
    await expect(preset15mBtn).toBeVisible();
    await preset15mBtn.click();
    await expect(telegramCard.locator('text=Tiap 15 Menit')).toBeVisible();

    // 10. Verify Wearable preview card has been completely removed
    await expect(telegramCard.locator('text=/Format Tampilan Smartwatch/i')).toHaveCount(0);
    await expect(telegramCard.locator('text=/Payload Ringkas/i')).toHaveCount(0);

    // 11. Test "Kirim Pesan Uji Coba" button presence and click
    const testBtn = telegramCard.locator('#btn-test-telegram');
    await expect(testBtn).toBeVisible();
    await expect(testBtn).toBeEnabled();
    await testBtn.click();
  });

  test('should categorize messages into like-weighted tiers (Tier 1: >=50, Tier 2: 10-49, Tier 3: <10)', () => {
    expect(getMessageTier(100)).toBe(1);
    expect(getMessageTier(50)).toBe(1);
    expect(getMessageTier(49)).toBe(2);
    expect(getMessageTier(10)).toBe(2);
    expect(getMessageTier(9)).toBe(3);
    expect(getMessageTier(0)).toBe(3);

    const mockMessages: Message[] = [
      { id: '1', name: 'A', is_anonymous: false, message: 'msg1', created_at: '', likes: 65, status: 'approved' },
      { id: '2', name: 'B', is_anonymous: false, message: 'msg2', created_at: '', likes: 50, status: 'approved' },
      { id: '3', name: 'C', is_anonymous: false, message: 'msg3', created_at: '', likes: 25, status: 'approved' },
      { id: '4', name: 'D', is_anonymous: false, message: 'msg4', created_at: '', likes: 10, status: 'approved' },
      { id: '5', name: 'E', is_anonymous: false, message: 'msg5', created_at: '', likes: 8, status: 'approved' },
      { id: '6', name: 'F', is_anonymous: false, message: 'msg6', created_at: '', likes: 0, status: 'approved' },
    ];

    const { tier1, tier2, tier3 } = categorizeIntoTiers(mockMessages);
    expect(tier1.map((m) => m.id)).toEqual(['1', '2']);
    expect(tier2.map((m) => m.id)).toEqual(['3', '4']);
    expect(tier3.map((m) => m.id)).toEqual(['5', '6']);
  });

  test('should shuffle arrays with Fisher-Yates without mutating or losing elements', () => {
    const original = Array.from({ length: 30 }, (_, i) => `item-${i}`);
    const shuffled = fisherYatesShuffle(original);

    expect(shuffled).toHaveLength(original.length);
    expect(new Set(shuffled).size).toBe(original.length);
    for (const item of original) {
      expect(shuffled).toContain(item);
    }
  });

  test('should generate tiered cycle queue with Tier 1 preceding Tier 2 and Tier 3, and prevent boundary repetition', () => {
    const mockMessages: Message[] = [
      { id: 't3-a', name: 'A', is_anonymous: false, message: 'low', created_at: '', likes: 2, status: 'approved' },
      { id: 't1-a', name: 'B', is_anonymous: false, message: 'high', created_at: '', likes: 90, status: 'approved' },
      { id: 't2-a', name: 'C', is_anonymous: false, message: 'mid', created_at: '', likes: 20, status: 'approved' },
      { id: 't1-b', name: 'D', is_anonymous: false, message: 'high2', created_at: '', likes: 55, status: 'approved' },
      { id: 't2-b', name: 'E', is_anonymous: false, message: 'mid2', created_at: '', likes: 12, status: 'approved' },
      { id: 't3-b', name: 'F', is_anonymous: false, message: 'low2', created_at: '', likes: 5, status: 'approved' },
    ];

    const queue = generateTieredCycleQueue(mockMessages);
    expect(queue).toHaveLength(6);

    // Indices 0 and 1 must be Tier 1 (likes >= 50)
    expect(queue[0].likes).toBeGreaterThanOrEqual(50);
    expect(queue[1].likes).toBeGreaterThanOrEqual(50);

    // Indices 2 and 3 must be Tier 2 (10 <= likes < 50)
    expect(queue[2].likes).toBeGreaterThanOrEqual(10);
    expect(queue[2].likes).toBeLessThan(50);
    expect(queue[3].likes).toBeGreaterThanOrEqual(10);
    expect(queue[3].likes).toBeLessThan(50);

    // Indices 4 and 5 must be Tier 3 (likes < 10)
    expect(queue[4].likes).toBeLessThan(10);
    expect(queue[5].likes).toBeLessThan(10);

    // Test cycle boundary duplicate prevention
    // If lastSentId is 't1-a', the new cycle queue should not start with 't1-a'
    const queueWithAvoidance = generateTieredCycleQueue(mockMessages, 't1-a');
    expect(queueWithAvoidance[0].id).not.toBe('t1-a');
  });

  test('should run a non-repeating cycle where every approved message is dispatched exactly once before reshuffling', () => {
    resetCycleQueue();
    expect(getCycleNumber()).toBe(1);
    expect(getCycleQueue()).toEqual([]);
    expect(getCycleDispatched()).toEqual([]);

    const dispatchedIds: string[] = [];
    const firstResult = getNextPeriodicCheerMessage();
    expect(firstResult).not.toBeNull();
    expect(firstResult?.isNewCycle).toBe(true);
    expect(firstResult?.cycleNumber).toBe(1);

    dispatchedIds.push(firstResult!.message.id);
    const totalRemaining = firstResult!.remainingInCycle;

    // Dispatch all remaining messages in Cycle 1
    for (let i = 0; i < totalRemaining; i++) {
      const next = getNextPeriodicCheerMessage();
      expect(next).not.toBeNull();
      expect(next?.cycleNumber).toBe(1);
      expect(dispatchedIds).not.toContain(next!.message.id);
      dispatchedIds.push(next!.message.id);
    }

    // Now cycle 1 queue is exhausted:
    expect(getCycleQueue()).toHaveLength(0);
    expect(dispatchedIds.length).toBe(totalRemaining + 1);

    // Next call must trigger cycle 2 reset and reshuffle!
    const cycle2Start = getNextPeriodicCheerMessage();
    expect(cycle2Start).not.toBeNull();
    expect(cycle2Start?.isNewCycle).toBe(true);
    expect(cycle2Start?.cycleNumber).toBe(2);
    expect(getCycleNumber()).toBe(2);
  });

  test('should return extended cycle metadata and tier counts via /api/cron/cheer-tick', async ({ request }) => {
    const cronRes = await request.get('/api/cron/cheer-tick', {
      headers: { Authorization: 'Bearer kmzway87aa' },
    });
    expect(cronRes.ok()).toBeTruthy();
    const cronData = await cronRes.json();
    expect(cronData.success).toBe(true);
    expect(cronData.cycle).toBeDefined();
    expect(typeof cronData.cycle.cycleNumber).toBe('number');
    expect(typeof cronData.cycle.remaining).toBe('number');
    expect(typeof cronData.cycle.dispatched).toBe('number');
    expect(typeof cronData.cycle.totalApproved).toBe('number');
    expect(cronData.scheduler.tierCounts).toBeDefined();
    expect(typeof cronData.scheduler.tierCounts.tier1).toBe('number');
    expect(typeof cronData.scheduler.tierCounts.tier2).toBe('number');
    expect(typeof cronData.scheduler.tierCounts.tier3).toBe('number');
  });
});
