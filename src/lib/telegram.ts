import {
  getSetting,
  setSetting,
  getApprovedMessages,
  getMessageById,
} from "./db";
import { Message } from "./types";

/**
 * Minimalist notification format strictly optimized for smartwatch screen popups.
 * Output: "{message_text}" — {author_name}
 * Eliminates all emojis, header prefixes, tags, and footer links.
 */
export function formatTelegramCheer(message: string, authorName?: string): string {
  const author = authorName && authorName.trim() ? authorName.trim() : "Anonim";
  return `"${message.trim()}" — ${author}`;
}

export interface TelegramSendOptions {
  botToken?: string;
  chatId?: string;
}

export interface TelegramSendResult {
  success: boolean;
  error?: string;
  messageId?: number;
}

/**
 * Returns active Telegram credentials from DB settings with fallback to environment variables.
 */
export function getTelegramConfig(): { botToken: string; chatId: string } {
  const botToken = getSetting("telegram_bot_token", process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = getSetting("telegram_chat_id", process.env.TELEGRAM_CHAT_ID || "").trim();
  return { botToken, chatId };
}

/**
 * Send an arbitrary text message to Telegram Bot with a 5000ms timeout guard.
 */
export async function sendTelegramMessage(
  text: string,
  options?: TelegramSendOptions
): Promise<TelegramSendResult> {
  const config = getTelegramConfig();
  const botToken = options?.botToken !== undefined ? options.botToken.trim() : config.botToken;
  const chatId = options?.chatId !== undefined ? options.chatId.trim() : config.chatId;

  if (!botToken || !chatId) {
    return {
      success: false,
      error: "Telegram Bot Token atau Chat ID belum dikonfigurasi.",
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000), // 5000ms timeout guard
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      const errMsg =
        data?.description || `Telegram API error HTTP ${res.status}: ${res.statusText}`;
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: unknown) {
    const errorObj = err as { name?: string; message?: string };
    const isTimeout =
      errorObj?.name === "TimeoutError" || errorObj?.message?.toLowerCase().includes("timeout");
    return {
      success: false,
      error: isTimeout
        ? "Koneksi ke Telegram timeout (melebihi batas 5000ms)."
        : errorObj?.message || "Terjadi kesalahan koneksi ke Telegram.",
    };
  }
}

/**
 * Formats a cheer note and sends it to Telegram.
 */
export async function sendTelegramCheer(
  message: { message: string; name?: string; is_anonymous?: boolean },
  options?: TelegramSendOptions
): Promise<TelegramSendResult> {
  const authorName = message.is_anonymous ? "Anonim" : message.name;
  const text = formatTelegramCheer(message.message, authorName);
  return sendTelegramMessage(text, options);
}

/* =========================================================================
 * TIERED LIKE-WEIGHTED SHUFFLE & CYCLE MANAGEMENT
 * ========================================================================= */

/**
 * Tiered Engagement Buckets based on reaction/likes count:
 * - Tier 1 (High Engagement): >= 50 likes
 * - Tier 2 (Moderate Engagement): 10 - 49 likes
 * - Tier 3 (Base Engagement): < 10 likes
 */
export interface TierBuckets {
  tier1: Message[];
  tier2: Message[];
  tier3: Message[];
}

export function getMessageTier(likes: number): 1 | 2 | 3 {
  if (likes >= 50) return 1;
  if (likes >= 10) return 2;
  return 3;
}

export function categorizeIntoTiers(messages: Message[]): TierBuckets {
  const tier1: Message[] = [];
  const tier2: Message[] = [];
  const tier3: Message[] = [];

  for (const msg of messages) {
    const likes = typeof msg.likes === "number" ? msg.likes : 0;
    if (likes >= 50) {
      tier1.push(msg);
    } else if (likes >= 10) {
      tier2.push(msg);
    } else {
      tier3.push(msg);
    }
  }

  return { tier1, tier2, tier3 };
}

/**
 * Modern Fisher-Yates (Knuth) shuffle algorithm for unbiased uniform random permutation.
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Generates a complete cycle queue:
 * 1. Groups messages into like-weighted tiers.
 * 2. Individually shuffles each tier using Fisher-Yates.
 * 3. Concatenates tiers in descending priority order: Tier 1 -> Tier 2 -> Tier 3.
 * 4. Ensures no back-to-back duplicate across cycle boundaries if lastSentId is provided and queue length > 1.
 */
export function generateTieredCycleQueue(
  messages: Message[],
  lastSentId?: string
): Message[] {
  if (messages.length === 0) return [];

  const { tier1, tier2, tier3 } = categorizeIntoTiers(messages);
  const shuffledTier1 = fisherYatesShuffle(tier1);
  const shuffledTier2 = fisherYatesShuffle(tier2);
  const shuffledTier3 = fisherYatesShuffle(tier3);

  const cycleQueue = [...shuffledTier1, ...shuffledTier2, ...shuffledTier3];

  if (cycleQueue.length > 1 && lastSentId && cycleQueue[0].id === lastSentId) {
    const firstTier = getMessageTier(cycleQueue[0].likes || 0);
    const sameTierSwapIndex = cycleQueue.findIndex(
      (m, idx) => idx > 0 && m.id !== lastSentId && getMessageTier(m.likes || 0) === firstTier
    );
    const swapIndex =
      sameTierSwapIndex !== -1
        ? sameTierSwapIndex
        : cycleQueue.findIndex((m) => m.id !== lastSentId);

    if (swapIndex > 0) {
      const temp = cycleQueue[0];
      cycleQueue[0] = cycleQueue[swapIndex];
      cycleQueue[swapIndex] = temp;
    }
  }

  return cycleQueue;
}

/**
 * Cycle state persistence in SQLite settings table
 */
export function getCycleQueue(): string[] {
  try {
    const raw = getSetting("telegram_cycle_queue", "[]");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCycleQueue(queue: string[]): void {
  setSetting("telegram_cycle_queue", JSON.stringify(queue));
}

export function getCycleDispatched(): string[] {
  try {
    const raw = getSetting("telegram_cycle_dispatched", "[]");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCycleDispatched(dispatched: string[]): void {
  setSetting("telegram_cycle_dispatched", JSON.stringify(dispatched));
}

export function getCycleNumber(): number {
  const raw = getSetting("telegram_cycle_number", "1");
  const num = parseInt(raw, 10);
  return isNaN(num) || num < 1 ? 1 : num;
}

export function setCycleNumber(cycle: number): void {
  setSetting("telegram_cycle_number", String(Math.max(1, cycle)));
}

export function resetCycleQueue(): void {
  setCycleQueue([]);
  setCycleDispatched([]);
  setCycleNumber(1);
}

export interface NextCheerMessageResult {
  message: Message;
  cycleNumber: number;
  remainingInCycle: number;
  isNewCycle: boolean;
}

/**
 * Selects the next cheer message from the active tiered cycle queue.
 * When the queue is exhausted, it resets the cycle, re-evaluates all likes from DB,
 * reshuffles tiers, and begins anew.
 */
export function getNextPeriodicCheerMessage(): NextCheerMessageResult | null {
  const approved = getApprovedMessages();
  if (approved.length === 0) {
    return null;
  }

  const approvedMap = new Map(approved.map((m) => [m.id, m]));
  let queue = getCycleQueue().filter((id) => approvedMap.has(id));
  let cycleNumber = getCycleNumber();
  let isNewCycle = false;

  if (queue.length === 0) {
    const dispatched = getCycleDispatched();
    if (dispatched.length > 0) {
      cycleNumber += 1;
      setCycleNumber(cycleNumber);
    }
    setCycleDispatched([]);
    isNewCycle = true;

    const lastSentId = getSetting("telegram_last_sent_id", "").trim();
    const freshQueue = generateTieredCycleQueue(approved, lastSentId || undefined);
    queue = freshQueue.map((m) => m.id);
    setCycleQueue(queue);
  }

  if (queue.length === 0) {
    return null;
  }

  const nextId = queue.shift()!;
  setCycleQueue(queue);

  const dispatched = getCycleDispatched();
  if (!dispatched.includes(nextId)) {
    dispatched.push(nextId);
    setCycleDispatched(dispatched);
  }

  const message = approvedMap.get(nextId) || getMessageById(nextId);
  if (!message) {
    return getNextPeriodicCheerMessage();
  }

  return {
    message,
    cycleNumber,
    remainingInCycle: queue.length,
    isNewCycle,
  };
}

/**
 * Seamlessly registers an approved message into the cycle architecture.
 * - If already dispatched live to Telegram, records it as dispatched for the active cycle
 *   so it is not repeated in the current cycle, and will join subsequent cycles naturally.
 * - If not dispatched live, inserts it into the remaining cycle queue matching its like tier.
 */
export function registerApprovedMessageInCycle(
  message: Message,
  alreadyDispatchedLive: boolean = false
): void {
  if (alreadyDispatchedLive) {
    resetPeriodicCooldown(message.id);
    return;
  }

  const dispatched = getCycleDispatched();
  const queue = getCycleQueue();

  if (dispatched.includes(message.id) || queue.includes(message.id)) {
    return;
  }

  // Insert into active queue maintaining descending tier priority
  const messageTier = getMessageTier(message.likes || 0);
  const approved = getApprovedMessages();
  const approvedMap = new Map(approved.map((m) => [m.id, m]));

  let insertIndex = queue.length;
  for (let i = 0; i < queue.length; i++) {
    const existingMsg = approvedMap.get(queue[i]);
    const existingTier = existingMsg ? getMessageTier(existingMsg.likes || 0) : 3;
    if (messageTier < existingTier) {
      insertIndex = i;
      break;
    }
  }

  queue.splice(insertIndex, 0, message.id);
  setCycleQueue(queue);
}

export interface PeriodicCheerResult {
  success: boolean;
  sent?: boolean;
  error?: string;
  message?: Message;
  cycleNumber?: number;
  cycleRemaining?: number;
}

export interface SchedulerStatus {
  isActive: boolean;
  isEnabled: boolean;
  intervalMinutes: number;
  lastSentAt: number;
  nextDueInSeconds: number;
  cycleNumber: number;
  cycleRemaining: number;
  cycleDispatched: number;
  totalApproved: number;
  tierCounts: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
}

/**
 * Resets the cooldown timer for the periodic random broadcaster.
 * Used when a live incoming cheer is dispatched to Telegram, so that
 * live messages take absolute priority and restart the cooldown back to zero.
 * Also marks the message as dispatched in the active cycle to prevent duplicates.
 */
export function resetPeriodicCooldown(messageId?: string): void {
  const now = Date.now();
  setSetting("telegram_last_sent_at", now.toString());
  if (messageId) {
    setSetting("telegram_last_sent_id", messageId);

    // Remove from remaining queue if present
    const queue = getCycleQueue();
    if (queue.includes(messageId)) {
      setCycleQueue(queue.filter((id) => id !== messageId));
    }

    // Mark as dispatched for current cycle
    const dispatched = getCycleDispatched();
    if (!dispatched.includes(messageId)) {
      dispatched.push(messageId);
      setCycleDispatched(dispatched);
    }
  }
  syncTelegramScheduler(false);
}

/**
 * Returns current health and timing status of the in-process periodic scheduler.
 */
export function getTelegramSchedulerStatus(): SchedulerStatus {
  const isEnabled = getSetting("telegram_periodic_enabled", "false") === "true";
  const intervalMinutes =
    parseInt(getSetting("telegram_interval_minutes", "10"), 10) || 10;
  const lastSentAt = parseInt(getSetting("telegram_last_sent_at", "0"), 10) || 0;
  const now = Date.now();
  const elapsedMs = lastSentAt > 0 ? now - lastSentAt : 0;
  const intervalMs = intervalMinutes * 60 * 1000;
  const remainingMs = Math.max(0, intervalMs - elapsedMs);

  const approved = getApprovedMessages();
  const approvedMap = new Map(approved.map((m) => [m.id, m]));
  const queue = getCycleQueue().filter((id) => approvedMap.has(id));
  const dispatched = getCycleDispatched().filter((id) => approvedMap.has(id));
  const cycleNumber = getCycleNumber();
  const { tier1, tier2, tier3 } = categorizeIntoTiers(approved);

  return {
    isActive: globalThis.__telegramSchedulerTimer !== undefined,
    isEnabled,
    intervalMinutes,
    lastSentAt,
    nextDueInSeconds: Math.ceil(remainingMs / 1000),
    cycleNumber,
    cycleRemaining: queue.length,
    cycleDispatched: dispatched.length,
    totalApproved: approved.length,
    tierCounts: {
      tier1: tier1.length,
      tier2: tier2.length,
      tier3: tier3.length,
    },
  };
}

/**
 * Periodic Random Cheer Broadcaster:
 * Selects an approved cheer note following the Tiered Like-Weighted Non-Repeating Shuffle Cycle
 * and dispatches it to Telegram.
 */
export async function dispatchRandomPeriodicCheer(
  force: boolean = false
): Promise<PeriodicCheerResult> {
  const isEnabled = getSetting("telegram_periodic_enabled", "false") === "true";
  if (!isEnabled && !force) {
    return { success: true, sent: false, error: "Broadcaster berkala dinonaktifkan." };
  }

  const intervalMinutes =
    parseInt(getSetting("telegram_interval_minutes", "10"), 10) || 10;
  let lastSentAt = parseInt(getSetting("telegram_last_sent_at", "0"), 10) || 0;
  const now = Date.now();
  const requiredMs = intervalMinutes * 60 * 1000;

  if (!force) {
    if (lastSentAt === 0) {
      // Initialize cooldown starting point
      setSetting("telegram_last_sent_at", now.toString());
      lastSentAt = now;
      return {
        success: true,
        sent: false,
        error: `Broadcaster berkala diinisialisasi. Menunggu ${intervalMinutes} menit sebelum broadcast pertama.`,
      };
    }

    const elapsedMs = now - lastSentAt;
    if (elapsedMs < requiredMs) {
      return {
        success: true,
        sent: false,
        error: `Interval belum tercapai (${Math.ceil((requiredMs - elapsedMs) / 1000)} detik tersisa).`,
      };
    }
  }

  const nextCheer = getNextPeriodicCheerMessage();

  if (!nextCheer || !nextCheer.message) {
    return {
      success: false,
      sent: false,
      error: "Tidak ada pesan dukungan yang disetujui untuk dikirim.",
    };
  }

  const selectedMsg = nextCheer.message;
  const sendResult = await sendTelegramCheer(selectedMsg);
  if (!sendResult.success) {
    return {
      success: false,
      sent: false,
      error: sendResult.error,
      message: selectedMsg,
      cycleNumber: nextCheer.cycleNumber,
      cycleRemaining: nextCheer.remainingInCycle,
    };
  }

  // Update last sent metadata in database to restart interval cooldown
  setSetting("telegram_last_sent_id", selectedMsg.id);
  setSetting("telegram_last_sent_at", Date.now().toString());

  return {
    success: true,
    sent: true,
    message: selectedMsg,
    cycleNumber: nextCheer.cycleNumber,
    cycleRemaining: nextCheer.remainingInCycle,
  };
}

// Global timer instance for in-process background scheduling in Node.js runtime
declare global {
  // eslint-disable-next-line no-var
  var __telegramSchedulerTimer: NodeJS.Timeout | undefined;
}

/**
 * Stops any running background in-process timer handle immediately.
 */
export function stopTelegramScheduler(): void {
  if (globalThis.__telegramSchedulerTimer) {
    clearInterval(globalThis.__telegramSchedulerTimer);
    globalThis.__telegramSchedulerTimer = undefined;
  }
}

/**
 * Starts the background periodic broadcaster loop.
 * Immediately initializes last_sent_at cooldown and checks every 5 seconds.
 */
export function startTelegramScheduler(): void {
  if (typeof window !== "undefined") return;

  stopTelegramScheduler();

  const isEnabled = getSetting("telegram_periodic_enabled", "false") === "true";
  if (!isEnabled) return;

  const lastSentAt = parseInt(getSetting("telegram_last_sent_at", "0"), 10) || 0;
  if (lastSentAt === 0) {
    setSetting("telegram_last_sent_at", Date.now().toString());
  }

  // Active evaluation loop: ticks every 5 seconds to evaluate interval conditions
  globalThis.__telegramSchedulerTimer = setInterval(async () => {
    try {
      const active = getSetting("telegram_periodic_enabled", "false") === "true";
      if (!active) {
        stopTelegramScheduler();
        return;
      }

      const intervalMinutes =
        parseInt(getSetting("telegram_interval_minutes", "10"), 10) || 10;
      const currentLastSent = parseInt(getSetting("telegram_last_sent_at", "0"), 10) || 0;
      const now = Date.now();
      const intervalMs = intervalMinutes * 60 * 1000;

      if (currentLastSent === 0) {
        setSetting("telegram_last_sent_at", now.toString());
        return;
      }

      if (now - currentLastSent >= intervalMs) {
        await dispatchRandomPeriodicCheer(false);
      }
    } catch (err) {
      console.error("[TelegramScheduler] background tick error:", err);
    }
  }, 5000); // 5-second tick resolution
}

/**
 * Synchronizes the scheduler timer state with the active DB configuration.
 */
export function syncTelegramScheduler(forceRestart: boolean = false): void {
  if (typeof window !== "undefined") return;

  const isEnabled = getSetting("telegram_periodic_enabled", "false") === "true";
  if (!isEnabled) {
    stopTelegramScheduler();
  } else if (!globalThis.__telegramSchedulerTimer || forceRestart) {
    startTelegramScheduler();
  }
}

/**
 * Backward compatibility alias for starting the scheduler if enabled.
 */
export function ensureTelegramSchedulerStarted(): void {
  syncTelegramScheduler(false);
}
