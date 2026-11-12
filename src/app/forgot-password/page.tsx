import { AuthShell } from "@/components/auth-shell";
import { redirectIfAuthenticated } from "@/lib/session";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Recuperar senha"
      description="Informe seu e-mail para receber um link de redefinição."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
