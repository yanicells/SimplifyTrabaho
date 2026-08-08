# web

The SimplifyTrabaho website — a one-page Next.js static export that reads
`../data/listings.json` at build time. No server, no database. See
[docs/SPEC.md §12](../docs/SPEC.md) for requirements.

```
pnpm --filter web dev      # local dev server
pnpm --filter web build    # static export to web/out (fails on invalid listings.json)
pnpm --filter web test     # data-layer unit tests
```

The build ships only active listings with only the fields the UI renders
(see `lib/listings.ts`). Filtering is fully client-side.

## `vercel.json` — why it exists

JSON can't carry a comment, so the reason lives here.

Next's generated metadata images (`app/opengraph-image.tsx`, `app/icon.tsx`,
`app/apple-icon.tsx`) are emitted by `output: "export"` as **extensionless**
files — `out/opengraph-image`, `out/icon`, `out/apple-icon`. Vercel's static
layer types files by extension, so it served all three as
`application/octet-stream`. Facebook, LinkedIn, Slack and X all reject a
non-image content type, so share cards rendered blank, and Google won't accept
a non-image response as an Organization logo.

`headers()` in `next.config.ts` is a no-op under `output: "export"`, so the
content type has to be asserted at the host. If a new generated image route is
added, add it to `vercel.json` too — and verify with:

```
curl -sI https://simplifytrabaho.ycells.com/opengraph-image | grep content-type
```
