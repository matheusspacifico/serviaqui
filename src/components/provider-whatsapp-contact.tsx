"use client";

import { useState, useTransition } from "react";
import { LoaderCircleIcon, MessageCircleIcon } from "lucide-react";
import { beginWhatsAppContact } from "@/app/prestador/[id]/actions";
import { Button } from "@/components/ui/button";

export function ProviderWhatsAppContact({
  providerId,
}: {
  providerId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleContact() {
    setError(null);
    startTransition(async () => {
      const result = await beginWhatsAppContact(providerId);
      if (!result.ok) {
        setError(result.message);
        return;
      }

      window.location.assign(result.url);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        className="w-full bg-success text-success-foreground hover:bg-success/90"
        disabled={pending}
        onClick={handleContact}
      >
        {pending ? (
          <LoaderCircleIcon className="animate-spin" aria-hidden />
        ) : (
          <MessageCircleIcon aria-hidden />
        )}
        {pending ? "Preparando WhatsApp..." : "Chamar no WhatsApp"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
