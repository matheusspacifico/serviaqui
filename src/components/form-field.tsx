import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  as?: "div" | "fieldset";
  className?: string;
  children: React.ReactNode;
};

export function fieldDescribedBy(
  id: string,
  { hint, error }: Pick<FieldProps, "hint" | "error">,
): string | undefined {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  as = "div",
  className,
  children,
}: FieldProps) {
  const message = error ? (
    <p id={`${htmlFor}-error`} role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : (
    hint && (
      <p id={`${htmlFor}-hint`} className="text-sm text-muted-foreground">
        {hint}
      </p>
    )
  );

  if (as === "fieldset") {
    return (
      <fieldset
        aria-describedby={fieldDescribedBy(htmlFor, { hint, error })}
        className={cn("flex min-w-0 flex-col gap-2", className)}
      >
        <legend className="mb-2 text-sm leading-none font-medium">
          {label}
        </legend>
        {children}
        {message}
      </fieldset>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {message}
    </div>
  );
}

type FormFieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
};

export function FormField({
  label,
  name,
  hint,
  error,
  id = name,
  ...props
}: FormFieldProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(id, { hint, error })}
        {...props}
      />
    </Field>
  );
}
