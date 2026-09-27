import React, { useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const CALENDLY_URL = "https://calendly.com/swishview-support/30min";
const CALENDLY_SCRIPT_ID = "calendly-widget-script";

type CalendlyWindow = Window & {
  Calendly?: {
    initInlineWidget: (options: {
      url: string;
      parentElement: HTMLElement;
    }) => void;
  };
};

const BookConsultation: React.FC = () => {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;

    const initialize = () => {
      const calendly = (window as CalendlyWindow).Calendly;
      if (!calendly || !widgetRef.current) return;

      widgetRef.current.replaceChildren();
      calendly.initInlineWidget({
        url: CALENDLY_URL,
        parentElement: widgetRef.current,
      });
    };

    const existingScript = document.getElementById(CALENDLY_SCRIPT_ID);
    if (existingScript) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.id = CALENDLY_SCRIPT_ID;
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.addEventListener("load", initialize, { once: true });
    document.body.appendChild(script);

    return () => script.removeEventListener("load", initialize);
  }, []);

  return (
    <>
      <SEOHead
        title="Book a Consultation | Swish View"
        description="Book a free 30-minute consultation with a Swish View growth manager and get a tailored YouTube growth plan for your channel."
        canonical="https://www.swishview.com/book-consultation"
      />

      <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-background">
        <Navbar />

        <main className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <header className="mx-auto mb-10 max-w-5xl text-center sm:mb-12">
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Free 30-minute consultation
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Book a call with a <span className="text-primary">growth manager</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Pick a slot that works for you. We&apos;ll review your channel, discuss your goals,
                and map out a growth plan tailored to your niche.
              </p>
            </header>

            <section
              aria-label="Book a SwishView consultation"
              className="overflow-hidden rounded-xl border border-border/70 bg-card p-3 shadow-[0_18px_60px_-28px_hsl(var(--foreground)/0.28)] sm:p-5"
            >
              <div
                ref={widgetRef}
                className="calendly-inline-widget h-[860px] w-full sm:h-[700px] [&>iframe]:!h-full"
                data-url={CALENDLY_URL}
              />
            </section>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Prefer to open the scheduler directly?{" "}
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Open Calendly
              </a>
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BookConsultation;