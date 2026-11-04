import Link from "next/link";
import { MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-1.5 font-heading text-xl font-bold tracking-tight",
        className,
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <MapPinIcon className="size-4" />
      </span>
      <span>
        Servi<span className="text-primary">Aqui</span>
      </span>
    </Link>
  );
}
