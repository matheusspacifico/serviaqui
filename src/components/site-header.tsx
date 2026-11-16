import Link from "next/link";
import { BriefcaseBusinessIcon, SearchIcon, UserIcon } from "lucide-react";
import { hasProviderProfile } from "@/lib/provider-queries";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof SearchIcon;
}) {
  return (
    <Button
      variant="ghost"
      nativeButton={false}
      aria-label={label}
      render={<Link href={href} />}
    >
      <Icon className="sm:hidden" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

export async function SiteHeader() {
  const session = await getSession();
  const isProvider = session
    ? await hasProviderProfile(session.user.id)
    : false;

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink
            href="/buscar"
            label="Buscar prestadores"
            icon={SearchIcon}
          />
          {session ? (
            <>
              <NavLink
                href="/dashboard/prestador"
                label={isProvider ? "Meu perfil" : "Oferecer serviços"}
                icon={BriefcaseBusinessIcon}
              />
              <NavLink href="/dashboard" label="Minha conta" icon={UserIcon} />
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
