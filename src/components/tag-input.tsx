"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
};

const defaultKeyOf = (tag: string) => tag.toLowerCase();

export function TagInput({
  id,
  value,
  onChange,
  max,
  emptyText,
  keyOf = defaultKeyOf,
  ...props
}: TagInputProps) {
  const [text, setText] = useState("");
  const full = max !== undefined && value.length >= max;

  function addTags(candidates: string[]) {
    const next = [...value];
    const keys = new Set(next.map(keyOf));
    for (const candidate of candidates) {
      const tag = candidate.trim().replace(/\s+/g, " ");
      const key = keyOf(tag);
      if (!tag || keys.has(key)) continue;
      if (max !== undefined && next.length >= max) break;
      next.push(tag);
      keys.add(key);
    }
    if (next.length !== value.length) onChange(next);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const parts = event.target.value.split(",");
    if (parts.length === 1) {
      setText(parts[0]);
      return;
    }
    setText(parts.pop() ?? "");
    addTags(parts);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.nativeEvent.isComposing) return;
      addTags([text]);
      setText("");
    } else if (event.key === "Backspace" && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleBlur() {
    if (!text.trim()) return;
    addTags([text]);
    setText("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={full}
        enterKeyHint="done"
        autoComplete="off"
        {...props}
      />
      {value.length === 0 ? (
        <p className="flex min-h-7 items-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="flex min-h-7 flex-wrap gap-2">
          {value.map((tag) => (
            <li key={keyOf(tag)}>
              <Badge variant="secondary" className="h-7 gap-1 pr-1 pl-2.5 text-sm">
                {tag}
                <button
                  type="button"
                  aria-label={`Remover ${tag}`}
                  onClick={() => onChange(value.filter((item) => item !== tag))}
                  className="flex size-5 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
