import { supabase } from "@/integrations/supabase/looseClient";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/**
 * Finds (or creates) a channel growth report for a YouTube channel link and
 * opens it in a new tab with the browser print dialog ready.
 */
export async function ensureChannelReport(channelUrl: string): Promise<string> {
  const url = (channelUrl || "").trim();
  if (!url) throw new Error("No YouTube channel link on this lead");

  // Reuse an existing report for the same channel link when possible.
  const { data: existing } = await supabase
    .from("reports")
    .select("slug")
    .eq("channel_url", url)
    .maybeSingle();

  let slug: string | undefined = existing?.slug;

  if (!slug) {
    const { data: yt, error: ytErr } = await supabase.functions.invoke("youtube-channel-info", {
      body: { channelUrl: url, includeVideos: false },
    });
    if (ytErr || yt?.error) throw new Error(yt?.error || ytErr?.message || "Failed to fetch channel");

    const base = slugify(yt.channelName || "channel");
    slug = base;
    let n = 1;
    while ((await supabase.from("reports").select("id").eq("slug", slug).maybeSingle()).data) {
      slug = `${base}-${++n}`;
    }

    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("reports").insert({
      slug,
      channel_url: url,
      channel_id: yt.channelId,
      channel_name: yt.channelName,
      channel_handle: yt.customUrl,
      channel_thumbnail: yt.thumbnail,
      subscribers: yt.subscribers,
      total_views: yt.totalViews,
      video_count: yt.videoCount,
      description: yt.description,
      created_by: auth?.user?.id,
      admin_notes: JSON.stringify({ notes: "", seoFeedback: "" }),
      recommendations: [],
    });
    if (error) throw error;
  }

  return slug!;
}

export async function openChannelReport(channelUrl: string): Promise<string> {
  const slug = await ensureChannelReport(channelUrl);
  window.open(`${window.location.origin}/report/${slug}?print=1`, "_blank", "noopener");
  return slug;
}
