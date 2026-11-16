import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isValidCoordinates } from "../src/lib/geo";

const SOURCE = "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv";
const OUTPUT = resolve(__dirname, "../src/data/municipalities.json");
const MIN_MUNICIPALITIES = 5570;
const STATE_COUNT = 27;

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const split = (line: string) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (quoted) {
        if (char === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") {
        cells.push(cell);
        cell = "";
      } else cell += char;
    }
    cells.push(cell);
    return cells;
  };
  const header = split(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = split(line);
    return Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""]));
  });
}

async function download(file: string): Promise<Row[]> {
  const response = await fetch(`${SOURCE}/${file}`);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return parseCsv(await response.text());
}

async function main() {
  const [states, cities] = await Promise.all([
    download("estados.csv"),
    download("municipios.csv"),
  ]);
  const stateByCode = new Map(states.map((row) => [row.codigo_uf, row.uf]));

  const municipalities = cities
    .map((row) => ({
      code: row.codigo_ibge,
      name: row.nome.trim(),
      state: stateByCode.get(row.codigo_uf) ?? "",
      lat: Number(row.latitude),
      lng: Number(row.longitude),
    }))
    .sort(
      (a, b) =>
        a.state.localeCompare(b.state) || a.name.localeCompare(b.name, "pt-BR"),
    );

  const problems: string[] = [];
  if (municipalities.length < MIN_MUNICIPALITIES) {
    problems.push(`esperados ao menos ${MIN_MUNICIPALITIES} municípios, vieram ${municipalities.length}`);
  }
  const stateCount = new Set(municipalities.map((m) => m.state)).size;
  if (stateCount !== STATE_COUNT) {
    problems.push(`esperadas ${STATE_COUNT} UFs, vieram ${stateCount}`);
  }
  if (new Set(municipalities.map((m) => m.code)).size !== municipalities.length) {
    problems.push("há códigos IBGE repetidos");
  }
  for (const m of municipalities) {
    if (!/^\d{7}$/.test(m.code)) problems.push(`código inválido: ${m.code}`);
    if (!m.name) problems.push(`município sem nome: ${m.code}`);
    if (!/^[A-Z]{2}$/.test(m.state)) problems.push(`UF inválida: ${m.code}`);
    if (!isValidCoordinates(m as unknown)) problems.push(`coordenada inválida: ${m.code}`);
  }
  if (problems.length > 0) {
    throw new Error(`Dados recusados:\n- ${problems.slice(0, 20).join("\n- ")}`);
  }

  const json = `[\n${municipalities.map((m) => JSON.stringify(m)).join(",\n")}\n]\n`;
  writeFileSync(OUTPUT, json);
  console.log(`${municipalities.length} municípios de ${stateCount} UFs gravados em src/data/municipalities.json.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
