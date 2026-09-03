import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PromotionOptions = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-foreground mb-4">
          Choose Your Promotion Type
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Select the service that best fits your needs to grow your YouTube channel
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Video Promotion */}
        <Card className="glass-card hover:shadow-elegant-hover transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-display">Video Promotion</CardTitle>
            <CardDescription className="text-base">
              Get real views and engagement through our targeted promotion campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Real, organic views from targeted audiences</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Detailed analytics and progress tracking</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Flexible budget and duration options</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>24/7 campaign monitoring</span>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate('/create-promotion')}
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-white py-3"
            >
              Start Video Promotion
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* SEO Optimization */}
        <Card className="glass-card hover:shadow-elegant-hover transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-display">SEO Optimization</CardTitle>
            <CardDescription className="text-base">
              Optimize your videos for maximum reach, engagement, and discoverability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>Professional video SEO audit</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>Keyword optimization & research</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>Thumbnail analysis & suggestions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>Monthly performance reports</span>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate('/pricing')}
              className="w-full rounded-full bg-secondary hover:bg-secondary/90 text-white py-3"
            >
              View SEO Plans
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromotionOptions;
