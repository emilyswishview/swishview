// Shared phone-number extraction used by YouTube channel scraping.
//
// Given arbitrary text (channel description, about-page HTML, video
// descriptions, links) it tries to find a plausible contact phone number.
// Returns "" when nothing convincing is found.

const LABEL_RE =
  /(?:phone|phone\s*no|ph\s*no|ph|mobile|mob|cell|call\s*(?:us|me|now)?|reach\s*(?:us|me)?|whats\s*app|whatsapp|wa\.?me|tel|telephone|contact|hotline|helpline|enquiry|inquiry|support|business\s*(?:no|number|enquiry)?)\b\s*(?:number|no\.?|#|:|-|–|—|is|at|us|me|on)?\s*[^0-9+]{0,12}(\+?\d[\d\s().\-]{6,22}\d)/gi;

const WAME_RE =
  /(?:wa\.me|api\.whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=|chat\.whatsapp\.com\/send\?phone=)\/?(\+?\d{8,15})/gi;

const TEL_RE = /tel:(?:\/\/)?(\+?[\d\-.\s()]{7,20})/gi;

const INTL_RE = /(\+\d{1,4}[\s().\-]?\d[\d\s().\-]{6,18}\d)/g;

// (555) 123-4567 / 555-123-4567 / 555.123.4567
const US_RE = /(?:^|[^\d+])(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})(?!\d)/g;

// Bare digit run with no separators, e.g. "997200021" in a channel title.
const BARE_RE = /(?:^|[^\d+])(\d{8,14})(?!\d)/g;

const IN_RE = /(?:^|[^\d])((?:0|\+?91[\s\-.]?)?[6-9]\d{9})(?!\d)/g;

// Grouped digits with separators, e.g. "98 7654 3210", "0044 20 7946 0958"
const GROUPED_RE = /(?:^|[^\d+])(\d{2,5}[\s.\-]\d{3,5}[\s.\-]\d{3,6})(?!\d)/g;

// Fully spaced-out / obfuscated numbers: "9 8 7 6 5 4 3 2 1 0", "9-8-7-6…"
const SPACED_RE = /(?:^|[^\d])((?:\+\s?)?(?:\d[\s.\-]){7,14}\d)(?!\d)/g;

function digitsOf(s: string) {
  return s.replace(/\D/g, "");
}

// Normalise unicode digits, zero-width chars and common written obfuscations
// ("nine one", "(dot)", "[at]") so the regexes above can see real numbers.
const UNICODE_DIGITS: Record<string, string> = {};
[
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic
  0x0966, // Devanagari
  0x09e6, // Bengali
  0xff10, // Fullwidth
].forEach((base) => {
  for (let i = 0; i < 10; i++) UNICODE_DIGITS[String.fromCodePoint(base + i)] = String(i);
});

export function normalizeText(input: string): string {
  if (!input) return "";
  let s = input.replace(/[\u200b-\u200f\u2060\ufeff]/g, "");
  s = s.replace(/[^\x00-\x7f]/g, (c) => UNICODE_DIGITS[c] ?? c);
  s = s
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/\((?:dot|dash)\)|\[(?:dot|dash)\]/gi, "-")
    .replace(/\bplus\s*(?=\d)/gi, "+");
  return s;
}

function plausible(raw: string): string | null {
  let d = digitsOf(raw);
  if (!d) return null;
  const hasPlus = raw.trim().startsWith("+");
  // Strip a single leading 0 for national formats
  if (d.length > 10 && d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length < 8 || d.length > 15) return null;
  // Reject obvious non-phones: all same digit, sequential runs, years/counters
  if (/^(\d)\1+$/.test(d)) return null;
  if (/^(?:0123456789|1234567890|9876543210|1234567|12345678)/.test(d)) return null;
  // Reject timestamps / dates like 20240115123045
  if (/^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])/.test(d)) return null;
  // Reject unix-ish timestamps (10 digits starting 16/17/18 = 2020s epoch)
  if (d.length === 10 && /^1[5-9]\d{8}$/.test(d)) return null;
  // Reject long runs of repeated digits (0000000, 1111111)
  if (/(\d)\1{6,}/.test(d)) return null;
  return hasPlus ? `+${d}` : d;
}

function run(texts: (string | null | undefined)[], loose: boolean): string {
  const blob = normalizeText(texts.filter(Boolean).join("\n").slice(0, 600_000));
  if (!blob) return "";

  const tryAll = (re: RegExp): string => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(blob)) !== null) {
      const val = plausible(m[1] || "");
      if (val) return val;
    }
    return "";
  };

  // Highest confidence first: explicit WhatsApp / tel: links, then labelled
  // numbers, then any international-format number, then local patterns.
  return (
    tryAll(WAME_RE) ||
    tryAll(TEL_RE) ||
    tryAll(LABEL_RE) ||
    tryAll(INTL_RE) ||
    tryAll(IN_RE) ||
    tryAll(US_RE) ||
    tryAll(GROUPED_RE) ||
    tryAll(SPACED_RE) ||
    (loose ? tryAll(BARE_RE) : "") ||
    ""
  );
}

export function extractPhone(...texts: (string | null | undefined)[]): string {
  return run(texts, false);
}

// Loose mode also accepts a bare digit run (no separators). Only safe on
// short, human-written text like a channel title/description — never on HTML.
export function extractPhoneLoose(...texts: (string | null | undefined)[]): string {
  return run(texts, true);
}

// Pull readable text out of a YouTube about/channel HTML page so the regexes
// above don't trip over script payloads and base64 blobs.
export function textFromYouTubeHtml(html: string): string {
  if (!html) return "";
  const chunks: string[] = [];
  // Description-ish JSON fields YouTube ships in ytInitialData
  const fieldRe =
    /"(?:description|simpleText|content|text|channelDescription|attributedDescription|title)":"((?:[^"\\]|\\.){0,4000})"/g;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(html)) !== null) {
    try {
      chunks.push(JSON.parse(`"${m[1]}"`));
    } catch {
      chunks.push(m[1]);
    }
    if (chunks.length > 2000) break;
  }
  // Meta description as a fallback
  const meta = html.match(/<meta name="description" content="([^"]*)"/);
  if (meta) chunks.push(meta[1]);
  // tel: / wa.me hrefs anywhere in the markup
  const hrefRe = /(tel:[^"'\\<\s]{7,24}|https?:\/\/wa\.me\/[^"'\\<\s]{8,20})/gi;
  while ((m = hrefRe.exec(html)) !== null) chunks.push(m[1]);
  return chunks.join("\n");
}

// Extract external links a channel published (website, linktree, socials).
// YouTube stores them as redirect URLs: /redirect?...&q=<encoded target>
export function externalLinksFromYouTubeHtml(html: string, limit = 8): string[] {
  const out = new Set<string>();
  if (!html) return [];
  const redirectRe = /\/redirect\?[^"'\\ ]*?q=([^"'&\\ ]+)/g;
  let m: RegExpExecArray | null;
  while ((m = redirectRe.exec(html)) !== null) {
    try {
      const u = decodeURIComponent(decodeURIComponent(m[1]));
      if (/^https?:\/\//i.test(u)) out.add(u.split("#")[0]);
    } catch { /* ignore */ }
    if (out.size >= limit * 4) break;
  }
  // Plain URLs inside description text
  const plainRe = /https?:\/\/[^\s"'\\<)]{6,120}/g;
  while ((m = plainRe.exec(html)) !== null) out.add(m[0].split("#")[0]);

  const skip =
    /(youtube\.com|youtu\.be|ytimg\.com|googleusercontent\.com|ggpht\.com|googlevideo\.com|google\.com|gstatic\.com|schema\.org|googleapis|doubleclick|facebook\.com\/tr|w3\.org)/i;
  const social = /(instagram\.com|twitter\.com|x\.com|tiktok\.com|facebook\.com|threads\.net|discord|patreon|t\.me|reddit\.com|spotify|apple\.com)/i;

  const all = Array.from(out).filter((u) => !skip.test(u));
  // Prefer own websites / linktrees over social profiles.
  const preferred = all.filter((u) => !social.test(u));
  const rest = all.filter((u) => social.test(u));
  return [...preferred, ...rest].slice(0, limit);
}

// Strip tags from a generic web page so phone regexes see readable text,
// while keeping tel:/wa.me hrefs.
export function textFromHtml(html: string): string {
  if (!html) return "";
  const links: string[] = [];
  const hrefRe = /(tel:[^"'\\<\s]{7,24}|https?:\/\/wa\.me\/[^"'\\<\s]{8,20})/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) links.push(m[1]);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s{2,}/g, " ");
  return [...links, text].join("\n").slice(0, 300_000);
}
