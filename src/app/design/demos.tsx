"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RatingInputDemo() {
  const [value, setValue] = useState(0);
  return (
    <div className="flex items-center gap-3">
      <RatingStars value={value} onChange={setValue} size="lg" />
      <span className="text-sm text-muted-foreground">
        {value ? `${value} de 5` : "Sem nota"}
      </span>
    </div>
  );
}

export function SelectDemo() {
  return (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Escolha um serviço" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="eletricista">Eletricista</SelectItem>
        <SelectItem value="diarista">Diarista</SelectItem>
        <SelectItem value="encanador">Encanador</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Perfil salvo.")}>
        Toast sucesso
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error("Não foi possível salvar.")}
      >
        Toast erro
      </Button>
    </div>
  );
}
