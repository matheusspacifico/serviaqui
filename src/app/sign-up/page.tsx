"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, isEmailTaken } from "@/lib/auth-errors";
import {
  PASSWORD_HINT,
  validateEmail,
  validateName,
  validateNewPassword,
} from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { FormField } from "@/components/form-field";

type Field = "name" | "email" | "password";
type FieldErrors = Partial<Record<Field, React.ReactNode>>;

const FIELDS: Field[] = ["name", "email", "password"];

const LINK_CLASS =
  "font-medium text-primary underline-offset-4 hover:underline";

function EmailTakenMessage() {
  return (
    <>
      Este e-mail já está cadastrado.{" "}
      <Link href="/sign-in" className={LINK_CLASS}>
        Entrar
      </Link>{" "}
      ou{" "}
      <Link href="/forgot-password" className={LINK_CLASS}>
        recuperar a senha
      </Link>
      .
    </>
  );
}

export default function SignUpPage() {
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
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const errors: FieldErrors = {
      name: validateName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validateNewPassword(password) ?? undefined,
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
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);

    if (error) {
      if (isEmailTaken(error)) {
        setFieldErrors({ email: <EmailTakenMessage /> });
        formElement.querySelector<HTMLInputElement>('[name="email"]')?.focus();
        return;
      }
      setError(authErrorMessage(error, "Não foi possível criar a conta."));
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthShell
      title="Criar conta"
      description="Encontre ou ofereça serviços no seu bairro."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          label="Nome"
          name="name"
          autoComplete="name"
          error={fieldErrors.name}
          onChange={() => clearFieldError("name")}
        />
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
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          error={fieldErrors.password}
          onChange={() => clearFieldError("password")}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Criando..." : "Criar conta"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/sign-in" className={LINK_CLASS}>
            Entrar
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
