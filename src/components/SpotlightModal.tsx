"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message } from "@/lib/types";
import {
  getCardThemeByBg,
  getComplementaryDarkBg,
  formatRelativeTime,
  fireConfetti,
  getDisplayMessage,
} from "@/lib/utils";
import { toPng } from "html-to-image";
import {
  X,
  Dices,
  Heart,
  Check,
  Quote,
  User,
  Share2,
  Camera,
  ArrowRight,
  Star,
  Copy,
  Square,
  Smartphone,
  RectangleHorizontal,
} from "lucide-react";

interface SpotlightModalProps {
  message: Message | null;
  activeBg?: string | null;
  isOpen: boolean;
  isShuffling: boolean;
  censorMode?: "normal" | "first_last" | "grawlix" | "asterisk" | "none";
  onClose: () => void;
  onShuffleAgain: () => void;
  onLikeMessage: (id: string, count?: number) => void;
  onOpenDropCheer: () => void;
}

type AspectRatioPreset = "1:1" | "9:16" | "16:9";

interface RatioConfig {
  width: number;
  height: number;
  cardWidth: string;
  padding: string;
  watermarkBottom: string;
  watermarkRight: string;
}

const ASPECT_RATIO_CONFIG: Record<AspectRatioPreset, RatioConfig> = {
  "1:1": {
    width: 1080,
    height: 1080,
    cardWidth: "860px",
    padding: "60px",
    watermarkBottom: "40px",
    watermarkRight: "48px",
  },
  "9:16": {
    width: 1080,
    height: 1920,
    cardWidth: "880px",
    padding: "100px 60px",
    watermarkBottom: "60px",
    watermarkRight: "60px",
  },
  "16:9": {
    width: 1920,
    height: 1080,
    cardWidth: "1280px",
    padding: "60px 100px",
    watermarkBottom: "40px",
    watermarkRight: "60px",
  },
};

const RATIO_OPTIONS: {
  id: AspectRatioPreset;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "1:1",
    title: "Persegi (1:1)",
    subtitle: "Feed / Square",
  },
  {
    id: "9:16",
    title: "Cerita (9:16)",
    subtitle: "Story / Reels / Status",
  },
  {
    id: "16:9",
    title: "Lanskap (16:9)",
    subtitle: "Wide / Banner",
  },
];

export function SpotlightModal({
  message,
  activeBg,
  isOpen,
  isShuffling,
  censorMode,
  onClose,
  onShuffleAgain,
  onLikeMessage,
}: SpotlightModalProps) {
  const [popKey, setPopKey] = useState(0);
  const [floatingParticles, setFloatingParticles] = useState<
    { id: number; offset: number }[]
  >([]);

  // Share & Export state
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [exportRatio, setExportRatio] = useState<AspectRatioPreset>("1:1");
  const [isFlashing, setIsFlashing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [textCopySuccess, setTextCopySuccess] = useState(false);

  const exportCardRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Close share menu when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsShareMenuOpen(false);
    }
  }, [isOpen]);

  // Click outside to dismiss the share dropdown menu
  useEffect(() => {
    if (!isShareMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(e.target as Node)
      ) {
        setIsShareMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isShareMenuOpen]);

  // Keyboard dismiss (Escape): dismisses dropdown first if open, or closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isShareMenuOpen) {
          setIsShareMenuOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isShareMenuOpen, onClose]);

  if (!isOpen || !message) return null;

  // Exact background and palette synchronization:
  // Strictly bind to the note's persisted color from the database, or activeBg with safe fallback
  const resolvedBg = message.color || activeBg || "#FEF08A";
  const theme = getCardThemeByBg(resolvedBg, message.id + message.created_at);
  const displayMessage = getDisplayMessage(message.message, message, censorMode);
  const displayAuthor = message.is_anonymous
    ? "Anonim"
    : getDisplayMessage(message.name || "Anonim", message, censorMode);

  const handleCopyAsText = async () => {
    try {
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://soraksora.id";
      const shareId = message.unique_id || message.id;
      const directUrl = `${siteUrl}/r/${shareId}`;
      const textToCopy = `"${displayMessage}" — ${displayAuthor}\n\nvia SorakSora • ${directUrl}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setIsShareMenuOpen(false);
      setTextCopySuccess(true);
      setTimeout(() => setTextCopySuccess(false), 2400);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleLike = () => {
    onLikeMessage(message.id, 1);
    setPopKey((prev) => prev + 1);

    // Spawn floating particle for spammable taps
    const particleId = Date.now() + Math.random();
    const offset = Math.floor(Math.random() * 24) - 12;
    setFloatingParticles((prev) => [
      ...prev.slice(-8),
      { id: particleId, offset },
    ]);

    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== particleId));
    }, 750);

    if (popKey === 0) {
      fireConfetti(0.5, 0.5);
    }
  };

  // Client-Side Social Share Image Generation with Camera Shutter Flash
  const handleSelectRatioAndExport = async (targetRatio: AspectRatioPreset) => {
    if (!exportCardRef.current || isExporting) return;

    try {
      // 1. Automatically close the dropdown menu
      setIsShareMenuOpen(false);
      setIsExporting(true);
      setExportRatio(targetRatio);

      // 2. Play Camera Shutter Flash Animation (white screen overlay)
      setIsFlashing(true);
      setTimeout(() => {
        setIsFlashing(false);
      }, 280);

      // Brief delay to allow shutter effect and DOM repaint for target ratio
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Wait for fonts if available
      if (typeof document !== "undefined" && document.fonts) {
        await document.fonts.ready;
      }

      const dims = ASPECT_RATIO_CONFIG[targetRatio];
      const dataUrl = await toPng(exportCardRef.current, {
        cacheBust: true,
        pixelRatio: 1, // Full 1080p canvas resolution
        width: dims.width,
        height: dims.height,
        canvasWidth: dims.width,
        canvasHeight: dims.height,
        style: {
          transform: "none",
          left: "0",
          top: "0",
          margin: "0",
          padding: dims.padding,
          width: `${dims.width}px`,
          minWidth: `${dims.width}px`,
          maxWidth: `${dims.width}px`,
          height: `${dims.height}px`,
          minHeight: `${dims.height}px`,
          maxHeight: `${dims.height}px`,
          boxSizing: "border-box",
          position: "relative",
        },
      });

      // 3. Instant Client-Side PNG Download (no server storage)
      const sanitizedName = (message.is_anonymous ? "anonim" : message.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 20);
      const fileName = `soraksora-${sanitizedName}-${targetRatio.replace(":", "x")}.png`;

      const downloadLink = document.createElement("a");
      downloadLink.download = fileName;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2400);
    } catch (err) {
      console.error("Failed to generate client-side share image:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const currentDims = ASPECT_RATIO_CONFIG[exportRatio];

  return (
    <>
      {/* Camera Shutter Flash Animation Overlay */}
      {isFlashing && (
        <div
          className="fixed inset-0 z-[99999] bg-white pointer-events-none animate-camera-flash"
          aria-hidden="true"
        />
      )}

      {/* Compact Neobrutalist Download Completion Toast */}
      {exportSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] bg-[#FFFFFF] border-[2.5px] border-[#1A1A1A] px-4 py-2 sm:py-2.5 shadow-[3px_3px_0px_#1A1A1A] flex items-center gap-2.5 animate-toast-in select-none pointer-events-none"
        >
          <div className="w-5 h-5 bg-[#DCFCE7] border border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1A1A1A]">
            <Check className="w-3.5 h-3.5 text-[#16A34A] stroke-[3]" />
          </div>
          <span className="text-xs sm:text-sm font-black text-[#16A34A] uppercase tracking-wide">
            Selesai
          </span>
        </div>
      )}

      {/* Toast Notification for Text Copied */}
      {textCopySuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] bg-[#FFFFFF] border-[2.5px] border-[#1A1A1A] px-4 py-2 sm:py-2.5 shadow-[3px_3px_0px_#1A1A1A] flex items-center gap-2.5 animate-toast-in select-none pointer-events-none"
        >
          <div className="w-5 h-5 bg-[#DCFCE7] border border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1A1A1A]">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
          </div>
          <span className="text-xs sm:text-sm font-black text-[#1A1A1A] tracking-wide">
            Teks pesan berhasil disalin!
          </span>
        </div>
      )}

      {/* Main Spotlight Dialog Container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pt-10 sm:pt-14 pb-10 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        {/* Dimmed & blurred backdrop */}
        <div className="fixed inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm transition-opacity animate-fadeIn" />

        {/* Spotlight Modal Card: overflow-visible with top clearance so pushpin is never clipped */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-lg overflow-visible border-[3px] sm:border-[3.5px] border-[#1A1A1A] p-5 sm:p-7 pt-7 sm:pt-8 z-10 transition-all duration-200 mt-4 sm:mt-5 ${
            isShuffling ? "scale-95 opacity-60" : "scale-100 opacity-100"
          }`}
          style={{
            backgroundColor: theme.bg,
            boxShadow: "10px 10px 0px #1A1A1A",
          }}
        >
          {/* Top Center Pushpin Graphic (Strictly unclipped with full vertical clearance and highlight) */}
          <div
            className="w-6 h-6 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none select-none z-20 flex items-center justify-center"
            style={{ backgroundColor: theme.pin }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/70 absolute top-0.5 left-1 pointer-events-none" />
          </div>

          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#1A1A1A]/20 mb-4 sm:mb-5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 bg-[#1A1A1A] rounded-full inline-block shrink-0" />
              <div className="flex items-center text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                <span>SorakSora! &bull; Sorotan Pesan</span>
                {message?.is_pinned && (
                  <span
                    title="Pesan Disematkan"
                    aria-label="Pesan Disematkan"
                    className="inline-flex items-center ml-2 shrink-0"
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-black stroke-[2] inline-block" />
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 bg-[#FFFFFF] hover:bg-neutral-100 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-transform shrink-0 ml-2"
              aria-label="Tutup jendela spotlight"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Quote Icon */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#FFFFFF] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] mb-3 sm:mb-4">
            <Quote className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </div>

          {/* Spotlight Message Body */}
          <blockquote className="text-lg sm:text-2xl font-black text-[#1A1A1A] leading-snug tracking-tight mb-5 sm:mb-6 font-sans">
            &ldquo;{displayMessage}&rdquo;
          </blockquote>

          {/* Author Badge & Timestamp */}
          <div className="flex items-center justify-between gap-3 pt-3.5 border-t-2 border-[#1A1A1A]/20 mb-5">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 bg-white border-2 border-[#1A1A1A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#1A1A1A] shrink-0">
                <User className="w-4 h-4 text-[#1A1A1A]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#1A1A1A]">
                  <span className="truncate font-bold">{displayAuthor}</span>
                </div>
                <p
                  suppressHydrationWarning
                  className="text-[10px] sm:text-[11px] font-bold text-neutral-500 truncate"
                >
                  Ditempel {formatRelativeTime(message.created_at)}
                </p>
              </div>
            </div>

            {/* Spammable Clean Heart Button with Floating Particles */}
            <div className="relative inline-flex items-center">
              {floatingParticles.map((p) => (
                <span
                  key={p.id}
                  className="absolute -top-4 left-1/2 text-xs font-black text-[#EF4444] animate-float-heart select-none pointer-events-none z-30 inline-flex items-center gap-0.5"
                  style={{
                    transform: `translate(calc(-50% + ${p.offset}px), 0)`,
                  }}
                >
                  +1 <Heart className="w-2.5 h-2.5 fill-[#EF4444] text-[#EF4444] inline" strokeWidth={2.5} />
                </span>
              ))}

              <button
                onClick={handleLike}
                title="Beri Love (bisa tap berkali-kali)"
                aria-label="Beri Love"
                className="nb-btn px-3 py-1.5 text-xs bg-[#FFFFFF] hover:bg-neutral-100 text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5"
              >
                <Heart
                  key={popKey}
                  className={`w-3.5 h-3.5 transition-colors ${
                    popKey > 0 ? "animate-heart-pop" : ""
                  } ${
                    (message.likes ?? 0) > 0 ? "fill-[#EF4444] text-[#EF4444]" : "text-[#1A1A1A]"
                  }`}
                />
                <span className="font-black tabular-nums">{message.likes ?? 0}</span>
              </button>
            </div>
          </div>

          {/* Action Button Row: Acak Lagi & Bagikan Dropdown */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* 1. Acak Lagi (Dice) Button */}
            <button
              id="spotlight-shuffle-again-btn"
              onClick={onShuffleAgain}
              disabled={isShuffling}
              className="nb-btn bg-[#FFF066] hover:bg-[#FDE047] text-[#1A1A1A] py-2.5 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <Dices
                className={`w-4 h-4 text-[#1A1A1A] stroke-[2] ${
                  isShuffling ? "animate-spin" : ""
                }`}
              />
              <span>{isShuffling ? "Mengacak..." : "Acak Lagi"}</span>
            </button>

            {/* 2. Consolidated Neobrutalist Bagikan (Share) Button with Popover Dropdown */}
            <div ref={shareMenuRef} className="relative">
              <button
                id="spotlight-share-btn"
                onClick={() => setIsShareMenuOpen((prev) => !prev)}
                disabled={isExporting}
                className="w-full nb-btn bg-[#FFFFFF] hover:bg-neutral-100 text-[#1A1A1A] py-2.5 sm:py-3 text-xs sm:text-sm font-black uppercase tracking-wide flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Camera className="w-4 h-4 animate-spin text-[#1A1A1A]" />
                    <span>Memotret...</span>
                  </>
                ) : exportSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-[#16A34A] stroke-[3]" />
                    <span className="text-[#16A34A] font-black">Selesai</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#1A1A1A] stroke-[2.5]" />
                    <span>Bagikan</span>
                  </>
                )}
              </button>

              {/* Compact Neobrutalist Aspect Ratio Dropdown Menu */}
              {isShareMenuOpen && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-56 sm:w-64 bg-[#FFFFFF] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#000] z-40 overflow-hidden animate-fadeIn"
                  role="menu"
                >
                  <div className="px-3.5 py-2 bg-[#F5F5F0] border-b-2 border-[#1A1A1A] flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">
                      Pilih Format Gambar:
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500">1080p PNG</span>
                  </div>

                  <div className="p-1 space-y-1">
                    {RATIO_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectRatioAndExport(opt.id)}
                        className="w-full text-left px-3 py-2 border border-transparent hover:border-[#1A1A1A] hover:bg-[#FEF08A] hover:shadow-[1.5px_1.5px_0px_#1A1A1A] transition-all flex items-center justify-between group cursor-pointer"
                        role="menuitem"
                      >
                        <div className="flex items-center gap-2">
                          {opt.id === "1:1" && (
                            <Square className="w-4 h-4 text-[#1A1A1A] stroke-[2] shrink-0" />
                          )}
                          {opt.id === "9:16" && (
                            <Smartphone className="w-4 h-4 text-[#1A1A1A] stroke-[2] shrink-0" />
                          )}
                          {opt.id === "16:9" && (
                            <RectangleHorizontal className="w-4 h-4 text-[#1A1A1A] stroke-[2] shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-black text-[#1A1A1A]">
                              {opt.title}
                            </div>
                            <div className="text-[10px] font-bold text-neutral-500">
                              {opt.subtitle}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#1A1A1A] group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={2.5} />
                      </button>
                    ))}
                  </div>

                  {/* Share as Text (Copy to Clipboard) */}
                  <div className="p-1 pt-1 border-t-2 border-[#1A1A1A]/15 bg-neutral-50/50">
                    <button
                      type="button"
                      onClick={handleCopyAsText}
                      className="w-full text-left px-3 py-2 border border-transparent hover:border-[#1A1A1A] hover:bg-[#FEF08A] hover:shadow-[1.5px_1.5px_0px_#1A1A1A] transition-all flex items-center justify-between group cursor-pointer"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2">
                        <Copy className="w-4 h-4 text-[#1A1A1A] stroke-[2] shrink-0" />
                        <div>
                          <div className="text-xs font-black text-[#1A1A1A]">
                            Salin Format Teks
                          </div>
                          <div className="text-[10px] font-bold text-neutral-500">
                            Cocok untuk status / caption
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#1A1A1A] group-hover:translate-x-0.5 transition-transform shrink-0" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Isolated Off-Screen Canvas Container (Strictly Fixed 1080p Dimensions for Mobile & Desktop) */}
      <div
        id="export-offscreen-wrapper"
        style={{
          position: "fixed",
          top: "0px",
          left: "0px",
          width: `${currentDims.width}px`,
          height: `${currentDims.height}px`,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: -9999,
          boxSizing: "border-box",
          transform: "none",
          opacity: isExporting ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <div
          ref={exportCardRef}
          id="export-canvas-node"
          style={{
            width: `${currentDims.width}px`,
            minWidth: `${currentDims.width}px`,
            maxWidth: `${currentDims.width}px`,
            height: `${currentDims.height}px`,
            minHeight: `${currentDims.height}px`,
            maxHeight: `${currentDims.height}px`,
            background: getComplementaryDarkBg(theme.bg),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: currentDims.padding,
            boxSizing: "border-box",
            overflow: "hidden",
            transform: "none",
            filter: "none",
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Layered Double-Element Wrapper: Physical Faux Shadow Block + Foreground Card */}
          <div
            style={{
              position: "relative",
              width: currentDims.cardWidth,
              minWidth: currentDims.cardWidth,
              maxWidth: currentDims.cardWidth,
              boxSizing: "border-box",
            }}
          >
            {/* The Physical Shadow Block: Offset exactly 16px right and 16px bottom */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "translate(16px, 16px)",
                backgroundColor: "#000000",
                border: "2px solid #000000",
                borderRadius: "4px",
                zIndex: 1,
                pointerEvents: "none",
              }}
            />

            {/* Foreground Card Container with Content: Elevated at zIndex 10 with NO box-shadow */}
            <div
              id="export-quote-card"
              className="export-quote-card"
              style={{
                position: "relative",
                zIndex: 10,
                width: "100%",
                backgroundColor: theme.bg,
                border: "3.5px solid #000000",
                borderRadius: "4px",
                padding: "48px 56px",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                boxShadow: "none",
              }}
            >
              {/* Top Center Pushpin Graphic (Sits strictly above the card border, retaining circular integrity) */}
              <div
                style={{
                  position: "absolute",
                  top: "-22px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "44px",
                  height: "44px",
                  borderRadius: "9999px",
                  backgroundColor: theme.pin,
                  border: "3.5px solid #000000",
                  zIndex: 30,
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "none",
                }}
              >
                {/* Pushpin Internal Radial Depth Accent */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "3px",
                    right: "3px",
                    width: "36px",
                    height: "36px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(0, 0, 0, 0.18)",
                    pointerEvents: "none",
                  }}
                />
                {/* Pushpin Specular Highlight */}
                <div
                  style={{
                    position: "absolute",
                    top: "5px",
                    left: "7px",
                    width: "9px",
                    height: "9px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
              </div>

              {/* Window Header Strip: Fixed row alignment with no text wrapping */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "22px",
                  borderBottom: "2.5px solid rgba(26, 26, 26, 0.25)",
                  marginBottom: "32px",
                  width: "100%",
                  boxSizing: "border-box",
                  whiteSpace: "nowrap",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "9999px",
                      backgroundColor: "#EF4444",
                      border: "2px solid #1A1A1A",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "9999px",
                      backgroundColor: "#F59E0B",
                      border: "2px solid #1A1A1A",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "9999px",
                      backgroundColor: "#10B981",
                      border: "2px solid #1A1A1A",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "20px",
                      fontWeight: "900",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#1A1A1A",
                      whiteSpace: "nowrap",
                      lineHeight: "1",
                    }}
                  >
                    SorakSora!
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#4B5563",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    lineHeight: "1",
                  }}
                >
                  The Cheer Wall &bull; {formatRelativeTime(message.created_at)}
                </span>
              </div>

              {/* Quote Mark Box with Double-Element Faux Shadow */}
              <div
                style={{
                  position: "relative",
                  width: "56px",
                  height: "56px",
                  marginBottom: "28px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: "4px",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#000000",
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#FFFFFF",
                    border: "3px solid #000000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "none",
                  }}
                >
                  <Quote style={{ width: 30, height: 30, color: "#1A1A1A", strokeWidth: 2.5 }} />
                </div>
              </div>

              {/* Quote Text */}
              <blockquote
                style={{
                  fontSize:
                    displayMessage.length > 220
                      ? "30px"
                      : displayMessage.length > 120
                      ? "38px"
                      : "46px",
                  fontWeight: "800",
                  color: "#1A1A1A",
                  lineHeight: "1.4",
                  letterSpacing: "-0.02em",
                  margin: "0 0 36px 0",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                }}
              >
                &ldquo;{displayMessage}&rdquo;
              </blockquote>

              {/* Footer Strip: Author & Reaction Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "24px",
                  borderTop: "2.5px solid rgba(26, 26, 26, 0.25)",
                  width: "100%",
                  boxSizing: "border-box",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    minWidth: "0px",
                    flex: "1 1 auto",
                  }}
                >
                  {/* Author Avatar with Double-Element Faux Shadow */}
                  <div
                    style={{
                      position: "relative",
                      width: "48px",
                      height: "48px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "3px",
                        left: "3px",
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#000000",
                        zIndex: 1,
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        zIndex: 2,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#FFFFFF",
                        border: "2.5px solid #000000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "none",
                      }}
                    >
                      <User style={{ width: 24, height: 24, color: "#1A1A1A", strokeWidth: 2.5 }} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: "0px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: "900",
                        color: "#1A1A1A",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: "1.25",
                        maxWidth: "460px",
                      }}
                    >
                      {displayAuthor}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#666666",
                        whiteSpace: "nowrap",
                        lineHeight: "1.25",
                        marginTop: "2px",
                        letterSpacing: "-0.01em",
                        flexShrink: 0,
                      }}
                    >
                      Penulis Pesan Dukungan
                    </div>
                  </div>
                </div>

                {/* Reaction Badge with Double-Element Faux Shadow */}
                <div
                  style={{
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "3.5px",
                      left: "3.5px",
                      width: "100%",
                      height: "100%",
                      backgroundColor: "#000000",
                      zIndex: 1,
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      zIndex: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "10px 18px",
                      backgroundColor: "#FFFFFF",
                      border: "2.5px solid #000000",
                      fontSize: "20px",
                      fontWeight: "900",
                      lineHeight: "1",
                      whiteSpace: "nowrap",
                      boxSizing: "border-box",
                      boxShadow: "none",
                    }}
                  >
                    <Heart style={{ width: 20, height: 20, fill: "#EF4444", color: "#EF4444" }} />
                    <span
                      style={{
                        color: "#1A1A1A",
                        fontSize: "20px",
                        lineHeight: "1",
                        fontVariantNumeric: "tabular-nums",
                        display: "inline-block",
                      }}
                    >
                      {message.likes || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Corner Watermark with Double-Element Faux Shadow */}
          <div
            style={{
              position: "absolute",
              bottom: currentDims.watermarkBottom,
              right: currentDims.watermarkRight,
              flexShrink: 0,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "4px",
                left: "4px",
                width: "100%",
                height: "100%",
                backgroundColor: "#000000",
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.98)",
                border: "2.5px solid #000000",
                padding: "8px 14px",
                whiteSpace: "nowrap",
                boxShadow: "none",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "28px",
                  height: "28px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: "2px",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#000000",
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    width: "28px",
                    height: "28px",
                    backgroundColor: "#FEF08A",
                    border: "2px solid #000000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontSize: "13px",
                    color: "#1A1A1A",
                    lineHeight: "1",
                    boxShadow: "none",
                  }}
                >
                  SS
                </div>
              </div>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  color: "#1A1A1A",
                  whiteSpace: "nowrap",
                  lineHeight: "1",
                }}
              >
                SORAKSORA<span style={{ color: "#EF4444" }}>!</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
