import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Hero = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="absolute inset-0">
        <svg
          className="absolute bottom-0 left-0 right-0 top-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon fill="#fff" points="0,100 100,0 100,100" />
        </svg>
      </div>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: "url('/Header-background.webp')",
        }}
      />
      
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="pulse-chip mb-8 inline-flex">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2">✓</span>
            <span>Drive Millions of Eyes to Your Video</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6">
            <span className="block">Grow Your</span>
            <span className="block bg-clip-text text-transparent bg-[url('/text-mask-image.jpg')] bg-cover bg-center">
              YouTube Channel, Fast.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Get real views. Real results — it starts with signing up.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="button-primary text-lg px-8 py-4 min-w-[200px]"
              onClick={handleGetStarted}
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="button-secondary text-lg px-8 py-4 min-w-[200px]"
              onClick={() => {
                const element = document.getElementById('how-it-works');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Learn More
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-pulse-500">10M+</div>
              <div className="text-gray-600">Views Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pulse-500">50K+</div>
              <div className="text-gray-600">Happy Creators</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pulse-500">24/7</div>
              <div className="text-gray-600">Campaign Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
