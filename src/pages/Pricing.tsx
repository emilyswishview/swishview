import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOPlansSection from "@/components/SEOPlansSection";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import SEOHead from "@/components/SEOHead";

const Pricing = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="YouTube SEO Pricing & Plans | Swish View"
        description="Affordable YouTube SEO and channel growth plans. 3, 6, 9, and 12-month options with guaranteed view & subscriber targets. Use code SV250ZX7H for $250 OFF."
        keywords="youtube seo pricing, youtube growth plans, channel promotion cost, swishview pricing, youtube subscribers package"
        url="https://www.swishview.com/pricing"
        canonical="https://www.swishview.com/pricing"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Swish View YouTube SEO Plans",
          description: "YouTube SEO and channel growth plans with guaranteed targets.",
          brand: { "@type": "Brand", name: "Swish View" },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: "99",
            highPrice: "1999",
            offerCount: "4",
            url: "https://www.swishview.com/pricing"
          }
        }}
      />
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
              Choose Your Growth Plan
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Powerful SEO optimization plans designed to boost your YouTube channel's visibility and engagement.
            </p>
            
            {!user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto mb-8">
                <p className="text-blue-900 mb-4">
                  Sign in to purchase plans and access your dashboard
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => navigate("/login")} variant="default">
                    Sign In
                  </Button>
                  <Button onClick={() => navigate("/signup")} variant="outline">
                    Sign Up
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* SEO Plans Section */}
          {user ? (
            <SEOPlansSection userId={user.id} />
          ) : (
            <SEOPlansSection userId="" />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
