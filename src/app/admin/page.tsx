"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Message,
  MessageStatus,
  AdminStats,
  NOTE_COLOR_PRESETS,
  DEFAULT_ARCHIVE_ANNOUNCEMENT,
  ImportMessageItem,
} from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import {
  Lock,
  LogOut,
  ExternalLink,
  Download,
  Search,
  Check,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  Heart,
  User,
  Plus,
  Minus,
  AlertTriangle,
  RefreshCw,
  X,
  FileSpreadsheet,
  FileJson,
  Settings,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  Megaphone,
  Type,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Clock,
  ArrowRight,
  ArrowLeft,
  Zap,
  HelpCircle,
  Pin,
  Star,
  ShieldAlert,
  ShieldOff,
  Upload,
  Palette,
  Sliders,
  SlidersHorizontal,
  Languages,
  ShieldCheck,
  Ban,
  Eye,
  EyeOff,
  FlaskConical,
  Bot,
  Send,
  Radio,
  Archive,
} from "lucide-react";
import { ToastContainer, ToastMessage } from "@/components/Toast";
import {
  getDisplayMessage,
  DEFAULT_BANNED_WORDS_STR,
  checkContentModeration,
  ModerationResult,
} from "@/lib/profanityFilter";

const SORT_LABELS: Record<"likes" | "newest" | "oldest", string> = {
  likes: "Love",
  newest: "Terbaru",
  oldest: "Terlama",
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminToken, setAdminToken] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Top-Level Navigation View: "dashboard" | "settings"
  const [adminView, setAdminView] = useState<"dashboard" | "settings">("dashboard");

  // Restore saved token from sessionStorage or localStorage on initial mount
  useEffect(() => {
    try {
      const savedToken =
        sessionStorage.getItem("showup_admin_token") ||
        localStorage.getItem("showup_admin_token") ||
        "";
      if (savedToken) {
        setAdminToken(savedToken);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Dashboard Data
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalLikes: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [authorFilter, setAuthorFilter] = useState<"all" | "named" | "anonymous">("all");
  const [sortOption, setSortOption] = useState<"likes" | "newest" | "oldest">("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Settings State
  const [autoAccept, setAutoAccept] = useState<boolean>(false);
  const [aboutDescription, setAboutDescription] = useState<string>(
    "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch."
  );
  const [maxCharLimit, setMaxCharLimit] = useState<number>(280);
  const [announcementEnabled, setAnnouncementEnabled] = useState<boolean>(false);
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [archiveAnnouncement, setArchiveAnnouncement] = useState<string>(
    DEFAULT_ARCHIVE_ANNOUNCEMENT
  );
  const [announcementText, setAnnouncementText] = useState<string>(
    "Selamat datang di SorakSora! Bagikan energi positif dan kata-kata penyemangatmu hari ini!"
  );
  // Unified Content Safety Suite Master Toggle
  const [enableContentModeration, setEnableContentModeration] = useState<boolean>(true);
  // Auto-Save Architecture State
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("saved");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Real-Time Incoming Message Animation State
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  const [enableBuiltinFilter, setEnableBuiltinFilter] = useState<boolean>(true);
  const [enableCustomFilter, setEnableCustomFilter] = useState<boolean>(true);
  const [enableUrlFilter, setEnableUrlFilter] = useState<boolean>(true);
  const [profanityFilterEnabled, setProfanityFilterEnabled] = useState<boolean>(true);
  const [spamFilterEnabled, setSpamFilterEnabled] = useState<boolean>(true);
  // Rate Limiting States
  const [rateLimitEnabled, setRateLimitEnabled] = useState<boolean>(false);
  const [rateLimitMaxSubmissions, setRateLimitMaxSubmissions] = useState<number>(3);
  const [rateLimitWindowMinutes, setRateLimitWindowMinutes] = useState<number>(5);

  // Telegram Integration States
  const [telegramBotToken, setTelegramBotToken] = useState<string>("");
  const [telegramChatId, setTelegramChatId] = useState<string>("");
  const [telegramInstantEnabled, setTelegramInstantEnabled] = useState<boolean>(false);
  const [telegramPeriodicEnabled, setTelegramPeriodicEnabled] = useState<boolean>(false);
  const [telegramIntervalMinutes, setTelegramIntervalMinutes] = useState<number>(10);
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);
  const [showBotToken, setShowBotToken] = useState<boolean>(false);
  const [bannedWords, setBannedWords] = useState<string>(DEFAULT_BANNED_WORDS_STR);
  const [newKeywordInput, setNewKeywordInput] = useState<string>("");
  const [isSavingBuiltinFilter, setIsSavingBuiltinFilter] = useState(false);
  const [isSavingCustomFilter, setIsSavingCustomFilter] = useState(false);
  const [isSavingUrlFilter, setIsSavingUrlFilter] = useState(false);
  const [isSavingProfanityFilter, setIsSavingProfanityFilter] = useState(false);
  const [isSavingSpamFilter, setIsSavingSpamFilter] = useState(false);
  const [isWordlistExpanded, setIsWordlistExpanded] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Advanced Profanity Filter & Whitelist States
  const [filterPreset, setFilterPreset] = useState<"strict" | "moderate" | "light" | "childSafe">("moderate");
  const [filterSeverityThreshold, setFilterSeverityThreshold] = useState<number>(0.5);
  const [filterDetectLeetspeak, setFilterDetectLeetspeak] = useState<boolean>(true);
  const [filterDetectSplit, setFilterDetectSplit] = useState<boolean>(true);
  const [filterDetectDialects, setFilterDetectDialects] = useState<boolean>(true);
  const [filterCensorMode, setFilterCensorMode] = useState<"normal" | "first_last" | "grawlix" | "asterisk" | "none">("first_last");
  const [whitelistWords, setWhitelistWords] = useState<string>("");
  const [newWhitelistInput, setNewWhitelistInput] = useState<string>("");
  const [isWhitelistExpanded, setIsWhitelistExpanded] = useState<boolean>(false);
  const [activeSafetySubTab, setActiveSafetySubTab] = useState<"banned" | "whitelist">("banned");
  const [isSavingFilterSettings, setIsSavingFilterSettings] = useState<boolean>(false);
  const [previewCensoredIds, setPreviewCensoredIds] = useState<Record<string, boolean>>({});
  const fileWhitelistInputRef = useRef<HTMLInputElement | null>(null);

  // Interactive Profanity Sandbox States
  const [sandboxInput, setSandboxInput] = useState<string>("");
  const [sandboxResult, setSandboxResult] = useState<ModerationResult | null>(null);
  const [isTestingSandbox, setIsTestingSandbox] = useState<boolean>(false);

  // Inline Love Editor state
  const [editingLoveId, setEditingLoveId] = useState<string | null>(null);
  const [inlineLoveValue, setInlineLoveValue] = useState<number>(0);
  const [isSavingInlineLove, setIsSavingInlineLove] = useState<boolean>(false);

  const [isUpdatingAutoAccept, setIsUpdatingAutoAccept] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isSavingCharLimit, setIsSavingCharLimit] = useState(false);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [isResettingSettings, setIsResettingSettings] = useState(false);

  // JSON Import & Export State
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportMessages, setPendingImportMessages] = useState<ImportMessageItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  // Custom Sort Dropdown State & Click-Outside Handling
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSortOpen]);

  // Edit Modal State
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsAnonymous, setEditIsAnonymous] = useState(false);
  const [editMessageText, setEditMessageText] = useState("");
  const [editLikes, setEditLikes] = useState(0);
  const [editStatus, setEditStatus] = useState<MessageStatus>("pending");
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editColor, setEditColor] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const showToast = useCallback((type: "success" | "error" | "info", message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Filter & Sort messages for moderation queue
  const displayedMessages = useMemo(() => {
    let list = [...messages];

    // Author identity filter
    if (authorFilter === "named") {
      list = list.filter((m) => !m.is_anonymous && m.name.toLowerCase() !== "anonim");
    } else if (authorFilter === "anonymous") {
      list = list.filter((m) => m.is_anonymous || m.name.toLowerCase() === "anonim");
    }

    // Sort order
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
  }, [messages, authorFilter, sortOption]);

  // Dedicated fetch wrapper that always attaches credentials & Authorization header
  const adminFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token =
        adminToken ||
        (typeof window !== "undefined"
          ? sessionStorage.getItem("showup_admin_token") ||
            localStorage.getItem("showup_admin_token")
          : null);

      const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) || {}),
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let res: Response;
      try {
        res = await fetch(url, {
          ...options,
          credentials: "include",
          headers,
        });
      } catch (networkError) {
        console.error("Admin API fetch failed due to network error:", networkError);
        throw networkError;
      }

      if (res.status === 401 || res.status === 403) {
        console.error(`Admin API fetch failed: ${url} returned ${res.status} (Akses ditolak)`);
        try {
          localStorage.removeItem("showup_admin_token");
          sessionStorage.removeItem("showup_admin_token");
        } catch {}
        setAdminToken("");
        setIsAuthenticated(false);
        showToast(
          "error",
          "Sesi admin telah kedaluwarsa atau akses ditolak. Silakan masukkan passcode kembali."
        );
      }

      return res;
    },
    [adminToken]
  );

  // 1. Check Authentication on Mount
  const checkAuth = useCallback(async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? sessionStorage.getItem("showup_admin_token") ||
            localStorage.getItem("showup_admin_token")
          : null;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/admin/auth", {
        credentials: "include",
        headers,
      });

      const data = await res.json();
      if (res.ok && data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("Check auth failed:", err);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 2. Fetch Messages and Stats
  const loadMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await adminFetch(
        `/api/admin/messages?status=${activeTab}&search=${encodeURIComponent(searchQuery)}`
      );
      if (res.status === 401 || res.status === 403) {
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.messages || []);
        if (data.stats) setStats(data.stats);
      } else {
        showToast("error", data.error || "Gagal memuat pesan");
      }
    } catch (err) {
      console.error("loadMessages error:", err);
      showToast("error", "Terjadi kesalahan jaringan saat memuat pesan");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, activeTab, searchQuery, adminFetch]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMessages();
    }
  }, [isAuthenticated, loadMessages]);

  // 2b. Fetch Site Settings
  const loadSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await adminFetch("/api/admin/settings");
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        setAutoAccept(Boolean(data.settings.auto_accept));
        if (data.settings.about_description) {
          setAboutDescription(data.settings.about_description);
        }
        if (typeof data.settings.max_char_limit === "number") {
          setMaxCharLimit(data.settings.max_char_limit);
        }
        setAnnouncementEnabled(Boolean(data.settings.announcement_enabled));
        setIsArchived(Boolean(data.settings.is_archived));
        setArchiveAnnouncement(
          data.settings.archive_announcement || DEFAULT_ARCHIVE_ANNOUNCEMENT
        );
        if (data.settings.announcement_text) {
          setAnnouncementText(data.settings.announcement_text);
        }
        if (data.settings.enable_content_moderation !== undefined) {
          setEnableContentModeration(Boolean(data.settings.enable_content_moderation));
        }
        if (data.settings.enable_builtin_filter !== undefined) {
          setEnableBuiltinFilter(Boolean(data.settings.enable_builtin_filter));
        }
        if (data.settings.enable_custom_filter !== undefined) {
          setEnableCustomFilter(Boolean(data.settings.enable_custom_filter));
          setProfanityFilterEnabled(Boolean(data.settings.enable_custom_filter));
        } else if (data.settings.profanity_filter_enabled !== undefined) {
          setEnableCustomFilter(Boolean(data.settings.profanity_filter_enabled));
          setProfanityFilterEnabled(Boolean(data.settings.profanity_filter_enabled));
        }
        if (data.settings.enable_url_filter !== undefined) {
          setEnableUrlFilter(Boolean(data.settings.enable_url_filter));
          setSpamFilterEnabled(Boolean(data.settings.enable_url_filter));
        } else if (data.settings.spam_filter_enabled !== undefined) {
          setEnableUrlFilter(Boolean(data.settings.spam_filter_enabled));
          setSpamFilterEnabled(Boolean(data.settings.spam_filter_enabled));
        }
        if (data.settings.banned_words !== undefined) {
          setBannedWords(data.settings.banned_words);
        }
        if (data.settings.whitelist_words !== undefined) {
          setWhitelistWords(data.settings.whitelist_words);
        }
        if (data.settings.filter_preset) {
          setFilterPreset(data.settings.filter_preset);
        }
        if (typeof data.settings.filter_severity_threshold === "number") {
          setFilterSeverityThreshold(data.settings.filter_severity_threshold);
        }
        if (data.settings.filter_detect_leetspeak !== undefined) {
          setFilterDetectLeetspeak(Boolean(data.settings.filter_detect_leetspeak));
        }
        if (data.settings.filter_detect_split !== undefined) {
          setFilterDetectSplit(Boolean(data.settings.filter_detect_split));
        }
        if (data.settings.filter_detect_dialects !== undefined) {
          setFilterDetectDialects(Boolean(data.settings.filter_detect_dialects));
        }
        if (data.settings.filter_censor_mode) {
          setFilterCensorMode(data.settings.filter_censor_mode);
        }
        if (data.settings.rate_limit_enabled !== undefined) {
          setRateLimitEnabled(Boolean(data.settings.rate_limit_enabled));
        }
        if (typeof data.settings.rate_limit_max_submissions === "number") {
          setRateLimitMaxSubmissions(data.settings.rate_limit_max_submissions);
        }
        if (typeof data.settings.rate_limit_window_minutes === "number") {
          setRateLimitWindowMinutes(data.settings.rate_limit_window_minutes);
        }
        if (data.settings.telegram_bot_token !== undefined) {
          setTelegramBotToken(data.settings.telegram_bot_token);
        }
        if (data.settings.telegram_chat_id !== undefined) {
          setTelegramChatId(data.settings.telegram_chat_id);
        }
        if (data.settings.telegram_instant_enabled !== undefined) {
          setTelegramInstantEnabled(Boolean(data.settings.telegram_instant_enabled));
        }
        if (data.settings.telegram_periodic_enabled !== undefined) {
          setTelegramPeriodicEnabled(Boolean(data.settings.telegram_periodic_enabled));
        }
        if (typeof data.settings.telegram_interval_minutes === "number") {
          setTelegramIntervalMinutes(data.settings.telegram_interval_minutes);
        }
      }
    } catch (err) {
      console.error("loadSettings error:", err);
    }
  }, [isAuthenticated, adminFetch]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated, loadSettings]);

  // Real-Time SSE EventSource Subscription
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventSource: EventSource | null = null;
    let isCancelled = false;

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/events");

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") return;

            // When new messages or events arrive, synchronize moderation queue and stats
            if (data.type === "message:created" && data.message) {
              const newMsg = data.message;
              setNewlyAddedIds((prev) => new Set(prev).add(newMsg.id));
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [newMsg, ...prev];
              });
              setStats((prev) => ({
                ...prev,
                total: prev.total + 1,
                pending: newMsg.status === "pending" ? prev.pending + 1 : prev.pending,
                approved: newMsg.status === "approved" ? prev.approved + 1 : prev.approved,
                rejected: newMsg.status === "rejected" ? prev.rejected + 1 : prev.rejected,
              }));
              setTimeout(() => {
                setNewlyAddedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(newMsg.id);
                  return next;
                });
              }, 3500);
              loadMessages();
            } else if (
              data.type === "message:loved" ||
              data.type === "message:status_changed" ||
              data.type === "message:updated" ||
              data.type === "message:deleted"
            ) {
              loadMessages();
            } else if (data.type === "settings:updated" && data.settings) {
              setAutoAccept(Boolean(data.settings.auto_accept));
              if (data.settings.about_description) {
                setAboutDescription(data.settings.about_description);
              }
              if (typeof data.settings.max_char_limit === "number") {
                setMaxCharLimit(data.settings.max_char_limit);
              }
              setAnnouncementEnabled(Boolean(data.settings.announcement_enabled));
              setIsArchived(Boolean(data.settings.is_archived));
              setArchiveAnnouncement(
                data.settings.archive_announcement || DEFAULT_ARCHIVE_ANNOUNCEMENT
              );
              if (data.settings.announcement_text) {
                setAnnouncementText(data.settings.announcement_text);
              }
              if (data.settings.enable_content_moderation !== undefined) {
                setEnableContentModeration(Boolean(data.settings.enable_content_moderation));
              }
              if (data.settings.enable_builtin_filter !== undefined) {
                setEnableBuiltinFilter(Boolean(data.settings.enable_builtin_filter));
              }
              if (data.settings.enable_custom_filter !== undefined) {
                setEnableCustomFilter(Boolean(data.settings.enable_custom_filter));
                setProfanityFilterEnabled(Boolean(data.settings.enable_custom_filter));
              } else if (data.settings.profanity_filter_enabled !== undefined) {
                setEnableCustomFilter(Boolean(data.settings.profanity_filter_enabled));
                setProfanityFilterEnabled(Boolean(data.settings.profanity_filter_enabled));
              }
              if (data.settings.enable_url_filter !== undefined) {
                setEnableUrlFilter(Boolean(data.settings.enable_url_filter));
                setSpamFilterEnabled(Boolean(data.settings.enable_url_filter));
              } else if (data.settings.spam_filter_enabled !== undefined) {
                setEnableUrlFilter(Boolean(data.settings.spam_filter_enabled));
                setSpamFilterEnabled(Boolean(data.settings.spam_filter_enabled));
              }
              if (data.settings.banned_words !== undefined) {
                setBannedWords(data.settings.banned_words);
              }
              if (data.settings.whitelist_words !== undefined) {
                setWhitelistWords(data.settings.whitelist_words);
              }
              if (data.settings.filter_preset) {
                setFilterPreset(data.settings.filter_preset);
              }
              if (typeof data.settings.filter_severity_threshold === "number") {
                setFilterSeverityThreshold(data.settings.filter_severity_threshold);
              }
              if (data.settings.filter_detect_leetspeak !== undefined) {
                setFilterDetectLeetspeak(Boolean(data.settings.filter_detect_leetspeak));
              }
              if (data.settings.filter_detect_split !== undefined) {
                setFilterDetectSplit(Boolean(data.settings.filter_detect_split));
              }
              if (data.settings.filter_detect_dialects !== undefined) {
                setFilterDetectDialects(Boolean(data.settings.filter_detect_dialects));
              }
              if (data.settings.filter_censor_mode) {
                setFilterCensorMode(data.settings.filter_censor_mode);
              }
            }
          } catch (err) {
            console.error("SSE admin parse error:", err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isCancelled) {
            setTimeout(connectSSE, 3000);
          }
        };
      } catch (err) {
        console.error("Failed to connect SSE in admin:", err);
      }
    };

    connectSSE();

    return () => {
      isCancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, loadMessages]);

  // 3. Login Action
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput, remember_me: rememberMe }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          setAdminToken(data.token);
          try {
            if (rememberMe) {
              localStorage.setItem("showup_admin_token", data.token);
              sessionStorage.removeItem("showup_admin_token");
            } else {
              sessionStorage.setItem("showup_admin_token", data.token);
              localStorage.removeItem("showup_admin_token");
            }
          } catch {}
        }
        setIsAuthenticated(true);
        setPasswordInput("");
        showToast("success", "Berhasil masuk ke Admin Dashboard");
      } else {
        setLoginError(data.error || "Passcode salah!");
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      setLoginError("Gagal menghubungi server");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. Logout Action
  const handleLogout = async () => {
    try {
      await adminFetch("/api/admin/auth", { method: "DELETE" });
    } catch {}
    try {
      localStorage.removeItem("showup_admin_token");
      sessionStorage.removeItem("showup_admin_token");
    } catch {}
    setAdminToken("");
    setIsAuthenticated(false);
    setMessages([]);
    setSelectedIds([]);
    showToast("success", "Sesi admin berakhir");
  };

  // 5. Individual Status Update
  const handleStatusUpdate = async (id: string, newStatus: MessageStatus) => {
    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();

      if (res.ok && data.success) {
        showToast("success", `Status pesan diubah menjadi: ${newStatus.toUpperCase()}`);
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal mengubah status");
      }
    } catch (err) {
      console.error("handleStatusUpdate error:", err);
      showToast("error", "Terjadi kesalahan saat mengubah status");
    }
  };

  // 5b. Individual Pin/Unpin Toggle
  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    const nextPinned = !currentPinned;
    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_pinned: nextPinned }),
      });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(
          "success",
          nextPinned
            ? "Pesan berhasil disematkan (PIN) di urutan paling atas!"
            : "Sematkan pesan dibatalkan (UNPIN)"
        );
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal mengubah status sematan pesan");
      }
    } catch (err) {
      console.error("handleTogglePin error:", err);
      showToast("error", "Terjadi kesalahan saat menyematkan pesan");
    }
  };

  // 6. Delete Action
  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah kamu yakin ingin menghapus pesan ini secara permanen?")) {
      return;
    }

    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();

      if (res.ok && data.success) {
        showToast("success", "Pesan berhasil dihapus permanen");
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal menghapus pesan");
      }
    } catch (err) {
      console.error("handleDelete error:", err);
      showToast("error", "Terjadi kesalahan saat menghapus");
    }
  };

  // 7. Batch Actions
  const handleBatchAction = async (action: "batch-approve" | "batch-reject" | "batch-delete") => {
    if (selectedIds.length === 0) return;

    if (action === "batch-delete" && !window.confirm(`Hapus ${selectedIds.length} pesan terpilih secara permanen?`)) {
      return;
    }

    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();

      if (res.ok && data.success) {
        showToast("success", `Aksi massal berhasil diterapkan pada ${data.affected} pesan`);
        setSelectedIds([]);
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal menjalankan aksi massal");
      }
    } catch (err) {
      console.error("handleBatchAction error:", err);
      showToast("error", "Terjadi kesalahan aksi massal");
    }
  };

  const handleApproveAllPending = async () => {
    const pendingIds = messages.filter((m) => m.status === "pending").map((m) => m.id);
    if (pendingIds.length === 0) {
      showToast("error", "Tidak ada pesan yang menunggu persetujuan");
      return;
    }

    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch-approve", ids: pendingIds }),
      });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", `Berhasil menyetujui ${data.affected} pesan pending`);
        setSelectedIds([]);
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal menyetujui semua pesan");
      }
    } catch (err) {
      console.error("handleApproveAllPending error:", err);
      showToast("error", "Gagal menyetujui semua pesan");
    }
  };

  // 8. Unflag / Hapus Status Tertahan Action
  const [unflaggingId, setUnflaggingId] = useState<string | null>(null);

  const handleUnflagMessage = async (messageId: string) => {
    setUnflaggingId(messageId);
    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: messageId,
          is_flagged: false,
          flagged_reason: "",
          matched_words: "",
          flagged_categories: "",
          severity_score: 0,
        }),
      });

      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();
      if (res.ok && data.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? data.message : m))
        );
        showToast("success", "Tanda filter berhasil dihapus");
      } else {
        showToast("error", data.error || "Gagal menghapus tanda filter");
      }
    } catch (err) {
      console.error("handleUnflagMessage error:", err);
      showToast("error", "Terjadi kesalahan saat menghapus tanda filter");
    } finally {
      setUnflaggingId(null);
    }
  };

  // 9. Open & Save Edit Modal
  const openEditModal = (msg: Message) => {
    setEditingMessage(msg);
    setEditName(msg.name);
    setEditIsAnonymous(msg.is_anonymous);
    setEditMessageText(msg.message);
    setEditLikes(msg.likes);
    setEditStatus(msg.status);
    setEditIsPinned(Boolean(msg.is_pinned));
    setEditColor(msg.color || NOTE_COLOR_PRESETS[0].hex);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage) return;
    setIsSavingEdit(true);

    const sanitizedEditMessage = typeof editMessageText === "string"
      ? editMessageText.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim()
      : editMessageText;

    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMessage.id,
          name: editName,
          is_anonymous: editIsAnonymous,
          message: sanitizedEditMessage,
          likes: editLikes,
          status: editStatus,
          is_pinned: editIsPinned,
          color: editColor,
        }),
      });
      if (res.status === 401 || res.status === 403) return;

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Perubahan pesan berhasil disimpan ke database!");
        setEditingMessage(null);
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal menyimpan perubahan");
      }
    } catch (err) {
      console.error("handleSaveEdit error:", err);
      showToast("error", "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Persistent Auto-Save Engine
  const saveSettingsDirect = useCallback(
    async (partial: Record<string, any>) => {
      setSaveStatus("saving");
      try {
        const res = await adminFetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
        if (res.status === 401 || res.status === 403) return;
        const data = await res.json();
        if (res.ok && data.success) {
          setSaveStatus("saved");
        } else {
          setSaveStatus("idle");
          showToast("error", data.error || "Gagal menyimpan pengaturan otomatis");
        }
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaveStatus("idle");
      }
    },
    [adminFetch, showToast]
  );

  const debouncedSaveSettings = useCallback(
    (partial: Record<string, any>, delay = 400) => {
      setSaveStatus("saving");
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        saveSettingsDirect(partial);
      }, delay);
    },
    [saveSettingsDirect]
  );

  // Master Content Moderation Toggle Action
  const handleToggleMasterModeration = () => {
    const nextVal = !enableContentModeration;
    setEnableContentModeration(nextVal);
    saveSettingsDirect({ enable_content_moderation: nextVal });
    showToast(
      "success",
      nextVal
        ? "Filter kata & moderasi konten diaktifkan!"
        : "Filter kata & moderasi konten dinonaktifkan secara global."
    );
  };

  // 9. Auto-Accept Toggle Action
  const handleToggleAutoAccept = () => {
    const nextVal = !autoAccept;
    setAutoAccept(nextVal);
    saveSettingsDirect({ auto_accept: nextVal });
    showToast(
      "success",
      nextVal
        ? "Auto-Accept Mode diaktifkan! Pesan baru langsung tampil di cheer wall"
        : "Auto-Accept Mode dinonaktifkan. Pesan baru akan ditinjau manual"
    );
  };

  // 10. Reset About Description Action
  const handleResetAboutDescription = () => {
    const defaultText =
      "SorakSora adalah papan sorak Neobrutalist real-time bertema “The Cheer Wall” yang mengantarkan dukungan penonton langsung ke panggung, layar, dan smartwatch.";
    setAboutDescription(defaultText);
    saveSettingsDirect({ about_description: defaultText });
    showToast("success", "Deskripsi dikembalikan ke default dan tersimpan!");
  };

  // 11. Save Max Character Limit
  const handleSaveCharLimit = (customLimit?: number) => {
    const limitToSave = customLimit !== undefined ? customLimit : maxCharLimit;
    if (limitToSave < 20 || limitToSave > 1000) {
      showToast("error", "Batas karakter harus antara 20 dan 1000 karakter");
      return;
    }
    setMaxCharLimit(limitToSave);
    saveSettingsDirect({ max_char_limit: limitToSave });
  };

  // 12. Toggle Announcement Banner
  const handleToggleAnnouncement = () => {
    const nextVal = !announcementEnabled;
    setAnnouncementEnabled(nextVal);
    saveSettingsDirect({ announcement_enabled: nextVal });
    showToast(
      "success",
      nextVal
        ? "Banner pengumuman aktif dan disematkan di cheer wall publik!"
        : "Banner pengumuman dinonaktifkan dari cheer wall."
    );
  };

  // Archive Mode Toggle Action
  const handleToggleArchiveMode = () => {
    const nextVal = !isArchived;
    setIsArchived(nextVal);
    saveSettingsDirect({ is_archived: nextVal });
    showToast(
      "success",
      nextVal
        ? "Mode Arsip diaktifkan. Pengiriman pesan baru ditutup."
        : "Mode Arsip dinonaktifkan. Pengunjung dapat kembali mengirim pesan."
    );
  };

  // 13. Reset All Settings
  const handleResetAllSettings = async () => {
    if (
      !window.confirm(
        "Apakah kamu yakin ingin mengembalikan seluruh pengaturan sistem dan cheer wall ke pengaturan bawaan default?"
      )
    ) {
      return;
    }
    setIsResettingSettings(true);
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        setAutoAccept(Boolean(data.settings.auto_accept));
        setAboutDescription(data.settings.about_description);
        setMaxCharLimit(data.settings.max_char_limit);
        setAnnouncementEnabled(Boolean(data.settings.announcement_enabled));
        setIsArchived(Boolean(data.settings.is_archived));
        setArchiveAnnouncement(
          data.settings.archive_announcement || DEFAULT_ARCHIVE_ANNOUNCEMENT
        );
        setAnnouncementText(data.settings.announcement_text);
        setEnableContentModeration(Boolean(data.settings.enable_content_moderation ?? true));
        setEnableBuiltinFilter(Boolean(data.settings.enable_builtin_filter));
        setEnableCustomFilter(Boolean(data.settings.enable_custom_filter));
        setEnableUrlFilter(Boolean(data.settings.enable_url_filter));
        setBannedWords(data.settings.banned_words || "");
        setWhitelistWords(data.settings.whitelist_words || "");
        if (data.settings.filter_preset) setFilterPreset(data.settings.filter_preset);
        if (typeof data.settings.filter_severity_threshold === "number") {
          setFilterSeverityThreshold(data.settings.filter_severity_threshold);
        }
        if (data.settings.filter_detect_leetspeak !== undefined) {
          setFilterDetectLeetspeak(Boolean(data.settings.filter_detect_leetspeak));
        }
        if (data.settings.filter_detect_split !== undefined) {
          setFilterDetectSplit(Boolean(data.settings.filter_detect_split));
        }
        if (data.settings.filter_detect_dialects !== undefined) {
          setFilterDetectDialects(Boolean(data.settings.filter_detect_dialects));
        }
        if (data.settings.filter_censor_mode) setFilterCensorMode(data.settings.filter_censor_mode);
        setRateLimitEnabled(Boolean(data.settings.rate_limit_enabled ?? false));
        setRateLimitMaxSubmissions(data.settings.rate_limit_max_submissions ?? 3);
        setRateLimitWindowMinutes(data.settings.rate_limit_window_minutes ?? 5);
        showToast("success", "Semua pengaturan berhasil di-reset ke nilai default!");
      } else {
        showToast("error", data.error || "Gagal me-reset pengaturan");
      }
    } catch (err) {
      console.error("handleResetAllSettings error:", err);
      showToast("error", "Terjadi kesalahan saat me-reset pengaturan");
    } finally {
      setIsResettingSettings(false);
    }
  };

  // Rate Limiting Handlers
  const handleToggleRateLimit = () => {
    const nextVal = !rateLimitEnabled;
    setRateLimitEnabled(nextVal);
    saveSettingsDirect({ rate_limit_enabled: nextVal });
    showToast(
      "success",
      nextVal
        ? "Rate Limiting diaktifkan! Pengunjung dibatasi frekuensi kirim pesan."
        : "Rate Limiting dinonaktifkan."
    );
  };

  const handleSaveRateLimitConfig = (maxSubs?: number, winMins?: number) => {
    const finalMax = maxSubs !== undefined ? maxSubs : rateLimitMaxSubmissions;
    const finalWin = winMins !== undefined ? winMins : rateLimitWindowMinutes;
    if (finalMax < 1 || finalMax > 50) {
      showToast("error", "Batas pesan harus antara 1 dan 50 pesan");
      return;
    }
    if (finalWin < 1 || finalWin > 60) {
      showToast("error", "Jendela waktu harus antara 1 dan 60 menit");
      return;
    }
    setRateLimitMaxSubmissions(finalMax);
    setRateLimitWindowMinutes(finalWin);
    saveSettingsDirect({
      rate_limit_max_submissions: finalMax,
      rate_limit_window_minutes: finalWin,
    });
  };

  // Telegram Integration Handlers
  const handleToggleTelegramInstant = () => {
    const nextVal = !telegramInstantEnabled;
    setTelegramInstantEnabled(nextVal);
    saveSettingsDirect({ telegram_instant_enabled: nextVal });
    showToast(
      "success",
      nextVal
        ? "Notifikasi instan Telegram diaktifkan!"
        : "Notifikasi instan Telegram dinonaktifkan."
    );
  };

  const handleToggleTelegramPeriodic = () => {
    const nextVal = !telegramPeriodicEnabled;
    setTelegramPeriodicEnabled(nextVal);
    saveSettingsDirect({ telegram_periodic_enabled: nextVal });
    showToast(
      "success",
      nextVal
        ? "Kirim pesan acak berkala ke Telegram diaktifkan!"
        : "Kirim pesan acak berkala dinonaktifkan."
    );
  };

  const handleSaveTelegramInterval = (interval: number) => {
    if (interval < 1 || interval > 1440) {
      showToast("error", "Interval broadcast harus antara 1 dan 1440 menit");
      return;
    }
    setTelegramIntervalMinutes(interval);
    saveSettingsDirect({ telegram_interval_minutes: interval });
    showToast("success", `Interval broadcast diatur ke ${interval} menit`);
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      showToast("error", "Harap isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID sebelum menguji");
      return;
    }

    setIsTestingTelegram(true);
    try {
      const res = await adminFetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: telegramBotToken.trim(),
          chatId: telegramChatId.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", data.message || "Pesan uji coba berhasil dikirim ke Telegram!");
      } else {
        showToast("error", data.error || "Gagal mengirim pesan uji coba ke Telegram");
      }
    } catch (err) {
      console.error("Test telegram error:", err);
      showToast("error", "Terjadi kesalahan saat menguji bot Telegram");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Interactive Profanity Sandbox Handler
  const handleTestSandbox = useCallback(() => {
    if (!sandboxInput.trim()) return;

    setIsTestingSandbox(true);
    try {
      const customList = bannedWords
        .split(/[\n,;]+/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
      const whiteList = whitelistWords
        .split(/[\n,;]+/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);

      const result = checkContentModeration({
        message: sandboxInput,
        settings: {
          enable_content_moderation: enableContentModeration,
          enable_builtin_filter: enableBuiltinFilter,
          enable_custom_filter: enableCustomFilter,
          enable_url_filter: enableUrlFilter,
          banned_words: bannedWords,
          whitelist_words: whitelistWords,
          filter_preset: filterPreset,
          filter_severity_threshold: filterSeverityThreshold,
          filter_detect_leetspeak: filterDetectLeetspeak,
          filter_detect_split: filterDetectSplit,
          filter_detect_dialects: filterDetectDialects,
          filter_censor_mode: filterCensorMode,
        },
      });
      setSandboxResult(result);
    } catch (err) {
      console.error("Sandbox test error:", err);
    } finally {
      setIsTestingSandbox(false);
    }
  }, [
    sandboxInput,
    enableContentModeration,
    bannedWords,
    whitelistWords,
    enableBuiltinFilter,
    enableCustomFilter,
    enableUrlFilter,
    filterPreset,
    filterSeverityThreshold,
    filterDetectLeetspeak,
    filterDetectSplit,
    filterDetectDialects,
    filterCensorMode,
  ]);

  // 14. Content Safety Filter Handlers (Auto-Saved)
  const handleToggleBuiltinFilter = () => {
    const nextVal = !enableBuiltinFilter;
    setEnableBuiltinFilter(nextVal);
    saveSettingsDirect({ enable_builtin_filter: nextVal });
  };

  const handleToggleCustomFilter = () => {
    const nextVal = !enableCustomFilter;
    setEnableCustomFilter(nextVal);
    setProfanityFilterEnabled(nextVal);
    saveSettingsDirect({ enable_custom_filter: nextVal, profanity_filter_enabled: nextVal });
  };

  const handleToggleProfanityFilter = handleToggleCustomFilter;

  const handleToggleUrlFilter = () => {
    const nextVal = !enableUrlFilter;
    setEnableUrlFilter(nextVal);
    setSpamFilterEnabled(nextVal);
    saveSettingsDirect({ enable_url_filter: nextVal, spam_filter_enabled: nextVal });
    showToast(
      "success",
      nextVal
        ? "Deteksi spam URL & domain eksternal diaktifkan!"
        : "Deteksi spam URL & domain eksternal dinonaktifkan."
    );
  };

  const handleToggleSpamFilter = handleToggleUrlFilter;

  const handleSaveBannedWords = (updatedWords?: string) => {
    const wordsToSave = updatedWords !== undefined ? updatedWords : bannedWords;
    saveSettingsDirect({ banned_words: wordsToSave });
  };

  const handleAddKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (!trimmed) return;

    const currentList = bannedWords
      .split(/[,\n;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (currentList.includes(trimmed)) {
      showToast("info", `Kata "${trimmed}" sudah ada di dalam daftar.`);
      setNewKeywordInput("");
      return;
    }

    const updated = [...currentList, trimmed].join(", ");
    setBannedWords(updated);
    setNewKeywordInput("");
    handleSaveBannedWords(updated);
  };

  const handleRemoveKeyword = (wordToRemove: string) => {
    const currentList = bannedWords
      .split(/[,\n;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0 && w !== wordToRemove.toLowerCase());

    const updated = currentList.join(", ");
    setBannedWords(updated);
    handleSaveBannedWords(updated);
  };

  const handleResetBannedWordsDefault = () => {
    setBannedWords(DEFAULT_BANNED_WORDS_STR);
    handleSaveBannedWords(DEFAULT_BANNED_WORDS_STR);
    showToast("success", "Blacklist kata berhasil di-reset ke 28 kata bawaan!");
  };

  const handleExportBannedWords = () => {
    const words = bannedWords
      .split(/[,\n;]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      showToast("info", "Tidak ada kata terlarang untuk diekspor.");
      return;
    }

    const content = words.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kata-terlarang-soraksora.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", `Daftar ${words.length} kata terlarang berhasil diekspor (.txt)!`);
  };

  const handleImportBannedWords = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          showToast("error", "File .txt kosong atau tidak valid.");
          return;
        }

        // Automatically parse words separated by commas (,), newlines (\n), or semicolons (;)
        const importedWords = text
          .split(/[,\n;]/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 0);

        if (importedWords.length === 0) {
          showToast("error", "Tidak ada kata yang ditemukan di dalam file .txt");
          return;
        }

        const currentList = bannedWords
          .split(/[,\n;]/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 0);

        // Trim whitespaces, filter out duplicates and empty entries, and merge with existing banned wordlist
        const combinedSet = new Set([...currentList, ...importedWords]);
        const mergedList = Array.from(combinedSet);
        const addedCount = mergedList.length - currentList.length;

        const updated = mergedList.join(", ");
        setBannedWords(updated);
        handleSaveBannedWords(updated);

        if (addedCount > 0) {
          showToast(
            "success",
            `Berhasil mengimpor! ${addedCount} kata baru ditambahkan (${mergedList.length} total kata).`
          );
        } else {
          showToast(
            "info",
            `Semua kata dalam file sudah ada di daftar (${mergedList.length} total kata).`
          );
        }
      } catch (err) {
        console.error("Import error:", err);
        showToast("error", "Gagal membaca file .txt");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const allBannedWords = useMemo(() => {
    return bannedWords
      .split(/[,\n;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
  }, [bannedWords]);

  const displayedBannedWords = useMemo(() => {
    return isWordlistExpanded ? allBannedWords : allBannedWords.slice(0, 25);
  }, [allBannedWords, isWordlistExpanded]);

  // Whitelist management
  const allWhitelistWords = useMemo(() => {
    return whitelistWords
      .split(/[,\n;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
  }, [whitelistWords]);

  const displayedWhitelistWords = useMemo(() => {
    return isWhitelistExpanded ? allWhitelistWords : allWhitelistWords.slice(0, 25);
  }, [allWhitelistWords, isWhitelistExpanded]);

  const handleSaveWhitelistWords = (updatedWords?: string) => {
    const wordsToSave = updatedWords !== undefined ? updatedWords : whitelistWords;
    saveSettingsDirect({ whitelist_words: wordsToSave });
  };

  const handleAddWhitelistWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newWhitelistInput.trim().toLowerCase();
    if (!trimmed) return;

    const currentList = whitelistWords
      .split(/[,\n;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (currentList.includes(trimmed)) {
      showToast("info", `Kata "${trimmed}" sudah ada di daftar whitelist.`);
      setNewWhitelistInput("");
      return;
    }

    const updated = [...currentList, trimmed].join(", ");
    setWhitelistWords(updated);
    setNewWhitelistInput("");
    handleSaveWhitelistWords(updated);
  };

  const handleRemoveWhitelistWord = (wordToRemove: string) => {
    const currentList = whitelistWords
      .split(/[,\n;]/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0 && w !== wordToRemove.toLowerCase());

    const updated = currentList.join(", ");
    setWhitelistWords(updated);
    handleSaveWhitelistWords(updated);
  };

  const handleExportWhitelistWords = () => {
    const words = whitelistWords
      .split(/[,\n;]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      showToast("info", "Tidak ada kata whitelist untuk diekspor.");
      return;
    }

    const content = words.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "whitelist-soraksora.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", `Daftar ${words.length} kata whitelist berhasil diekspor (.txt)!`);
  };

  const handleImportWhitelistWords = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || !text.trim()) {
          showToast("error", "File .txt kosong atau tidak valid.");
          return;
        }

        const importedWords = text
          .split(/[,\n;]/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 0);

        if (importedWords.length === 0) {
          showToast("error", "Tidak ada kata yang ditemukan di dalam file .txt");
          return;
        }

        const currentList = whitelistWords
          .split(/[,\n;]/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 0);

        const combinedSet = new Set([...currentList, ...importedWords]);
        const mergedList = Array.from(combinedSet);
        const addedCount = mergedList.length - currentList.length;

        const updated = mergedList.join(", ");
        setWhitelistWords(updated);
        handleSaveWhitelistWords(updated);

        if (addedCount > 0) {
          showToast(
            "success",
            `Berhasil mengimpor! ${addedCount} kata baru ditambahkan ke whitelist (${mergedList.length} total kata).`
          );
        } else {
          showToast(
            "info",
            `Semua kata dalam file sudah ada di whitelist (${mergedList.length} total kata).`
          );
        }
      } catch (err) {
        console.error("Import whitelist error:", err);
        showToast("error", "Gagal membaca file .txt");
      } finally {
        if (fileWhitelistInputRef.current) {
          fileWhitelistInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveFilterConfig = async (overrides: {
    filter_preset?: "strict" | "moderate" | "light" | "childSafe";
    filter_severity_threshold?: number;
    filter_detect_leetspeak?: boolean;
    filter_detect_split?: boolean;
    filter_detect_dialects?: boolean;
    filter_censor_mode?: "normal" | "first_last" | "grawlix" | "asterisk" | "none";
  } = {}) => {
    const payload = {
      filter_preset: overrides.filter_preset ?? filterPreset,
      filter_severity_threshold: overrides.filter_severity_threshold ?? filterSeverityThreshold,
      filter_detect_leetspeak: overrides.filter_detect_leetspeak ?? filterDetectLeetspeak,
      filter_detect_split: overrides.filter_detect_split ?? filterDetectSplit,
      filter_detect_dialects: overrides.filter_detect_dialects ?? filterDetectDialects,
      filter_censor_mode: overrides.filter_censor_mode ?? filterCensorMode,
      enable_content_moderation: enableContentModeration,
    };
    await saveSettingsDirect(payload);
  };

  // 15. Inline Love Editor Handler
  const handleSaveInlineLove = async (id: string) => {
    setIsSavingInlineLove(true);
    try {
      const res = await adminFetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, likes: inlineLoveValue }),
      });
      if (res.status === 401 || res.status === 403) return;
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Jumlah Love berhasil diperbarui!");
        setEditingLoveId(null);
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal memperbarui Love");
      }
    } catch (err) {
      console.error("handleSaveInlineLove error:", err);
      showToast("error", "Terjadi kesalahan saat memperbarui Love");
    } finally {
      setIsSavingInlineLove(false);
    }
  };

  // Export URL helper with token query param fallback
  const getExportUrl = (format: "json" | "csv") => {
    const token =
      adminToken ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("showup_admin_token") ||
          localStorage.getItem("showup_admin_token") ||
          ""
        : "");
    return `/api/admin/export?format=${format}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
  };

  // JSON Import handlers
  const handleJsonFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const rawList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.messages)
          ? parsed.messages
          : null;

        if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
          throw new Error("Format file JSON tidak valid atau struktur data tidak sesuai");
        }

        const validated: ImportMessageItem[] = [];
        for (const item of rawList) {
          if (!item || typeof item !== "object") {
            throw new Error("Format file JSON tidak valid atau struktur data tidak sesuai");
          }
          const message = typeof item.message === "string" ? item.message.trim() : "";
          const author = typeof item.author === "string"
            ? item.author.trim()
            : typeof item.name === "string"
            ? item.name.trim()
            : "";

          if (!message || !author) {
            throw new Error("Format file JSON tidak valid atau struktur data tidak sesuai");
          }

          validated.push({
            unique_id: typeof item.unique_id === "string" ? item.unique_id.trim() : undefined,
            message,
            author,
            is_anonymous: Boolean(item.is_anonymous),
            color: typeof item.color === "string" ? item.color.trim() : "",
            likes_count:
              typeof item.likes_count === "number"
                ? item.likes_count
                : typeof item.likes === "number"
                ? item.likes
                : 0,
            status:
              typeof item.status === "string" && ["approved", "pending", "rejected"].includes(item.status.trim())
                ? item.status.trim()
                : "approved",
            created_at: typeof item.created_at === "string" ? item.created_at.trim() : undefined,
          });
        }

        setPendingImportMessages(validated);
        setIsImportConfirmOpen(true);
      } catch (err) {
        window.alert("Format file JSON tidak valid atau struktur data tidak sesuai");
        showToast("error", "Format file JSON tidak valid atau struktur data tidak sesuai");
      } finally {
        if (jsonFileInputRef.current) {
          jsonFileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      window.alert("Format file JSON tidak valid atau struktur data tidak sesuai");
      showToast("error", "Format file JSON tidak valid atau struktur data tidak sesuai");
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (pendingImportMessages.length === 0) return;
    setIsImporting(true);
    try {
      const res = await adminFetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: pendingImportMessages }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", data.message || `Berhasil mengimpor ${data.count} pesan dan memperbarui dinding`);
        setIsImportConfirmOpen(false);
        setPendingImportMessages([]);
        loadMessages();
      } else {
        showToast("error", data.error || "Gagal mengimpor data JSON");
      }
    } catch (err) {
      console.error("Execute import error:", err);
      showToast("error", "Terjadi kesalahan saat mengimpor data");
    } finally {
      setIsImporting(false);
    }
  };


  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === displayedMessages.length && displayedMessages.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedMessages.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper status badge styles
  const getStatusBadge = (status: MessageStatus) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#BBF7D0] text-[#14532D] border-2 border-[#1A1A1A] text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[1px_1px_0px_#1A1A1A]">
          <Check className="w-3 h-3 stroke-[3]" />
          <span>Disetujui (Live)</span>
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FECDD3] text-[#9F1239] border-2 border-[#1A1A1A] text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[1px_1px_0px_#1A1A1A]">
          <X className="w-3 h-3 stroke-[3]" />
          <span>Ditolak</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF08A] text-[#854D0E] border-2 border-[#1A1A1A] text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-[1px_1px_0px_#1A1A1A] animate-pulse">
        <Clock className="w-3 h-3 stroke-[2.5]" />
        <span>Menunggu Review</span>
      </span>
    );
  };

  // =========================================================================
  // RENDER: LOADING STATE
  // =========================================================================
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex items-center gap-3 font-black text-sm">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Memeriksa autentikasi admin...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: LOGIN FORM (IF NOT AUTHENTICATED)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-corkboard-pattern flex flex-col items-center justify-center p-4">
        {/* Top Banner / Toast Component Synchronized with Main Board */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />

        <div
          className="w-full max-w-md bg-white border-[3px] border-[#1A1A1A] relative"
          style={{ boxShadow: "8px 8px 0px #1A1A1A" }}
        >
          {/* Top Yellow Header */}
          <div className="bg-[#FFF066] border-b-[3px] border-[#1A1A1A] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#1A1A1A] text-white flex items-center justify-center font-black text-xs">
                SS
              </div>
              <span className="font-black text-sm uppercase tracking-wider text-[#1A1A1A]">
                SorakSora! Admin
              </span>
            </div>
            <div className="w-7 h-7 bg-white border-2 border-[#1A1A1A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#1A1A1A]">
              <Lock className="w-3.5 h-3.5 text-[#1A1A1A]" />
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight uppercase mb-1">
              Moderasi Cheer Wall
            </h1>
            <p className="text-xs font-bold text-neutral-500 mb-6">
              Masukkan passcode rahasia untuk mengakses dashboard admin.
            </p>

            {loginError && (
              <div className="mb-5 p-3 bg-[#FEE2E2] border-2 border-[#EF4444] text-[#991B1B] text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  PASSCODE ADMIN
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan passcode..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 border-[2.5px] border-[#1A1A1A] text-base sm:text-sm font-bold shadow-[2.5px_2.5px_0px_#1A1A1A] focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-all bg-[#FAF9F5]"
                />
              </div>

              {/* Remember Me Checkbox */}
              <div className="pt-0.5">
                <label
                  htmlFor="remember-me"
                  className="inline-flex items-center gap-2.5 cursor-pointer select-none group"
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-[#1A1A1A] bg-white peer-checked:bg-[#FEF08A] shadow-[2px_2px_0px_#1A1A1A] peer-focus:shadow-[2.5px_2.5px_0px_#1A1A1A] flex items-center justify-center transition-all group-hover:bg-neutral-50 peer-checked:group-hover:bg-[#FEF08A]">
                      {rememberMe && (
                        <Check className="w-3.5 h-3.5 text-[#1A1A1A] stroke-[3.5]" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                    Ingat Saya
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full nb-btn bg-[#FEF08A] hover:bg-[#FDE047] text-[#1A1A1A] py-3 text-sm font-black uppercase tracking-wide border-2 border-[#1A1A1A] shadow-[3.5px_3.5px_0px_#1A1A1A] flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  "Memverifikasi..."
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#1A1A1A]/20 text-center">
              <Link
                href="/"
                className="text-xs font-bold text-neutral-600 hover:text-[#1A1A1A] hover:underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Kembali ke Cheer Wall Utama</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: FULL ADMIN DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] flex flex-col">
      {/* Top Banner / Toast Component Synchronized with Main Board */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Admin Header Bar */}
      <header className="bg-white border-b-[3px] border-[#1A1A1A] sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FFF066] border-2 border-[#1A1A1A] flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_#1A1A1A]">
              SS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight uppercase">
                  SorakSora! Admin
                </span>
                {isArchived ? (
                  <span
                    id="admin-platform-status-badge"
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-200 text-gray-800 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Archive className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
                    <span>Archive Mode</span>
                  </span>
                ) : autoAccept ? (
                  <span
                    id="admin-platform-status-badge"
                    className="inline-flex items-center px-2 py-0.5 bg-emerald-300 text-black border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <span className="relative flex h-2.5 w-2.5 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-700" />
                    </span>
                    <span>Auto Live (On)</span>
                  </span>
                ) : (
                  <span
                    id="admin-platform-status-badge"
                    className="inline-flex items-center px-2 py-0.5 bg-red-400 text-white border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Ban className="w-3 h-3 stroke-[2.5] mr-1.5 shrink-0" aria-hidden="true" />
                    <span>Auto Live (Off)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* View Live Wall Link */}
            <Link
              href="/"
              target="_blank"
              className="nb-btn px-2.5 sm:px-3 py-1.5 bg-white hover:bg-neutral-100 text-xs font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1.5"
              title="Buka cheer wall publik di tab baru"
            >
              <span>Cheer Wall Live</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="nb-btn px-2.5 sm:px-3 py-1.5 bg-[#FEE2E2] hover:bg-[#FECDD3] text-[#991B1B] text-xs font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1.5"
              title="Keluar dari sesi admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col gap-6">
        {/* Navigation Tabs: Dashboard Moderasi vs Pengaturan Sistem */}
        <div className="flex items-center gap-2.5 border-b-[2.5px] border-[#1A1A1A] pb-3.5">
          <button
            type="button"
            onClick={() => setAdminView("dashboard")}
            className={`nb-btn px-4 sm:px-5 py-2.5 border-2 border-[#1A1A1A] text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              adminView === "dashboard"
                ? "bg-[#FFF066] text-[#1A1A1A] shadow-[3px_3px_0px_#1A1A1A] -translate-y-0.5"
                : "bg-white text-neutral-600 hover:bg-neutral-50 shadow-[2px_2px_0px_#1A1A1A]"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
            <span>Dashboard</span>
            {stats.pending > 0 && (
              <span className="w-5 h-5 bg-[#EA580C] text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-[1px_1px_0px_#1A1A1A]">
                {stats.pending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAdminView("settings")}
            className={`nb-btn px-4 sm:px-5 py-2.5 border-2 border-[#1A1A1A] text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              adminView === "settings"
                ? "bg-[#FFF066] text-[#1A1A1A] shadow-[3px_3px_0px_#1A1A1A] -translate-y-0.5"
                : "bg-white text-neutral-600 hover:bg-neutral-50 shadow-[2px_2px_0px_#1A1A1A]"
            }`}
          >
            <Settings className="w-4 h-4 stroke-[2.5]" />
            <span>Pengaturan</span>
          </button>
        </div>

        {adminView === "dashboard" ? (
          <>
            {/* 1. Metrics & Overview Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
          {/* Total Messages */}
          <div
            className="p-4 sm:p-5 bg-[#FEF9C3] border-[2.5px] border-[#1A1A1A] relative"
            style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-neutral-600 mb-1">
              Total Pesan
            </p>
            <p className="text-2xl sm:text-4xl font-black text-[#1A1A1A] tabular-nums">
              {stats.total}
            </p>
            <p className="text-[10px] font-bold text-neutral-600 mt-1">
              Seluruh submission
            </p>
          </div>

          {/* Pending Moderation */}
          <div
            className="p-4 sm:p-5 bg-[#FED7AA] border-[2.5px] border-[#1A1A1A] relative"
            style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
          >
            {stats.pending > 0 && (
              <span className="absolute top-3 right-3 w-3 h-3 bg-[#EA580C] rounded-full animate-ping" />
            )}
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-900 mb-1">
              Menunggu Review
            </p>
            <p className="text-2xl sm:text-4xl font-black text-[#9A3412] tabular-nums">
              {stats.pending}
            </p>
            <p className="text-[10px] font-bold text-amber-800 mt-1">
              Butuh persetujuan
            </p>
          </div>

          {/* Approved */}
          <div
            className="p-4 sm:p-5 bg-[#BBF7D0] border-[2.5px] border-[#1A1A1A] relative"
            style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900 mb-1">
              Disetujui (Live)
            </p>
            <p className="text-2xl sm:text-4xl font-black text-[#14532D] tabular-nums">
              {stats.approved}
            </p>
            <p className="text-[10px] font-bold text-emerald-800 mt-1">
              Tampil di cheer wall publik
            </p>
          </div>

          {/* Total Love */}
          <div
            className="p-4 sm:p-5 bg-[#FBCFE8] border-[2.5px] border-[#1A1A1A] relative"
            style={{ boxShadow: "4px 4px 0px #1A1A1A" }}
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-pink-900 mb-1">
              Total Love
            </p>
            <p className="text-2xl sm:text-4xl font-black text-[#9D174D] tabular-nums flex items-center gap-1.5">
              <span>{stats.totalLikes}</span>
              <Heart className="w-5 h-5 fill-[#EF4444] text-[#EF4444]" />
            </p>
            <p className="text-[10px] font-bold text-pink-800 mt-1">
              Reaksi akumulatif
            </p>
          </div>
        </section>

        {/* 2. Moderation Queue Controls & Tabs */}
        <section className="bg-white border-[2.5px] border-[#1A1A1A] p-4 sm:p-5 shadow-[4px_4px_0px_#1A1A1A] space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === "pending"
                    ? "bg-[#FFF066] text-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] -translate-y-0.5"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span>Menunggu Review</span>
                <span className="w-5 h-5 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center text-[10px]">
                  {stats.pending}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("approved")}
                className={`px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === "approved"
                    ? "bg-[#BBF7D0] text-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] -translate-y-0.5"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span>Disetujui</span>
                <span className="w-5 h-5 bg-[#14532D] text-white rounded-full flex items-center justify-center text-[10px]">
                  {stats.approved}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("rejected")}
                className={`px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === "rejected"
                    ? "bg-[#FECDD3] text-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] -translate-y-0.5"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span>Ditolak</span>
                <span className="w-5 h-5 bg-[#9F1239] text-white rounded-full flex items-center justify-center text-[10px]">
                  {stats.rejected}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === "all"
                    ? "bg-[#1A1A1A] text-white shadow-[2px_2px_0px_#1A1A1A] -translate-y-0.5"
                    : "bg-white text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span>Semua Pesan</span>
                <span className="w-5 h-5 bg-neutral-200 text-[#1A1A1A] rounded-full flex items-center justify-center text-[10px] font-bold">
                  {stats.total}
                </span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pesan atau nama..."
                className="w-full pl-9 pr-3.5 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none focus:shadow-[3.5px_3.5px_0px_#1A1A1A] bg-[#FAF9F5]"
              />
            </div>
          </div>

          {/* Unified Filter Pills & Sort Dropdown */}
          <div className="pt-3 border-t border-[#1A1A1A]/15 flex flex-wrap items-center justify-between gap-3">
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

              {/* Sort Control (Option A: Custom Neobrutalist Button + Popover Dropdown) */}
              <div ref={sortRef} className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setIsSortOpen((prev) => !prev)}
                  className="inline-flex items-center justify-between gap-2 px-3 py-1.5 h-8 bg-[#FFFFFF] border-2 border-[#000000] text-xs font-bold text-[#000000] rounded-none shadow-[2px_2px_0px_#000000] hover:bg-neutral-100 active:translate-x-0.5 active:translate-y-0.5 transition-all select-none box-border"
                  aria-expanded={isSortOpen}
                  aria-haspopup="true"
                >
                  <span>{SORT_LABELS[sortOption]}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 stroke-[2.5] text-[#000000] transition-transform duration-150 ${
                      isSortOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSortOpen && (
                  <div className="absolute left-0 mt-1.5 w-32 bg-[#FFFFFF] border-2 border-[#000000] shadow-[2px_2px_0px_#000000] z-50 py-1 animate-fadeIn">
                    {(["likes", "newest", "oldest"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSortOption(opt);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center justify-between transition-colors ${
                          sortOption === opt
                            ? "bg-[#FEF08A] text-[#000000]"
                            : "text-[#000000] hover:bg-neutral-100"
                        }`}
                      >
                        <span>{SORT_LABELS[opt]}</span>
                        {sortOption === opt && (
                          <Check className="w-3.5 h-3.5 stroke-[2.5] text-[#000000]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs font-bold text-neutral-500">
              Menampilkan {displayedMessages.length} dari {messages.length} pesan
            </div>
          </div>

          {/* Batch Actions Bar */}
          <div className="pt-3 border-t border-[#1A1A1A]/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 font-black cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === displayedMessages.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#1A1A1A] border-2 border-[#1A1A1A] cursor-pointer"
                />
                <span>Pilih Semua ({selectedIds.length} dipilih)</span>
              </label>

              {activeTab === "pending" && stats.pending > 0 && (
                <button
                  onClick={handleApproveAllPending}
                  className="nb-btn px-2.5 py-1 bg-[#BBF7D0] hover:bg-[#86EFAC] text-[#14532D] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Setujui Semua Pending ({stats.pending})</span>
                </button>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBatchAction("batch-approve")}
                  className="nb-btn px-2.5 py-1 bg-[#BBF7D0] hover:bg-[#86EFAC] text-[#14532D] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A]"
                >
                  Setujui Terpilih ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBatchAction("batch-reject")}
                  className="nb-btn px-2.5 py-1 bg-[#FED7AA] hover:bg-[#FDBA74] text-[#9A3412] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A]"
                >
                  Tolak Terpilih ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBatchAction("batch-delete")}
                  className="nb-btn px-2.5 py-1 bg-[#FEE2E2] hover:bg-[#FECDD3] text-[#991B1B] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A]"
                >
                  Hapus Terpilih ({selectedIds.length})
                </button>
              </div>
            )}
          </div>
        </section>

        {/* 3. Messages List */}
        <section className="space-y-3.5">
          {isLoading ? (
            <div className="bg-white border-2 border-[#1A1A1A] p-12 text-center text-xs font-bold text-neutral-500 shadow-[3px_3px_0px_#1A1A1A]">
              Memuat pesan...
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white border-2 border-[#1A1A1A] p-16 text-center shadow-[4px_4px_0px_#1A1A1A]">
              <p className="text-base font-black text-[#1A1A1A] uppercase tracking-wide mb-1">
                Tidak ada pesan pada antrean ini
              </p>
              <p className="text-xs font-medium text-neutral-500">
                Pilih tab lain atau gunakan kata kunci pencarian yang berbeda.
              </p>
            </div>
          ) : displayedMessages.length === 0 ? (
            <div className="bg-white border-2 border-[#1A1A1A] p-16 text-center shadow-[4px_4px_0px_#1A1A1A]">
              <p className="text-base font-black text-[#1A1A1A] uppercase tracking-wide mb-1">
                Tidak ada pesan yang cocok
              </p>
              <p className="text-xs font-medium text-neutral-500">
                Ubah filter identitas atau pengurutan untuk melihat pesan.
              </p>
            </div>
          ) : (
            displayedMessages.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isNew = newlyAddedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  data-testid="message-card"
                  data-message-id={item.id}
                  className={`bg-white border-[2.5px] border-[#1A1A1A] p-4 sm:p-5 transition-all ${
                    isNew
                      ? "animate-in fade-in slide-in-from-top-3 duration-500 ring-2 ring-emerald-500 shadow-[5px_5px_0px_#10B981] bg-[#ECFDF5]"
                      : isSelected
                      ? "ring-2 ring-[#1A1A1A] shadow-[5px_5px_0px_#1A1A1A] bg-[#FEFCE8]"
                      : "shadow-[3.5px_3.5px_0px_#1A1A1A]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3 pb-3 border-b border-[#1A1A1A]/10">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(item.id)}
                        className="w-4 h-4 accent-[#1A1A1A] border-2 border-[#1A1A1A] cursor-pointer"
                      />

                      {/* Status Badge */}
                      {getStatusBadge(item.status)}

                      {/* Flagged by Moderation Filter Badge & Severity Score */}
                      {item.is_flagged && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF3C7] border-2 border-[#1A1A1A] text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-800 shadow-[1px_1px_0px_#1A1A1A]"
                            title={`Tertahan oleh: ${item.flagged_reason || "Filter Keamanan Konten"}${item.matched_words ? ` | Kata terdeteksi: ${item.matched_words}` : ""}${item.flagged_categories ? ` | Kategori: ${item.flagged_categories}` : ""}`}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 stroke-[2.5] shrink-0" />
                            <span>Tertahan Filter</span>
                          </span>

                          <span
                            className="border border-black bg-amber-200 px-2 py-0.5 text-xs font-bold shadow-[1px_1px_0px_#000]"
                            title={`Skor Keparahan Moderasi: ${((item.severity_score || 0) * 100).toFixed(0)}% (Skor: ${Number((item.severity_score || 0).toFixed(2))})`}
                          >
                            Skor: {Number((item.severity_score || 0).toFixed(2))}
                          </span>
                        </div>
                      )}

                      {/* Pinned Indicator Badge */}
                      {item.is_pinned && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF08A] border-2 border-[#1A1A1A] text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A]"
                          title="Pesan Disematkan di Posisi Teratas"
                        >
                          <Star className="w-3.5 h-3.5 fill-current text-yellow-500 stroke-[#1A1A1A] stroke-[1.5] shrink-0" />
                          <span>Disematkan</span>
                        </span>
                      )}

                      {/* Author */}
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#1A1A1A]">
                        <User className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        <span>
                          {item.is_anonymous
                            ? "Anonim"
                            : previewCensoredIds[item.id]
                            ? getDisplayMessage(item.name || "Anonim", item, filterCensorMode)
                            : item.name}
                        </span>
                        {item.is_anonymous && (
                          <span className="text-[10px] text-neutral-500 font-semibold">
                            (Identitas Anonim)
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[11px] font-bold text-neutral-500">
                        • {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    {/* Inline Love Counter / Editor */}
                    {editingLoveId === item.id ? (
                      <div className="flex items-center gap-2 self-start">
                        <Heart className="w-4 h-4 fill-current text-rose-500 shrink-0" />
                        <input
                          type="number"
                          min={0}
                          value={inlineLoveValue}
                          onChange={(e) => setInlineLoveValue(Math.max(0, parseInt(e.target.value) || 0))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineLove(item.id);
                            if (e.key === "Escape") setEditingLoveId(null);
                          }}
                          autoFocus
                          className="h-8 w-16 px-2 py-1 text-xs font-black border-2 border-[#1A1A1A] bg-white text-center shadow-[1.5px_1.5px_0px_#1A1A1A] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineLove(item.id)}
                          disabled={isSavingInlineLove}
                          title="Simpan Love"
                          className="h-8 w-8 bg-[#BBF7D0] hover:bg-[#86EFAC] border-2 border-[#1A1A1A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#1A1A1A] text-[#14532D] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLoveId(null)}
                          title="Batal"
                          className="h-8 w-8 bg-white hover:bg-neutral-100 border-2 border-[#1A1A1A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#1A1A1A] text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLoveId(item.id);
                          setInlineLoveValue(item.likes);
                        }}
                        title="Klik untuk ubah jumlah Love"
                        className="flex items-center gap-2 h-8 px-2.5 py-1 bg-[#FAF9F5] hover:bg-[#FFF066] border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] text-xs font-black self-start transition-all cursor-pointer group/love"
                      >
                        <Heart className="w-4 h-4 fill-current text-rose-500 shrink-0 group-hover/love:scale-110 transition-transform" />
                        <span className="tabular-nums font-black text-xs">{item.likes}</span>
                        <Pencil className="w-3 h-3 text-neutral-400 group-hover/love:text-[#1A1A1A] opacity-0 group-hover/love:opacity-100 transition-opacity shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* Collapsible Flag Preview for Quick Moderation Decision */}
                  {(item.is_flagged || item.matched_words || item.flagged_categories) && (
                    <details className="mb-3 group/flag bg-[#FFFBEB] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] text-xs">
                      <summary className="flex items-center justify-between px-3 py-2 cursor-pointer font-black text-[#1A1A1A] hover:bg-amber-100 transition-colors select-none">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AlertTriangle className="w-4 h-4 text-amber-600 stroke-[2.5] shrink-0" />
                          <span>Rincian Filter: {item.flagged_reason || "Terdeteksi Pelanggaran"}</span>
                          {item.matched_words && (
                            <span className="font-mono font-normal text-amber-900 bg-amber-200/90 px-1.5 py-0.5 border border-[#1A1A1A] text-[10px] shadow-[1px_1px_0px_#1A1A1A]">
                              &quot;{item.matched_words}&quot;
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-neutral-600 group-open/flag:rotate-180 transition-transform">
                          ▼
                        </span>
                      </summary>
                      <div className="p-3 pt-2 border-t border-[#1A1A1A]/10 bg-white/80 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-white p-2 border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A]">
                            <span className="block font-black text-neutral-600 uppercase text-[10px]">Kata / Pola Terdeteksi:</span>
                            <span className="font-mono font-bold text-rose-700 break-words">
                              {item.matched_words || "(terdeteksi kemiripan kata / variasi leetspeak)"}
                            </span>
                          </div>
                          <div className="bg-white p-2 border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A]">
                            <span className="block font-black text-neutral-600 uppercase text-[10px]">Kategori / Alasan:</span>
                            <span className="font-bold text-[#1A1A1A] break-words">
                              {item.flagged_categories || item.flagged_reason || "Profanity / Kata Kasar"}
                            </span>
                          </div>
                        </div>

                        {/* Unflag Action Button at the bottom of Rincian Filter */}
                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#1A1A1A]/10 flex-wrap">
                          <span className="text-[10px] text-neutral-500 font-medium">
                            Jika ini kesalahan filter (false positive), Anda dapat menghapus tanda filter tanpa mengubah status pesan.
                          </span>
                          <button
                            type="button"
                            disabled={unflaggingId === item.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnflagMessage(item.id);
                            }}
                            className="nb-btn px-3 py-1.5 text-xs font-bold border-2 border-black bg-white hover:bg-neutral-100 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all text-[#1A1A1A]"
                            title="Hapus tanda filter jika pesan ini bukan pelanggaran"
                          >
                            <ShieldOff className="w-4 h-4 stroke-[2] text-amber-600 shrink-0" />
                            <span>{unflaggingId === item.id ? "Menghapus..." : "Bukan Pelanggaran (Unflag)"}</span>
                          </button>
                        </div>
                      </div>
                    </details>
                  )}

                  {/* Message Content with Authentic Text & Public Masking Preview Toggle */}
                  <div className="mb-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                        {previewCensoredIds[item.id] ? "Simulasi Sensor Publik" : "Teks Asli Otentik"}
                      </span>
                      {(item.is_flagged || item.matched_words) && filterCensorMode !== "normal" && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewCensoredIds((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className={`px-2 py-0.5 text-[10px] font-black border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A] transition-colors flex items-center gap-1 cursor-pointer active:scale-95 ${
                            previewCensoredIds[item.id]
                              ? "bg-[#FFF066] text-[#1A1A1A]"
                              : "bg-white hover:bg-neutral-100 text-neutral-600"
                          }`}
                          title="Klik untuk beralih antara teks asli otentik dan simulasi sensor publik"
                        >
                          {previewCensoredIds[item.id] ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                          <span>
                            {previewCensoredIds[item.id]
                              ? "Kembali ke Teks Asli"
                              : "Pratinjau Sensor Publik"}
                          </span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-[#1A1A1A] leading-relaxed select-text">
                      &ldquo;
                      {previewCensoredIds[item.id]
                        ? getDisplayMessage(item.message, item, filterCensorMode)
                        : item.message}
                      &rdquo;
                    </p>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#1A1A1A]/10 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.status !== "approved" && (
                        <button
                          onClick={() => handleStatusUpdate(item.id, "approved")}
                          className="nb-btn px-3 py-1.5 bg-[#BBF7D0] hover:bg-[#86EFAC] text-[#14532D] font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                      )}

                      {item.status !== "rejected" && (
                        <button
                          onClick={() => handleStatusUpdate(item.id, "rejected")}
                          className="nb-btn px-3 py-1.5 bg-[#FED7AA] hover:bg-[#FDBA74] text-[#9A3412] font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      )}

                      {/* Pin/Unpin Toggle Action (Approved & All Messages tabs or approved status) */}
                      {(activeTab === "approved" || activeTab === "all" || item.status === "approved") && (
                        <button
                          onClick={() => handleTogglePin(item.id, Boolean(item.is_pinned))}
                          title={item.is_pinned ? "Lepas sematan (Unpin)" : "Sematkan ke posisi teratas (Pin)"}
                          className={`nb-btn px-3 py-1.5 font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1.5 transition-all ${
                            item.is_pinned
                              ? "bg-[#FFF066] hover:bg-[#FDE047] text-[#1A1A1A]"
                              : "bg-[#FAF9F5] hover:bg-neutral-100 text-[#1A1A1A]"
                          }`}
                        >
                          <Pin
                            className={`w-4 h-4 stroke-[2.5] ${
                              item.is_pinned ? "fill-[#1A1A1A] text-[#1A1A1A]" : "text-[#1A1A1A]"
                            }`}
                          />
                          <span>{item.is_pinned ? "Unpin" : "Pin"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(item)}
                        className="nb-btn px-3 py-1.5 bg-[#FAF9F5] hover:bg-neutral-100 text-[#1A1A1A] font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="nb-btn px-3 py-1.5 bg-[#FEE2E2] hover:bg-[#FECDD3] text-[#991B1B] font-bold border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </>
    ) : (
      /* ===============================================================
       * TAB 2: DEDICATED SETTINGS VIEW
       * =============================================================== */
      <div className="space-y-6 animate-fadeIn">
        {/* Settings Header Box */}
        <div className="bg-white border-2 border-[#1A1A1A] p-4 sm:p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-[#FFF066] border-2 border-[#1A1A1A] flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_#1A1A1A] shrink-0 aspect-square">
              <Settings className="w-5 h-5 stroke-[2] shrink-0" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#1A1A1A] truncate">
                Pengaturan Sistem &amp; Konfigurasi Cheer Wall
              </h2>
              <p className="text-xs font-bold text-neutral-500">
                Kelola mode penerimaan pesan, batas karakter, pengumuman publik, dan filter moderasi konten
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Auto-Save Status Badge Indicator */}
            {saveStatus === "saving" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-100 border-2 border-[#1A1A1A] text-xs font-black uppercase text-amber-900 shadow-[1.5px_1.5px_0px_#1A1A1A]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-100 border-2 border-[#1A1A1A] text-xs font-black uppercase text-emerald-900 shadow-[1.5px_1.5px_0px_#1A1A1A]">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span>Tersimpan Otomatis</span>
              </span>
            )}

            <button
              type="button"
              disabled={isResettingSettings}
              onClick={handleResetAllSettings}
              title="Kembalikan semua pengaturan sistem ke konfigurasi standar"
              className="nb-btn px-3.5 py-2 bg-[#FEE2E2] hover:bg-[#FECDD3] text-[#991B1B] text-xs font-black uppercase tracking-wider border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-2 transition-all flex-shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResettingSettings ? "animate-spin" : ""}`} />
              <span>{isResettingSettings ? "Me-reset..." : "Reset ke Default"}</span>
            </button>
          </div>
        </div>

        {/* Standardized 2-Column Settings Grid with Equal Heights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Banner Pengumuman Cheer Wall */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full">
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-emerald-600 stroke-[2] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Banner Pengumuman Cheer Wall
                </h3>
              </div>

              {/* Interactive Neobrutalist Toggle Switch Button */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={announcementEnabled}
                  onClick={handleToggleAnnouncement}
                  title={announcementEnabled ? "Nonaktifkan Banner Pengumuman Cheer Wall" : "Aktifkan Banner Pengumuman Cheer Wall"}
                  className={`relative w-14 h-8 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                    announcementEnabled ? "bg-[#BBF7D0]" : "bg-neutral-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 border border-black transform transition-transform duration-200 ${
                      announcementEnabled ? "translate-x-6 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card Body (Middle) */}
            <div
              className={`flex-1 flex flex-col transition-opacity duration-200 ${
                !announcementEnabled ? "opacity-50 pointer-events-none select-none" : ""
              }`}
            >
              <p className="text-[11px] font-bold text-neutral-500 mb-3">
                Pesan pengumuman atau siaran khusus yang disematkan di bagian atas cheer wall publik.
              </p>
              <textarea
                rows={4}
                value={announcementText}
                onChange={(e) => {
                  setAnnouncementText(e.target.value);
                  debouncedSaveSettings({
                    announcement_text: e.target.value,
                    announcement_enabled: announcementEnabled,
                  });
                }}
                placeholder="Tuliskan pesan pengumuman publik..."
                className="w-full flex-1 p-3 border-2 border-[#1A1A1A] text-base sm:text-xs font-semibold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5] leading-relaxed resize-y min-h-[96px]"
              />
            </div>
          </div>

          {/* Card 2: Mode Arsip */}
          <div
            id="archive-mode-card"
            className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full"
          >
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <Archive className="w-4 h-4 text-emerald-600 stroke-[2] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Mode Arsip
                </h3>
              </div>

              {/* Interactive Neobrutalist Toggle Switch Button */}
              <div className="shrink-0 flex items-center">
                <button
                  id="toggle-archive-mode"
                  type="button"
                  role="switch"
                  aria-checked={isArchived}
                  aria-label="Mode Arsip"
                  onClick={handleToggleArchiveMode}
                  title={isArchived ? "Nonaktifkan Mode Arsip" : "Aktifkan Mode Arsip"}
                  className={`relative w-14 h-8 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                    isArchived ? "bg-[#BBF7D0]" : "bg-neutral-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 border border-black transform transition-transform duration-200 ${
                      isArchived ? "translate-x-6 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card Body (Middle) */}
            <div className="flex-1 flex flex-col">
              <p className="text-[11px] font-bold text-neutral-500 mb-3">
                Kunci pengiriman pesan baru. Dinding sorakan beralih ke mode hanya-baca.
              </p>
              <textarea
                id="archive-announcement"
                rows={4}
                value={archiveAnnouncement}
                onChange={(e) => {
                  const value = e.target.value;
                  setArchiveAnnouncement(value);
                  debouncedSaveSettings(
                    {
                      archive_announcement: value.trim()
                        ? value
                        : DEFAULT_ARCHIVE_ANNOUNCEMENT,
                    },
                    500
                  );
                }}
                onBlur={() => {
                  if (!archiveAnnouncement.trim()) {
                    setArchiveAnnouncement(DEFAULT_ARCHIVE_ANNOUNCEMENT);
                    saveSettingsDirect({
                      archive_announcement: DEFAULT_ARCHIVE_ANNOUNCEMENT,
                    });
                  }
                }}
                placeholder={DEFAULT_ARCHIVE_ANNOUNCEMENT}
                className="w-full flex-1 p-3 border-2 border-[#1A1A1A] text-base sm:text-xs font-semibold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5] leading-relaxed resize-y min-h-[96px]"
              />
            </div>
          </div>

          {/* Card 3: Batas Karakter Pesan */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full">
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <Type className="w-4 h-4 text-sky-600 stroke-[2] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Batas Karakter Pesan
                </h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-500 tabular-nums shrink-0">
                {maxCharLimit} karakter
              </span>
            </div>

            {/* Card Body (Middle) */}
            <div className="flex-1 flex flex-col justify-between mb-5">
              <p className="text-[11px] font-bold text-neutral-500 mb-3">
                Membatasi panjang teks pesan dukungan yang dapat diketik oleh pengunjung (default 280).
              </p>

              <div className="space-y-3 mt-auto">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={20}
                    max={1000}
                    value={maxCharLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setMaxCharLimit(val);
                      if (val >= 20 && val <= 1000) {
                        debouncedSaveSettings({ max_char_limit: val });
                      }
                    }}
                    className="w-32 px-3 py-2 border-2 border-[#1A1A1A] text-base sm:text-sm font-black shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5]"
                  />
                  <span className="text-xs font-bold text-neutral-600">karakter (min. 20, maks. 1000)</span>
                </div>
              </div>
            </div>

            {/* Card Footer (Bottom Row) */}
            <div className="pt-4 border-t border-[#1A1A1A]/10 flex items-center justify-between gap-3 mt-auto">
              <button
                type="button"
                onClick={() => {
                  setMaxCharLimit(280);
                  saveSettingsDirect({ max_char_limit: 280 });
                }}
                className="nb-btn px-3 py-2 bg-white hover:bg-neutral-100 text-xs font-bold border-2 border-[#1A1A1A] flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_#1A1A1A]"
                title="Kembalikan batas karakter ke 280"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </div>
          </div>

          {/* Card 3: Deteksi Spam URL & Domain Eksternal */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full">
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-emerald-600 stroke-[2] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Deteksi Spam URL &amp; Domain Eksternal
                </h3>
              </div>

              {/* Interactive Neobrutalist Toggle Switch Button */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableUrlFilter}
                  onClick={handleToggleUrlFilter}
                  title={enableUrlFilter ? "Nonaktifkan deteksi spam URL" : "Aktifkan deteksi spam URL"}
                  className={`relative w-14 h-8 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                    enableUrlFilter ? "bg-[#BBF7D0]" : "bg-neutral-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 border border-black transform transition-transform duration-200 ${
                      enableUrlFilter ? "translate-x-6 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div
              className={`flex-1 flex flex-col justify-between mb-5 transition-opacity duration-200 ${
                !enableUrlFilter ? "opacity-50 pointer-events-none select-none" : ""
              }`}
            >
              <p className="text-[11px] font-bold text-neutral-500 mb-3">
                Secara otomatis mencekal dan menahan pesan yang memuat tautan mencurigakan (http://, https://, domain .com, .xyz, dsb) ke antrean peninjauan.
              </p>

              <div className="p-3 bg-[#FAF9F5] border-2 border-[#1A1A1A] text-xs font-semibold text-neutral-700 leading-relaxed shadow-[1.5px_1.5px_0px_#1A1A1A] mt-auto">
                {enableUrlFilter ? (
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 flex-shrink-0" />
                    <span>Pesan berafiliasi URL otomatis ditahan</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <Clock className="w-3.5 h-3.5 stroke-[2.5] text-amber-600 flex-shrink-0" />
                    <span>Deteksi URL dinonaktifkan (semua tautan lolos)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Card Footer (Bottom Row) */}
            <div className="pt-4 border-t border-[#1A1A1A]/10 flex items-center justify-between gap-3 mt-auto">
              <span className="text-[11px] font-bold text-neutral-500">
                Filter tautan &amp; spam link independen
              </span>
            </div>
          </div>

          {/* Card 4: Rate Limiting (Spam & Flood Prevention) */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full">
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-500 stroke-[2] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Rate Limiting
                </h3>
              </div>

              {/* Interactive Neobrutalist Toggle Switch Button */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={rateLimitEnabled}
                  onClick={handleToggleRateLimit}
                  title={rateLimitEnabled ? "Nonaktifkan Rate Limiting" : "Aktifkan Rate Limiting"}
                  className={`relative w-14 h-8 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                    rateLimitEnabled ? "bg-[#BBF7D0]" : "bg-neutral-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 border border-black transform transition-transform duration-200 ${
                      rateLimitEnabled ? "translate-x-6 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div
              className={`flex-1 flex flex-col justify-between mb-5 transition-opacity duration-200 ${
                !rateLimitEnabled ? "opacity-50 pointer-events-none select-none" : ""
              }`}
            >
              <p className="text-[11px] font-bold text-neutral-500 mb-3">
                Mencegah spam bot dengan membatasi frekuensi kirim pesan per pengunjung (IP / Device Fingerprint / Local Session).
              </p>

              <div className="space-y-3 mt-auto">
                {/* Max Submissions row */}
                <div>
                  <div className="mb-1.5">
                    <span className="text-[11px] font-black uppercase text-[#1A1A1A]">
                      Batas Maksimal Pesan:
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 3, 5, 10].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSaveRateLimitConfig(preset, undefined)}
                        className={`nb-btn px-2.5 py-1 text-[11px] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] cursor-pointer ${
                          rateLimitMaxSubmissions === preset
                            ? "bg-[#FFF066] text-[#1A1A1A]"
                            : "bg-white hover:bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {preset} Pesan
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Window row */}
                <div>
                  <div className="mb-1.5">
                    <span className="text-[11px] font-black uppercase text-[#1A1A1A]">
                      Jendela Waktu:
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[1, 5, 15, 30].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleSaveRateLimitConfig(undefined, preset)}
                        className={`nb-btn px-2.5 py-1 text-[11px] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] cursor-pointer ${
                          rateLimitWindowMinutes === preset
                            ? "bg-[#BAE6FD] text-[#1A1A1A]"
                            : "bg-white hover:bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {preset} Menit
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Box */}
                <div className="p-3 bg-[#FAF9F5] border-2 border-[#1A1A1A] text-xs font-semibold text-neutral-700 leading-relaxed shadow-[1.5px_1.5px_0px_#1A1A1A]">
                  {rateLimitEnabled ? (
                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 flex-shrink-0" />
                      <span>Maks. {rateLimitMaxSubmissions} pesan per {rateLimitWindowMinutes} menit per pengunjung</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-800 font-bold">
                      <Clock className="w-3.5 h-3.5 stroke-[2.5] text-amber-600 flex-shrink-0" />
                      <span>Rate limiting dinonaktifkan (bebas kirim tanpa limit)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer (Bottom Row) */}
            <div className="pt-4 border-t border-[#1A1A1A]/10 flex items-center justify-between gap-3 mt-auto">
              <button
                type="button"
                onClick={() => handleSaveRateLimitConfig(3, 5)}
                className="nb-btn px-3 py-2 bg-white hover:bg-neutral-100 text-xs font-bold border-2 border-[#1A1A1A] flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_#1A1A1A]"
                title="Kembalikan konfigurasi rate limit ke default (3 pesan per 5 menit)"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Reset Default</span>
              </button>
            </div>
          </div>

          {/* Card 5: Auto-Accept Mode */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full">
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-500 stroke-[2] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Auto-Accept Mode
                </h3>
              </div>

              {/* Interactive Neobrutalist Toggle Switch Button */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoAccept}
                  disabled={isUpdatingAutoAccept}
                  onClick={handleToggleAutoAccept}
                  title={autoAccept ? "Nonaktifkan Auto-Accept Mode" : "Aktifkan Auto-Accept Mode"}
                  className={`relative w-14 h-8 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                    autoAccept ? "bg-[#BBF7D0]" : "bg-neutral-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 border border-black transform transition-transform duration-200 ${
                      autoAccept ? "translate-x-6 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Card Body (Middle) */}
            <div
              className={`flex-1 flex flex-col justify-between transition-opacity duration-200 ${
                !autoAccept ? "opacity-50 pointer-events-none select-none" : ""
              }`}
            >
              <p className="text-xs font-semibold text-neutral-600 leading-relaxed mb-4">
                {autoAccept
                  ? "Semua pesan baru yang dikirimkan oleh pengunjung langsung disetujui dan otomatis tampil di cheer wall tanpa perlu konfirmasi manual."
                  : "Pesan baru akan berstatus pending dan masuk antrean moderasi di tab Dashboard. Membutuhkan persetujuan admin sebelum tampil di cheer wall publik."}
              </p>

              <div className="p-3 bg-[#FAF9F5] border-2 border-[#1A1A1A] text-xs font-semibold text-neutral-700 leading-relaxed shadow-[1.5px_1.5px_0px_#1A1A1A] mt-auto">
                {autoAccept ? (
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600 flex-shrink-0" />
                    <span>Pesan baru langsung tampil di cheer wall</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <Clock className="w-3.5 h-3.5 stroke-[2.5] text-amber-600 flex-shrink-0" />
                    <span>Pesan baru ditinjau sebelum dipublikasikan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 6: Custom Description (Jelaskan apa yang mau didukung) */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full">
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-indigo-600 stroke-[2] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Jelaskan apa yang mau di dukung di web ini
                </h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-500 tabular-nums shrink-0">
                {aboutDescription.length} karakter
              </span>
            </div>

            {/* Card Body (Middle) */}
            <div className="flex-1 flex flex-col mb-5">
              <p className="text-[11px] font-bold text-neutral-500 mb-3">
                Deskripsi ini secara dinamis memperbarui teks pada modal &ldquo;Tentang SorakSora!&rdquo; di cheer wall publik untuk menjelaskan tujuan pengumpulan pesan.
              </p>
              <textarea
                rows={4}
                value={aboutDescription}
                onChange={(e) => {
                  setAboutDescription(e.target.value);
                  debouncedSaveSettings({ about_description: e.target.value });
                }}
                placeholder="Tuliskan tujuan dukungan di web ini..."
                className="w-full flex-1 p-3 border-2 border-[#1A1A1A] text-base sm:text-xs font-semibold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5] leading-relaxed resize-y min-h-[96px]"
              />
            </div>

            {/* Card Footer (Bottom Row) */}
            <div className="pt-4 border-t border-[#1A1A1A]/10 flex items-center justify-between gap-3 mt-auto">
              <button
                type="button"
                onClick={handleResetAboutDescription}
                className="nb-btn px-3 py-2 bg-white hover:bg-neutral-100 text-xs font-bold border-2 border-[#1A1A1A] flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_#1A1A1A]"
                title="Kembalikan ke deskripsi standar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </div>
          </div>

          {/* Card: Import & Export Data Pesan (JSON) */}
          <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full">
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 mb-4 w-full">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                  <FileJson className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                  Import &amp; Export Data Pesan (JSON)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-500 tabular-nums shrink-0">
                JSON Backup
              </span>
            </div>

            {/* Card Body (Middle) */}
            <div className="flex-1 flex flex-col justify-between gap-4 mb-5">
              <p className="text-[11px] font-bold text-neutral-500 leading-relaxed">
                Cadangkan seluruh pesan cheer wall ke format JSON atau pulihkan data pesan melalui berkas cadangan. Mengimpor berkas akan menimpa seluruh pesan yang ada saat ini.
              </p>

              <div className="p-3 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span>Total Pesan Saat Ini:</span>
                  <span className="font-black text-black px-2 py-0.5 bg-yellow-200 border border-black text-[11px]">
                    {stats.total} Pesan
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 font-semibold leading-normal">
                  Format berkas: Standar skema SorakSora JSON v1.0.0 dengan validasi integritas struktur data.
                </div>
              </div>
            </div>

            {/* Card Footer (Bottom Row) */}
            <div className="pt-4 border-t border-[#1A1A1A]/10 flex items-center gap-3 mt-auto">
              {/* Export Button */}
              <a
                href={getExportUrl("json")}
                download
                className="nb-btn flex-1 py-2 px-3 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-xs font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center gap-1.5 transition-all text-[#0369A1]"
                title="Unduh berkas cadangan JSON pesan"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Export JSON</span>
              </a>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={jsonFileInputRef}
                accept=".json,application/json"
                onChange={handleJsonFileSelected}
                className="hidden"
              />

              {/* Import Button */}
              <button
                type="button"
                onClick={() => jsonFileInputRef.current?.click()}
                className="nb-btn flex-1 py-2 px-3 bg-[#FEF08A] hover:bg-[#FDE047] text-xs font-black border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-center gap-1.5 transition-all text-neutral-900"
                title="Unggah berkas JSON untuk menimpa semua pesan"
              >
                <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Import JSON</span>
              </button>
            </div>
          </div>

          {/* Card 7: Integrasi Notifikasi Pelari (Telegram Bot) */}
          <div
            id="telegram-integration-card"
            className="bg-white border-2 border-[#1A1A1A] p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between h-full md:col-span-2 space-y-6"
          >
            {/* Card Header (Top Row) */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b-2 border-black w-full flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 border-2 border-black bg-[#BAE6FD] flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_#000] shrink-0 aspect-square">
                  <Bot className="w-5 h-5 text-[#1A1A1A] stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                    Integrasi Notifikasi Pelari (Telegram Bot)
                  </h3>
                  <p className="text-xs font-semibold text-neutral-500 mt-0.5">
                    Meneruskan pesan dukungan yang disetujui ke Telegram Bot / Channel secara otomatis agar notifikasi muncul di smartwatch pelari.
                  </p>
                </div>
              </div>

              {/* Status Pill Indicator */}
              <div className="shrink-0 flex items-center gap-2">
                <span
                  id="telegram-config-badge"
                  className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider border-2 border-black shadow-[1.5px_1.5px_0px_#000] ${
                    telegramBotToken.trim() && telegramChatId.trim()
                      ? "bg-[#BBF7D0] text-[#15803D]"
                      : "bg-[#FEF08A] text-[#854D0E]"
                  }`}
                >
                  {telegramBotToken.trim() && telegramChatId.trim()
                    ? "Terkonfigurasi"
                    : "Belum Dikonfigurasi"}
                </span>
              </div>
            </div>

            {/* Credentials Row */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bot Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="telegram-bot-token"
                      className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A]"
                    >
                      TELEGRAM_BOT_TOKEN <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBotToken(!showBotToken)}
                      className="text-[10px] font-bold text-neutral-600 hover:text-black flex items-center gap-1 cursor-pointer"
                    >
                      {showBotToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showBotToken ? "Sembunyikan" : "Tampilkan"}</span>
                    </button>
                  </div>
                  <input
                    id="telegram-bot-token"
                    type={showBotToken ? "text" : "password"}
                    value={telegramBotToken}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTelegramBotToken(val);
                      debouncedSaveSettings({ telegram_bot_token: val.trim() }, 500);
                    }}
                    onBlur={() => {
                      const trimmed = telegramBotToken.trim();
                      if (trimmed !== telegramBotToken) {
                        setTelegramBotToken(trimmed);
                        saveSettingsDirect({ telegram_bot_token: trimmed });
                      }
                    }}
                    placeholder="0000000:AAbbCCddEeFFggHH"
                    className="w-full px-3 py-2.5 border-2 border-[#1A1A1A] text-sm font-semibold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5]"
                  />
                </div>

                {/* Chat ID */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="telegram-chat-id"
                    className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A]"
                  >
                    TELEGRAM_CHAT_ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="telegram-chat-id"
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTelegramChatId(val);
                      debouncedSaveSettings({ telegram_chat_id: val.trim() }, 500);
                    }}
                    onBlur={() => {
                      const trimmed = telegramChatId.trim();
                      if (trimmed !== telegramChatId) {
                        setTelegramChatId(trimmed);
                        saveSettingsDirect({ telegram_chat_id: trimmed });
                      }
                    }}
                    placeholder="@example_chat atau -100xxxxxxxxxx"
                    className="w-full px-3 py-2.5 border-2 border-[#1A1A1A] text-sm font-semibold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5]"
                  />
                  <p className="text-[11px] font-medium text-neutral-500 mt-1">
                    Bisa berupa User ID (misal: 12345678), Channel Username (@namachannel), atau Channel ID (-1001234567890).
                  </p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <button
                  id="btn-test-telegram"
                  type="button"
                  disabled={isTestingTelegram || !telegramBotToken.trim() || !telegramChatId.trim()}
                  onClick={handleTestTelegram}
                  className={`nb-btn px-4 py-2 text-xs font-black uppercase tracking-wider border-2 border-[#1A1A1A] flex items-center gap-2 shadow-[2px_2px_0px_#000] cursor-pointer ${
                    isTestingTelegram || !telegramBotToken.trim() || !telegramChatId.trim()
                      ? "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                      : "bg-[#FED7AA] hover:bg-[#FDBA74] text-[#1A1A1A] active:translate-x-0.5 active:translate-y-0.5"
                  }`}
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingTelegram ? "animate-spin" : ""}`} />
                  <span>{isTestingTelegram ? "MENGIRIM TEST..." : "Kirim Pesan Uji Coba"}</span>
                </button>
              </div>
            </div>

            {/* Trigger Modes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t-2 border-black/10">
              {/* Trigger Mode 1: Instant Push */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-black shadow-[2px_2px_0px_#000] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                      Kirim Instan Saat Pesan Disetujui
                    </span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    id="toggle-telegram-instant"
                    type="button"
                    role="switch"
                    aria-checked={telegramInstantEnabled}
                    onClick={handleToggleTelegramInstant}
                    aria-label="Kirim Instan Saat Pesan Disetujui"
                    className={`relative w-12 h-7 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                      telegramInstantEnabled ? "bg-[#BBF7D0]" : "bg-neutral-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 border border-black transform transition-transform duration-200 ${
                        telegramInstantEnabled ? "translate-x-5 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] font-semibold text-neutral-600 leading-relaxed">
                  Otomatis push notifikasi seketika setiap kali pesan dukungan disetujui admin atau lolos auto-accept secara instan.
                </p>
                <div className="text-[10px] font-bold text-neutral-500">
                  Status: {telegramInstantEnabled ? "Aktif (Real-time push)" : "Nonaktif"}
                </div>
              </div>

              {/* Trigger Mode 2: Periodic Random Cheer Loop */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-black shadow-[2px_2px_0px_#000] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Radio className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                      Kirim Pesan Acak Berkala
                    </span>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    id="toggle-telegram-periodic"
                    type="button"
                    role="switch"
                    aria-checked={telegramPeriodicEnabled}
                    onClick={handleToggleTelegramPeriodic}
                    aria-label="Kirim Pesan Acak Berkala"
                    className={`relative w-12 h-7 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                      telegramPeriodicEnabled ? "bg-[#BBF7D0]" : "bg-neutral-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 border border-black transform transition-transform duration-200 ${
                        telegramPeriodicEnabled ? "translate-x-5 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] font-semibold text-neutral-600 leading-relaxed">
                  Memilih pesan acak yang sudah disetujui dan mengirimkannya ke Telegram secara berkala tanpa pengulangan beruntun.
                </p>

                {/* Interval Presets & Custom Input */}
                <div className="space-y-2 pt-1 border-t border-black/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#1A1A1A]">
                      Interval Broadcast:
                    </span>
                    <span className="text-[10px] font-bold text-neutral-600">
                      Tiap {telegramIntervalMinutes} Menit
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[5, 10, 15, 20, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleSaveTelegramInterval(mins)}
                        className={`nb-btn px-2.5 py-1 text-[11px] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] cursor-pointer ${
                          telegramIntervalMinutes === mins
                            ? "bg-[#FFF066] text-[#1A1A1A]"
                            : "bg-white hover:bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        id="custom-telegram-interval"
                        type="number"
                        min={1}
                        max={1440}
                        value={telegramIntervalMinutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setTelegramIntervalMinutes(val);
                          debouncedSaveSettings({ telegram_interval_minutes: val });
                        }}
                        className="w-14 px-1.5 py-1 border-2 border-black text-xs font-bold bg-white text-center shadow-[1px_1px_0px_#000]"
                      />
                      <span className="text-[10px] font-bold text-neutral-500">menit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
           * Card 5: UNIFIED CONTENT SAFETY SUITE (PROFANITY FILTER)
           * ========================================================================= */}
          <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] p-6 flex flex-col justify-between h-full md:col-span-2 space-y-6">
            {/* Master Toggle Header Bar */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b-2 border-black w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 border-2 border-black flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_#000] transition-colors shrink-0 aspect-square ${
                    enableContentModeration ? "bg-[#BBF7D0]" : "bg-neutral-200"
                  }`}
                >
                  <ShieldAlert className="w-5 h-5 text-black stroke-[2] shrink-0" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#1A1A1A] truncate leading-tight">
                    Aktifkan Filter Kata &amp; Moderasi Konten
                  </h3>
                  <p className="text-xs font-semibold text-neutral-500 mt-0.5 line-clamp-2 sm:line-clamp-none">
                    aktifkan seluruh modul filter kata, sensor, deteksi leetspeak, blacklist, dan whitelist kata.
                  </p>
                </div>
              </div>

              {/* Master Switch Button */}
              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableContentModeration}
                  onClick={handleToggleMasterModeration}
                  title={enableContentModeration ? "Nonaktifkan filter kata & moderasi konten" : "Aktifkan filter kata & moderasi konten"}
                  className={`relative w-14 h-8 border-2 border-black transition-colors p-0.5 focus:outline-none shadow-[2px_2px_0px_#000] shrink-0 cursor-pointer ${
                    enableContentModeration ? "bg-[#BBF7D0]" : "bg-neutral-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 border border-black transform transition-transform duration-200 ${
                      enableContentModeration ? "translate-x-6 bg-[#15803D]" : "translate-x-0 bg-neutral-400"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Nested Sub-Features Configuration Section (Greys out when master toggle is OFF) */}
            <div
              className={
                enableContentModeration
                  ? "space-y-6"
                  : "space-y-6 opacity-50 pointer-events-none select-none transition-opacity duration-200"
              }
            >
              <p className="text-xs font-bold text-neutral-600 leading-relaxed">
                Pustaka utama untuk mendeteksi kata kotor, makian, pornografi, dan istilah ofensif dengan dukungan leetspeak, variasi ejaan, kamus bahasa daerah, batas skor keparahan, blacklist mandiri, dan whitelist kata.
              </p>

              {/* Profanity Filter & Preset */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1A1A1A]/10">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                        <Filter className="w-4 h-4 stroke-[2] shrink-0 text-black" />
                      </div>
                      <span className="text-xs font-black uppercase text-[#1A1A1A]">
                        Profanity Filter
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 font-medium leading-relaxed">
                      Pustaka utama untuk mendeteksi kata kotor, makian, pornografi, dan istilah ofensif.
                    </p>
                  </div>
                </div>

                {/* Preset Selector */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-black uppercase text-[#1A1A1A]">
                      Tingkat Sensitivitas Preset Filter:
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "strict", label: "Strict", desc: "Ketat, blokir semua makian & variasi ringan" },
                      { id: "moderate", label: "Moderate", desc: "Seimbang (standar moderasi harian)" },
                      { id: "light", label: "Light", desc: "Longgar, hanya kata sangat vulgar" },
                      { id: "childSafe", label: "ChildSafe", desc: "Sangat aman untuk anak & edukasi" },
                    ].map((p) => {
                      const isSelected = filterPreset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setFilterPreset(p.id as any);
                            saveSettingsDirect({ filter_preset: p.id as any });
                          }}
                          className={`p-2.5 text-left border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#FFF066] translate-x-0.5 translate-y-0.5 shadow-[1px_1px_0px_#1A1A1A]"
                              : "bg-white hover:bg-neutral-100"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black uppercase text-[#1A1A1A]">{p.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                          </div>
                          <p className="text-[10px] text-neutral-600 font-medium leading-tight">{p.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sensitivitas / Ambang Batas Skor Keparahan */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                        <Sliders className="w-4 h-4 stroke-[2] shrink-0 text-black" />
                      </div>
                      <span className="text-xs font-black uppercase text-[#1A1A1A]">
                        Sensitivitas / Ambang Batas Skor Keparahan
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 font-medium leading-relaxed mt-0.5">
                      Pesan dengan skor keparahan &gt;= ambang ini akan otomatis ditahan ke status pending review.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-1 bg-amber-200 border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] text-[#1A1A1A]">
                      Skor: {filterSeverityThreshold.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-2 pt-1">
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={filterSeverityThreshold}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setFilterSeverityThreshold(val);
                      debouncedSaveSettings({ filter_severity_threshold: val });
                    }}
                    className="w-full h-2 bg-neutral-200 border border-black accent-[#1A1A1A] cursor-pointer"
                  />

                  {/* Preset Quick Pills */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                    <span className="font-bold text-neutral-500">Pilihan Cepat:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: "0.30 (Sensitif)", val: 0.3 },
                        { label: "0.50 (Seimbang)", val: 0.5 },
                        { label: "0.70 (Longgar)", val: 0.7 },
                      ].map((pill) => (
                        <button
                          key={pill.val}
                          type="button"
                          onClick={() => {
                            setFilterSeverityThreshold(pill.val);
                            saveSettingsDirect({ filter_severity_threshold: pill.val });
                          }}
                          className={`px-2 py-0.5 text-[10px] font-black border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A] cursor-pointer transition-transform active:scale-95 ${
                            filterSeverityThreshold === pill.val
                              ? "bg-[#FFF066] text-black"
                              : "bg-white hover:bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cakupan Ejaan & Dialek */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                    <Languages className="w-4 h-4 text-[#1A1A1A] stroke-[2] shrink-0" />
                  </div>
                  <span className="text-xs font-black uppercase text-[#1A1A1A]">
                    Cakupan Ejaan &amp; Dialek
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 font-medium">
                  Aktifkan kemampuan heuristik tambahan untuk menggagalkan upaya manipulasi kata atau umpatan berbahasa daerah:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Leetspeak */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterDetectLeetspeak}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setFilterDetectLeetspeak(val);
                        saveSettingsDirect({ filter_detect_leetspeak: val });
                      }}
                      className="mt-0.5 w-4 h-4 accent-[#1A1A1A] border-2 border-[#1A1A1A]"
                    />
                    <div className="text-xs">
                      <span className="font-black block uppercase text-[#1A1A1A]">Normalisasi Leetspeak</span>
                      <span className="text-[10px] text-neutral-500 font-medium leading-tight block mt-0.5">
                        Deteksi penggantian huruf dengan angka (contoh: <code>4nj1ng</code>, <code>k0nt0l</code>)
                      </span>
                    </div>
                  </label>

                  {/* Spaced-out Letters */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterDetectSplit}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setFilterDetectSplit(val);
                        saveSettingsDirect({ filter_detect_split: val });
                      }}
                      className="mt-0.5 w-4 h-4 accent-[#1A1A1A] border-2 border-[#1A1A1A]"
                    />
                    <div className="text-xs">
                      <span className="font-black block uppercase text-[#1A1A1A]">Karakter Terpisah / Spasi</span>
                      <span className="text-[10px] text-neutral-500 font-medium leading-tight block mt-0.5">
                        Deteksi kata yang dieja renggang (contoh: <code>a-n-j-i-n-g</code> atau <code>a n j i n g</code>)
                      </span>
                    </div>
                  </label>

                  {/* Dialects */}
                  <label className="flex items-start gap-2.5 p-3 bg-white border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={filterDetectDialects}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setFilterDetectDialects(val);
                        saveSettingsDirect({ filter_detect_dialects: val });
                      }}
                      className="mt-0.5 w-4 h-4 accent-[#1A1A1A] border-2 border-[#1A1A1A]"
                    />
                    <div className="text-xs">
                      <span className="font-black block uppercase text-[#1A1A1A]">Dialek Bahasa Daerah</span>
                      <span className="text-[10px] text-neutral-500 font-medium leading-tight block mt-0.5">
                        Cakupan Jawa, Sunda, Batak, Betawi, Minang, Bali, Madura, dan Aceh
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Gaya Sensor Kata (Censor Styling Mode) */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                    <EyeOff className="w-4 h-4 stroke-[2] shrink-0 text-black" />
                  </div>
                  <span className="text-xs font-black uppercase text-[#1A1A1A]">
                    Gaya Sensor Kata (Censor Styling Mode)
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 font-medium">
                  Pilih format sensor ketika menampilkan pesan berisiko kepada publik:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    {
                      id: "normal",
                      label: "Normal",
                      desc: "Tampil apa adanya tanpa sensor (contoh: kata)",
                    },
                    {
                      id: "first_last",
                      label: "Depan & Belakang",
                      desc: "Pertahankan huruf awal & akhir (contoh: k**a)",
                    },
                    {
                      id: "asterisk",
                      label: "Bintang",
                      desc: "Tutup semua huruf dengan bintang (contoh: ****)",
                    },
                    {
                      id: "grawlix",
                      label: "Grawlix",
                      desc: "Ganti dengan simbol komik (contoh: #@$%&!)",
                    },
                  ].map((mode) => {
                    const isSelected = filterCensorMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setFilterCensorMode(mode.id as any);
                          saveSettingsDirect({ filter_censor_mode: mode.id as any });
                        }}
                        className={`p-2.5 text-left border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#FFF066] translate-x-0.5 translate-y-0.5 shadow-[1px_1px_0px_#1A1A1A]"
                            : "bg-white hover:bg-neutral-100"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black uppercase text-[#1A1A1A]">{mode.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                        </div>
                        <p className="text-[10px] text-neutral-600 font-medium leading-tight">{mode.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Words & Whitelist Sub-Tabs */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] space-y-4">
                {/* Sub-Tab Navigation */}
                <div className="flex items-center gap-2 border-b-2 border-[#1A1A1A] pb-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveSafetySubTab("banned")}
                    className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeSafetySubTab === "banned"
                        ? "bg-[#FFF066] text-[#1A1A1A] translate-x-0.5 translate-y-0.5 shadow-[1px_1px_0px_#1A1A1A]"
                        : "bg-white text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <Ban className="w-4 h-4 text-rose-500 stroke-[2.5]" />
                    <span>Blacklist Kata ({allBannedWords.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSafetySubTab("whitelist")}
                    className={`px-3 py-1.5 text-xs font-black uppercase border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeSafetySubTab === "whitelist"
                        ? "bg-[#BBF7D0] text-[#14532D] translate-x-0.5 translate-y-0.5 shadow-[1px_1px_0px_#1A1A1A]"
                        : "bg-white text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                    <span>Whitelist Kata ({allWhitelistWords.length})</span>
                  </button>
                </div>

                {/* Sub-Tab 1: Blacklist Kata */}
                {activeSafetySubTab === "banned" && (
                  <div className="space-y-3">
                    <div className="space-y-0.5 pb-2 border-b border-[#1A1A1A]/10">
                      <span className="text-xs font-black uppercase text-[#1A1A1A]">
                        Blacklist Kata (Kata Terlarang Kustom)
                      </span>
                      <p className="text-[11px] text-neutral-600 font-medium">
                        Daftar kata/frasa tambahan yang ditentukan pengelola web untuk dicekal.
                      </p>
                    </div>

                    {/* Toolbar: Import/Export .txt & Reset */}
                    <div className="flex items-center justify-between gap-2 flex-wrap w-full">
                      <span className="text-[11px] font-black uppercase text-[#1A1A1A]">
                        Daftar Blacklist
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".txt,text/plain"
                          className="hidden"
                          onChange={handleImportBannedWords}
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          title="Unggah file .txt untuk mengimpor blacklist kata"
                          className="nb-btn px-2.5 py-1 bg-white hover:bg-neutral-100 text-[#1A1A1A] text-[11px] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] flex items-center cursor-pointer active:scale-95 transition-transform"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          <span>Impor .txt</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportBannedWords}
                          title="Unduh daftar blacklist kata sebagai file .txt"
                          className="nb-btn px-2.5 py-1 bg-white hover:bg-neutral-100 text-[#1A1A1A] text-[11px] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] flex items-center cursor-pointer active:scale-95 transition-transform"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          <span>Ekspor .txt</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetBannedWordsDefault}
                          title="Kembalikan blacklist kata ke daftar bawaan"
                          className="text-[11px] font-bold text-neutral-600 hover:text-black underline flex items-center gap-1 cursor-pointer ml-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Bawaan</span>
                        </button>
                      </div>
                    </div>

                    {/* Chips Container with 25 words pagination */}
                    <div className="flex flex-wrap gap-1.5 p-3 min-h-[90px] max-h-48 overflow-y-auto items-start content-start bg-neutral-50 border-2 border-black shadow-[1.5px_1.5px_0px_#1A1A1A]">
                      {displayedBannedWords.map((word, idx) => (
                        <span
                          key={`${word}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-white border border-black shadow-[1.5px_1.5px_0px_#000] rounded-none shrink-0 h-auto leading-none text-[#1A1A1A]"
                        >
                          <span>{word}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(word)}
                            title={`Hapus kata "${word}" dari blacklist`}
                            className="hover:text-rose-600 focus:outline-none cursor-pointer"
                          >
                            <X className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </span>
                      ))}

                      {allBannedWords.length === 0 && (
                        <span className="text-xs italic text-neutral-400">Belum ada kata terdaftar di blacklist.</span>
                      )}

                      {!isWordlistExpanded && allBannedWords.length > 25 && (
                        <button
                          type="button"
                          onClick={() => setIsWordlistExpanded(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFF066] hover:bg-[#FDE047] border border-[#1A1A1A] text-xs font-black shadow-[1px_1px_0px_#1A1A1A] text-[#1A1A1A] cursor-pointer active:scale-95 transition-transform shrink-0 h-auto leading-none"
                        >
                          Tampilkan {allBannedWords.length - 25} kata lagi
                        </button>
                      )}

                      {isWordlistExpanded && allBannedWords.length > 25 && (
                        <button
                          type="button"
                          onClick={() => setIsWordlistExpanded(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 border border-[#1A1A1A] text-xs font-black shadow-[1px_1px_0px_#1A1A1A] text-neutral-800 cursor-pointer active:scale-95 transition-transform shrink-0 h-auto leading-none"
                        >
                          Ciutkan ke 25 kata
                        </button>
                      )}
                    </div>

                    {/* Add New Keyword Input */}
                    <form onSubmit={handleAddKeyword} className="flex flex-col sm:flex-row gap-2 w-full pt-1">
                      <input
                        type="text"
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        placeholder="Ketik kata/frasa blacklist baru lalu tekan Enter..."
                        className="w-full flex-1 min-w-0 px-3 py-2 text-xs font-bold border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0px_#000] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newKeywordInput.trim()}
                        className="w-full sm:w-auto shrink-0 px-4 py-2 text-xs font-black uppercase tracking-wide bg-[#FFF066] hover:bg-[#FDE047] text-[#1A1A1A] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 whitespace-nowrap disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Tambah ke Blacklist</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Sub-Tab 2: Whitelist Kata */}
                {activeSafetySubTab === "whitelist" && (
                  <div className="space-y-3">
                    <div className="space-y-1 pb-2 border-b border-[#1A1A1A]/10">
                      <span className="text-xs font-black uppercase text-[#1A1A1A]">
                        Whitelist Kata (Pengecualian Aman)
                      </span>
                      <p className="text-[11px] text-neutral-600 font-medium leading-relaxed">
                        Kata-kata di dalam whitelist <strong>tidak akan pernah dicekal atau disensor</strong> oleh filter kata maupun blacklist kata. Sangat berguna untuk mencegah false positive pada istilah daerah, nama orang (misal: <em>Bagus</em>, <em>Siti</em>, dsb), atau julukan hangat.
                      </p>
                    </div>

                    {/* Whitelist Toolbar: Import/Export .txt */}
                    <div className="flex items-center justify-between gap-2 flex-wrap w-full">
                      <span className="text-[11px] font-black uppercase text-[#1A1A1A]">
                        Daftar Whitelist
                      </span>

                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="file"
                          ref={fileWhitelistInputRef}
                          accept=".txt,text/plain"
                          className="hidden"
                          onChange={handleImportWhitelistWords}
                        />

                        <button
                          type="button"
                          onClick={() => fileWhitelistInputRef.current?.click()}
                          title="Unggah file .txt untuk mengimpor whitelist kata"
                          className="nb-btn px-2.5 py-1 bg-white hover:bg-neutral-100 text-[#1A1A1A] text-[11px] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] flex items-center cursor-pointer active:scale-95 transition-transform"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          <span>Impor .txt</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportWhitelistWords}
                          title="Unduh daftar whitelist kata sebagai file .txt"
                          className="nb-btn px-2.5 py-1 bg-white hover:bg-neutral-100 text-[#1A1A1A] text-[11px] font-black border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_#1A1A1A] flex items-center cursor-pointer active:scale-95 transition-transform"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          <span>Ekspor .txt</span>
                        </button>
                      </div>
                    </div>

                    {/* Whitelist Chips Container */}
                    <div className="flex flex-wrap gap-1.5 p-3 min-h-[90px] max-h-48 overflow-y-auto items-start content-start bg-neutral-50 border-2 border-black shadow-[1.5px_1.5px_0px_#1A1A1A]">
                      {displayedWhitelistWords.map((word, idx) => (
                        <span
                          key={`${word}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[#DCFCE7] border border-black shadow-[1.5px_1.5px_0px_#000] rounded-none shrink-0 h-auto leading-none text-[#14532D]"
                        >
                          <span>{word}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveWhitelistWord(word)}
                            title={`Hapus "${word}" dari whitelist`}
                            className="hover:text-rose-600 focus:outline-none cursor-pointer"
                          >
                            <X className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </span>
                      ))}

                      {allWhitelistWords.length === 0 && (
                        <span className="text-xs italic text-neutral-400">
                          Belum ada kata terdaftar di whitelist.
                        </span>
                      )}

                      {!isWhitelistExpanded && allWhitelistWords.length > 25 && (
                        <button
                          type="button"
                          onClick={() => setIsWhitelistExpanded(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#BBF7D0] hover:bg-[#86EFAC] border border-[#1A1A1A] text-xs font-black shadow-[1px_1px_0px_#1A1A1A] text-[#14532D] cursor-pointer active:scale-95 transition-transform shrink-0 h-auto leading-none"
                        >
                          Tampilkan {allWhitelistWords.length - 25} kata lagi
                        </button>
                      )}

                      {isWhitelistExpanded && allWhitelistWords.length > 25 && (
                        <button
                          type="button"
                          onClick={() => setIsWhitelistExpanded(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 border border-[#1A1A1A] text-xs font-black shadow-[1px_1px_0px_#1A1A1A] text-neutral-800 cursor-pointer active:scale-95 transition-transform shrink-0 h-auto leading-none"
                        >
                          Ciutkan ke 25 kata
                        </button>
                      )}
                    </div>

                    {/* Add Whitelist Form */}
                    <form onSubmit={handleAddWhitelistWord} className="flex flex-col sm:flex-row gap-2 w-full pt-1">
                      <input
                        type="text"
                        value={newWhitelistInput}
                        onChange={(e) => setNewWhitelistInput(e.target.value)}
                        placeholder="Ketik kata/istilah aman untuk whitelist lalu tekan Enter..."
                        className="w-full flex-1 min-w-0 px-3 py-2 text-xs font-bold border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0px_#000] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newWhitelistInput.trim()}
                        className="w-full sm:w-auto shrink-0 px-4 py-2 text-xs font-black uppercase tracking-wide bg-[#BBF7D0] hover:bg-[#86EFAC] text-[#14532D] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 whitespace-nowrap disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Tambah ke Whitelist</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Uji Coba Filter Kata (Profanity Sandbox) */}
              <div className="p-4 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 shrink-0 aspect-square flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-purple-600 stroke-[2] shrink-0" />
                  </div>
                  <span className="text-xs font-black uppercase text-[#1A1A1A]">
                    Uji Coba Filter Kata (Profanity Sandbox)
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 font-medium leading-relaxed">
                  Uji kalimat atau frasa secara interaktif menggunakan aturan moderasi, kamus, leetspeak, dan gaya sensor yang sedang aktif:
                </p>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    placeholder="Ketik kalimat untuk menguji filter..."
                    className="w-full p-2.5 text-xs font-semibold border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0px_#000] focus:outline-none resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] text-neutral-500 font-medium">
                      Simulasikan deteksi tanpa mengubah data pesan di database.
                    </span>
                    <button
                      type="button"
                      onClick={handleTestSandbox}
                      disabled={!sandboxInput.trim() || isTestingSandbox}
                      className="nb-btn px-4 py-2 bg-[#FEF08A] hover:bg-[#FDE047] text-[#1A1A1A] text-xs font-black uppercase tracking-wide border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FlaskConical className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isTestingSandbox ? "Menguji..." : "Uji Kalimat"}</span>
                    </button>
                  </div>
                </div>

                {/* Diagnostic Output Card */}
                {sandboxResult && (
                  <div className="mt-3 p-3.5 bg-white border-2 border-[#1A1A1A] shadow-[3px_3px_0px_#1A1A1A] space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b-2 border-[#1A1A1A]/10 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-neutral-500">Status:</span>
                        {sandboxResult.isClean ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-black bg-[#BBF7D0] text-[#14532D] border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A]">
                            <Check className="w-3 h-3 stroke-[3]" /> Bersih (Clean)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-black bg-[#FECDD3] text-[#9F1239] border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A]">
                            <AlertTriangle className="w-3 h-3 stroke-[2.5]" /> Terdeteksi Pelanggaran (Flagged)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-neutral-500">Skor Keparahan:</span>
                        <span className="px-2 py-0.5 text-xs font-mono font-black bg-neutral-100 border border-[#1A1A1A] shadow-[1px_1px_0px_#1A1A1A]">
                          {sandboxResult.severityScore.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Matched Words */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
                        Kata yang Tertangkap:
                      </span>
                      {sandboxResult.matchedWords.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sandboxResult.matchedWords.map((word, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-[#FEE2E2] text-[#991B1B] border border-black shadow-[1px_1px_0px_#000]"
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-neutral-500">Tidak ada kata terlarang tertangkap.</span>
                      )}
                    </div>

                    {/* Categories and Reasons */}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
                        Kategori &amp; Alasan:
                      </span>
                      {sandboxResult.flaggedLayers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sandboxResult.flaggedLayers.map((layer, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs font-bold bg-[#E0E7FF] text-[#3730A3] border border-black shadow-[1px_1px_0px_#000]"
                            >
                              {layer}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-neutral-500">Tidak ada kategori pelanggaran aktif.</span>
                      )}
                    </div>

                    {/* Censored Masking Preview */}
                    <div className="pt-2 border-t border-[#1A1A1A]/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block mb-1">
                        Hasil Sensor (Masking Preview):
                      </span>
                      <div className="p-2.5 bg-[#FAF9F5] border border-black font-mono text-xs font-bold text-[#1A1A1A] break-words">
                        {sandboxResult.censoredText}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Footer (Bottom Row) */}
            <div className="pt-4 border-t-2 border-[#1A1A1A] flex items-center justify-between gap-3 mt-auto flex-wrap sm:flex-nowrap">
              <span className="text-[11px] font-bold text-neutral-500">
                {enableContentModeration
                  ? "Filter kata aktif. Pesan yang mengandung kata terlarang otomatis dialihkan ke status pending queue."
                  : "Filter kata dinonaktifkan secara global (semua pesan lolos tanpa penahanan otomatis)."}
              </span>
            </div>
          </div>
        </div>



      </div>
    )}
  </main>

      {/* =====================================================================
       * INLINE EDIT / FULL CRUD MODAL
       * ===================================================================== */}
      {editingMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1A1A1A]/70 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white border-[3px] border-[#1A1A1A] shadow-[8px_8px_0px_#1A1A1A] overflow-hidden"
          >
            {/* Modal Header */}
            <div
              className="border-b-[3px] border-[#1A1A1A] px-5 py-3.5 flex items-center justify-between transition-colors duration-150"
              style={{ backgroundColor: editColor || "#FFF066" }}
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 stroke-[2.5]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#1A1A1A]">
                  Edit Pesan Dukungan
                </h3>
              </div>
              <button
                onClick={() => setEditingMessage(null)}
                className="w-7 h-7 bg-white hover:bg-neutral-100 border-2 border-[#1A1A1A] flex items-center justify-center shadow-[1.5px_1.5px_0px_#1A1A1A]"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-6 space-y-4">
              {/* Author & Anonymous Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                    PENGIRIM / NAMA
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsAnonymous}
                      onChange={(e) => setEditIsAnonymous(e.target.checked)}
                      className="accent-[#1A1A1A] w-3.5 h-3.5"
                    />
                    <span>Kirim sebagai Anonim</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={editIsAnonymous}
                  value={editIsAnonymous ? "Anonim" : editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#1A1A1A] text-base sm:text-sm font-bold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5] disabled:opacity-60"
                  placeholder="Nama pengirim..."
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                  ISI PESAN DUKUNGAN
                </label>
                <textarea
                  rows={4}
                  value={editMessageText}
                  onChange={(e) => setEditMessageText(e.target.value)}
                  required
                  className="w-full p-3 border-2 border-[#1A1A1A] text-base sm:text-sm font-semibold shadow-[2px_2px_0px_#1A1A1A] focus:outline-none bg-[#FAF9F5]"
                  placeholder="Tuliskan kata-kata penyemangat..."
                />
              </div>

              {/* Note Background Color Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>WARNA KERTAS NOTE</span>
                  </label>
                  <span className="text-[11px] font-bold text-neutral-600">
                    {NOTE_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === editColor.toLowerCase())?.name || "Kustom / Bawaan"}
                  </span>
                </div>

                {/* Interactive Clickable Swatches */}
                <div className="p-2.5 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center gap-2 flex-wrap">
                  {NOTE_COLOR_PRESETS.map((preset) => {
                    const isSelected = editColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setEditColor(preset.hex)}
                        title={preset.name}
                        aria-label={`Pilih warna ${preset.name}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 border-2 border-[#1A1A1A] transition-transform flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? "scale-110 shadow-[2px_2px_0px_#1A1A1A] ring-2 ring-[#1A1A1A]"
                            : "hover:scale-105 shadow-[1px_1px_0px_#1A1A1A]"
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-[#1A1A1A] stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status & Likes Counter Row */}
              <div className="grid grid-cols-2 gap-3.5 items-stretch">
                {/* Status Selection */}
                <div className="flex flex-col justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                    STATUS MODERASI
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as MessageStatus)}
                    className="w-full h-11 px-3 border-2 border-black text-xs font-bold shadow-[2px_2px_0px_#000] focus:outline-none bg-[#FAF9F5] cursor-pointer"
                  >
                    <option value="pending">Menunggu Review</option>
                    <option value="approved">Disetujui (Live)</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>

                {/* Likes Stepper */}
                <div className="flex flex-col justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#1A1A1A] mb-1.5">
                    JUMLAH LOVE (HATI)
                  </label>
                  <div className="inline-flex items-center border-2 border-black shadow-[2px_2px_0px_#000] h-11 w-full bg-[#FAF9F5] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEditLikes((l) => Math.max(0, l - 1))}
                      className="w-10 h-full bg-white hover:bg-neutral-100 border-r-2 border-black flex items-center justify-center font-bold text-[#1A1A1A] active:bg-neutral-200 transition-colors shrink-0"
                      title="Kurangi 1 Love"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={editLikes}
                      onChange={(e) => setEditLikes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-full text-center text-xs font-bold focus:outline-none bg-transparent tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setEditLikes((l) => l + 1)}
                      className="w-10 h-full bg-white hover:bg-neutral-100 border-l-2 border-black flex items-center justify-center font-bold text-[#1A1A1A] active:bg-neutral-200 transition-colors shrink-0"
                      title="Tambah 1 Love"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pin to Top Toggle Checkbox */}
              <div className="p-3 bg-[#FAF9F5] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#FFF066] border border-[#1A1A1A] flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_#1A1A1A]">
                    <Pin className="w-3.5 h-3.5 stroke-[2.5] text-[#1A1A1A]" />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-pin-checkbox"
                      className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] cursor-pointer block"
                    >
                      Sematkan Pesan (Pin to Top)
                    </label>
                    <p className="text-[11px] font-bold text-neutral-500">
                      Pesan akan selalu berada di urutan paling atas cheer wall publik
                    </p>
                  </div>
                </div>
                <input
                  id="edit-pin-checkbox"
                  type="checkbox"
                  checked={editIsPinned}
                  onChange={(e) => setEditIsPinned(e.target.checked)}
                  className="w-4 h-4 accent-[#1A1A1A] border-2 border-[#1A1A1A] cursor-pointer"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1A1A1A]/15">
                <button
                  type="button"
                  onClick={() => setEditingMessage(null)}
                  className="nb-btn px-4 py-2 bg-white hover:bg-neutral-100 text-xs font-bold border-2 border-[#1A1A1A]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="nb-btn px-5 py-2 bg-[#BBF7D0] hover:bg-[#86EFAC] text-[#14532D] text-xs font-black uppercase tracking-wide border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]"
                >
                  {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Destructive Overwrite Confirmation Modal */}
      {isImportConfirmOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white border-[3px] border-[#1A1A1A] shadow-[8px_8px_0px_#1A1A1A] p-6 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 mb-4 border-b-2 border-black text-rose-600">
              <div className="w-9 h-9 bg-rose-100 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]">
                <AlertTriangle className="w-5 h-5 text-rose-600 stroke-[2.5]" />
              </div>
              <h3 id="import-modal-title" className="text-base sm:text-lg font-black uppercase tracking-wide text-black leading-tight">
                ⚠️ Timpa Semua Pesan?
              </h3>
            </div>

            {/* Body */}
            <div className="space-y-3 mb-6">
              <p className="text-xs sm:text-sm font-semibold text-neutral-700 leading-relaxed">
                Mengimpor berkas ini akan <strong className="font-black text-black">menghapus seluruh kata-kata dan pesan cheer wall yang ada saat ini</strong> dan menggantikannya dengan isi file JSON. Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="p-3 bg-neutral-100 border-2 border-black shadow-[2px_2px_0px_#000] text-xs space-y-1">
                <div className="flex justify-between font-bold text-neutral-600">
                  <span>Pesan baru akan dimuat:</span>
                  <span className="font-black text-black">{pendingImportMessages.length} pesan</span>
                </div>
                <div className="flex justify-between font-bold text-neutral-600">
                  <span>Pesan saat ini di database:</span>
                  <span className="font-black text-rose-600">{stats.total} pesan (akan dihapus)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="cancel-import-button"
                disabled={isImporting}
                onClick={() => {
                  setIsImportConfirmOpen(false);
                  setPendingImportMessages([]);
                }}
                className="nb-btn px-4 py-2 bg-white hover:bg-neutral-100 text-xs sm:text-sm font-bold border-2 border-black shadow-[2px_2px_0px_#000] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                id="confirm-import-button"
                disabled={isImporting}
                onClick={handleExecuteImport}
                className="nb-btn px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-black border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengimpor...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Timpa Semua Pesan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
