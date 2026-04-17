"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export type CheckinLocation = {
  id: number;
  name: string;
  allowed_tiers: string;
  image_url: string | null;
  prerequisite: string | null;
  nc_order: number | null;
  is_active: number;
  event_date: string | null;
};

export function CheckinLocationManager({ initialData }: { initialData: CheckinLocation[] }) {
  const [data, setData] = React.useState<CheckinLocation[]>(initialData);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<Partial<CheckinLocation>>({});
  const [isUploading, setIsUploading] = React.useState(false);

  const TICKET_TIERS = ["RUBY", "GOLD", "VIP"];

  const toggleTier = (tier: string) => {
    const currentTiers = form.allowed_tiers ? form.allowed_tiers.split(",").filter(Boolean) : [];
    if (currentTiers.includes(tier)) {
      setForm({ ...form, allowed_tiers: currentTiers.filter((t) => t !== tier).join(",") });
    } else {
      setForm({ ...form, allowed_tiers: [...currentTiers, tier].join(",") });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await res.json();
      
      if (res.ok && uploadData.url) {
        setForm({ ...form, image_url: uploadData.url });
      } else {
        toast.error(uploadData.error || "Lỗi upload ảnh");
      }
    } catch {
      toast.error("Lỗi mạng khi upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (item?: CheckinLocation) => {
    if (item) {
      setForm(item);
    } else {
      setForm({ name: "", allowed_tiers: "GOLD,RUBY,VIP", image_url: "", prerequisite: "", nc_order: data.length + 1, is_active: 1, event_date: new Date().toISOString().split('T')[0] });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.allowed_tiers) {
      toast.error("Vui lòng điền đủ tên và loại vé!");
      return;
    }
    if (!form.event_date) {
      toast.error("Vui lòng chọn ngày sự kiện cho địa điểm này!");
      return;
    }

    try {
      const res = await fetch("/api/checkin-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Lưu thành công");
        setOpen(false);
        // basic refetch
        const fetchRes = await fetch("/api/checkin-locations");
        const json = await fetchRes.json();
        setData(json.data);
      } else {
        toast.error("Lỗi khi lưu");
      }
    } catch {
      toast.error("Lỗi khi lưu");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xoá địa điểm này?")) return;
    try {
      const res = await fetch(`/api/checkin-locations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Xoá thành công");
        setData((prev) => prev.filter((i) => i.id !== id));
      } else {
        toast.error("Lỗi xoá");
      }
    } catch {
      toast.error("Lỗi mạng");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => handleEdit()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm địa điểm
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <Card key={item.id} className="flex flex-col overflow-hidden">
            {item.image_url ? (
              <div
                className="h-24 bg-cover bg-center shrink-0"
                style={{ backgroundImage: `url(${item.image_url})` }}
              />
            ) : (
              <div className="h-24 bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-slate-400 text-sm">Chưa có ảnh</span>
              </div>
            )}
            <div className="p-3 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-base">{item.name}</h3>
                {!item.is_active && <Badge variant="outline" className="text-muted-foreground text-[10px] px-1 py-0 h-4">Ẩn</Badge>}
              </div>
              
              <div className="space-y-1 mb-3">
                <p className="text-xs text-slate-500">
                  <span className="font-medium">Ngày:</span> {item.event_date ? item.event_date.split('-').reverse().join('/') : "Chưa chọn"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs font-medium text-slate-500 mr-1">Hạng vé:</span>
                  {item.allowed_tiers.split(",").map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {t}
                    </Badge>
                  ))}
                </div>
                {item.prerequisite && (
                  <p className="text-xs text-rose-500 leading-tight">
                    Cần qua: {data.find((d) => String(d.id) === String(item.prerequisite))?.name || item.prerequisite}
                  </p>
                )}
              </div>

              <div className="mt-auto flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Sửa địa điểm" : "Thêm địa điểm"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>Tên địa điểm</Label>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ví dụ: Cổng vào"
                />
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <Label>Active</Label>
                <div className="h-10 flex items-center">
                  <Switch
                    checked={form.is_active !== 0}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked ? 1 : 0 })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3 mb-2">
              <Label>Loại vé cho phép check-in địa điểm này</Label>
              <div className="flex gap-4">
                {TICKET_TIERS.map((tier) => (
                  <div key={tier} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tier-${tier}`}
                      checked={!!form.allowed_tiers?.split(",").includes(tier)}
                      onCheckedChange={() => toggleTier(tier)}
                    />
                    <Label htmlFor={`tier-${tier}`} className="text-sm font-normal">
                      {tier}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ảnh địa điểm</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              {isUploading && <p className="text-xs text-muted-foreground">Đang tải ảnh lên...</p>}
              {form.image_url && (
                <div className="mt-2 relative w-full h-32 rounded bg-cover bg-center border" style={{ backgroundImage: `url(${form.image_url})` }} />
              )}
            </div>
            <div className="space-y-2">
              <Label>Địa điểm cần check-in trước</Label>
              <Select
                value={form.prerequisite || "none"}
                onValueChange={(val) => setForm({ ...form, prerequisite: val === "none" ? null : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khu vực..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không yêu cầu</SelectItem>
                  {data
                    .filter((d) => d.id !== form.id)
                    .map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ngày diễn ra Check-in</Label>
              <Input
                type="date"
                lang="en-GB"
                value={form.event_date || ""}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave}>Lưu lại</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
