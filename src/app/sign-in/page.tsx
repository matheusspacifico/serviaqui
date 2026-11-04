"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "E-mail ou senha inválidos.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthShell title="Entrar" description="Que bom te ver de novo.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
              href="/sign-up"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  );
}
