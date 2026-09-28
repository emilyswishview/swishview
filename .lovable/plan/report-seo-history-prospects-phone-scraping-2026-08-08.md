# Report: SEO History + Prospects Phone Scraping

Produce one downloadable document (`/mnt/documents/swishview-seo-and-phone-scraping-report.pdf`, plus a markdown copy) covering the two topics you asked about. No app code changes.

## Part 1 — SEO approaches taken so far

Sourced from what is actually in the project today:

- **Head metadata (index.html)** — title/description/keywords/author, Open Graph (url, title, description, image), Twitter card, security + viewport meta, font preloads.
- **Per-page dynamic meta via `src/components/SEOHead.tsx`** — canonical URLs, robots directives (`max-snippet`, `max-image-preview`), OG image dimensions/locale, Twitter creator attribution, geo/language targeting.
- **Structured data (JSON-LD)** — Person + ProfilePage + BreadcrumbList + ItemList on creator pages, Article schema on blog posts, plus schema on `/reviews`.
- **Sitemaps — two mechanisms, documented and compared:**
  - `api/sitemap.ts` (Vercel serverless) serving live XML at `/sitemap.xml`, listing static pages plus creators and published posts pulled from Supabase.
  - `src/utils/generateSitemap.ts` (client-side generator) covering the same routes.
  - Note: both stamp `lastmod` with today's date rather than a real content-change date — flagged as an accuracy issue with the recommended fix.
- **robots.txt** — allow-all baseline, explicit `Allow` for `/blogs/` and `/blog-post/`, `Disallow` on `/creator/` (301-consolidated), all admin/auth/internal routes and `/api/`, `Crawl-delay: 0`, sitemap pointer, per-bot blocks for Googlebot, Googlebot-Image, Bingbot, Slurp.
- **Google Search Console** — verification file `public/googleeb739b9bd7520d4d.html` present; report notes property verification, sitemap submission, and what GSC data we can/can't read from here.
- **URL consolidation** — legacy `/creator/*` → `/blogs/*` 301 redirects (`middleware.ts`, `LegacyCreatorRedirect.tsx`).
- **Existing SEO docs in repo** — summary of `SEO_IMPLEMENTATION_PLAN.md` and `QUICK_SEO_REFERENCE.md`.
- **Known limitations section** — client-rendered SPA (crawlers see JS-rendered content), duplicate sitemap mechanisms, `lastmod` accuracy, and the SSR option.

## Part 2 — Where /prospects phone numbers come from

Full source-by-source breakdown with priority order:

1. **YouTube Data API v3 channel data** — channel description, branding keywords, and (loose match) the channel title itself.
2. **Recent video descriptions** — up to 6–12 latest uploads.
3. **YouTube About / channel page HTML scrape** — `/channel/{id}/about`, `/@handle/about`, channel home; readable text pulled out of `ytInitialData` JSON fields and meta description.
4. **`tel:` and WhatsApp links** — `wa.me`, `api.whatsapp.com/send?phone=`, `whatsapp://send`, `tel:` hrefs anywhere in the markup.
5. **Creator's external links** — website/linktree/socials extracted from YouTube redirect URLs, then crawled including auto-tried `/contact`, `/contact-us`, `/about` pages.

Plus:
- **Match order and confidence ranking** (WhatsApp → tel: → labelled number → international → India → US → grouped → bare digits).
- **Validation and junk filtering** — 8–15 digit range, repeated/sequential digit rejection, date and unix-timestamp rejection, leading-zero normalisation.
- **Pipelines that write the column** — `prospects-find-phones` bulk scan (10-way concurrency, 90s wall budget, self-re-invoking until the whole ~8k database is processed), `prospects-daily-sync`, and per-row Fetch — with the rule that a real existing number is never overwritten and `NONE` is written when nothing is found.
- **UI surface** — Find Phones button, live found/total counter and progress %, "only leads with a phone" filter.
- **Coverage gaps** — creators who never publish a number, region formats not covered, sites blocking server-side fetch.

## Technical notes

Report generated as a styled PDF in SwishView brand colours (orange accent on dark), with a markdown source file alongside it. Every page rendered to an image and visually checked before delivery.
