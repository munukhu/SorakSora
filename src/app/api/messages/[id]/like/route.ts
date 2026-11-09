import { NextResponse } from "next/server";
import { likeMessage } from "@/lib/db";
import { broadcastEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID pesan tidak valid" },
        { status: 400 }
      );
    }

    let incrementCount = 1;
    try {
      const body = await request.json();
      if (typeof body?.count === "number" && body.count > 0) {
        incrementCount = Math.min(body.count, 50); // Safe batch limit
      }
    } catch {
      // Body is empty or not JSON, default to 1
    }

    const updated = likeMessage(id, incrementCount);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Pesan tidak ditemukan" },
        { status: 404 }
      );
    }

    broadcastEvent({
      type: "message:loved",
      id: updated.id,
      likes: updated.likes,
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error("Failed to like message:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memberi semangat pada pesan" },
      { status: 500 }
    );
  }
}
