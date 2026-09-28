import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PlaySquare, Rocket, Video, FileSearch } from "lucide-react";

const SEOOptimizationSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const elements = entry.target.querySelectorAll(".fade-in-element");
            elements.forEach((el, index) => {
              setTimeout(() => {
                el.classList.add("animate-fade-in");
              }, index * 100);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const products = [
    {
      icon: <PlaySquare className="w-8 h-8 text-primary" />,
      title: "Video Promotion",
      description: "Get more views and engagement on your videos.",
      points: [
        "Real people watching no bots or fake views",
        "Choose how many viewers you'd like to gain",
        "Pick your audience region to target the right viewers",
        "Easy to use dashboard to track your growth",
        "Dedicated manager to guide and support you anytime",
      ],
      button: "Click here to start",
      route: "/create-promotion",
    },
    {
      icon: <Rocket className="w-8 h-8 text-primary" />,
      title: "Channel Optimization & Promotion",
      description: "Grow your whole channel with SEO and long term strategies.",
      points: [
        "Complete channel and video optimization",
        "SEO with keywords, titles, tags, and thumbnails",
        "Reach audiences truly interested in your content",
        "Growth dashboard with insights and updates",
        "Personal SEO expert to guide your journey",
      ],
      button: "Click here to start",
      route: "/create-seo",
    },
    /*{
      icon: <FileSearch className="w-8 h-8 text-primary" />,
      title: "YouTube Channel Audit - 1 Week Performance Checkup",
      description: "Find out exactly what's holding your channel back and what to fix for better reach.",
      points: [
        "Review of your channel's current performance and structure",
        "Analysis of recent videos and engagement trends",
        "Insights on how YouTube's algorithm reads your content",
        "Audience and discovery review to reveal growth gaps",
        "Personalized improvement report delivered within 7 days",
      ],
      button: "Click here to start",
      route: "/login",
    },*/
    {
      icon: <Video className="w-8 h-8 text-primary" />,
      title: "YouTube Video Editing & Enhancement",
      description: "Whether your video is uploaded or still waiting to go live we make it ready to perform better.",
      points: [
        "Re-edit uploaded videos to improve watch time & engagement",
        "Professionally edit new content before upload",
        "Add hooks, intros/outros, subtitles, and graphics",
        "Optimize length, flow, and style for YouTube's algorithm",
        "Deliver polished, HD/4K YouTube ready files",
      ],
      button: "Coming Soon",
      route: null,
    },
  ];

  return (
    <section
      id="products"
      ref={sectionRef}
      className="relative overflow-hidden"
    >
      <div className="section-container relative">
        {/* Section chip */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="pulse-chip opacity-0 fade-in-element"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2">
              2
            </span>
            <span className="text-">Our Services</span>
          </div>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-gray-900 mb-12 opacity-0 fade-in-element">
          Products
        </h2>

        <div className="grid font-display grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <div
              key={index}
              className={`glass-card p-8 border rounded-2xl shadow-sm opacity-0 fade-in-element hover:shadow-lg transition-all h-full flex flex-col ${
                !product.route ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                {product.icon}
                <h3 className="text-xl font-semibold text-gray-900">
                  {product.title}
                </h3>
              </div>
              <p className="text-gray-600 mb-4">{product.description}</p>
              <ul className="text-gray-700 space-y-2 mb-6 flex-1">
                {product.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {point}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className={`w-full mt-auto ${
                  !product.route
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : ""
                }`}
                disabled={!product.route}
                onClick={() => product.route && navigate(product.route)}
              >
                {product.button}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SEOOptimizationSection;
