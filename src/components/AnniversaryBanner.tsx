import React, { useState, useEffect } from "react";

const AnniversaryBanner = () => {
  const [visible, setVisible] = useState(true);
  const [particles, setParticles] = useState<
    { id: number; left: number; delay: number; duration: number; color: string }[]
  >([]);

  useEffect(() => {
    const colors = ["#f97316", "#fb923c", "#fdba74", "#ea580c", "#ffedd5"];
    const p = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(p);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative z-[60] w-full overflow-hidden bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 text-white">
      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 w-1.5 h-1.5 rounded-full opacity-70 animate-confetti-fall"
            style={{
              left: `${p.left}%`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium">
        <span className="inline-block animate-bounce-subtle">🎉</span>
        <span>SwishView turns 8</span>
        <span className="hidden sm:inline text-orange-100">— 8 years of helping creators grow</span>
        <button
          onClick={() => setVisible(false)}
          className="ml-2 p-0.5 rounded hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-80 hover:opacity-100">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AnniversaryBanner;
