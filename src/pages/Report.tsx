import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/looseClient";
import SEOHead from "@/components/SEOHead";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Printer, ExternalLink } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart as RPieChart, Pie, Cell as RCell, Legend, LineChart, Line,
} from "recharts";

const fmt = (n: number) => {
  if (!n) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toLocaleString();
};
const num = (n: number) => (n || 0).toLocaleString();
const pct = (n: number, d = 1) => `${(n || 0).toFixed(d)}%`;
const yearsBetween = (iso?: string) =>
  iso ? Math.max(0, +((Date.now() - new Date(iso).getTime()) / 31557600000).toFixed(1)) : 0;

const PIE_COLORS = ["#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74"];

/* ---------- Horizontal gauge (Low / Standard / High) ---------- */
const Gauge: React.FC<{
  label: string;
  value: number;
  unit?: string;
  low: number;
  high: number;
  min?: number;
  max?: number;
  band?: "under" | "standard" | "over";
}> = ({ label, value, unit = "", low, high, min, max, band }) => {
  const lo = min ?? 0;
  const hi = max ?? high * 1.6;
  const clamp = (v: number) => Math.max(lo, Math.min(hi, v));
  const p = (v: number) => ((clamp(v) - lo) / (hi - lo)) * 100;
  const b = band ?? (value < low ? "under" : value > high ? "over" : "standard");
  const bandColor =
    b === "standard" ? "text-neutral-900" : b === "over" ? "text-amber-700" : "text-rose-700";
  return (
    <div className="grid grid-cols-[100px,1fr,80px] sm:grid-cols-[140px,1fr,90px] items-center gap-2 sm:gap-3 py-3 text-[10px] sm:text-[11px]">
      <div className="text-gray-700 font-medium truncate">{label}</div>
      <div className="relative h-5 border border-gray-300 bg-white">
        <div className="absolute inset-y-0" style={{ left: 0, width: `${p(low)}%`, background: "#f5f5f4" }} />
        <div className="absolute inset-y-0" style={{ left: `${p(low)}%`, width: `${p(high) - p(low)}%`, background: "#fff7ed" }} />
        <div className="absolute inset-y-0" style={{ left: `${p(high)}%`, right: 0, background: "#f5f5f4" }} />
        <div className="absolute top-0 bottom-0 w-px bg-gray-400" style={{ left: `${p(low)}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-gray-400" style={{ left: `${p(high)}%` }} />
        {/* Range labels: min at left edge, low + high inline below their ticks, max at right edge */}
        <div className="absolute -bottom-4 left-0 text-[9px] text-gray-400 tabular-nums whitespace-nowrap">{fmt(lo)}</div>
        <div className="absolute -bottom-4 right-0 text-[9px] text-gray-400 tabular-nums whitespace-nowrap">{fmt(hi)}</div>
        <div className="absolute -top-3.5 text-[9px] text-gray-500 tabular-nums whitespace-nowrap" style={{ left: `${p(low)}%`, transform: "translateX(-50%)" }}>{fmt(low)}</div>
        <div className="absolute -top-3.5 text-[9px] text-gray-500 tabular-nums whitespace-nowrap" style={{ left: `${p(high)}%`, transform: "translateX(-50%)" }}>{fmt(high)}</div>
        <div className="absolute -top-1 -bottom-1 w-0.5 bg-neutral-900" style={{ left: `${p(value)}%` }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-neutral-900" />
        </div>
      </div>
      <div className={`text-right font-bold tabular-nums ${bandColor} text-[11px] sm:text-xs`}>
        {fmt(value)}<span className="text-gray-500 font-normal">{unit}</span>
      </div>
    </div>
  );
};

const Cell: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({ label, value, sub }) => (
  <div className="border border-gray-300 p-2 min-w-0">
    <div className="text-[9px] uppercase tracking-wider text-gray-500 truncate">{label}</div>
    <div className="text-sm font-bold text-neutral-900 tabular-nums truncate">{value}</div>
    {sub && <div className="text-[10px] text-gray-500 truncate">{sub}</div>}
  </div>
);

const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-l-2 border-orange-500 bg-neutral-50 text-neutral-800 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 mb-2">
    {children}
  </div>
);

export default function Report() {
  const { slug } = useParams();
  const [r, setR] = useState<any>(null);
  const [yt, setYt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("reports").select("*").eq("slug", slug).maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setR(data);
      try {
        const { data: fresh } = await supabase.functions.invoke("youtube-channel-info", {
          body: { channelUrl: data.channel_url, includeVideos: true, maxVideos: 50 },
        });
        if (fresh && !fresh.error) setYt(fresh);
      } catch {}
      setLoading(false);
    })();
  }, [slug]);

  const d = useMemo(() => {
    if (!r) return null;
    const videos: any[] = yt?.recentVideos || [];
    const publishedAt = yt?.publishedAt || r.published_at;
    const views = videos.map((v) => v.viewCount || 0);
    const likes = videos.map((v) => v.likeCount || 0);
    const comments = videos.map((v) => v.commentCount || 0);
    const totalVideoViews = views.reduce((a, b) => a + b, 0);
    const avgViews = views.length ? Math.round(totalVideoViews / views.length) : 0;
    const medianViews = views.length ? [...views].sort((a, b) => a - b)[Math.floor(views.length / 2)] : 0;
    const maxV = Math.max(0, ...views);
    const minV = views.length ? Math.min(...views) : 0;
    const avgLikes = likes.length ? Math.round(likes.reduce((a, b) => a + b, 0) / likes.length) : 0;
    const avgComments = comments.length ? Math.round(comments.reduce((a, b) => a + b, 0) / comments.length) : 0;
    const engagementRate = avgViews > 0 ? +(((avgLikes + avgComments) / avgViews) * 100).toFixed(2) : 0;
    const likeRatio = avgViews > 0 ? +((avgLikes / avgViews) * 100).toFixed(2) : 0;
    const commentRatio = avgViews > 0 ? +((avgComments / avgViews) * 100).toFixed(2) : 0;
    const age = yearsBetween(publishedAt);
    const viewsPerSub = r.subscribers ? +(r.total_views / r.subscribers).toFixed(2) : 0;
    const viewsPerVideo = r.video_count ? Math.round(r.total_views / r.video_count) : 0;
    const uploadsPerYear = age > 0 ? +(r.video_count / age).toFixed(1) : r.video_count || 0;
    const subsPerYear = age > 0 ? Math.round(r.subscribers / age) : r.subscribers || 0;
    const topVideos = videos.slice().sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

    // Cadence — fill last 12 months so gaps show as zero bars
    const byMonth: Record<string, { views: number; count: number }> = {};
    videos.forEach((v) => {
      if (!v.publishedAt) return;
      const dt = new Date(v.publishedAt);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      byMonth[k] = byMonth[k] || { views: 0, count: 0 };
      byMonth[k].views += v.viewCount || 0;
      byMonth[k].count += 1;
    });
    const cadence: { month: string; label: string; uploads: number; views: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const b = byMonth[key] || { views: 0, count: 0 };
      cadence.push({
        month: key,
        label: dt.toLocaleDateString("en-US", { month: "short" }) + (dt.getMonth() === 0 ? ` '${String(dt.getFullYear()).slice(2)}` : ""),
        uploads: b.count,
        views: b.views,
      });
    }

    const buckets = [
      { label: "0–1K", lo: 0, hi: 1_000 },
      { label: "1K–10K", lo: 1_000, hi: 10_000 },
      { label: "10K–100K", lo: 10_000, hi: 100_000 },
      { label: "100K–1M", lo: 100_000, hi: 1_000_000 },
      { label: "1M+", lo: 1_000_000, hi: Infinity },
    ].map((b) => ({ ...b, count: views.filter((v) => v >= b.lo && v < b.hi).length }));
    const outperformers = views.filter((v) => v > avgViews * 1.5).length;
    const underperformers = views.filter((v) => v < avgViews * 0.5).length;
    return {
      videos, publishedAt, avgViews, medianViews, maxV, minV, avgLikes, avgComments,
      engagementRate, likeRatio, commentRatio, age, viewsPerSub, viewsPerVideo,
      uploadsPerYear, subsPerYear, topVideos, cadence,
      buckets, outperformers, underperformers,
    };
  }, [r, yt]);

  if (loading) return <LoadingSpinner />;
  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="text-2xl font-bold mb-2 text-neutral-900">Report not found</div>
      <Link to="/" className="text-orange-600 underline">Go home</Link>
    </div>
  );

  const generated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const channelName = r.channel_name;
  const rid = `SV-${String(r.id || "").slice(0, 8).toUpperCase()}`;
  const overallScore = Math.round(
    Math.min(100, (Math.log10((r.subscribers || 1) + 1) * 10) * 0.4 +
    Math.min(100, d!.engagementRate * 15) * 0.3 +
    Math.min(100, (d!.viewsPerSub || 0) * 4) * 0.3)
  );

  const recommendations: string[] = Array.isArray(r.recommendations)
    ? r.recommendations.filter((x: any) => typeof x === "string" && x.trim())
    : [];

  // admin_notes is stored as JSON { notes, seoFeedback } (with plain-string fallback)
  const parsedNotes = (() => {
    const raw = r.admin_notes;
    if (!raw) return { notes: "", seoFeedback: "" };
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        if (p && typeof p === "object" && ("notes" in p || "seoFeedback" in p)) {
          return { notes: p.notes || "", seoFeedback: p.seoFeedback || "" };
        }
      } catch {}
      return { notes: raw, seoFeedback: "" };
    }
    return { notes: (raw as any)?.notes || "", seoFeedback: (raw as any)?.seoFeedback || "" };
  })();
  const analystNotes = parsedNotes.notes;
  const seoFeedback = parsedNotes.seoFeedback;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 print:bg-white">
      <SEOHead title={`${channelName} — Channel Analysis Report`} description={`Detailed analytical growth report for ${channelName}.`} />

      <div className="bg-neutral-900 text-white print:hidden">
        <div className="max-w-[900px] mx-auto px-4 py-2 flex items-center justify-between text-xs">
          <Link to="/" className="flex items-center">
            <img src="/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png" alt="SwishView" className="h-12 w-auto object-contain "  />
          </Link>
          <div className="flex items-center gap-3">
            <a href={r.channel_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-orange-300">
              <ExternalLink className="w-3 h-3" /> Channel
            </a>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1 hover:text-orange-300">
              <Printer className="w-3 h-3" /> Print
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto bg-white shadow-sm my-2 sm:my-4 print:my-0 print:shadow-none border border-gray-300 print:border-0">
        {/* Header */}
        <div className="border-b border-gray-300 px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                {/* <img src="/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png" alt="SwishView" className="h-4 w-auto object-contain" /> */}
                <span>Swishview Analytics</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight mt-0.5 break-words">YouTube Channel Analysis Report</h1>
              <div className="text-[11px] text-gray-600 mt-1">Comprehensive performance, engagement & growth diagnostic.</div>
            </div>
            {r.channel_thumbnail && (
              <img src={r.channel_thumbnail} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-gray-300 object-cover shrink-0" />
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-4 text-[11px]">
            <div className="truncate"><span className="text-gray-500">Channel:</span> <span className="font-semibold">{channelName}</span></div>
            <div className="truncate"><span className="text-gray-500">Handle:</span> <span className="font-semibold">{r.channel_handle || "—"}</span></div>
            <div className="truncate"><span className="text-gray-500">Report ID:</span> <span className="font-semibold tabular-nums">{rid}</span></div>
            <div className="truncate"><span className="text-gray-500">Generated:</span> <span className="font-semibold">{generated}</span></div>
            <div className="truncate"><span className="text-gray-500">Channel Age:</span> <span className="font-semibold">{d!.age} yrs</span></div>
            <div className="truncate"><span className="text-gray-500">Country:</span> <span className="font-semibold">{yt?.country || "—"}</span></div>
            <div className="col-span-2 truncate"><span className="text-gray-500">URL:</span> <a href={r.channel_url} target="_blank" rel="noreferrer" className="text-orange-600 underline break-all">{r.channel_url}</a></div>
          </div>
        </div>

        {/* Body — responsive grid */}
        <div className="px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* 1. Snapshot */}
          <div className="md:col-span-2">
            <H>1. Channel Snapshot</H>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <Cell label="Subscribers" value={fmt(r.subscribers)} sub={num(r.subscribers)} />
              <Cell label="Total Views" value={fmt(r.total_views)} sub={num(r.total_views)} />
              <Cell label="Videos" value={num(r.video_count)} />
              <Cell label="Views / Sub" value={d!.viewsPerSub} />
              <Cell label="Views / Video" value={fmt(d!.viewsPerVideo)} />
              <Cell label="Uploads / Yr" value={d!.uploadsPerYear} />
            </div>
          </div>

          {/* 2. Overall */}
          <div className="md:col-span-2">
            <H>2. Overall Performance Index</H>
            <div className="border border-gray-300 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-[110px,1fr,140px] items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-4xl font-black tabular-nums text-neutral-900">{overallScore}</div>
                  <div className="text-[10px] uppercase tracking-widest text-gray-500">/ 100</div>
                </div>
                <div className="relative h-8 border border-gray-300">
                  <div className="absolute inset-y-0 left-0 w-1/3 bg-rose-50 border-r border-gray-300" />
                  <div className="absolute inset-y-0 left-1/3 w-1/3 bg-amber-50 border-r border-gray-300" />
                  <div className="absolute inset-y-0 right-0 w-1/3 bg-orange-50" />
                  <div className="absolute inset-0 flex text-[10px] uppercase tracking-wider text-gray-600">
                    <div className="flex-1 flex items-center justify-center">Emerging</div>
                    <div className="flex-1 flex items-center justify-center">Growing</div>
                    <div className="flex-1 flex items-center justify-center">Established</div>
                  </div>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-neutral-900" style={{ left: `${overallScore}%` }}>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-neutral-900" />
                  </div>
                </div>
                <div className="text-[11px]">
                  <div className="font-bold">{overallScore >= 66 ? "Established" : overallScore >= 33 ? "Growing" : "Emerging"}</div>
                  <div className="text-gray-500">Weighted from reach, engagement & retention proxies.</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Growth */}
          <div>
            <H>3. Growth Analysis</H>
            <div className="border border-gray-300 px-3 pt-2 pb-4">
              <Gauge label="Subs / Year" value={d!.subsPerYear} low={1000} high={100000} min={0} max={500000} />
              <Gauge label="Views / Sub" value={d!.viewsPerSub} low={5} high={80} min={0} max={200} />
              <Gauge label="Uploads / Year" value={d!.uploadsPerYear} low={12} high={104} min={0} max={200} />
              <Gauge label="Views / Video" value={d!.viewsPerVideo} low={1000} high={50000} min={0} max={200000} />
            </div>
          </div>

          {/* 4. Engagement */}
          <div>
            <H>4. Engagement Diagnostic</H>
            <div className="border border-gray-300 px-3 pt-2 pb-4">
              <Gauge label="Engagement Rate" value={d!.engagementRate} unit="%" low={2} high={6} min={0} max={12} />
              <Gauge label="Like Ratio" value={d!.likeRatio} unit="%" low={1.5} high={5} min={0} max={10} />
              <Gauge label="Comment Ratio" value={d!.commentRatio} unit="%" low={0.1} high={0.8} min={0} max={2} />
              <Gauge label="Avg Views" value={d!.avgViews} low={5000} high={100000} min={0} max={500000} />
            </div>
          </div>

          {/* 5. Recent stats */}
          <div className="md:col-span-2">
            <H>5. Recent Performance (last {d!.videos.length} videos)</H>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              <Cell label="Avg Views" value={fmt(d!.avgViews)} />
              <Cell label="Median Views" value={fmt(d!.medianViews)} />
              <Cell label="Max Views" value={fmt(d!.maxV)} />
              <Cell label="Min Views" value={fmt(d!.minV)} />
              <Cell label="Avg Likes" value={fmt(d!.avgLikes)} />
              <Cell label="Avg Comments" value={fmt(d!.avgComments)} />
              <Cell label="Outperformers" value={d!.outperformers} sub="> 1.5× avg" />
              <Cell label="Underperformers" value={d!.underperformers} sub="< 0.5× avg" />
              <Cell label="Engagement" value={pct(d!.engagementRate, 2)} />
              <Cell label="Like / View" value={pct(d!.likeRatio, 2)} />
              <Cell label="Comment / View" value={pct(d!.commentRatio, 2)} />
              <Cell label="Consistency" value={d!.avgViews ? pct((1 - Math.min(1, (d!.maxV - d!.minV) / (d!.avgViews * 6))) * 100, 0) : "—"} />
            </div>
          </div>

          {/* 6. View distribution (pie chart) */}
          <div>
            <H>6. View Distribution</H>
            <div className="border border-gray-300 p-3">
              <div className="w-full h-56">
                <ResponsiveContainer>
                  <RPieChart>
                    <Pie
                      data={d!.buckets.map((b) => ({ name: b.label, value: b.count }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      label={({ name, value }) => value ? `${name}: ${value}` : ""}
                      labelLine={false}
                    >
                      {d!.buckets.map((_, i) => (
                        <RCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 10 }} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 7. Upload Cadence (bar chart) */}
          <div>
            <H>7. Upload Cadence (last 12 months)</H>
            <div className="border border-gray-300 p-3">
              <div className="w-full h-56">
                <ResponsiveContainer>
                  <BarChart data={d!.cadence} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v: any, k: string) => k === "views" ? [fmt(v as number), "Views"] : [v, "Uploads"]}
                      contentStyle={{ fontSize: 11 }}
                    />
                    <Bar dataKey="uploads" fill="#ea580c" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Monthly upload count · empty bars indicate no uploads that month.</div>
            </div>
          </div>

          {/* 7b. Views trend across recent uploads */}
          <div className="md:col-span-2">
            <H>8. Views Trend Across Recent Uploads</H>
            <div className="border border-gray-300 p-3">
              <div className="w-full h-56">
                <ResponsiveContainer>
                  <LineChart
                    data={d!.videos
                      .slice()
                      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
                      .map((v, i) => ({ idx: i + 1, views: v.viewCount || 0, title: v.title }))}
                    margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10 }} label={{ value: "Video # (oldest → newest)", position: "insideBottom", fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [fmt(v as number), "Views"]} labelFormatter={(l) => `Video #${l}`} contentStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="views" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top 10 videos — table on md+, cards on mobile */}
          <div className="md:col-span-2">
            <H>9. Top 10 Videos by Views</H>
            <div className="hidden md:block">
              <table className="w-full text-[11px] border border-gray-300">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="text-left px-2 py-1 w-6">#</th>
                    <th className="text-left px-2 py-1">Title</th>
                    <th className="text-right px-2 py-1">Views</th>
                    <th className="text-right px-2 py-1">Likes</th>
                    <th className="text-right px-2 py-1">Comments</th>
                    <th className="text-right px-2 py-1">Eng %</th>
                    <th className="text-right px-2 py-1">vs Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {d!.topVideos.slice(0, 10).map((v: any, i: number) => {
                    const eng = v.viewCount ? (((v.likeCount || 0) + (v.commentCount || 0)) / v.viewCount) * 100 : 0;
                    const rel = d!.avgViews ? (v.viewCount || 0) / d!.avgViews : 0;
                    return (
                      <tr key={v.videoId} className="border-t border-gray-200">
                        <td className="px-2 py-1 tabular-nums text-gray-500">{i + 1}</td>
                        <td className="px-2 py-1 truncate max-w-[280px]">
                          <a href={v.url} target="_blank" rel="noreferrer" className="hover:text-orange-600 hover:underline">{v.title}</a>
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums font-medium">{num(v.viewCount || 0)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{num(v.likeCount || 0)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{num(v.commentCount || 0)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{eng.toFixed(2)}</td>
                        <td className={`px-2 py-1 text-right tabular-nums font-semibold ${rel >= 1 ? "text-orange-600" : "text-rose-700"}`}>
                          {rel >= 1 ? "+" : ""}{((rel - 1) * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                  {d!.topVideos.length === 0 && (
                    <tr><td colSpan={7} className="px-2 py-3 text-center text-gray-500">No recent video data available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2">
              {d!.topVideos.slice(0, 10).map((v: any, i: number) => {
                const eng = v.viewCount ? (((v.likeCount || 0) + (v.commentCount || 0)) / v.viewCount) * 100 : 0;
                const rel = d!.avgViews ? (v.viewCount || 0) / d!.avgViews : 0;
                return (
                  <div key={v.videoId} className="border border-gray-300 p-2 text-[11px]">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 tabular-nums shrink-0">{i + 1}.</span>
                      <a href={v.url} target="_blank" rel="noreferrer" className="font-medium hover:text-orange-600 hover:underline line-clamp-2">{v.title}</a>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] text-gray-600">
                      <div><div className="text-gray-400 uppercase text-[9px]">Views</div><div className="font-semibold text-neutral-900">{fmt(v.viewCount || 0)}</div></div>
                      <div><div className="text-gray-400 uppercase text-[9px]">Likes</div><div className="font-semibold text-neutral-900">{fmt(v.likeCount || 0)}</div></div>
                      <div><div className="text-gray-400 uppercase text-[9px]">Comments</div><div className="font-semibold text-neutral-900">{fmt(v.commentCount || 0)}</div></div>
                      <div><div className="text-gray-400 uppercase text-[9px]">vs Avg</div><div className={`font-semibold ${rel >= 1 ? "text-orange-600" : "text-rose-700"}`}>{rel >= 1 ? "+" : ""}{((rel - 1) * 100).toFixed(0)}%</div></div>
                    </div>
                  </div>
                );
              })}
              {d!.topVideos.length === 0 && (
                <div className="text-center text-gray-500 py-3 text-[11px]">No recent video data available.</div>
              )}
            </div>
          </div>

          {/* Diagnostic notes */}
          <div className="md:col-span-2">
            <H>10. Diagnostic Notes</H>
            <div className="border border-gray-300 p-3 text-[11px] leading-relaxed space-y-2">
              <p><span className="font-bold">Reach:</span> The channel currently generates <span className="font-semibold tabular-nums">{d!.viewsPerSub}</span> lifetime views per subscriber. A value above 30 typically indicates strong non-subscriber discovery, while a value below 10 suggests the channel is largely serving its existing base.</p>
              <p><span className="font-bold">Engagement:</span> Recent engagement rate is <span className="font-semibold tabular-nums">{pct(d!.engagementRate, 2)}</span>. The healthy band for a channel of this size sits between 2%–6%. {d!.engagementRate < 2 ? "Elevate CTA density and pinned comments to lift interaction." : d!.engagementRate > 6 ? "Interaction is above healthy band — audience is highly invested." : "Interaction is within a healthy band."}</p>
              <p><span className="font-bold">Consistency:</span> Upload cadence averages <span className="font-semibold tabular-nums">{d!.uploadsPerYear}</span> videos/year. Cadence between 24–104/yr correlates with the strongest algorithmic surfacing. {d!.uploadsPerYear < 12 ? "Increasing frequency is the single highest-leverage change." : ""}</p>
              <p><span className="font-bold">Distribution:</span> {d!.outperformers} of {d!.videos.length} recent videos exceed 150% of average — these are the templates worth cloning. {d!.underperformers} sit under 50% of average and should be studied for negative signals (title, thumbnail, topic drift).</p>
            </div>
          </div>

          {/* 11. Analyst notes / recommendations */}
          {(analystNotes || recommendations.length > 0) && (
            <div className="md:col-span-2">
              <H>11. Analyst Recommendations</H>
              <div className="border border-gray-300 p-3 text-[11px] leading-relaxed space-y-3">
                {analystNotes && (
                  <p className="whitespace-pre-wrap text-gray-800">{analystNotes}</p>
                )}
                {recommendations.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-gray-800">
                    {recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 12. SEO Feedback — always shown, defaults to NA */}
          <div className="md:col-span-2">
            <H>12. SEO Feedback</H>
            <div className="border border-gray-300 p-3 text-[11px] leading-relaxed">
              {seoFeedback ? (
                <p className="whitespace-pre-wrap text-gray-800">{seoFeedback}</p>
              ) : (
                <p className="text-gray-400 italic">NA</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-gray-500 mb-20 sm:mb-0 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-1.5">
            <img src="/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png" alt="SwishView" className="h-10 w-auto object-contain" />
            <span>Analytics · Report {rid}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://swishview.com" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline font-semibold">Visit Swishview.com</a>
            <a href="https://calendly.com/swishview-support/30min" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-semibold">Talk to our expert →</a>
            <span className="hidden sm:inline">Generated {generated}</span>
          </div>
        </div>
      </div>

      <style>{`@media print { .print\\:hidden{display:none} body{background:white} .recharts-wrapper{page-break-inside:avoid} }`}</style>
    </div>
  );
}
