"use client";

import { useState } from "react";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "size-3.5", md: "size-5", lg: "size-7" };

export function RatingStars({
  value,
  onChange,
  size = "md",
  className,
}: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  if (!onChange) {
    return (
      <div
        role="img"
        aria-label={`Nota ${value.toFixed(1)} de 5`}
        className={cn("inline-flex gap-0.5", className)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={cn(
              sizes[size],
              star <= Math.round(shown)
                ? "fill-rating text-rating"
                : "fill-muted text-muted-foreground/40",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Escolha uma nota"
      className={cn("inline-flex gap-0.5", className)}
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StarIcon
            className={cn(
              sizes[size],
              "transition-colors",
              star <= shown
                ? "fill-rating text-rating"
                : "fill-muted text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
