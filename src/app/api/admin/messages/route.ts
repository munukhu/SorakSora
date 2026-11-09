import { NextResponse } from "next/server";
import { verifyAdminSession, getCorsHeaders } from "@/lib/auth";
import {
  getAdminMessages,
  getAdminStats,
  getMessageById,
  updateMessageDetails,
  deleteMessage,
  batchUpdateStatus,
  batchDeleteMessages,
  getSetting,
} from "@/lib/db";
import { broadcastEvent } from "@/lib/events";
import {
  sendTelegramCheer,
  resetPeriodicCooldown,
  registerApprovedMessageInCycle,
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

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || undefined;

    const messages = getAdminMessages(status, search);
    const stats = getAdminStats();

    return NextResponse.json(
      { success: true, messages, stats },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to load admin messages:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat pesan admin" },
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
    const {
      id,
      name,
      is_anonymous,
      message,
      likes,
      status,
      is_pinned,
      color,
      is_flagged,
      flagged_reason,
      severity_score,
      flagged_categories,
      matched_words,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID pesan diperlukan" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const sanitizedMessage = typeof message === "string"
      ? message.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()
      : message;

    const updated = updateMessageDetails(id, {
      name,
      is_anonymous,
      message: sanitizedMessage,
      likes,
      status,
      is_pinned,
      color,
      is_flagged,
      flagged_reason,
      severity_score,
      flagged_categories,
      matched_words,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Pesan tidak ditemukan" },
        { status: 404, headers: getCorsHeaders(request) }
      );
    }

    // Always broadcast message update so real-time clients re-sort or update pin/content
    broadcastEvent({
      type: "message:updated",
      id: updated.id,
      message: updated,
    });

    if (status !== undefined) {
      broadcastEvent({
        type: "message:status_changed",
        id: updated.id,
        status: updated.status,
        message: updated,
      });

      if (updated.status === "approved") {
        broadcastEvent({
          type: "message:created",
          message: updated,
        });

        if (getSetting("telegram_instant_enabled", "false") === "true") {
          sendTelegramCheer(updated).catch((err) => {
            console.error("[Telegram] Instant push on admin approval failed:", err);
          });
          resetPeriodicCooldown(updated.id);
        } else {
          registerApprovedMessageInCycle(updated, false);
        }
      }
    }

    const stats = getAdminStats();
    return NextResponse.json(
      { success: true, message: updated, stats },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to update message:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui pesan" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function DELETE(request: Request) {
  const isAuthorized = await verifyAdminSession(request);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: "Akses ditolak" },
      { status: 401, headers: getCorsHeaders(request) }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // Ignore JSON parse errors
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID pesan diperlukan untuk menghapus" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    deleteMessage(id);
    broadcastEvent({
      type: "message:deleted",
      id,
    });

    const stats = getAdminStats();

    return NextResponse.json(
      { success: true, stats },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to delete message:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus pesan" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function POST(request: Request) {
  const isAuthorized = await verifyAdminSession(request);
  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: "Akses ditolak" },
      { status: 401, headers: getCorsHeaders(request) }
    );
  }

  try {
    const body = await request.json();
    const { action, ids, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih setidaknya satu pesan" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    let affected = 0;
    const isTelegramInstant = getSetting("telegram_instant_enabled", "false") === "true";

    if (action === "batch-approve") {
      affected = batchUpdateStatus(ids, "approved");
      for (const id of ids) {
        const msg = getMessageById(id);
        if (msg) {
          broadcastEvent({ type: "message:created", message: msg });
          broadcastEvent({ type: "message:status_changed", id, status: "approved", message: msg });
          if (isTelegramInstant) {
            sendTelegramCheer(msg).catch((err) => {
              console.error("[Telegram] Batch-approve push failed:", err);
            });
            resetPeriodicCooldown(msg.id);
          } else {
            registerApprovedMessageInCycle(msg, false);
          }
        }
      }
    } else if (action === "batch-reject") {
      affected = batchUpdateStatus(ids, "rejected");
      for (const id of ids) {
        broadcastEvent({ type: "message:status_changed", id, status: "rejected" });
      }
    } else if (action === "batch-status" && status) {
      affected = batchUpdateStatus(ids, status);
      for (const id of ids) {
        const msg = getMessageById(id);
        broadcastEvent({ type: "message:status_changed", id, status, message: msg || undefined });
        if (status === "approved" && msg) {
          broadcastEvent({ type: "message:created", message: msg });
          if (isTelegramInstant) {
            sendTelegramCheer(msg).catch((err) => {
              console.error("[Telegram] Batch-status push failed:", err);
            });
            resetPeriodicCooldown(msg.id);
          } else {
            registerApprovedMessageInCycle(msg, false);
          }
        }
      }
    } else if (action === "batch-delete") {
      affected = batchDeleteMessages(ids);
      for (const id of ids) {
        broadcastEvent({ type: "message:deleted", id });
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Aksi batch tidak dikenal" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const stats = getAdminStats();
    return NextResponse.json(
      { success: true, affected, stats },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to execute batch action:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menjalankan aksi massal" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
