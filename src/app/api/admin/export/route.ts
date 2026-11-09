import { NextResponse } from "next/server";
import { verifyAdminSession, getCorsHeaders } from "@/lib/auth";
import { getAllMessagesForExport } from "@/lib/db";

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
    const format = searchParams.get("format") || "json";
    const messages = getAllMessagesForExport();

    const timestamp = new Date().toISOString().slice(0, 10);
    const cors = getCorsHeaders(request);

    if (format === "csv") {
      const header = ["ID", "Nama", "Anonim", "Pesan", "Love", "Status", "Waktu Dibuat"];
      const rows = messages.map((m) => [
        `"${m.id}"`,
        `"${m.name.replace(/"/g, '""')}"`,
        m.is_anonymous ? "Ya" : "Tidak",
        `"${m.message.replace(/"/g, '""').replace(/\n/g, " ")}"`,
        m.likes,
        `"${m.status}"`,
        `"${m.created_at}"`,
      ]);

      const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

      return new Response(csvContent, {
        headers: {
          ...cors,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="soraksora-messages-${timestamp}.csv"`,
        },
      });
    }

    // Default to JSON
    const jsonContent = JSON.stringify(messages, null, 2);
    return new Response(jsonContent, {
      headers: {
        ...cors,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="soraksora-messages-${timestamp}.json"`,
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengekspor data" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
