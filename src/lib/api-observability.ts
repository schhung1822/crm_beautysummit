import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

type LogMeta = Record<string, unknown>;
const API_TRACE_ENABLED = process.env.API_TRACE_LOG === "true";

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

function cleanMeta(meta: LogMeta): LogMeta {
  return Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== undefined));
}

export function maskPhoneForLogs(value?: string | null): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.length <= 6) {
    return digits;
  }

  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

export function shortIdForLogs(value?: string | null): string {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.length <= 12) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 6)}...${normalizedValue.slice(-4)}`;
}

export function createApiTrace(scope: string, meta: LogMeta = {}) {
  const requestId = randomUUID().slice(0, 8);
  const startedAt = performance.now();

  if (API_TRACE_ENABLED) {
    console.log(`[api][${scope}] start`, cleanMeta({ requestId, ...meta }));
  }

  return {
    requestId,
    mark(event: string, eventMeta: LogMeta = {}) {
      if (API_TRACE_ENABLED) {
        console.log(
          `[api][${scope}] ${event}`,
          cleanMeta({
            requestId,
            elapsedMs: roundMs(performance.now() - startedAt),
            ...eventMeta,
          }),
        );
      }
    },
    async step<T>(event: string, fn: () => Promise<T>, eventMeta: LogMeta = {}): Promise<T> {
      const stepStartedAt = performance.now();

      try {
        const result = await fn();
        if (API_TRACE_ENABLED) {
          console.log(
            `[api][${scope}] ${event}`,
            cleanMeta({
              requestId,
              stepMs: roundMs(performance.now() - stepStartedAt),
              ...eventMeta,
            }),
          );
        }
        return result;
      } catch (error) {
        if (API_TRACE_ENABLED) {
          console.error(
            `[api][${scope}] ${event}:error`,
            cleanMeta({
              requestId,
              stepMs: roundMs(performance.now() - stepStartedAt),
              ...eventMeta,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
        throw error;
      }
    },
    done(eventMeta: LogMeta = {}) {
      if (API_TRACE_ENABLED) {
        console.log(
          `[api][${scope}] done`,
          cleanMeta({
            requestId,
            totalMs: roundMs(performance.now() - startedAt),
            ...eventMeta,
          }),
        );
      }
    },
    fail(error: unknown, eventMeta: LogMeta = {}) {
      if (API_TRACE_ENABLED) {
        console.error(
          `[api][${scope}] fail`,
          cleanMeta({
            requestId,
            totalMs: roundMs(performance.now() - startedAt),
            ...eventMeta,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    },
  };
}
