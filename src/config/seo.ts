/**
 * ============================================================
 *  SWISHVIEW SEO CONTROL FILE — single source of truth
 * ============================================================
 *
 *  This is the ONLY file you need to edit to change page titles,
 *  descriptions, keywords, indexing rules and sitemap priority.
 *
 *  How to use:
 *   1. Find the page you want in PAGE_SEO below (matched by `path`).
 *   2. Edit `title` (< 60 chars) and `description` (< 160 chars).
 *   3. Save. The change is live everywhere: <title>, meta description,
 *      Open Graph, Twitter cards, canonical + the sitemap.
 *
 *  Visual editor + live character counters: open /seo in the app.
 */

export const SITE_URL = "https://www.swishview.com";
export const SITE_NAME = "Swish View";
export const DEFAULT_OG_IMAGE =
  "/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png";

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;
export const DESCRIPTION_MIN = 70;

export interface PageSEO {
  /** Route path exactly as registered in App.tsx */
  path: string;
  /** Friendly label used in the /seo dashboard */
  label: string;
  title: string;
  description: string;
  keywords?: string;
  /** true = keep out of Google (private/app pages) */
  noindex?: boolean;
  /** Include in sitemap.xml */
  sitemap?: boolean;
  priority?: number;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly";
  /** Grouping in the /seo dashboard */
  group?: "Core" | "Services" | "Content" | "Legal" | "App";
}

export const DEFAULT_SEO: PageSEO = {
  path: "*",
  label: "Site default",
  title: "Swish View | YouTube Promotion | Real Views. Real Growth.",
  description:
    "Boost your YouTube videos with Swish View — real views, fast growth, smart targeting. Trusted by creators worldwide for organic YouTube growth.",
  keywords:
    "swish view, youtube promotion, real views, video marketing, grow youtube, organic youtube growth, youtube views, video promotion",
  sitemap: false,
};

export const PAGE_SEO: PageSEO[] = [
  {
    path: "/",
    label: "Home",
    group: "Core",
    title: "Swish View | YouTube Promotion With Real Views & Growth",
    description:
      "Grow your YouTube channel with real viewers, SEO-led optimization and no bots. Swish View runs promotion campaigns that build lasting organic growth.",
    keywords:
      "youtube promotion, youtube growth agency, real youtube views, youtube seo, grow youtube channel",
    sitemap: true,
    priority: 1.0,
    changefreq: "weekly",
  },
  {
    path: "/whyswishview",
    label: "Why Swish View",
    group: "Core",
    title: "Why Swish View | Real YouTube Growth, No Bots",
    description:
      "See how Swish View grows channels with real viewers, search-first optimization and transparent reporting — and why bot views quietly kill reach.",
    keywords: "why swishview, no bot views, youtube growth explained, real views",
    sitemap: true,
    priority: 0.9,
    changefreq: "monthly",
  },
  {
    path: "/reviews",
    label: "Reviews",
    group: "Core",
    title: "Swish View Reviews | Creator Results & Testimonials",
    description:
      "Real creator reviews of Swish View: subscriber jumps, watch-time growth and search rankings across gaming, finance, vlog and education channels.",
    keywords: "swishview reviews, youtube promotion reviews, creator testimonials",
    sitemap: true,
    priority: 0.8,
    changefreq: "monthly",
  },
  {
    path: "/pricing",
    label: "Pricing",
    group: "Core",
    title: "YouTube Promotion Pricing | Swish View Plans",
    description:
      "Transparent pricing for YouTube promotion, channel SEO and audits. Pick a plan built around real views, watch time and long-term channel growth.",
    keywords: "youtube promotion pricing, youtube seo cost, channel growth plans",
    sitemap: true,
    priority: 0.9,
    changefreq: "monthly",
  },
  {
    path: "/product",
    label: "Product",
    group: "Core",
    title: "How Swish View Works | YouTube Growth Platform",
    description:
      "Campaign targeting, SEO optimization and live analytics in one place. See the platform creators use to turn uploads into consistent organic growth.",
    sitemap: true,
    priority: 0.8,
    changefreq: "monthly",
  },
  {
    path: "/contact",
    label: "Contact",
    group: "Core",
    title: "Contact Swish View | Talk To Our Growth Team",
    description:
      "Questions about promotion, SEO or reporting? Contact the Swish View growth team by email or WhatsApp and get a reply the same working day.",
    sitemap: true,
    priority: 0.6,
    changefreq: "yearly",
  },
  {
    path: "/videopromotion",
    label: "Video Promotion",
    group: "Services",
    title: "YouTube Video Promotion Service | Swish View",
    description:
      "Promote a single video to real, interested viewers. Targeted placement, honest reporting and views that keep working after the campaign ends.",
    keywords: "youtube video promotion, promote youtube video, video marketing service",
    sitemap: true,
    priority: 0.9,
    changefreq: "monthly",
  },
  {
    path: "/channeloptimization",
    label: "Channel Optimization",
    group: "Services",
    title: "YouTube Channel Optimization & SEO | Swish View",
    description:
      "Titles, descriptions, tags, thumbnails and metadata rebuilt around what people actually search for — so every upload starts with an advantage.",
    keywords: "youtube channel optimization, youtube seo service, metadata optimization",
    sitemap: true,
    priority: 0.9,
    changefreq: "monthly",
  },
  {
    path: "/channelaudit",
    label: "Channel Audit",
    group: "Services",
    title: "Free YouTube Channel Audit | Swish View",
    description:
      "Get a channel audit that shows what is limiting your reach: search visibility, thumbnails, retention and upload strategy, with clear next steps.",
    keywords: "youtube channel audit, free youtube audit, channel review",
    sitemap: true,
    priority: 0.9,
    changefreq: "monthly",
  },
  {
    path: "/channel-growth",
    label: "Channel Growth (Boost)",
    group: "Services",
    title: "YouTube Channel Growth Campaigns | Swish View",
    description:
      "Ongoing channel growth campaigns combining real promotion with SEO. Built for creators who want subscribers and watch time that compound.",
    sitemap: true,
    priority: 0.8,
    changefreq: "monthly",
  },
  {
    path: "/bookaproject",
    label: "Book A Project",
    group: "Services",
    title: "Book A YouTube Growth Project | Swish View",
    description:
      "Tell us about your channel and goals. We scope a promotion and SEO project, assign a manager and share the roadmap before anything starts.",
    sitemap: true,
    priority: 0.7,
    changefreq: "monthly",
  },
  {
    path: "/blogs",
    label: "Blog index",
    group: "Content",
    title: "YouTube Growth Blog | Swish View",
    description:
      "Practical YouTube growth guides: search optimization, thumbnails, retention, upload strategy and creator case studies from the Swish View team.",
    keywords: "youtube growth blog, youtube seo tips, creator guides",
    sitemap: true,
    priority: 0.8,
    changefreq: "daily",
  },
  {
    path: "/child-safety",
    label: "Child Safety",
    group: "Legal",
    title: "Child Safety Standards | Swish View",
    description:
      "Swish View's child safety standards, reporting process and zero-tolerance policy for content that exploits or endangers minors.",
    sitemap: true,
    priority: 0.4,
    changefreq: "yearly",
  },
  {
    path: "/privacy-policy",
    label: "Privacy Policy",
    group: "Legal",
    title: "Privacy Policy | Swish View",
    description:
      "How Swish View collects, uses and protects your data, including channel analytics access, cookies and your rights over your information.",
    sitemap: true,
    priority: 0.3,
    changefreq: "yearly",
  },
  {
    path: "/terms-conditions",
    label: "Terms & Conditions",
    group: "Legal",
    title: "Terms & Conditions | Swish View",
    description:
      "The terms that govern the use of Swish View promotion, SEO and analytics services, including campaign delivery and account responsibilities.",
    sitemap: true,
    priority: 0.3,
    changefreq: "yearly",
  },
  {
    path: "/refund-policy",
    label: "Refund Policy",
    group: "Legal",
    title: "Refund Policy | Swish View",
    description:
      "When refunds apply to Swish View campaigns, how to request one and how long processing takes. Clear rules, no fine-print surprises.",
    sitemap: true,
    priority: 0.3,
    changefreq: "yearly",
  },
  {
    path: "/shipping-policy",
    label: "Shipping / Delivery Policy",
    group: "Legal",
    title: "Service Delivery Policy | Swish View",
    description:
      "How and when Swish View delivers digital services after purchase, including campaign start times and reporting schedules.",
    sitemap: true,
    priority: 0.3,
    changefreq: "yearly",
  },

  /* ---- Private / app pages: kept out of Google on purpose ---- */
  { path: "/login", label: "Login", group: "App", title: "Login | Swish View", description: "Sign in to your Swish View dashboard to track campaigns, analytics and reports.", noindex: true },
  { path: "/signup", label: "Signup", group: "App", title: "Create Account | Swish View", description: "Create a Swish View account to launch campaigns and track your channel growth.", noindex: true },
  { path: "/dashboard", label: "Dashboard", group: "App", title: "Dashboard | Swish View", description: "Your campaigns, analytics and growth reports in one place.", noindex: true },
  { path: "/admin", label: "Admin", group: "App", title: "Admin | Swish View", description: "Internal admin console.", noindex: true },
  { path: "/prospects", label: "Prospects CRM", group: "App", title: "Prospects | Swish View", description: "Internal outreach workspace.", noindex: true },
  { path: "/crm", label: "CRM", group: "App", title: "CRM | Swish View", description: "Internal client CRM.", noindex: true },
  { path: "/tracker", label: "Daily Pulse Tracker", group: "App", title: "Tracker | Swish View", description: "Internal daily reporting.", noindex: true },
  { path: "/seo", label: "SEO Control Center", group: "App", title: "SEO Control Center | Swish View", description: "Internal SEO management dashboard.", noindex: true },
];

/** Exact-path lookup (falls back to the site default). */
export function getPageSEO(pathname: string): PageSEO {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const exact = PAGE_SEO.find((p) => p.path === clean);
  if (exact) return exact;
  // Prefix match for nested routes (e.g. /blogs/creator/post -> /blogs)
  const prefix = PAGE_SEO.filter((p) => p.path !== "/" && clean.startsWith(p.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return prefix || DEFAULT_SEO;
}

export const SITEMAP_PAGES = PAGE_SEO.filter((p) => p.sitemap && !p.noindex);

/** Simple health rules used by the /seo dashboard. */
export function seoIssues(p: PageSEO): string[] {
  const issues: string[] = [];
  if (!p.title) issues.push("Missing title");
  else if (p.title.length > TITLE_MAX) issues.push(`Title too long (${p.title.length}/${TITLE_MAX})`);
  if (!p.description) issues.push("Missing description");
  else {
    if (p.description.length > DESCRIPTION_MAX) issues.push(`Description too long (${p.description.length}/${DESCRIPTION_MAX})`);
    if (p.description.length < DESCRIPTION_MIN) issues.push(`Description too short (${p.description.length}, aim ${DESCRIPTION_MIN}+)`);
  }
  if (!p.noindex && !p.sitemap) issues.push("Indexable but not in sitemap");
  return issues;
}
