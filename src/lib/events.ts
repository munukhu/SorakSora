import { EventEmitter } from "node:events";
import { Message, AppSettings } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __showup_events: EventEmitter | undefined;
}

export function getEventBus(): EventEmitter {
  if (!global.__showup_events) {
    global.__showup_events = new EventEmitter();
    global.__showup_events.setMaxListeners(1000);
  }
  return global.__showup_events;
}

export type RealtimeEvent =
  | { type: "message:created"; message: Message }
  | { type: "message:updated"; id: string; message: Message }
  | { type: "message:loved"; id: string; likes: number }
  | {
      type: "message:status_changed";
      id: string;
      status: "pending" | "approved" | "rejected";
      message?: Message;
    }
  | { type: "message:deleted"; id: string }
  | { type: "settings:updated"; settings: AppSettings };

export function broadcastEvent(event: RealtimeEvent): void {
  try {
    const bus = getEventBus();
    bus.emit("realtime", event);
  } catch (err) {
    console.error("Failed to broadcast realtime event:", err);
  }
}
