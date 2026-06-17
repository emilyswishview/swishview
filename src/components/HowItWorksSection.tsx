
import React from "react";
import { Rocket, Eye, TrendingUp } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      number: "01",
      title: "Launch Your Campaign",
      description: "Sign up, pick your video, set your budget and audience. Boom—you're live.",
      icon: Rocket,
    },
    {
      number: "02", 
      title: "Get Instant Exposure",
      description: "We blast your video across top blogs, apps, websites, and social media. Real views. Real fast.",
      icon: Eye,
    },
    {
      number: "03",
      title: "Grow Your Channel",
      description: "Your video hits the right eyeballs. Gain views, likes, and subscribers—while tracking everything in real time.",
      icon: TrendingUp,
    },
  ];

  return (
    <section className="w-full py-12 sm:py-16 bg-white" id="how-it-works">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex items-center gap-4 mb-8 sm:mb-16">
          <div className="pulse-chip">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pulse-500 text-white mr-2">2</span>
            <span>How It Works</span>
          </div>
          <div className="flex-1 h-[1px] bg-gray-300"></div>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-center mb-12 sm:mb-16">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="text-center animate-on-scroll">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-pulse-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.number}
                    </div>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-display font-bold mb-4">
                    {step.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
