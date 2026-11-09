import { test, expect } from '@playwright/test';
import { purgeTestMessages } from './test-cleanup';

test.describe('Rate Limiting & Content Safety Dictionary Tests', () => {
  test.beforeEach(async ({ request }) => {
    // Authenticate and reset rate limiting to OFF before test
    await request.patch('/api/admin/settings', {
      headers: {
        'Authorization': 'Bearer kmzway87aa',
      },
      data: {
        rate_limit_enabled: false,
      },
    });
  });

  test.afterEach(async ({ request }) => {
    // Restore rate limit to OFF and clean test data after test
    await request.patch('/api/admin/settings', {
      headers: {
        'Authorization': 'Bearer kmzway87aa',
      },
      data: {
        rate_limit_enabled: false,
      },
    });
    await purgeTestMessages(request);
  });

  test('should enforce rate limit when enabled and return 429 with Neobrutalist message', async ({ request }) => {
    // 1. Enable rate limiting with max 2 submissions per 5 minutes
    const patchRes = await request.patch('/api/admin/settings', {
      headers: {
        'Authorization': 'Bearer kmzway87aa',
      },
      data: {
        rate_limit_enabled: true,
        rate_limit_max_submissions: 2,
        rate_limit_window_minutes: 5,
      },
    });
    expect(patchRes.ok()).toBeTruthy();

    const testVid = `test_visitor_${Date.now()}`;

    // 2. First submission (allowed)
    const res1 = await request.post('/api/messages', {
      headers: { 'x-visitor-id': testVid },
      data: {
        name: 'Tester 1',
        is_anonymous: false,
        message: `Pesan Rate Limit 1 - ${Date.now()}`,
      },
    });
    expect(res1.status()).toBe(201);

    // 3. Second submission (allowed)
    const res2 = await request.post('/api/messages', {
      headers: { 'x-visitor-id': testVid },
      data: {
        name: 'Tester 2',
        is_anonymous: false,
        message: `Pesan Rate Limit 2 - ${Date.now()}`,
      },
    });
    expect(res2.status()).toBe(201);

    // 4. Third submission (BLOCKED by rate limit with 429)
    const res3 = await request.post('/api/messages', {
      headers: { 'x-visitor-id': testVid },
      data: {
        name: 'Tester 3',
        is_anonymous: false,
        message: `Pesan Rate Limit 3 - ${Date.now()}`,
      },
    });
    expect(res3.status()).toBe(429);
    const data3 = await res3.json();
    expect(data3.success).toBe(false);
    expect(data3.error).toContain('Anda mengirim pesan terlalu cepat. Silakan tunggu');
    expect(data3.error).toContain('lagi.');
  });

  test('should verify 28 default banned words are non-political', async ({ request }) => {
    const res = await request.get('/api/admin/settings', {
      headers: {
        'Authorization': 'Bearer kmzway87aa',
      },
    });
    expect(res.ok()).toBeTruthy();
    let data = await res.json();
    expect(data.settings).toBeDefined();

    const initialList = (data.settings.banned_words || '').split(/[,\n;]/).filter((w: string) => w.trim().length > 0);
    let bannedStr: string = data.settings.banned_words || '';
    if (initialList.length !== 28) {
      await request.patch('/api/admin/settings', {
        headers: { 'Authorization': 'Bearer kmzway87aa' },
        data: { action: 'reset' },
      });
      const res2 = await request.get('/api/admin/settings', {
        headers: { 'Authorization': 'Bearer kmzway87aa' },
      });
      data = await res2.json();
      bannedStr = data.settings.banned_words || '';
    }

    const bannedWords = bannedStr
      .split(/[,\n;]/)
      .map((w: string) => w.trim().toLowerCase())
      .filter((w: string) => w.length > 0);

    // Verify exactly 28 words
    expect(bannedWords.length).toBe(28);

    // Verify key non-political scam & illicit terms are present
    expect(bannedWords).toContain('judi online');
    expect(bannedWords).toContain('slot gacor');
    expect(bannedWords).toContain('open bo');
    expect(bannedWords).toContain('pinjol ilegal');
    expect(bannedWords).toContain('hadiah pulsa gratis');

    // Strictly ensure no political names or figures are present
    expect(bannedWords).not.toContain('prabowo');
    expect(bannedWords).not.toContain('jokowi');
    expect(bannedWords).not.toContain('gibran');
    expect(bannedWords).not.toContain('anies');
    expect(bannedWords).not.toContain('ganjar');
  });
});
