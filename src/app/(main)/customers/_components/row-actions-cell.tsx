"use client";

import * as React from "react";

import { EllipsisVertical } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Users } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

type OnRowUpdated = (updated: Users) => void;
type OnDuplicateRow = (row: Users) => Promise<void> | void;
type OnDeleteRow = (row: Users) => Promise<void> | void;

type RowActionsCellProps = {
  row: Users;
  onRowUpdated?: OnRowUpdated;
  onDuplicateRow?: OnDuplicateRow;
  onDeleteRow?: OnDeleteRow;
};

export function RowActionsCell({ row, onRowUpdated, onDuplicateRow, onDeleteRow }: RowActionsCellProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDuplicate = React.useCallback(async () => {
    if (!onDuplicateRow || isDuplicating) {
      return;
    }

    setIsDuplicating(true);
    try {
      await onDuplicateRow(row);
    } finally {
      setIsDuplicating(false);
    }
  }, [isDuplicating, onDuplicateRow, row]);

  const handleDelete = React.useCallback(async () => {
    if (!onDeleteRow || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteRow(row);
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, onDeleteRow, row]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
            <EllipsisVertical />
            <span className="sr-only">Mở menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <TableCellViewer
            item={row}
            onUpdated={onRowUpdated}
            triggerElement={
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Xem chi tiết</DropdownMenuItem>
            }
          />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void handleDuplicate();
            }}
            disabled={!onDuplicateRow || isDuplicating}
          >
            {isDuplicating ? "Đang tạo..." : "Tạo bản sao"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              if (!onDeleteRow || isDeleting) {
                return;
              }

              setDeleteOpen(true);
            }}
            disabled={!onDeleteRow || isDeleting}
          >
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khách hàng này?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa khách hàng <strong>{row.name || row.customer_ID}</strong>? ành động này không
              thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
