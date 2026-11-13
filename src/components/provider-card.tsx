import Link from "next/link";
import { MapPinIcon } from "lucide-react";
import { cn } from "cn";
import { formatDistance } from "@/lib/geo";
import { formatHourlyRate, initials } from "@/lib/provider-validation";
import type { ProviderSearchItem } from "@/lib/search-validation";
import { RatingStars } from "@/components/rating-stars";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const MAX_SERVICES = 2;

type ProviderCardProps = {
  provider: ProviderSearchItem;
  highlightSlug?: string;
};

export function ProviderCard({ provider, highlightSlug }: ProviderCardProps) {
  const services = [
    ...provider.services.filter((service) => service.slug === highlightSlug),
    ...provider.services.filter((service) => service.slug !== highlightSlug),
  ];
  const hidden = services.length - MAX_SERVICES;

  return (
    <Link
      href={`/prestador/${provider.id}`}
      className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors outline-none hover:border-primary/40 hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Avatar size="lg">
        <AvatarFallback>{initials(provider.displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex h-6 items-center justify-between gap-3">
          <h3 className="truncate text-base font-semibold">
            {provider.displayName}
          </h3>
          <span
            className={cn(
              "shrink-0 whitespace-nowrap",
              provider.hourlyRateCents === null
                ? "text-xs text-muted-foreground"
                : "font-semibold text-primary",
            )}
          >
            {formatHourlyRate(provider.hourlyRateCents)}
          </span>
        </div>
        <p className="flex h-5 items-center gap-1 text-sm text-muted-foreground">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {provider.neighborhood}
            {provider.distanceKm !== null &&
              ` · ${formatDistance(provider.distanceKm)}`}
          </span>
        </p>
        <div className="flex h-5 items-center gap-2 overflow-hidden">
          {provider.ratingCount > 0 && provider.ratingAverage !== null ? (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <RatingStars value={provider.ratingAverage} size="sm" />
              {provider.ratingAverage.toFixed(1).replace(".", ",")} (
              {provider.ratingCount})
            </span>
          ) : (
            <Badge variant="outline">Novo no ServiAqui</Badge>
          )}
          {services.slice(0, MAX_SERVICES).map((service) => (
            <Badge
              key={service.slug}
              variant={service.slug === highlightSlug ? "default" : "secondary"}
              className={
                service.slug === highlightSlug ? "shrink-0" : "min-w-0 shrink"
              }
            >
              <span className="truncate">{service.name}</span>
            </Badge>
          ))}
          {hidden > 0 && <Badge variant="secondary">+{hidden}</Badge>}
        </div>
      </div>
    </Link>
  );
}
