"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { validateEmail } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { FormField } from "@/components/form-field";

export default function ForgotPasswordPage() {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const email = String(new FormData(formElement).get("email") ?? "").trim();

    const invalid = validateEmail(email);
    setEmailError(invalid);
    setError(null);
    if (invalid) {
      formElement.querySelector<HTMLInputElement>('[name="email"]')?.focus();
      return;
    }

    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setLoading(false);

    if (error) {
      setError(error.message ?? "Não foi possível enviar o link.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe seu e-mail para receber um link de redefinição."
    >
      {sent ? (
        <p className="text-sm">
          Se o e-mail existir, um link de redefinição foi gerado. Em
          desenvolvimento, o link aparece no terminal do servidor.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <FormField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            error={emailError}
            onChange={() => setEmailError(null)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/sign-in"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Voltar para o login
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
