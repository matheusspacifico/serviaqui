import Link from "next/link";
import { getOwnProviderProfile } from "@/lib/provider-queries";
import { requireSession } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const profile = await getOwnProviderProfile(session.user.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        <h1 className="text-3xl font-bold">
          Olá, {session.user.name.split(" ")[0]}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Sua conta</CardTitle>
            <CardDescription>Logado como {session.user.email}</CardDescription>
          </CardHeader>
        </Card>
        {profile ? (
          <Card>
            <CardHeader>
              <CardTitle>{profile.displayName}</CardTitle>
              <CardDescription>
                Perfil de prestador · {profile.city}/{profile.state}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-wrap gap-2">
                {profile.services.map((service) => (
                  <li key={service.slug}>
                    <Badge>{service.name}</Badge>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  nativeButton={false}
                  render={<Link href="/dashboard/prestador" />}
                >
                  Editar perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ofereça seus serviços</CardTitle>
              <CardDescription>
                Crie seu perfil de prestador e apareça para clientes do seu
                bairro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                nativeButton={false}
                render={<Link href="/dashboard/prestador" />}
              >
                Criar perfil
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
