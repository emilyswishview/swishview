import React, { useEffect, useRef, useState } from "react";

const HumanoidSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ticking = useRef(false);

  const cardStyle = {
    height: "60vh",
    maxHeight: "600px",
    borderRadius: "20px",
    transition:
      "transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.5s cubic-bezier(0.19, 1, 0.22, 1)",
    willChange: "transform, opacity",
  };

  const cardContent = [
    {
      title: "Real People, Not Just Numbers",
      desc: "We promote your videos to genuine viewers through handpicked platforms, social communities, and niche content spaces — never bots or fake traffic.",
      badge: "Authentic Audience",
      bg: "url('/background-section1.png')",
    },
    {
      title: "Growth That Supports the Algorithm",
      desc: "Our strategy improves watch time, CTR, and engagement, giving the YouTube algorithm the signals it loves. That means long-term visibility, not just a one-time boost.",
      badge: "Sustainable Growth",
      bg: "url('/background-section2.png')",
    },
    {
      title: "SEO + Channel Optimization Included",
      desc: "Beyond promotion, we help with titles, tags, thumbnails, keywords, and descriptions so your channel is set up to rank in Search and Suggested videos.",
      badge: "Channel Boost",
      bg: "url('/background-section3.png')",
    },
    {
      title: "Transparent, Measurable Results",
      desc: "Every creator gets a personalized dashboard with real-time insights into views, subscribers, and performance — so you always know what’s working.",
      badge: "Analytics Dashboard",
      bg: "url('/background-section1.png')",
    },
    {
      title: "Always-On Support",
      desc: "With 24/7 availability across all time zones, our team is always here to support your growth.",
      badge: "24/7 Support",
      bg: "url('/background-section2.png')",
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          if (!sectionRef.current) return;

          const sectionRect = sectionRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const totalScrollDistance = viewportHeight * 3; // bigger for 5 cards

          let progress = 0;
          if (sectionRect.top <= 0) {
            progress = Math.min(
              1,
              Math.max(0, Math.abs(sectionRect.top) / totalScrollDistance)
            );
          }

          // divide into 5 slots
          const index = Math.min(
            cardContent.length - 1,
            Math.floor(progress * cardContent.length)
          );
          setActiveCardIndex(index);

          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <div ref={sectionRef} className="relative" style={{ height: "500vh" }}>
      <section
        className="w-full h-screen py-10 md:py-16 sticky top-0 overflow-hidden bg-white"
        id="how-it-works"
      >
        <div className="container px-6 lg:px-8 mx-auto h-full flex flex-col">
          <div className="mb-2 md:mb-3">
            <div className="flex items-center gap-4 mb-2 pt-8">
              <div
                className="pulse-chip opacity-0 animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2">
                  2
                </span>
                <span>How it Works</span>
              </div>
            </div>

            <h2 className="section-title text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-1">
              Why Swish View
            </h2>
          </div>

          <div className="relative flex-1 perspective-1000">
            {cardContent.map((card, idx) => {
              const isVisible = idx <= activeCardIndex;
              return (
                <div
                  key={idx}
                  className={`absolute inset-0 overflow-hidden shadow-xl ${
                    isVisible ? "animate-card-enter" : ""
                  }`}
                  style={{
                    ...cardStyle,
                    zIndex: 10 + idx,
                    transform: `translateY(${
                      isVisible
                        ? activeCardIndex === idx
                          ? `${60 - idx * 10}px`
                          : `${40 - idx * 5}px`
                        : "200px"
                    }) scale(${0.9 + idx * 0.02})`,
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: isVisible ? "auto" : "none",
                  }}
                >
                  <div
                    className="absolute inset-0 z-0 bg-gradient-to-b from-pulse-900/40 to-dark-900/80"
                    style={{
                      backgroundImage: card.bg,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundBlendMode: "overlay",
                    }}
                  ></div>

                  <div className="absolute top-4 right-4 z-20">
                    <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white">
                      <span className="text-sm font-medium">{card.badge}</span>
                    </div>
                  </div>

                  <div className="relative z-10 p-5 sm:p-6 md:p-8 h-full flex items-center">
                    <div className="max-w-lg">
                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-display text-white font-bold leading-tight mb-4">
                        {card.title}
                      </h3>
                      <p className="text-white/90 text-base sm:text-lg">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HumanoidSection;
