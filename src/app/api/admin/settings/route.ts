import { NextResponse } from "next/server";
import { verifyAdminSession, getCorsHeaders } from "@/lib/auth";
import { getAllSettings, setSetting, resetSettings } from "@/lib/db";
import { broadcastEvent } from "@/lib/events";
import {
  startTelegramScheduler,
  stopTelegramScheduler,
  syncTelegramScheduler,
  resetCycleQueue,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: Request) {
  const isAuthorized = await verifyAdminSession(request);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: "Akses ditolak" },
      { status: 401, headers: getCorsHeaders(request) }
    );
  }

  // Ensure scheduler state matches DB settings
  syncTelegramScheduler(false);

  try {
    const settings = getAllSettings();
    return NextResponse.json(
      { success: true, settings },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to fetch admin settings:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat pengaturan" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function PATCH(request: Request) {
  const isAuthorized = await verifyAdminSession(request);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: "Akses ditolak" },
      { status: 401, headers: getCorsHeaders(request) }
    );
  }

  try {
    const body = await request.json();

    if (body.action === "reset") {
      const reset = resetSettings();
      stopTelegramScheduler();
      resetCycleQueue();
      broadcastEvent({
        type: "settings:updated",
        settings: reset,
      });
      return NextResponse.json(
        { success: true, settings: reset },
        { headers: getCorsHeaders(request) }
      );
    }

    if (typeof body.auto_accept === "boolean") {
      setSetting("auto_accept", body.auto_accept ? "true" : "false");
    }
    if (typeof body.about_description === "string") {
      setSetting("about_description", body.about_description.trim());
    }
    if (typeof body.max_char_limit === "number" && body.max_char_limit > 0) {
      setSetting("max_char_limit", String(Math.floor(body.max_char_limit)));
    }
    if (typeof body.announcement_enabled === "boolean") {
      setSetting("announcement_enabled", body.announcement_enabled ? "true" : "false");
    }
    if (typeof body.announcement_text === "string") {
      setSetting("announcement_text", body.announcement_text.trim());
    }
    if (typeof body.is_archived === "boolean") {
      setSetting("is_archived", body.is_archived ? "true" : "false");
    }
    if (typeof body.archive_announcement === "string") {
      setSetting("archive_announcement", body.archive_announcement.trim());
    }
    if (typeof body.enable_content_moderation === "boolean") {
      setSetting("enable_content_moderation", body.enable_content_moderation ? "true" : "false");
    }
    if (typeof body.enable_builtin_filter === "boolean") {
      setSetting("enable_builtin_filter", body.enable_builtin_filter ? "true" : "false");
    }
    if (typeof body.enable_custom_filter === "boolean") {
      setSetting("enable_custom_filter", body.enable_custom_filter ? "true" : "false");
      setSetting("profanity_filter_enabled", body.enable_custom_filter ? "true" : "false");
    }
    if (typeof body.enable_url_filter === "boolean") {
      setSetting("enable_url_filter", body.enable_url_filter ? "true" : "false");
      setSetting("spam_filter_enabled", body.enable_url_filter ? "true" : "false");
    }
    if (typeof body.profanity_filter_enabled === "boolean") {
      setSetting("profanity_filter_enabled", body.profanity_filter_enabled ? "true" : "false");
      setSetting("enable_custom_filter", body.profanity_filter_enabled ? "true" : "false");
    }
    if (typeof body.banned_words === "string") {
      setSetting("banned_words", body.banned_words.trim());
    }
    if (typeof body.whitelist_words === "string") {
      setSetting("whitelist_words", body.whitelist_words.trim());
    }
    if (typeof body.filter_preset === "string" && ["strict", "moderate", "light", "childSafe"].includes(body.filter_preset)) {
      setSetting("filter_preset", body.filter_preset);
    }
    if (body.filter_severity_threshold !== undefined && body.filter_severity_threshold !== null) {
      const val = parseFloat(String(body.filter_severity_threshold));
      if (!isNaN(val) && val >= 0 && val <= 1) {
        setSetting("filter_severity_threshold", String(val));
      }
    }
    if (typeof body.filter_detect_leetspeak === "boolean") {
      setSetting("filter_detect_leetspeak", body.filter_detect_leetspeak ? "true" : "false");
    }
    if (typeof body.filter_detect_split === "boolean") {
      setSetting("filter_detect_split", body.filter_detect_split ? "true" : "false");
    }
    if (typeof body.filter_detect_dialects === "boolean") {
      setSetting("filter_detect_dialects", body.filter_detect_dialects ? "true" : "false");
    }
    if (typeof body.filter_censor_mode === "string" && ["normal", "none", "grawlix", "asterisk", "first_last"].includes(body.filter_censor_mode)) {
      setSetting("filter_censor_mode", body.filter_censor_mode === "none" ? "normal" : body.filter_censor_mode);
    }
    if (typeof body.rate_limit_enabled === "boolean") {
      setSetting("rate_limit_enabled", body.rate_limit_enabled ? "true" : "false");
    }
    if (typeof body.rate_limit_max_submissions === "number" && body.rate_limit_max_submissions > 0) {
      setSetting("rate_limit_max_submissions", String(Math.floor(body.rate_limit_max_submissions)));
    }
    if (typeof body.rate_limit_window_minutes === "number" && body.rate_limit_window_minutes > 0) {
      setSetting("rate_limit_window_minutes", String(Math.floor(body.rate_limit_window_minutes)));
    }
    if (typeof body.spam_filter_enabled === "boolean") {
      setSetting("spam_filter_enabled", body.spam_filter_enabled ? "true" : "false");
      setSetting("enable_url_filter", body.spam_filter_enabled ? "true" : "false");
    }
    if (typeof body.telegram_bot_token === "string") {
      setSetting("telegram_bot_token", body.telegram_bot_token.trim());
    }
    if (typeof body.telegram_chat_id === "string") {
      setSetting("telegram_chat_id", body.telegram_chat_id.trim());
    }
    if (typeof body.telegram_instant_enabled === "boolean") {
      setSetting("telegram_instant_enabled", body.telegram_instant_enabled ? "true" : "false");
    }
    if (typeof body.telegram_periodic_enabled === "boolean") {
      const isEnabled = body.telegram_periodic_enabled;
      setSetting("telegram_periodic_enabled", isEnabled ? "true" : "false");
      if (isEnabled) {
        // Immediate activation: initialize cooldown starting point and start loop
        setSetting("telegram_last_sent_at", Date.now().toString());
        startTelegramScheduler();
      } else {
        // Immediately clear timer handles and deactivate broadcaster
        stopTelegramScheduler();
      }
    }
    if (typeof body.telegram_interval_minutes === "number" && body.telegram_interval_minutes > 0) {
      setSetting("telegram_interval_minutes", String(Math.floor(body.telegram_interval_minutes)));
      syncTelegramScheduler(false);
    }

    const updatedSettings = getAllSettings();
    broadcastEvent({
      type: "settings:updated",
      settings: updatedSettings,
    });

    return NextResponse.json(
      { success: true, settings: updatedSettings },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to update admin settings:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui pengaturan" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
