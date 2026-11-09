"use client";

import React, { useEffect } from "react";
import { ArrowRight, Sparkles, Heart, X } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import packageJson from "../../package.json";

const APP_VERSION = packageJson?.version
  ? packageJson.version.startsWith("v")
    ? packageJson.version
    : `v${packageJson.version}`
  : "v1.0.0";

interface WelcomeModalProps {
  isOpen: boolean;
  onEnter: () => void;
  description?: string;
}

export function WelcomeModal({ isOpen, onEnter, description }: WelcomeModalProps) {
  // Keyboard dismiss (Escape) for accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEnter();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onEnter]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onEnter}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1A1A1A]/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#FFFFFF] border-[3px] border-[#1A1A1A] p-6 sm:p-10 relative text-center cursor-default z-10"
        style={{
          boxShadow: "8px 8px 0px #1A1A1A",
        }}
      >
        {/* Subtle decorative tape on top */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#FEF08A] border-2 border-[#1A1A1A] -rotate-1 pointer-events-none select-none z-10"
          style={{ opacity: 0.95 }}
        />

        {/* Top Right Close Button */}
        <button
          onClick={onEnter}
          aria-label="Tutup jendela intro"
          title="Tutup (Esc)"
          className="absolute top-3.5 right-3.5 w-7 h-7 sm:w-8 sm:h-8 bg-[#FFFFFF] hover:bg-neutral-100 border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
        </button>

        {/* Top Tag: The Cheer Wall */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F5EBE1] border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider text-[#1A1A1A] mb-5 sm:mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
          <span>The Cheer Wall</span>
        </div>

        {/* Main Heading with Dynamic Version Tag */}
        <h1 className="text-4xl sm:text-6xl font-black text-[#1A1A1A] tracking-tight uppercase mb-4 flex items-center justify-center flex-wrap">
          <span>
            SorakSora<span className="text-[#EF4444]">!</span>
          </span>
          <span
            id="about-modal-version-tag"
            className="ml-2 sm:ml-2.5 text-xs sm:text-sm font-mono font-bold tracking-normal text-neutral-600 bg-[#FAF9F5] border-2 border-[#1A1A1A] px-2 py-0.5 shadow-[1.5px_1.5px_0px_#1A1A1A] normal-case select-none inline-block align-middle"
          >
            {APP_VERSION}
          </span>
        </h1>

        {/* Description */}
        <div className="text-sm sm:text-base font-medium text-neutral-800 leading-relaxed max-w-lg mx-auto mb-8 whitespace-pre-line">
          <MarkdownRenderer
            content={
              description ||
              "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch."
            }
          />
        </div>

        {/* Primary Action Button: Buka Papan Pesan */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onEnter}
            id="enter-wall-btn"
            className="w-full sm:w-auto nb-btn bg-[#FEF08A] hover:bg-[#FDE047] text-[#1A1A1A] text-sm sm:text-base px-8 py-3.5 font-extrabold uppercase tracking-wide group"
          >
            <span>Buka Papan Pesan</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Micro footer attribution */}
        <p className="text-xs font-bold text-neutral-500 mt-6 flex items-center justify-center gap-1.5 flex-wrap">
          <span>Dibuat dengan sepenuh hati oleh</span>
          <a
            href="http://github.com/munukhu/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1A1A1A] font-black underline underline-offset-2 decoration-2 decoration-[#1A1A1A]/30 hover:decoration-[#EF4444] hover:text-[#EF4444] transition-colors"
          >
            @munukhu
          </a>
          <Heart className="w-3 h-3 text-[#EF4444] fill-[#EF4444] inline-block" />
        </p>
      </div>
    </div>
  );
}
