"use client";

import { useId, useState } from "react";
import { XIcon } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_SUGGESTIONS = 8;
const REMOVE_ALL_FROM = 5;

type TagInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "id"
> & {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  emptyText?: string;
  keyOf?: (tag: string) => string;
  suggestions?: { value: string; label: string }[];
};

const defaultKeyOf = (tag: string) => tag.toLowerCase();

export function TagInput({
  id,
  value,
  onChange,
  max,
  emptyText,
  keyOf = defaultKeyOf,
  suggestions = [],
  ...props
}: TagInputProps) {
  const listId = useId();
  const [text, setText] = useState("");
  const [active, setActive] = useState(-1);
  const full = max !== undefined && value.length >= max;

  const textKey = keyOf(text.trim());
  const usedKeys = new Set(value.map(keyOf));
  const matches = textKey
    ? suggestions
        .filter((suggestion) => {
          const key = keyOf(suggestion.label);
          return key.includes(textKey) && !usedKeys.has(key);
        })
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const activeIndex = Math.min(active, matches.length - 1);

  function addTags(candidates: string[]) {
    const next = [...value];
    const keys = new Set(next.map(keyOf));
    for (const candidate of candidates) {
      const typed = candidate.trim().replace(/\s+/g, " ");
      const key = keyOf(typed);
      const tag =
        suggestions.find((suggestion) => keyOf(suggestion.label) === key)
          ?.label ?? typed;
      if (!tag || keys.has(key)) continue;
      if (max !== undefined && next.length >= max) break;
      next.push(tag);
      keys.add(key);
    }
    if (next.length !== value.length) onChange(next);
  }

  function commit(candidate: string) {
    addTags([candidate]);
    setText("");
    setActive(-1);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const parts = event.target.value.split(",");
    setActive(-1);
    if (parts.length === 1) {
      setText(parts[0]);
      return;
    }
    setText(parts.pop() ?? "");
    addTags(parts);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      setActive(Math.min(activeIndex + 1, matches.length - 1));
    } else if (event.key === "ArrowUp" && matches.length > 0) {
      event.preventDefault();
      setActive(Math.max(activeIndex - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (event.nativeEvent.isComposing) return;
      commit(activeIndex >= 0 ? matches[activeIndex].label : text);
    } else if (event.key === "Escape" && matches.length > 0) {
      setText("");
      setActive(-1);
    } else if (event.key === "Backspace" && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleBlur() {
    if (text.trim()) commit(text);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          id={id}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={full}
          enterKeyHint="done"
          autoComplete="off"
          role={suggestions.length > 0 ? "combobox" : undefined}
          aria-expanded={
            suggestions.length > 0 ? matches.length > 0 : undefined
          }
          aria-controls={matches.length > 0 ? listId : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
          }
          {...props}
        />
        {matches.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 flex max-h-64 flex-col overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            {matches.map((suggestion, index) => (
              <li
                key={suggestion.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(suggestion.label)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  "cursor-pointer truncate rounded-md px-2 py-1.5 select-none",
                  index === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                {suggestion.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {value.length === 0 ? (
        <p className="flex min-h-7 items-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="flex min-h-7 flex-wrap gap-2">
          {value.map((tag) => (
            <li key={keyOf(tag)} className="max-w-full">
              <Badge
                variant="secondary"
                className="h-7 max-w-full gap-1 pr-1 pl-2.5 text-sm"
              >
                <span className="truncate">{tag}</span>
                <button
                  type="button"
                  aria-label={`Remover ${tag}`}
                  onClick={() => onChange(value.filter((item) => item !== tag))}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {value.length >= REMOVE_ALL_FROM && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="self-start px-0"
          onClick={() => onChange([])}
        >
          Remover todos
        </Button>
      )}
    </div>
  );
}
