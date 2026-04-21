"use client";

import * as React from "react";

import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizeSearchText } from "@/lib/search-utils";
import { cn } from "@/lib/utils";

export type CreatableSearchSelectOption = {
  id: string;
  label: string;
  deletable?: boolean;
};

type CreatableSearchSelectProps = {
  value: string;
  options: CreatableSearchSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  onValueChange: (value: string) => void;
  onCreate?: (label: string) => Promise<CreatableSearchSelectOption | void> | CreatableSearchSelectOption | void;
  onDelete?: (option: CreatableSearchSelectOption) => Promise<void> | void;
};

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeLookup(value: string): string {
  return normalizeSearchText(normalizeLabel(value));
}

export function CreatableSearchSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel = "Khong co du lieu",
  disabled = false,
  className,
  triggerClassName,
  onValueChange,
  onCreate,
  onDelete,
}: CreatableSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [deletingKey, setDeletingKey] = React.useState<string | null>(null);

  const normalizedQuery = normalizeLabel(query);
  const normalizedValue = normalizeLabel(value);

  const filteredOptions = React.useMemo(() => {
    if (!normalizedQuery) {
      return options;
    }

    const lookup = normalizeLookup(normalizedQuery);
    return options.filter((option) => normalizeLookup(option.label).includes(lookup));
  }, [normalizedQuery, options]);

  const canCreate = Boolean(
    onCreate &&
      normalizedQuery &&
      !options.some(
        (option) => option.label.localeCompare(normalizedQuery, undefined, { sensitivity: "accent" }) === 0,
      ),
  );

  const selectedLabel = normalizedValue || placeholder;

  React.useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleCreate = React.useCallback(async () => {
    if (!onCreate || !normalizedQuery || creating) {
      return;
    }

    setCreating(true);
    try {
      const created = await onCreate(normalizedQuery);
      onValueChange(created?.label ?? normalizedQuery);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }, [creating, normalizedQuery, onCreate, onValueChange]);

  const handleDelete = React.useCallback(
    async (option: CreatableSearchSelectOption) => {
      if (!onDelete || deletingKey === option.id) {
        return;
      }

      setDeletingKey(option.id);
      try {
        await onDelete(option);
        if (
          normalizeLabel(value).localeCompare(normalizeLabel(option.label), undefined, { sensitivity: "accent" }) === 0
        ) {
          onValueChange("");
        }
      } finally {
        setDeletingKey(null);
      }
    },
    [deletingKey, onDelete, onValueChange, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between rounded-[1rem] border-[#e7dfd4] dark:border-slate-800 bg-white dark:bg-slate-900 border-border dark:border-slate-800 px-4 text-left font-medium text-[#241629] dark:text-slate-50 shadow-[0_10px_24px_rgba(184,134,11,0.06)] dark:shadow-none hover:bg-white dark:hover:bg-slate-800",
            !normalizedValue && "text-[#9a8f97]",
            triggerClassName,
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-[var(--radix-popover-trigger-width)] p-0", className)}>
        <Command className="rounded-[1rem]">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder ?? `Tìm ${placeholder.toLowerCase()}...`}
            className="text-sm"
          />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {canCreate ? (
              <CommandGroup heading="Them moi">
                <CommandItem
                  value={`create-${normalizedQuery}`}
                  onSelect={() => {
                    void handleCreate();
                  }}
                  className="flex items-center justify-between rounded-xl px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="size-4 text-[#c24db0]" />
                    <span className="font-medium">Thêm &quot;{normalizedQuery}&quot;</span>
                  </div>
                  <span className="text-xs text-[#8a7e8b]">{creating ? "Đang tạo..." : "Mới"}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Lựa chọn">
              {filteredOptions.map((option) => {
                const isActive =
                  normalizeLabel(option.label).localeCompare(normalizedValue, undefined, { sensitivity: "accent" }) ===
                  0;

                return (
                  <CommandItem
                    key={option.id}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.label);
                      setOpen(false);
                    }}
                    className="group flex items-center justify-between rounded-xl px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Check className={cn("size-4 text-[#c24db0]", !isActive && "opacity-0")} />
                      <span className="truncate">{option.label}</span>
                    </div>
                    {option.deletable && onDelete ? (
                      <button
                        type="button"
                        className="rounded-md p-1 text-[#9a8f97] opacity-0 transition group-hover:opacity-100 hover:bg-[#f8f3ee] hover:text-[#dc2626]"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void handleDelete(option);
                        }}
                        aria-label={`Xóa ${option.label}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : (
                      <span className="w-6 shrink-0" />
                    )}
                    {deletingKey === option.id ? <span className="sr-only">Đang xóa</span> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
