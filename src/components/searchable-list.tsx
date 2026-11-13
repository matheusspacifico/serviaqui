"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "cn";
import { neighborhoodKey } from "@/lib/provider-validation";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_VISIBLE = 100;

export type SearchableListOption = {
  value: string;
  label: string;
  hint?: string;
  muted?: boolean;
};

export type SearchableListProps = {
  options: SearchableListOption[];
  value: string | null;
  onChange: (value: string) => void;
  filterPlaceholder: string;
  filterLabel: string;
  emptyMessage: string;
  loading?: boolean;
  className?: string;
};

export function SearchableList({
  options,
  value,
  onChange,
  filterPlaceholder,
  filterLabel,
  emptyMessage,
  loading = false,
  className,
}: SearchableListProps) {
  const id = useId();
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState(0);

  const keyed = useMemo(
    () => options.map((option) => ({ option, key: neighborhoodKey(option.label) })),
    [options],
  );
  const filterKey = neighborhoodKey(filter);
  const matches = useMemo(
    () =>
      (filterKey ? keyed.filter(({ key }) => key.includes(filterKey)) : keyed).map(
        ({ option }) => option,
      ),
    [keyed, filterKey],
  );
  const visible = matches.slice(0, MAX_VISIBLE);
  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0));
  const activeId = visible.length > 0 ? `${id}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (!activeId) return;
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (visible.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(Math.min(activeIndex + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!event.nativeEvent.isComposing) onChange(visible[activeIndex].value);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Input
        role="combobox"
        aria-label={filterLabel}
        aria-expanded
        aria-controls={`${id}-list`}
        aria-activedescendant={loading ? undefined : activeId}
        aria-autocomplete="list"
        placeholder={filterPlaceholder}
        autoComplete="off"
        value={filter}
        onChange={(event) => {
          setFilter(event.target.value);
          setActive(0);
        }}
        onKeyDown={handleKeyDown}
      />
      {loading ? (
        <div className="flex flex-col gap-2 py-1" aria-hidden>
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-7 w-3/5" />
        </div>
      ) : (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={filterLabel}
          className="flex max-h-52 flex-col overflow-y-auto"
        >
          {visible.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              onClick={() => onChange(option.value)}
              onMouseMove={() => setActive(index)}
              className={cn(
                "flex min-h-8 cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1 text-sm select-none",
                option.muted && "text-muted-foreground",
                option.value === value && "font-medium",
                index === activeIndex && "bg-accent text-accent-foreground",
              )}
            >
              <span className="truncate">{option.label}</span>
              {option.hint && (
                <span
                  className={cn(
                    "shrink-0 text-muted-foreground",
                    option.muted ? "text-xs" : "tabular-nums",
                  )}
                >
                  {option.hint}
                </span>
              )}
            </li>
          ))}
          {matches.length > MAX_VISIBLE && (
            <li
              role="presentation"
              className="px-2 py-1.5 text-xs text-muted-foreground"
            >
              Digite para ver mais.
            </li>
          )}
        </ul>
      )}
      {!loading && visible.length === 0 && (
        <p className="px-2 pb-1 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}
