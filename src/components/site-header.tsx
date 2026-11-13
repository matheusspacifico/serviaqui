import Link from "next/link";
import { SearchIcon } from "lucide-react";
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
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            nativeButton={false}
            aria-label="Buscar prestadores"
            render={<Link href="/buscar" />}
          >
            <SearchIcon className="sm:hidden" aria-hidden />
            <span className="hidden sm:inline">Buscar</span>
          </Button>
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
