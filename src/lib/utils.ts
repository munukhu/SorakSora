import confetti from "canvas-confetti";
import { Message } from "./types";

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 30) return "baru saja";
    if (diffInSeconds < 60) return `${diffInSeconds} dtk lalu`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} mnt lalu`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "kemarin";
    if (diffInDays < 7) return `${diffInDays} hari lalu`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} mgg lalu`;

    return date.toLocaleDateString("id-ID", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "baru saja";
  }
}

// Curated 11 distinct, non-overlapping pastel paper tones (high text contrast)
export const PAPER_TONES = [
  { bg: "#FEF08A", name: "Kuning (Lemon Pastel)", pin: "#CA8A04", tapeColor: "rgba(254, 240, 138, 0.85)" },
  { bg: "#BBF7D0", name: "Hijau (Mint Pastel)", pin: "#16A34A", tapeColor: "rgba(187, 247, 208, 0.85)" },
  { bg: "#BAE6FD", name: "Biru (Sky Blue Pastel)", pin: "#0284C7", tapeColor: "rgba(186, 230, 253, 0.85)" },
  { bg: "#FECDD3", name: "Pink (Rose Pastel)", pin: "#E11D48", tapeColor: "rgba(254, 205, 211, 0.85)" },
  { bg: "#DDD6FE", name: "Ungu (Lavender Pastel)", pin: "#9333EA", tapeColor: "rgba(221, 214, 254, 0.85)" },
  { bg: "#FED7AA", name: "Oranye (Peach Pastel)", pin: "#EA580C", tapeColor: "rgba(254, 215, 170, 0.85)" },
  { bg: "#A5F3FC", name: "Teal / Cyan (Aqua Pastel)", pin: "#0891B2", tapeColor: "rgba(165, 243, 252, 0.85)" },
  { bg: "#FFB4B4", name: "Merah (Soft Coral Pastel)", pin: "#EF4444", tapeColor: "rgba(255, 180, 180, 0.85)" },
  { bg: "#D9F99D", name: "Lime (Matcha Pastel)", pin: "#65A30D", tapeColor: "rgba(217, 249, 157, 0.85)" },
  { bg: "#E7D4C0", name: "Cokelat (Sand Pastel)", pin: "#B45309", tapeColor: "rgba(231, 212, 192, 0.85)" },
  { bg: "#E2E8F0", name: "Abu-abu (Chalk Pastel)", pin: "#64748B", tapeColor: "rgba(226, 232, 240, 0.85)" },
];

export const PRESET_THEMES: Record<string, { bg: string; name: string; pin: string; tapeColor: string }> = {
  // Curated 11 Distinct Non-Overlapping Pastel Identities
  "#fef08a": { bg: "#FEF08A", name: "Kuning (Lemon Pastel)", pin: "#CA8A04", tapeColor: "rgba(254, 240, 138, 0.85)" },
  "#bbf7d0": { bg: "#BBF7D0", name: "Hijau (Mint Pastel)", pin: "#16A34A", tapeColor: "rgba(187, 247, 208, 0.85)" },
  "#bae6fd": { bg: "#BAE6FD", name: "Biru (Sky Blue Pastel)", pin: "#0284C7", tapeColor: "rgba(186, 230, 253, 0.85)" },
  "#fecdd3": { bg: "#FECDD3", name: "Pink (Rose Pastel)", pin: "#E11D48", tapeColor: "rgba(254, 205, 211, 0.85)" },
  "#ddd6fe": { bg: "#DDD6FE", name: "Ungu (Lavender Pastel)", pin: "#9333EA", tapeColor: "rgba(221, 214, 254, 0.85)" },
  "#fed7aa": { bg: "#FED7AA", name: "Oranye (Peach Pastel)", pin: "#EA580C", tapeColor: "rgba(254, 215, 170, 0.85)" },
  "#a5f3fc": { bg: "#A5F3FC", name: "Teal / Cyan (Aqua Pastel)", pin: "#0891B2", tapeColor: "rgba(165, 243, 252, 0.85)" },
  "#ffb4b4": { bg: "#FFB4B4", name: "Merah (Soft Coral Pastel)", pin: "#EF4444", tapeColor: "rgba(255, 180, 180, 0.85)" },
  "#d9f99d": { bg: "#D9F99D", name: "Lime (Matcha Pastel)", pin: "#65A30D", tapeColor: "rgba(217, 249, 157, 0.85)" },
  "#e7d4c0": { bg: "#E7D4C0", name: "Cokelat (Sand Pastel)", pin: "#B45309", tapeColor: "rgba(231, 212, 192, 0.85)" },
  "#e2e8f0": { bg: "#E2E8F0", name: "Abu-abu (Chalk Pastel)", pin: "#64748B", tapeColor: "rgba(226, 232, 240, 0.85)" },

  // Graceful fallbacks for legacy historical notes
  "#ffd1dc": { bg: "#FFB4B4", name: "Merah (Soft Coral Pastel)", pin: "#EF4444", tapeColor: "rgba(255, 180, 180, 0.85)" },
  "#fef9c3": { bg: "#FEF08A", name: "Kuning (Lemon Pastel)", pin: "#CA8A04", tapeColor: "rgba(254, 240, 138, 0.85)" },
  "#e9d5ff": { bg: "#DDD6FE", name: "Ungu (Lavender Pastel)", pin: "#9333EA", tapeColor: "rgba(221, 214, 254, 0.85)" },
  "#ffedd5": { bg: "#FED7AA", name: "Oranye (Peach Pastel)", pin: "#EA580C", tapeColor: "rgba(254, 215, 170, 0.85)" },
  "#c7f9cc": { bg: "#BBF7D0", name: "Hijau (Mint Pastel)", pin: "#16A34A", tapeColor: "rgba(187, 247, 208, 0.85)" },
  "#e2d4f0": { bg: "#DDD6FE", name: "Ungu (Lavender Pastel)", pin: "#9333EA", tapeColor: "rgba(221, 214, 254, 0.85)" },
  "#fef3c7": { bg: "#FEF08A", name: "Kuning (Lemon Pastel)", pin: "#CA8A04", tapeColor: "rgba(254, 240, 138, 0.85)" },
  "#d1fae5": { bg: "#BBF7D0", name: "Hijau (Mint Pastel)", pin: "#16A34A", tapeColor: "rgba(187, 247, 208, 0.85)" },
  "#cffafe": { bg: "#BAE6FD", name: "Biru (Sky Blue Pastel)", pin: "#0284C7", tapeColor: "rgba(186, 230, 253, 0.85)" },
  "#fce7f3": { bg: "#FECDD3", name: "Pink (Rose Pastel)", pin: "#E11D48", tapeColor: "rgba(254, 205, 211, 0.85)" },
  "#ffe4d6": { bg: "#FED7AA", name: "Oranye (Peach Pastel)", pin: "#EA580C", tapeColor: "rgba(254, 215, 170, 0.85)" },
  "#e0e7ff": { bg: "#BAE6FD", name: "Biru (Sky Blue Pastel)", pin: "#0284C7", tapeColor: "rgba(186, 230, 253, 0.85)" },
  "#fffbeb": { bg: "#FEF08A", name: "Kuning (Lemon Pastel)", pin: "#CA8A04", tapeColor: "rgba(254, 240, 138, 0.85)" },
  "#d9e8d2": { bg: "#D9F99D", name: "Lime (Matcha Pastel)", pin: "#65A30D", tapeColor: "rgba(217, 249, 157, 0.85)" },
};

const BORDER_RADII = [
  "2px 2px 2px 2px",
  "3px 9px 2px 8px",
  "8px 2px 9px 3px",
  "1px 6px 2px 5px",
  "0px",
  "4px 4px 4px 4px",
];

export function getCardFrame(seed: string, customColor?: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const abs = Math.abs(hash);

  let tone = PAPER_TONES[abs % PAPER_TONES.length];
  if (customColor && customColor.trim()) {
    const clean = customColor.trim().toLowerCase();
    if (PRESET_THEMES[clean]) {
      tone = PRESET_THEMES[clean];
    } else {
      tone = {
        bg: customColor.trim(),
        name: "Custom",
        pin: "#EF4444",
        tapeColor: "rgba(254, 240, 138, 0.85)",
      };
    }
  }

  const borderRadius = BORDER_RADII[abs % BORDER_RADII.length];

  // Baseline tilt between -2.5deg and +2.2deg
  const rotVal = (abs % 48) - 25;
  const rotation = rotVal / 10;

  // Staggered wind sway duration: 4.4s to 7.2s
  const swayDur = (4.4 + (abs % 28) / 10).toFixed(1) + "s";
  // Staggered sway delay: -0.4s to -5.8s
  const swayDelay = (-((abs % 54) / 10)).toFixed(1) + "s";

  const pinOffset = 35 + (abs % 30); // 35% to 65%
  const isTape = abs % 3 === 0;

  return {
    bg: tone.bg,
    pin: tone.pin,
    tapeColor: tone.tapeColor,
    borderRadius,
    rotation,
    swayDur,
    swayDelay,
    pinOffset,
    isTape,
  };
}

export function getCardTheme(seed: string, customColor?: string) {
  const frame = getCardFrame(seed, customColor);
  return {
    bg: frame.bg,
    pin: frame.pin,
    tapeColor: frame.tapeColor,
  };
}

export const getCardColor = getCardTheme;

/**
 * Resolves full card theme (bg, pin, tapeColor) by matching exact background color
 * with graceful fallback to seed calculation.
 */
export function getCardThemeByBg(bg?: string | null, seed?: string) {
  if (bg) {
    const clean = bg.toLowerCase().trim();
    if (PRESET_THEMES[clean]) {
      return PRESET_THEMES[clean];
    }
    const found = PAPER_TONES.find((t) => t.bg.toLowerCase() === clean);
    if (found) {
      return {
        bg: found.bg,
        pin: found.pin,
        tapeColor: found.tapeColor,
      };
    }
    return {
      bg,
      pin: "#EF4444",
      tapeColor: "rgba(254, 240, 138, 0.85)",
    };
  }
  return getCardTheme(seed || "showup");
}

/**
 * Returns a warm, rich saturated tone derived from the card's pastel color
 * for the CodeSnap/Carbon style export canvas (cozy, aesthetic, and shareable).
 */
export function getComplementaryDarkBg(cardBg: string): string {
  const clean = (cardBg || "").toLowerCase().trim();
  switch (clean) {
    case "#fef08a":
    case "#fef9c3":
    case "#fef3c7":
    case "#fffbeb": // 1. Yellow (Lemon Pastel) -> Golden Amber / Terracotta
      return "radial-gradient(circle at 50% 35%, #D97706 0%, #B45309 55%, #92400E 100%)";
    case "#bbf7d0":
    case "#c7f9cc":
    case "#d1fae5":
    case "#dcfce7": // 2. Green (Mint Pastel) -> Deep Emerald / Forest Moss
      return "radial-gradient(circle at 50% 35%, #15803D 0%, #166534 55%, #14532D 100%)";
    case "#bae6fd":
    case "#cffafe":
    case "#e0f2fe":
    case "#e0e7ff": // 3. Blue (Sky Blue Pastel) -> Royal Blue / Slate Indigo
      return "radial-gradient(circle at 50% 35%, #1D4ED8 0%, #1E40AF 55%, #172554 100%)";
    case "#fecdd3":
    case "#fce7f3":
    case "#ffe4e6": // 4. Pink (Rose Pastel) -> Muted Mauve / Plum Rose
      return "radial-gradient(circle at 50% 35%, #BE185D 0%, #9D174D 55%, #701A75 100%)";
    case "#ddd6fe":
    case "#e2d4f0":
    case "#e9d5ff":
    case "#f3e8ff": // 5. Purple (Lavender Pastel) -> Deep Dusty Violet / Iris
      return "radial-gradient(circle at 50% 35%, #7C3AED 0%, #6D28D9 55%, #4C1D95 100%)";
    case "#fed7aa":
    case "#ffedd5":
    case "#ffe4d6": // 6. Orange (Peach Pastel) -> Warm Terracotta / Burnt Sienna
      return "radial-gradient(circle at 50% 35%, #EA580C 0%, #C2410C 55%, #9A3412 100%)";
    case "#a5f3fc": // 7. Cyan / Teal (Aqua Pastel) -> Deep Cyan / Dark Teal Ocean
      return "radial-gradient(circle at 50% 35%, #0891B2 0%, #0E7490 55%, #155E75 100%)";
    case "#ffb4b4":
    case "#ffd1dc": // 8. Red (Soft Coral / Salmon Pastel) -> Deep Crimson / Dark Coral Wine
      return "radial-gradient(circle at 50% 35%, #DC2626 0%, #B91C1C 55%, #7F1D1D 100%)";
    case "#d9f99d":
    case "#d9e8d2": // 9. Lime (Matcha / Chartreuse Pastel) -> Deep Olive Matcha / Moss Pine
      return "radial-gradient(circle at 50% 35%, #4D7C0F 0%, #3F6212 55%, #1A2E05 100%)";
    case "#e7d4c0": // 10. Brown (Sand / Muted Biscuit Pastel) -> Warm Mocha / Espresso Biscuit
      return "radial-gradient(circle at 50% 35%, #854D0E 0%, #713F12 55%, #451A03 100%)";
    case "#e2e8f0":
    case "#faf9f6": // 11. Gray (Warm Slate / Chalk Pastel) -> Deep Slate / Dark Charcoal
    default:
      return "radial-gradient(circle at 50% 35%, #475569 0%, #334155 55%, #1E293B 100%)";
  }
}

export function getCardRotation(seed: string): number {
  return getCardFrame(seed).rotation;
}

export function getCardPinOffset(seed: string): number {
  return getCardFrame(seed).pinOffset;
}

export function fireConfetti(originX = 0.5, originY = 0.5) {
  try {
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { x: originX, y: originY },
      colors: ["#FEF08A", "#BBF7D0", "#BAE6FD", "#FED7AA", "#1E1E1E", "#EF4444"],
      disableForReducedMotion: true,
    });
  } catch {
    // Graceful fallback
  }
}

export function fireMegaConfetti() {
  try {
    const end = Date.now() + 900;
    const colors = ["#FEF08A", "#EF4444", "#3B82F6", "#10B981", "#F59E0B"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 50,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 50,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } catch {
    // Ignore
  }
}

/**
 * Sorts messages with Pinned messages always on top (ORDER BY is_pinned DESC, likes DESC, created_at ASC).
 * For pinned messages, sorted among themselves by Love count descending, tie-broken by created_at ascending.
 * For unpinned messages, sorted by Love count descending, tie-broken by created_at ascending.
 */
export function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const pinA = a.is_pinned ? 1 : 0;
    const pinB = b.is_pinned ? 1 : 0;
    if (pinB !== pinA) {
      return pinB - pinA;
    }
    const likesA = a.likes ?? 0;
    const likesB = b.likes ?? 0;
    if (likesB !== likesA) {
      return likesB - likesA;
    }
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeA - timeB;
  });
}

export { getDisplayMessage } from "./profanityFilter";

