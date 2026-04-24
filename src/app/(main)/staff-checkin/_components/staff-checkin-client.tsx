/* eslint-disable complexity, max-lines */
"use client";

import React from "react";

import dynamic from "next/dynamic";

import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { AlertCircle, CheckCircle2, CircleAlert, Copy, Keyboard, MapPin, QrCode, ScanLine, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type StaffCheckinTier, type StaffCheckinZone } from "@/lib/staff-checkin";
import { cn } from "@/lib/utils";

const QrScanner = dynamic(async () => (await import("@yudiel/react-qr-scanner")).Scanner, {
  ssr: false,
});

type StaffCheckinSnapshot = {
  zones: StaffCheckinZone[];
  history: StaffHistoryItem[];
  stats: {
    total: { current: number; max: number };
    gold: { current: number; max: number };
    ruby: { current: number; max: number };
    vip: { current: number; max: number };
  };
};

type StaffGuest = {
  code: string;
  name: string;
  phone: string;
  tier: StaffCheckinTier;
  ticketClass: string;
  zoneId: string;
  zoneName: string;
  checkedIn: boolean;
  checkinTime: string | null;
};

type StaffHistoryItem = {
  id: number | string;
  name: string;
  phone: string;
  code: string;
  tier: StaffCheckinTier;
  ticketClass: string;
  zoneId: string;
  zoneName: string;
  time: string | null;
  status?: "success" | "repeat" | "denied" | "error";
};

type StaffCheckinResponse = {
  data?: {
    status?: "success" | "repeat" | "denied" | "error";
    message?: string;
    guest?: StaffGuest;
    history?: StaffHistoryItem[];
    stats?: StaffCheckinSnapshot["stats"];
  };
  message?: string;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

const tierTheme: Record<StaffCheckinTier, { label: string; color: string; badgeClass: string }> = {
  GOLD: {
    label: "Gold",
    color: "#8B7355",
    badgeClass: "border-[#8B735540] bg-[#8B735518] text-[#d5b48c]",
  },
  RUBY: {
    label: "Ruby",
    color: "#d8ab2b",
    badgeClass: "border-[#d8ab2b40] bg-[#d8ab2b18] text-[#ffd978]",
  },
  VIP: {
    label: "VIP",
    color: "#C41E7F",
    badgeClass: "border-[#C41E7F40] bg-[#C41E7F18] text-[#ff86c8]",
  },
};

function formatTimeLabel(value: string | null): string {
  if (!value) {
    return "--:--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildLocalHistoryItem(guest: StaffGuest, status: "success" | "repeat" | "denied" | "error"): StaffHistoryItem {
  return {
    id: `local-${Date.now()}`,
    name: guest.name,
    phone: guest.phone,
    code: guest.code,
    tier: guest.tier,
    ticketClass: guest.ticketClass,
    zoneId: guest.zoneId,
    zoneName: guest.zoneName,
    time: new Date().toISOString(),
    status,
  };
}

function mergeHistoryItems(serverHistory: StaffHistoryItem[] | undefined, nextItem?: StaffHistoryItem) {
  const base = serverHistory ?? [];
  if (!nextItem) {
    return base;
  }

  return [nextItem, ...base].slice(0, 20);
}

function getResultTheme(status: "success" | "repeat" | "denied" | "error") {
  if (status === "success") {
    return {
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconClass: "bg-emerald-500 text-white",
      borderClass: "border-emerald-400/30 bg-emerald-400/8",
      titleClass: "text-emerald-300",
    };
  }

  if (status === "repeat") {
    return {
      icon: <CircleAlert className="h-5 w-5" />,
      iconClass: "bg-amber-500 text-white",
      borderClass: "border-amber-400/30 bg-amber-400/8",
      titleClass: "text-amber-300",
    };
  }

  return {
    icon: <AlertCircle className="h-5 w-5" />,
    iconClass: "bg-rose-500 text-white",
    borderClass: "border-rose-400/30 bg-rose-400/8",
    titleClass: "text-rose-300",
  };
}

function ZoneGlyph({ zoneId, active }: { zoneId: string; active: boolean }) {
  const stroke = active ? "#ffffff" : "#72727d";

  if (zoneId === "coach") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (zoneId === "seminar") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    );
  }

  return <MapPin className="h-[18px] w-[18px]" color={stroke} />;
}

async function createQrDetector() {
  const nativeCtor = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

  if (nativeCtor) {
    return new nativeCtor({ formats: ["qr_code"] });
  }

  const detectorModule = (await import("barcode-detector")) as { BarcodeDetector: BarcodeDetectorCtor };
  return new detectorModule.BarcodeDetector({ formats: ["qr_code"] });
}

async function extractQrValueFromFile(file: File) {
  const detector = await createQrDetector();
  const bitmap = await createImageBitmap(file);

  try {
    const results = await detector.detect(bitmap);
    return results[0]?.rawValue?.trim() ?? "";
  } finally {
    if ("close" in bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }
  }
}

export default function StaffCheckinClient() {
  const [zones, setZones] = React.useState<StaffCheckinZone[]>([]);
  const [activeZone, setActiveZone] = React.useState<string>("");
  const [mode, setMode] = React.useState<"scan" | "manual">("scan");
  const [manualCode, setManualCode] = React.useState<string>("");
  const [scannerEnabled, setScannerEnabled] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [loadingSnapshot, setLoadingSnapshot] = React.useState<boolean>(true);
  const [history, setHistory] = React.useState<StaffHistoryItem[]>([]);
  const [stats, setStats] = React.useState<StaffCheckinSnapshot["stats"]>({
    total: { current: 0, max: 0 },
    gold: { current: 0, max: 0 },
    ruby: { current: 0, max: 0 },
    vip: { current: 0, max: 0 },
  });
  const [imageScanning, setImageScanning] = React.useState<boolean>(false);
  const [selectedImageName, setSelectedImageName] = React.useState<string>("");
  const [result, setResult] = React.useState<{
    status: "success" | "repeat" | "denied" | "error";
    message: string;
    guest?: StaffGuest;
  } | null>(null);

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastScanRef = React.useRef<{ value: string; at: number } | null>(null);

  const zone = zones.find((item) => item.id === activeZone) || zones[0];
  const visibleHistory = history.filter((item) => String(item.zoneId) === String(zone?.id ?? ""));
  const busy = submitting || imageScanning;

  const loadSnapshot = React.useCallback(async () => {
    setLoadingSnapshot(true);

    try {
      const response = await fetch("/api/staff-checkin", {
        method: "GET",
        credentials: "include",
      });
      const payload = (await response.json()) as { data?: StaffCheckinSnapshot; message?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "Khong the tai du lieu check-in");
      }

      const fetchedZones = payload.data.zones || [];
      setZones(fetchedZones);
      setActiveZone(prev => {
        if (!prev && fetchedZones.length > 0) return fetchedZones[0].id;
        return prev;
      });
      
      setHistory(payload.data.history ?? []);
      setStats(
        payload.data.stats ?? {
          total: { current: 0, max: 0 },
          gold: { current: 0, max: 0 },
          ruby: { current: 0, max: 0 },
          vip: { current: 0, max: 0 },
        },
      );
    } catch (error) {
      console.error("Staff check-in snapshot error:", error);
      toast.error(error instanceof Error ? error.message : "Khong the tai du lieu check-in");
    } finally {
      setLoadingSnapshot(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  React.useEffect(() => {
    if (!result) {
      return;
    }

    const timer = window.setTimeout(() => setResult(null), 6000);
    return () => window.clearTimeout(timer);
  }, [result]);

  const submitCheckin = React.useCallback(
    async (body: { payload?: string; code?: string }) => {
      if (submitting) {
        return;
      }

      setSubmitting(true);
      setResult(null);

      try {
        const response = await fetch("/api/staff-checkin", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...body,
            zoneId: activeZone,
          }),
        });
        const payload = (await response.json()) as StaffCheckinResponse;

        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "Khong the xu ly check-in");
        }

        const nextStatus = payload.data.status ?? "error";
        const nextMessage = payload.data.message ?? "Khong the xu ly check-in";
        setResult({
          status: nextStatus,
          message: nextMessage,
          guest: payload.data.guest,
        });

        if (payload.data.stats) {
          setStats(payload.data.stats);
        }

        setHistory(
          mergeHistoryItems(
            payload.data.history,
            payload.data.guest && nextStatus !== "success"
              ? buildLocalHistoryItem(payload.data.guest, nextStatus)
              : undefined,
          ),
        );

        if (nextStatus === "success") {
          toast.success(nextMessage);
        } else if (nextStatus === "repeat" || nextStatus === "denied") {
          toast.message(nextMessage);
        } else {
          toast.error(nextMessage);
        }
      } catch (error) {
        console.error("Staff check-in submit error:", error);
        const message = error instanceof Error ? error.message : "Khong the xu ly check-in";
        setResult({ status: "error", message });
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    },
    [activeZone, submitting],
  );

  const handleScan = React.useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (!scannerEnabled || busy) {
        return;
      }

      const nextValue = detectedCodes[0]?.rawValue?.trim();
      if (!nextValue) {
        return;
      }

      const now = Date.now();
      if (lastScanRef.current && lastScanRef.current.value === nextValue && now - lastScanRef.current.at < 2500) {
        return;
      }

      lastScanRef.current = { value: nextValue, at: now };
      setScannerEnabled(false);
      await submitCheckin({ payload: nextValue });
    },
    [busy, scannerEnabled, submitCheckin],
  );

  const handleManualSubmit = async () => {
    const nextCode = manualCode.trim().toUpperCase();
    if (!nextCode) {
      return;
    }

    await submitCheckin({ code: nextCode });
    setManualCode("");
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) {
      return;
    }

    setResult(null);
    setSelectedImageName(file.name);
    setImageScanning(true);
    setScannerEnabled(false);

    try {
      const payload = await extractQrValueFromFile(file);
      if (!payload) {
        throw new Error("Không tìm thấy mã QR trong ảnh");
      }

      await submitCheckin({ payload });
    } catch (error) {
      console.error("Staff image scan error:", error);
      const message = error instanceof Error ? error.message : "Không thể đọc mã QR từ ảnh";
      setResult({ status: "error", message });
      toast.error(message);
    } finally {
      setImageScanning(false);
    }
  };

  if (!zone) {
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mb-4 h-8 w-8 animate-spin" />
        <p>Đang tải dữ liệu check-in...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleImageSelect(event);
        }}
      />

      <div className="overflow-hidden rounded-[30px] border border-[#232331] bg-[radial-gradient(circle_at_top,#181825_0%,#0f0f18_54%,#09090f_100%)] p-5 text-white shadow-[0_30px_90px_rgba(10,10,18,0.35)] md:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-[11px] font-semibold tracking-[0.34em] text-[#ff4ab6] uppercase">
              Staff Portal
            </div>
            <div className="text-3xl leading-none font-black tracking-tight">Check-in</div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-400">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.8)]" />
            Online
          </div>
        </div>

        <div className="mb-3 text-sm font-medium text-[#b3b0ba]">Khu vực đang check-in</div>
        <div className="mb-5 flex flex-row gap-2 sm:gap-3 overflow-x-auto pb-4 custom-scrollbar">
          {zones.map((item) => {
            const active = item.id === activeZone;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === activeZone) {
                    return;
                  }

                  setActiveZone(item.id);
                  setResult(null);
                  void loadSnapshot();
                }}
                className={cn(
                  "shrink-0 w-[110px] sm:w-[140px] rounded-[24px] border bg-[#15151f] px-1 py-3 text-left transition-all sm:px-4 sm:py-5",
                  active ? "border-[#ff3caf] shadow-[0_0_0_1px_rgba(255,60,175,0.18)_inset]" : "border-white/8",
                )}
              >
                <div className="mb-3 flex justify-center">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[16px]"
                    style={{
                      background: active
                        ? `linear-gradient(135deg, ${item.color}, ${item.color}b8)`
                        : "rgba(255,255,255,0.06)",
                    }}
                  >
                    <ZoneGlyph zoneId={item.id} active={active} />
                  </div>
                </div>
                <div
                  className={cn(
                    "text-center text-[12px] font-bold sm:text-[15px]",
                    active ? "text-white" : "text-white/70",
                  )}
                >
                  {item.name}
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {item.tiers.map((tier) => (
                    <span
                      key={tier}
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ background: tierTheme[tier]?.color || "#ccc" }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mb-5 grid grid-cols-4 overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.03]">
          {[
            { label: "Tổng", count: `${stats.total.current}/${stats.total.max}`, percent: "", color: "text-white" },
            {
              label: "Gold",
              count: `${stats.gold.current}/${stats.gold.max}`,
              percent: `${Math.round((stats.gold.current / (stats.gold.max || 1)) * 100)}%`,
              color: "text-[#d5b48c]",
            },
            {
              label: "Ruby",
              count: `${stats.ruby.current}/${stats.ruby.max}`,
              percent: `${Math.round((stats.ruby.current / (stats.ruby.max || 1)) * 100)}%`,
              color: "text-[#ffd978]",
            },
            {
              label: "VIP",
              count: `${stats.vip.current}/${stats.vip.max}`,
              percent: `${Math.round((stats.vip.current / (stats.vip.max || 1)) * 100)}%`,
              color: "text-[#ff4ab6]",
            },
          ].map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "flex flex-col justify-center px-1 py-3 text-center sm:px-4 sm:py-4",
                index < 3 ? "border-r border-white/8" : "",
              )}
            >
              <div className={cn("text-[13px] font-black sm:text-[18px]", item.color)}>{item.count}</div>
              {item.percent ? (
                <div className={cn("mt-0.5 text-[10px] font-bold opacity-80 sm:text-[12px]", item.color)}>
                  {item.percent}
                </div>
              ) : null}
              <div className="mt-1 text-[10px] text-white/45 sm:text-[11px]">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-[20px] bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("scan");
              setResult(null);
            }}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-[16px] text-lg font-bold transition",
              mode === "scan" ? "bg-[linear-gradient(135deg,#c41e7f,#e23ca2)] text-white" : "text-white/55",
            )}
          >
            <ScanLine className="h-5 w-5" />
            Quét QR
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              setResult(null);
              setScannerEnabled(false);
            }}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-[16px] text-lg font-bold transition",
              mode === "manual" ? "bg-[linear-gradient(135deg,#c41e7f,#e23ca2)] text-white" : "text-white/55",
            )}
          >
            <Keyboard className="h-5 w-5" />
            Nhập mã vé
          </button>
        </div>

        {mode === "scan" ? (
          <div className="mb-4 flex flex-col items-center">
            <div className="relative w-full max-w-[280px] overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,rgba(9,9,15,0.92)_65%)] p-4">
              <div className="relative aspect-square rounded-[26px] border border-white/8 bg-[#101018]">
                {scannerEnabled ? (
                  <QrScanner
                    paused={busy}
                    onScan={handleScan}
                    onError={(error) => {
                      console.error("Staff scanner error:", error);
                    }}
                    scanDelay={800}
                    allowMultiple={false}
                    styles={{
                      container: {
                        width: "100%",
                        height: "100%",
                      },
                      video: {
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      },
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,rgba(0,0,0,0.55)_100%)]" />
                    <div className="pointer-events-none absolute inset-x-8 top-1/2 h-[2px] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,#ff4ab6,transparent)] shadow-[0_0_24px_rgba(255,74,182,0.45)]" />
                  </QrScanner>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03]">
                      <QrCode className="h-8 w-8 text-white/25" />
                    </div>
                    <div className="text-[13px] text-white/32">Hướng camera vào mã QR</div>
                    {selectedImageName ? (
                      <div className="max-w-[80%] truncate text-[11px] text-white/48">
                        Ảnh vừa chọn: {selectedImageName}
                      </div>
                    ) : null}
                  </div>
                )}

                {[
                  "left-8 top-8 border-l-[4px] border-t-[4px] rounded-tl-[14px]",
                  "right-8 top-8 border-r-[4px] border-t-[4px] rounded-tr-[14px]",
                  "bottom-8 left-8 border-b-[4px] border-l-[4px] rounded-bl-[14px]",
                  "bottom-8 right-8 border-b-[4px] border-r-[4px] rounded-br-[14px]",
                ].map((className) => (
                  <div
                    key={className}
                    className={cn("pointer-events-none absolute h-12 w-12 border-white/28", className)}
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              disabled={busy}
              onClick={() => setScannerEnabled((current) => !current)}
              className={cn(
                "mt-4 h-14 w-full rounded-[20px] text-[17px] font-bold",
                scannerEnabled
                  ? "bg-white/8 text-white hover:bg-white/12"
                  : "bg-[linear-gradient(135deg,#c41e7f,#e23ca2)] text-white hover:opacity-95",
              )}
            >
              {busy ? "Đang xử lý..." : scannerEnabled ? "Dừng quét QR" : "Bắt đầu quét QR"}
            </Button>

            <button
              type="button"
              disabled={busy}
              onClick={() => imageInputRef.current?.click()}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] text-sm font-semibold text-white/75 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {imageScanning ? "Đang đọc ảnh..." : "Chọn ảnh từ máy để quét"}
            </button>
          </div>
        ) : (
          <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 text-sm font-semibold text-white">Nhập mã vé khách hàng</div>
            <Input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleManualSubmit();
                }
              }}
              placeholder="DHMN4S154"
              className="h-14 rounded-[18px] border-white/10 bg-black/20 text-center text-lg font-semibold tracking-[0.18em] text-white placeholder:text-white/25"
            />
            <div className="mt-2 text-center text-xs text-white/40">
              Nhập mã vé khi mã QR không quét được.
            </div>
            <Button
              type="button"
              disabled={!manualCode.trim() || busy}
              onClick={() => {
                void handleManualSubmit();
              }}
              className="mt-4 h-14 w-full rounded-[20px] bg-[linear-gradient(135deg,#c41e7f,#e23ca2)] text-[17px] font-bold text-white hover:opacity-95 disabled:bg-white/8 disabled:text-white/35"
            >
              {busy ? "Đang xử lý..." : "Xác nhận check-in"}
            </Button>
          </div>
        )}

        {result ? (
          <div className={cn("mb-4 overflow-hidden rounded-[22px] border", getResultTheme(result.status).borderClass)}>
            <div className="flex items-start gap-3 border-b border-white/8 px-4 py-4">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  getResultTheme(result.status).iconClass,
                )}
              >
                {getResultTheme(result.status).icon}
              </div>
              <div className="min-w-0">
                <div className={cn("text-base font-bold", getResultTheme(result.status).titleClass)}>
                  {result.message}
                </div>
                <div className="mt-1 text-xs text-white/55">{zone.name}</div>
              </div>
            </div>

            {result.guest ? (
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold text-white">{result.guest.name}</div>
                  <div className="mt-1 text-sm text-white/65">{result.guest.phone}</div>
                  <div className="mt-1 text-xs text-white/45">{result.guest.code}</div>
                </div>
                <div
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-bold",
                    tierTheme[result.guest.tier]?.badgeClass,
                  )}
                >
                  {tierTheme[result.guest.tier]?.label}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-[22px] border border-white/8 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div className="text-[12px] font-bold text-white sm:text-[15px]">Lịch sử check-in</div>
            <div className="text-sm text-white/45">{loadingSnapshot ? "Đang tải..." : `${visibleHistory.length} lượt`}</div>
          </div>

          <div className="px-4 py-4">
            {visibleHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center text-white/38">
                <QrCode className="h-8 w-8 opacity-35" />
                <div>Chưa có check-in nào</div>
              </div>
            ) : (
              <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto pr-1">
                {visibleHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 pr-2">
                      <div
                        className={cn(
                          "mt-1.5 h-3 w-3 shrink-0 rounded-full",
                          item.status === "repeat"
                            ? "bg-amber-400"
                            : item.status === "denied" || item.status === "error"
                              ? "bg-rose-400"
                              : "bg-emerald-400",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold break-words text-white">{item.name}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <div
                            className={cn(
                              "rounded-full border px-2 py-[1px] text-[11px] font-bold",
                              tierTheme[item.tier]?.badgeClass,
                            )}
                          >
                            {tierTheme[item.tier]?.label}
                          </div>
                          <div className="text-[13px] break-words text-white/58">{item.zoneName || zone.name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(item.code);
                            toast.success("Đã copy mã vé");
                          } catch {
                            toast.error("Không thể copy mã vé");
                          }
                        }}
                        className="rounded-lg border border-white/8 p-1.5 text-white/55 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <div className="mt-1 mr-1 text-[12px] font-medium text-white/50">
                        {formatTimeLabel(item.time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
