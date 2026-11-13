import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import {
  getOwnProviderProfile,
  listServiceCategories,
} from "@/lib/provider-queries";
import {
  formatCents,
  formatPhone,
  type ProviderProfileInput,
} from "@/lib/provider-validation";
import { requireSession } from "@/lib/session";
import { ProviderProfileForm } from "./provider-profile-form";

export const metadata: Metadata = { title: "Perfil de prestador · ServiAqui" };

export default async function ProviderProfilePage() {
  const session = await requireSession("/dashboard/prestador");
  const [categories, profile] = await Promise.all([
    listServiceCategories(),
    getOwnProviderProfile(session.user.id),
  ]);

  const initialValues: ProviderProfileInput = profile
    ? {
        displayName: profile.displayName,
        phone: formatPhone(profile.phone),
        phoneIsWhatsapp: profile.phoneIsWhatsapp,
        city: profile.city,
        state: profile.state,
        categories: profile.services.map((service) => service.slug),
        neighborhoods: profile.areas.map((area) => area.neighborhood),
        hourlyRate:
          profile.hourlyRateCents === null
            ? ""
            : formatCents(profile.hourlyRateCents),
        description: profile.description ?? "",
      }
    : {
        displayName: session.user.name,
        phone: "",
        phoneIsWhatsapp: true,
        city: "",
        state: "",
        categories: [],
        neighborhoods: [],
        hourlyRate: "",
        description: "",
      };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">
            {profile ? "Editar perfil" : "Criar perfil de prestador"}
          </h1>
          <p className="text-muted-foreground">
            É assim que os clientes do seu bairro vão encontrar você.
          </p>
        </div>
        {categories.length === 0 ? (
          <p
            role="alert"
            className="rounded-lg bg-warning px-4 py-3 text-sm text-warning-foreground"
          >
            Nenhuma categoria de serviço cadastrada. Rode{" "}
            <code className="font-mono">pnpm db:seed</code> e recarregue a
            página.
          </p>
        ) : (
          <ProviderProfileForm
            categories={categories}
            initialValues={initialValues}
            isEditing={profile !== null}
          />
        )}
      </main>
    </>
  );
}
