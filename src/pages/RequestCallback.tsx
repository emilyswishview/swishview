import React, { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/looseClient";
import { analyzePhone } from "@/utils/phoneFormat";
import { PhoneCall, CheckCircle2, Clock, ShieldCheck, Loader2 } from "lucide-react";

const AVAILABILITY = [
  "Morning (9am – 12pm)",
  "Afternoon (12pm – 4pm)",
  "Evening (4pm – 8pm)",
  "Anytime — just call me",
];

const RequestCallback: React.FC = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    channel_url: "",
    availability: AVAILABILITY[3],
    requirements: "",
  });

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  const phoneInfo = useMemo(() => analyzePhone(form.phone), [form.phone]);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({ title: "Please fill name, email and phone", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        phone_e164: phoneInfo.e164 || null,
        phone_region: phoneInfo.country || null,
        channel_url: form.channel_url.trim() || null,
        availability: form.availability,
        requirements: form.requirements.trim() || null,
        timezone,
      };

      const { error } = await supabase.from("callback_requests").insert(payload);
      if (error) throw error;

      supabase.functions
        .invoke("send-callback-request", { body: payload })
        .catch((err) => console.error("callback email failed", err));

      setDone(true);
    } catch (err: any) {
      toast({
        title: "Could not send request",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Request a Callback — SwishView"
        description="Tell us when to call. A SwishView growth manager will ring you back and map out a YouTube growth plan for your channel."
      />
      <div className="min-h-screen bg-gradient-to-b from-orange-50/50 via-white to-white">
        <Navbar />

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold tracking-wide uppercase">
                <PhoneCall className="w-3.5 h-3.5" /> We call you
              </span>
              <h1 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900">
                Request a{" "}
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  callback
                </span>
              </h1>
              <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
                No calendars, no back-and-forth. Leave your number and when you're free —
                a growth manager will call you back.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
              <div className="rounded-2xl border border-orange-100 bg-white shadow-xl p-6 sm:p-8">
                {done ? (
                  <div className="text-center py-14">
                    <CheckCircle2 className="w-14 h-14 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Request received
                    </h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Thanks {form.full_name.split(" ")[0]} — we'll call you on{" "}
                      <span className="font-semibold text-gray-900">
                        {phoneInfo.international || form.phone}
                      </span>{" "}
                      during your selected window.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full name *</Label>
                        <Input
                          id="full_name"
                          value={form.full_name}
                          onChange={(e) => set("full_name", e.target.value)}
                          placeholder="Alex Carter"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number *</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="+1 415 555 2671"
                        required
                      />
                      {form.phone.trim().length > 4 && (
                        <p className="text-xs">
                          {phoneInfo.valid ? (
                            <span className="text-green-600">
                              {phoneInfo.flag} {phoneInfo.international} · verified
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              Include your country code (e.g. +44) so we can reach you.
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="channel_url">YouTube channel URL</Label>
                      <Input
                        id="channel_url"
                        value={form.channel_url}
                        onChange={(e) => set("channel_url", e.target.value)}
                        placeholder="https://youtube.com/@yourchannel"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="availability">Best time to call</Label>
                      <select
                        id="availability"
                        value={form.availability}
                        onChange={(e) => set("availability", e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {AVAILABILITY.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                      {timezone && (
                        <p className="text-xs text-muted-foreground">
                          Times interpreted in your timezone ({timezone}).
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="requirements">What do you need help with?</Label>
                      <Textarea
                        id="requirements"
                        rows={4}
                        value={form.requirements}
                        onChange={(e) => set("requirements", e.target.value)}
                        placeholder="Tell us about your channel, goals and what's holding growth back."
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitting}
                      className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                        </>
                      ) : (
                        "Request my callback"
                      )}
                    </Button>
                  </form>
                )}
              </div>

              <aside className="space-y-4">
                {[
                  {
                    icon: Clock,
                    title: "Fast turnaround",
                    copy: "Most callbacks happen within one business day of your chosen window.",
                  },
                  {
                    icon: PhoneCall,
                    title: "A real strategist",
                    copy: "You speak with a growth manager who has already looked at your channel.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "No pressure",
                    copy: "It's a strategy conversation, not a sales pitch. Keep the plan either way.",
                  },
                ].map(({ icon: Icon, title, copy }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm"
                  >
                    <Icon className="w-5 h-5 text-orange-500 mb-2" />
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{copy}</p>
                  </div>
                ))}
              </aside>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default RequestCallback;
