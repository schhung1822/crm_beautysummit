import { NextResponse, type NextRequest } from "next/server";

import { verifyToken } from "@/lib/auth";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/auth/v2/login",
  "/api/auth/login",
  "/api/auth/zalo-miniapp",
  "/api/miniapp/bootstrap",
  "/api/miniapp/tickets",
  "/api/miniapp/rewards",
  "/api/bootstrap",
  "/api/tickets",
  "/api/rewards",
  "/api/webhook/zalo-miniapp",
];

// Routes that should redirect to home if authenticated
const AUTH_ROUTES = ["/auth/v2/login"];

// eslint-disable-next-line complexity
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(request),
    });
  }

  // Get token from cookie
  const token = request.cookies.get("auth-token")?.value;

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Check if the route is an auth route (login page)
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // If user is authenticated and trying to access login page
  if (token && isAuthRoute) {
    const payload = await verifyToken(token);
    if (payload) {
      // Redirect to default dashboard if already authenticated
      return NextResponse.redirect(new URL("/dashboard/default", request.url));
    }
  }

  // If route is public, allow access
  if (isPublicRoute) {
    const response = NextResponse.next();
    return isApiRoute ? applyCorsHeaders(request, response) : response;
  }

  // For protected routes, check authentication
  if (!token) {
    if (isApiRoute) {
      return applyCorsHeaders(request, NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }

    // Redirect to login if not authenticated
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = await verifyToken(token);
  if (!payload) {
    if (isApiRoute) {
      const response = NextResponse.json({ message: "Invalid auth token" }, { status: 401 });
      response.cookies.delete("auth-token");
      return applyCorsHeaders(request, response);
    }

    // Invalid token, redirect to login
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");
    return response;
  }

  // Token is valid, check role
  const role = payload.role as string | undefined;

  if (role === "staff") {
    const allowedPaths = ["/staff-checkin"];
    const allowedApiPaths = ["/api/staff", "/api/auth"];

    const isAllowedPage = allowedPaths.some((p) => pathname.startsWith(p));
    const isAllowedApi = allowedApiPaths.some((p) => pathname.startsWith(p));

    if (!isAllowedPage && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/staff-checkin", request.url));
    }

    if (pathname.startsWith("/api/") && !isAllowedApi) {
      const response = NextResponse.json({ error: "Chỉ dành cho quản trị viên" }, { status: 403 });
      return applyCorsHeaders(request, response);
    }
  }

  // Token is valid, allow access
  const response = NextResponse.next();
  return isApiRoute ? applyCorsHeaders(request, response) : response;
}

// Configure which routes to run proxy on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/upload (bypass proxy to prevent stream disturbance)
     */
    "/((?!api/upload|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
