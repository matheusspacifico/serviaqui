"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChoiceChips } from "@/components/choice-chips";
import { RatingStars } from "@/components/rating-stars";
import { SearchableList } from "@/components/searchable-list";
import { TagInput } from "@/components/tag-input";
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

const CHOICE_OPTIONS = [
  { value: "eletricista", label: "Eletricista" },
  { value: "encanador", label: "Encanador" },
  { value: "diarista", label: "Diarista" },
  { value: "pintor", label: "Pintor" },
];

export function ChoiceChipsDemo() {
  const [value, setValue] = useState(["eletricista"]);
  return (
    <ChoiceChips
      name="demo-services"
      options={CHOICE_OPTIONS}
      value={value}
      onChange={setValue}
      max={2}
    />
  );
}

export function TagInputDemo() {
  const [value, setValue] = useState(["Centro", "Pinheiros"]);
  return (
    <TagInput
      id="demo-tags"
      placeholder="Ex.: Vila Mariana"
      emptyText="Nenhum bairro adicionado."
      value={value}
      onChange={setValue}
      max={5}
      aria-describedby="demo-tags-hint"
    />
  );
}

const NEIGHBORHOOD_OPTIONS = [
  { value: "se", label: "Sé", hint: "2" },
  { value: "bela-vista", label: "Bela Vista", hint: "3" },
  { value: "pinheiros", label: "Pinheiros", hint: "1" },
  { value: "liberdade", label: "Liberdade", hint: "sem prestadores", muted: true },
  { value: "butanta", label: "Butantã", hint: "sem prestadores", muted: true },
];

export function SearchableListDemo() {
  const [value, setValue] = useState<string | null>("se");
  return (
    <SearchableList
      options={NEIGHBORHOOD_OPTIONS}
      value={value}
      onChange={setValue}
      filterPlaceholder="Digite o nome do bairro"
      filterLabel="Bairro"
      emptyMessage="Nenhum bairro com esse nome."
    />
  );
}
