"use client";

import { useState, useTransition } from "react";
import {
  LoaderCircleIcon,
  MessageCircleIcon,
  PhoneIcon,
} from "lucide-react";
import {
  beginPhoneContact,
  beginWhatsAppContact,
} from "@/app/prestador/[id]/actions";
import { Button } from "@/components/ui/button";

type ContactChannel = "whatsapp" | "phone";

export function ProviderContact({
  providerId,
  phoneIsWhatsapp,
}: {
  providerId: string;
  phoneIsWhatsapp: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingChannel, setPendingChannel] = useState<ContactChannel | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  function handleContact(channel: ContactChannel) {
    setError(null);
    setPendingChannel(channel);
    startTransition(async () => {
      try {
        const result =
          channel === "whatsapp"
            ? await beginWhatsAppContact(providerId)
            : await beginPhoneContact(providerId);
        if (!result.ok) {
          setError(result.message);
          return;
        }

        window.location.assign(result.url);
      } catch {
        setError("Não foi possível iniciar o contato agora. Tente novamente.");
      } finally {
        setPendingChannel(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {phoneIsWhatsapp ? (
        <Button
          type="button"
          className="w-full bg-success text-success-foreground hover:bg-success/90"
          disabled={pending}
          onClick={() => handleContact("whatsapp")}
        >
          {pendingChannel === "whatsapp" ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : (
            <MessageCircleIcon aria-hidden />
          )}
          {pendingChannel === "whatsapp"
            ? "Preparando WhatsApp..."
            : "Chamar no WhatsApp"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este prestador não recebe contatos pelo WhatsApp.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => handleContact("phone")}
      >
        {pendingChannel === "phone" ? (
          <LoaderCircleIcon className="animate-spin" aria-hidden />
        ) : (
          <PhoneIcon aria-hidden />
        )}
        {pendingChannel === "phone" ? "Preparando ligação..." : "Ligar"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
