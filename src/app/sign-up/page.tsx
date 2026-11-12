import { AuthShell } from "@/components/auth-shell";
import { safeRedirectPath } from "@/lib/redirect";
import { redirectIfAuthenticated } from "@/lib/session";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  await redirectIfAuthenticated();
  const { redirectTo } = await searchParams;

  return (
    <AuthShell
      title="Criar conta"
      description="Encontre ou ofereça serviços no seu bairro."
    >
      <SignUpForm redirectTo={safeRedirectPath(redirectTo)} />
    </AuthShell>
  );
}
