
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CTA = () => {
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
    <section className="w-full py-16 sm:py-24 bg-gradient-to-r from-pulse-500 to-pulse-600">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
          Ready to Go Viral?
        </h2>
        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join thousands of creators who've boosted their YouTube presence with Swish View.
        </p>
        <Button 
          size="lg" 
          variant="secondary"
          className="bg-white text-pulse-600 hover:bg-gray-100 text-lg px-8 py-4 font-semibold"
          onClick={handleGetStarted}
        >
          {user ? "Launch New Campaign" : "Start Your Campaign"}
        </Button>
      </div>
    </section>
  );
};

export default CTA;
