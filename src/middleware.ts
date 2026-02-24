import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyToken } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/auth/v2/login", "/api/auth/login"];

// Routes that should redirect to home if authenticated
const AUTH_ROUTES = ["/auth/v2/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    return NextResponse.next();
  }

  // For protected routes, check authentication
  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = await verifyToken(token);
  if (!payload) {
    // Invalid token, redirect to login
    const loginUrl = new URL("/auth/v2/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth-token");
    return response;
  }

  // Token is valid, allow access
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
