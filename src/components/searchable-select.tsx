"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import {
  SearchableList,
  type SearchableListProps,
} from "@/components/searchable-list";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type SearchableSelectProps = Omit<SearchableListProps, "className"> & {
  id: string;
  placeholder: string;
  valueLabel?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function SearchableSelect({
  id,
  placeholder,
  valueLabel,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  options,
  value,
  onChange,
  ...listProps
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const label =
    options.find((option) => option.value === value)?.label ??
    (value ? (valueLabel ?? value) : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-left text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          !label && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{label ?? placeholder}</span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-64">
        <SearchableList
          {...listProps}
          options={options}
          value={value}
          onChange={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
