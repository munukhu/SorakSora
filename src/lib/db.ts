import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import {
  Message,
  CreateMessageInput,
  AppSettings,
  DEFAULT_ARCHIVE_ANNOUNCEMENT,
} from "./types";
import { DEFAULT_BANNED_WORDS, DEFAULT_BANNED_WORDS_STR } from "./profanityFilter";

interface MessageRow {
  id: string;
  unique_id?: string;
  name: string;
  is_anonymous: number;
  message: string;
  created_at: string;
  likes: number;
  status?: string;
  is_pinned?: number;
  color?: string;
  is_flagged?: number;
  flagged_reason?: string;
  severity_score?: number;
  flagged_categories?: string;
  matched_words?: string;
}

export const INDONESIAN_SEED_MESSAGES = [
  {
    name: "Maya & Teman-teman",
    is_anonymous: 0,
    message: "Semangat terus ya, kamu pasti bisa lewatin ini! Percaya sama prosesmu. 🌟",
    minutesAgo: 10,
    likes: 24,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Jangan lupa napas, nikmati setiap prosesnya! Kamu sudah melangkah sejauh ini dan itu luar biasa.",
    minutesAgo: 22,
    likes: 38,
  },
  {
    name: "Budi Pratama",
    is_anonymous: 0,
    message: "Bangga banget liat perjuanganmu sampai di titik ini! Terus melangkah dengan kepala tegak ya!",
    minutesAgo: 45,
    likes: 31,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Gaspol! Doa terbaik dari sini selalu menyertaimu. Semesta mendukung niat baikmu! ✨",
    minutesAgo: 70,
    likes: 45,
  },
  {
    name: "Dinda",
    is_anonymous: 0,
    message: "Istirahat sebentar nggak apa-apa kok, yang penting jangan menyerah. Kamu berharga banget!",
    minutesAgo: 95,
    likes: 52,
  },
  {
    name: "Sahabat Setia",
    is_anonymous: 0,
    message: "Setiap langkah kecilmu itu berarti besar. Jangan pernah ragu sama potensi luar biasa dalam dirimu!",
    minutesAgo: 130,
    likes: 27,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Hari ini mungkin terasa berat, tapi ingat kamu jauh lebih kuat dari apa yang kamu kira! 💪",
    minutesAgo: 180,
    likes: 41,
  },
  {
    name: "Samir",
    is_anonymous: 0,
    message: "Ingat alasan kenapa kamu pertama kali memulai. Kami semua bangga dan terus mendukungmu!",
    minutesAgo: 230,
    likes: 33,
  },
  {
    name: "Siti A.",
    is_anonymous: 0,
    message: "Pelan-pelan asal jalan terus. Hasil manis dan kebahagiaan sedang menunggumu di depan.",
    minutesAgo: 290,
    likes: 49,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Kirim peluk hangat dan energi positif buat kamu hari ini! Kamu hebat dan tak tergantikan. 💛",
    minutesAgo: 350,
    likes: 29,
  },
  {
    name: "Arif K.",
    is_anonymous: 0,
    message: "Gagal coba lagi, lelah rehat dulu. Yang terpenting kamu sudah berani melangkah hari ini!",
    minutesAgo: 420,
    likes: 39,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Semua usaha, keringat, dan doamu nggak akan ada yang sia-sia. Tetap tersenyum ya! 🌻",
    minutesAgo: 490,
    likes: 46,
  },
  {
    name: "Dimas & Rara",
    is_anonymous: 0,
    message: "Tunjukkan yang terbaik hari ini! Jangan biarkan keraguan kecil menghalangi langkah besarmu.",
    minutesAgo: 580,
    likes: 32,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Tarik napas panjang, hembuskan perlahan. Kamu pasti bisa menyelesaikan apa yang sudah kamu mulai!",
    minutesAgo: 690,
    likes: 35,
  },
  {
    name: "Keluarga Besar",
    is_anonymous: 0,
    message: "Melihat kegigihanmu membuat kami semua kagum dan terinspirasi. Terus bersinar ya!",
    minutesAgo: 790,
    likes: 54,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Fokus pada hari ini, selangkah demi selangkah. Jangan khawatir berlebihan tentang hari esok.",
    minutesAgo: 890,
    likes: 37,
  },
  {
    name: "Reza",
    is_anonymous: 0,
    message: "Senyum lebar-lebar! Hari ini adalah panggung pembuktian untuk dirimu sendiri. Kamu juara! 🚀",
    minutesAgo: 980,
    likes: 43,
  },
  {
    name: "Anonim",
    is_anonymous: 1,
    message: "Kamu nggak berjuang sendirian, ada banyak doa baik yang selalu mengiringi langkahmu di setiap detik.",
    minutesAgo: 1100,
    likes: 63,
  },
  {
    name: "Nora",
    is_anonymous: 0,
    message: "Apapun hasilnya nanti, kamu sudah memberikan yang paling maksimal. Bangga banget sama kamu! 👏",
    minutesAgo: 1250,
    likes: 48,
  },
  {
    name: "Zack",
    is_anonymous: 0,
    message: "Kamu sudah berhasil melewati masa-masa tersulitmu di masa lalu, dan kamu pasti bisa melewatinya lagi!",
    minutesAgo: 1380,
    likes: 30,
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __showup_db: DatabaseSync | undefined;
}

function getDatabase(): DatabaseSync {
  if (global.__showup_db) {
    return global.__showup_db;
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "showup.db");
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode for high concurrency
  db.exec("PRAGMA journal_mode = WAL;");

  // Create table matching exact schema requirements with status, is_pinned, color, is_flagged, and safety metadata
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      unique_id TEXT UNIQUE,
      name TEXT NOT NULL DEFAULT 'Anonim',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '',
      is_flagged INTEGER NOT NULL DEFAULT 0,
      flagged_reason TEXT NOT NULL DEFAULT '',
      severity_score REAL NOT NULL DEFAULT 0,
      flagged_categories TEXT NOT NULL DEFAULT '',
      matched_words TEXT NOT NULL DEFAULT ''
    );
  `);

  // Create settings table for dynamic site configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrate existing databases that might lack the columns
  try {
    db.exec("ALTER TABLE messages ADD COLUMN unique_id TEXT;");
  } catch {
    // Column already exists
  }
  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_id ON messages (unique_id);");
  } catch {
    // Index already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN color TEXT NOT NULL DEFAULT '';");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN is_flagged INTEGER NOT NULL DEFAULT 0;");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN flagged_reason TEXT NOT NULL DEFAULT '';");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN severity_score REAL NOT NULL DEFAULT 0;");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN flagged_categories TEXT NOT NULL DEFAULT '';");
  } catch {
    // Column already exists
  }
  try {
    db.exec("ALTER TABLE messages ADD COLUMN matched_words TEXT NOT NULL DEFAULT '';");
  } catch {
    // Column already exists
  }

  // Initialize default settings if not present
  const defaultSettings: Record<string, string> = {
    auto_accept: "false",
    about_description:
      "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch.",
    max_char_limit: "280",
    announcement_enabled: "false",
    is_archived: "false",
    archive_announcement: DEFAULT_ARCHIVE_ANNOUNCEMENT,
    announcement_text:
      "Selamat datang di SorakSora! Bagikan energi positif dan kata-kata penyemangatmu hari ini! ✨",
    enable_content_moderation: "true",
    enable_builtin_filter: "true",
    enable_custom_filter: "true",
    enable_url_filter: "true",
    banned_words: DEFAULT_BANNED_WORDS_STR,
    whitelist_words: "",
    filter_preset: "moderate",
    filter_severity_threshold: "0.5",
    filter_detect_leetspeak: "true",
    filter_detect_split: "true",
    filter_detect_dialects: "true",
    filter_censor_mode: "first_last",
    rate_limit_enabled: "false",
    rate_limit_max_submissions: "3",
    rate_limit_window_minutes: "5",
    profanity_filter_enabled: "true",
    spam_filter_enabled: "true",
  };

  const insertSettingStmt = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);"
  );
  for (const [key, val] of Object.entries(defaultSettings)) {
    insertSettingStmt.run(key, val);
  }

  // Rebrand only the untouched legacy announcement default; preserve administrator customizations.
  try {
    const legacyAnnouncement =
      "Selamat datang di ShowUp! Bagikan energi positif dan kata-kata penyemangatmu hari ini! ✨";
    db.prepare(
      "UPDATE settings SET value = ? WHERE key = 'announcement_text' AND value = ?"
    ).run(defaultSettings.announcement_text, legacyAnnouncement);
  } catch {
    // Ignore migration error
  }

  // Auto-migrate legacy/political words in banned_words to clean 28 curated words
  try {
    const currentBanned = db
      .prepare("SELECT value FROM settings WHERE key = 'banned_words'")
      .get() as { value: string } | undefined;
    if (
      currentBanned &&
      (currentBanned.value.includes("prabowo") ||
        currentBanned.value.includes("anjing, bangsat"))
    ) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'banned_words'").run(
        DEFAULT_BANNED_WORDS_STR
      );
    }
  } catch {
    // Ignore migration error
  }

  // Check if seeding is needed
  const countResult = db.prepare("SELECT COUNT(*) as count FROM messages;").get() as { count: number } | undefined;

  if (!countResult || countResult.count === 0) {
    db.exec("DELETE FROM messages;");

    const insertStmt = db.prepare(`
      INSERT INTO messages (id, unique_id, name, is_anonymous, message, created_at, likes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'approved');
    `);

    const now = Date.now();
    for (const item of INDONESIAN_SEED_MESSAGES) {
      const id = crypto.randomUUID();
      const uniqueId = generateUniqueShortId(db);
      const createdAt = new Date(now - item.minutesAgo * 60 * 1000).toISOString();
      insertStmt.run(id, uniqueId, item.name, item.is_anonymous, item.message, createdAt, item.likes);
    }
  } else {
    // Backfill any existing messages without a unique_id
    try {
      const rowsWithoutUniqueId = db
        .prepare("SELECT id FROM messages WHERE unique_id IS NULL OR unique_id = ''")
        .all() as unknown as { id: string }[];
      if (rowsWithoutUniqueId.length > 0) {
        const updateStmt = db.prepare("UPDATE messages SET unique_id = ? WHERE id = ?");
        for (const row of rowsWithoutUniqueId) {
          updateStmt.run(generateUniqueShortId(db), row.id);
        }
      }
    } catch (err) {
      console.error("Backfill unique_id error:", err);
    }
  }

  global.__showup_db = db;
  return db;
}

export function generateUniqueShortId(db: DatabaseSync): string {
  const chars = "0123456789abcdef";
  for (let attempt = 0; attempt < 50; attempt++) {
    let hex = "";
    for (let i = 0; i < 4; i++) {
      hex += chars[Math.floor(Math.random() * chars.length)];
    }
    const candidate = `su-${hex}`;
    try {
      const existing = db.prepare("SELECT id FROM messages WHERE unique_id = ?").get(candidate);
      if (!existing) return candidate;
    } catch {
      return candidate;
    }
  }
  return `su-${Date.now().toString(36).slice(-4)}`;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    unique_id: row.unique_id || undefined,
    name: row.is_anonymous ? "Anonim" : (row.name || "Anonim"),
    is_anonymous: Boolean(row.is_anonymous),
    message: row.message,
    created_at: row.created_at,
    likes: row.likes || 0,
    status: (row.status as Message["status"]) || "approved",
    is_pinned: Boolean(row.is_pinned),
    color: row.color || "",
    is_flagged: Boolean(row.is_flagged),
    flagged_reason: row.flagged_reason || "",
    severity_score: typeof row.severity_score === "number" ? row.severity_score : 0,
    flagged_categories: row.flagged_categories || "",
    matched_words: row.matched_words || "",
  };
}

export {
  checkBuiltinProfanity,
  checkCustomWordlist,
  checkSpamUrl,
  checkContentModeration,
  checkContentSafety,
  getDisplayMessage,
  checkProfanity,
  checkProfanityOrSpam,
} from "./profanityFilter";

/**
 * Public Query: Only returns APPROVED messages for public wall, shuffle, and archive
 */
export function getAllMessages(search?: string, filter?: string): Message[] {
  const db = getDatabase();
  let query = "SELECT * FROM messages";
  const params: (string | number)[] = [];
  const conditions: string[] = ["status = 'approved'"];

  if (search && search.trim()) {
    conditions.push("(message LIKE ? OR name LIKE ?)");
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (filter === "anonymous") {
    conditions.push("is_anonymous = 1");
  } else if (filter === "named") {
    conditions.push("is_anonymous = 0");
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  if (filter === "oldest") {
    query += " ORDER BY is_pinned DESC, created_at ASC";
  } else if (filter === "newest") {
    query += " ORDER BY is_pinned DESC, created_at DESC";
  } else {
    // Primary Sorting Hierarchy (Love-First): Pinned messages always on top, then likes descending, tie-broken by created_at ascending
    query += " ORDER BY is_pinned DESC, likes DESC, created_at ASC";
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as unknown as MessageRow[];
  return rows.map(rowToMessage);
}

export function getMessageById(id: string): Message | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM messages WHERE id = ?");
  const row = stmt.get(id) as unknown as MessageRow | undefined;
  if (!row) return null;
  return rowToMessage(row);
}

export function getMessageByUniqueId(uniqueId: string): Message | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM messages WHERE unique_id = ?");
  const row = stmt.get(uniqueId) as unknown as MessageRow | undefined;
  if (!row) return null;
  return rowToMessage(row);
}

export function getMessageByUniqueIdOrId(idOrUniqueId: string): Message | null {
  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT * FROM messages WHERE (unique_id = ? OR id = ?) AND status = 'approved' LIMIT 1"
  );
  const row = stmt.get(idOrUniqueId, idOrUniqueId) as unknown as MessageRow | undefined;
  if (!row) return null;
  return rowToMessage(row);
}

export function getSetting(key: string, defaultValue: string = ""): string {
  const db = getDatabase();
  const stmt = db.prepare("SELECT value FROM settings WHERE key = ?;");
  const row = stmt.get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value;
  `);
  stmt.run(key, value);
}

export function isAutoAcceptEnabled(): boolean {
  return getSetting("auto_accept", "false") === "true";
}

export function isContentModerationEnabled(): boolean {
  return getSetting("enable_content_moderation", "true") === "true";
}

export function isBuiltinFilterEnabled(): boolean {
  return getSetting("enable_builtin_filter", "true") === "true";
}

export function isCustomFilterEnabled(): boolean {
  return (
    getSetting("enable_custom_filter", getSetting("profanity_filter_enabled", "true")) === "true"
  );
}

export function isUrlFilterEnabled(): boolean {
  return getSetting("enable_url_filter", getSetting("spam_filter_enabled", "true")) === "true";
}

export function isProfanityFilterEnabled(): boolean {
  return isCustomFilterEnabled();
}

export function isSpamFilterEnabled(): boolean {
  return isUrlFilterEnabled();
}

export function getBannedWords(): string {
  return getSetting("banned_words", DEFAULT_BANNED_WORDS_STR);
}

export function getWhitelistWords(): string {
  return getSetting("whitelist_words", "");
}

export function getFilterPreset(): "strict" | "moderate" | "light" | "childSafe" {
  return (getSetting("filter_preset", "moderate") as "strict" | "moderate" | "light" | "childSafe");
}

export function getFilterSeverityThreshold(): number {
  return parseFloat(getSetting("filter_severity_threshold", "0.5")) || 0.5;
}

export function isFilterDetectLeetspeak(): boolean {
  return getSetting("filter_detect_leetspeak", "true") === "true";
}

export function isFilterDetectSplit(): boolean {
  return getSetting("filter_detect_split", "true") === "true";
}

export function isFilterDetectDialects(): boolean {
  return getSetting("filter_detect_dialects", "true") === "true";
}

export function getFilterCensorMode(): "normal" | "first_last" | "grawlix" | "asterisk" | "none" {
  return (getSetting("filter_censor_mode", "first_last") as "normal" | "first_last" | "grawlix" | "asterisk" | "none");
}

export function isRateLimitEnabled(): boolean {
  return getSetting("rate_limit_enabled", "false") === "true";
}

export function getRateLimitMaxSubmissions(): number {
  return parseInt(getSetting("rate_limit_max_submissions", "3"), 10) || 3;
}

export function getRateLimitWindowMinutes(): number {
  return parseInt(getSetting("rate_limit_window_minutes", "5"), 10) || 5;
}

export function getAboutDescription(): string {
  return getSetting(
    "about_description",
    "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch."
  );
}

export function getMaxCharLimit(): number {
  return parseInt(getSetting("max_char_limit", "280"), 10) || 280;
}

export function isArchiveModeEnabled(): boolean {
  return getSetting("is_archived", "false") === "true";
}

export function resetSettings(): AppSettings {
  const defaults: Record<string, string> = {
    auto_accept: "false",
    about_description:
      "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch.",
    max_char_limit: "280",
    announcement_enabled: "false",
    is_archived: "false",
    archive_announcement: DEFAULT_ARCHIVE_ANNOUNCEMENT,
    announcement_text:
      "Selamat datang di SorakSora! Bagikan energi positif dan kata-kata penyemangatmu hari ini! ✨",
    enable_content_moderation: "true",
    enable_builtin_filter: "true",
    enable_custom_filter: "true",
    enable_url_filter: "true",
    banned_words: DEFAULT_BANNED_WORDS_STR,
    whitelist_words: "",
    filter_preset: "moderate",
    filter_severity_threshold: "0.5",
    filter_detect_leetspeak: "true",
    filter_detect_split: "true",
    filter_detect_dialects: "true",
    filter_censor_mode: "first_last",
    rate_limit_enabled: "false",
    rate_limit_max_submissions: "3",
    rate_limit_window_minutes: "5",
    profanity_filter_enabled: "true",
    spam_filter_enabled: "true",
    telegram_bot_token: "",
    telegram_chat_id: "",
    telegram_instant_enabled: "false",
    telegram_periodic_enabled: "false",
    telegram_interval_minutes: "10",
    telegram_last_sent_at: "0",
    telegram_last_sent_id: "",
  };
  for (const [k, v] of Object.entries(defaults)) {
    setSetting(k, v);
  }
  return getAllSettings();
}

export function getAllSettings(): AppSettings {
  return {
    auto_accept: isAutoAcceptEnabled(),
    about_description: getAboutDescription(),
    max_char_limit: parseInt(getSetting("max_char_limit", "280"), 10) || 280,
    announcement_enabled: getSetting("announcement_enabled", "false") === "true",
    is_archived: isArchiveModeEnabled(),
    archive_announcement: getSetting(
      "archive_announcement",
      DEFAULT_ARCHIVE_ANNOUNCEMENT
    ),
    announcement_text: getSetting(
      "announcement_text",
      "Selamat datang di SorakSora! Bagikan energi positif dan kata-kata penyemangatmu hari ini! ✨"
    ),
    enable_content_moderation: isContentModerationEnabled(),
    enable_builtin_filter: isBuiltinFilterEnabled(),
    enable_custom_filter: isCustomFilterEnabled(),
    enable_url_filter: isUrlFilterEnabled(),
    banned_words: getBannedWords(),
    whitelist_words: getSetting("whitelist_words", ""),
    filter_preset: (getSetting("filter_preset", "moderate") as "strict" | "moderate" | "light" | "childSafe"),
    filter_severity_threshold: parseFloat(getSetting("filter_severity_threshold", "0.5")) || 0.5,
    filter_detect_leetspeak: getSetting("filter_detect_leetspeak", "true") === "true",
    filter_detect_split: getSetting("filter_detect_split", "true") === "true",
    filter_detect_dialects: getSetting("filter_detect_dialects", "true") === "true",
    filter_censor_mode: (getSetting("filter_censor_mode", "first_last") as "normal" | "first_last" | "grawlix" | "asterisk" | "none"),
    rate_limit_enabled: isRateLimitEnabled(),
    rate_limit_max_submissions: getRateLimitMaxSubmissions(),
    rate_limit_window_minutes: getRateLimitWindowMinutes(),
    telegram_bot_token: getSetting("telegram_bot_token", process.env.TELEGRAM_BOT_TOKEN || ""),
    telegram_chat_id: getSetting("telegram_chat_id", process.env.TELEGRAM_CHAT_ID || ""),
    telegram_instant_enabled: getSetting("telegram_instant_enabled", "false") === "true",
    telegram_periodic_enabled: getSetting("telegram_periodic_enabled", "false") === "true",
    telegram_interval_minutes: parseInt(getSetting("telegram_interval_minutes", "10"), 10) || 10,
    telegram_last_sent_at: parseInt(getSetting("telegram_last_sent_at", "0"), 10) || 0,
    telegram_last_sent_id: getSetting("telegram_last_sent_id", ""),
    profanity_filter_enabled: isCustomFilterEnabled(),
    spam_filter_enabled: isUrlFilterEnabled(),
  };
}

export function createMessage(input: CreateMessageInput): Message {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const uniqueId = input.unique_id || generateUniqueShortId(db);
  const isAnonymous = Boolean(input.is_anonymous);
  const name = isAnonymous ? "Anonim" : (input.name?.trim() || "Anonim");
  const createdAt = new Date().toISOString();
  const message = input.message.trim();
  const autoAccept = isAutoAcceptEnabled();
  const color = input.color?.trim() || "";
  const isFlagged = input.is_flagged ? 1 : 0;
  const flaggedReason = input.flagged_reason?.trim() || "";
  const severityScore = typeof input.severity_score === "number" ? input.severity_score : 0;
  const flaggedCategories = input.flagged_categories?.trim() || "";
  const matchedWords = input.matched_words?.trim() || "";
  const status = input.status || (autoAccept ? "approved" : "pending");

  const stmt = db.prepare(`
    INSERT INTO messages (id, unique_id, name, is_anonymous, message, created_at, likes, status, is_pinned, color, is_flagged, flagged_reason, severity_score, flagged_categories, matched_words)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  stmt.run(
    id,
    uniqueId,
    name,
    isAnonymous ? 1 : 0,
    message,
    createdAt,
    status,
    input.is_pinned ? 1 : 0,
    color,
    isFlagged,
    flaggedReason,
    severityScore,
    flaggedCategories,
    matchedWords
  );

  return {
    id,
    unique_id: uniqueId,
    name,
    is_anonymous: isAnonymous,
    message,
    created_at: createdAt,
    likes: 0,
    status,
    is_pinned: Boolean(input.is_pinned),
    color,
    is_flagged: Boolean(isFlagged),
    flagged_reason: flaggedReason,
    severity_score: severityScore,
    flagged_categories: flaggedCategories,
    matched_words: matchedWords,
  };
}

export function likeMessage(id: string, count: number = 1): Message | null {
  const db = getDatabase();
  const increment = Math.max(1, count);
  const stmt = db.prepare("UPDATE messages SET likes = likes + ? WHERE id = ?");
  stmt.run(increment, id);
  return getMessageById(id);
}

export function getRandomMessage(excludeId?: string): Message | null {
  const db = getDatabase();
  let query = "SELECT * FROM messages WHERE status = 'approved'";
  const params: string[] = [];

  if (excludeId) {
    query += " AND id != ?";
    params.push(excludeId);
  }

  query += " ORDER BY RANDOM() LIMIT 1";

  const stmt = db.prepare(query);
  const row = stmt.get(...params) as unknown as MessageRow | undefined;
  if (!row) {
    const fallback = db.prepare("SELECT * FROM messages WHERE status = 'approved' LIMIT 1").get() as unknown as MessageRow | undefined;
    return fallback ? rowToMessage(fallback) : null;
  }
  return rowToMessage(row);
}

export function getApprovedMessages(): Message[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM messages WHERE status = 'approved' ORDER BY likes DESC, created_at DESC;").all() as unknown as MessageRow[];
  return rows.map(rowToMessage);
}

/* =========================================================================
 * ADMIN MODERATION & MANAGEMENT DATABASE METHODS
 * ========================================================================= */

export function getAdminMessages(status?: string, search?: string): Message[] {
  const db = getDatabase();
  let query = "SELECT * FROM messages";
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  if (status && status !== "all") {
    conditions.push("status = ?");
    params.push(status);
  }

  if (search && search.trim()) {
    conditions.push("(message LIKE ? OR name LIKE ?)");
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY is_pinned DESC, created_at DESC";

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as unknown as MessageRow[];
  return rows.map(rowToMessage);
}

export function getAdminStats() {
  const db = getDatabase();

  const totalRow = db.prepare("SELECT COUNT(*) as count FROM messages;").get() as { count: number };
  const pendingRow = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'pending';").get() as { count: number };
  const approvedRow = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'approved';").get() as { count: number };
  const rejectedRow = db.prepare("SELECT COUNT(*) as count FROM messages WHERE status = 'rejected';").get() as { count: number };
  const likesRow = db.prepare("SELECT COALESCE(SUM(likes), 0) as total FROM messages;").get() as { total: number };

  return {
    total: totalRow?.count || 0,
    pending: pendingRow?.count || 0,
    approved: approvedRow?.count || 0,
    rejected: rejectedRow?.count || 0,
    totalLikes: likesRow?.total || 0,
  };
}

export function updateMessageStatus(id: string, status: "pending" | "approved" | "rejected"): Message | null {
  const db = getDatabase();
  const stmt = db.prepare("UPDATE messages SET status = ? WHERE id = ?;");
  stmt.run(status, id);
  return getMessageById(id);
}

export function updateMessageDetails(
  id: string,
  data: {
    name?: string;
    is_anonymous?: boolean;
    message?: string;
    likes?: number;
    status?: "pending" | "approved" | "rejected";
    is_pinned?: boolean;
    color?: string;
    is_flagged?: boolean;
    flagged_reason?: string;
    severity_score?: number;
    flagged_categories?: string;
    matched_words?: string;
  }
): Message | null {
  const db = getDatabase();
  const current = getMessageById(id);
  if (!current) return null;

  const newName = data.name !== undefined ? (data.is_anonymous ? "Anonim" : data.name.trim() || "Anonim") : current.name;
  const newIsAnonymous = data.is_anonymous !== undefined ? (data.is_anonymous ? 1 : 0) : (current.is_anonymous ? 1 : 0);
  const newMessage = data.message !== undefined ? data.message.trim() : current.message;
  const newLikes = data.likes !== undefined ? Math.max(0, data.likes) : current.likes;
  const newStatus = data.status !== undefined ? data.status : current.status;
  const newIsPinned = data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : (current.is_pinned ? 1 : 0);
  const newColor = data.color !== undefined ? data.color : (current.color || "");
  const newIsFlagged = data.is_flagged !== undefined ? (data.is_flagged ? 1 : 0) : (current.is_flagged ? 1 : 0);
  const newFlaggedReason = data.flagged_reason !== undefined ? data.flagged_reason : (current.flagged_reason || "");
  const newSeverityScore = data.severity_score !== undefined ? data.severity_score : (current.severity_score || 0);
  const newFlaggedCategories = data.flagged_categories !== undefined ? data.flagged_categories : (current.flagged_categories || "");
  const newMatchedWords = data.matched_words !== undefined ? data.matched_words : (current.matched_words || "");

  const stmt = db.prepare(`
    UPDATE messages
    SET name = ?, is_anonymous = ?, message = ?, likes = ?, status = ?, is_pinned = ?, color = ?, is_flagged = ?, flagged_reason = ?, severity_score = ?, flagged_categories = ?, matched_words = ?
    WHERE id = ?;
  `);

  stmt.run(
    newName,
    newIsAnonymous,
    newMessage,
    newLikes,
    newStatus,
    newIsPinned,
    newColor,
    newIsFlagged,
    newFlaggedReason,
    newSeverityScore,
    newFlaggedCategories,
    newMatchedWords,
    id
  );
  return getMessageById(id);
}

export function deleteMessage(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM messages WHERE id = ?;");
  stmt.run(id);
  return true;
}

export function batchUpdateStatus(ids: string[], status: "pending" | "approved" | "rejected"): number {
  if (!ids.length) return 0;
  const db = getDatabase();
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(`UPDATE messages SET status = ? WHERE id IN (${placeholders});`);
  stmt.run(status, ...ids);
  return ids.length;
}

export function batchDeleteMessages(ids: string[]): number {
  if (!ids.length) return 0;
  const db = getDatabase();
  const placeholders = ids.map(() => "?").join(",");
  const stmt = db.prepare(`DELETE FROM messages WHERE id IN (${placeholders});`);
  stmt.run(...ids);
  return ids.length;
}

export function getAllMessagesForExport(): Message[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM messages ORDER BY created_at DESC;");
  const rows = stmt.all() as unknown as MessageRow[];
  return rows.map(rowToMessage);
}

