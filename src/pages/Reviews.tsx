import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  CheckCircle2,
  TrendingUp,
  Users,
  Eye,
  ShieldCheck,
  Play,
  ArrowRight,
  Quote,
  MessageCircle,
  Mail,
  Instagram,
} from "lucide-react";

const stats = [
  { icon: Eye, value: "10M+", label: "Views Delivered" },
  { icon: Users, value: "500+", label: "Creators Helped" },
  { icon: TrendingUp, value: "97%", label: "Satisfaction Rate" },
  { icon: ShieldCheck, value: "0", label: "Bot Traffic" },
];

const testimonials = [
  {
    name: "Marcus K.",
    handle: "@MarcusPlaysGG",
    niche: "Gaming Creator",
    subs: "42K subscribers",
    avatarBg: "from-purple-500 to-indigo-600",
    quote:
      "I was stuck below 1k views for months. SwishView helped my videos finally reach the right audience naturally. Within weeks my impressions and subscribers started growing consistently.",
  },
  {
    name: "Priya R.",
    handle: "@FinanceWithPriya",
    niche: "Finance YouTuber",
    subs: "28K subscribers",
    avatarBg: "from-emerald-500 to-teal-600",
    quote:
      "The best part is they focus on real growth instead of fake bot traffic. My engagement rate actually improved — like, watch time went up, not just view count.",
  },
  {
    name: "Daniel O.",
    handle: "@TheLongFormPod",
    niche: "Podcast Creator",
    subs: "15K subscribers",
    avatarBg: "from-orange-500 to-red-500",
    quote:
      "After using SwishView, one of my videos got picked up by YouTube recommendations for the first time. That single push changed everything for my channel.",
  },
  {
    name: "Sora T.",
    handle: "@SoraBuilds",
    niche: "Tech Creator",
    subs: "61K subscribers",
    avatarBg: "from-blue-500 to-cyan-500",
    quote:
      "Most promotion services destroy retention. SwishView was different — the audience actually matched my niche, so my retention stayed healthy.",
  },
  {
    name: "Ava M.",
    handle: "@AvaLaunches",
    niche: "Startup Brand",
    subs: "Brand channel",
    avatarBg: "from-pink-500 to-rose-600",
    quote:
      "We used SwishView to push our product launch videos and the reach increase was noticeable almost immediately. Comments and DMs started rolling in.",
  },
  {
    name: "Mr. Whitfield",
    handle: "@LearnWithWhitfield",
    niche: "Educational Creator",
    subs: "33K subscribers",
    avatarBg: "from-amber-500 to-orange-600",
    quote:
      "The SEO guidance alone was valuable. Titles, tags, targeting — they clearly understand how YouTube discovery actually works in 2026.",
  },
  {
    name: "Jess L.",
    handle: "@JessLifestyle",
    niche: "Lifestyle Creator",
    subs: "19K subscribers",
    avatarBg: "from-fuchsia-500 to-pink-500",
    quote:
      "Finally found a YouTube promotion company that doesn't look sketchy. Clear pricing, real support, no shady promises about going viral overnight.",
  },
  {
    name: "Kai N.",
    handle: "@KaiSoundsOfficial",
    niche: "Music Artist",
    subs: "47K subscribers",
    avatarBg: "from-violet-500 to-purple-600",
    quote:
      "Real people. Real views. Exactly what they advertise. My latest single got way more saves and shares than my previous releases.",
  },
];

const beforeAfter = [
  { before: "500 views per video", after: "18,000+ views per video" },
  { before: "No impressions on Browse", after: "Suggested videos traffic kicked in" },
  { before: "Slow, inconsistent growth", after: "Daily subscriber growth" },
  { before: "Retention dropped after 20s", after: "Audience matched the niche" },
  { before: "0 video on the home feed", after: "Multiple recommendations daily" },
];

const Reviews = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>SwishView Reviews — Real Creators, Real YouTube Growth</title>
        <meta
          name="description"
          content="Read honest SwishView reviews from real YouTube creators. Organic views, SEO, and audience targeting — no bots, no fake traffic. 500+ creators, 10M+ views delivered."
        />
        <link rel="canonical" href="https://www.swishview.com/reviews" />
        <meta property="og:title" content="SwishView Reviews — Real Creators, Real Growth" />
        <meta
          property="og:description"
          content="Honest reviews from 500+ creators using SwishView for organic YouTube promotion and SEO."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "SwishView YouTube Promotion",
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              reviewCount: "512",
            },
          })}
        </script>
      </Helmet>

      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-purple-50" />
        <div className="absolute top-20 -left-32 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 px-4 py-1.5">
            <Star className="w-3.5 h-3.5 mr-1.5 fill-orange-500 text-orange-500" />
            Rated 4.9 / 5 by 500+ creators
          </Badge>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900 mb-6 leading-tight">
            Trusted by creators growing on{" "}
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              YouTube organically
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Real reviews from real channels — gaming, finance, podcasts, music, education and
            more. No bots. No fake traffic. Just discovery that actually works.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                Start growing today
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="w-7 h-7 mx-auto mb-3 text-orange-400" />
              <div className="text-3xl md:text-4xl font-bold mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Creator Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Creator Stories</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-4">
              What creators are actually saying
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Honest, unfiltered feedback from channels using SwishView right now.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="hover:shadow-xl transition-shadow border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.avatarBg} flex items-center justify-center text-white font-bold`}
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                        <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {t.handle} · {t.subs}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                  <Quote className="w-5 h-5 text-orange-300 mb-2" />
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">{t.quote}</p>
                  <Badge variant="secondary" className="text-xs">
                    {t.niche}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-orange-50/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Real Results</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-4">
              Before vs After SwishView
            </h2>
            <p className="text-gray-600">Typical creator results within the first 30 days.</p>
          </div>

          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="grid grid-cols-2">
              <div className="bg-gray-100 p-6 text-center">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Before</p>
              </div>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
                <p className="text-sm font-semibold text-white uppercase tracking-wider">After</p>
              </div>
            </div>
            {beforeAfter.map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-2 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                <div className="p-5 border-r border-gray-100 text-gray-600 flex items-center">
                  <span className="text-red-400 mr-2">✕</span>
                  {row.before}
                </div>
                <div className="p-5 text-gray-900 font-medium flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  {row.after}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </section>

      {/* Screenshot-style Reviews */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Unfiltered</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-4">
              Straight from creators' inboxes
            </h2>
            <p className="text-gray-600">DMs, emails, and chats — receipts of real results.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Instagram DM */}
            <Card className="overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-3 flex items-center gap-2">
                <Instagram className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-semibold">Instagram DM</span>
              </div>
              <CardContent className="p-5 space-y-3 bg-white">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-gray-800">
                      yo I was honestly skeptical bc most YT promo is a scam but swishview actually
                      brought relevant ppl to my channel 😭
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 justify-end">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-white">that's amazing! glad it worked 🙌</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%]">
                    <p className="text-sm text-gray-800">my last vid hit suggested for the first time ever</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card className="overflow-hidden shadow-lg">
              <div className="bg-gray-900 p-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-semibold">Email</span>
              </div>
              <CardContent className="p-5 bg-white">
                <div className="border-b border-gray-100 pb-3 mb-3">
                  <p className="text-xs text-gray-500">From: jordan@creatorhub.io</p>
                  <p className="text-xs text-gray-500">Subject: Thank you 🙏</p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Hey team,<br /><br />
                  Just wanted to say — I've tried 3 different promotion services in the last year
                  and yours is the only one that didn't tank my retention. My CTR jumped from 3.1%
                  to 7.4% on the promoted video.<br /><br />
                  Signing up for another package this week.<br /><br />
                  — Jordan
                </p>
              </CardContent>
            </Card>

            {/* Discord */}
            <Card className="overflow-hidden shadow-lg">
              <div className="bg-[#5865F2] p-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-white" />
                <span className="text-white text-sm font-semibold">Discord · #wins</span>
              </div>
              <CardContent className="p-5 bg-[#36393f] text-white space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-9 h-9 rounded-full bg-orange-500 flex-shrink-0 flex items-center justify-center font-bold text-sm">
                    R
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold text-orange-300">ryanmakesmusic</span>
                      <span className="text-xs text-gray-400 ml-2">Today at 2:14 PM</span>
                    </p>
                    <p className="text-sm text-gray-200 mt-1">
                      bro the swishview push on my new track got me 240 new subs in 4 days and like
                      80% are actually in my niche 🔥
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center font-bold text-sm">
                    M
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold text-emerald-300">mia.codes</span>
                      <span className="text-xs text-gray-400 ml-2">Today at 2:16 PM</span>
                    </p>
                    <p className="text-sm text-gray-200 mt-1">
                      same here — finally a service that doesn't feel sketchy
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* YouTube Analytics */}
            <Card className="overflow-hidden shadow-lg lg:col-span-2">
              <div className="bg-red-600 p-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-white fill-white" />
                <span className="text-white text-sm font-semibold">YouTube Studio · Last 28 days</span>
              </div>
              <CardContent className="p-6 bg-white">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Views</p>
                    <p className="text-2xl font-bold text-gray-900">142,318</p>
                    <p className="text-xs text-green-600 font-semibold">↑ 1,243%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Watch time (hrs)</p>
                    <p className="text-2xl font-bold text-gray-900">8,902</p>
                    <p className="text-xs text-green-600 font-semibold">↑ 980%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Subscribers</p>
                    <p className="text-2xl font-bold text-gray-900">+2,847</p>
                    <p className="text-xs text-green-600 font-semibold">↑ 612%</p>
                  </div>
                </div>
                <div className="h-20 bg-gradient-to-r from-red-50 to-red-100 rounded-lg flex items-end gap-1 p-2">
                  {[20, 28, 25, 35, 40, 38, 52, 60, 58, 72, 80, 88, 95, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-red-500 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Traffic source: <span className="font-semibold">Suggested videos · Browse features</span>
                </p>
              </CardContent>
            </Card>

            {/* Twitter-style */}
            <Card className="overflow-hidden shadow-lg">
              <CardContent className="p-5 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-bold text-gray-900 text-sm">Leo Park</p>
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <p className="text-gray-500 text-sm">@leoparkfilms</p>
                    </div>
                    <p className="text-gray-800 text-sm mt-2 leading-relaxed">
                      okay @swishview is the first promo service that didn't wreck my analytics. my
                      avg view duration actually went UP. wild.
                    </p>
                    <div className="flex gap-6 mt-3 text-xs text-gray-500">
                      <span>💬 24</span>
                      <span>🔁 89</span>
                      <span>❤️ 412</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-500 to-red-500 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Ready to be the next review?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Join 500+ creators growing their channels with real, organic YouTube promotion.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100">
                Start your campaign
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-orange-600"
              >
                Talk to our team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Reviews;
