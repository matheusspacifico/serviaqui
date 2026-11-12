"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { withRedirect } from "@/lib/redirect";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { validateCurrentPassword, validateEmail } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";

type Field = "email" | "password";
type FieldErrors = Partial<Record<Field, React.ReactNode>>;

const FIELDS: Field[] = ["email", "password"];

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearFieldError(field: Field) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const errors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validateCurrentPassword(password) ?? undefined,
    };
    setFieldErrors(errors);
    setError(null);

    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) {
      formElement
        .querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)
        ?.focus();
      return;
    }

    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);

    if (error) {
      setError(authErrorMessage(error, "Não foi possível entrar."));
      return;
    }
    router.push(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        error={fieldErrors.email}
        onChange={() => clearFieldError("email")}
      />
      <FormField
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        error={fieldErrors.password}
        onChange={() => clearFieldError("password")}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
      <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
        <Link
          href="/forgot-password"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
        <span>
          Não tem conta?{" "}
          <Link
            href={withRedirect("/sign-up", redirectTo)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </span>
      </div>
    </form>
  );
}
