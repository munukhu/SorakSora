import {
  analyze,
  filter,
  getPresetOptions,
  censorWord,
  Region,
  isProfane,
} from "@sideid/id-profanity-filter";
import { SafetyCheckResult } from "./types";

export type { SafetyCheckResult };
export type ModerationLayerName = "Built-in Dictionary" | "Custom Word" | "URL Spam";

export interface ModerationSettingsInput {
  enable_content_moderation?: boolean;
  enable_builtin_filter?: boolean;
  enable_custom_filter?: boolean;
  enable_url_filter?: boolean;
  banned_words?: string;
  whitelist_words?: string;
  filter_preset?: "strict" | "moderate" | "light" | "childSafe";
  filter_severity_threshold?: number;
  filter_detect_leetspeak?: boolean;
  filter_detect_split?: boolean;
  filter_detect_dialects?: boolean;
  filter_censor_mode?: "normal" | "first_last" | "grawlix" | "asterisk" | "none";
  // Legacy support fallback
  profanity_filter_enabled?: boolean;
  spam_filter_enabled?: boolean;
}

export interface ModerationCheckInput {
  message: string;
  name?: string;
  isAnonymous?: boolean;
  settings: ModerationSettingsInput;
}

export interface ModerationResult extends SafetyCheckResult {
  isFlagged: boolean;
  flaggedLayers: ModerationLayerName[];
  flaggedReason: string;
  details: {
    builtin: boolean;
    custom: boolean;
    url: boolean;
  };
}

export const INDONESIAN_REGIONS: Region[] = [
  "general",
  "jawa",
  "sunda",
  "betawi",
  "batak",
  "minang",
  "bali",
  "madura",
  "aceh",
];

export const DEFAULT_BANNED_WORDS: string[] = [
  "judi online",
  "slot gacor",
  "zeus slot",
  "pragmatic slot",
  "maxwin",
  "deposit pulsa",
  "link gacor",
  "open bo",
  "vcs",
  "pinjol ilegal",
  "dana kaget palsu",
  "penipuan giveaway",
  "investasi bodong",
  "crypto doubling",
  "wa.me/",
  "bit.ly/",
  "t.me/",
  "jual followers",
  "hack akun",
  "cheat game",
  "joki skripsi murah",
  "obat aborsi",
  "surat palsu",
  "jual ginjal",
  "situs terlarang",
  "phishing link",
  "hadiah pulsa gratis",
  "klik tautan ini",
];

export const DEFAULT_BANNED_WORDS_STR: string = DEFAULT_BANNED_WORDS.join(", ");

export const URL_REGEX =
  /(https?:\/\/|www\.)[^\s]+|(\b[a-zA-Z0-9-]+\.(com|xyz|net|org|id|online|site|vip|link|top|cc|me|live|shop|info|biz|co|io)\b)/i;

/**
 * Parses a comma, semicolon, or newline delimited string into cleaned, unique lowercase tokens.
 */
export function parseDelimitedWords(input?: string): string[] {
  if (!input) return [];
  const list = input
    .split(/[,\n;]/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);
  return Array.from(new Set(list));
}

/**
 * Layer 1: Built-in Indonesian Profanity Dictionary (@sideid/id-profanity-filter)
 * Detects vulgarities, leetspeak, slang, regional dialects, and common character substitutions.
 */
export function checkBuiltinProfanity(
  text: string,
  options?: {
    preset?: "strict" | "moderate" | "light" | "childSafe";
    whitelist?: string[];
    detectLeetSpeak?: boolean;
    detectSplit?: boolean;
    detectDialects?: boolean;
    severityThreshold?: number;
  }
): boolean {
  if (!text || !text.trim()) return false;
  try {
    const preset = options?.preset || "moderate";
    const whitelist = options?.whitelist || [];
    const activeRegions = options?.detectDialects !== false ? INDONESIAN_REGIONS : (["general"] as Region[]);
    const presetOpts = getPresetOptions(preset, {
      whitelist,
      detectLeetSpeak: options?.detectLeetSpeak !== false,
      detectSplit: options?.detectSplit !== false,
      indonesianVariation: true,
      useLevenshtein: true,
      detectSimilarity: true,
      similarityThreshold: 0.8,
      regions: activeRegions,
      severityThreshold: options?.severityThreshold ?? 0.5,
    });
    return isProfane(text, presetOpts);
  } catch (err) {
    console.error("Error executing @sideid/id-profanity-filter checkBuiltinProfanity:", err);
    return false;
  }
}

/**
 * Layer 2: Custom Banned Wordlist (Admin Managed)
 * Operates independently from the built-in library, with whitelist exclusion.
 */
export function checkCustomWordlist(
  text: string,
  bannedWordsStr?: string,
  whitelistStr?: string
): boolean {
  if (!text || !bannedWordsStr || !bannedWordsStr.trim()) return false;

  const keywords = parseDelimitedWords(bannedWordsStr);
  const whitelist = parseDelimitedWords(whitelistStr);
  const effectiveKeywords = keywords.filter((k) => !whitelist.includes(k));

  if (effectiveKeywords.length === 0) return false;

  const lowerText = text.toLowerCase();
  for (const word of effectiveKeywords) {
    if (lowerText.includes(word)) {
      return true;
    }
  }

  return false;
}

/**
 * Layer 3: Spam URL & External Link Detection
 */
export function checkSpamUrl(text: string): boolean {
  if (!text) return false;
  return URL_REGEX.test(text);
}

/**
 * Unified Safety Analysis Function returning rich metadata
 * Inspects content using preset, dialect coverage, variation handling, and custom lists.
 */
export function checkContentSafety(input: ModerationCheckInput): SafetyCheckResult {
  const { message, name, isAnonymous } = input;
  const settings = input.settings || {};
  const senderName = !isAnonymous && name ? name.trim() : "";

  const isProfanityEnabled =
    settings.enable_content_moderation !== undefined
      ? Boolean(settings.enable_content_moderation)
      : true;

  const enableUrl =
    settings.enable_url_filter !== undefined
      ? Boolean(settings.enable_url_filter)
      : true;

  // If both keyword moderation and URL spam detection are disabled, return clean immediately
  if (!isProfanityEnabled && !enableUrl) {
    return {
      isClean: true,
      severityScore: 0,
      flaggedCategories: [],
      censoredText: message,
      matchedWords: [],
      reason: undefined,
    };
  }

  // Nested profanity sub-features operate when isProfanityEnabled is ON
  const enableBuiltin = isProfanityEnabled && (
    settings.enable_builtin_filter !== undefined ? Boolean(settings.enable_builtin_filter) : true
  );
  const enableCustom = isProfanityEnabled && (
    settings.enable_custom_filter !== undefined
      ? Boolean(settings.enable_custom_filter)
      : true
  );

  const preset = settings.filter_preset || "moderate";
  const threshold =
    typeof settings.filter_severity_threshold === "number" && settings.filter_severity_threshold >= 0
      ? settings.filter_severity_threshold
      : 0.5;
  const detectLeet = settings.filter_detect_leetspeak !== false;
  const detectSplit = settings.filter_detect_split !== false;
  const detectDialects = settings.filter_detect_dialects !== false;
  const censorMode = settings.filter_censor_mode || "first_last";

  const customWords = parseDelimitedWords(settings.banned_words);
  const whitelist = parseDelimitedWords(settings.whitelist_words);
  const activeRegions = detectDialects ? INDONESIAN_REGIONS : (["general"] as Region[]);

  const matchedWordsSet = new Set<string>();
  const flaggedCategoriesSet = new Set<string>();
  let maxSeverityScore = 0;
  let primaryReason: "profanity" | "custom_banned" | "url_spam" | undefined = undefined;

  let builtinTriggered = false;
  let customTriggered = false;
  let urlTriggered = false;

  // 1. Layer 1: Built-in Indonesian Profanity Dictionary
  if (enableBuiltin) {
    try {
      const builtinOpts = getPresetOptions(preset, {
        whitelist,
        detectLeetSpeak: detectLeet,
        detectSplit,
        indonesianVariation: true,
        useLevenshtein: true,
        detectSimilarity: true,
        similarityThreshold: 0.8,
        regions: activeRegions,
        severityThreshold: threshold,
      });

      const analysisMsg = analyze(message, builtinOpts);
      const analysisName = senderName ? analyze(senderName, builtinOpts) : null;

      const validMsgMatches = analysisMsg.matches.filter((m) => !whitelist.includes(m.toLowerCase()));
      if (validMsgMatches.length > 0) {
        validMsgMatches.forEach((m) => matchedWordsSet.add(m));
        analysisMsg.categories.forEach((c) => flaggedCategoriesSet.add(c));
        const score = typeof analysisMsg.severityScore === "number" ? analysisMsg.severityScore : 0.65;
        maxSeverityScore = Math.max(maxSeverityScore, score);
        if (analysisMsg.hasProfanity || maxSeverityScore >= threshold) {
          builtinTriggered = true;
        }
      }

      const validNameMatches = analysisName ? analysisName.matches.filter((m) => !whitelist.includes(m.toLowerCase())) : [];
      if (validNameMatches.length > 0) {
        validNameMatches.forEach((m) => matchedWordsSet.add(m));
        if (analysisName) {
          analysisName.categories.forEach((c) => flaggedCategoriesSet.add(c));
          const score = typeof analysisName.severityScore === "number" ? analysisName.severityScore : 0.65;
          maxSeverityScore = Math.max(maxSeverityScore, score);
          if (analysisName.hasProfanity || maxSeverityScore >= threshold) {
            builtinTriggered = true;
          }
        }
      }

      if (builtinTriggered && !primaryReason) {
        primaryReason = "profanity";
      }
    } catch (err) {
      console.error("Error running builtin safety analysis:", err);
    }
  }

  // 2. Layer 2: Custom Banned Wordlist (Blacklist)
  if (enableCustom && customWords.length > 0) {
    const effectiveCustomWords = customWords.filter((w) => !whitelist.includes(w));
    if (effectiveCustomWords.length > 0) {
      const lowerMessage = message.toLowerCase();
      const lowerName = senderName.toLowerCase();

      for (const word of effectiveCustomWords) {
        if (whitelist.includes(word.toLowerCase())) continue;
        if (lowerMessage.includes(word) || (lowerName && lowerName.includes(word))) {
          customTriggered = true;
          matchedWordsSet.add(word);
          flaggedCategoriesSet.add("custom_banned");
          maxSeverityScore = Math.max(maxSeverityScore, 0.65);
        }
      }

      // Also check evasion variations (e.g. spaced out custom banned words)
      try {
        // Pass clean alphanumeric words to library analyze to prevent library split-regex crash on slashes/dots
        const safeWordsForLibrary = effectiveCustomWords.filter((w) => /^[a-zA-Z0-9\s]+$/.test(w));
        if (safeWordsForLibrary.length > 0) {
          const customOpts = {
            whitelist,
            wordList: safeWordsForLibrary,
            detectLeetSpeak: detectLeet,
            detectSplit,
            indonesianVariation: true,
            useLevenshtein: true,
            detectSimilarity: true,
            similarityThreshold: 0.8,
          };
          const customAnalysisMsg = analyze(message, customOpts);
          const validCustomMatches = customAnalysisMsg.matches.filter((m) => !whitelist.includes(m.toLowerCase()));
          if (customAnalysisMsg.hasProfanity && validCustomMatches.length > 0) {
            customTriggered = true;
            validCustomMatches.forEach((m) => matchedWordsSet.add(m));
            flaggedCategoriesSet.add("custom_banned");
            maxSeverityScore = Math.max(maxSeverityScore, customAnalysisMsg.severityScore || 0.65);
          }
        }
      } catch (err) {
        console.error("Error running custom wordlist analysis:", err);
      }

      if (customTriggered && !primaryReason) {
        primaryReason = "custom_banned";
      }
    }
  }

  // 3. Layer 3: Spam URL & External Link Detection
  if (enableUrl) {
    const msgHasUrl = URL_REGEX.test(message);
    const nameHasUrl = senderName ? URL_REGEX.test(senderName) : false;

    if (msgHasUrl || nameHasUrl) {
      urlTriggered = true;
      matchedWordsSet.add("URL/Link");
      flaggedCategoriesSet.add("url_spam");
      maxSeverityScore = Math.max(maxSeverityScore, 0.85);

      if (!primaryReason) {
        primaryReason = "url_spam";
      }
    }
  }

  const isViolating =
    builtinTriggered ||
    customTriggered ||
    urlTriggered ||
    maxSeverityScore >= threshold;

  const isClean = !isViolating;

  // Generate sanitized preview using censor styling
  let censoredText = message;
  if (censorMode !== "normal" && censorMode !== "none") {
    try {
      const filterOpts = {
        whitelist,
        detectLeetSpeak: detectLeet,
        detectSplit,
        useRandomGrawlix: censorMode === "grawlix",
        keepFirstAndLast: censorMode === "first_last",
        replaceWith: "*",
        fullWordCensor: censorMode === "asterisk",
      };
      if (enableBuiltin) {
        censoredText = filter(censoredText, filterOpts).filtered;
      }
    } catch (err) {
      console.error("Error generating censored text:", err);
    }

    // Censor matched words explicitly
    for (const match of Array.from(matchedWordsSet)) {
      if (match !== "URL/Link" && match.trim()) {
        try {
          const escaped = match.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
          const re = new RegExp(escaped, "gi");
          censoredText = censoredText.replace(re, (m) => {
            if (censorMode === "first_last") {
              return censorWord(m, "*", true);
            } else if (censorMode === "grawlix") {
              return "#@$%&!";
            } else {
              return "*".repeat(m.length);
            }
          });
        } catch {}
      }
    }

    // Censor URLs
    if (enableUrl) {
      censoredText = censoredText.replace(URL_REGEX, "[LINK DIHAPUS]");
    }
  }

  return {
    isClean,
    severityScore: Number(maxSeverityScore.toFixed(2)),
    flaggedCategories: Array.from(flaggedCategoriesSet),
    censoredText,
    matchedWords: Array.from(matchedWordsSet),
    reason: isClean ? undefined : primaryReason,
  };
}

/**
 * Multi-Tier Content Safety Moderation Engine (with backward-compatible ModerationResult)
 */
export function checkContentModeration(input: ModerationCheckInput): ModerationResult {
  const safety = checkContentSafety(input);

  const flaggedLayers: ModerationLayerName[] = [];
  const reasons: string[] = [];

  const hasBuiltin = safety.flaggedCategories.some((c) => c !== "custom_banned" && c !== "url_spam");
  const hasCustom = safety.flaggedCategories.includes("custom_banned");
  const hasUrl = safety.flaggedCategories.includes("url_spam");

  if (hasBuiltin) {
    flaggedLayers.push("Built-in Dictionary");
    reasons.push("Profanity Filter");
  }
  if (hasCustom) {
    flaggedLayers.push("Custom Word");
    reasons.push("Kata Terlarang Kustom");
  }
  if (hasUrl) {
    flaggedLayers.push("URL Spam");
    reasons.push("Spam URL / Tautan");
  }

  // Fallback if severityScore exceeded threshold
  if (flaggedLayers.length === 0 && !safety.isClean) {
    flaggedLayers.push("Built-in Dictionary");
    reasons.push("Tingkat Keparahan Melebihi Ambang Batas");
  }

  return {
    ...safety,
    isFlagged: !safety.isClean,
    flaggedLayers,
    flaggedReason: flaggedLayers.join(", "),
    details: {
      builtin: hasBuiltin,
      custom: hasCustom,
      url: hasUrl,
    },
  };
}

// Backward compatibility helpers
export const checkProfanity = checkCustomWordlist;
export function checkProfanityOrSpam(text: string, bannedWordsStr: string): boolean {
  return checkSpamUrl(text) || checkCustomWordlist(text, bannedWordsStr) || checkBuiltinProfanity(text);
}

/**
 * Dynamic Render-Time Text Masking Helper
 * Transforms flagged text on-the-fly based on active censor styling mode.
 * Preserves authentic text permanently stored in the database.
 */
export function getDisplayMessage(
  rawText: string,
  flagMeta?:
    | {
        is_flagged?: boolean;
        matched_words?: string;
        flagged_categories?: string;
      }
    | boolean
    | string,
  censorMode: "normal" | "first_last" | "grawlix" | "asterisk" | "none" = "first_last"
): string {
  if (!rawText) return "";

  // 1. "normal" or "none" mode: show authentic original text as typed
  if (censorMode === "normal" || censorMode === "none") {
    return rawText;
  }

  // Anonymous default label exemption: never mutate "Anonim"
  if (rawText.trim().toLowerCase() === "anonim") {
    return rawText;
  }

  let isFlagged = false;
  let matchedWordsStr = "";

  if (typeof flagMeta === "boolean") {
    isFlagged = flagMeta;
  } else if (typeof flagMeta === "string") {
    matchedWordsStr = flagMeta;
    isFlagged = Boolean(flagMeta.trim());
  } else if (flagMeta && typeof flagMeta === "object") {
    isFlagged = Boolean(flagMeta.is_flagged);
    matchedWordsStr = flagMeta.matched_words || "";
  }

  // If message has not been flagged and has no matched keywords recorded,
  // check if rawText itself contains profanity to mask
  if (!isFlagged && !matchedWordsStr.trim()) {
    try {
      if (!isProfane(rawText)) {
        return rawText;
      }
    } catch {
      return rawText;
    }
  }

  let result = rawText;

  // Mask individual word based on mode
  const maskWord = (word: string) => {
    if (!word || word.length === 0) return word;
    if (censorMode === "first_last") {
      if (word.length <= 2) return "*".repeat(word.length);
      return word[0] + "*".repeat(word.length - 2) + word[word.length - 1];
    } else if (censorMode === "grawlix") {
      const grawlixChars = ["#", "@", "$", "%", "&", "!"];
      let g = "";
      for (let i = 0; i < word.length; i++) {
        g += grawlixChars[i % grawlixChars.length];
      }
      return g || "#@$%&!";
    } else {
      return "*".repeat(word.length);
    }
  };

  // 1. Run @sideid/id-profanity-filter's built-in filter
  try {
    const filterOpts: any = {
      detectLeetSpeak: true,
      detectSplit: true,
      useRandomGrawlix: censorMode === "grawlix",
      keepFirstAndLast: censorMode === "first_last",
      replaceWith: "*",
      fullWordCensor: censorMode === "asterisk",
    };
    result = filter(result, filterOpts).filtered;
  } catch {}

  // 2. Explicitly mask any matched words (from blacklist or custom list)
  if (matchedWordsStr && matchedWordsStr.trim()) {
    const words = matchedWordsStr
      .split(/[,\n;]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && w !== "URL/Link");

    for (const w of words) {
      try {
        const escaped = w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const re = new RegExp(escaped, "gi");
        result = result.replace(re, (m) => maskWord(m));
      } catch {}
    }
  }

  // 3. Mask URLs if flagged for URL spam
  if (
    matchedWordsStr.includes("URL/Link") ||
    (typeof flagMeta === "object" && flagMeta?.flagged_categories?.includes("url_spam"))
  ) {
    result = result.replace(URL_REGEX, "[LINK DIHAPUS]");
  }

  return result;
}

