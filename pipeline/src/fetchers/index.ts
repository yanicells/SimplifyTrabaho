import type { AtsSource, FetchResult, RegistryCompany } from "../types.js";
import { fetchAshby } from "./ashby.js";
import { fetchBambooHr } from "./bamboohr.js";
import { fetchBreezy } from "./breezy.js";
import { fetchGreenhouse } from "./greenhouse.js";
import { fetchLever } from "./lever.js";
import { fetchManatal } from "./manatal.js";
import { fetchRecruitee } from "./recruitee.js";
import { fetchSmartRecruiters } from "./smartrecruiters.js";
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
    // Tier B (SPEC §17): verify-registry may probe it for §17.2 evidence, but new
    // Workday entries land only via a per-company PR, never direct to main.
    workday: fetchWorkday,
  };
