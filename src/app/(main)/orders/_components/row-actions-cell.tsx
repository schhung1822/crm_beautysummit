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

import type { Channel } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

type OnRowUpdated = (updated: Channel, originalOrderCode: string) => void;
type OnDeleteRow = (row: Channel) => Promise<void> | void;

type RowActionsCellProps = {
  row: Channel;
  onRowUpdated?: OnRowUpdated;
  onDeleteRow?: OnDeleteRow;
};

export function RowActionsCell({ row, onRowUpdated, onDeleteRow }: RowActionsCellProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    if (!onDeleteRow) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteRow(row);
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteRow, row]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <TableCellViewer
            item={row}
            onRowUpdated={onRowUpdated}
            triggerElement={
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>Xem chi tiet</DropdownMenuItem>
            }
          />
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
            Xoa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoa ban ghi nay?</AlertDialogTitle>
            <AlertDialogDescription>
              Ban co chac chan muon xoa don <strong>{row.ordercode}</strong>? Hanh dong nay khong the hoan tac.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Huy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Dang xoa..." : "Xoa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
