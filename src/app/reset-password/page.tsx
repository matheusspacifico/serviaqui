"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidToken = searchParams.get("error") === "INVALID_TOKEN";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const { error } = await authClient.resetPassword({
      newPassword: String(form.get("password")),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
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
