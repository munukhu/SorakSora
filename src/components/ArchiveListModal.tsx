"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Message } from "@/lib/types";
import { getCardTheme, formatRelativeTime, getDisplayMessage } from "@/lib/utils";
import {
  X,
  Search,
  Heart,
  User,
  LayoutGrid,
  ChevronDown,
  Check,
  Star,
} from "lucide-react";

interface ArchiveListModalProps {
  isOpen: boolean;
  messages: Message[];
  censorMode?: "normal" | "first_last" | "grawlix" | "asterisk" | "none";
  onClose: () => void;
  onSelectMessage: (msg: Message, color?: string) => void;
  onLikeMessage: (id: string, count?: number) => void;
}

const BATCH_SIZE = 20;

export function ArchiveListModal({
  isOpen,
  messages,
  censorMode,
  onClose,
  onSelectMessage,
  onLikeMessage,
}: ArchiveListModalProps) {
  const [search, setSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState<"all" | "named" | "anonymous">("all");
  const [sortOption, setSortOption] = useState<"likes" | "newest" | "oldest">("likes");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(BATCH_SIZE);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    if (!isSortOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSortOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter & Search
  const filtered = useMemo(() => {
    let list = [...messages];

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (m) => m.message.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      );
    }

    // Author identity filter
    if (authorFilter === "named") {
      list = list.filter((m) => !m.is_anonymous && m.name.toLowerCase() !== "anonim");
    } else if (authorFilter === "anonymous") {
      list = list.filter((m) => m.is_anonymous || m.name.toLowerCase() === "anonim");
    }

    // Sorting hierarchy
    if (sortOption === "likes") {
      list.sort(
        (a, b) =>
          (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
          (b.likes || 0) - (a.likes || 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortOption === "newest") {
      list.sort(
        (a, b) =>
          (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortOption === "oldest") {
      list.sort(
        (a, b) =>
          (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return list;
  }, [messages, search, authorFilter, sortOption]);

  // Reset pagination limit when search, filter, or sort changes
  useEffect(() => {
    setDisplayLimit(BATCH_SIZE);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [search, authorFilter, sortOption]);

  // Slice displayed items for smooth infinite batch rendering
  const visibleMessages = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  // IntersectionObserver for lazy loading next batches smoothly
  useEffect(() => {
    if (!isOpen) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "200px",
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isOpen, filtered.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* High-Performance Flat Backdrop (no expensive continuous blur recalculations) */}
      <div className="fixed inset-0 bg-[#1A1A1A]/70" />

      {/* Modal Dialog Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[88vh] flex flex-col bg-[#F5F5F0] border-[3px] border-[#1A1A1A] z-10 overflow-hidden"
        style={{
          boxShadow: "8px 8px 0px #1A1A1A",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-[#FFFFFF] border-b-2 border-[#1A1A1A] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#FEF08A] border-2 border-[#1A1A1A] flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_#1A1A1A]">
              <LayoutGrid className="w-4 h-4 stroke-[2.5] text-[#1A1A1A]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Semua Pesan Dukungan ({filtered.length})
              </h2>
              <p className="text-[11px] font-bold text-neutral-500">
                Papan cheer wall inspirasi & kata-kata penyemangat
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#FFFFFF] hover:bg-neutral-100 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
            aria-label="Tutup arsip"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 sm:px-6 py-3 bg-[#FFFFFF] border-b-2 border-[#1A1A1A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pesan atau nama..."
              className="w-full pl-8 pr-4 py-2 nb-input text-base sm:text-xs font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAuthorFilter("all")}
                className={`inline-flex items-center justify-center px-3 py-1.5 h-8 border-2 border-[#000000] text-xs font-bold rounded-none shadow-[2px_2px_0px_#000000] transition-all select-none box-border ${
                  authorFilter === "all"
                    ? "bg-[#000000] text-white"
                    : "bg-[#FFFFFF] text-[#000000] hover:bg-neutral-100"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setAuthorFilter("named")}
                className={`inline-flex items-center justify-center px-3 py-1.5 h-8 border-2 border-[#000000] text-xs font-bold rounded-none shadow-[2px_2px_0px_#000000] transition-all select-none box-border ${
                  authorFilter === "named"
                    ? "bg-[#000000] text-white"
                    : "bg-[#FFFFFF] text-[#000000] hover:bg-neutral-100"
                }`}
              >
                Bernama
              </button>
              <button
                type="button"
                onClick={() => setAuthorFilter("anonymous")}
                className={`inline-flex items-center justify-center px-3 py-1.5 h-8 border-2 border-[#000000] text-xs font-bold rounded-none shadow-[2px_2px_0px_#000000] transition-all select-none box-border ${
                  authorFilter === "anonymous"
                    ? "bg-[#000000] text-white"
                    : "bg-[#FFFFFF] text-[#000000] hover:bg-neutral-100"
                }`}
              >
                Anonim
              </button>
            </div>

            {/* Custom Sort Button + Dropdown Popover */}
            <div ref={sortRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsSortOpen((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 h-8 border-2 border-[#000000] text-xs font-bold rounded-none shadow-[2px_2px_0px_#000000] bg-[#FFFFFF] text-[#000000] hover:bg-neutral-100 transition-all select-none box-border cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                aria-haspopup="listbox"
                aria-expanded={isSortOpen}
              >
                <span>
                  {sortOption === "likes"
                    ? "Love"
                    : sortOption === "newest"
                    ? "Terbaru"
                    : "Terlama"}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 stroke-[2.5] text-[#000000] transition-transform duration-150 ${
                    isSortOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isSortOpen && (
                <div
                  role="listbox"
                  className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1 z-50 min-w-[120px] bg-[#FFFFFF] border-2 border-[#000000] shadow-[3px_3px_0px_#000000] py-1 flex flex-col animate-fadeIn"
                >
                  {(
                    [
                      { value: "likes", label: "Love" },
                      { value: "newest", label: "Terbaru" },
                      { value: "oldest", label: "Terlama" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={sortOption === opt.value}
                      onClick={() => {
                        setSortOption(opt.value);
                        setIsSortOpen(false);
                      }}
                      className={`px-3 py-1.5 text-left text-xs font-bold transition-colors flex items-center justify-between gap-3 ${
                        sortOption === opt.value
                          ? "bg-[#FEF08A] text-[#000000]"
                          : "text-[#000000] hover:bg-neutral-100"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortOption === opt.value && (
                        <Check className="w-3.5 h-3.5 stroke-[3] text-[#000000]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hardware-Accelerated 60fps Scrollable List */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
          style={{
            WebkitOverflowScrolling: "touch",
            willChange: "scroll-position",
            overscrollBehavior: "contain",
          }}
        >
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 text-xs font-bold">
              Tidak ada pesan yang cocok dengan pencarian.
            </div>
          ) : (
            visibleMessages.map((msg) => {
              const theme = getCardTheme(msg.id + msg.created_at, msg.color);
              return (
                <div
                  key={msg.id}
                  onClick={() => {
                    onClose();
                    onSelectMessage(msg, theme.bg);
                  }}
                  role="button"
                  tabIndex={0}
                  className="p-3.5 sm:p-4 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] hover:border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  style={{
                    backgroundColor: theme.bg,
                    contentVisibility: "auto",
                    containIntrinsicSize: "90px",
                    contain: "content",
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-[#1A1A1A] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-neutral-600 inline flex-shrink-0" />
                        <span>
                          {msg.is_anonymous
                            ? "Anonim"
                            : getDisplayMessage(msg.name || "Anonim", msg, censorMode)}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold text-neutral-500">
                        • {formatRelativeTime(msg.created_at)}
                      </span>
                      {msg.is_pinned && (
                        <span
                          title="Disematkan"
                          aria-label="Disematkan"
                          className="inline-flex items-center justify-center w-5 h-5 bg-[#FEF08A] border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A] flex-shrink-0"
                        >
                          <Star className="w-3.5 h-3.5 fill-current text-yellow-500 stroke-[#1A1A1A] stroke-[1.5]" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-[#1A1A1A] leading-relaxed">
                      &ldquo;{getDisplayMessage(msg.message, msg, censorMode)}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center self-end sm:self-center flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLikeMessage(msg.id, 1);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] hover:bg-neutral-50 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] text-xs font-black text-[#1A1A1A] hover:text-red-600 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      title="Beri Love (bisa tap berkali-kali)"
                      aria-label={`${msg.likes || 0} Love. Beri Love.`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-[#EF4444] text-[#EF4444]" />
                      <span className="tabular-nums">{msg.likes || 0}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Infinite Scroll Intersection Sentinel */}
          {visibleMessages.length < filtered.length && (
            <div
              ref={sentinelRef}
              className="h-10 w-full flex items-center justify-center text-[11px] font-bold text-neutral-400 py-2"
            >
              Memuat pesan lainnya...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
