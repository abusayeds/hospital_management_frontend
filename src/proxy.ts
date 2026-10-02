import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard (Next.js 16 "proxy", formerly "middleware"). Runs before a
 * protected page renders: no session cookie → straight to /login.
 *
 * It only checks that a session EXISTS; it cannot tell which role the user has.
 * The role check (403 page) happens in the app shell with /auth/me, and the API
 * enforces permissions on every request — this guard is for user experience.
 */
const SESSION_COOKIE = "tl_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL(request.nextUrl.pathname.startsWith("/patient") ? "/login/patient" : "/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/management/:path*",
    "/reception/:path*",
    "/doctor/:path*",
    "/nurse/:path*",
    "/lab/:path*",
    "/pharmacy/:path*",
    "/accounts/:path*",
    "/patient/:path*",
    "/change-password",
    "/print/:path*",
  ],
};
