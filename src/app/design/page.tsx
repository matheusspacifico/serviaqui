import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { FormField } from "@/components/form-field";
import { RatingStars } from "@/components/rating-stars";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RatingInputDemo, SelectDemo, ToastDemo } from "./demos";

export const metadata: Metadata = { title: "Design system · ServiAqui" };

const colors = [
  { name: "primary", className: "bg-primary text-primary-foreground" },
  { name: "secondary", className: "bg-secondary text-secondary-foreground" },
  { name: "accent", className: "bg-accent text-accent-foreground" },
  { name: "muted", className: "bg-muted text-muted-foreground" },
  { name: "success", className: "bg-success text-success-foreground" },
  { name: "warning", className: "bg-warning text-warning-foreground" },
  { name: "destructive", className: "bg-destructive text-white" },
  { name: "rating", className: "bg-rating text-foreground" },
  { name: "background", className: "bg-background text-foreground border" },
  { name: "card", className: "bg-card text-card-foreground border" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12">
      <header className="flex flex-col gap-3">
        <Logo />
        <h1 className="text-4xl font-bold">Design system</h1>
        <p className="text-muted-foreground">
          Tokens e componentes usados nas telas do ServiAqui.
        </p>
      </header>

      <Section title="Cores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {colors.map((color) => (
            <div
              key={color.name}
              className={`flex h-20 items-end rounded-xl p-3 text-sm font-medium ${color.className}`}
            >
              {color.name}
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Tipografia">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold">Título 1 — Bricolage</h1>
          <h2 className="text-3xl font-semibold">Título 2 — Bricolage</h2>
          <h3 className="text-xl font-semibold">Título 3 — Bricolage</h3>
          <p>Texto de corpo em Geist. Encontre o profissional certo.</p>
          <p className="text-sm text-muted-foreground">
            Texto secundário (muted-foreground).
          </p>
        </div>
      </Section>

      <Separator />

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destrutivo</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Pequeno</Button>
          <Button size="lg">Grande</Button>
          <Button disabled>Desabilitado</Button>
        </div>
      </Section>

      <Separator />

      <Section title="Formulário">
        <div className="grid max-w-md gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-name">Nome</Label>
            <Input id="demo-name" placeholder="Maria Silva" />
          </div>
          <FormField
            label="FormField"
            name="demo-field"
            placeholder="maria@exemplo.com"
          />
          <FormField
            label="FormField com dica"
            name="demo-field-hint"
            type="password"
            hint="Mínimo de 8 caracteres."
          />
          <FormField
            label="FormField com erro"
            name="demo-field-error"
            defaultValue="maria@"
            error="Digite um e-mail válido, como nome@exemplo.com."
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-bio">Descrição</Label>
            <Textarea id="demo-bio" placeholder="Conte sobre seu trabalho" />
          </div>
          <SelectDemo />
        </div>
      </Section>

      <Separator />

      <Section title="Badges e avaliação">
        <div className="flex flex-wrap gap-2">
          <Badge>Eletricista</Badge>
          <Badge variant="secondary">Pinheiros</Badge>
          <Badge variant="success">Disponível</Badge>
          <Badge variant="warning">Perfil incompleto</Badge>
          <Badge variant="destructive">Inativo</Badge>
          <Badge variant="outline">R$ 80/h</Badge>
        </div>
        <div className="flex items-center gap-2">
          <RatingStars value={4.3} />
          <span className="text-sm text-muted-foreground">4,3 (27)</span>
        </div>
        <RatingInputDemo />
      </Section>

      <Separator />

      <Section title="Card de prestador">
        <Card className="max-w-sm">
          <CardHeader className="flex-row items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <CardTitle>João Souza</CardTitle>
              <CardDescription>Eletricista · 1,2 km</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <RatingStars value={4.8} size="sm" />
              <span className="text-sm text-muted-foreground">4,8 (52)</span>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-success text-success-foreground hover:bg-success/90">
                WhatsApp
              </Button>
              <Button variant="outline" className="flex-1">
                Ligar
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Separator />

      <Section title="Carregando e feedback">
        <div className="flex max-w-sm items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <ToastDemo />
      </Section>
    </main>
  );
}
