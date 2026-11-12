import { AuthShell } from "@/components/auth-shell";
import { safeRedirectPath } from "@/lib/redirect";
import { redirectIfAuthenticated } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  await redirectIfAuthenticated();
  const { redirectTo } = await searchParams;

  return (
    <AuthShell title="Entrar" description="Que bom te ver de novo.">
      <SignInForm redirectTo={safeRedirectPath(redirectTo)} />
    </AuthShell>
  );
}
