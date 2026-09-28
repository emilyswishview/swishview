import { supabase } from "@/integrations/supabase/looseClient";
import { ensureChannelReport } from "./channelReport";

export const reportPdfUrl = (slug: string) => `${window.location.origin}/report/${slug}?print=1`;

/** Returns channel link -> printable PDF report URL, generating missing reports. */
export async function buildReportUrls(links: string[], onProgress?: (done: number, total: number) => void) {
  const uniq = Array.from(new Set(links.map(l => (l || "").trim()).filter(Boolean)));
  const map = new Map<string, string>();
  for (let i = 0; i < uniq.length; i += 200) {
    const { data } = await supabase.from("reports").select("slug,channel_url").in("channel_url", uniq.slice(i, i + 200));
    (data || []).forEach((r: any) => map.set(r.channel_url, reportPdfUrl(r.slug)));
  }
  const todo = uniq.filter(l => !map.has(l));
  let done = 0, idx = 0;
  const worker = async () => {
    while (idx < todo.length) {
      const link = todo[idx++];
      try { map.set(link, reportPdfUrl(await ensureChannelReport(link))); } catch { /* leave blank */ }
      onProgress?.(++done, todo.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return map;
}

export const cleanCell = (v: any) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();

export const toTsv = (table: string[][]) => table.map(r => r.map(cleanCell).join("\t")).join("\n");

/** Copies a table as TSV (pastes cleanly into Google Sheets). */
export async function copyTable(table: string[][]) {
  await navigator.clipboard.writeText(toTsv(table));
}

/** Must be called from a click: re-copies and opens a new Google Sheet. */
export function openInSheets(table: string[][]) {
  navigator.clipboard.writeText(toTsv(table)).catch(() => {});
  window.open("https://sheets.new", "_blank", "noopener");
}
