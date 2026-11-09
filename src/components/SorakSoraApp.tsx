"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Message,
  CreateMessageInput,
  AppSettings,
  DEFAULT_ARCHIVE_ANNOUNCEMENT,
} from "@/lib/types";
import { WelcomeModal } from "./WelcomeModal";
import { CorkboardWall } from "./CorkboardWall";
import { FloatingDock } from "./FloatingDock";
import { SpotlightModal } from "./SpotlightModal";
import { DropCheerModal } from "./DropCheerModal";
import { ArchiveListModal } from "./ArchiveListModal";
import { ToastContainer, ToastMessage } from "./Toast";
import { fireConfetti, fireMegaConfetti, sortMessages, getCardFrame } from "@/lib/utils";

interface SorakSoraAppProps {
  initialMessages: Message[];
  initialSpotlightMessage?: Message | null;
  autoOpenSpotlight?: boolean;
  initialAboutDescription?: string;
  initialSettings?: AppSettings;
}

export function SorakSoraApp({
  initialMessages,
  initialSpotlightMessage,
  autoOpenSpotlight,
  initialAboutDescription,
  initialSettings,
}: SorakSoraAppProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    sortMessages(initialMessages)
  );
  const [settings, setSettings] = useState<AppSettings>(() => ({
    auto_accept: false,
    about_description:
      initialAboutDescription ||
      "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch.",
    max_char_limit: 280,
    announcement_enabled: false,
    is_archived: false,
    archive_announcement: DEFAULT_ARCHIVE_ANNOUNCEMENT,
    announcement_text:
      "Selamat datang di SorakSora! Bagikan energi positif dan kata-kata penyemangatmu hari ini!",
    enable_builtin_filter: true,
    enable_custom_filter: true,
    enable_url_filter: true,
    profanity_filter_enabled: true,
    banned_words: "",
    spam_filter_enabled: true,
    ...initialSettings,
  }));
  const [aboutDescription, setAboutDescription] = useState<string>(
    initialSettings?.about_description ||
      initialAboutDescription ||
      "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch."
  );
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const [spotlightMessage, setSpotlightMessage] = useState<Message | null>(
    initialSpotlightMessage || null
  );
  const [spotlightColor, setSpotlightColor] = useState<string | null>(
    initialSpotlightMessage
      ? initialSpotlightMessage.color || "#FEF08A"
      : null
  );
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(
    Boolean(autoOpenSpotlight && initialSpotlightMessage)
  );
  const [isShuffling, setIsShuffling] = useState(false);
  const [isDropCheerOpen, setIsDropCheerOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Immediately clean/mask the browser address bar back to root URL ('/') without a full-page reload
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/r")) {
        window.history.replaceState({}, "", "/");
      }
    }
  }, []);

  // Smoothly close spotlight modal and ensure URL is cleaned to '/'
  const handleCloseSpotlight = useCallback(() => {
    setIsSpotlightOpen(false);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Debounce ref map for spammable likes
  const pendingLikesRef = useRef<Record<string, { count: number; timer: NodeJS.Timeout }>>({});

  const flushLikes = useCallback((id: string) => {
    const pending = pendingLikesRef.current[id];
    if (!pending || pending.count <= 0) return;
    const countToSend = pending.count;
    delete pendingLikesRef.current[id];

    fetch(`/api/messages/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: countToSend }),
    }).catch((err) => console.error("Failed to sync batched likes:", err));
  }, []);

  // Flush any pending batched likes on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.keys(pendingLikesRef.current).forEach((id) => flushLikes(id));
    };
  }, [flushLikes]);

  // Check on first visit whether to display the startup Welcome Modal (bypass if directly spotlighting via /r)
  useEffect(() => {
    if (autoOpenSpotlight && initialSpotlightMessage) {
      return;
    }
    try {
      const dismissed = localStorage.getItem("showup_welcome_dismissed");
      if (!dismissed) {
        setIsWelcomeOpen(true);
      }
    } catch {
      // In case localStorage is blocked
    }
  }, [autoOpenSpotlight, initialSpotlightMessage]);

  const handleDismissWelcome = () => {
    try {
      localStorage.setItem("showup_welcome_dismissed", "true");
    } catch {
      // Ignore
    }
    setIsWelcomeOpen(false);
  };

  // Real-time synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/events");

        eventSource.onmessage = (event) => {
          if (!event.data || event.data.startsWith(":")) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === "message:created" && data.message) {
              if (data.message.status !== "approved") return;
              setMessages((prev) => {
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return sortMessages([...prev, data.message]);
              });
              setNewlyAddedIds((prev) => new Set(prev).add(data.message.id));
              setTimeout(() => {
                setNewlyAddedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(data.message.id);
                  return next;
                });
              }, 2500);
            } else if (data.type === "message:loved" && data.id) {
              setMessages((prev) =>
                sortMessages(
                  prev.map((m) => (m.id === data.id ? { ...m, likes: data.likes } : m))
                )
              );
              setSpotlightMessage((prev) =>
                prev && prev.id === data.id ? { ...prev, likes: data.likes } : prev
              );
            } else if (data.type === "message:status_changed") {
              if (data.status === "approved" && data.message) {
                setMessages((prev) => {
                  const withoutMsg = prev.filter((m) => m.id !== data.id);
                  return sortMessages([...withoutMsg, data.message]);
                });
                setNewlyAddedIds((prev) => new Set(prev).add(data.id));
                setTimeout(() => {
                  setNewlyAddedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(data.id);
                    return next;
                  });
                }, 2500);
              } else if (data.status !== "approved") {
                setMessages((prev) => prev.filter((m) => m.id !== data.id));
              }
            } else if (data.type === "message:updated" && data.message) {
              setMessages((prev) => {
                const withoutMsg = prev.filter((m) => m.id !== data.message.id);
                return sortMessages([...withoutMsg, data.message]);
              });
              setSpotlightMessage((prev) =>
                prev && prev.id === data.message.id ? data.message : prev
              );
            } else if (data.type === "message:deleted" && data.id) {
              setMessages((prev) => prev.filter((m) => m.id !== data.id));
              setSpotlightMessage((prev) => (prev && prev.id === data.id ? null : prev));
            } else if (data.type === "settings:updated" && data.settings) {
              setSettings((prev) => ({ ...prev, ...data.settings }));
              if (data.settings.about_description) {
                setAboutDescription(data.settings.about_description);
              }
            }
          } catch (err) {
            console.error("Failed to parse SSE event data:", err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              connectSSE();
            }, 3000);
          }
        };
      } catch (err) {
        console.error("Failed to initialize SSE connection:", err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Toast notification helper
  const addToast = useCallback(
    (type: "success" | "error" | "info" | "warning", message: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Kinetic Shuffle & Spotlight Action
  const handleShuffle = useCallback(() => {
    if (messages.length === 0 || isShuffling) return;

    setIsShuffling(true);

    // Rapid cycle across random cards over 500ms
    let flickerCount = 0;
    const interval = setInterval(() => {
      const tempRandom = messages[Math.floor(Math.random() * messages.length)];
      setSpotlightMessage(tempRandom);
      setSpotlightColor(tempRandom.color || getCardFrame(tempRandom.id + tempRandom.created_at, tempRandom.color).bg);
      flickerCount++;

      if (flickerCount >= 6) {
        clearInterval(interval);

        const candidates = messages.filter((m) => m.id !== spotlightMessage?.id);
        const finalChoice =
          candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : messages[Math.floor(Math.random() * messages.length)];

        setSpotlightMessage(finalChoice);
        setSpotlightColor(finalChoice.color || getCardFrame(finalChoice.id + finalChoice.created_at, finalChoice.color).bg);
        setIsShuffling(false);
        setIsSpotlightOpen(true);
        fireConfetti(0.5, 0.45);
      }
    }, 80);
  }, [messages, isShuffling, spotlightMessage?.id]);

  // Select message directly from card click with exact active background color
  const handleSelectMessage = (msg: Message, color?: string) => {
    setSpotlightMessage(msg);
    setSpotlightColor(msg.color || color || getCardFrame(msg.id + msg.created_at, msg.color).bg);
    setIsSpotlightOpen(true);
  };

  // Submit new cheer
  const handleSubmitMessage = async (
    input: CreateMessageInput
  ): Promise<{ success: boolean; error?: string; isRateLimited?: boolean }> => {
    if (settings.is_archived) {
      const error = "Dinding pesan sedang diarsipkan. Pengiriman pesan baru ditutup.";
      addToast("error", error);
      return { success: false, error };
    }

    try {
      let visitorId = "";
      if (typeof window !== "undefined") {
        try {
          visitorId = localStorage.getItem("showup_visitor_id") || "";
          if (!visitorId) {
            visitorId =
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem("showup_visitor_id", visitorId);
          }
        } catch {
          // Ignore localStorage errors
        }
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(visitorId ? { "x-visitor-id": visitorId } : {}),
        },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.error || "Gagal menempelkan pesan dukungan";
        const isRateLimited = res.status === 429 || data.code === "RATE_LIMITED";
        if (!isRateLimited) {
          addToast("error", errorMsg);
        }
        return { success: false, error: errorMsg, isRateLimited };
      }

      fireConfetti(0.5, 0.45);
      if (data.autoAccepted) {
        addToast(
          "success",
          "Pesanmu langsung tampil di cheer wall! (Auto-accept diaktifkan oleh admin)"
        );
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return sortMessages([...prev, data.message]);
          });
          setNewlyAddedIds((prev) => new Set(prev).add(data.message.id));

          // Auto-scroll the cheer wall viewport smoothly to the newly submitted card
          setTimeout(() => {
            const cardEl = document.querySelector(`[data-flip-id="${data.message.id}"]`);
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 150);

          // Spotlight pulse highlight persists for 3 seconds
          setTimeout(() => {
            setNewlyAddedIds((prev) => {
              const next = new Set(prev);
              next.delete(data.message.id);
              return next;
            });
          }, 3000);
        }
      } else {
        addToast(
          "success",
          data.notice ||
            "Terima kasih! Pesanmu sedang ditinjau oleh admin dan akan segera tampil di cheer wall setelah disetujui."
        );
      }

      return { success: true };
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.message || "Gagal menempelkan pesan dukungan";
      addToast("error", errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Like message with debounced backend sync
  const handleLikeMessage = useCallback(
    (id: string, count: number = 1) => {
      // 1. Optimistic state updates
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, likes: (m.likes || 0) + count } : m))
      );

      if (spotlightMessage?.id === id) {
        setSpotlightMessage((prev) =>
          prev ? { ...prev, likes: (prev.likes || 0) + count } : null
        );
      }

      // 2. Debounce backend sync
      if (!pendingLikesRef.current[id]) {
        pendingLikesRef.current[id] = { count: 0, timer: setTimeout(() => {}, 0) };
        clearTimeout(pendingLikesRef.current[id].timer);
      } else {
        clearTimeout(pendingLikesRef.current[id].timer);
      }

      pendingLikesRef.current[id].count += count;
      pendingLikesRef.current[id].timer = setTimeout(() => {
        flushLikes(id);
        // Apply hierarchy re-sort when tapping pauses, smoothly gliding the card via FLIP
        setMessages((prev) => sortMessages(prev));
      }, 500);
    },
    [flushLikes, spotlightMessage?.id]
  );

  // Keyboard shortcut 'S' for shuffle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "s" &&
        !isDropCheerOpen &&
        !isArchiveOpen &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        handleShuffle();
      }
      if (e.key === "Escape") {
        handleDismissWelcome();
        setIsSpotlightOpen(false);
        setIsDropCheerOpen(false);
        setIsArchiveOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShuffle, isDropCheerOpen, isArchiveOpen]);

  return (
    <div
      data-hydrated={isMounted ? "true" : "false"}
      className="relative min-h-screen bg-[#F5F5F0] text-[#1A1A1A]"
    >
      {/* 1. Main Interactive Corkboard Canvas with Header */}
      <CorkboardWall
        messages={messages}
        totalCheers={messages.length}
        isShuffling={isShuffling}
        selectedMessageId={isSpotlightOpen ? spotlightMessage?.id || null : null}
        newlyAddedIds={newlyAddedIds}
        announcement={
          settings.announcement_enabled && settings.announcement_text
            ? settings.announcement_text
            : undefined
        }
        isArchived={settings.is_archived}
        archiveAnnouncement={
          settings.archive_announcement?.trim() || DEFAULT_ARCHIVE_ANNOUNCEMENT
        }
        censorMode={settings.filter_censor_mode || "first_last"}
        onSelectMessage={handleSelectMessage}
        onLikeMessage={handleLikeMessage}
        onShuffle={handleShuffle}
        onOpenArchive={() => setIsArchiveOpen(true)}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
      />

      {/* 2. Simplified Bottom Dock (Single "Kirim Dukungan" CTA) */}
      <FloatingDock
        isArchived={settings.is_archived}
        onOpenDropCheer={() => setIsDropCheerOpen(true)}
      />

      {/* 3. Startup / Welcome Intro Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onEnter={handleDismissWelcome}
        description={aboutDescription}
      />

      {/* 4. Center Spotlight Modal */}
      <SpotlightModal
        message={spotlightMessage}
        activeBg={spotlightColor}
        isOpen={isSpotlightOpen}
        isShuffling={isShuffling}
        censorMode={settings.filter_censor_mode || "first_last"}
        onClose={handleCloseSpotlight}
        onShuffleAgain={handleShuffle}
        onLikeMessage={handleLikeMessage}
        onOpenDropCheer={() => {
          handleCloseSpotlight();
          setIsDropCheerOpen(true);
        }}
      />

      {/* 5. Drop a Cheer Modal */}
      <DropCheerModal
        isOpen={isDropCheerOpen}
        isArchived={settings.is_archived}
        archiveAnnouncement={
          settings.archive_announcement?.trim() || DEFAULT_ARCHIVE_ANNOUNCEMENT
        }
        maxCharLimit={settings.max_char_limit}
        onClose={() => setIsDropCheerOpen(false)}
        onSubmitMessage={handleSubmitMessage}
      />

      {/* 6. Archive List Modal */}
      <ArchiveListModal
        isOpen={isArchiveOpen}
        messages={messages}
        censorMode={settings.filter_censor_mode || "first_last"}
        onClose={() => setIsArchiveOpen(false)}
        onSelectMessage={handleSelectMessage}
        onLikeMessage={handleLikeMessage}
      />

      {/* 7. Toast Alerts */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
