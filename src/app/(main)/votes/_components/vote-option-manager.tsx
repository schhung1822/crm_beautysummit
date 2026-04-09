"use client";

import * as React from "react";

import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VoteOptionRecord } from "@/lib/vote-options";

type VoteOptionManagerProps = {
  initialData: VoteOptionRecord[];
};

type VoteOptionFormState = {
  id: number | null;
  brandId: string;
  name: string;
  category: string;
  product: string;
  summary: string;
  link: string;
};

const DEFAULT_FORM: VoteOptionFormState = {
  id: null,
  brandId: "",
  name: "",
  category: "",
  product: "",
  summary: "",
  link: "",
};

function buildFormState(item?: VoteOptionRecord | null): VoteOptionFormState {
  if (!item) {
    return DEFAULT_FORM;
  }

  return {
    id: item.id,
    brandId: item.brandId,
    name: item.name,
    category: item.category,
    product: item.product,
    summary: item.summary,
    link: item.link,
  };
}

export function VoteOptionManager({ initialData }: VoteOptionManagerProps) {
  const [data, setData] = React.useState<VoteOptionRecord[]>(initialData);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<VoteOptionFormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const categories = React.useMemo(
    () => Array.from(new Set(data.map((item) => item.category).filter(Boolean))).sort(),
    [data],
  );

  const openCreateDialog = React.useCallback(() => {
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = React.useCallback((item: VoteOptionRecord) => {
    setForm(buildFormState(item));
    setDialogOpen(true);
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
          brandId: form.brandId,
          name: form.name,
          category: form.category,
          product: form.product,
          summary: form.summary,
          link: form.link,
        }),
      });
      const result = (await response.json()) as { data?: VoteOptionRecord; message?: string };
      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Khong the luu ung vien");
      }

      setData((current) => {
        const next = current.filter((item) => item.id !== result.data?.id);
        return [result.data!, ...next];
      });
      setDialogOpen(false);
      setForm(DEFAULT_FORM);
      toast.success(form.id ? "Da cap nhat ung vien" : "Da tao ung vien moi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the luu ung vien");
    } finally {
      setIsSaving(false);
    }
  }, [form]);

  const handleDelete = React.useCallback(async (item: VoteOptionRecord) => {
    const confirmed = window.confirm(`Xoa ung vien ${item.name}?`);
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
        throw new Error(result.message ?? "Khong the xoa ung vien");
      }

      setData((current) => current.filter((currentItem) => currentItem.id !== item.id));
      toast.success("Da xoa ung vien");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa ung vien");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            <Tags className="size-4" />
            Quan ly the loai va ung vien binh chon
          </div>
          <div className="text-muted-foreground mt-1 text-sm">
            Du lieu nay duoc dong bo sang mini app de user binh chon theo the loai.
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Them ung vien
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">The loai</th>
              <th className="px-4 py-3 font-medium">Ung vien</th>
              <th className="px-4 py-3 font-medium">San pham</th>
              <th className="px-4 py-3 font-medium">Tom tat</th>
              <th className="px-4 py-3 text-right font-medium">Thao tac</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                  Chua co ung vien nao.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground mt-1 font-mono text-xs">{item.brandId}</div>
                  </td>
                  <td className="px-4 py-3">{item.product || "--"}</td>
                  <td className="px-4 py-3">{item.summary || "--"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                        <Pencil className="size-4" />
                        Sua
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === item.id}
                        onClick={() => void handleDelete(item)}
                      >
                        <Trash2 className="size-4" />
                        Xoa
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Cap nhat ung vien" : "Them ung vien"}</DialogTitle>
            <DialogDescription>
              Admin tao the loai va san pham tai day, mini app se load va hien thi theo the loai.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>The loai</Label>
              <Input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ten ung vien</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ma ung vien</Label>
              <Input
                value={form.brandId}
                onChange={(event) => setForm((current) => ({ ...current, brandId: event.target.value }))}
                placeholder="Bo trong de he thong tu tao"
              />
            </div>
            <div className="space-y-1.5">
              <Label>San pham</Label>
              <Input
                value={form.product}
                onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tom tat</Label>
              <Textarea
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Link</Label>
              <Input
                value={form.link}
                onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huy
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Dang luu..." : form.id ? "Luu thay doi" : "Them ung vien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
