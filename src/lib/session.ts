import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DEFAULT_REDIRECT } from "@/lib/redirect";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireSession(redirectTo?: string) {
  const session = await getSession();
  if (!session) {
    redirect(
      redirectTo
        ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
        : "/sign-in",
    );
  }
  return session;
}

export async function redirectIfAuthenticated(): Promise<void> {
  if (await getSession()) redirect(DEFAULT_REDIRECT);
}
