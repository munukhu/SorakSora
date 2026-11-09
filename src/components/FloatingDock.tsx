"use client";

import React from "react";
import { Plus } from "lucide-react";

interface FloatingDockProps {
  onOpenDropCheer: () => void;
  isArchived?: boolean;
}

export function FloatingDock({ onOpenDropCheer, isArchived = false }: FloatingDockProps) {
  if (isArchived) {
    return null;
  }

  return (
    <div className="fixed bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto">
      <button
        id="dock-drop-cheer-btn"
        onClick={onOpenDropCheer}
        className="nb-btn bg-[#FFF066] hover:bg-[#FDE047] text-[#1A1A1A] py-3 sm:py-3.5 px-6 sm:px-8 text-xs sm:text-sm font-black uppercase tracking-wider border-[2.5px] sm:border-[3px] border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[6px_6px_0px_#1A1A1A] active:translate-x-1 active:translate-y-1 active:shadow-[1.5px_1.5px_0px_#1A1A1A] transition-all flex items-center gap-2.5 group"
        title="Kirim pesan dukungan baru ke cheer wall"
      >
        <div className="w-5 h-5 bg-[#1A1A1A] text-white flex items-center justify-center rounded-[2px] group-hover:rotate-90 transition-transform duration-200">
          <Plus className="w-3.5 h-3.5 stroke-[3] text-white" />
        </div>
        <span className="font-extrabold tracking-wide">Kirim Dukungan</span>
      </button>
    </div>
  );
}
