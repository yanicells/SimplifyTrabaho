import type { AtsSource, FetchResult, RegistryCompany } from "../types.js";
import { fetchAshby } from "./ashby.js";
import { fetchBambooHr } from "./bamboohr.js";
import { fetchBreezy } from "./breezy.js";
import { fetchGreenhouse } from "./greenhouse.js";
import { fetchLever } from "./lever.js";
import { fetchManatal } from "./manatal.js";
import { fetchPinpoint } from "./pinpoint.js";
import { fetchRecruitee } from "./recruitee.js";
import { fetchRippling } from "./rippling.js";
import { fetchSmartRecruiters } from "./smartrecruiters.js";
import { fetchTeamtailor } from "./teamtailor.js";
import { fetchWorkable } from "./workable.js";
import { fetchWorkday } from "./workday.js";

/** One fetcher per ATS; used by `pnpm refresh` and `verify-registry`. */
export const FETCHERS: Record<AtsSource, (company: RegistryCompany) => Promise<FetchResult>> =
  {
    greenhouse: fetchGreenhouse,
    lever: fetchLever,
    ashby: fetchAshby,
    workable: fetchWorkable,
    smartrecruiters: fetchSmartRecruiters,
    recruitee: fetchRecruitee,
    bamboohr: fetchBambooHr,
    breezy: fetchBreezy,
    manatal: fetchManatal,
    pinpoint: fetchPinpoint,
    rippling: fetchRippling,
    teamtailor: fetchTeamtailor,
    // Tier B (SPEC §17): verify-registry may probe it for §17.2 evidence, but new
    // Workday entries land only via a per-company PR, never direct to main.
    workday: fetchWorkday,
  };

/**
 * One run's fetch function with the SPEC §17.1.2 run-level stop: after the first
 * Workday block, every later Workday call returns `null` without sending a request.
 * Blocks are permanent, so a burst of them (a platform-wide incident misread as
 * blocks) must cost one tenant, not all. Used by `pnpm refresh` and verify-registry.
 */
export function createRunFetcher(
  fetchers: Record<AtsSource, (company: RegistryCompany) => Promise<FetchResult>> = FETCHERS,
): (company: RegistryCompany) => Promise<FetchResult | null> {
  let workdayHalted = false;
  return async (company) => {
    if (company.ats === "workday" && workdayHalted) return null;
    const result = await fetchers[company.ats](company);
    if (!result.ok && result.errorKind === "blocked") workdayHalted = true;
    return result;
  };
}
