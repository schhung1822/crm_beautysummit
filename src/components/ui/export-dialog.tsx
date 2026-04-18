"use client";

import * as React from "react";

import { format as formatDate } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type ExportFormat = "csv" | "xlsx";
export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat, dateRange: DateRange) => void;
  isExporting?: boolean;
  title?: string;
  description?: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  isExporting = false,
  title = "Xuất dữ liệu",
  description = "Chọn định dạng và khoảng thời gian để xuất dữ liệu",
}: ExportDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>("xlsx");
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const handleExport = () => {
    onExport(format, dateRange);
  };

  const handleReset = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Định dạng file</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label
                  htmlFor="xlsx"
                  className="flex flex-1 cursor-pointer items-center gap-3"
                >
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div className="space-y-0.5">
                    <div className="font-medium">Excel (.xlsx)</div>
                    <div className="text-xs text-muted-foreground">
                      Phù hợp để mở bằng Microsoft Excel, Google Sheets
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent">
                <RadioGroupItem value="csv" id="csv" />
                <Label
                  htmlFor="csv"
                  className="flex flex-1 cursor-pointer items-center gap-3"
                >
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div className="space-y-0.5">
                    <div className="font-medium">CSV (.csv)</div>
                    <div className="text-xs text-muted-foreground">
                      Định dạng văn bản đơn giản, tương thích với mọi phần mềm
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Khoảng thời gian (tùy chọn)</Label>
              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-auto p-0 text-xs"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {dateRange.from ? (
                        formatDate(dateRange.from, "dd/MM/yyyy", { locale: vi })
                      ) : (
                        "Từ ngày"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) =>
                      setDateRange((prev) => ({ ...prev, from: date }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {dateRange.to ? (
                        formatDate(dateRange.to, "dd/MM/yyyy", { locale: vi })
                      ) : (
                        "Đến ngày"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) =>
                      setDateRange((prev) => ({ ...prev, to: date }))
                    }
                    disabled={(date) =>
                      dateRange.from ? date < dateRange.from : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {dateRange.from && dateRange.to && (
              <p className="text-xs text-muted-foreground">
                Xuất dữ liệu từ {formatDate(dateRange.from, "dd/MM/yyyy", { locale: vi })} đến{" "}
                {formatDate(dateRange.to, "dd/MM/yyyy", { locale: vi })}
              </p>
            )}
            {!dateRange.from && !dateRange.to && (
              <p className="text-xs text-muted-foreground">
                Nếu không chọn, sẽ xuất toàn bộ dữ liệu hiện có
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Hủy
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Đang xuất..." : "Xuất dữ liệu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
