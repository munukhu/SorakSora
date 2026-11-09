import { NextRequest } from "next/server";
import { getEventBus, RealtimeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const bus = getEventBus();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial comment to establish the connection immediately
      controller.enqueue(new TextEncoder().encode(`: connected\n\n`));

      const onEvent = (event: RealtimeEvent) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch {
          // Stream might have been closed by client
        }
      };

      bus.on("realtime", onEvent);

      // Heartbeat comment every 15s to keep connections alive through reverse proxies & timeouts
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      cleanup = () => {
        bus.off("realtime", onEvent);
        clearInterval(heartbeat);
      };

      request.signal.addEventListener("abort", () => {
        cleanup?.();
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
