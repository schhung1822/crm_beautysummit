/* eslint-disable max-lines, complexity, @typescript-eslint/no-unnecessary-condition, @next/next/no-img-element */
"use client";

import * as React from "react";

import { ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CreatableSearchSelect, type CreatableSearchSelectOption } from "@/components/creatable-search-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { MiniAppVoucherKind, MiniAppVoucherRecord } from "@/lib/miniapp-rewards";
import { matchesSearchTerm, normalizeSearchText } from "@/lib/search-utils";

type VoucherManagerProps = {
  initialData: MiniAppVoucherRecord[];
};

type CatalogType = "category" | "product" | "brand";

type CatalogResponse = {
  data?: {
    categories: CreatableSearchSelectOption[];
    products: CreatableSearchSelectOption[];
    brands: CreatableSearchSelectOption[];
  };
  message?: string;
};

type VoucherFormState = {
  voucherId: string | null;
  kind: MiniAppVoucherKind;
  brand: string;
  logo: string;
  discount: string;
  desc: string;
  color: string;
  cost: string;
  isGrand: boolean;
  isActive: boolean;
  code: string;
};

const COLOR_OPTIONS = [
  "#B8860B",
  "#EC4899",
  "#0EA5E9",
  "#8B5CF6",
  "#F97316",
  "#14B8A6",
  "#E11D48",
  "#22C55E",
  "#1E3A5F",
  "#333333",
] as const;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
const MAX_LOGO_SIZE_BYTES = 512 * 1024;
const IMAGE_SOURCE_PATTERN = /^(data:image\/|https?:\/\/|\/)/i;

const DEFAULT_FORM: VoucherFormState = {
  voucherId: null,
  kind: "bpoint",
  brand: "",
  logo: "",
  discount: "",
  desc: "",
  color: "#B8860B",
  cost: "0",
  isGrand: false,
  isActive: true,
  code: "",
};

function createFormState(voucher?: MiniAppVoucherRecord | null): VoucherFormState {
  if (!voucher) {
    return DEFAULT_FORM;
  }

  return {
    voucherId: voucher.id,
    kind: voucher.kind,
    brand: voucher.brand,
    logo: voucher.logo,
    discount: voucher.discount,
    desc: voucher.desc,
    color: voucher.color,
    cost: voucher.cost == null ? "" : String(voucher.cost),
    isGrand: voucher.isGrand === true,
    isActive: voucher.isActive !== false,
    code: voucher.code ?? "",
  };
}

function formatDateLabel(value?: string | null): string {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-GB");
}

function normalizeSearchValue(value: string): string {
  return normalizeSearchText(value);
}

function buildOptionId(value: string): string {
  return normalizeSearchValue(value).replace(/\s+/g, "-");
}

function buildInitialBrandOptions(data: MiniAppVoucherRecord[]): CreatableSearchSelectOption[] {
  return Array.from(new Set(data.map((item) => item.brand.trim()).filter(Boolean)))
    .sort()
    .map((label) => ({
      id: `brand-${buildOptionId(label)}`,
      label,
      deletable: false,
    }));
}

function buildInitialProductOptions(data: MiniAppVoucherRecord[]): CreatableSearchSelectOption[] {
  return Array.from(new Set(data.map((item) => item.discount.trim()).filter(Boolean)))
    .sort()
    .map((label) => ({
      id: `product-${buildOptionId(label)}`,
      label,
      deletable: false,
    }));
}

function mergeOptionLists(
  current: CreatableSearchSelectOption[],
  incoming: CreatableSearchSelectOption[],
): CreatableSearchSelectOption[] {
  const map = new Map<string, CreatableSearchSelectOption>();
  [...current, ...incoming].forEach((option) => {
    const key = normalizeSearchValue(option.label);
    const previous = map.get(key);
    map.set(key, {
      id: option.id,
      label: option.label,
      deletable: option.deletable === true || previous?.deletable === true,
    });
  });

  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function isImageLogo(value: string): boolean {
  return IMAGE_SOURCE_PATTERN.test(value.trim());
}

function buildLogoFallback(logo: string, brand: string): string {
  const normalizedLogo = logo.trim();
  if (normalizedLogo && !isImageLogo(normalizedLogo)) {
    return normalizedLogo.slice(0, 3).toUpperCase();
  }

  return brand
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function LogoPreview({
  logo,
  brand,
  color,
  isGrand = false,
}: {
  logo: string;
  brand: string;
  color: string;
  isGrand?: boolean;
}) {
  if (isImageLogo(logo)) {
    return (
      <div
        className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl shadow-[0_8px_18px_rgba(184,134,11,0.08)]"
        style={{
          background: isGrand ? `linear-gradient(135deg, ${color}22, ${color}14)` : "#ffffff",
          border: isGrand ? `1px solid ${color}` : "1px solid #eadfd2",
          boxShadow: isGrand ? "0 8px 18px rgba(236,72,153,0.12)" : undefined,
        }}
      >
        <img src={logo} alt={brand} className="h-full w-full object-contain p-1.5" />
      </div>
    );
  }

  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white shadow-[0_8px_18px_rgba(184,134,11,0.08)]"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}bb)`,
        border: isGrand ? `1px solid ${color}` : undefined,
        boxShadow: isGrand ? "0 8px 18px rgba(236,72,153,0.12)" : undefined,
      }}
    >
      {buildLogoFallback(logo, brand)}
    </div>
  );
}

export default function VoucherManager({ initialData }: VoucherManagerProps) {
  const [data, setData] = React.useState<MiniAppVoucherRecord[]>(initialData);
  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<"all" | MiniAppVoucherKind>("all");
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageInput, setPageInput] = React.useState("1");
  const [isPageFocused, setIsPageFocused] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<VoucherFormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [brandOptions, setBrandOptions] = React.useState<CreatableSearchSelectOption[]>(
    buildInitialBrandOptions(initialData),
  );
  const [productOptions, setProductOptions] = React.useState<CreatableSearchSelectOption[]>(
    buildInitialProductOptions(initialData),
  );

  const isEditing = Boolean(form.voucherId);

  const filteredData = React.useMemo(() => {
    const keyword = normalizeSearchValue(search);
    return data.filter((voucher) => {
      const passKind = kindFilter === "all" || voucher.kind === kindFilter;
      if (!passKind) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return matchesSearchTerm(keyword, [voucher.brand, voucher.discount, voucher.code, voucher.desc]);
    });
  }, [data, kindFilter, search]);

  const summary = React.useMemo(
    () => ({
      total: data.length,
      bpoint: data.filter((voucher) => voucher.kind === "bpoint").length,
      free: data.filter((voucher) => voucher.kind === "free").length,
      active: data.filter((voucher) => voucher.isActive !== false).length,
    }),
    [data],
  );

  const pageCount = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePageIndex * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedData = filteredData.slice(pageStart, pageEnd);
  const visibleStart = filteredData.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(filteredData.length, pageEnd);

  React.useEffect(() => {
    setPageIndex(0);
  }, [kindFilter, pageSize, search]);

  React.useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(pageCount - 1, 0));
    }
  }, [pageCount, pageIndex]);

  React.useEffect(() => {
    if (!isPageFocused) {
      setPageInput(filteredData.length === 0 ? "0" : String(safePageIndex + 1));
    }
  }, [filteredData.length, safePageIndex, isPageFocused]);

  const commitPageInput = React.useCallback(() => {
    if (filteredData.length === 0) {
      setPageInput("0");
      return;
    }

    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > pageCount) {
      const nextPageNumber = Math.min(Math.max(Math.trunc(parsed), 1), pageCount);
      setPageIndex(Number.isFinite(parsed) ? nextPageNumber - 1 : safePageIndex);
      setPageInput(String(Number.isFinite(parsed) ? nextPageNumber : safePageIndex + 1));
      return;
    }

    setPageIndex(parsed - 1);
    setPageInput(String(parsed));
  }, [filteredData.length, pageCount, pageInput, safePageIndex]);

  const loadCatalogOptions = React.useCallback(async () => {
    try {
      const response = await fetch("/api/catalog-options");
      const result = (await response.json()) as CatalogResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Khong the tai bo loc du lieu");
      }

      setBrandOptions((current) => mergeOptionLists(current, result?.data?.brands ?? []));
      setProductOptions((current) => mergeOptionLists(current, result?.data?.products ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the tai bo loc du lieu");
    }
  }, []);

  React.useEffect(() => {
    void loadCatalogOptions();
  }, [loadCatalogOptions]);

  const mutateCatalogOption = React.useCallback(async (type: CatalogType, label: string, method: "POST" | "DELETE") => {
    const response = await fetch("/api/catalog-options", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type, label }),
    });

    const result = (await response.json()) as {
      data?: CreatableSearchSelectOption;
      deleted?: number;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(result.message ?? "Khong the cap nhat bo loc");
    }

    return result;
  }, []);

  const handleCreateBrand = React.useCallback(
    async (label: string) => {
      const result = await mutateCatalogOption("brand", label, "POST");
      if (!result.data) {
        return;
      }

      setBrandOptions((current) => mergeOptionLists(current, [result.data!]));
      toast.success("Da them brand moi");
      return result.data;
    },
    [mutateCatalogOption],
  );

  const handleDeleteBrand = React.useCallback(
    async (option: CreatableSearchSelectOption) => {
      const confirmed = window.confirm(`Xoa brand "${option.label}"?`);
      if (!confirmed) {
        return;
      }

      await mutateCatalogOption("brand", option.label, "DELETE");
      setBrandOptions((current) =>
        current.filter((item) => normalizeSearchValue(item.label) !== normalizeSearchValue(option.label)),
      );
      toast.success("Da xoa brand");
    },
    [mutateCatalogOption],
  );

  const handleCreateProduct = React.useCallback(
    async (label: string) => {
      const result = await mutateCatalogOption("product", label, "POST");
      if (!result.data) {
        return;
      }

      setProductOptions((current) => mergeOptionLists(current, [result.data!]));
      toast.success("Da them san pham moi");
      return result.data;
    },
    [mutateCatalogOption],
  );

  const handleDeleteProduct = React.useCallback(
    async (option: CreatableSearchSelectOption) => {
      const confirmed = window.confirm(`Xoa san pham "${option.label}"?`);
      if (!confirmed) {
        return;
      }

      await mutateCatalogOption("product", option.label, "DELETE");
      setProductOptions((current) =>
        current.filter((item) => normalizeSearchValue(item.label) !== normalizeSearchValue(option.label)),
      );
      toast.success("Da xoa san pham");
    },
    [mutateCatalogOption],
  );

  const openCreateDialog = React.useCallback(() => {
    setForm(createFormState());
    setDialogOpen(true);
  }, []);

  const openEditDialog = React.useCallback((voucher: MiniAppVoucherRecord) => {
    setForm(createFormState(voucher));
    setDialogOpen(true);
  }, []);

  const handleLogoFileChange = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Vui long chon file anh cho logo");
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error("Logo qua lon. Vui long chon anh nho hon 512KB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Khong the tai logo");
      }

      const uploadUrl = result.url;
      setForm((current) => ({ ...current, logo: uploadUrl }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the tai logo");
    }
  }, []);

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);

    try {
      const payload = {
        voucherId: form.voucherId,
        kind: form.kind,
        brand: form.brand,
        logo: form.logo,
        discount: form.discount,
        desc: form.desc,
        color: form.color,
        cost: form.kind === "bpoint" && !form.isGrand ? Number(form.cost || 0) : null,
        isGrand: form.isGrand,
        isActive: form.isActive,
      };

      const response = await fetch("/api/vouchers", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { data?: MiniAppVoucherRecord; message?: string };

      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Khong the luu voucher");
      }

      setData((current) => {
        const next = current.filter((item) => item.id !== result.data?.id);
        return [result.data!, ...next];
      });
      setBrandOptions((current) =>
        mergeOptionLists(
          current,
          [{ id: `brand-${buildOptionId(form.brand)}`, label: form.brand, deletable: false }].filter(
            (item) => item.label,
          ),
        ),
      );
      setProductOptions((current) =>
        mergeOptionLists(
          current,
          [{ id: `product-${buildOptionId(form.discount)}`, label: form.discount, deletable: false }].filter(
            (item) => item.label,
          ),
        ),
      );
      setPageIndex(0);
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
      toast.success(isEditing ? "Đã cập nhật voucher" : "Đã tạo voucher mới");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu voucher");
    } finally {
      setIsSaving(false);
    }
  }, [form, isEditing]);

  const handleDelete = React.useCallback(async (voucher: MiniAppVoucherRecord) => {
    const confirmed = window.confirm(`Xoa voucher ${voucher.brand}?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(voucher.id);
    try {
      const response = await fetch("/api/vouchers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voucherId: voucher.id }),
      });
      const result = (await response.json()) as { deleted?: number; message?: string };
      if (!response.ok || !result.deleted) {
        throw new Error(result.message ?? "Khong the xoa voucher");
      }

      setData((current) => current.filter((item) => item.id !== voucher.id));
      toast.success("Da xoa voucher");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa voucher");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng voucher", value: summary.total },
          { label: "Voucher BPoint", value: summary.bpoint },
          { label: "Voucher free", value: summary.free },
          { label: "Đang hoạt động", value: summary.active },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl border p-4 shadow-sm">
            <div className="text-muted-foreground text-sm">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo brand, mã voucher..."
              className="pl-10"
            />
          </div>
          <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as "all" | MiniAppVoucherKind)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Loai voucher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="bpoint">BPoint</SelectItem>
              <SelectItem value="free">Free</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Tạo voucher
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Logo</th>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Loại</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Cập nhật</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted-foreground px-4 py-10 text-center">
                    Chưa có voucher phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedData.map((voucher) => (
                  <tr key={voucher.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <LogoPreview logo={voucher.logo} brand={voucher.brand} color={voucher.color} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{voucher.brand}</div>
                      <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">{voucher.desc}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{voucher.kind === "bpoint" ? "BPoint" : "Free"}</Badge>
                        {voucher.isGrand ? <Badge>Grand</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{voucher.discount}</td>
                    <td className="px-4 py-3 font-mono text-xs">{voucher.code ?? "--"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={voucher.isActive === false ? "outline" : "secondary"}>
                        {voucher.isActive === false ? "Tắt" : "Đang bật"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">{formatDateLabel(voucher.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(voucher)}>
                          <Pencil className="size-4" />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDelete(voucher)}
                          disabled={deletingId === voucher.id}
                        >
                          <Trash2 className="size-4" />
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          Hiển {visibleStart}-{visibleEnd} của {filteredData.length} voucher
        </div>

        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="voucher-rows-per-page" className="text-sm font-medium">
              Số hàng mỗi trang
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="voucher-rows-per-page">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent side="top">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-fit items-center justify-center gap-2 text-sm font-medium">
            <span>Trang</span>
            <Input
              value={pageInput}
              inputMode="numeric"
              pattern="[0-9]*"
              className="h-8 w-16 text-center"
              onChange={(event) => {
                const nextValue = event.target.value.replace(/[^\d]/g, "");
                setPageInput(nextValue);
              }}
              onFocus={() => setIsPageFocused(true)}
              onBlur={() => {
                setIsPageFocused(false);
                commitPageInput();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitPageInput();
                }
              }}
            />
            <span>/ {pageCount}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPageIndex(0)}
              disabled={safePageIndex === 0}
            >
              <span className="sr-only">Trang đầu</span>«
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              disabled={safePageIndex === 0}
              onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
            >
              <span className="sr-only">Trang trước</span>‹
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              disabled={safePageIndex >= pageCount - 1}
              onClick={() => setPageIndex((current) => Math.min(current + 1, pageCount - 1))}
            >
              <span className="sr-only">Trang sau</span>›
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              disabled={safePageIndex >= pageCount - 1}
              onClick={() => setPageIndex(pageCount - 1)}
            >
              <span className="sr-only">Trang cuối</span>»
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-background dark:bg-slate-900 border-border dark:border-slate-800">
          <DialogHeader>
<DialogTitle></DialogTitle>
</DialogHeader>
<div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label>Loại voucher</Label>
                <Select
                  value={form.kind}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      kind: value as MiniAppVoucherKind,
                      cost: value === "bpoint" ? current.cost || "0" : "",
                      isGrand: value === "bpoint" ? current.isGrand : false,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bpoint">BPoint</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <CreatableSearchSelect
                  value={form.brand}
                  options={brandOptions}
                  placeholder="Chon hoac them brand"
                  searchPlaceholder="Tim brand..."
                  triggerClassName="h-9 rounded-md border-input px-3 shadow-xs"
                  onValueChange={(value) => setForm((current) => ({ ...current, brand: value }))}
                  onCreate={handleCreateBrand}
                  onDelete={handleDeleteBrand}
                />
              </div>
              <div className="space-y-1.5 sm:min-w-[170px]">
                <Label>Activate</Label>
                <div className="flex h-10 items-center rounded-lg border px-3">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:col-span-2 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <div
                className={`relative overflow-hidden rounded-[1.2rem] border px-4 py-4 shadow-sm ${form.isGrand ? "border-orange-200 dark:border-orange-800" : "border-border dark:border-slate-800 bg-card dark:bg-slate-900"}`}
                style={
                  form.isGrand
                    ? {
                        background:
                          "radial-gradient(circle at top right, rgba(255,175,64,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(236,72,153,0.06), transparent 42%)",
                      }
                    : undefined
                }
              >
                <div className="mb-3 text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground" style={{ color: form.color }}>
                  Preview
                </div>
                <div
                  className={`relative flex items-center gap-3 rounded-[1.25rem] border px-3.5 py-3.5 shadow-sm ${form.isGrand ? "overflow-hidden border-orange-300 dark:border-orange-800 bg-background/50 dark:bg-background/20" : "border-border dark:border-slate-800 bg-background dark:bg-slate-950"}`}
                >
                  {form.isGrand ? (
                    <div className="absolute top-0 right-0 rounded-tr-[1.15rem] rounded-bl-[1rem] bg-[linear-gradient(135deg,#f9c529_0%,#ffb347_46%,#ff72bc_100%)] px-4 text-[11px] tracking-[0.04em] text-white">
                      Giải đặc biệt
                    </div>
                  ) : null}
                  <LogoPreview
                    logo={form.logo}
                    brand={form.brand || "Voucher"}
                    color={form.color}
                    isGrand={form.isGrand}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-[13px] font-semibold ${form.isGrand ? "text-[#ff4fb5]" : ""}`}
                      style={form.isGrand ? undefined : { color: form.color }}
                    >
                      {form.brand || "Brand voucher"}
                    </div>
                    <div
                      className={`truncate text-[17px] leading-tight font-black ${form.isGrand ? "text-[#241629] dark:text-slate-50" : "text-[#241629] dark:text-slate-50"}`}
                    >
                      {form.discount || "Title voucher"}
                    </div>
                    <div className={`mt-1 truncate text-[12px] ${form.isGrand ? "text-[#7a7280] dark:text-slate-400" : "text-[#7a7280] dark:text-slate-400"}`}>
                      {form.desc || "Mô tả voucher 1 dòng, dài thì sẽ tự cắt."}
                    </div>
                  </div>
                  <div
                    className={`min-w-[82px] shrink-0 rounded-full px-3.5 py-1 text-center text-[13px] font-bold ${form.isGrand ? "border border-[rgba(255,210,31,0.14)] bg-[linear-gradient(135deg,#4f3409_0%,#2d200c_100%)] font-black tracking-[0.04em] text-[#ffd21f] shadow-[0_10px_18px_rgba(0,0,0,0.24)]" : "text-white"}`}
                    style={
                      form.isGrand
                        ? undefined
                        : {
                            background: `linear-gradient(135deg, ${form.color}, ${form.color}bb)`,
                          }
                    }
                  >
                    {form.kind === "bpoint" && !form.isGrand ? `${form.cost || 0} BP` : form.isGrand ? "MAX" : "Nhận"}
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label>Mã voucher</Label>
                  <Input value={form.code || "Sẽ tự động tạo khi lưu"} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label>Grand prize</Label>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="text-muted-foreground text-xs">Giải đặc biệt</div>
                    <Switch
                      checked={form.isGrand}
                      onCheckedChange={(checked) =>
                        setForm((current) => ({
                          ...current,
                          isGrand: checked,
                          cost: checked ? "" : current.cost || "0",
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Logo voucher</Label>
              <div className="flex flex-col gap-3 rounded-[1.1rem] border border-[#eadfd2] dark:border-slate-800 bg-[linear-gradient(145deg,#fffdf8,#fff6ea)] dark:bg-[linear-gradient(145deg,#020817,#0f172a)] p-3.5 shadow-[0_10px_24px_rgba(184,134,11,0.06)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <LogoPreview logo={form.logo} brand={form.brand || "Voucher"} color={form.color} />
                  <div className="text-sm">
                    <div className="font-medium text-[#241629]">
                      {isImageLogo(form.logo) ? "Đã chọn logo ảnh" : "Đang dùng logo chữ"}
                    </div>
                    <div className="text-xs text-[#7a7280]">Khuyến nghị ảnh vuông, dung lượng dưới 512KB.</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[0.95rem] border border-[#eadfd2] bg-white px-3 py-2 text-sm font-medium text-[#241629] shadow-[0_8px_18px_rgba(184,134,11,0.05)]">
                    <ImagePlus className="size-4" />
                    Chọn ảnh
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                  </label>
                  {form.logo ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[0.95rem] border-[#eadfd2] bg-white text-[#241629] shadow-[0_8px_18px_rgba(184,134,11,0.05)]"
                      onClick={() => setForm((current) => ({ ...current, logo: "" }))}
                    >
                      Xóa logo
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Màu sắc voucher</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => {
                  const active = form.color.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, color }))}
                      className={`h-9 w-9 rounded-full border-2 transition ${active ? "scale-105 border-[#111827]" : "border-white/70"}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Chon mau ${color}`}
                    />
                  );
                })}
                <label className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium">
                  Màu tuỳ chỉnh
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>

            <div
              className={`grid gap-4 ${form.kind === "bpoint" ? "sm:col-span-2 sm:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]" : "sm:col-span-2"}`}
            >
              <div className="space-y-1.5">
                <Label>Tiêu đề</Label>
                <CreatableSearchSelect
                  value={form.discount}
                  options={productOptions}
                  placeholder="Chon hoac them san pham"
                  searchPlaceholder="Tim san pham..."
                  triggerClassName="h-10 rounded-md border-input px-3 shadow-xs"
                  onValueChange={(value) => setForm((current) => ({ ...current, discount: value }))}
                  onCreate={handleCreateProduct}
                  onDelete={handleDeleteProduct}
                />
              </div>
              {form.kind === "bpoint" ? (
                <div className="space-y-1.5">
                  <Label>Số điểm BPoint</Label>
                  <Input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={form.cost}
                    disabled={form.isGrand}
                    placeholder={form.isGrand ? "Giải đặc biệt" : "Nhập số điểm"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        cost: event.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Mô tả</Label>
              <Textarea
                value={form.desc}
                onChange={(event) => setForm((current) => ({ ...current, desc: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
