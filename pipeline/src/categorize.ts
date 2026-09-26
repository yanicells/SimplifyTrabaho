import type { JobFunction, Level } from "./types.js";

// Keyword heuristics on the published title (SPEC §9). Tables are data, in one
// place, first match wins, and `unknown`/`other` is a fine outcome — never guess.
// Every keyword below was mined from real titles in data/listings.json (or is a
// SPEC §9 seed) — extend via `pnpm --filter pipeline eval-categorizer`, never invent.
//
// Deviations from the SPEC keyword list, logged in TRACKER: bare "officer" is NOT a
// senior marker (2026-06-11 — PH titles like "HR Officer" are staff-level; C-level is
// caught by "chief"); "lead generation" is not a leadership marker (2026-06-12);
// bare "staff" is not senior — PH "Accounting Staff" is rank-and-file (2026-09-25).

/**
 * Titles are matched after folding: accents/styled unicode → ASCII ("Biñan" must not
 * leak a bare "Bi" match), and "_" → space ("Ledger_Hybrid" defeats `\b`).
 */
function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ");
}

const INTERNSHIP = /\b(?:intern|internship|ojt|on-the-job|practicum|apprentice)\b/i;
const ENTRY =
  /\b(?:junior|jr\.?|entry|entry-level|fresh grad|new grad|graduate|trainee|cadet)\b/i;
// "Associate Manager/Director" is a management rung, not entry.
const ASSOCIATE =
  /\bassociate\b(?!\s+(?:manager|manger|director|vice president|vp|partner|principal))/i;
const SENIOR_ASSOCIATE = /\b(?:senior|sr\.?)\s+associate\b/i;
// "staff" only in the tech-ladder sense ("Staff Engineer"); "Head Office" is a place.
const SENIOR =
  /\b(?:senior|sr\.?|lead(?!\s+generation)|leader|principal|head(?!\s+office)|manager|director|vp|vice president|chief|supervisor|superintendent|in[- ]charge)\b|\bstaff(?=\s+(?:\w+\s+)?(?:engineer|scientist|developer|designer|architect))/i;
// "-Mid"/"(MID)" are level rungs in real BPO titles; "Mid Shift" is a schedule, not a level.
const MID =
  /\b(?:mid-level|mid level|intermediate)\b|\bmid\b(?!\s*-?\s*shift|\s*(?:and|\/)\s*night)|\b(?:ii|iii)\b/i;
// PH BPO frontline reps are entry-level by market convention. Checked AFTER the
// senior/mid markers so "Senior CSR" stays senior and "CSR II" stays mid.
const FRONTLINE_ENTRY =
  /\b(?:csr|tsr|(?:customer (?:service|support)|technical support) representative|sales development representative|sdr)\b/i;
// A trailing roman "I" is the first rung of a graded ladder ("Analyst I", "Level I").
// Case-sensitive and delimiter-anchored so "IT", "lI" typos, and prose never match.
const ROMAN_I_ENTRY = /\bI\b(?=\s*(?:$|[-–—(|,]))/;
// Frontline role nouns, same ordering rule as FRONTLINE_ENTRY ("Head Cashier" stays
// senior). Agents only in the call-center sense — "AI Agents" is a product.
const FRONTLINE_NOUN_ENTRY =
  /\b(?:cashiers?|crew|clerks?|encoders?|fresher|(?:center|sales|support|desk|voice|chat|service|production) agents?)\b/i;

export function categorizeLevel(rawTitle: string): Level {
  const title = normalizeTitle(rawTitle);
  if (INTERNSHIP.test(title)) return "internship";
  if (ENTRY.test(title)) return "entry";
  if (ASSOCIATE.test(title) && !SENIOR_ASSOCIATE.test(title)) return "entry";
  if (SENIOR.test(title)) return "senior";
  if (MID.test(title)) return "mid";
  if (FRONTLINE_ENTRY.test(title)) return "entry";
  if (ROMAN_I_ENTRY.test(title)) return "entry";
  if (FRONTLINE_NOUN_ENTRY.test(title)) return "entry";
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
  // Medical coders: "Risk Adjustment Coder" / "PB QA Coder" would hit finance / QA.
  [
    "healthcare",
    /\b(?:(?:medical|ip|op|inpatient|outpatient|profee|hcc|nurse|qa) coders?|risk adjustment|charge capture)\b/i,
  ],
  // "Store Cashier - BF Resort Drive": the store beats a place name's "resort".
  ["retail", /\bstore (?:cashier|manager)\b/i],
];

/** Checked in SPEC §9 table order — first match wins (so "Data Engineer" → engineering). */
const FUNCTION_RULES: ReadonlyArray<readonly [JobFunction, RegExp]> = [
  [
    "engineering",
    /\b(?:engineers?|engineering|developers?|devops|qa|sre|software|front-? ?end|back-? ?end|full-? ?stack|systems? administrator|network administrator|database administrat(?:or|ion)|sysadmin|systems? analyst|cms|infosec|information security|cyber ?security)\b/i,
  ],
  [
    "data",
    /\b(?:data|analytics|machine learning|ai|business intelligence|bi|mdm|master data|mis|qlik|microstrategy|etl|statistician|annotat(?:or|ion)|reports (?:analyst|specialist)|measurement (?:&|and) report)\b/i,
  ],
  [
    "design",
    /\b(?:designers?|design|ux|ui|video editor|photo edit(?:or|ing)|multimedia|artist|creatives?|art director|animator|producer)\b/i,
  ],
  ["product", /\b(?:product manager|product owner|product management)\b/i],
  [
    "marketing",
    /\b(?:marketing|seo|content|social media|brand|paid ads|paid search|ads|campaign|ppc|media buy(?:er|ing)|copywrit(?:er|ing)|crm|salesforce|hubspot|public relations|pr|media relations|corporate communications?|public affairs|advertising(?!\s+sales)|demand generation|affiliate (?:market(?:ing)?|coordinator|manager)|market (?:research|insights|analysis)|ambassador|community manager)\b/i,
  ],
  [
    "sales",
    /\b(?:sales|account executive|business development|account manage(?:r|ment)|lead generation|appointment sett(?:er|ing)|cold call(?:er|ing)?|territory|partnerships?|renewals?|deal desk|bids? (?:&|and) proposals?|partner (?:solutions|onboarding|success|operations)|relationship (?:manager|executive)|key accounts?|telesales|telemarketing|salesm[ae]n|go-to-market|gtm)\b/i,
  ],
  [
    "finance",
    /\b(?:accountant|accounting|finance|financial|treasury|audit(?:ing)?|auditor|payroll|tax|bookkeep(?:er|ing)|accounts? (?:payables?|receivables?)|billing|order[- ]to[- ]cash|invoice to cash|bill-to-cash|general ledger|gl|controllership|controlling|fp&a|a2r|r2a|credit|teller|reconciliations?|recons|cash (?:management|ops|applications?)|revenue (?:analyst|assurance)|(?:investment|branch) banking|banking operations|investments?|investor relations|mortgage|wealth|capital markets|finops|lender|record to report|procure to pay|requisition to pay|fixed asset|estimator|risk|underwrit(?:er|ing)|actuar(?:y|ial)|r2r|p2p|o2c|trading|trade|collections?|payments|settlements?|valuation|remedial|catastrophe|lending|loans?)\b|\b(?<!document )controller\b/i,
  ],
  [
    "hr",
    /\b(?:recruiter|recruitment|recruiting|headhunter|employer branding|staffing specialist|hr|hrbp|hris|people|talent|human resources?|employee relations|labou?r relations|compensation|total rewards|organi[sz]ational development|culture|trainer|training|learning)\b/i,
  ],
  [
    "operations",
    /\b(?:operations?|supply chain|logistics|forklift|inventory|(?:global|strategic) sourcing|source-to-contract|s2p|shipping|freight|fleet|transport|wfm|real time analyst|rta|stock piler|buyer|buying|continuous improvement|process excellence|operational excellence|business excellence|admin|administrative|administration (?:clerk|officer|assistant)|procurement|(?:virtual|executive|personal|office) assistant|va|workforce|warehouse|purchasing|dispatcher|dispatch|back[- ]office|service delivery|order (?:processing|management|fulfillment)|facilit(?:y|ies)|demand plan(?:ner|ning)|track and trace|driver|verifications?|service excellence|transactional quality)\b/i,
  ],
  [
    "customer-support",
    /\b(?:support|customer success|csr|tsr|customer service|customer experience|customer care|client su(?:ccess|pport)|client services?|client relations|customer specialist|contact center|complaints?|escalations?|resolution specialist|retention|service desk|help ?desk|call center|advocate)\b/i,
  ],
  [
    "legal",
    /\b(?:legal|compliance|counsel|paralegal|lawyer|attorney|contract management|aml|kyc|money laundering|transaction monitoring|fraud)\b/i,
  ],
  // ——— schema v2 tables (SPEC §9) — cover what `other` was swallowing ———
  [
    "healthcare",
    // "Healthcare Account" is BPO-speak for the client's industry, not the role.
    /\b(?:nurse|nursing|doctor|physician|medical|clinical|clinician|pharmac(?:y|ists?)|pharma|radiologic|echo technologist|optometrist|psychologist|health information|rns?|dental|dentist|caregiver|midwife|med ?tech|utilization review|prior authorization|patient|telehealth|therapist|therapy|veterinar(?:y|ians?)|nclex|usrn|phrn|us rn|dietitian|care coordinat(?:or|ion))\b|\bhealthcare\b(?!\s+account)/i,
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
    /\b(?:machine operator|assembler|quality assurance inspector|quality control|quality inspector|conformance|plant|welder|machinist|mechanic|(?:mechanical|pipe|structural) fitter|hvac|fabricat(?:or|ion)|manufacturing|production (?:associate|operator|supervisor|technician|worker|planner|staff|line|crew)|maintenance (?:technician|specialist|supervisor|engineer|planner|officer)|(?:electrical|mechanical|electro-?mechanical|instrumentation|refrigeration) (?:technician|supervisor)|(?:hydraulic|aircon|reefer(?: van)?|refeer van|crane service|building) technicians?)\b/i,
  ],
  [
    "retail",
    /\b(?:cashier|store|merchandis(?:e|er|ing)|retail|branch|shopkeeper|e-?commerce)\b/i,
  ],
  [
    "construction",
    /\b(?:construction|preconstruction|civil works|foreman|carpenter|electrician|plumber|mason|surveyor|drafter|drafts(?:man|person)|architectural|revit|bim|autocad|property|real estate|leasing|lettings)\b/i,
  ],
  // ——— tech fallback: last, so a stated function wins ("IT Trainer" → hr, "IT Audit"
  // → finance). Case-sensitive "IT" so "it"/"It" in prose never match; physical
  // security ("Safety and Security", "Security Guard") is not tech.
  ["engineering", /\bIT\b(?!\s+BPO)/],
  [
    "engineering",
    /\b(?:sap|abap|oracle|netsuite|peoplesoft|servicenow|mainframe|cobol|linux|java|python|node\.?js|asp\.net|kafka|mongodb|citrix|azure|aws|amazon web services|office ?365|0365|sql|dba|tosca|boomi|scrum master|programm(?:er|ing)|tester|noc|secops|(?:application|mobile|systems?|software|web) development|information technology|chief technology officer|head of technology|technology (?:lead|architect)|technical (?:lead|leader|writer)|(?:network|cloud|it) infrastructure|infrastructure service|head of infrastructure|(?:security|solutions?|technical|identity|database|enterprise|spring boot|servicenow) architects?|solution architecture)\b|(?<!safety and |physical )\bsecurity\b(?!\s+(?:guard|contract))/i,
  ],
];

export function categorizeFunction(rawTitle: string): JobFunction {
  const title = normalizeTitle(rawTitle);
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
