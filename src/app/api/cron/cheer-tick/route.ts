import { NextResponse } from "next/server";
import {
  dispatchRandomPeriodicCheer,
  ensureTelegramSchedulerStarted,
  getTelegramSchedulerStatus,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const adminSecret = process.env.ADMIN_SECRET?.trim();

  // If no secret is configured, allow internal endpoint access
  if (!cronSecret && !adminSecret) return true;

  const authHeader = request.headers.get("authorization")?.trim() || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const xCronHeader = request.headers.get("x-cron-secret")?.trim() || "";

  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret")?.trim() || "";

  if (cronSecret && (token === cronSecret || xCronHeader === cronSecret || querySecret === cronSecret)) {
    return true;
  }

  if (adminSecret && (token === adminSecret || querySecret === adminSecret)) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  ensureTelegramSchedulerStarted();

  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Akses cron ditolak." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  try {
    const result = await dispatchRandomPeriodicCheer(force);
    const scheduler = getTelegramSchedulerStatus();
    return NextResponse.json(
      {
        success: result.success,
        sent: result.sent ?? false,
        scheduler,
        cycle: {
          cycleNumber: result.cycleNumber ?? scheduler.cycleNumber,
          remaining: result.cycleRemaining ?? scheduler.cycleRemaining,
          dispatched: scheduler.cycleDispatched,
          totalApproved: scheduler.totalApproved,
        },
        message: result.message
          ? {
              id: result.message.id,
              name: result.message.name,
              is_anonymous: result.message.is_anonymous,
              message: result.message.message,
            }
          : undefined,
        notice: result.error,
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error("[CronCheerTick] Error:", err);
    return NextResponse.json(
      { success: false, error: errorObj?.message || "Internal cron error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
