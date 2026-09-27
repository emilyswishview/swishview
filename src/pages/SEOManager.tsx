import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  PAGE_SEO,
  PageSEO,
  SITE_URL,
  TITLE_MAX,
  DESCRIPTION_MAX,
  seoIssues,
} from "@/config/seo";
import {
  Search,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  FileText,
  Map,
  ListChecks,
  RotateCcw,
  Save,
} from "lucide-react";

const DRAFT_KEY = "seo.drafts.v1";
type Draft = Partial<Pick<PageSEO, "title" | "description" | "keywords">>;

const TABS = ["Pages", "Robots & Sitemap", "Checklist"] as const;
type Tab = (typeof TABS)[number];

const counterClass = (len: number, max: number) =>
  len === 0
    ? "text-destructive"
    : len > max
    ? "text-destructive"
    : len > max - 10
    ? "text-amber-600 dark:text-amber-400"
    : "text-emerald-600 dark:text-emerald-400";

const SEOManager = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("Pages");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string>("All");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [robots, setRobots] = useState<string>("");
  const [sitemapInfo, setSitemapInfo] = useState<{ urls: number; status: string } | null>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  }, [drafts]);

  useEffect(() => {
    if (tab !== "Robots & Sitemap") return;
    fetch("/robots.txt")
      .then((r) => r.text())
      .then(setRobots)
      .catch(() => setRobots("Could not load /robots.txt"));
    fetch("/sitemap.xml")
      .then(async (r) => {
        const text = await r.text();
        const urls = (text.match(/<loc>/g) || []).length;
        setSitemapInfo({ urls, status: r.ok ? `${r.status} OK` : `${r.status}` });
      })
      .catch(() => setSitemapInfo({ urls: 0, status: "unreachable" }));
  }, [tab]);

  const merged: PageSEO[] = useMemo(
    () => PAGE_SEO.map((p) => ({ ...p, ...(drafts[p.path] || {}) })),
    [drafts]
  );

  const groups = useMemo(
    () => ["All", ...Array.from(new Set(PAGE_SEO.map((p) => p.group || "Other")))],
    []
  );

  const visible = merged.filter((p) => {
    if (group !== "All" && (p.group || "Other") !== group) return false;
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      p.path.toLowerCase().includes(q) ||
      p.label.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q)
    );
  });

  const indexable = merged.filter((p) => !p.noindex);
  const withIssues = indexable.filter((p) => seoIssues(p).length > 0);
  const dirty = Object.keys(drafts).length;

  const setDraft = (path: string, patch: Draft) =>
    setDrafts((prev) => ({ ...prev, [path]: { ...(prev[path] || {}), ...patch } }));

  const resetDraft = (path: string) =>
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const configSnippet = () => {
    const changed = merged.filter((p) => drafts[p.path]);
    return changed
      .map(
        (p) => `  {
    path: "${p.path}",
    label: "${p.label}",${p.group ? `\n    group: "${p.group}",` : ""}
    title: ${JSON.stringify(p.title)},
    description: ${JSON.stringify(p.description)},${
          p.keywords ? `\n    keywords: ${JSON.stringify(p.keywords)},` : ""
        }${p.noindex ? "\n    noindex: true," : ""}${
          p.sitemap ? `\n    sitemap: true,` : ""
        }${p.priority ? `\n    priority: ${p.priority},` : ""}${
          p.changefreq ? `\n    changefreq: "${p.changefreq}",` : ""
        }
  },`
      )
      .join("\n");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>SEO Control Center | Swish View</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> SEO Control Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Every page title, description and indexing rule in one place. Source of truth:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">src/config/seo.ts</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Search Console
              </Button>
            </a>
            <Link to="/">
              <Button variant="ghost" size="sm">Back to site</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 pt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pages tracked", value: PAGE_SEO.length },
          { label: "Indexable", value: indexable.length },
          { label: "In sitemap", value: merged.filter((p) => p.sitemap && !p.noindex).length },
          { label: "Need attention", value: withIssues.length, warn: withIssues.length > 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`text-2xl font-semibold tabular-nums ${s.warn ? "text-amber-600 dark:text-amber-400" : ""}`}>
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 h-8 text-sm rounded ${
                tab === t ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {tab === "Pages" && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search route, label or title…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 max-w-xs"
              />
              <div className="inline-flex rounded-md border border-border bg-card p-0.5">
                {groups.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroup(g)}
                    className={`px-2.5 h-7 text-xs rounded ${
                      group === g ? "bg-accent" : "text-muted-foreground hover:bg-accent/50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {dirty > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                    {dirty} unsaved edit{dirty === 1 ? "" : "s"}
                  </Badge>
                  <Button size="sm" className="gap-1.5" onClick={() => copy(configSnippet(), "Config")}>
                    <Copy className="h-3.5 w-3.5" /> Copy config
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDrafts({})}>
                    Discard all
                  </Button>
                </div>
              )}
            </div>

            {dirty > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Save className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Edits are drafts in your browser. Hit <strong>Copy config</strong> and paste the block into{" "}
                  <code>src/config/seo.ts</code> (or send it to me and I'll apply it) to make it live for crawlers.
                </span>
              </div>
            )}

            {visible.map((p) => {
              const issues = seoIssues(p);
              const isDraft = !!drafts[p.path];
              return (
                <Card key={p.path} className={isDraft ? "border-primary/50" : ""}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex flex-wrap items-center gap-2">
                      {p.label}
                      <code className="text-xs font-normal text-muted-foreground">{p.path}</code>
                      {p.noindex ? (
                        <Badge variant="outline" className="text-muted-foreground">noindex</Badge>
                      ) : issues.length === 0 ? (
                        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 gap-1">
                          <Check className="h-3 w-3" /> healthy
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 dark:text-amber-400 gap-1">
                          <AlertTriangle className="h-3 w-3" /> {issues.length} issue{issues.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                      <span className="ml-auto flex items-center gap-1">
                        {isDraft && (
                          <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => resetDraft(p.path)}>
                            <RotateCcw className="h-3 w-3" /> Revert
                          </Button>
                        )}
                        <a href={p.path} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 gap-1">
                            <ExternalLink className="h-3 w-3" /> Open
                          </Button>
                        </a>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Title</span>
                            <span className={`tabular-nums ${counterClass(p.title.length, TITLE_MAX)}`}>
                              {p.title.length}/{TITLE_MAX}
                            </span>
                          </div>
                          <Input
                            value={p.title}
                            onChange={(e) => setDraft(p.path, { title: e.target.value })}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Meta description</span>
                            <span className={`tabular-nums ${counterClass(p.description.length, DESCRIPTION_MAX)}`}>
                              {p.description.length}/{DESCRIPTION_MAX}
                            </span>
                          </div>
                          <Textarea
                            value={p.description}
                            onChange={(e) => setDraft(p.path, { description: e.target.value })}
                            rows={3}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Keywords (optional)</div>
                          <Input
                            value={p.keywords || ""}
                            onChange={(e) => setDraft(p.path, { keywords: e.target.value })}
                            className="h-9 text-sm"
                            placeholder="comma, separated, terms"
                          />
                        </div>
                      </div>

                      {/* Google preview */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Google preview</div>
                        <div className="rounded-lg border border-border bg-card p-4">
                          <div className="text-[11px] text-muted-foreground truncate">
                            {SITE_URL.replace("https://", "")}
                            {p.path === "/" ? "" : p.path}
                          </div>
                          <div className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg leading-snug truncate">
                            {p.title || "Untitled page"}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {p.description || "No description set."}
                          </p>
                        </div>
                        {issues.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400">
                            {issues.map((i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {i}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                          {p.sitemap && <Badge variant="secondary">sitemap</Badge>}
                          {p.priority !== undefined && <Badge variant="secondary">priority {p.priority}</Badge>}
                          {p.changefreq && <Badge variant="secondary">{p.changefreq}</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No pages match that search.</p>
            )}
          </>
        )}

        {tab === "Robots & Sitemap" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> robots.txt
                  <a href="/robots.txt" target="_blank" rel="noreferrer" className="ml-auto">
                    <Button size="sm" variant="ghost" className="h-7 gap-1">
                      <ExternalLink className="h-3 w-3" /> Live
                    </Button>
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  Edit at <code>public/robots.txt</code>. Anything under <code>Disallow:</code> is hidden from crawlers.
                </p>
                <pre className="text-[11px] bg-muted rounded p-3 max-h-80 overflow-auto whitespace-pre-wrap">
                  {robots || "Loading…"}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Map className="h-4 w-4 text-primary" /> sitemap.xml
                  <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="ml-auto">
                    <Button size="sm" variant="ghost" className="h-7 gap-1">
                      <ExternalLink className="h-3 w-3" /> Live
                    </Button>
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  Status:{" "}
                  <strong>{sitemapInfo ? sitemapInfo.status : "checking…"}</strong>
                  {sitemapInfo && (
                    <>
                      {" · "}
                      <strong className="tabular-nums">{sitemapInfo.urls}</strong> URLs live
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Static routes come from <code>src/config/seo.ts</code> (any page with{" "}
                  <code>sitemap: true</code>); blog and creator URLs are generated on the fly in{" "}
                  <code>api/sitemap.ts</code>.
                </p>
                <div className="rounded border border-border divide-y divide-border max-h-64 overflow-auto text-xs">
                  {merged
                    .filter((p) => p.sitemap && !p.noindex)
                    .map((p) => (
                      <div key={p.path} className="px-3 py-1.5 flex items-center gap-2">
                        <code className="flex-1 truncate">{p.path}</code>
                        <span className="text-muted-foreground tabular-nums">{p.priority ?? "—"}</span>
                        <span className="text-muted-foreground">{p.changefreq ?? ""}</span>
                      </div>
                    ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    copy(
                      `${SITE_URL}/sitemap.xml`,
                      "Sitemap URL"
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5" /> Copy sitemap URL for Search Console
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "Checklist" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" /> How SEO works on this site
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {[
                {
                  t: "1. Page titles & descriptions",
                  d: "All in src/config/seo.ts. Edit there (or draft here and copy the block). SEOHead reads it automatically for every route.",
                },
                {
                  t: "2. Canonicals & social cards",
                  d: "SEOHead builds canonical, Open Graph and Twitter tags from the same config — no per-page duplication needed.",
                },
                {
                  t: "3. Indexing rules",
                  d: "Set noindex: true in the config for private/app pages, and add a Disallow line in public/robots.txt for anything crawlers should skip entirely.",
                },
                {
                  t: "4. Sitemap",
                  d: "sitemap: true + priority + changefreq in the config drives the static part of /sitemap.xml. Blog/creator URLs are added dynamically.",
                },
                {
                  t: "5. Search Console",
                  d: "Property is verified via public/googleeb739b9bd7520d4d.html. Submit https://www.swishview.com/sitemap.xml and use URL Inspection after publishing new pages.",
                },
                {
                  t: "6. Crawlable rendering",
                  d: "middleware.ts serves prerendered HTML to bots so the React app is fully readable by Google and AI crawlers.",
                },
                {
                  t: "7. Redirects",
                  d: "Legacy short URLs and /creator/* paths 301 to their canonical homes in vercel.json — keep new redirects there so link equity carries over.",
                },
                {
                  t: "8. Blog SEO",
                  d: "Each post carries its own seo_title, seo_description, focus_keyword and canonical_url in the database — editable from Admin → Blogs.",
                },
              ].map((row) => (
                <div key={row.t} className="rounded-lg border border-border p-3">
                  <div className="font-medium">{row.t}</div>
                  <p className="text-muted-foreground text-xs mt-1">{row.d}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SEOManager;
