import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Row, flexRender } from "@tanstack/react-table";

import { TableCell, TableRow } from "@/components/ui/table";

function getColumnPixelSize(columnId: string, size: number) {
  if (columnId === "drag") {
    return 40;
  }

  if (columnId === "select") {
    return 44;
  }

  if (columnId === "actions") {
    return 64;
  }

  return size;
}

function getCellTooltipValue<TData>(row: Row<TData>, columnId: string) {
  const rawValue = row.getValue(columnId);
  if (rawValue == null) {
    return undefined;
  }

  if (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean") {
    const normalized = String(rawValue).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

export function DraggableRow<TData>({ row }: { row: Row<TData> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.id,
  });
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => {
        const columnSize = getColumnPixelSize(cell.column.id, cell.column.getSize());

        return (
          <TableCell
            key={cell.id}
            style={{ width: columnSize, maxWidth: columnSize }}
            title={
              cell.column.id === "select" || cell.column.id === "actions"
                ? undefined
                : getCellTooltipValue(row, cell.column.id)
            }
            className={
              cell.column.id === "drag"
                ? "w-10 max-w-10 min-w-10 p-0 text-center"
                : cell.column.id === "select"
                  ? "w-11 max-w-11 min-w-11 p-0 text-center"
                  : cell.column.id === "actions"
                    ? "w-16 max-w-16 min-w-16"
                    : "max-w-0"
            }
          >
            {cell.column.id === "select" || cell.column.id === "actions" ? (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            ) : (
              <div className="max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [&>*]:max-w-full">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
