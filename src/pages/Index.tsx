
import React, { useEffect } from "react";
import Navbar from "@/components/Navbar";
import AnniversaryBanner from "@/components/AnniversaryBanner";
import Hero from "@/components/Hero";
import HowItWorksSection from "@/components/HowItWorksSection";
import SpecsSection from "@/components/SpecsSection";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import MadeByHumans from "@/components/MadeByHumans";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import HumanoidSection from "@/components/HumanoidSection";
import DetailsSection from "@/components/DetailsSection";
import SEOHead from "@/components/SEOHead";

import TeamSection from "@/components/TeamSection";

import SEOOptimizationSection from "@/components/SEOOptimizationSection";
import { InstantAuditCTA } from "@/components/InstantAuditCTA";
import UnsubscribePopup from "@/components/UnsubscribePopup";

const HOMEPAGE_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.swishview.com/#organization",
      "name": "Swish View",
      "alternateName": ["SwishView", "Swish View YouTube SEO", "Swish View YouTube Promotion Company"],
      "url": "https://www.swishview.com",
      "logo": "https://www.swishview.com/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png",
      "image": "https://www.swishview.com/lovable-uploads/c66edb9b-3295-47cd-be47-4d81e262a4ff.png",
      "description": "Swish View is a YouTube SEO and channel promotion company helping creators in the United States, Canada, Australia and worldwide grow with real views, organic SEO, and channel optimization.",
      "areaServed": [
        { "@type": "Country", "name": "United States" },
        { "@type": "Country", "name": "Canada" },
        { "@type": "Country", "name": "Australia" },
        { "@type": "Country", "name": "United Kingdom" }
      ],
      "sameAs": [
        "https://twitter.com/swishview",
        "https://youtube.com/swishview"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://www.swishview.com/#website",
      "url": "https://www.swishview.com",
      "name": "Swish View",
      "publisher": { "@id": "https://www.swishview.com/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.swishview.com/blogs?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "Service",
      "@id": "https://www.swishview.com/#service-youtube-seo",
      "serviceType": "YouTube SEO Company",
      "name": "YouTube SEO & Channel Promotion Services",
      "provider": { "@id": "https://www.swishview.com/#organization" },
      "areaServed": [
        { "@type": "Country", "name": "United States" },
        { "@type": "Country", "name": "Canada" },
        { "@type": "Country", "name": "Australia" }
      ],
      "description": "Swish View is a top YouTube SEO company offering YouTube channel promotion, video SEO optimization, keyword research, thumbnail design, and organic subscriber growth for creators in the USA, Canada, and Australia.",
      "offers": {
        "@type": "Offer",
        "priceCurrency": "USD",
        "price": "99",
        "url": "https://www.swishview.com/pricing"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.swishview.com/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Swish View a YouTube SEO company?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Swish View is a leading YouTube SEO and channel promotion company serving creators across the United States, Canada, and Australia. We provide video SEO optimization, keyword research, thumbnail design, channel audits, and real organic view growth."
          }
        },
        {
          "@type": "Question",
          "name": "How does Swish View promote my YouTube channel?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Swish View uses targeted ad campaigns and YouTube SEO optimization to deliver real, organic views from genuine YouTube users — never bots. Your video reaches viewers who actually care about your niche."
          }
        },
        {
          "@type": "Question",
          "name": "Are the YouTube views real and safe?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Every view delivered by Swish View is from a real YouTube user via legitimate ad placements. Your channel stays fully compliant with YouTube's terms of service."
          }
        },
        {
          "@type": "Question",
          "name": "How quickly will I see results?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Most creators see view growth within 24–48 hours of campaign launch. SEO and subscriber growth scales over the campaign duration (3, 6, 9, or 12 months)."
          }
        },
        {
          "@type": "Question",
          "name": "What does it cost to promote a YouTube channel?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Channel promotion starts at $100 and delivers 75–100 views per dollar. Full SEO growth plans start at $99/month. Use code SV250ZX7H for $250 OFF."
          }
        },
        {
          "@type": "Question",
          "name": "Which countries does Swish View serve?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Swish View works with YouTube creators worldwide, with dedicated support for creators in the United States, Canada, Australia, and the United Kingdom."
          }
        }
      ]
    }
  ]
};

const Index = () => {
  // Initialize intersection observer to detect when elements enter viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observer.observe(el));
    
    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  useEffect(() => {
    // This helps ensure smooth scrolling for the anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        // Increased offset to account for mobile nav
        const offset = window.innerWidth < 768 ? 100 : 80;
        
        window.scrollTo({
          top: targetElement.offsetTop - offset,
          behavior: 'smooth'
        });
      });
    });
  }, []);

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Swish View | YouTube Promotion — Real Views, Real Growth"
        description="Boost your YouTube channel with Swish View. Real views, organic SEO growth, smart targeting, and channel optimization. Trusted by creators worldwide."
        url="https://www.swishview.com/"
        canonical="https://www.swishview.com/"
        structuredData={HOMEPAGE_FAQ_SCHEMA}
      />
      <Navbar />
      <AnniversaryBanner />
      <main className="space-y-4 sm:space-y-8">
        <Hero />
        {/* <HumanoidSection/> */}
        {/* <SpecsSection /> */}
        {/* <InstantAuditCTA /> */}
        <Features />
        <SEOOptimizationSection />
        {/* <Testimonials /> */}
        <TeamSection/>
        <Newsletter />
        <DetailsSection/>
        {/* <MadeByHumans /> */}
        <CTA />
      </main>
      <Footer />
      <UnsubscribePopup />
    </div>
  );
};

export default Index;
