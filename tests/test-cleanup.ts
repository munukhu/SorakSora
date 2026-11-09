import type { APIRequestContext } from '@playwright/test';

const ADMIN_HEADERS = { Authorization: 'Bearer kmzway87aa' };

const TEST_KEYWORDS = [
  '[TEST]',
  'Pesan Rate Limit',
  'Semangat RealTime Test',
  'Pesan Terkena Filter',
  'Pelari Cepat',
  'Kawan Antigravity',
  'Budi Test',
  'teman rahasia [ID:',
  'Live Runner Cheer',
  'Archive Guard Test',
  'MultiLine Tester',
  'https://spam-link-test.com',
  'testing routing note',
];

/**
 * Clean up test messages by specific IDs or matching test patterns.
 */
export async function purgeTestMessages(
  request: APIRequestContext,
  options?: {
    ids?: string[];
    search?: string;
  }
) {
  try {
    // 1. Delete explicitly identified message IDs if provided
    if (options?.ids && options.ids.length > 0) {
      const validIds = options.ids.filter(Boolean);
      if (validIds.length > 0) {
        await request.post('/api/admin/messages', {
          headers: ADMIN_HEADERS,
          data: {
            action: 'batch-delete',
            ids: validIds,
          },
        });
      }
    }

    // 2. Query messages to find test artifacts matching known test signatures
    const searchUrl = `/api/admin/messages?status=all${
      options?.search ? `&search=${encodeURIComponent(options.search)}` : ''
    }`;
    const res = await request.get(searchUrl, {
      headers: ADMIN_HEADERS,
    });

    if (res.ok()) {
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        const targetIds = data.messages
          .filter((m: { name?: string; message?: string }) => {
            const combined = `${m.name || ''} ${m.message || ''}`;
            if (options?.search && combined.includes(options.search)) {
              return true;
            }
            return TEST_KEYWORDS.some((kw) => combined.includes(kw));
          })
          .map((m: { id: string }) => m.id);

        if (targetIds.length > 0) {
          await request.post('/api/admin/messages', {
            headers: ADMIN_HEADERS,
            data: {
              action: 'batch-delete',
              ids: targetIds,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to purge test messages:', err);
  }
}

