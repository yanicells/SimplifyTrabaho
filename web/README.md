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

## Brand and share assets

`public/social/simplifytrabaho-icon.png` is the header/navbar icon, including the
small yellow accent marks. `public/social/simplifytrabaho-mark.png` is the
centered, spark-free mark used by the Apple icon, PWA manifest, and JSON-LD logo.
The browser-tab icon (`app/icon.png`) is the same briefcase in white on a black
rounded tile, so it stays legible in dark tab bars. The footer uses
`public/footer-logo.png`, the black-background mark that blends into the black
band. The full `public/social/simplifytrabaho-square.png` lockup remains available
for social profiles and square shares. The checked-in
`public/social/simplifytrabaho-og.png` is the 1200×630 link-preview image used by
Messenger, Facebook, WhatsApp, LinkedIn, Slack, and X.

The header serves the dedicated 192px derivative `simplifytrabaho-icon-192.png`.
Keep the larger source files for social/PWA generation; serving them directly at
56–64px wastes hundreds of kilobytes on the initial mobile view.

## `vercel.json` — why it exists

JSON can't carry a comment, so the reason lives here.

Next's generated app icons (`app/icon.tsx`, `app/apple-icon.tsx`) are emitted by
`output: "export"` as **extensionless** files — `out/icon`, `out/apple-icon`.
Vercel's static layer types files by extension, so it served both as
`application/octet-stream`. Social crawlers and search engines may not recognize
those responses as images, even though the file bytes are valid PNGs. The OG
share card is checked in as `public/social/simplifytrabaho-og.png`, so it keeps
its normal `.png` content type.

`headers()` in `next.config.ts` is a no-op under `output: "export"`, so the
content type has to be asserted at the host. If a new generated image route is
added, add it to `vercel.json` too — and verify with:

```
curl -sI https://simplifytrabaho.ycells.com/icon | grep content-type
```

The static export also emits RSC payloads as `.txt` files. Every `.txt`
response receives `X-Robots-Tag: noindex` from `vercel.json`; this keeps the
payload URLs out of search results while leaving them crawlable so bots can see
the directive. `robots.txt` must not disallow them, because a blocked URL can
still be indexed without its content. This also marks `/llms.txt` as noindex,
but does not prevent agents from fetching it.
