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

function VoteLogoPreview({ logo, product, compact = false }: { logo: string | null | undefined; product: string; compact?: boolean }) {
  const sizeClass = compact ? "h-[58px] w-[58px] rounded-[0.9rem]" : "h-[4.5rem] w-[4.5rem] rounded-[1.2rem]";
  const textClass = compact ? "text-[1.2rem]" : "text-[2rem]";

  if (isImageLogo(logo)) {
    const absolutelogo = getAbsoluteImageUrl(logo);
    return (
      <div
        className={`flex items-center justify-center overflow-hidden border border-[#eadfd2] bg-white shadow-[0_8px_18px_rgba(184,134,11,0.08)] ${sizeClass}`}
      >
        <img src={absolutelogo} alt={product} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center border border-[#f3b9e1] bg-[linear-gradient(135deg,#7c1d5b,#db2777)] font-black text-white shadow-[0_12px_24px_rgba(219,39,119,0.18)] ${sizeClass} ${textClass}`}
    >
      {buildLogoFallback(product || "Vote") || "V"}
    </div>
  );
}

function VotePreviewCard({
  category,
  product,
  logo,
  summary,
}: Pick<VoteOptionFormState, "category" | "product" | "logo" | "summary">) {
  const productLabel = product || "Ten san pham";
  const categoryLabel = category || "The loai";
  const accentColor = getPreviewAccent(categoryLabel);

  return (
    <div className="space-y-3">
      <div className="rounded-[1.5rem] border border-[#f0e4d8] bg-[linear-gradient(145deg,#fffdf9,#fff8f1)] p-4 shadow-[0_14px_32px_rgba(184,134,11,0.06)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.16em] text-[#8a7e8b] uppercase">Preview</div>
          <div className="rounded-full border border-[#f4e7da] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#b088a6]">
            Vote card
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.2rem] border border-[#eadfd2] bg-white shadow">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <VoteLogoPreview logo={logo} product={productLabel} compact />

              <div className="min-w-0">
                <div className="mt-1 truncate text-[0.95rem] font-black text-[#1f2937]">{productLabel}</div>
                <div className="inline-flex max-w-full rounded bg-[#f4e8ff] px-1.5 py-0.5 text-[11px] font-semibold text-[#8b34ff]">
                  <span className="truncate">{categoryLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="flex items-baseline gap-1 text-right">
                <span className="text-[0.95rem] font-bold text-[#111827]">156</span>
                <span className="text-[11px] text-[#8a7e8b]">vote</span>
              </div>
              <div className="inline-flex min-w-[82px] items-center justify-center gap-1 rounded-full border border-[#ece7f2] bg-[#faf8fc] px-2.5 py-1 text-xs font-semibold text-[#4a5568] shadow-sm">
                <ThumbsUp className="size-3" />
                <span>Vote</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[#f0e4d8] bg-[linear-gradient(145deg,#fffdf9,#fff8f1)] p-4 shadow-[0_14px_32px_rgba(184,134,11,0.06)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#e3d8df]" />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <VoteLogoPreview logo={logo} product={productLabel} />
            <div className="min-w-0">
              <div
                className="mb-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: `${accentColor}33`,
                  color: accentColor,
                  background: `${accentColor}12`,
                }}
              >
                {categoryLabel}
              </div>
              <div className="truncate text-[1.2rem] font-black text-[#241629]">{productLabel}</div>
              <div className="mt-1 text-[12px] font-medium text-[#8a7e8b]">Đã đồng bộ dữ liệu</div>
            </div>
          </div>

          <div className="rounded-full border border-[#eadfd2] bg-white p-2 text-[#8a7e8b]">
            <X className="size-4" />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-[1rem] border border-[#eadfd2] bg-white px-3 py-3.5 text-center">
            <div className="text-lg font-black" style={{ color: accentColor }}>
              1
            </div>
            <div className="mt-1 text-[11px] text-[#8a7e8b]">Lượt vote</div>
          </div>
          <div className="rounded-[1rem] border border-[#eadfd2] bg-white px-3 py-3.5 text-center">
            <div className="text-lg font-black text-[#241629]">#1</div>
            <div className="mt-1 text-[11px] text-[#8a7e8b]">Xếp hạng</div>
          </div>
          <div className="rounded-[1rem] border border-[#eadfd2] bg-white px-3 py-3.5 text-center">
            <div className="text-lg font-black text-[#b8860b]">1</div>
            <div className="mt-1 text-[11px] text-[#8a7e8b]">Ứng viên</div>
          </div>
        </div>

        <div className="mb-5 rounded-[1.1rem] border border-[#eadfd2] bg-white p-4 shadow-[0_10px_22px_rgba(184,134,11,0.06)] max-h-[160px] overflow-y-auto custom-scrollbar">
          <div className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#9a8f9d] uppercase">Tóm tắt</div>
            <p className="text-sm leading-6 text-[#5b5360] whitespace-pre-wrap break-words">{summary}</p>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-[#8a7e8b]">Tỷ lệ vote</span>
            <span className="font-semibold" style={{ color: accentColor }}>
              100%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#efe8f0]">
            <div
              className="h-2 rounded-full"
              style={{
                width: "100%",
                background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
              }}
            />
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfd2] bg-white px-4 py-3 text-sm font-bold text-[#5f5662]">
          <ThumbsUp className="size-4" />
          Bỏ chọn mục này
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
              selectedCategory === null ? "bg-primary text-primary-foreground" : "text-slate-600 bg-slate-100 hover:bg-slate-200"
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
                selectedCategory === category ? "bg-primary text-primary-foreground" : "text-slate-600 bg-slate-100 hover:bg-slate-200"
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
          <thead className="bg-[#f8f9fa] sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <tr className="text-left text-[#4b5563]">
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
                    <Search className="size-8 text-slate-300" />
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
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-[2rem] border-0 bg-white p-0 shadow-[0_32px_90px_rgba(17,24,39,0.18)] sm:max-w-[1100px]">
          <div className="border-b border-[#f2e8dd] px-8 py-7">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-[2rem] text-[#111827]">{form.id ? "Sửa vote" : "Thêm vote"}</DialogTitle>
            </DialogHeader>
          </div>

          <div className="flex flex-col gap-6 px-8 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-2 sm:flex-1">
                    <Label className="text-base font-semibold text-[#241629]">Thể loại</Label>
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
                    <Label className="text-base font-semibold text-[#241629]">Sản phẩm</Label>
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
                  <Label className="text-base font-semibold text-[#241629]">Ảnh logo</Label>
                  <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[#f0e1cf] bg-[linear-gradient(145deg,#fffdf8,#fff6ea)] p-4 shadow-[0_12px_30px_rgba(184,134,11,0.07)] sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <VoteLogoPreview logo={form.logo} product={form.product || "Vote"} />
                      <div className="text-sm">
                        <div className="font-semibold text-[#241629]">
                          {isImageLogo(form.logo) ? "Đã chọn ảnh logo" : "Đang dùng logo chữ"}
                        </div>
                        <div className="mt-1 text-[13px] text-[#7a7280]">
                          Khuyến nghị ảnh vuông, dung lượng dưới 512KB.
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[1rem] border border-[#eadfd2] bg-white px-4 py-3 text-sm font-semibold whitespace-nowrap text-[#241629] shadow-[0_8px_18px_rgba(184,134,11,0.05)]">
                        <ImagePlus className="size-4" />
                        Chọn ảnh
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                      </label>
                      {form.logo ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 rounded-[1rem] border-[#eadfd2] bg-white whitespace-nowrap text-[#241629]"
                          onClick={() => setForm((current) => ({ ...current, logo: "" }))}
                        >
                          Xóa logo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold text-[#241629]">Giới thiệu</Label>
                  <Textarea
                    rows={6}
                    value={form.summary}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                      className="max-h-[200px] w-full min-w-0 resize-none break-words overflow-y-auto custom-scrollbar rounded-[1.2rem] border-[#eadfd2] bg-white px-4 py-3 text-[15px] leading-7 shadow-[0_10px_24px_rgba(184,134,11,0.05)] ![field-sizing:fixed]"
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
                summary={form.summary}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#f2e8dd] px-8 py-6">
            <Button variant="outline" className="rounded-[1rem] px-6" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              className="rounded-[1rem] bg-[#111111] px-6 text-white hover:bg-[#1f1f1f]"
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
