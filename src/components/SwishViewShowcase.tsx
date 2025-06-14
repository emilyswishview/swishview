
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SwishViewShowcase = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
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

  return (
    <section ref={sectionRef} className="w-full py-20 bg-gray-100" id="swish-showcase">
      <div className="container px-6 lg:px-8 mx-auto">
        <div className="flex flex-col items-center opacity-0 translate-y-10 transition-all duration-1000">
          <div className="mb-12 text-center">
            <div className="pulse-chip mb-4">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2">03</span>
              <span>Swish View Platform</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              The Future of <span className="text-[#FC4D0A]">YouTube Growth</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Swish View combines cutting-edge promotion strategies with advanced analytics to 
              deliver real results for content creators worldwide.
            </p>
          </div>
          
          <div className="relative w-full max-w-6xl mb-12">
            <div className="text-center py-20 bg-gradient-to-br from-pulse-500 to-pulse-600 rounded-3xl shadow-2xl">
              <div className="flex items-center justify-center mb-8">
                <div className="text-6xl sm:text-8xl md:text-9xl font-display font-bold text-white">
                  <span className="block">Swish</span>
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                    View
                  </span>
                </div>
              </div>
              <p className="text-white/90 text-xl max-w-2xl mx-auto mb-8">
                Elevating YouTube creators to new heights with smart promotion and real engagement
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="bg-white text-pulse-600 hover:bg-gray-100 text-lg px-8 py-4 font-semibold"
                onClick={() => navigate('/auth')}
              >
                Get Started Today
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-elegant hover:shadow-elegant-hover transition-all duration-300">
              <div className="w-12 h-12 bg-pulse-100 rounded-full flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="#FC4D0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="#FC4D0A" strokeWidth="2"/>
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">Real Views</h4>
              <p className="text-gray-600">Get genuine views from real users across premium platforms and social media channels.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-elegant hover:shadow-elegant-hover transition-all duration-300">
              <div className="w-12 h-12 bg-pulse-100 rounded-full flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3v18h18" stroke="#FC4D0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 17V9l-5-5-5 5v8" stroke="#FC4D0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">Smart Analytics</h4>
              <p className="text-gray-600">Track your campaign performance with detailed insights and optimize your growth strategy.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-elegant hover:shadow-elegant-hover transition-all duration-300">
              <div className="w-12 h-12 bg-pulse-100 rounded-full flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" stroke="#FC4D0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4 className="text-lg font-semibold mb-2">Safe & Secure</h4>
              <p className="text-gray-600">YouTube-compliant promotion methods that protect your channel and ensure long-term growth.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SwishViewShowcase;
