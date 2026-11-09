"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isClosing, setIsClosing] = useState(false);
  const duration = toast.duration ?? 5000;

  const triggerClose = useCallback(() => {
    setIsClosing(true);
    // Wait for slide-up exit animation (240ms) before unmounting
    setTimeout(() => {
      onDismiss(toast.id);
    }, 240);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, triggerClose]);

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";
  const isWarning = toast.type === "warning";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative w-full overflow-hidden border-[2.5px] sm:border-[3px] border-[#1A1A1A] p-3.5 sm:p-4 pr-11 sm:pr-12 text-[#1A1A1A] transition-all select-none ${
        isClosing ? "animate-toast-out" : "animate-toast-in"
      } ${
        isSuccess
          ? "bg-[#FEF9C3]" // Off-white / pale yellow background
          : isWarning
          ? "bg-[#FFF066]" // Neobrutalist bold warning yellow
          : isError
          ? "bg-[#FEE2E2]"
          : "bg-[#F5F5F0]"
      }`}
      style={{
        boxShadow: "5px 5px 0px #1A1A1A",
      }}
    >
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <div className="w-8 h-8 rounded-none bg-[#BBF7D0] border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#1A1A1A]">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#14532D] stroke-[2.5]" />
          </div>
        ) : isWarning ? (
          <div className="w-8 h-8 rounded-none bg-[#FDE047] border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#1A1A1A]">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
          </div>
        ) : isError ? (
          <div className="w-8 h-8 rounded-none bg-[#FECDD3] border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#1A1A1A]">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#9F1239] stroke-[2.5]" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-none bg-[#E0E7FF] border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#1A1A1A]">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#3730A3] stroke-[2.5]" />
          </div>
        )}

        <p className="font-extrabold text-xs sm:text-sm text-[#1A1A1A] leading-snug">
          {toast.message}
        </p>
      </div>

      {/* Tiny Neobrutalist "x" close button */}
      <button
        onClick={triggerClose}
        aria-label="Tutup notifikasi"
        title="Tutup"
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-6 h-6 sm:w-7 sm:h-7 bg-white hover:bg-neutral-100 active:bg-neutral-200 border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] flex items-center justify-center text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-transform cursor-pointer"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
      </button>

      {/* 5s Countdown Progress Bar at very bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#1A1A1A]/15 overflow-hidden">
        <div
          className="h-full bg-[#1A1A1A]"
          style={{
            animation: `toast-drain ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-[100] w-[92vw] max-w-lg pointer-events-none flex flex-col items-center gap-2.5">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
