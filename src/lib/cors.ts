import type { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://h5.zdn.vn",
  "https://mini.zalo.me",
  "https://miniapp.zalo.me",
];

const ZALO_ALLOWED_SUFFIXES = [".zdn.vn", ".zalo.me"];

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, "");

const isLocalOrigin = (hostname: string): boolean => hostname === "localhost" || hostname === "127.0.0.1";

export const getAllowedOrigins = (): string[] => {
  const configuredOrigins = (process.env.MINIAPP_ORIGIN ?? "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]));
};

export const isAllowedCorsOrigin = (origin: string | null): boolean => {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (getAllowedOrigins().includes(normalizedOrigin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(normalizedOrigin);

    if (protocol !== "https:" && !isLocalOrigin(hostname)) {
      return false;
    }

    return (
      isLocalOrigin(hostname) ||
      ZALO_ALLOWED_SUFFIXES.some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
};

export const buildCorsHeaders = (
  request: NextRequest,
  methods: string[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
): Record<string, string> => {
  const requestOrigin = request.headers.get("origin");
  const fallbackOrigin = getAllowedOrigins()[0] || DEFAULT_ALLOWED_ORIGINS[0];
  const allowOrigin =
    requestOrigin && isAllowedCorsOrigin(requestOrigin) ? normalizeOrigin(requestOrigin) : fallbackOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": methods.join(", "),
    Vary: "Origin",
  };
};

export const applyCorsHeaders = (request: NextRequest, response: NextResponse, methods?: string[]): NextResponse => {
  for (const [key, value] of Object.entries(buildCorsHeaders(request, methods))) {
    response.headers.set(key, value);
  }

  return response;
};
