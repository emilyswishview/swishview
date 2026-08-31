import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoData {
  title?: string;
  url?: string;
  description?: string;
}

interface DraftRequest {
  systemPromptOverride?: string;
  channelName?: string;
  channelLink?: string;
  channelDescription?: string;
  country?: string;
  channelJoined?: string;
  email?: string;
  subscribers?: string | number;
  totalViews?: string | number;
  videos?: VideoData[];
  clientName?: string;
  senderName?: string; // display name to sign the email with
  extraInstructions?: string; // free-form user instructions to steer the draft
}


const buildSystemPrompt = (senderName: string) => `You are ${senderName} from SwishView writing a short, personal YouTube outreach email — like a real 1:1 note, not marketing.

Rules:
- Subject: 3-7 words, lowercase/sentence case. No emojis, symbols, ALL CAPS, "!", or spam words (free, guarantee, boost, offer, earn, discount, click, cash, $$$).
- Body: 80-130 words, 2-3 short paragraphs. No links/URLs, no emojis, no markdown/HTML/bullets/bold, no buzzwords (scale, 10x, skyrocket, ROI, leverage, brand deals). Use contractions, vary sentence length, sound human.
- Each paragraph is one continuous line; single blank line between paragraphs. No mid-paragraph line breaks except the sign-off.

Body structure (unlabelled): observational opener using available channel/video context without inventing missing details → genuine compliment → one soft, curious thought about their channel → soft ask for a reply. If no recent video title is provided, do not mention a latest/recent video specifically. End exactly:
Best,
${senderName}
SwishView

Output EXACTLY this plain text, nothing else (no JSON, no fences, no commentary):
SUBJECT: <subject>
---BODY---
<email body starting "Hi <FirstName>," or "Hey there,">
---END---`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const data: DraftRequest = await req.json();
    const senderName = (data.senderName || "Emily").trim() || "Emily";
    const overrideRaw = (data.systemPromptOverride || "").trim();
    const usingOverride = overrideRaw.length > 0;
    const SYSTEM_PROMPT = usingOverride
      ? `${overrideRaw}\n\nReturn EXACTLY:\nSUBJECT: <subject>\n---BODY---\n<email signed with "${senderName}">\n---END---\nNo JSON, no fences.`
      : buildSystemPrompt(senderName);

    const videos = (data.videos || []).slice(0, 2);
    const trunc = (s: string | undefined, n: number) =>
      (s || "").replace(/\s+/g, " ").trim().slice(0, n);

    // Compact user prompt: skip empty fields, truncate long text.
    const lines: string[] = [];
    const push = (k: string, v: string | number | undefined | null) => {
      const s = typeof v === "number" ? String(v) : (v || "").toString().trim();
      if (s) lines.push(`${k}: ${s}`);
    };
    push("Channel", data.channelName);
    push("Greeting name", data.clientName || data.channelName || "there");
    push("Desc", trunc(data.channelDescription, 200));
    push("Country", data.country);
    push("Subs", data.subscribers as any);
    push("Views", data.totalViews as any);
    videos.forEach((v, i) => {
      if (v?.title) lines.push(`Video ${i + 1}: ${trunc(v.title, 90)}`);
      if (v?.description) lines.push(`  notes: ${trunc(v.description, 140)}`);
    });
    if (data.extraInstructions) lines.push(`\nExtra: ${trunc(data.extraInstructions, 280)}`);

    const userPrompt = `${lines.join("\n")}\n\nWrite the email. Return only SUBJECT/---BODY---/---END---.`;


    // Fast Claude path + minimal max_tokens. A 90-160 word
    // email + subject fits comfortably in ~350 output tokens.
    const callClaude = (model: string) => fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 380,
        temperature: 0.8,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const attempts = [
      "claude-haiku-4-5",
      "claude-sonnet-4-6",
    ];
    let res: Response | null = null;
    let lastErr = "";
    for (let i = 0; i < attempts.length; i++) {
      try {
        const r = await callClaude(attempts[i]);
        if (r.ok) { res = r; break; }
        const rawErr = await r.text();
        let detail = rawErr;
        try {
          const j = JSON.parse(rawErr);
          detail = j?.error?.message || j?.message || rawErr;
        } catch {}
        if (r.status === 429 || r.status >= 500) {
          lastErr = `Anthropic ${r.status}: ${detail}`;
          await new Promise(rs => setTimeout(rs, 1500 + i * 2500));
          continue;
        }
        if (r.status === 404 || /model/i.test(detail)) {
          lastErr = `Anthropic ${r.status}: ${detail}`;
          await new Promise(rs => setTimeout(rs, 500 + i * 1000));
          continue;
        }
        res = new Response(rawErr, { status: r.status, headers: r.headers });
        break;
      } catch (e: any) {
        lastErr = e?.message || String(e);
        await new Promise(rs => setTimeout(rs, 1500 + i * 2500));
      }
    }
    if (!res) {
      return new Response(JSON.stringify({ error: `Anthropic API unreachable: ${lastErr}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (res.status === 401 || res.status === 403) {
      return new Response(JSON.stringify({ error: "Anthropic API key invalid or unauthorized." }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("Anthropic error", res.status, t);
      let detail = t;
      try {
        const j = JSON.parse(t);
        detail = j?.error?.message || j?.message || t;
      } catch {}
      return new Response(JSON.stringify({ error: `Anthropic ${res.status}: ${detail}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const json = await res.json();
    const raw: string = (Array.isArray(json.content)
      ? json.content.map((c: any) => c?.text || "").join("")
      : "") || "";
    // Parse the plain-text SUBJECT / ---BODY--- / ---END--- format.
    // Far more robust than JSON because the body often contains quotes,
    // newlines, apostrophes etc. that break JSON.parse and cause raw model
    // output to leak into the actual email.
    let parsed: { subject: string; body: string; analysis: any } = {
      subject: "",
      body: "",
      analysis: {},
    };
    try {
      let cleaned = raw.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();

      // Legacy JSON path (in case the model still returns JSON).
      if (cleaned.startsWith("{")) {
        try {
          const s = cleaned.indexOf("{");
          const e = cleaned.lastIndexOf("}");
          const j = JSON.parse(cleaned.slice(s, e + 1));
          if (j && typeof j === "object" && (j.subject || j.body)) {
            parsed.subject = String(j.subject || "").trim();
            parsed.body = String(j.body || "")
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, "\\");
            parsed.analysis = j.analysis || {};
          }
        } catch { /* fall through */ }
      }

      // Preferred plain-text marker format.
      if (!parsed.body) {
        const subjMatch = cleaned.match(/^\s*SUBJECT\s*:\s*(.+?)\s*$/im);
        const bodyMatch = cleaned.match(/---BODY---\s*([\s\S]*?)\s*(?:---END---|$)/i);
        if (subjMatch) parsed.subject = subjMatch[1].trim();
        if (bodyMatch) parsed.body = bodyMatch[1].trim();
      }

      // Last-resort split.
      if (!parsed.body) {
        const idx = cleaned.indexOf("\n\n");
        if (idx > 0) {
          parsed.subject = cleaned.slice(0, idx).replace(/^subject\s*:\s*/i, "").trim();
          parsed.body = cleaned.slice(idx + 2).trim();
        } else {
          parsed.subject = "quick thought on your channel";
          parsed.body = cleaned;
        }
      }
    } catch {
      parsed = { subject: "quick thought on your channel", body: raw, analysis: {} };
    }

    // Safety net: scrub any JSON / fence / marker leakage out of the body.
    if (/^\s*[`{\[]/.test(parsed.body) || /"subject"\s*:/.test(parsed.body) || /---BODY---/.test(parsed.body) || /```/.test(parsed.body)) {
      parsed.body = parsed.body
        .replace(/```[a-z]*\n?/gi, "")
        .replace(/```/g, "")
        .replace(/^\s*\{[\s\S]*?"body"\s*:\s*"/i, "")
        .replace(/"\s*,\s*"analysis"[\s\S]*$/i, "")
        .replace(/"\s*\}\s*$/i, "")
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/---BODY---/gi, "")
        .replace(/---END---/gi, "")
        .trim();
    }


    // Final hard scrub — even if the model slips, never let spam triggers
    // out the door.
    const scrubSubject = (s: string) => (s || "")
      .replace(/[\p{Extended_Pictographic}\u200D\uFE0F]/gu, "")
      .replace(/[!]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 70) || "quick thought";
    const scrubBody = (b: string) => (b || "")
      .replace(/https?:\/\/\S+/gi, "")           // strip URLs
      .replace(/www\.[^\s)]+/gi, "")              // strip www. links
      .replace(/[\p{Extended_Pictographic}\u200D\uFE0F]/gu, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    // Collapse hard line breaks inside paragraphs into spaces, preserve the
    // blank-line breaks BETWEEN paragraphs, and keep the sign-off block on
    // separate lines. Mirrors the client-side normalizeEmailBody.
    const unwrapParagraphs = (b: string) => {
      const s = (b || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const paras = s.split(/\n\s*\n+/);
      return paras.map(p => {
        const lines = p.split("\n").map(l => l.trim()).filter(Boolean);
        if (!lines.length) return "";
        const isSignoff = lines.length <= 5 &&
          /^(best|thanks|cheers|regards|warmly|sincerely|kind regards)[,.]?$/i.test(lines[0]);
        return isSignoff ? lines.join("\n") : lines.join(" ").replace(/[ \t]{2,}/g, " ");
      }).join("\n\n").trim();
    };
    // When the caller provides a custom system prompt, respect it verbatim —
    // they own deliverability for that template. Only scrub the default path.
    if (!usingOverride) {
      parsed.subject = scrubSubject(parsed.subject);
      parsed.body = unwrapParagraphs(scrubBody(parsed.body));
    } else {
      parsed.subject = (parsed.subject || "").trim().slice(0, 120) || "quick thought";
      parsed.body = unwrapParagraphs((parsed.body || "").trim());
    }


    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("draft-outreach-email error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
