"use client";

import React, { useState, useEffect } from "react";
import { X, User, Send, Sparkles, Palette, AlertCircle, Lock } from "lucide-react";
import {
  CreateMessageInput,
  NOTE_COLOR_PRESETS,
  DEFAULT_ARCHIVE_ANNOUNCEMENT,
} from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface DropCheerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitMessage: (
    input: CreateMessageInput
  ) => Promise<boolean | { success: boolean; error?: string; isRateLimited?: boolean }>;
  maxCharLimit?: number;
  isArchived?: boolean;
  archiveAnnouncement?: string;
}

// Randomly select one preset hex from the palette list
const getRandomPresetHex = () => {
  const randomIndex = Math.floor(Math.random() * NOTE_COLOR_PRESETS.length);
  return NOTE_COLOR_PRESETS[randomIndex].hex;
};

export function DropCheerModal({
  isOpen,
  onClose,
  onSubmitMessage,
  maxCharLimit,
  isArchived = false,
  archiveAnnouncement,
}: DropCheerModalProps) {
  const [name, setName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(getRandomPresetHex);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rateLimitNotice, setRateLimitNotice] = useState("");
  const [hasNameError, setHasNameError] = useState(false);

  // Randomly select one initial preset color when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColor(getRandomPresetHex());
      setErrorMessage("");
      setRateLimitNotice("");
      setHasNameError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (isArchived) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto box-border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-dialog-title"
        onClick={onClose}
      >
        <div className="fixed inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm" />
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-md bg-[#E2E8F0] border-[3px] border-[#1A1A1A] p-5 sm:p-6 shadow-[8px_8px_0px_#1A1A1A]"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemberitahuan arsip"
            className="absolute top-3 right-3 w-8 h-8 bg-white border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
          <div className="w-12 h-12 bg-white border-2 border-[#1A1A1A] shadow-[3px_3px_0px_#1A1A1A] flex items-center justify-center mb-5">
            <Lock className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
          </div>
          <h2 id="archive-dialog-title" className="text-xl font-black uppercase tracking-tight mb-3">
            Dinding Diarsipkan
          </h2>
          <MarkdownRenderer
            content={archiveAnnouncement?.trim() || DEFAULT_ARCHIVE_ANNOUNCEMENT}
            className="text-sm font-medium text-neutral-700 leading-relaxed"
          />
        </div>
      </div>
    );
  }

  const charLimit = maxCharLimit && maxCharLimit > 0 ? maxCharLimit : 280;
  const charsRemaining = charLimit - message.length;

  const isManualAnonim = !isAnonymous && name.trim().toLowerCase() === "anonim";

  const isFormValid = isAnonymous
    ? message.trim().length > 0 && message.length <= charLimit
    : name.trim().length > 0 && !isManualAnonim && message.trim().length > 0 && message.length <= charLimit;

  const handleToggleAnonymous = () => {
    const nextVal = !isAnonymous;
    setIsAnonymous(nextVal);
    setHasNameError(false);
    if (errorMessage.includes("Nama/Alias") || errorMessage.includes("Anonim")) {
      setErrorMessage("");
    }
  };

  const handleCycleColor = () => {
    const currentIndex = NOTE_COLOR_PRESETS.findIndex((p) => p.hex === selectedColor);
    const nextIndex = (currentIndex + 1) % NOTE_COLOR_PRESETS.length;
    setSelectedColor(NOTE_COLOR_PRESETS[nextIndex].hex);
  };

  const currentPreset =
    NOTE_COLOR_PRESETS.find((p) => p.hex === selectedColor) || NOTE_COLOR_PRESETS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setErrorMessage("");
    setHasNameError(false);

    const trimmedName = name.trim();
    // Normalize line breaks and collapse whitespace strictly on form submission
    const sanitizedMsg = message
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Strict validation: Nama/Alias is strictly required when not anonymous
    if (!isAnonymous && !trimmedName) {
      setErrorMessage("Silakan isi Nama/Alias kamu jika tidak anonim.");
      setHasNameError(true);
      return;
    }

    if (!isAnonymous && trimmedName.toLowerCase() === "anonim") {
      setErrorMessage(
        "Nama tidak boleh diisi 'Anonim'. Aktifkan toggle 'Kirim sebagai Anonim' jika ingin mengirim tanpa nama."
      );
      setHasNameError(true);
      return;
    }

    if (!sanitizedMsg) {
      setErrorMessage("Silakan tulis pesan semangat atau kata dukunganmu.");
      return;
    }

    if (sanitizedMsg.length > charLimit) {
      setErrorMessage(`Pesan maksimal ${charLimit} karakter.`);
      return;
    }

    setIsSubmitting(true);
    const res = await onSubmitMessage({
      name: isAnonymous ? "Anonim" : trimmedName,
      is_anonymous: isAnonymous,
      message: sanitizedMsg,
      color: selectedColor,
    });

    setIsSubmitting(false);

    const isSuccess = typeof res === "boolean" ? res : res?.success;
    if (isSuccess) {
      setName("");
      setMessage("");
      setIsAnonymous(false);
      setSelectedColor(getRandomPresetHex());
      setHasNameError(false);
      setRateLimitNotice("");
      setErrorMessage("");
      onClose();
    } else {
      const errorMsg =
        typeof res === "object" && res?.error
          ? res.error
          : "Gagal menempelkan pesan. Silakan coba lagi.";
      const isRateLimited = typeof res === "object" && Boolean(res?.isRateLimited);
      if (isRateLimited) {
        setRateLimitNotice(errorMsg);
        setErrorMessage("");
      } else {
        setErrorMessage(errorMsg);
        setRateLimitNotice("");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto box-border"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Dimmed backdrop */}
      <div className="fixed inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm transition-opacity" />

      {/* Modal Dialog Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md mx-auto border-[3px] border-[#1A1A1A] z-10 overflow-hidden transition-colors duration-200 box-border"
        style={{
          backgroundColor: selectedColor,
          boxShadow: "8px 8px 0px #1A1A1A",
        }}
      >
        {/* 1. Header Banner */}
        <div
          className="border-b-[3px] border-[#1A1A1A] px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between transition-colors duration-200"
          style={{ backgroundColor: selectedColor }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#1A1A1A] rounded-full inline-block" />
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
              <span>KIRIM DUKUNGAN</span>
              <Sparkles className="w-4 h-4 text-[#1A1A1A] stroke-[2.5]" />
            </h2>
          </div>

          {/* Square Neobrutalist Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#FFFFFF] hover:bg-neutral-100 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            aria-label="Tutup jendela"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* 2. Form Body Layout */}
        <form
          onSubmit={handleSubmit}
          className="p-3.5 sm:p-5 space-y-4 transition-colors duration-200 box-border w-full"
          style={{ backgroundColor: selectedColor }}
        >
          {rateLimitNotice && (
            <div className="p-3 bg-[#FFF066] border-2 border-[#1A1A1A] text-[#1A1A1A] text-xs font-bold shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{rateLimitNotice}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-[#FEE2E2] border-2 border-[#1A1A1A] text-red-900 text-xs font-bold shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Top Row: Anonymous Toggle Card & Compact Palette Cycler Button */}
          <div className="flex items-center gap-2 w-full">
            {/* Left/Main Box: "Kirim sebagai Anonim" toggle card */}
            <div className="flex-1 min-w-0 flex items-center justify-between p-2 sm:p-2.5 bg-white border-2 border-black shadow-[2px_2px_0px_#000]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded border border-black bg-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
                  <User className="w-4 h-4 text-black" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate text-[#1A1A1A]">
                    Kirim sebagai Anonim
                  </p>
                  <p className="text-[10px] text-neutral-500 leading-tight truncate">
                    Tampilkan nama atau anonim
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="shrink-0 ml-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnonymous}
                  onClick={handleToggleAnonymous}
                  aria-label="Kirim sebagai anonim"
                  className={`relative w-11 sm:w-12 h-6 sm:h-7 border-2 border-[#1A1A1A] transition-colors p-0.5 focus:outline-none shadow-[1.5px_1.5px_0px_#000] flex-shrink-0 cursor-pointer ${
                    isAnonymous ? "bg-[#FFF066]" : "bg-neutral-200"
                  }`}
                >
                  <div
                    className={`w-4 sm:w-5 h-4 sm:h-5 bg-[#1A1A1A] border border-black transform transition-transform duration-150 ${
                      isAnonymous ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Palette Cycler Button */}
            <button
              type="button"
              onClick={handleCycleColor}
              title={`Ganti Warna Note (${currentPreset.name})`}
              aria-label={`Ganti Warna Note (saat ini: ${currentPreset.name})`}
              className="w-12 h-12 shrink-0 flex items-center justify-center bg-white border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer select-none group"
            >
              <Palette
                className="w-5 h-5 stroke-[2] group-hover:rotate-12 transition-transform"
                fill={selectedColor}
                stroke="#1A1A1A"
                style={{ fill: selectedColor }}
              />
            </button>
          </div>

          {/* Name / Alias Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="cheer-sender-name"
                className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A]"
              >
                NAMA / ALIAS {!isAnonymous && <span className="text-red-500 font-bold">*</span>}
              </label>
            </div>
            <input
              id="cheer-sender-name"
              type="text"
              disabled={isAnonymous}
              required={!isAnonymous}
              value={isAnonymous ? "Anonim" : name}
              onChange={(e) => {
                setName(e.target.value);
                if (hasNameError) {
                  setHasNameError(false);
                }
                if (errorMessage.includes("Nama/Alias") || errorMessage.includes("Anonim")) {
                  setErrorMessage("");
                }
              }}
              placeholder={isAnonymous ? "Anonim" : "misal: Budi, Kawan Lari, atau Teman Baik"}
              maxLength={40}
              className={`w-full px-3 py-2.5 sm:px-3.5 sm:py-3 border-[2.5px] text-base sm:text-sm font-semibold transition-all focus:outline-none shadow-[3px_3px_0px_#000000] focus:shadow-[4px_4px_0px_#000000] box-border ${
                isAnonymous
                  ? "border-[#1A1A1A] bg-neutral-100 text-neutral-400 cursor-not-allowed italic"
                  : hasNameError || isManualAnonim
                  ? "border-[#EF4444] bg-[#FEF2F2] text-[#1A1A1A] ring-2 ring-[#EF4444]"
                  : "border-[#1A1A1A] bg-[#FFFFFF] text-[#1A1A1A]"
              }`}
            />
            {!isAnonymous && isManualAnonim && (
              <p
                id="name-anonim-error"
                className="text-xs font-bold text-red-600 flex items-center gap-1.5 mt-1.5 bg-red-50 p-2 border border-red-300"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                <span>
                  Nama tidak boleh diisi &apos;Anonim&apos;. Aktifkan toggle &apos;Kirim sebagai Anonim&apos; jika ingin mengirim tanpa nama.
                </span>
              </p>
            )}
          </div>

          {/* Cheer Message Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="cheer-message-text"
                className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A]"
              >
                PESAN DUKUNGAN <span className="text-red-500 font-bold">*</span>
              </label>
              <span
                className={`text-xs font-bold ${
                  charsRemaining < 20 ? "text-red-600" : "text-neutral-500"
                }`}
              >
                {charsRemaining} tersisa
              </span>
            </div>

            <textarea
              id="cheer-message-text"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis kata-kata penyemangat, doa, atau pesan hangat..."
              maxLength={charLimit}
              className="w-full px-3 py-2.5 sm:px-3.5 sm:py-3 border-[2.5px] border-[#1A1A1A] text-base sm:text-sm font-semibold leading-relaxed resize-none bg-[#FFFFFF] text-[#1A1A1A] shadow-[3px_3px_0px_#000000] focus:outline-none focus:shadow-[4px_4px_0px_#000000] box-border"
            />
          </div>

          {/* Submit Button (Full Width, Bold Primary Action) */}
          <div className="pt-2">
            <button
              id="pin-to-wall-btn"
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-3 sm:py-3.5 px-4 text-xs sm:text-sm font-black uppercase tracking-wider border-[2.5px] border-[#1A1A1A] flex items-center justify-center gap-2 transition-all select-none box-border ${
                !isFormValid || isSubmitting
                  ? "bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none"
                  : "bg-[#1A1A1A] hover:bg-black text-white cursor-pointer shadow-[4px_4px_0px_#000] hover:shadow-[5px_5px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#000]"
              }`}
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? "MENEMPELKAN..." : "TEMPEL DI CHEER WALL"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
