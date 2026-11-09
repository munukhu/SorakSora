import { NextResponse } from "next/server";
import { getRandomMessage } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeId = searchParams.get("exclude") || undefined;
    const message = getRandomMessage(excludeId);

    if (!message) {
      return NextResponse.json(
        { success: false, error: "No messages available" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Failed to get random message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get random message" },
      { status: 500 }
    );
  }
}
