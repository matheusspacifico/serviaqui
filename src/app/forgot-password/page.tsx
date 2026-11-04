"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const { error } = await authClient.requestPasswordReset({
      email: String(form.get("email")),
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
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
