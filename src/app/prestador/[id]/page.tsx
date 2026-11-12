import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPinIcon } from "lucide-react";
import { getPublicProviderProfile } from "@/lib/provider-queries";
import { formatHourlyRate } from "@/lib/provider-validation";
import { getSession } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PageProps = { params: Promise<{ id: string }> };

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const letters =
    words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : words[0].slice(0, 2);
  return letters.toUpperCase();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProviderProfile(id);
  if (!profile) return { title: "Prestador não encontrado | ServiAqui" };

  const service = profile.services[0]?.name ?? "Prestador";
  return {
    title: `${profile.displayName} — ${service} em ${profile.city}/${profile.state} | ServiAqui`,
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function PublicProviderPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getPublicProviderProfile(id);
  if (!profile) notFound();

  const session = await getSession();
  const isOwner = session?.user.id === profile.userId;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
        <header className="flex flex-wrap items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-xl">
              {initials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold break-words">
              {profile.displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-center gap-1 text-muted-foreground">
                <MapPinIcon className="size-4" aria-hidden />
                <span>
                  {profile.city}/{profile.state}
                </span>
              </p>
              <Badge variant="secondary">Novo no ServiAqui</Badge>
            </div>
          </div>
          {isOwner && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/dashboard/prestador" />}
            >
              Editar perfil
            </Button>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-8">
            <Section title="Serviços">
              <ul className="flex flex-wrap gap-2">
                {profile.services.map((service) => (
                  <li key={service.slug}>
                    <Badge className="h-7 px-3 text-sm">{service.name}</Badge>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Valor">
              <p className="text-lg font-medium">
                {formatHourlyRate(profile.hourlyRateCents)}
              </p>
            </Section>

            {profile.description && (
              <Section title="Sobre">
                <p className="max-w-2xl break-words whitespace-pre-line">
                  {profile.description}
                </p>
              </Section>
            )}

            <Section title="Bairros atendidos">
              <ul className="flex flex-wrap gap-2">
                {profile.areas.map((area) => (
                  <li key={area}>
                    <Badge variant="outline" className="h-7 px-3 text-sm">
                      {area}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <aside>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Contato</h2>
                <p className="text-muted-foreground">
                  Contato por WhatsApp e telefone em breve.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
