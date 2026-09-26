// Smart search (SPEC §12): one box matches company, title, places, and the labels
// people actually type ("data ai remote", "cebu", "fintech", "it intern"). Every
// term must match at the START of some word, so "it" finds "IT services" but not
// "security", while "eng" still finds "Engineer".

import type { Job } from "./listings";
import {
  FIELD_LABELS,
  LEVEL_LABELS,
  METRO_LABELS,
  SETUP_LABELS,
  industryLabel,
} from "./labels";

/** Lowercase, strip accents, and turn every non-alphanumeric run into one space. */
function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const FILLER = new Set(["and", "of", "the", "in"]);

/** Shorthand people search with → any of these word-starts counts as a match. */
const ALIASES: Record<string, string[]> = {
  ojt: ["ojt", "intern"],
  freshgrad: ["fresh grad", "entry level", "graduate"],
  wfh: ["wfh", "work from home", "remote"],
  onsite: ["onsite", "on site"],
  bgc: ["bgc", "bonifacio", "taguig"],
  qc: ["qc", "quezon city"],
  cdo: ["cdo", "cagayan de oro"],
  bpo: ["bpo", "customer support", "outsourcing"],
  csr: ["csr", "customer service", "customer support"],
  va: ["va", "virtual assistant"],
  swe: ["swe", "software engineer"],
};

/**
 * One folded, space-delimited string per job — built once per dataset (useMemo),
 * so each keystroke only runs substring checks. Leading space = every word starts
 * after a space.
 */
export function buildSearchKey(job: Job): string {
  const parts = [
    job.company,
    job.title,
    ...job.locations,
    job.function === "other" ? "" : FIELD_LABELS[job.function],
    LEVEL_LABELS[job.level] ?? "",
    SETUP_LABELS[job.workSetup] ?? "",
    job.industry,
    job.industry === "" ? "" : industryLabel(job.industry),
    ...job.metro.filter((m) => m !== "other-ph").map((m) => METRO_LABELS[m]),
  ];
  return ` ${fold(parts.join(" "))} `;
}

/** Query → one list of acceptable word-starts per term (empty = match everything). */
export function parseQuery(query: string): string[][] {
  const folded = fold(query).replace(/\bfresh grad(?:uate)?s?\b/g, "freshgrad");
  if (folded === "") return [];
  return folded
    .split(" ")
    .filter((term) => !FILLER.has(term))
    .map((term) => ALIASES[term] ?? [term]);
}

export function matchesQuery(key: string, terms: string[][]): boolean {
  return terms.every((alternatives) => alternatives.some((alt) => key.includes(` ${alt}`)));
}
