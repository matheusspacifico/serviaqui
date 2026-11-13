import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPinIcon, MessageCircleIcon, StarIcon } from "lucide-react";
import { listServiceCategories } from "@/lib/provider-queries";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

const features = [
  {
    icon: MapPinIcon,
    title: "Perto de você",
    description: "Encontre prestadores que atendem no seu bairro.",
  },
  {
    icon: MessageCircleIcon,
    title: "Contato direto",
    description: "Fale pelo WhatsApp ou ligue, sem intermediários.",
  },
  {
    icon: StarIcon,
    title: "Avaliações reais",
    description: "Escolha com base na nota de quem já contratou.",
  },
];

export default async function Home() {
  if (await getSession()) redirect("/buscar");
  const categories = await listServiceCategories();

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:py-28">
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            Serviços do seu bairro
          </span>
          <h1 className="max-w-2xl text-4xl font-bold sm:text-6xl">
            O profissional certo, <span className="text-primary">aqui</span>{" "}
            perto.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Eletricistas, diaristas, encanadores e muito mais. Compare
            avaliações e fale direto com quem vai resolver.
          </p>
          {categories.length > 0 && (
            <form
              action="/buscar"
              method="get"
              className="flex w-full max-w-md items-center gap-2"
            >
              <label htmlFor="servico" className="sr-only">
                Serviço
              </label>
              <select
                id="servico"
                name="servico"
                required
                defaultValue=""
                className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Qual serviço você procura?
                </option>
                {categories.map(({ slug, name }) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="lg">
                Buscar
              </Button>
            </form>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              Criar conta grátis
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/sign-in" />}
            >
              Já tenho conta
            </Button>
          </div>
          <Link
            href="/sign-up?redirectTo=%2Fdashboard%2Fprestador"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Quero oferecer serviços
          </Link>
        </section>
        <section className="border-t bg-muted/50">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
