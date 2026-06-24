
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CTA = () => {
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
      navigate("/signup");
    }
  };

  return (
    <section className="w-full py-16 sm:py-24 bg-gradient-to-r from-pulse-500 to-pulse-600">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
          Trusted by Creators
        </h2>
        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join thousands of creators who've boosted their YouTube presence with Swish View.
        </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="group inline-flex items-center justify-center px-6 py-3 rounded-full border border-gray-300 text-pulse-500 bg-white hover:bg-gray-100 transition-all duration-300"
            onClick={() => navigate('/dashboard')}
          >
            Get Started
          </Button>
      </div>
    </section>
  );
};

export default CTA;
