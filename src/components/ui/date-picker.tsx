"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  onEnter?: (value: string) => void;
  onSelectDate?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ id, value, onChange, onEnter, onSelectDate, className, placeholder = "dd/mm/yyyy" }: DatePickerProps) {
  // Parsing the stored "yyyy-MM-dd" back to Date
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(`${value}T00:00:00`) : undefined
  );
  
  const [inputValue, setInputValue] = React.useState<string>(
    value ? format(new Date(`${value}T00:00:00`), "dd/MM/yyyy") : ""
  );

  const [error, setError] = React.useState<string | null>(null);

  // Sync external value
  React.useEffect(() => {
    if (value) {
      const parsed = new Date(`${value}T00:00:00`);
      if (isValid(parsed) && parsed.getFullYear() > 1900) {
         setDate(parsed);
         setError(null);
         const currentFormatted = format(parsed, "dd/MM/yyyy");
         if (inputValue !== currentFormatted && inputValue.length !== 10) {
            setInputValue(currentFormatted);
         }
      }
    } else {
      setDate(undefined);
      setInputValue("");
      setError(null);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const isDeleting = rawVal.length < inputValue.length;

    let v = rawVal;

    if (!isDeleting) {
      // Keep only digits and slash
      v = rawVal.replace(/[^\d/]/g, "");

      // Extract raw digits
      let digits = v.replace(/\//g, "");

      // Validate day limits (1-31)
      if (digits.length >= 2) {
        let day = parseInt(digits.substring(0, 2), 10);
        if (day > 31) digits = "31" + digits.substring(2);
        else if (day === 0) digits = "01" + digits.substring(2);
      }

      // Validate month limits (1-12)
      if (digits.length >= 4) {
        let month = parseInt(digits.substring(2, 4), 10);
        if (month > 12) digits = digits.substring(0, 2) + "12" + digits.substring(4);
        else if (month === 0) digits = digits.substring(0, 2) + "01" + digits.substring(4);
      }

      // Auto-insert slashes
      if (digits.length < 2) {
        v = digits;
      } else if (digits.length === 2) {
        v = digits + "/";
      } else if (digits.length < 4) {
        v = digits.substring(0, 2) + "/" + digits.substring(2);
      } else if (digits.length === 4) {
        v = digits.substring(0, 2) + "/" + digits.substring(2) + "/";
      } else {
        v = digits.substring(0, 2) + "/" + digits.substring(2, 4) + "/" + digits.substring(4, 8);
      }
    }

    setInputValue(v);

    if (!v) {
      setDate(undefined);
      setError(null);
      onChange?.("");
      return;
    }

    // Attempt to parse manually typed date
    const parsedDate = parse(v, "dd/MM/yyyy", new Date());
    if (isValid(parsedDate) && parsedDate.getFullYear() > 1000 && v.length === 10) {
      setError(null);
      setDate(parsedDate);
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const dt = String(parsedDate.getDate()).padStart(2, "0");
      
      // Strict date check (e.g. Feb 30 becomes Mar 2 during parse, so format back and verify)
      const isExactMatch = format(parsedDate, "dd/MM/yyyy") === v;
      if (!isExactMatch) {
         setDate(undefined);
         setError("Ngày không có thực");
         onChange?.("");
      } else {
         onChange?.(`${year}-${month}-${dt}`);
      }
    } else {
       // Clear matched date if invalid while typing
       setDate(undefined);
       if (v.length === 10) {
         setError("Ngày không hợp lệ");
       } else {
         setError(null);
       }
       onChange?.("");
    }
  };

  const handleBlur = () => {
    if (!inputValue) {
      setError(null);
      return;
    }
    const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate) || parsedDate.getFullYear() <= 1000) {
      setError("Sai định dạng dd/mm/yyyy");
    } else {
      setError(null);
    }
  };

  const parseInputValue = (): string | null => {
    if (!inputValue || inputValue.length !== 10) {
      return null;
    }

    const parsedDate = parse(inputValue, "dd/MM/yyyy", new Date());
    if (!isValid(parsedDate) || parsedDate.getFullYear() <= 1000) {
      return null;
    }

    if (format(parsedDate, "dd/MM/yyyy") !== inputValue) {
      return null;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const dt = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${dt}`;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const nextValue = parseInputValue();
    if (!nextValue) {
      setError("Ngày không hợp lệ");
      return;
    }

    event.preventDefault();
    setError(null);
    onEnter?.(nextValue);
  };

  const handleSelect = (day: Date | undefined) => {
    setDate(day);
    if (day) {
      // Return simple "yyyy-MM-dd" format instead of ISO
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, "0");
      const dt = String(day.getDate()).padStart(2, "0");
      setInputValue(format(day, "dd/MM/yyyy"));
      setError(null);
      const nextValue = `${year}-${month}-${dt}`;
      onChange?.(nextValue);
      onSelectDate?.(nextValue);
    } else {
      setInputValue("");
      setError(null);
      onChange?.("");
    }
  };

  return (
    <div className={cn("flex flex-col w-full gap-1.5", className)} id={id}>
      <div className="flex w-full items-center gap-1">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn("flex-1 focus-visible:ring-1", error && "border-destructive focus-visible:ring-destructive")}
          maxLength={10}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              type="button"
              className={cn("px-3", error && "border-destructive text-destructive")}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <span className="text-[11px] font-medium text-destructive px-1">{error}</span>}
    </div>
  );
}
