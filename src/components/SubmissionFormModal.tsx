"use client";

import React, { useState } from "react";
import { X, Send, ShieldCheck, UserCheck, Sparkles } from "lucide-react";
import { CreateMessageInput } from "@/lib/types";

interface SubmissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitMessage: (input: CreateMessageInput) => Promise<boolean>;
}

const QUICK_INSPIRATIONS = [
  "You are doing better than you give yourself credit for! 🌟",
  "Proud of you for simply showing up today. You matter! 💪",
  "Take a deep breath and give yourself some well-deserved grace. ☕",
  "Keep moving forward, even small steps add up to miles. 🚀",
  "The world is truly a better place with your smile in it. ✨",
];

export function SubmissionFormModal({
  isOpen,
  onClose,
  onSubmitMessage,
}: SubmissionFormModalProps) {
  const [name, setName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const charLimit = 280;
  const charsRemaining = charLimit - message.length;

  const isFormValid = isAnonymous
    ? message.trim().length > 0 && message.length <= charLimit
    : name.trim().length > 0 && message.trim().length > 0 && message.length <= charLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setErrorMessage("");

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setErrorMessage("Please write a short message of encouragement.");
      return;
    }

    if (trimmedMsg.length > charLimit) {
      setErrorMessage(`Message must be within ${charLimit} characters.`);
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmitMessage({
      name: isAnonymous ? "Anonymous" : name.trim() || "Anonymous",
      is_anonymous: isAnonymous,
      message: trimmedMsg,
    });

    setIsSubmitting(false);

    if (success) {
      setName("");
      setMessage("");
      setIsAnonymous(false);
      onClose();
    } else {
      setErrorMessage("Something went wrong saving your cheer. Please try again.");
    }
  };

  const applyInspiration = (quote: string) => {
    setMessage(quote);
    setErrorMessage("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1E1E1E]/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-lg bg-[#FFFFFF] nb-border-3 nb-shadow-xl z-10 animate-scaleIn"
        style={{ boxShadow: "10px 10px 0px #1E1E1E" }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FEF08A] border-b-[2.5px] border-[#1E1E1E]">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#1E1E1E]" />
            <h2
              id="submit-modal-title"
              className="text-base sm:text-lg font-black tracking-tight text-[#1E1E1E] uppercase flex items-center gap-1.5"
            >
              <span>Drop a Word of Support</span>
              <Sparkles className="w-4 h-4 text-[#1E1E1E] stroke-[2.5]" />
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#FFFFFF] hover:bg-neutral-100 nb-border nb-shadow-sm flex items-center justify-center text-[#1E1E1E] active:translate-x-0.5 active:translate-y-0.5"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-[#FEE2E2] nb-border text-red-900 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* Anonymous Toggle */}
          <div className="bg-[#FAF8F5] p-3.5 nb-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 nb-border flex items-center justify-center font-bold text-xs ${
                  isAnonymous ? "bg-[#1E1E1E] text-white" : "bg-[#BBF7D0] text-[#1E1E1E]"
                }`}
              >
                {isAnonymous ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div>
                <label
                  htmlFor="anonymous-toggle"
                  className="text-sm font-bold text-[#1E1E1E] cursor-pointer block"
                >
                  Post Anonymously
                </label>
                <p className="text-xs text-neutral-500 font-medium">
                  {isAnonymous
                    ? "Disguised as Anonymous Supporter 🕶️"
                    : "Show your name or friendly handle"}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="anonymous-toggle"
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none nb-border rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-[#1E1E1E] after:border-black after:border after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FEF08A]"></div>
            </label>
          </div>

          {/* Sender Name Field */}
          <div>
            <label
              htmlFor="sender-name-input"
              className="block text-xs font-black uppercase tracking-wider text-[#1E1E1E] mb-1.5"
            >
              Your Name / Alias {!isAnonymous && <span className="text-red-500 font-bold">*</span>}
            </label>
            <input
              id="sender-name-input"
              type="text"
              disabled={isAnonymous}
              value={isAnonymous ? "Anonymous Supporter" : name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jordan, Sunny, or a kind stranger"
              maxLength={40}
              className={`w-full px-3.5 py-2.5 nb-input text-sm ${
                isAnonymous ? "bg-neutral-100 text-neutral-500 cursor-not-allowed italic" : ""
              }`}
            />
          </div>

          {/* Support Message Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="support-message-textarea"
                className="block text-xs font-black uppercase tracking-wider text-[#1E1E1E]"
              >
                Words of Encouragement <span className="text-red-500 font-bold">*</span>
              </label>
              <span
                className={`text-xs font-bold ${
                  charsRemaining < 20 ? "text-red-600" : "text-neutral-500"
                }`}
              >
                {charsRemaining} left
              </span>
            </div>
            <textarea
              id="support-message-textarea"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write something hopeful, kind, or grounding..."
              maxLength={charLimit}
              className="w-full px-3.5 py-2.5 nb-input text-sm leading-relaxed resize-none"
            />
          </div>

          {/* Quick Inspirations Chips */}
          <div>
            <span className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
              Need ideas? Click to insert:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_INSPIRATIONS.map((quote, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyInspiration(quote)}
                  className="text-left text-xs bg-[#FAF8F5] hover:bg-[#FEF08A] nb-border py-1 px-2.5 transition-colors font-medium text-neutral-800"
                >
                  {quote}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="nb-btn bg-[#FFFFFF] hover:bg-neutral-100 text-[#1E1E1E] px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              id="submit-cheer-btn"
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`px-6 py-2.5 text-sm font-black border-[2.5px] border-[#1E1E1E] flex items-center justify-center gap-2 transition-all select-none ${
                !isFormValid || isSubmitting
                  ? "bg-neutral-300 text-neutral-500 cursor-not-allowed shadow-none"
                  : "bg-[#FEF08A] hover:bg-[#FDE047] text-[#1E1E1E] cursor-pointer shadow-[3px_3px_0px_#1E1E1E] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_#1E1E1E]"
              }`}
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? "Sharing..." : "Post Cheer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
