"use client";

import * as React from "react";

import { Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableBase } from "@/components/data-table/data-table";
import { toggleFilteredRows, withSelectionColumn } from "@/components/data-table/selection-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { matchesSearchTerm } from "@/lib/search-utils";

import { CreateAccountDialog } from "./create-account-dialog";
import { dashboardColumns } from "./columns";
import type { AccountUser } from "./schema";

export function DataTable({ data: initialData }: { data: AccountUser[] }) {
  const [data, setData] = React.useState<AccountUser[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const filteredData = React.useMemo(() => {
    return data.filter((item) =>
      matchesSearchTerm(searchTerm, [
        item.name,
        item.username,
        item.email,
        item.phone,
        item.role,
        item.status,
        item.zid,
      ]),
    );
  }, [data, searchTerm]);

  const handleRowUpdated = React.useCallback((updated: AccountUser) => {
    setData((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    toast.success("Đã cập nhật tài khoản");
  }, []);

  const handleDeleteRow = React.useCallback(async (row: AccountUser) => {
    const response = await fetch("/api/admin-users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [row.id] }),
    });

    const result = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      throw new Error(result.message ?? "Không thể xóa tài khoản");
    }

    setData((prev) => prev.filter((item) => item.id !== row.id));
    toast.success("Đã xóa tài khoản");
  }, []);

  const columns = React.useMemo(
    () => withSelectionColumn(dashboardColumns(handleRowUpdated, handleDeleteRow)),
    [handleDeleteRow, handleRowUpdated],
  );

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => String(row.id),
  });
  const selectedItems = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selectedItems.length) {
      toast.warning("Vui lòng chọn tài khoản cần xóa");
      return;
    }

    if (!window.confirm(`Xóa ${selectedItems.length} tài khoản đã chọn?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedItems.map((item) => item.id) }),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "Không thể xóa tài khoản");
      }

      const deletedIds = new Set(selectedItems.map((item) => item.id));
      setData((prev) => prev.filter((item) => !deletedIds.has(item.id)));
      table.resetRowSelection();
      toast.success(`Đã xóa ${selectedItems.length} tài khoản`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa tài khoản");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, table]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            autoComplete="off"
            name="user-search"
            placeholder="Tìm theo tên, username, email, SDT, vai trò..."
            className="pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <CreateAccountDialog />
          <Button size="sm" variant="outline" onClick={() => toggleFilteredRows(table, true)}>
            Chọn tất cả
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleFilteredRows(table, false)}>
            Bỏ chọn tất cả
          </Button>
          {selectedItems.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : `Xóa (${selectedItems.length})`}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTableBase table={table} columns={columns} />
      </div>
    </div>
  );
}
