import { NextResponse } from "next/server";
import { verifyAdminSession, getCorsHeaders } from "@/lib/auth";
import { overwriteAllMessages, ImportMessageItem } from "@/lib/db";
import { broadcastEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
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
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Format file JSON tidak valid atau struktur data tidak sesuai" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    const rawList = Array.isArray(body)
      ? body
      : Array.isArray(body?.messages)
      ? body.messages
      : null;

    if (!rawList || !Array.isArray(rawList)) {
      return NextResponse.json(
        { success: false, error: "Format file JSON tidak valid atau struktur data tidak sesuai" },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    // Validate each entry: must have non-empty message and author/name
    const validatedItems: ImportMessageItem[] = [];

    for (const item of rawList) {
      if (!item || typeof item !== "object") {
        return NextResponse.json(
          { success: false, error: "Format file JSON tidak valid atau struktur data tidak sesuai" },
          { status: 400, headers: getCorsHeaders(request) }
        );
      }

      const message = typeof item.message === "string" ? item.message.trim() : "";
      const author = typeof item.author === "string"
        ? item.author.trim()
        : typeof item.name === "string"
        ? item.name.trim()
        : "";

      if (!message || !author) {
        return NextResponse.json(
          { success: false, error: "Format file JSON tidak valid atau struktur data tidak sesuai" },
          { status: 400, headers: getCorsHeaders(request) }
        );
      }

      validatedItems.push({
        unique_id: typeof item.unique_id === "string" ? item.unique_id.trim() : undefined,
        message,
        author,
        is_anonymous: Boolean(item.is_anonymous),
        color: typeof item.color === "string" ? item.color.trim() : "",
        likes_count:
          typeof item.likes_count === "number"
            ? item.likes_count
            : typeof item.likes === "number"
            ? item.likes
            : 0,
        status:
          typeof item.status === "string" && ["approved", "pending", "rejected"].includes(item.status.trim())
            ? item.status.trim()
            : "approved",
        created_at: typeof item.created_at === "string" ? item.created_at.trim() : undefined,
      });
    }

    const count = overwriteAllMessages(validatedItems);

    // Broadcast reload event so live clients and admin feeds refresh
    broadcastEvent({
      type: "message:updated",
      id: "all",
    });

    return NextResponse.json(
      {
        success: true,
        count,
        message: `Berhasil mengimpor ${count} pesan dan memperbarui dinding`,
      },
      { headers: getCorsHeaders(request) }
    );
  } catch (err) {
    console.error("Import failed:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat mengimpor data JSON" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
