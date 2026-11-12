import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function ProviderNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-4 px-4 py-20">
        <h1 className="text-3xl font-bold">Prestador não encontrado</h1>
        <p className="text-muted-foreground">
          Este perfil não existe ou foi removido.
        </p>
        <Button nativeButton={false} render={<Link href="/" />}>
          Voltar para o início
        </Button>
      </main>
    </>
  );
}
