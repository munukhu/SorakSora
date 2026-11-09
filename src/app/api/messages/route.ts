import { NextResponse } from "next/server";
import {
  getAllMessages,
  createMessage,
  isAutoAcceptEnabled,
  isContentModerationEnabled,
  isBuiltinFilterEnabled,
  isCustomFilterEnabled,
  isUrlFilterEnabled,
  getBannedWords,
  getWhitelistWords,
  getFilterPreset,
  getFilterSeverityThreshold,
  isFilterDetectLeetspeak,
  isFilterDetectSplit,
  isFilterDetectDialects,
  getFilterCensorMode,
  checkContentModeration,
  isRateLimitEnabled,
  getRateLimitMaxSubmissions,
  getRateLimitWindowMinutes,
  getMaxCharLimit,
  getSetting,
  isArchiveModeEnabled,
} from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimiter";
import { broadcastEvent } from "@/lib/events";
import {
  sendTelegramCheer,
  ensureTelegramSchedulerStarted,
  resetPeriodicCooldown,
  registerApprovedMessageInCycle,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const filter = searchParams.get("filter") || undefined;

    const messages = getAllMessages(search, filter);
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil pesan dukungan" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (isArchiveModeEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Dinding pesan sedang diarsipkan. Pengiriman pesan baru ditutup.",
          code: "ARCHIVE_MODE",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, is_anonymous, message, color } = body;

    const rawMessage = typeof message === "string" ? message : "";
    const sanitizedMessage = rawMessage
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!sanitizedMessage) {
      return NextResponse.json(
        { success: false, error: "Pesan dukungan tidak boleh kosong" },
        { status: 400 }
      );
    }

    const charLimit = getMaxCharLimit();
    if (sanitizedMessage.length > charLimit) {
      return NextResponse.json(
        { success: false, error: `Pesan dukungan melebihi batas ${charLimit} karakter` },
        { status: 400 }
      );
    }

    // Rate Limiting Enforcement (Anti-flood / Anti-spam bot)
    if (isRateLimitEnabled()) {
      const visitorId = request.headers.get("x-visitor-id")?.trim() || "";
      const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
      const realIp = request.headers.get("x-real-ip")?.trim() || "";
      const clientIp = forwardedFor || realIp || "127.0.0.1";
      const rateLimitIdentifier = visitorId ? `vid:${visitorId}` : `ip:${clientIp}`;

      const maxSubmissions = getRateLimitMaxSubmissions();
      const windowMinutes = getRateLimitWindowMinutes();
      const rlResult = checkRateLimit(rateLimitIdentifier, maxSubmissions, windowMinutes);

      if (!rlResult.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Anda mengirim pesan terlalu cepat. Silakan tunggu ${rlResult.formattedWaitTime} lagi.`,
            code: "RATE_LIMITED",
            remainingSeconds: rlResult.remainingSeconds,
            formattedWaitTime: rlResult.formattedWaitTime,
            remaining_time: rlResult.formattedWaitTime,
          },
          { status: 429 }
        );
      }
    }

    const autoAccept = isAutoAcceptEnabled();
    const enableContentModeration = isContentModerationEnabled();
    const enableBuiltin = isBuiltinFilterEnabled();
    const enableCustom = isCustomFilterEnabled();
    const enableUrl = isUrlFilterEnabled();
    const bannedWords = getBannedWords();
    const whitelistWords = getWhitelistWords();
    const filterPreset = getFilterPreset();
    const severityThreshold = getFilterSeverityThreshold();
    const detectLeetspeak = isFilterDetectLeetspeak();
    const detectSplit = isFilterDetectSplit();
    const detectDialects = isFilterDetectDialects();
    const censorMode = getFilterCensorMode();

    const senderName = typeof name === "string" ? name.trim() : "";
    const isAnonymous = Boolean(is_anonymous);

    if (!isAnonymous) {
      if (!senderName) {
        return NextResponse.json(
          { success: false, error: "Silakan isi Nama/Alias kamu jika tidak anonim." },
          { status: 400 }
        );
      }
      if (senderName.toLowerCase() === "anonim") {
        return NextResponse.json(
          {
            success: false,
            error: "Nama tidak boleh diisi 'Anonim'. Aktifkan toggle 'Kirim sebagai Anonim' jika ingin mengirim tanpa nama.",
          },
          { status: 400 }
        );
      }
    }

    // Multi-tier Moderation Check:
    // Runs checks with full @sideid/id-profanity-filter capabilities, dialect coverage, and thresholds
    const moderation = checkContentModeration({
      message: sanitizedMessage,
      name: senderName,
      isAnonymous,
      settings: {
        enable_content_moderation: enableContentModeration,
        enable_builtin_filter: enableBuiltin,
        enable_custom_filter: enableCustom,
        enable_url_filter: enableUrl,
        banned_words: bannedWords,
        whitelist_words: whitelistWords,
        filter_preset: filterPreset,
        filter_severity_threshold: severityThreshold,
        filter_detect_leetspeak: detectLeetspeak,
        filter_detect_split: detectSplit,
        filter_detect_dialects: detectDialects,
        filter_censor_mode: censorMode,
      },
    });

    const isIntercepted = moderation.isFlagged;

    // Override auto-accept if intercepted
    const willAutoAccept = autoAccept && !isIntercepted;

    const newMessage = createMessage({
      name: isAnonymous ? "Anonim" : senderName,
      is_anonymous: isAnonymous,
      message: sanitizedMessage,
      status: willAutoAccept ? "approved" : "pending",
      color: typeof color === "string" ? color.trim() : "",
      is_flagged: Boolean(isIntercepted),
      flagged_reason: moderation.flaggedReason,
      severity_score: moderation.severityScore,
      flagged_categories: moderation.flaggedCategories.join(", "),
      matched_words: moderation.matchedWords.join(", "),
    });

    // Real-time broadcast to admin dashboard queue and public cheer wall
    broadcastEvent({
      type: "message:created",
      message: newMessage,
    });

    // Instant Telegram Push Notification for runners / smartwatch
    if (newMessage.status === "approved") {
      if (getSetting("telegram_instant_enabled", "false") === "true") {
        sendTelegramCheer(newMessage).catch((err) => {
          console.error("[Telegram] Instant push on submit failed:", err);
        });
        // Prioritize live cheer: reset periodic random cooldown so the timer restarts from zero
        resetPeriodicCooldown(newMessage.id);
      } else {
        // Seamlessly register into active cycle queue according to its like tier
        registerApprovedMessageInCycle(newMessage, false);
      }
    }

    // Ensure periodic background loop is running
    ensureTelegramSchedulerStarted();

    const notice = isIntercepted
      ? "Pesanmu telah dikirim dan sedang dalam proses peninjauan sebelum tampil di cheer wall."
      : undefined;

    return NextResponse.json(
      {
        success: true,
        message: newMessage,
        autoAccepted: newMessage.status === "approved",
        notice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan pesan dukungan" },
      { status: 500 }
    );
  }
}
