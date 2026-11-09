import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SECRET,
  ADMIN_COOKIE_NAME,
  getAdminToken,
  verifyAdminSession,
  isHttps,
  getCorsHeaders,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: Request) {
  const isAuthorized = await verifyAdminSession(request);
  return NextResponse.json(
    { authenticated: isAuthorized },
    { headers: getCorsHeaders(request) }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, remember_me } = body;

    if (!password || password.trim() !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: "Passcode admin salah. Silakan coba lagi!" },
        { status: 401, headers: getCorsHeaders(request) }
      );
    }

    const token = getAdminToken();
    const secureCookie = isHttps(request);
    const isRemembered = Boolean(remember_me);

    // Cookie options: If remember_me is true, keep for 30 days; otherwise Session Cookie
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge?: number;
    } = {
      httpOnly: true,
      secure: secureCookie, // Only require HTTPS when the request itself was made over HTTPS
      sameSite: "lax",
      path: "/",
    };

    if (isRemembered) {
      cookieOptions.maxAge = 60 * 60 * 24 * 30; // 30 days extended session
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, token, cookieOptions);

    return NextResponse.json(
      {
        success: true,
        token: token,
        remember_me: isRemembered,
        message: "Berhasil masuk sebagai Admin",
      },
      { headers: getCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat memproses login" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json(
    { success: true, message: "Berhasil keluar dari sesi admin" },
    { headers: getCorsHeaders(request) }
  );
}
