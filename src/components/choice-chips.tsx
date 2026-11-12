import { cn } from "cn";

type ChoiceChipsProps = {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  name: string;
  max?: number;
  className?: string;
};

export function ChoiceChips({
  options,
  value,
  onChange,
  name,
  max,
  className,
}: ChoiceChipsProps) {
  const full = max !== undefined && value.length >= max;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const checked = value.includes(option.value);
        return (
          <label
            key={option.value}
            className="inline-flex h-8 cursor-pointer items-center rounded-full bg-muted px-3 text-sm font-medium transition-colors select-none hover:bg-muted-foreground/15 has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-disabled:hover:bg-muted"
          >
            <input
              type="checkbox"
              className="sr-only"
              name={name}
              value={option.value}
              checked={checked}
              disabled={full && !checked}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, event.target.value]
                    : value.filter((item) => item !== event.target.value),
                )
              }
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
