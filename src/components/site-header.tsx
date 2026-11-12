import Link from "next/link";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Minha conta
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href="/sign-in" />}
              >
                Entrar
              </Button>
              <Button nativeButton={false} render={<Link href="/sign-up" />}>
                Criar conta
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
