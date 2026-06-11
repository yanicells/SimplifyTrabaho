// Shared by server and client — must stay free of Node-only imports.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Relative age against the pipeline's updatedAt (not Date.now()) so server and
 * client render identical text — no hydration mismatch on a static export.
 */
export function timeAgo(posted: string, reference: string): string {
  const days = Math.floor((Date.parse(reference) - Date.parse(posted)) / DAY_MS);
  if (days <= 0) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
