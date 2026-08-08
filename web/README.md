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
`application/octet-stream`. Social crawlers and search engines may not recognize
those responses as images, even though the file bytes are valid PNGs.

`headers()` in `next.config.ts` is a no-op under `output: "export"`, so the
content type has to be asserted at the host. If a new generated image route is
added, add it to `vercel.json` too — and verify with:

```
curl -sI https://simplifytrabaho.ycells.com/opengraph-image | grep content-type
```

The static export also emits RSC payloads as `.txt` files. Every `.txt`
response receives `X-Robots-Tag: noindex` from `vercel.json`; this keeps the
payload URLs out of search results while leaving them crawlable so bots can see
the directive. `robots.txt` must not disallow them, because a blocked URL can
still be indexed without its content. This also marks `/llms.txt` as noindex,
but does not prevent agents from fetching it.
