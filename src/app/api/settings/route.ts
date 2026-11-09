import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/db";
import { syncTelegramScheduler } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  syncTelegramScheduler(false);
  try {
    const settings = getAllSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat pengaturan" },
      { status: 500 }
    );
  }
}
