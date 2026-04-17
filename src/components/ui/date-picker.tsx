"use client";

import * as React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ id, value, onChange, className, placeholder = "dd/mm/yyyy" }: DatePickerProps) {
  // Parsing the stored "yyyy-MM-dd" back to Date
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(`${value}T00:00:00`) : undefined
  );

  React.useEffect(() => {
    setDate(value ? new Date(`${value}T00:00:00`) : undefined);
  }, [value]);

  const handleSelect = (day: Date | undefined) => {
    setDate(day);
    if (day) {
      // Return simple "yyyy-MM-dd" format instead of ISO
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, "0");
      const dt = String(day.getDate()).padStart(2, "0");
      onChange?.(`${year}-${month}-${dt}`);
    } else {
      onChange?.("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal focus-visible:ring-1",
            !date && "text-slate-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: vi }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}