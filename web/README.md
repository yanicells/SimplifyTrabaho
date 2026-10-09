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

## `/jobs.json` rate limit

`/jobs.json` is the public feed of every active job (~5.5 MB raw, CORS `*`). The
homepage fetches it once per load. `firewall/jobs-json-rate-limit.json` holds a
Vercel WAF rule for it:

- matches the path `/jobs.json` exactly; no other page or asset is counted
- fixed 60-second window, 30 requests per client IP
- request 31+ in a window gets a plain HTTP `429` (no challenge page), until the
  window resets

`vercel.json` can't express this: its `mitigate` field accepts only `challenge`
and `deny`. WAF rules live in the Vercel project's firewall config, not in the
deployment, so **this file does nothing until a maintainer applies it**.

`firewall publish` makes **every** staged draft change live, not just this rule.
Run the steps below one checkpoint at a time, from `web/`, as a project admin or
member. Do not paste them as one batch.

**1. Link and preflight.**

```
pnpm dlx vercel@latest link
pnpm dlx vercel@latest firewall diff
```

STOP if `diff` shows any pending change. It belongs to someone else: don't
publish it and don't `firewall discard` it. Ask its owner to publish or discard
first.

**2. Stage the rule.**

```
pnpm dlx vercel@latest firewall rules add --json "$(cat firewall/jobs-json-rate-limit.json)"
pnpm dlx vercel@latest firewall diff
```

STOP unless the diff contains exactly one change: the new `Rate limit /jobs.json`
rule. If it contains anything else, don't publish.

**3. Publish.** Answer the confirmation prompt yourself; don't pass `--yes`.

```
pnpm dlx vercel@latest firewall publish
```

You can create the same rule from the dashboard instead (Firewall → Configure →
New Rule): Request Path equals `/jobs.json`, Rate Limit with Fixed Window, 60s,
30 requests, key IP, action Default (429). Hobby allows one rate-limit rule per
project. To change the limit, edit the file and the test, then run
`firewall rules edit "Rate limit /jobs.json"` (it stages a draft too, so repeat
the preflight and diff checkpoints).

**4. Verify.** Exact counts are not guaranteed: the window is fixed, so a burst can
straddle a window boundary, counters are per Vercel region, and your IP may
already have traffic in the current window. Use a small bounded burst of `HEAD`
requests (headers only, no 5 MB downloads) with timestamps, and look for any
`429` once the burst exceeds 30 in a few seconds:

```
for i in $(seq 1 40); do
  printf '%s ' "$(date +%T)"
  curl -sI --connect-timeout 5 --max-time 10 -o /dev/null -w '%{http_code}\n' \
    https://simplifytrabaho.ycells.com/jobs.json
done
```

Then confirm the rule itself acted: `pnpm dlx vercel@latest firewall overview`
(or Firewall → Activity in the dashboard) should list `Rate limit /jobs.json` with
rate-limited requests.

Two host behaviors are **not yet verified**; check them during activation and
record the result in `docs/TRACKER.md`:

- `/jobs%2Ejson` (percent-encoded dot) serves the same feed. Request it
  repeatedly and check it shares the `/jobs.json` counter, i.e. the rule matches
  it too.
- A `429` may lack `Access-Control-Allow-Origin`. Check with
  `curl -si -H 'Origin: https://example.com' https://simplifytrabaho.ycells.com/jobs.json | head`
  right after a `429`.

Known limits. Counters are per Vercel region. Many users can share one IP on
carrier-grade NAT or a campus network; if they hit the limit, raise it. The `429`
response may not carry the CORS header, so a cross-origin browser client sees a
CORS error, not a status code. The same data is in `data/listings.json` on GitHub,
and this rule can't limit that.
