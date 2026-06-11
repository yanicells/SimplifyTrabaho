import type { JobFunction, Level } from "./types.js";

// Keyword heuristics on the published title (SPEC §9). Tables are data, in one
// place, first match wins, and `unknown`/`other` is a fine outcome — never guess.
//
// Deviation from the SPEC keyword list, logged in TRACKER (2026-06-11): bare
// "officer" is NOT a senior marker. SPEC §9 says officer "(as in C-level)", and PH
// titles like "HR Officer"/"Customer Service Officer" are staff-level roles; C-level
// titles are already caught by "chief".

const INTERNSHIP = /\b(?:intern|internship|ojt|on-the-job|practicum|apprentice)\b/i;
const ENTRY =
  /\b(?:junior|jr\.?|entry|entry-level|fresh grad|new grad|graduate|trainee|cadet)\b/i;
const ASSOCIATE = /\bassociate\b/i;
const SENIOR_ASSOCIATE = /\b(?:senior|sr\.?)\s+associate\b/i;
const SENIOR =
  /\b(?:senior|sr\.?|lead|leader|principal|staff|head of|manager|director|vp|chief|supervisor)\b/i;
const MID = /\b(?:mid-level|mid level|intermediate|ii|iii)\b/i;
// PH BPO frontline reps are entry-level by market convention. Checked AFTER the
// senior/mid markers so "Senior CSR" stays senior and "CSR II" stays mid.
const FRONTLINE_ENTRY =
  /\b(?:csr|tsr|(?:customer (?:service|support)|technical support) representative|sales development representative|sdr)\b/i;

export function categorizeLevel(title: string): Level {
  if (INTERNSHIP.test(title)) return "internship";
  if (ENTRY.test(title)) return "entry";
  if (ASSOCIATE.test(title) && !SENIOR_ASSOCIATE.test(title)) return "entry";
  if (SENIOR.test(title)) return "senior";
  if (MID.test(title)) return "mid";
  if (FRONTLINE_ENTRY.test(title)) return "entry";
  return "unknown";
}

/** Checked in SPEC §9 table order — first match wins (so "Data Engineer" → engineering). */
const FUNCTION_RULES: ReadonlyArray<readonly [JobFunction, RegExp]> = [
  [
    "engineering",
    /\b(?:engineer|engineering|developer|devops|qa|sre|software|systems? administrator|network administrator|database administrator|sysadmin)\b/i,
  ],
  ["data", /\b(?:data|analytics|machine learning|ai|business intelligence)\b/i],
  ["design", /\b(?:designer|design|ux|ui|video editor|multimedia)\b/i],
  ["product", /\b(?:product manager|product owner|product management)\b/i],
  [
    "marketing",
    /\b(?:marketing|seo|content|social media|brand|paid ads|ppc|media buy(?:er|ing)|copywrit(?:er|ing)|crm)\b/i,
  ],
  [
    "sales",
    /\b(?:sales|account executive|business development|account manage(?:r|ment))\b/i,
  ],
  [
    "finance",
    /\b(?:accountant|accounting|finance|financial|treasury|audit|auditor|payroll|tax|bookkeep(?:er|ing)|accounts (?:payable|receivable)|billing|record to report|procure to pay|requisition to pay|fixed asset|estimator)\b/i,
  ],
  [
    "hr",
    /\b(?:recruiter|recruitment|hr|people|talent|human resources|employee relations|trainer|training|learning (?:&|and) development)\b/i,
  ],
  [
    "operations",
    /\b(?:operations|supply chain|logistics|admin|administrative|procurement|(?:virtual|executive|personal|office) assistant|workforce|warehouse|purchasing|dispatcher|dispatch)\b/i,
  ],
  [
    "customer-support",
    /\b(?:support|customer success|csr|tsr|customer service|customer experience|customer care|client success|call center)\b/i,
  ],
  ["legal", /\b(?:legal|compliance|counsel|paralegal)\b/i],
];

export function categorizeFunction(title: string): JobFunction {
  for (const [fn, pattern] of FUNCTION_RULES) {
    if (pattern.test(title)) return fn;
  }
  return "other";
}

export function categorize(title: string): { level: Level; function: JobFunction } {
  return { level: categorizeLevel(title), function: categorizeFunction(title) };
}
