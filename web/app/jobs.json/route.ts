import { loadJobs } from "@/lib/listings";

export const dynamic = "force-static";

// Every active job, emitted as a static file at build. The homepage inlines only
// its first page of rows and fetches this after hydration (see JobBoard).
export function GET(): Response {
  return Response.json(loadJobs().jobs);
}
