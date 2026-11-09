"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Message, DEFAULT_ARCHIVE_ANNOUNCEMENT } from "@/lib/types";
import { getCardFrame, formatRelativeTime, getDisplayMessage } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import {
  Heart,
  User,
  HelpCircle,
  Dices,
  LayoutGrid,
  Megaphone,
  Star,
  Lock,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface NoteHeartButtonProps {
  messageId: string;
  initialLikes: number;
  onLike: (id: string, count?: number) => void;
}

function NoteHeartButton({ messageId, initialLikes, onLike }: NoteHeartButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [popKey, setPopKey] = useState(0);
  const [floatingParticles, setFloatingParticles] = useState<
    { id: number; offset: number }[]
  >([]);

  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  const handleTap = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Instant optimistic local increment
    setLikes((prev) => prev + 1);
    setPopKey((prev) => prev + 1);

    // 2. Spawn floating particle with random horizontal offset for rapid spammable taps
    const particleId = Date.now() + Math.random();
    const offset = Math.floor(Math.random() * 24) - 12;
    setFloatingParticles((prev) => [
      ...prev.slice(-8),
      { id: particleId, offset },
    ]);

    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== particleId));
    }, 750);

    // 3. Trigger debounced batch handler
    onLike(messageId, 1);
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Floating +1 Particles */}
      {floatingParticles.map((p) => (
        <span
          key={p.id}
          className="absolute -top-4 left-1/2 text-xs font-black text-[#EF4444] animate-float-heart select-none pointer-events-none z-30 inline-flex items-center gap-0.5"
          style={{
            transform: `translate(calc(-50% + ${p.offset}px), 0)`,
          }}
        >
          +1 <Heart className="w-2.5 h-2.5 fill-[#EF4444] text-[#EF4444] inline" />
        </span>
      ))}

      <button
        type="button"
        onClick={handleTap}
        aria-label="Beri Love"
        title="Beri Love (bisa tap berkali-kali)"
        className="group/heart relative inline-flex items-center gap-1.5 py-0.5 sm:py-1 px-1.5 sm:px-2 rounded-sm bg-white/70 hover:bg-white border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-all text-[#1A1A1A]"
      >
        <Heart
          key={popKey}
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-colors ${
            popKey > 0 ? "animate-heart-pop" : ""
          } ${
            likes > 0
              ? "fill-[#EF4444] text-[#EF4444]"
              : "text-neutral-500 group-hover/heart:text-[#EF4444]"
          }`}
        />
        <span className="text-[10px] sm:text-[11px] font-black tracking-tight tabular-nums select-none">
          {likes}
        </span>
      </button>
    </div>
  );
}

interface CorkboardWallProps {
  messages: Message[];
  totalCheers: number;
  isShuffling: boolean;
  selectedMessageId: string | null;
  newlyAddedIds?: Set<string>;
  announcement?: string;
  isArchived?: boolean;
  archiveAnnouncement?: string;
  censorMode?: "normal" | "first_last" | "grawlix" | "asterisk" | "none";
  onSelectMessage: (msg: Message, color?: string) => void;
  onLikeMessage: (id: string, count?: number) => void;
  onShuffle: () => void;
  onOpenArchive: () => void;
  onOpenWelcome: () => void;
}

export function CorkboardWall({
  messages,
  totalCheers,
  isShuffling,
  selectedMessageId,
  newlyAddedIds,
  announcement,
  isArchived = false,
  archiveAnnouncement,
  censorMode,
  onSelectMessage,
  onLikeMessage,
  onShuffle,
  onOpenArchive,
  onOpenWelcome,
}: CorkboardWallProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map());

  // Hardware-accelerated FLIP (First, Last, Invert, Play) transition
  useIsomorphicLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cardElements = grid.querySelectorAll<HTMLElement>("[data-flip-id]");
    if (cardElements.length === 0) return;

    // Reset previous transforms so we measure true natural grid coordinates
    cardElements.forEach((el) => {
      el.style.transform = "";
      el.style.transition = "";
      el.style.willChange = "";
    });

    const animatingCards: HTMLElement[] = [];

    cardElements.forEach((el) => {
      const id = el.getAttribute("data-flip-id");
      if (!id) return;

      const newRect = el.getBoundingClientRect();
      const prevRect = prevRectsRef.current.get(id);

      if (prevRect) {
        const dx = prevRect.left - newRect.left;
        const dy = prevRect.top - newRect.top;

        // If card moved by more than 1px in any direction, apply inverted translation
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          el.style.transition = "none";
          el.style.willChange = "transform";
          el.style.zIndex = "10";
          animatingCards.push(el);
        }
      }

      // Record new layout location
      prevRectsRef.current.set(id, newRect);
    });

    // Play: animate back to natural position (translate3d(0, 0, 0)) smoothly
    if (animatingCards.length > 0) {
      // Force synchronous DOM layout read
      void grid.offsetHeight;

      requestAnimationFrame(() => {
        animatingCards.forEach((el) => {
          el.style.transition = "transform 360ms cubic-bezier(0.16, 1, 0.3, 1)";
          el.style.transform = "translate3d(0, 0, 0)";

          const onEnd = (e: TransitionEvent) => {
            if (e.target === el && e.propertyName === "transform") {
              el.style.transform = "";
              el.style.transition = "";
              el.style.willChange = "";
              el.style.zIndex = "";
              el.removeEventListener("transitionend", onEnd);
            }
          };
          el.addEventListener("transitionend", onEnd);
        });
      });
    }
  }, [messages]);

  // Sync positions on window resize without triggering false animations
  useEffect(() => {
    const handleResize = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const cardElements = grid.querySelectorAll<HTMLElement>("[data-flip-id]");
      cardElements.forEach((el) => {
        const id = el.getAttribute("data-flip-id");
        if (id) {
          prevRectsRef.current.set(id, el.getBoundingClientRect());
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-corkboard-pattern pt-4 sm:pt-6 pb-28 sm:pb-32 px-3 sm:px-6 lg:px-8 overflow-x-hidden">
      {/* 1. Header & Top Bar with Center-Aligned Counter Badge */}
      <header className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between relative pb-4 sm:pb-6 px-1 flex-shrink-0 gap-y-2.5 gap-x-2">
        {/* Left: SorakSora! Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#FEF08A] border-2 border-[#1A1A1A] flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_#1A1A1A]">
            SS
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base font-black tracking-tight text-[#1A1A1A] uppercase">
              SorakSora<span className="text-[#EF4444]">!</span>
            </span>
            <span className="text-xs sm:text-sm font-bold tracking-wider text-gray-500 uppercase select-none">
              • THE CHEER WALL
            </span>
          </div>
        </div>

        {/* Center: Center-Aligned Neobrutalist Counter Badge across header */}
        <div className="order-3 sm:order-2 w-full sm:w-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center z-10 pointer-events-none">
          <div
            id="header-cheer-counter-badge"
            aria-label={`${totalCheers} Dukungan Dikirim`}
            title={`${totalCheers} Dukungan Dikirim`}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 sm:py-1.5 bg-[#FAF9F5] border-2 border-[#1A1A1A] text-xs font-black text-[#1A1A1A] tracking-tight shadow-[2px_2px_0px_#1A1A1A] select-none whitespace-nowrap"
          >
            <Heart
              className="w-3.5 h-3.5 fill-[#EF4444] text-[#EF4444] flex-shrink-0 animate-pulse"
              aria-hidden="true"
            />
            <span className="font-extrabold">
              <span className="sr-only">Love </span>
              {totalCheers} Dukungan Dikirim
            </span>
          </div>
        </div>

        {/* Right: Clean, Square Icon-Only Actions */}
        <div className="order-2 sm:order-3 flex items-center gap-2 flex-shrink-0">
          {/* 1. Shuffle / Acak Pesan (Dice Icon Only) */}
          <button
            id="header-shuffle-btn"
            onClick={onShuffle}
            disabled={isShuffling}
            title="Acak Pesan (S)"
            aria-label="Acak Pesan (tekan S)"
            className="w-8 h-8 sm:w-9 sm:h-9 bg-[#FFF066] hover:bg-[#FDE047] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            <Dices
              className={`w-4 h-4 text-[#1A1A1A] stroke-[2] ${
                isShuffling ? "animate-spin" : ""
              }`}
            />
          </button>

          {/* 2. All Messages / Semua Pesan (LayoutGrid Icon Only) */}
          <button
            id="header-all-messages-btn"
            onClick={onOpenArchive}
            title="Semua Pesan"
            aria-label="Lihat Semua Pesan"
            className="w-8 h-8 sm:w-9 sm:h-9 bg-[#F5EBE1] hover:bg-[#EBDAC6] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <LayoutGrid className="w-4 h-4 text-[#1A1A1A] stroke-[2.5]" />
          </button>

          {/* 3. About / Tentang (Info/Help Icon Only) */}
          <button
            id="header-about-btn"
            onClick={onOpenWelcome}
            title="Tentang SorakSora!"
            aria-label="Tentang SorakSora!"
            className="w-8 h-8 sm:w-9 sm:h-9 bg-[#FFFFFF] hover:bg-neutral-100 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <HelpCircle className="w-4 h-4 text-[#1A1A1A] stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Archive Mode Notice */}
      {isArchived && (
        <div className="max-w-7xl mx-auto mb-4 sm:mb-6 px-1 animate-fadeIn">
          <div
            id="archive-mode-notice"
            role="status"
            className="bg-zinc-200 border-2 border-black p-3 sm:p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <Lock className="w-5 h-5 text-black stroke-[2.5] flex-shrink-0 mt-0.5 sm:mt-0" />
              <div
                className="text-xs sm:text-sm font-semibold text-neutral-800 tracking-tight leading-relaxed min-w-0 flex-1"
                style={{
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                <MarkdownRenderer
                  content={archiveAnnouncement?.trim() || DEFAULT_ARCHIVE_ANNOUNCEMENT}
                />
              </div>
            </div>
            <span className="bg-white text-black font-bold uppercase text-xs px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0 hidden sm:inline-block">
              Dinding Diarsipkan
            </span>
          </div>
        </div>
      )}

      {/* Optional Broadcast / Announcement Banner */}
      {announcement && (
        <div className="max-w-7xl mx-auto mb-4 sm:mb-6 px-1 animate-fadeIn">
          <div className="bg-[#FFF066] border-2 border-black p-3 sm:p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <Megaphone className="w-5 h-5 text-[#1A1A1A] stroke-[2.5] flex-shrink-0 mt-0.5 sm:mt-0" />
              <div
                className="text-xs sm:text-sm font-black text-[#1A1A1A] tracking-tight leading-relaxed min-w-0 flex-1"
                style={{
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                <MarkdownRenderer content={announcement} />
              </div>
            </div>
            <span className="bg-white text-black font-bold uppercase text-xs px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0 hidden sm:inline-block">
              Pengumuman
            </span>
          </div>
        </div>
      )}

      {/* 2. Main Board Canvas: Row-Based CSS Grid (Left-to-Right Horizontal Priority Fill, Downward Scrolling) */}
      <div className="max-w-7xl mx-auto">
        <div
          ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-5 items-start"
        >
          {messages.map((item) => {
            const frame = getCardFrame(item.id + item.created_at, item.color);
            const isCurrentSelected = selectedMessageId === item.id;
            const isNewlyAdded = newlyAddedIds?.has(item.id);
            const authorDisplay = item.is_anonymous
              ? "Anonim"
              : getDisplayMessage(item.name || "Anonim", item, censorMode);

            return (
              <div
                key={item.id}
                data-flip-id={item.id}
                className={`pt-2 pb-1.5 px-0.5 ${isNewlyAdded ? "animate-card-entry" : ""}`}
              >
                <div
                  onClick={() => onSelectMessage(item, frame.bg)}
                  role="button"
                  tabIndex={0}
                  className={`board-note p-3 sm:p-4 cursor-pointer group ${
                    isShuffling ? "shuffle-active" : "wind-sway"
                  } ${isCurrentSelected ? "ring-3 sm:ring-4 ring-[#EF4444] scale-[1.03] z-20" : ""} ${
                    isNewlyAdded
                      ? "ring-4 ring-[#FEF08A] shadow-[0_0_24px_rgba(254,240,138,0.95)] scale-[1.04] z-20 animate-pulse"
                      : ""
                  }`}
                  style={
                    {
                      backgroundColor: frame.bg,
                      borderRadius: frame.borderRadius,
                      "--rot": `${frame.rotation}deg`,
                      "--sway-dur": frame.swayDur,
                      "--sway-delay": frame.swayDelay,
                      transform: `rotate(${frame.rotation}deg)`,
                    } as React.CSSProperties
                  }
                >
                  {/* Decorative Pinned Detail */}
                  {frame.isTape ? (
                    <div
                      className="note-tape"
                      style={{ backgroundColor: frame.tapeColor }}
                    />
                  ) : (
                    <div
                      className="note-pushpin"
                      style={{
                        left: `${frame.pinOffset}%`,
                        backgroundColor: frame.pin,
                      }}
                    />
                  )}

                  {/* Card Top Metadata: Elastic author on the left, star icon & timestamp on the right */}
                  <div className="flex items-center justify-between gap-1.5 mb-2 pt-0.5">
                    {/* Left Side: User avatar icon + Author Name (truncate font-bold). Elastic flex-1 min-w-0 */}
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#1A1A1A] flex-1 min-w-0">
                      <User className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                      <span
                        className="truncate font-bold block"
                        title={authorDisplay}
                      >
                        {authorDisplay}
                      </span>
                    </div>

                    {/* Right Side: Minimalist Star badge (with tooltip/title "Disematkan") + Timestamp */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {item.is_pinned && (
                        <span
                          title="Disematkan"
                          aria-label="Disematkan"
                          className="inline-flex items-center justify-center w-5 h-5 bg-[#FEF08A] border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A] shrink-0"
                        >
                          <Star className="w-3.5 h-3.5 fill-current text-yellow-500 stroke-[#1A1A1A] stroke-[1.5]" />
                        </span>
                      )}
                      <span
                        suppressHydrationWarning
                        className="shrink-0 text-[10px] sm:text-xs font-bold text-neutral-500 whitespace-nowrap"
                      >
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Card Main Cheer Message */}
                  <p className="text-xs sm:text-sm font-semibold text-[#1A1A1A] leading-relaxed mb-3 font-sans select-text line-clamp-5 sm:line-clamp-6">
                    &ldquo;{getDisplayMessage(item.message, item, censorMode)}&rdquo;
                  </p>

                  {/* Card Bottom Strip: Clean heart reaction button without star/sparkle accent */}
                  <div className="flex items-center justify-start pt-1.5 border-t border-[#1A1A1A]/15 text-[11px] font-bold text-neutral-600">
                    <NoteHeartButton
                      messageId={item.id}
                      initialLikes={item.likes || 0}
                      onLike={onLikeMessage}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
