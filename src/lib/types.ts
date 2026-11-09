export type MessageStatus = "pending" | "approved" | "rejected";

export interface Message {
  id: string;
  unique_id?: string;
  name: string;
  is_anonymous: boolean;
  message: string;
  created_at: string;
  likes: number;
  status: MessageStatus;
  is_pinned?: boolean;
  color?: string;
  is_flagged?: boolean;
  flagged_reason?: string;
  severity_score?: number;
  flagged_categories?: string;
  matched_words?: string;
}

export interface CreateMessageInput {
  unique_id?: string;
  name?: string;
  is_anonymous?: boolean;
  message: string;
  status?: MessageStatus;
  is_pinned?: boolean;
  color?: string;
  is_flagged?: boolean;
  flagged_reason?: string;
  severity_score?: number;
  flagged_categories?: string;
  matched_words?: string;
}

export interface SafetyCheckResult {
  isClean: boolean;
  severityScore: number; // 0 to 1
  flaggedCategories: string[];
  censoredText: string;
  matchedWords: string[];
  reason?: "profanity" | "custom_banned" | "url_spam";
}

export interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalLikes: number;
}

export const DEFAULT_ARCHIVE_ANNOUNCEMENT =
  "Dinding sorakan ini telah **diarsipkan**. Pengiriman pesan baru telah ditutup, namun seluruh pesan yang ada tetap dapat dibaca dan dijelajahi.";

export interface AppSettings {
  auto_accept: boolean;
  about_description: string;
  max_char_limit: number;
  announcement_enabled: boolean;
  announcement_text: string;
  is_archived: boolean;
  archive_announcement: string;
  enable_content_moderation?: boolean;
  enable_builtin_filter?: boolean;
  enable_custom_filter?: boolean;
  enable_url_filter?: boolean;
  banned_words?: string;
  whitelist_words?: string;
  filter_preset?: "strict" | "moderate" | "light" | "childSafe";
  filter_severity_threshold?: number;
  filter_detect_leetspeak?: boolean;
  filter_detect_split?: boolean;
  filter_detect_dialects?: boolean;
  filter_censor_mode?: "normal" | "first_last" | "grawlix" | "asterisk" | "none";
  rate_limit_enabled?: boolean;
  rate_limit_max_submissions?: number;
  rate_limit_window_minutes?: number;
  // Telegram Bot Runner & Smartwatch Notification Integration
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_instant_enabled?: boolean;
  telegram_periodic_enabled?: boolean;
  telegram_interval_minutes?: number;
  telegram_last_sent_at?: number;
  telegram_last_sent_id?: string;
  // Legacy compatibility
  profanity_filter_enabled?: boolean;
  spam_filter_enabled?: boolean;
}

export interface NoteColorPreset {
  id: string;
  name: string;
  hex: string;
  tailwind: string;
}

export const NOTE_COLOR_PRESETS: NoteColorPreset[] = [
  { id: "yellow", name: "Kuning (Lemon Pastel)", hex: "#FEF08A", tailwind: "bg-yellow-200" },
  { id: "green", name: "Hijau (Mint Pastel)", hex: "#BBF7D0", tailwind: "bg-green-200" },
  { id: "blue", name: "Biru (Sky Blue Pastel)", hex: "#BAE6FD", tailwind: "bg-sky-200" },
  { id: "pink", name: "Pink (Rose Pastel)", hex: "#FECDD3", tailwind: "bg-rose-200" },
  { id: "purple", name: "Ungu (Lavender Pastel)", hex: "#DDD6FE", tailwind: "bg-purple-200" },
  { id: "orange", name: "Oranye (Peach Pastel)", hex: "#FED7AA", tailwind: "bg-orange-200" },
  { id: "cyan", name: "Teal / Cyan (Aqua Pastel)", hex: "#A5F3FC", tailwind: "bg-cyan-200" },
  { id: "coral", name: "Merah (Soft Coral Pastel)", hex: "#FFB4B4", tailwind: "bg-red-200" },
  { id: "lime", name: "Lime (Matcha Pastel)", hex: "#D9F99D", tailwind: "bg-lime-200" },
  { id: "sand", name: "Cokelat (Sand Pastel)", hex: "#E7D4C0", tailwind: "bg-amber-100" },
  { id: "slate", name: "Abu-abu (Chalk Pastel)", hex: "#E2E8F0", tailwind: "bg-slate-200" },
];
