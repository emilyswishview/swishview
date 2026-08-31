import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSearch, ArrowRight, CheckCircle2 } from "lucide-react";
import { InstantAuditModal } from "./InstantAuditModal";

export const InstantAuditCTA = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <CardContent className="p-8 sm:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                    <FileSearch className="h-4 w-4" />
                    Instant Trial — No Sign-In Required
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                    YouTube Channel Audit
                    <span className="block text-primary mt-2">$29 Performance Checkup</span>
                  </h2>
                  
                  <p className="text-lg text-muted-foreground">
                    Find out exactly what's holding your channel back and what to fix for better reach. 
                    Get a professional audit delivered to your inbox.
                  </p>

                  <Button 
                    size="lg" 
                    onClick={() => setIsModalOpen(true)}
                    className="group"
                  >
                    Get Instant Audit — $29
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-card border p-6 space-y-4">
                    <h3 className="font-semibold text-lg">What You'll Get:</h3>
                    <ul className="space-y-3">
                      {[
                        "Review of your channel's current performance and structure",
                        "Analysis of recent videos and engagement trends",
                        "Insights on how YouTube's algorithm reads your content",
                        "Audience and discovery review to reveal growth gaps",
                        "Personalized improvement report delivered within 7 days"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm font-medium text-center">
                      💡 You will be assigned a YouTube Growth Expert who'll personally review your channel
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <InstantAuditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};