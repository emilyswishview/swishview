// Quota-free contact extraction for a YouTube channel.
// Reuses the regex layer in _shared/phone.ts; never touches the Data API.

import {
  extractPhone,
  extractPhoneLoose,
  textFromYouTubeHtml,
  externalLinksFromYouTubeHtml,
  textFromHtml,
} from "./phone.ts";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function getText(url: string, timeoutMs = 9000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+cb; SOCS=CAI" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!r.ok) return "";
    const ct = r.headers.get("content-type") || "";
    if (ct && !/text|html|json|xml/i.test(ct)) return "";
    return await r.text();
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
async function innertubeAbout(channelId: string): Promise<string> {
  try {
    const r = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}&prettyPrint=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20240401.00.00", hl: "en", gl: "US" } },
        browseId: channelId,
        params: "EgVhYm91dPIGBAoCEgA%3D",
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  }
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export type ContactHit = {
  type: "phone" | "email" | "website";
  value: string;
  sourceUrl: string;
  sourceType: "about" | "rss" | "video" | "website" | "link";
  context: string;
};

export type ContactResult = {
  contacts: ContactHit[];
  links: string[];
  aboutText: string;
};

function pickEmails(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(EMAIL_RE)) {
    const v = m[0].toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(v)) continue;
    if (/(example|sentry|noreply|no-reply|googlemail\.com\.)/.test(v)) continue;
    out.add(v);
    if (out.size >= 3) break;
  }
  return Array.from(out);
}

/** Full contact sweep: About panel → channel HTML → RSS/videos → external sites. */
export async function extractChannelContacts(
  channelId: string,
  customUrl = "",
  opts: { deep?: boolean } = {},
): Promise<ContactResult> {
  const contacts: ContactHit[] = [];
  const links = new Set<string>();
  let aboutText = "";
  const push = (hit: ContactHit) => {
    if (!contacts.some((c) => c.type === hit.type && c.value === hit.value)) contacts.push(hit);
  };

  // 1) InnerTube About panel
  const it = await innertubeAbout(channelId);
  if (it) {
    externalLinksFromYouTubeHtml(it).forEach((l) => links.add(l));
    aboutText = textFromYouTubeHtml(it);
    const phone = extractPhone(aboutText);
    if (phone) push({ type: "phone", value: phone, sourceUrl: `https://www.youtube.com/channel/${channelId}/about`, sourceType: "about", context: aboutText.slice(0, 400) });
    pickEmails(aboutText).forEach((e) =>
      push({ type: "email", value: e, sourceUrl: `https://www.youtube.com/channel/${channelId}/about`, sourceType: "about", context: "" }));
  }

  // 2) Channel HTML pages
  if (!contacts.some((c) => c.type === "phone")) {
    const handle = (customUrl || "").replace(/^\/?@?/, "");
    const urls = [
      `https://www.youtube.com/channel/${channelId}/about?hl=en&persist_hl=1`,
      handle ? `https://www.youtube.com/@${handle}/about?hl=en&persist_hl=1` : "",
      `https://www.youtube.com/channel/${channelId}?hl=en`,
    ].filter(Boolean);
    for (const u of urls) {
      const html = await getText(u);
      if (!html) continue;
      externalLinksFromYouTubeHtml(html).forEach((l) => links.add(l));
      const text = textFromYouTubeHtml(html);
      if (!aboutText) aboutText = text;
      pickEmails(text).forEach((e) => push({ type: "email", value: e, sourceUrl: u, sourceType: "about", context: "" }));
      const phone = extractPhone(text);
      if (phone) { push({ type: "phone", value: phone, sourceUrl: u, sourceType: "about", context: text.slice(0, 400) }); break; }
    }
  }

  // 3) RSS feed / recent video descriptions
  if (!contacts.some((c) => c.type === "phone")) {
    const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (xml) {
      const descs = Array.from(xml.matchAll(/<media:description>([\s\S]*?)<\/media:description>/g)).map((m) => m[1]).join("\n");
      const phone = extractPhone(descs);
      if (phone) push({ type: "phone", value: phone, sourceUrl: `rss:${channelId}`, sourceType: "rss", context: descs.slice(0, 400) });
      pickEmails(descs).forEach((e) => push({ type: "email", value: e, sourceUrl: `rss:${channelId}`, sourceType: "rss", context: "" }));
      if (!phone && opts.deep) {
        const ids = Array.from(xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)).map((m) => m[1]).slice(0, 4);
        for (const id of ids) {
          const html = await getText(`https://www.youtube.com/watch?v=${id}&hl=en`);
          if (!html) continue;
          const text = textFromYouTubeHtml(html);
          const p = extractPhone(text);
          if (p) { push({ type: "phone", value: p, sourceUrl: `https://www.youtube.com/watch?v=${id}`, sourceType: "video", context: text.slice(0, 400) }); break; }
        }
      }
    }
  }

  // 4) Creator's own website / contact pages
  const linkList = Array.from(links);
  linkList.slice(0, 4).forEach((l) => push({ type: "website", value: l, sourceUrl: l, sourceType: "link", context: "" }));
  if (!contacts.some((c) => c.type === "phone") && linkList.length) {
    const candidates: string[] = [];
    for (const l of linkList.slice(0, 4)) {
      candidates.push(l);
      try {
        const u = new URL(l);
        if (u.pathname === "/" || u.pathname === "") {
          candidates.push(`${u.origin}/contact`, `${u.origin}/contact-us`, `${u.origin}/about`);
        }
      } catch { /* ignore */ }
    }
    const seen = new Set<string>();
    for (const c of candidates.slice(0, opts.deep ? 12 : 6)) {
      if (seen.has(c)) continue;
      seen.add(c);
      const html = await getText(c, 8000);
      if (!html) continue;
      const text = textFromHtml(html);
      pickEmails(text).forEach((e) => push({ type: "email", value: e, sourceUrl: c, sourceType: "website", context: "" }));
      const phone = extractPhone(text);
      if (phone) { push({ type: "phone", value: phone, sourceUrl: c, sourceType: "website", context: text.slice(0, 400) }); break; }
    }
  }

  // 5) last resort: loose scan of the About text (bare digit runs)
  if (!contacts.some((c) => c.type === "phone") && aboutText) {
    const loose = extractPhoneLoose(aboutText);
    if (loose) push({ type: "phone", value: loose, sourceUrl: `https://www.youtube.com/channel/${channelId}/about`, sourceType: "about", context: aboutText.slice(0, 400) });
  }

  return { contacts, links: linkList, aboutText };
}
