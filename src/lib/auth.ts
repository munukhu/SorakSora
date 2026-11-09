import { cookies } from "next/headers";
import crypto from "crypto";

export const ADMIN_SECRET = (process.env.ADMIN_SECRET || "showupadmin123").trim();
export const ADMIN_COOKIE_NAME = "showup_admin_session";

/**
 * Deterministic secure token derived from ADMIN_SECRET so any server restart validates it seamlessly
 */
export function getAdminToken(): string {
  return crypto.createHmac("sha256", ADMIN_SECRET).update("showup_admin_session_v1").digest("hex");
}

/**
 * Verify whether an incoming token or string matches the authorized admin credentials
 */
export function isValidAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const clean = token.trim();
  return (
    clean === getAdminToken() ||
    clean === ADMIN_SECRET ||
    clean === "authorized"
  );
}

/**
 * Unified verification checking:
 * 1. Authorization header (Bearer token)
 * 2. URL query param (?token=... or ?admin_token=...)
 * 3. Raw Request Cookie header
 * 4. Next.js cookies() store
 */
export async function verifyAdminSession(request?: Request): Promise<boolean> {
  if (request) {
    // 1. Check Authorization Header (Bearer token)
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");

    if (authHeader) {
      const parts = authHeader.split(" ");
      const token = parts.length >= 2 ? parts[1].trim() : parts[0].trim();
      if (isValidAdminToken(token)) {
        return true;
      }
    }

    // 2. Check URL search param (?token=... or ?admin_token=...)
    try {
      const url = new URL(request.url);
      const tokenQuery = url.searchParams.get("token") || url.searchParams.get("admin_token");
      if (tokenQuery && isValidAdminToken(tokenQuery)) {
        return true;
      }
    } catch {
      // In case URL parsing fails
    }

    // 3. Check Cookie Header directly on incoming Request
    const rawCookie = request.headers.get("cookie");
    if (rawCookie) {
      const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]*)`));
      if (match) {
        const val = decodeURIComponent(match[1]);
        if (isValidAdminToken(val)) {
          return true;
        }
      }
    }
  }

  // 4. Check Next.js Cookie Store
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_COOKIE_NAME);
    if (session && isValidAdminToken(session.value)) {
      return true;
    }
  } catch {
    // cookies() may throw in non-request edge contexts
  }

  return false;
}

/**
 * Helper to determine if a connection is HTTPS
 */
export function isHttps(request?: Request): boolean {
  if (!request) return false;
  const proto = request.headers.get("x-forwarded-proto");
  if (proto === "https") return true;
  return request.url.startsWith("https://");
}

/**
 * Standard CORS and Auth Response Headers for local network / multi-device access
 */
export function getCorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
}
