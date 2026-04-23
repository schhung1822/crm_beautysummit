/* eslint-disable max-lines, complexity, @typescript-eslint/no-unnecessary-condition, @next/next/no-img-element */
"use client";

import * as React from "react";

import { ImagePlus, Pencil, Plus, Tags, ThumbsUp, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

import { CreatableSearchSelect, type CreatableSearchSelectOption } from "@/components/creatable-search-select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VoteOptionRecord } from "@/lib/vote-options";

type VoteOptionManagerProps = {
  initialData: VoteOptionRecord[];
};

type VoteOptionFormState = {
  id: number | null;
  category: string;
  product: string;
  logo: string;
  productImage: string;
  summary: string;
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

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const IMAGE_SOURCE_PATTERN = /^(https?:\/\/|\/?(avatars|images|public)\/|data:image\/)/i;

const DEFAULT_FORM: VoteOptionFormState = {
  id: null,
  category: "",
  product: "",
  logo: "",
  productImage: "",
  summary: "",
};

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildOptionId(value: string): string {
  return normalizeLabel(value).toLowerCase();
}

function buildInitialCategoryOptions(data: VoteOptionRecord[]): CreatableSearchSelectOption[] {
  return Array.from(new Set(data.map((item) => normalizeLabel(item.category)).filter(Boolean)))
    .sort()
    .map((label) => ({
      id: `category-${buildOptionId(label)}`,
      label,
      deletable: false,
    }));
}

function buildInitialProductOptions(data: VoteOptionRecord[]): CreatableSearchSelectOption[] {
  return Array.from(new Set(data.map((item) => normalizeLabel(item.product)).filter(Boolean)))
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
    const key = option.label.toLowerCase();
    const previous = map.get(key);
    map.set(key, {
      id: option.id,
      label: option.label,
      deletable: option.deletable === true || previous?.deletable === true,
    });
  });

  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function buildFormState(item?: VoteOptionRecord | null): VoteOptionFormState {
  if (!item) {
    return DEFAULT_FORM;
  }

  return {
    id: item.id,
    category: item.category,
    product: item.product,
    logo: item.logo,
    productImage: item.productImage,
    summary: item.summary,
  };
}

function isImageLogo(value?: string | null): boolean {
  if (!value) return false;
  const t = value.trim();
  return t.startsWith("http") || t.startsWith("/") || t.startsWith("data:") || t.startsWith("avatars/") || t.startsWith("images/") || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(t);
}

function getAbsoluteImageUrl(url?: string | null): string {
  if (!url) return "";
  const t = url.trim();
  if (t.startsWith("http") || t.startsWith("data:")) return t;
  return t.startsWith("/") ? t : `/${t}`;
}

function buildLogoFallback(product: string): string {
  return product
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getPreviewAccent(category: string): string {
  const palette = ["#e91e63", "#8b34ff", "#f97316", "#0ea5e9", "#14b8a6", "#b8860b"];
  const normalized = category.trim().toLowerCase();
  const index = normalized.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index] ?? palette[0];
}

function VoteLogoPreview({
  logo,
  product,
  compact = false,
  fit = "cover",
  className = "",
}: {
  logo: string | null | undefined;
  product: string;
  compact?: boolean;
  fit?: "cover" | "contain";
  className?: string;
}) {
  const sizeClass = compact ? "h-[58px] w-[58px] rounded-[0.9rem]" : "h-[4.5rem] w-[4.5rem] rounded-[1.2rem]";
  const textClass = compact ? "text-[1.2rem]" : "text-[2rem]";

  if (isImageLogo(logo)) {
    const absolutelogo = getAbsoluteImageUrl(logo);
    return (
      <div className={`flex items-center justify-center overflow-hidden border border-border bg-background shadow-sm ${sizeClass} ${className}`.trim()}>
        <img
          src={absolutelogo}
          alt={product}
          className={`h-full w-full ${fit === "contain" ? "object-contain p-2" : "object-cover"}`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center border border-primary/20 bg-gradient-to-br from-primary/80 to-primary font-black text-primary-foreground shadow-sm ${sizeClass} ${textClass} ${className}`.trim()}>
      {buildLogoFallback(product || "Vote") || "V"}
    </div>
  );
}

function VotePreviewCard({
  category,
  product,
  logo,
  productImage,
  summary,
}: Pick<VoteOptionFormState, "category" | "product" | "logo" | "productImage" | "summary">) {
  const productLabel = product || "Ten san pham";
  const categoryLabel = category || "The loai";
  const accentColor = getPreviewAccent(categoryLabel);
  const detailImage = productImage || logo;
  const summaryText = summary.trim() || "Mo ta san pham se hien thi tai day.";

  return (
    <div className="space-y-3">
      <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Preview</div>
          <div className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            Vote card
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.2rem] border border-border bg-background shadow-sm">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <VoteLogoPreview logo={logo} product={productLabel} compact />

              <div className="min-w-0">
                <div className="mt-1 truncate text-[0.95rem] font-black text-foreground">{productLabel}</div>
                <div className="inline-flex max-w-full rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  <span className="truncate">{categoryLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-baseline gap-1 text-right">
                <span className="text-[0.95rem] font-bold text-foreground">156</span>
                <span className="text-[11px] text-muted-foreground">vote</span>
              </div>
              <div className="inline-flex min-w-[82px] items-center justify-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                <ThumbsUp className="size-3" />
                <span>Vote</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.7rem] border border-[#f1a0ff] bg-[linear-gradient(180deg,#d246b7_0%,#ba28b7_34%,#a117bc_68%,#8f12be_100%)] p-4 text-white shadow-[0_18px_38px_rgba(163,24,171,0.22)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/22" />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <VoteLogoPreview
              logo={logo}
              product={productLabel}
              fit="contain"
              className="border-white/35 bg-white"
            />
            <div className="min-w-0 flex-1 pt-1">
              <div className="mb-2 inline-flex rounded-full border border-white/28 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(255,105,200,0.18)]">
                <span className="truncate">{categoryLabel}</span>
              </div>
              <div className="line-clamp-2 text-[1.3rem] font-black leading-tight text-white">{productLabel}</div>
              <div className="mt-1 text-[12px] font-medium text-white/78">Đã đồng bộ dữ liệu</div>
            </div>
          </div>

          <div className="rounded-full border border-white/30 bg-white/10 p-2 text-white/82 shadow-[0_10px_18px_rgba(121,9,111,0.18)]">
            <X className="size-4" />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-[1rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,64,180,0.32)_0%,rgba(167,24,185,0.24)_100%)] px-3 py-3.5 text-center shadow-[0_14px_24px_rgba(116,7,109,0.16)]">
            <div className="text-[1.9rem] font-black leading-none text-white">299</div>
            <div className="mt-1 text-[0.86rem] font-semibold text-white/86">Lượt vote</div>
          </div>
          <div className="rounded-[1rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,64,180,0.32)_0%,rgba(167,24,185,0.24)_100%)] px-3 py-3.5 text-center shadow-[0_14px_24px_rgba(116,7,109,0.16)]">
            <div className="text-[1.9rem] font-black leading-none text-white">#3</div>
            <div className="mt-1 text-[0.86rem] font-semibold text-white/86">Xếp hạng</div>
          </div>
          <div className="rounded-[1rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,64,180,0.32)_0%,rgba(167,24,185,0.24)_100%)] px-3 py-3.5 text-center shadow-[0_14px_24px_rgba(116,7,109,0.16)]">
            <div className="text-[1.9rem] font-black leading-none text-white">12</div>
            <div className="mt-1 text-[0.86rem] font-semibold text-white/86">Ứng viên</div>
          </div>
        </div>

        <div className="mb-5 rounded-[1.15rem] border border-white/16 bg-[linear-gradient(180deg,rgba(245,34,162,0.22)_0%,rgba(128,11,171,0.22)_100%)] p-4 shadow-[0_16px_34px_rgba(139,9,142,0.16)]">
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4">
            <div className="flex min-h-[7.25rem] items-center justify-center rounded-[1rem] bg-white/10 px-2">
              <VoteLogoPreview
                logo={detailImage}
                product={productLabel}
                fit="contain"
                className="h-[92px] w-[92px] rounded-[1rem] border-white/18 bg-white/95"
              />
            </div>
            <div className="min-w-0 border-l border-white/24 pl-4">
              <div className="mb-1 text-sm font-semibold text-white">Giới thiệu</div>
              <div className="custom-scrollbar max-h-[8.5rem] overflow-y-auto pr-1">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/92">{summaryText}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-white/86">Tỷ lệ vote</span>
            <span className="font-semibold text-white">50%</span>
          </div>
          <div className="h-2 rounded-full bg-white/24">
            <div
              className="h-2 rounded-full"
              style={{
                width: "50%",
                background: `linear-gradient(90deg,#ffffff 0%,${accentColor}80 56%,#ffffff 100%)`,
              }}
            />
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-white/35 bg-[linear-gradient(180deg,#ff2b8d_0%,#ea0f7e_100%)] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(255,49,150,0.26)]">
          <ThumbsUp className="size-4" />
          Vote cho {productLabel}
        </div>
      </div>
    </div>
  );
}

export function VoteOptionManager({ initialData }: VoteOptionManagerProps) {
  const [data, setData] = React.useState<VoteOptionRecord[]>(initialData);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<VoteOptionFormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [categoryOptions, setCategoryOptions] = React.useState<CreatableSearchSelectOption[]>(
    buildInitialCategoryOptions(initialData),
  );
  const [productOptions, setProductOptions] = React.useState<CreatableSearchSelectOption[]>(
    buildInitialProductOptions(initialData),
  );

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const filteredData = React.useMemo(() => {
    if (!selectedCategory) return data;
    return data.filter((item) => item.category === selectedCategory);
  }, [data, selectedCategory]);

  const categories = React.useMemo(() => categoryOptions.map((item) => item.label), [categoryOptions]);

  const loadCatalogOptions = React.useCallback(async () => {
    try {
      const response = await fetch("/api/catalog-options");
      const result = (await response.json()) as CatalogResponse;
      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Khong the tai bo loc");
      }

      setCategoryOptions((current) => mergeOptionLists(current, result?.data?.categories ?? []));

      setProductOptions((current) => mergeOptionLists(current, result?.data?.products ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the tai du lieu bo loc");
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

  const handleCreateCategory = React.useCallback(
    async (label: string) => {
      const result = await mutateCatalogOption("category", label, "POST");
      if (!result.data) {
        return;
      }

      setCategoryOptions((current) =>
        [...current.filter((item) => item.label.toLowerCase() !== result.data!.label.toLowerCase()), result.data!].sort(
          (left, right) => left.label.localeCompare(right.label),
        ),
      );
      toast.success("Da them the loai moi");
      return result.data;
    },
    [mutateCatalogOption],
  );

  const handleDeleteCategory = React.useCallback(
    async (option: CreatableSearchSelectOption) => {
      const confirmed = window.confirm(`Xoa the loai "${option.label}"?`);
      if (!confirmed) {
        return;
      }

      await mutateCatalogOption("category", option.label, "DELETE");
      setCategoryOptions((current) =>
        current.filter((item) => item.label.toLowerCase() !== option.label.toLowerCase()),
      );
      toast.success("Da xoa the loai");
    },
    [mutateCatalogOption],
  );

  const handleCreateProduct = React.useCallback(
    async (label: string) => {
      const result = await mutateCatalogOption("product", label, "POST");
      if (!result.data) {
        return;
      }

      setProductOptions((current) =>
        [...current.filter((item) => item.label.toLowerCase() !== result.data!.label.toLowerCase()), result.data!].sort(
          (left, right) => left.label.localeCompare(right.label),
        ),
      );
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
      setProductOptions((current) => current.filter((item) => item.label.toLowerCase() !== option.label.toLowerCase()));
      toast.success("Da xoa san pham");
    },
    [mutateCatalogOption],
  );

  const openCreateDialog = React.useCallback(() => {
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = React.useCallback((item: VoteOptionRecord) => {
    setForm(buildFormState(item));
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
      toast.error("Logo qua lon. Vui long chon anh nho hon 5MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Tải ảnh thất bại: ${res.status} ${res.statusText}`);
      }

      const textResult = await res.text();
      let result;
      try {
        result = JSON.parse(textResult);
      } catch (e) {
        throw new Error("Lỗi đường truyền trả về sai định dạng. Có thể ảnh quá lớn hoặc server lỗi.");
      }

      if (!result.url) {
        throw new Error(result.error ?? "Upload failed");
      }

      setForm((current) => ({ ...current, logo: result.url }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the tai logo. Vui long thu lai.");
    }
  }, []);

  const handleProductImageFileChange = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Vui long chon file anh san pham");
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error("Anh san pham qua lon. Vui long chon anh nho hon 5MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !result.url) {
        throw new Error(result.error ?? `Tai anh that bai: ${res.status} ${res.statusText}`);
      }

      const productImageUrl = result.url;
      setForm((current) => ({ ...current, productImage: productImageUrl }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the tai anh san pham. Vui long thu lai.");
    }
  }, []);

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/vote-options", {
        method: form.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: form.id,
          category: form.category,
          product: form.product,
          logo: form.logo,
          productImage: form.productImage,
          summary: form.summary,
        }),
      });
      const result = (await response.json()) as { data?: VoteOptionRecord; message?: string };
      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Khong the luu vote");
      }

      setData((current) => {
        const next = current.filter((item) => item.id !== result.data?.id);
        return [result.data!, ...next];
      });
      setCategoryOptions((current) =>
        mergeOptionLists(
          current,
          form.category
            ? [{ id: `category-${buildOptionId(form.category)}`, label: form.category, deletable: false }]
            : [],
        ),
      );
      setProductOptions((current) =>
        mergeOptionLists(
          current,
          form.product ? [{ id: `product-${buildOptionId(form.product)}`, label: form.product, deletable: false }] : [],
        ),
      );
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
      toast.success(form.id ? "Đã cập nhật vote" : "Đã tạo vote mới");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the luu vote");
    } finally {
      setIsSaving(false);
    }
  }, [form]);

  const handleDelete = React.useCallback(async (item: VoteOptionRecord) => {
    const confirmed = window.confirm(`Xóa vote ${item.product}?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    try {
      const response = await fetch("/api/vote-options", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: item.id }),
      });
      const result = (await response.json()) as { deleted?: number; message?: string };
      if (!response.ok || !result.deleted) {
        throw new Error(result.message ?? "Khong the xoa vote");
      }

      setData((current) => current.filter((currentItem) => currentItem.id !== item.id));
      toast.success("Da xoa vote");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa vote");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const canSave = Boolean(normalizeLabel(form.category) && normalizeLabel(form.product));

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm h-full w-full">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-2 text-base font-bold text-primary">
            <Tags className="size-5" />
            Sản phẩm bình chọn
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 w-full lg:w-auto">
          <Button onClick={openCreateDialog} className="rounded-full shadow-sm hover:shadow-md transition-shadow">
            <Plus className="size-4 mr-1" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2 py-2 border-y border-dashed border-muted">
          <span className="text-xs text-muted-foreground mr-1 self-center font-medium">Thể loại hiện có:</span>
          <Badge
            variant={selectedCategory === null ? "default" : "secondary"}
            className={`cursor-pointer rounded-full px-3 py-1 font-semibold transition-colors ${
              selectedCategory === null ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted hover:bg-muted/80"
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            Tất cả
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "secondary"}
              className={`cursor-pointer rounded-full px-3 py-1 font-semibold transition-colors ${
                selectedCategory === category ? "bg-primary text-primary-foreground" : "text-muted-foreground bg-muted hover:bg-muted/80"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="nice-scroll max-h-[620px] overflow-y-auto rounded-lg border shadow-sm">
        <table className="relative w-full text-sm">
          <thead className="bg-muted sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <tr className="text-left text-muted-foreground">
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[11px]">Logo</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[11px]">Thể loại</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[11px]">Sản phẩm</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[11px]">Giới thiệu</th>
              <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider text-[11px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-16 text-center w-full">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Search className="size-8 text-muted-foreground/30" />
                    <span>Không tìm thấy sản phẩm nào.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <VoteLogoPreview logo={item.logo} product={item.product} />
                  </td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3 font-medium">{item.product}</td>
                  <td className="text-muted-foreground max-w-[360px] px-4 py-3">
                    <div className="line-clamp-2">{item.summary || "--"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                        <Pencil className="size-4" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === item.id}
                        onClick={() => void handleDelete(item)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-[2rem] border-border dark:border-slate-800 bg-background dark:bg-slate-900 p-0 shadow-lg sm:max-w-[1100px]">
          <div className="border-b border-border dark:border-slate-800 px-8 py-7">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-[2rem] text-foreground">{form.id ? "Sửa vote" : "Thêm vote"}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex flex-col gap-6 px-8 lg:flex-row lg:items-start pt-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-2 sm:flex-1">
                    <Label className="text-base font-semibold text-foreground">Thể loại</Label>
                    <CreatableSearchSelect
                      value={form.category}
                      options={categoryOptions}
                      placeholder="Chọn hoặc thêm thể loại"
                      searchPlaceholder="Tìm thể loại..."
                      onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}
                      onCreate={handleCreateCategory}
                      onDelete={handleDeleteCategory}
                    />
                  </div>

                  <div className="space-y-2 sm:flex-1">
                    <Label className="text-base font-semibold text-foreground">Sản phẩm</Label>
                    <CreatableSearchSelect
                      value={form.product}
                      options={productOptions}
                      placeholder="Chọn hoặc thêm sản phẩm"
                      searchPlaceholder="Tìm sản phẩm..."
                      onValueChange={(value) => setForm((current) => ({ ...current, product: value }))}
                      onCreate={handleCreateProduct}
                      onDelete={handleDeleteProduct}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-foreground">Ảnh logo</Label>
                  <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border bg-muted/20 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <VoteLogoPreview logo={form.logo} product={form.product || "Vote"} />
                      <div className="text-sm">
                        <div className="font-semibold text-foreground">
                          {isImageLogo(form.logo) ? "Đã chọn ảnh logo" : "Đang dùng logo chữ"}
                        </div>
                        <div className="mt-1 text-[13px] text-muted-foreground">
                          Khuyến nghị ảnh vuông, dung lượng dưới 512KB.
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[1rem] border border-input bg-background px-4 py-3 text-sm font-semibold whitespace-nowrap text-foreground shadow-sm hover:bg-muted transition-colors">
                        <ImagePlus className="size-4" />
                        Chọn ảnh
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                      </label>
                      {form.logo ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 rounded-[1rem] border-input bg-background whitespace-nowrap text-foreground"
                          onClick={() => setForm((current) => ({ ...current, logo: "" }))}
                        >
                          Xóa logo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-foreground">Ảnh sản phẩm</Label>
                  <div className="flex flex-col gap-4 rounded-[1.5rem] border border-border bg-muted/20 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <VoteLogoPreview
                        logo={form.productImage || form.logo}
                        product={form.product || "Vote"}
                        fit="contain"
                      />
                      <div className="text-sm">
                        <div className="font-semibold text-foreground">
                          {isImageLogo(form.productImage) ? "Đã chọn ảnh sản phẩm" : "Đang dùng ảnh sản phẩm mặc định"}
                        </div>
                        <div className="mt-1 text-[13px] text-muted-foreground">
                          Ảnh này sẽ hiện ở bên trái phần mô tả sản phẩm.
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[1rem] border border-input bg-background px-4 py-3 text-sm font-semibold whitespace-nowrap text-foreground shadow-sm hover:bg-muted transition-colors">
                        <ImagePlus className="size-4" />
                        Chọn ảnh
                        <input type="file" accept="image/*" className="hidden" onChange={handleProductImageFileChange} />
                      </label>
                      {form.productImage ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 rounded-[1rem] border-input bg-background whitespace-nowrap text-foreground"
                          onClick={() => setForm((current) => ({ ...current, productImage: "" }))}
                        >
                          Xóa ảnh
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-foreground">Giới thiệu</Label>
                  <Textarea
                    rows={6}
                    value={form.summary}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                      className="max-h-[200px] w-full min-w-0 resize-none break-words overflow-y-auto custom-scrollbar rounded-[1.2rem] border-input bg-background px-4 py-3 text-[15px] leading-7 shadow-sm ![field-sizing:fixed]"
                    placeholder="Nhập mô tả ngắn cho item vote..."
                  />
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[400px] lg:shrink-0">
              <VotePreviewCard
                category={form.category}
                product={form.product}
                logo={form.logo}
                productImage={form.productImage}
                summary={form.summary}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border px-8 py-6 pb-8">
            <Button variant="outline" className="rounded-[1rem] px-6" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              className="rounded-[1rem] px-6"
              onClick={() => void handleSave()}
              disabled={isSaving || !canSave}
            >
              {isSaving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
