import React from "react";
import { useNavigate } from "react-router-dom";

const STAGES = [
  "VIDEO UPLOADED",
  "ALGORITHM CONFUSED",
  "FOUNDATION FIXED",
  "RECOMMENDED ON AUTOPILOT",
];

const HeroRedesign: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative w-full bg-[#FBF7F1] overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-orange-300/30 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-orange-200/30 blur-[120px]" />

      <div className="relative container mx-auto px-4 sm:px-8 max-w-6xl">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-orange-600 mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          CREATE. UPLOAD. GO VIRAL.
        </div>

        {/* Headline */}
        <h1 className="font-sans text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl text-gray-900 animate-fade-in">
          Great content deserves
          <br />
          to <span className="text-orange-500 italic">be found.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed animate-fade-in">
          SwishView is a growth partner for YouTube creators — we fix the part
          of the channel YouTube looks at, not the part your audience looks at,
          so the right people find your videos without a single dollar in ad
          spend.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-wrap gap-3 animate-fade-in">
          <button
            onClick={() => navigate("/request-callback")}
            className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all"
          >
            Talk to a growth manager
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button
            onClick={() => navigate("/whyswishview")}
            className="inline-flex items-center h-12 px-6 rounded-full bg-white text-gray-900 font-medium border border-gray-200 hover:border-gray-400 transition-all"
          >
            See how it works
          </button>
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center h-12 px-6 rounded-full bg-white text-orange-600 font-medium border border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all"
          >
            Login
          </button>
        </div>

        {/* Animated wavy path with moving ball */}
        <div className="mt-16 sm:mt-24 relative">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {STAGES.map((s, i) => (
              <div
                key={s}
                className={`text-[10px] sm:text-xs font-semibold tracking-[0.16em] text-gray-500 ${
                  i === 0
                    ? "text-left"
                    : i === STAGES.length - 1
                      ? "text-right"
                      : "text-center"
                }`}
              >
                {s}
              </div>
            ))}
          </div>

          <div className="relative h-24 sm:h-32">
            <svg
              viewBox="0 0 1000 120"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
            >
              <path
                id="hero-wave"
                d="M 10 60 Q 135 0 260 60 T 510 60 T 760 60 T 990 60"
                fill="none"
                stroke="#F97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="8 8"
                opacity="0.85"
              />
              {/* Dots at each stage */}
              {[10, 340, 670, 990].map((x, i) => (
                <circle
                  key={i}
                  cx={x}
                  cy="60"
                  r="5"
                  fill="#F97316"
                  opacity={i === 2 ? 1 : 0.35}
                />
              ))}
              {/* Moving ball */}
              <circle r="8" fill="#F97316" filter="url(#glow)">
                <animateMotion
                  dur="6s"
                  repeatCount="indefinite"
                  rotate="auto"
                  path="M 10 60 Q 135 0 260 60 T 510 60 T 760 60 T 990 60"
                />
              </circle>
              <circle r="16" fill="#F97316" opacity="0.25">
                <animateMotion
                  dur="6s"
                  repeatCount="indefinite"
                  path="M 10 60 Q 135 0 260 60 T 510 60 T 760 60 T 990 60"
                />
              </circle>
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroRedesign;
