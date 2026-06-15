import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Hero = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

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
      navigate("/login");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* 🔶 Top-Right Orange Glow */}
<div
  className="
    absolute 
    top-[-100px] right-[-60px] 
    w-[300px] h-[200px] 
    sm:w-[400px] sm:h-[250px] sm:top-[-100px] sm:right-[-50px]
    md:w-[500px] md:h-[300px] md:top-[-100px] md:right-[-40px]
    lg:w-[700px] lg:h-[400px] lg:top-[-100px] lg:right-[-50px]
    bg-orange-200 
    opacity-40  
    blur-[120px] 
    rounded-full 
    pointer-events-none 
    z-[1]
  "
/>

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
  className={`
    absolute inset-0 z-0 bg-no-repeat bg-cover
    bg-[center_center]           // Default for larger screens
    sm:bg-[center_center]        // Tablet & up
    max-sm:bg-[center_top_-6rem]  // Mobile only: shift image up
  `}
  style={{ backgroundImage: "url('/Header-background.webp')" }}
/>


      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="pulse-chip mb-8 inline-flex">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2">✓</span>
            <span>Drive Millions of Eyes to Your Video</span>
          </div>

<h1 className="text-4xl font-display sm:text-5xl md:text-6xl lg:text-7xl font-normal sm:font-extrabold tracking-tight sm:tracking-normal leading-snug sm:leading-tight mb-6">
  <span className="block">Grow Your</span>
  <span className="block bg-clip-text bg-[url('/text-mask-image.jpg')] bg-cover bg-center">
    YouTube Channel, Fast.
  </span>
</h1>


          <p className="text-lg sm:text-xl md:text-2xl font-display text-gray-800 mb-8 max-w-3xl mx-auto leading-relaxed">
            Get real audience. Real results — it starts with signing up.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {/* Get Started / Go to Dashboard */}
            <Button
              size="lg"
              className="group inline-flex items-center justify-center px-6 py-3 rounded-full border border-white text-white font-medium bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300 shadow-md"
              onClick={handleGetStarted}
            >
              {user ? "Go to Dashboard" : "Get Started"}
              <span className="ml-2 transform transition-transform group-hover:translate-x-1">→</span>
            </Button>

            {/* Learn More → Logout */}
            <Button
              variant="outline"
              size="lg"
              className="group inline-flex items-center justify-center px-6 py-3 rounded-full border border-gray-300 text-gray-800 bg-white hover:bg-gray-100 transition-all duration-300"
              onClick={() => {
                if (user) {
                  handleLogout();
                } else {
                  const element = document.getElementById('how-it-works');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
            >
              {user ? "Logout" : "Learn More"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-grey-100 font-display">100M+</div>
              <div className="text-gray-800 font-display">Real Audience Reached</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-grey-100 font-display">10K+</div>
              <div className="text-gray-800 font-display">Happy, Growing Creators </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-grey-800 font-display">24/7</div>
              <div className="text-gray-800 font-display"> Dedicated Creator Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
