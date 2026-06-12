import type { JobFunction, Level } from "./types.js";

// Keyword heuristics on the published title (SPEC §9). Tables are data, in one
// place, first match wins, and `unknown`/`other` is a fine outcome — never guess.
// Every keyword below was mined from real titles in data/listings.json (or is a
// SPEC §9 seed) — extend via `pnpm --filter pipeline eval-categorizer`, never invent.
//
// Deviations from the SPEC keyword list, logged in TRACKER: bare "officer" is NOT a
// senior marker (2026-06-11 — PH titles like "HR Officer" are staff-level; C-level is
// caught by "chief"); "lead generation" is not a leadership marker (2026-06-12).

const INTERNSHIP = /\b(?:intern|internship|ojt|on-the-job|practicum|apprentice)\b/i;
const ENTRY =
  /\b(?:junior|jr\.?|entry|entry-level|fresh grad|new grad|graduate|trainee|cadet)\b/i;
const ASSOCIATE = /\bassociate\b/i;
const SENIOR_ASSOCIATE = /\b(?:senior|sr\.?)\s+associate\b/i;
const SENIOR =
  /\b(?:senior|sr\.?|lead(?!\s+generation)|leader|principal|staff|head of|manager|director|vp|chief|supervisor)\b/i;
// "-Mid"/"(MID)" are level rungs in real BPO titles; "Mid Shift" is a schedule, not a level.
const MID =
  /\b(?:mid-level|mid level|intermediate)\b|\bmid\b(?!\s*-?\s*shift)|\b(?:ii|iii)\b/i;
// PH BPO frontline reps are entry-level by market convention. Checked AFTER the
// senior/mid markers so "Senior CSR" stays senior and "CSR II" stays mid.
const FRONTLINE_ENTRY =
  /\b(?:csr|tsr|(?:customer (?:service|support)|technical support) representative|sales development representative|sdr)\b/i;
// A trailing roman "I" is the first rung of a graded ladder ("Analyst I", "Level I").
// Case-sensitive and delimiter-anchored so "IT", "lI" typos, and prose never match.
const ROMAN_I_ENTRY = /\bI\b(?=\s*(?:$|[-–—(|,]))/;

export function categorizeLevel(title: string): Level {
  if (INTERNSHIP.test(title)) return "internship";
  if (ENTRY.test(title)) return "entry";
  if (ASSOCIATE.test(title) && !SENIOR_ASSOCIATE.test(title)) return "entry";
  if (SENIOR.test(title)) return "senior";
  if (MID.test(title)) return "mid";
  if (FRONTLINE_ENTRY.test(title)) return "entry";
  if (ROMAN_I_ENTRY.test(title)) return "entry";
  return "unknown";
}

/**
 * Explicit multi-word disambiguation that must beat the generic v1 rules (SPEC §9):
 * each entry exists because a real title proved the generic rule wrong — see tests.
 */
const FUNCTION_PRE_RULES: ReadonlyArray<readonly [JobFunction, RegExp]> = [
  // "Site/Civil/Structural Engineer" are construction roles; bare "engineer" stays
  // with engineering by table order.
  ["construction", /\b(?:civil|site|structural)\s+engineer/i],
  // "Medical VA (Virtual Nurse …)" is healthcare back-office, not generic VA work.
  ["healthcare", /\bmedical\s+va\b|\bvirtual\s+nurse\b/i],
];

/** Checked in SPEC §9 table order — first match wins (so "Data Engineer" → engineering). */
const FUNCTION_RULES: ReadonlyArray<readonly [JobFunction, RegExp]> = [
  [
    "engineering",
    /\b(?:engineer|engineering|developer|devops|qa|sre|software|front-? ?end|back-? ?end|full-? ?stack|systems? administrator|network administrator|database administrator|sysadmin|systems? analyst|cms|infosec|information security|cyber ?security)\b/i,
  ],
  [
    "data",
    /\b(?:data|analytics|machine learning|ai|business intelligence|bi|mdm|master data)\b/i,
  ],
  [
    "design",
    /\b(?:designer|design|ux|ui|video editor|multimedia|artist|creative|art director|animator|producer)\b/i,
  ],
  ["product", /\b(?:product manager|product owner|product management)\b/i],
  [
    "marketing",
    /\b(?:marketing|seo|content|social media|brand|paid ads|paid search|ads|campaign|ppc|media buy(?:er|ing)|copywrit(?:er|ing)|crm|salesforce|hubspot|public relations|ambassador|community manager)\b/i,
  ],
  [
    "sales",
    /\b(?:sales|account executive|business development|account manage(?:r|ment)|lead generation|appointment sett(?:er|ing)|cold call(?:er|ing)?|territory|partnerships?|renewals?|deal desk|bids? (?:&|and) proposals?|partner (?:solutions|onboarding|success|operations))\b/i,
  ],
  [
    "finance",
    /\b(?:accountant|accounting|finance|financial|treasury|audit|auditor|payroll|tax|bookkeep(?:er|ing)|accounts (?:payable|receivable)|billing|record to report|procure to pay|requisition to pay|fixed asset|estimator|risk|underwrit(?:er|ing)|actuar(?:y|ial)|r2r|p2p|o2c|trading|trade|collections?|payments|settlements?|valuation|remedial|catastrophe|lending|loans?)\b|\b(?<!document )controller\b/i,
  ],
  [
    "hr",
    /\b(?:recruiter|recruitment|hr|people|talent|human resources|employee relations|trainer|training|learning (?:&|and) development)\b/i,
  ],
  [
    "operations",
    /\b(?:operations|supply chain|logistics|admin|administrative|procurement|(?:virtual|executive|personal|office) assistant|va|workforce|warehouse|purchasing|dispatcher|dispatch|back[- ]office|service delivery|order (?:processing|management|fulfillment)|facilit(?:y|ies)|demand plan(?:ner|ning)|track and trace|driver|verifications?|service excellence|transactional quality)\b/i,
  ],
  [
    "customer-support",
    /\b(?:support|customer success|csr|tsr|customer service|customer experience|customer care|client su(?:ccess|pport)|client service|service desk|help ?desk|call center|advocate)\b/i,
  ],
  [
    "legal",
    /\b(?:legal|compliance|counsel|paralegal|aml|kyc|money laundering|transaction monitoring|fraud)\b/i,
  ],
  // ——— schema v2 tables (SPEC §9) — cover what `other` was swallowing ———
  [
    "healthcare",
    // "Healthcare Account" is BPO-speak for the client's industry, not the role.
    /\b(?:nurse|nursing|doctor|physician|medical|clinical|clinician|pharmac(?:y|ist)|pharma|dental|dentist|caregiver|midwife|med ?tech|utilization review|prior authorization|patient|telehealth|therapist|therapy|veterinar(?:y|ian)|nclex|usrn|phrn|us rn|dietitian|care coordinat(?:or|ion))\b|\bhealthcare\b(?!\s+account)/i,
  ],
  [
    "education",
    /\b(?:teacher|teaching|tutor|instructor|professor|esl|curriculum|registrar|faculty|education)\b/i,
  ],
  [
    "hospitality",
    /\b(?:chef|cook|barista|waiter|waitress|bartender|kitchen|housekeep(?:er|ing)?|front desk|hotel|resort|restaurant|travel|tour|concierge|guest services?|reservations?)\b/i,
  ],
  [
    "manufacturing",
    // bare "production"/"maintenance"/"technician" stay unmatched on purpose —
    // real counterexamples: "Website Maintenance", "Events & Production Coordinator".
    /\b(?:machine operator|assembler|quality assurance inspector|quality control|conformance|plant|welder|fabricat(?:or|ion)|manufacturing|production (?:associate|operator|supervisor|technician|worker|planner|staff|line|crew)|maintenance (?:technician|specialist|supervisor|engineer|planner)|(?:electrical|mechanical|electro-?mechanical|instrumentation|refrigeration) (?:technician|supervisor))\b/i,
  ],
  [
    "retail",
    /\b(?:cashier|store|merchandis(?:er|ing)|retail|branch|shopkeeper|e-?commerce)\b/i,
  ],
  [
    "construction",
    /\b(?:construction|civil works|foreman|carpenter|electrician|plumber|mason|surveyor|drafter|drafts(?:man|person)|architectural|revit|property|real estate)\b/i,
  ],
];

export function categorizeFunction(title: string): JobFunction {
  for (const [fn, pattern] of FUNCTION_PRE_RULES) {
    if (pattern.test(title)) return fn;
  }
  for (const [fn, pattern] of FUNCTION_RULES) {
    if (pattern.test(title)) return fn;
  }
  return "other";
}

export function categorize(title: string): { level: Level; function: JobFunction } {
  return { level: categorizeLevel(title), function: categorizeFunction(title) };
}
