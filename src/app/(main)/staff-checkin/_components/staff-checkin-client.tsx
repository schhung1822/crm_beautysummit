/* eslint-disable complexity, max-lines */
"use client";

import React from "react";

import dynamic from "next/dynamic";

import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import {
  AlertCircle,
  CheckCircle2,
  CircleAlert,
  Copy,
  Gift,
  Keyboard,
  MapPin,
  QrCode,
  ScanLine,
  Upload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  normalizeTicketCode,
  parseStaffQrPayload,
  type StaffCheckinTier,
  type StaffCheckinZone,
} from "@/lib/staff-checkin";
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

type StaffGiftItem = {
  id: number;
  giftName: string;
  status: 0 | 1;
  statusLabel: string;
};

type StaffGiftLookup = {
  ordercode: string;
  voucher: string;
  customerName: string;
  gifts: StaffGiftItem[];
};

type StaffGiftResponse = {
  data?: StaffGiftLookup;
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

function formatDateTimeLabel(value: string | null): string {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
      iconClass: "bg-emerald-500 text-white shadow-[0_0_22px_rgba(16,185,129,0.65)]",
      borderClass:
        "border-emerald-400/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.3),transparent_42%),linear-gradient(135deg,#061c16,#07120f_48%,#020403)] text-white shadow-emerald-500/25",
      titleClass: "from-emerald-200 to-teal-300",
      accentClass: "bg-gradient-to-r from-transparent via-emerald-300 to-transparent",
      panelClass: "border-emerald-300/25 bg-emerald-950/25",
      ticketClass: "border-emerald-200/80 text-emerald-50 shadow-[0_0_32px_rgba(16,185,129,0.5)]",
      buttonClass: "bg-emerald-500 text-white hover:bg-emerald-400",
      dotClass: "bg-emerald-300",
    };
  }

  if (status === "repeat") {
    return {
      icon: <CircleAlert className="h-5 w-5" />,
      iconClass: "bg-amber-400 text-black shadow-[0_0_22px_rgba(251,191,36,0.65)]",
      borderClass:
        "border-amber-300/70 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.32),transparent_42%),linear-gradient(135deg,#241803,#161004_48%,#050301)] text-white shadow-amber-500/25",
      titleClass: "from-amber-100 to-yellow-300",
      accentClass: "bg-gradient-to-r from-transparent via-amber-300 to-transparent",
      panelClass: "border-amber-300/25 bg-amber-950/25",
      ticketClass: "border-amber-100/80 text-amber-50 shadow-[0_0_32px_rgba(251,191,36,0.5)]",
      buttonClass: "bg-amber-400 text-black hover:bg-amber-300",
      dotClass: "bg-amber-300",
    };
  }

  return {
    icon: <AlertCircle className="h-5 w-5" />,
    iconClass: "bg-rose-500 text-white shadow-[0_0_22px_rgba(244,63,94,0.65)]",
    borderClass:
      "border-rose-400/70 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.32),transparent_42%),linear-gradient(135deg,#2b0710,#15060a_48%,#050102)] text-white shadow-rose-500/25",
    titleClass: "from-rose-100 to-red-300",
    accentClass: "bg-gradient-to-r from-transparent via-rose-300 to-transparent",
    panelClass: "border-rose-300/25 bg-rose-950/25",
    ticketClass: "border-rose-100/80 text-rose-50 shadow-[0_0_32px_rgba(244,63,94,0.5)]",
    buttonClass: "bg-rose-500 text-white hover:bg-rose-400",
    dotClass: "bg-rose-300",
  };
}

function getGiftDialogTheme() {
  return {
    iconClass: "bg-[#730C87] text-white shadow-[0_0_28px_rgba(115,12,135,0.72)]",
    borderClass:
      "border-[#9d2bb3]/70 bg-[radial-gradient(circle_at_top_left,rgba(115,12,135,0.46),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(196,30,127,0.28),transparent_42%),linear-gradient(135deg,#210328,#120116_52%,#050106)] text-white shadow-[#730C87]/35",
    titleClass: "from-[#ffe6ff] via-[#e9a5ff] to-[#c94ee0]",
    accentClass: "bg-gradient-to-r from-transparent via-[#c94ee0] to-transparent",
    panelClass: "border-[#c94ee0]/35 bg-[#730C87]/20",
    buttonClass: "bg-[#730C87] text-white hover:bg-[#8f19a6]",
    dotClass: "bg-[#c94ee0]",
  };
}

function getStatusLabel(status: "success" | "repeat" | "denied" | "error") {
  if (status === "success") {
    return "Check-in thành công";
  }

  if (status === "repeat") {
    return "Đã check-in";
  }

  return "Cảnh báo";
}

function ZoneGlyph({ zoneId, active }: { zoneId: string; active: boolean }) {
  const stroke = active ? "currentColor" : "var(--color-muted-foreground, #72727d)";

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

function getOrderCodeFromInput(value: string) {
  const parsedPayload = parseStaffQrPayload(value);
  return normalizeTicketCode(parsedPayload.ticketCode ?? value);
}

export default function StaffCheckinClient({ areaMode = "checkin" }: { areaMode?: "checkin" | "gift" }) {
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
    ticketCode?: string;
    time: string;
  } | null>(null);
  const [giftLookup, setGiftLookup] = React.useState<StaffGiftLookup | null>(null);
  const [giftSubmitting, setGiftSubmitting] = React.useState<boolean>(false);
  const [giftSelectedIds, setGiftSelectedIds] = React.useState<Set<number>>(() => new Set());

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const giftImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastScanRef = React.useRef<{ value: string; at: number } | null>(null);

  const zone = zones.find((item) => item.id === activeZone) ?? zones[0];
  const visibleHistory = history.filter((item) => String(item.zoneId) === String(zone?.id ?? ""));
  const busy = submitting || imageScanning || giftSubmitting;
  const redeemableSelectedIds = React.useMemo(() => {
    if (!giftLookup) return [];
    const pendingIds = new Set(giftLookup.gifts.filter((item) => item.status !== 1).map((item) => item.id));
    return Array.from(giftSelectedIds).filter((id) => pendingIds.has(id));
  }, [giftLookup, giftSelectedIds]);

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
      setActiveZone((prev) => {
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
          ticketCode: payload.data.guest?.code ?? body.code ?? body.payload,
          time: payload.data.guest?.checkinTime ?? new Date().toISOString(),
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
        setResult({
          status: "error",
          message,
          ticketCode: body.code ?? body.payload,
          time: new Date().toISOString(),
        });
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    },
    [activeZone, submitting],
  );

  const submitGiftLookup = React.useCallback(
    async (rawCode: string) => {
      if (giftSubmitting) {
        return;
      }

      const ordercode = getOrderCodeFromInput(rawCode);
      if (!ordercode) {
        toast.error("Vui lòng nhập mã vé hoặc quét QR");
        return;
      }

      setGiftSubmitting(true);
      setGiftSelectedIds(new Set());

      try {
        const response = await fetch(`/api/staff-gifts?ordercode=${encodeURIComponent(ordercode)}`, {
          method: "GET",
          credentials: "include",
        });
        const payload = (await response.json()) as StaffGiftResponse;

        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "Không thể tải dữ liệu đổi quà");
        }

        setGiftLookup(payload.data);
        if (payload.data.gifts.length === 0) {
          toast.message("Không tìm thấy phần quà cho mã vé này");
        }
      } catch (error) {
        console.error("Staff gift lookup error:", error);
        toast.error(error instanceof Error ? error.message : "Không thể tải dữ liệu đổi quà");
      } finally {
        setGiftSubmitting(false);
      }
    },
    [giftSubmitting],
  );

  const confirmGiftRedeem = React.useCallback(async () => {
    if (!giftLookup || redeemableSelectedIds.length === 0 || giftSubmitting) {
      return;
    }

    setGiftSubmitting(true);

    try {
      const response = await fetch("/api/staff-gifts", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ordercode: giftLookup.ordercode,
          giftIds: redeemableSelectedIds,
        }),
      });
      const payload = (await response.json()) as StaffGiftResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.message ?? "Không thể xác nhận đổi quà");
      }

      setGiftLookup(payload.data);
      setGiftSelectedIds(new Set());
      toast.success(payload.message ?? "Đổi quà thành công");
    } catch (error) {
      console.error("Staff gift redeem error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể xác nhận đổi quà");
    } finally {
      setGiftSubmitting(false);
    }
  }, [giftLookup, giftSubmitting, redeemableSelectedIds]);

  const handleScan = React.useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (!scannerEnabled || busy || result) {
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
      await submitCheckin({ payload: nextValue });
    },
    [busy, result, scannerEnabled, submitCheckin],
  );

  const handleGiftScan = React.useCallback(
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
      await submitGiftLookup(nextValue);
      setScannerEnabled(false);
    },
    [busy, scannerEnabled, submitGiftLookup],
  );

  const handleManualSubmit = async () => {
    const nextCode = manualCode.trim().toUpperCase();
    if (!nextCode) {
      return;
    }

    await submitCheckin({ code: nextCode });
    setManualCode("");
  };

  const handleGiftManualSubmit = async () => {
    const nextCode = manualCode.trim().toUpperCase();
    if (!nextCode) {
      return;
    }

    await submitGiftLookup(nextCode);
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

    try {
      const payload = await extractQrValueFromFile(file);
      if (!payload) {
        throw new Error("Không tìm thấy mã QR trong ảnh");
      }

      await submitCheckin({ payload });
    } catch (error) {
      console.error("Staff image scan error:", error);
      const message = error instanceof Error ? error.message : "Không thể đọc mã QR từ ảnh";
      setResult({ status: "error", message, time: new Date().toISOString() });
      toast.error(message);
    } finally {
      setImageScanning(false);
    }
  };

  const handleGiftImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || busy) {
      return;
    }

    setSelectedImageName(file.name);
    setImageScanning(true);

    try {
      const payload = await extractQrValueFromFile(file);
      if (!payload) {
        throw new Error("Không tìm thấy mã QR trong ảnh");
      }

      await submitGiftLookup(payload);
    } catch (error) {
      console.error("Staff gift image scan error:", error);
      toast.error(error instanceof Error ? error.message : "Không thể đọc mã QR từ ảnh");
    } finally {
      setImageScanning(false);
    }
  };

  if (areaMode === "gift") {
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
        <input
          ref={giftImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleGiftImageSelect(event);
          }}
        />

        <div className="text-foreground overflow-hidden">
          <div className="text-muted-foreground mb-3 text-sm font-medium">Tìm phần quà theo mã vé</div>

          <div className="bg-muted mb-5 grid grid-cols-2 gap-2 rounded-[12px] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("scan");
                setScannerEnabled(false);
              }}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-[12px] text-[16px] font-bold transition",
                mode === "scan" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <ScanLine className="h-5 w-5" />
              Quét QR
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("manual");
                setScannerEnabled(false);
              }}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-[12px] text-[16px] font-bold transition",
                mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <Keyboard className="h-5 w-5" />
              Nhập mã vé
            </button>
          </div>

          {mode === "scan" ? (
            <div className="mb-4 flex flex-col items-center">
              <div className="border-border bg-card relative w-full max-w-[88vw] overflow-hidden rounded-[20px] border p-4">
                <div className="border-border bg-muted relative aspect-square rounded-[18px] border">
                  {scannerEnabled ? (
                    <QrScanner
                      paused={busy}
                      onScan={handleGiftScan}
                      onError={(error) => {
                        console.error("Staff gift scanner error:", error);
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
                      <div className="border-border bg-card flex h-16 w-16 items-center justify-center rounded-[18px] border">
                        <Gift className="text-muted-foreground/40 h-8 w-8" />
                      </div>
                      <div className="text-muted-foreground/60 text-[13px]">Hướng camera vào mã QR</div>
                      {selectedImageName ? (
                        <div className="text-muted-foreground/70 max-w-[80%] truncate text-[11px]">
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
                  "mt-4 h-12 w-full rounded-[12px] text-[17px] font-bold",
                  scannerEnabled
                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                    : "bg-primary text-primary-foreground hover:opacity-95",
                )}
              >
                {busy ? "Đang xử lý..." : scannerEnabled ? "Dừng quét QR" : "Bắt đầu quét QR"}
              </Button>

              <button
                type="button"
                disabled={busy}
                onClick={() => giftImageInputRef.current?.click()}
                className="border-border bg-card text-muted-foreground hover:bg-muted mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {imageScanning ? "Đang đọc ảnh..." : "Chọn ảnh từ máy để quét"}
              </button>
            </div>
          ) : (
            <div className="border-border bg-card mb-4 rounded-[12px] border p-4">
              <div className="text-foreground mb-3 text-sm font-semibold">Nhập mã vé khách hàng</div>
              <Input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleGiftManualSubmit();
                  }
                }}
                placeholder="DHDEMO2026"
                className="border-border bg-background text-foreground placeholder:text-muted-foreground/40 h-14 rounded-[14px] text-center text-lg font-semibold tracking-[0.18em]"
              />
              <Button
                type="button"
                disabled={!manualCode.trim() || busy}
                onClick={() => {
                  void handleGiftManualSubmit();
                }}
                className="bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground/50 mt-4 h-14 w-full rounded-[14px] text-[17px] font-bold hover:opacity-95"
              >
                {busy ? "Đang xử lý..." : "Tìm phần quà"}
              </Button>
            </div>
          )}

          <Dialog
            open={Boolean(giftLookup)}
            onOpenChange={(open) => {
              if (!open) {
                setGiftLookup(null);
                setGiftSelectedIds(new Set());
              }
            }}
          >
            <DialogContent
              className={cn("group overflow-hidden p-0 shadow-2xl sm:max-w-[460px]", getGiftDialogTheme().borderClass)}
            >
              {giftLookup ? (
                <>
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <span
                      className={cn(
                        "absolute top-[18%] left-[14%] h-3 w-3 rounded-full blur-md transition-transform duration-500 group-hover:scale-150",
                        getGiftDialogTheme().dotClass,
                      )}
                    />
                    <span
                      className={cn(
                        "absolute right-[22%] bottom-[18%] h-4 w-4 rounded-full opacity-80 blur-lg transition-transform duration-500 group-hover:scale-125",
                        getGiftDialogTheme().dotClass,
                      )}
                    />
                    <span
                      className={cn(
                        "absolute top-0 left-0 h-1 w-1/3 transition-all duration-500 group-hover:w-full",
                        getGiftDialogTheme().accentClass,
                      )}
                    />
                  </div>

                  <DialogHeader className="relative z-10 space-y-0 px-6 pt-6 text-left">
                    <div className="flex items-start gap-3 pr-8">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
                          getGiftDialogTheme().iconClass,
                        )}
                      >
                        <Gift className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <DialogTitle
                          className={cn(
                            "bg-gradient-to-r bg-clip-text text-xl font-black text-transparent drop-shadow-sm",
                            getGiftDialogTheme().titleClass,
                          )}
                        >
                          Thông tin đổi quà
                        </DialogTitle>
                        <DialogDescription className="mt-1 line-clamp-2 text-sm text-white/70">
                          {giftLookup.gifts.length > 0
                            ? `Mã vé ${giftLookup.ordercode} có ${giftLookup.gifts.length} phần quà`
                            : `Không tìm thấy phần quà cho mã vé ${giftLookup.ordercode}`}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="relative z-10 px-6 py-5">
                    <div
                      className={cn(
                        "mb-3 grid gap-2 rounded-xl border p-3 backdrop-blur-sm",
                        getGiftDialogTheme().panelClass,
                      )}
                    >
                      {[
                        { label: "Mã vé", value: giftLookup.ordercode, mono: true },
                        { label: "Tên khách hàng", value: giftLookup.customerName || "--" },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10"
                        >
                          <div className="text-xs font-semibold text-white/55 uppercase">{item.label}</div>
                          <div
                            className={cn(
                              "min-w-0 truncate text-right text-sm font-bold text-white",
                              item.mono ? "font-mono" : "",
                            )}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {giftLookup.gifts.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-8 text-center text-sm font-semibold text-white/70">
                        Không có phần quà để xác nhận.
                      </div>
                    ) : (
                      <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                        {giftLookup.gifts.map((item) => {
                          const redeemed = item.status === 1;
                          const selected = giftSelectedIds.has(item.id);

                          return (
                            <label
                              key={item.id}
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3 py-3 transition",
                                redeemed ? "opacity-65" : "hover:bg-white/15",
                              )}
                            >
                              <Checkbox
                                checked={selected}
                                disabled={redeemed || busy}
                                onCheckedChange={(checked) => {
                                  setGiftSelectedIds((previous) => {
                                    const next = new Set(previous);
                                    if (checked) {
                                      next.add(item.id);
                                    } else {
                                      next.delete(item.id);
                                    }
                                    return next;
                                  });
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-white">{item.giftName || "--"}</div>
                              </div>
                              <div
                                className={cn(
                                  "shrink-0 rounded-full border px-2 py-1 text-[11px] font-bold",
                                  redeemed
                                    ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                                    : "border-amber-300/40 bg-amber-400/15 text-amber-100",
                                )}
                              >
                                {redeemed ? "Đã đổi" : "Chưa đổi"}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="relative z-10 grid grid-cols-2 gap-2 border-t border-white/10 px-6 py-4 sm:flex">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 rounded-md font-bold"
                        disabled={giftSubmitting}
                      >
                        Đóng
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      disabled={redeemableSelectedIds.length === 0 || busy}
                      onClick={() => {
                        void confirmGiftRedeem();
                      }}
                      className={cn("h-10 rounded-md font-bold", getGiftDialogTheme().buttonClass)}
                    >
                      {busy ? "Đang xác nhận..." : `Xác nhận đổi ${redeemableSelectedIds.length || ""}`.trim()}
                    </Button>
                  </DialogFooter>
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="text-muted-foreground mx-auto flex w-full max-w-[760px] flex-col items-center justify-center py-20">
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

      <Dialog open={Boolean(result)} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent
          className={cn(
            "group overflow-hidden p-0 shadow-2xl sm:max-w-[420px]",
            result ? getResultTheme(result.status).borderClass : "",
          )}
        >
          {result ? (
            <>
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <span
                  className={cn(
                    "absolute top-[18%] left-[14%] h-3 w-3 rounded-full blur-md transition-transform duration-500 group-hover:scale-150",
                    getResultTheme(result.status).dotClass,
                  )}
                />
                <span
                  className={cn(
                    "absolute right-[22%] bottom-[18%] h-4 w-4 rounded-full opacity-80 blur-lg transition-transform duration-500 group-hover:scale-125",
                    getResultTheme(result.status).dotClass,
                  )}
                />
                <span
                  className={cn(
                    "absolute top-[8%] left-[42%] h-2 w-2 rounded-full opacity-80 blur transition-transform duration-500 group-hover:scale-175",
                    getResultTheme(result.status).dotClass,
                  )}
                />
                <span
                  className={cn(
                    "absolute top-0 left-0 h-1 w-1/3 transition-all duration-500 group-hover:w-full",
                    getResultTheme(result.status).accentClass,
                  )}
                />
              </div>

              <DialogHeader className="relative z-10 space-y-0 px-6 pt-6 text-left">
                <div className="flex items-start gap-3 pr-8">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
                      getResultTheme(result.status).iconClass,
                    )}
                  >
                    {getResultTheme(result.status).icon}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle
                      className={cn(
                        "bg-gradient-to-r bg-clip-text text-xl font-black text-transparent drop-shadow-sm",
                        getResultTheme(result.status).titleClass,
                      )}
                    >
                      {getStatusLabel(result.status)}
                    </DialogTitle>
                    <DialogDescription className="mt-1 line-clamp-2 text-sm text-white/70">
                      {result.message}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="relative z-10 px-6 py-5">
                <div className="mb-5 text-center">
                  <div className="text-[11px] font-bold tracking-[0.22em] text-white/50 uppercase">Hạng vé</div>
                  <div
                    className={cn(
                      "mx-auto mt-2 inline-flex min-w-[170px] justify-center rounded-2xl border px-8 py-3 text-3xl font-black tracking-[0.16em] uppercase backdrop-blur-sm transition-transform duration-300 group-hover:scale-105",
                      getResultTheme(result.status).ticketClass,
                    )}
                  >
                    {result.guest ? tierTheme[result.guest.tier].label : "--"}
                  </div>
                </div>

                <div
                  className={cn(
                    "grid gap-2 rounded-xl border p-3 backdrop-blur-sm",
                    getResultTheme(result.status).panelClass,
                  )}
                >
                  {[
                    { label: "Tên", value: result.guest?.name ?? "--" },
                    { label: "Mã vé", value: result.guest?.code ?? result.ticketCode ?? "--", mono: true },
                    { label: "Trạng thái", value: getStatusLabel(result.status) },
                    { label: "Thời gian check-in", value: formatDateTimeLabel(result.time) },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10"
                    >
                      <div className="text-xs font-semibold text-white/55 uppercase">{item.label}</div>
                      <div
                        className={cn(
                          "min-w-0 truncate text-right text-sm font-bold text-white",
                          item.mono ? "font-mono" : "",
                        )}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="relative z-10 border-t border-white/10 px-6 py-4">
                <DialogClose asChild>
                  <Button
                    type="button"
                    className={cn(
                      "h-10 w-full rounded-md font-bold sm:w-auto",
                      getResultTheme(result.status).buttonClass,
                    )}
                  >
                    Đóng
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="text-foreground overflow-hidden">
        <div className="text-muted-foreground mb-3 text-sm font-medium">Chọn khu vực check-in</div>
        <div className="custom-scrollbar mb-4 flex flex-row gap-2 overflow-x-auto sm:gap-3">
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
                  "bg-card w-[110px] shrink-0 rounded-[12px] border px-1 py-3 text-left transition-all sm:w-[140px] sm:px-4 sm:py-5",
                  active
                    ? "border-primary shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary)_18%,transparent)_inset]"
                    : "border-border",
                )}
              >
                <div
                  className={cn(
                    "text-center text-[12px] font-bold sm:text-[15px]",
                    active ? "text-foreground" : "text-muted-foreground",
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

        <div className="border-border bg-card mb-5 grid grid-cols-4 overflow-hidden rounded-[12px] border">
          {[
            {
              label: "Tổng",
              count: `${stats.total.current}/${stats.total.max}`,
              percent: "",
              color: "text-foreground",
            },
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
                index < 3 ? "border-border border-r" : "",
              )}
            >
              <div className={cn("text-[13px] font-black sm:text-[18px]", item.color)}>{item.count}</div>
              {item.percent ? (
                <div className={cn("mt-0.5 text-[10px] font-bold opacity-80 sm:text-[12px]", item.color)}>
                  {item.percent}
                </div>
              ) : null}
              <div className="text-muted-foreground mt-1 text-[12px] sm:text-[11px]">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-muted mb-5 grid grid-cols-2 gap-2 rounded-[12px] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("scan");
              setResult(null);
            }}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-[12px] text-[16px] font-bold transition",
              mode === "scan" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
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
              "flex h-12 items-center justify-center gap-2 rounded-[12px] text-[16px] font-bold transition",
              mode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Keyboard className="h-5 w-5" />
            Nhập mã vé
          </button>
        </div>

        {mode === "scan" ? (
          <div className="mb-4 flex flex-col items-center">
            <div className="border-border bg-card relative w-full max-w-[88vw] overflow-hidden rounded-[20px] border p-4">
              <div className="border-border bg-muted relative aspect-square rounded-[18px] border">
                {scannerEnabled ? (
                  <QrScanner
                    paused={busy || Boolean(result)}
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
                    <div className="border-border bg-card flex h-16 w-16 items-center justify-center rounded-[18px] border">
                      <QrCode className="text-muted-foreground/40 h-8 w-8" />
                    </div>
                    <div className="text-muted-foreground/60 text-[13px]">Hướng camera vào mã QR</div>
                    {selectedImageName ? (
                      <div className="text-muted-foreground/70 max-w-[80%] truncate text-[11px]">
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
                "mt-4 h-12 w-full rounded-[12px] text-[17px] font-bold",
                scannerEnabled
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-primary text-primary-foreground hover:opacity-95",
              )}
            >
              {busy ? "Đang xử lý..." : scannerEnabled ? "Dừng quét QR" : "Bắt đầu quét QR"}
            </Button>

            <button
              type="button"
              disabled={busy}
              onClick={() => imageInputRef.current?.click()}
              className="border-border bg-card text-muted-foreground hover:bg-muted mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {imageScanning ? "Đang đọc ảnh..." : "Chọn ảnh từ máy để quét"}
            </button>
          </div>
        ) : (
          <div className="border-border bg-card mb-4 rounded-[12px] border p-4">
            <div className="text-foreground mb-3 text-sm font-semibold">Nhập mã vé khách hàng</div>
            <Input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleManualSubmit();
                }
              }}
              placeholder="DHDEMO2026"
              className="border-border bg-background text-foreground placeholder:text-muted-foreground/40 h-14 rounded-[14px] text-center text-lg font-semibold tracking-[0.18em]"
            />
            <div className="text-muted-foreground/60 mt-2 text-center text-xs">
              Nhập mã vé khi mã QR không quét được.
            </div>
            <Button
              type="button"
              disabled={!manualCode.trim() || busy}
              onClick={() => {
                void handleManualSubmit();
              }}
              className="bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground/50 mt-4 h-14 w-full rounded-[14px] text-[17px] font-bold hover:opacity-95"
            >
              {busy ? "Đang xử lý..." : "Xác nhận check-in"}
            </Button>
          </div>
        )}

        <div className="border-border bg-card rounded-[12px] border">
          <div className="border-border flex items-center justify-between border-b px-5 py-4">
            <div className="text-foreground text-[12px] font-bold sm:text-[15px]">Lịch sử check-in phiên hiện tại</div>
            <div className="text-muted-foreground text-sm">
              {loadingSnapshot ? "Đang tải..." : `${visibleHistory.length} lượt`}
            </div>
          </div>

          <div className="px-3 py-3">
            {visibleHistory.length === 0 ? (
              <div className="text-muted-foreground/50 flex flex-col items-center gap-3 py-10 text-center">
                <QrCode className="h-8 w-8 opacity-35" />
                <div>Chưa có check-in nào</div>
              </div>
            ) : (
              <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
                {visibleHistory.map((item) => (
                  <div
                    key={item.id}
                    className="border-border bg-muted/40 flex items-center justify-between gap-2 rounded-[12px] border px-3 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 pr-1">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          item.status === "repeat"
                            ? "bg-amber-400"
                            : item.status === "denied" || item.status === "error"
                              ? "bg-rose-400"
                              : "bg-emerald-400",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground truncate text-[14px] font-bold">{item.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <div
                            className={cn(
                              "rounded-full border px-1.5 py-0 text-[10px] font-bold",
                              tierTheme[item.tier]?.badgeClass,
                            )}
                          >
                            {tierTheme[item.tier]?.label}
                          </div>
                          <div className="text-muted-foreground truncate text-[12px]">{item.zoneName || zone.name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex max-w-[46vw] min-w-0 items-center gap-1.5 sm:max-w-none">
                        <div className="text-foreground min-w-0 truncate font-mono text-[12px] font-semibold">
                          {item.code}
                        </div>
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
                          className="border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-md border p-1.5 transition"
                          aria-label="Copy ticket code"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-muted-foreground/70 mr-1 text-[11px] font-medium">
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
