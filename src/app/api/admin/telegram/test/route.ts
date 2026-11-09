import { NextResponse } from "next/server";
import { verifyAdminSession, getCorsHeaders } from "@/lib/auth";
import { sendTelegramCheer } from "@/lib/telegram";

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
    const body = await request.json().catch(() => ({}));
    const { botToken, chatId, message, author } = body;

    const testMessage = typeof message === "string" && message.trim()
      ? message.trim()
      : "Ayo gas terus! KM 30 di depan mata!";
    const testAuthor = typeof author === "string" && author.trim()
      ? author.trim()
      : "Budi";

    const result = await sendTelegramCheer(
      {
        message: testMessage,
        name: testAuthor,
        is_anonymous: false,
      },
      {
        botToken: typeof botToken === "string" ? botToken : undefined,
        chatId: typeof chatId === "string" ? chatId : undefined,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Gagal mengirim pesan uji coba ke Telegram." },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Pesan uji coba berhasil dikirim ke Telegram!",
        messageId: result.messageId,
      },
      { status: 200, headers: getCorsHeaders(request) }
    );
  } catch (err: unknown) {
    console.error("Failed to send test telegram message:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat memproses pengujian Telegram." },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
