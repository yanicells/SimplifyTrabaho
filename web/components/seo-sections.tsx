import Link from "next/link";
import type { FaqItem, Landing } from "@/lib/landings";

const GROUP_ORDER: Landing["group"][] = ["Level", "Work setup", "Location", "Field"];

const linkClass =
  "rounded-sm text-sm text-ink underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ink";

/**
 * Crawlable links to every published landing page, grouped. This is how search
 * engines discover the pages and learn what each is about from its anchor text.
 */
export function BrowseLinks({ landings, current }: { landings: Landing[]; current?: string }) {
  return (
    <section aria-labelledby="browse-heading" className="mt-16 border-t border-line pt-10">
      <h2 id="browse-heading" className="font-display text-xl font-bold">
        Browse jobs in the Philippines
      </h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {GROUP_ORDER.map((group) => {
          const items = landings.filter((l) => l.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{group}</h3>
              <ul className="mt-2 space-y-1.5">
                {items.map((l) => (
                  <li key={l.slug}>
                    {l.slug === current ? (
                      <span aria-current="page" className="text-sm font-semibold">
                        {l.label}
                      </span>
                    ) : (
                      <Link href={`/${l.slug}`} className={linkClass}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Visible Q&A — mirrored exactly by the FAQPage JSON-LD, never diverging from it. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-16 mb-16">
      <h2 id="faq-heading" className="font-display text-xl font-bold">
        Frequently asked questions
      </h2>
      <dl className="mt-5 max-w-3xl divide-y divide-line">
        {items.map((item) => (
          <div key={item.q} className="py-4">
            <dt className="font-semibold">{item.q}</dt>
            <dd className="mt-1.5 text-[15px] leading-relaxed text-faint">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Breadcrumb({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mt-8 text-sm text-faint">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/" className={linkClass}>
            All jobs
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li aria-current="page">{label}</li>
      </ol>
    </nav>
  );
}
