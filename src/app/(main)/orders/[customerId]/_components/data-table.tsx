"use client";

import * as React from "react";

import { Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { toggleFilteredRows, withSelectionColumn } from "@/components/data-table/selection-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { matchesSearchTerm } from "@/lib/search-utils";

import { dashboardColumns as makeColumns } from "../../_components/columns";
import type { Channel } from "../../_components/schema";

export function DataTable({ data: initialData }: { data: Channel[] }) {
  const [data, setData] = React.useState<Channel[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredData = React.useMemo(() => {
    return data.filter((item) =>
      matchesSearchTerm(searchTerm, [item.ordercode, item.name, item.phone, item.email, item.class]),
    );
  }, [data, searchTerm]);

  const handleDeleteRow = React.useCallback(async (row: Channel) => {
    try {
      if (!row.ordercode) {
        throw new Error("Ban ghi khong co ma don de xoa");
      }

      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes: [row.ordercode] }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Khong the xoa don hang");
      }

      setData((previous) => previous.filter((item) => item.ordercode !== row.ordercode));
      toast.success("Da xoa don hang");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa don hang");
    }
  }, []);

  const columns = React.useMemo(() => withSelectionColumn(makeColumns(undefined, handleDeleteRow)), [handleDeleteRow]);
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => `${row.ordercode || row.phone || ""}-${row.create_time?.toString() ?? ""}`,
  });
  const selectedItems = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selectedItems.length) {
      toast.warning("Vui long chon don hang can xoa");
      return;
    }

    if (!window.confirm(`Xoa ${selectedItems.length} don hang da chon?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const orderCodes = selectedItems.map((item) => item.ordercode).filter((value): value is string => Boolean(value));

      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Khong the xoa don hang");
      }

      const deletedSet = new Set(orderCodes);
      setData((previous) => previous.filter((item) => !deletedSet.has(item.ordercode)));
      table.resetRowSelection();
      toast.success(`Da xoa ${orderCodes.length} don hang`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa don hang");
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
            placeholder="Tìm kiếm theo tên, mã, SĐT, email..."
            className="pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => toggleFilteredRows(table, true)}>
            Chọn tất cả
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleFilteredRows(table, false)}>
            Bỏ chọn tất cả
          </Button>
          {selectedItems.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
              {isDeleting ? "Dang xoa..." : `Xoa (${selectedItems.length})`}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="table-scroll overflow-hidden rounded-lg">
        <DataTableNew table={table} columns={columns} />
      </div>
    </div>
  );
}
