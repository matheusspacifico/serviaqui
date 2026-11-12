"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_HINT, validateNewPassword } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { FormField } from "@/components/form-field";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidToken = searchParams.get("error") === "INVALID_TOKEN";
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const formElement = event.currentTarget;
    const password = String(new FormData(formElement).get("password") ?? "");

    const invalid = validateNewPassword(password);
    setPasswordError(invalid);
    setError(null);
    if (invalid) {
      formElement
        .querySelector<HTMLInputElement>('[name="password"]')
        ?.focus();
      return;
    }

    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);

    if (error) {
      setError(error.message ?? "Não foi possível redefinir a senha.");
      return;
    }
    router.push("/sign-in");
  }

  if (invalidToken || !token) {
    return (
      <p className="text-sm">
        Link inválido ou expirado.{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Solicitar um novo link
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormField
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        error={passwordError}
        onChange={() => setPasswordError(null)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Redefinir senha"
      description="Escolha uma nova senha para sua conta."
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
