
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import SwishViewLogo from "@/components/SwishViewLogo";
import RotatingText from "@/components/RotatingText";
import { ArrowUp, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const rotatingTexts = [
    "grow your YouTube views.",
    "boost your video reach.",
    "run your viral campaign."
  ];

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setEmailSent(true);
      toast({ 
        title: "Reset email sent!", 
        description: "Check your email for the password reset link." 
      });
      
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-1 bg-white">
        <div className="w-full max-w-md space-y-5">
          {/* Logo */}
          <div className="flex justify-center">
            <SwishViewLogo size="xl" />
          </div>

          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 font-display">
              {emailSent ? "Check your email" : "Forgot password?"}
            </h1>
            <p className="text-gray-600">
              {emailSent 
                ? "We've sent a password reset link to your email address."
                : "Enter your email address and we'll send you a link to reset your password."
              }
            </p>
          </div>
          
          {!emailSent ? (
            /* Form */
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-gray-900">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 border-gray-200 bg-white shadow-sm"
                  placeholder="Enter your email"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 font-display bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all duration-200 transform shadow-xl" 
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          ) : (
            /* Success state */
            <div className="space-y-5">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  If an account with that email exists, we've sent you a password reset link.
                </p>
              </div>
              
              <Button 
                type="button"
                variant="outline"
                className="w-full h-10 font-display"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
              >
                Send another email
              </Button>
            </div>
          )}

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              className="text-gray-600 hover:text-gray-800 underline font-medium font-display flex items-center justify-center gap-2"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Animated Bubble */}
      <div className="hidden lg:flex flex-1 bg-white items-center justify-center relative p-3">
        <div className="relative w-full h-full rounded-3xl overflow-hidden bg-white">
          <img
            src="/background-section3.png"
            alt="Gradient"
            className="w-full h-full object-cover rounded-3xl"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[550px] h-[70px] bg-white shadow-xl rounded-full flex items-center justify-between px-6 transition-all duration-300">
              <div className="flex-1 min-w-0">
                <div className="text-gray-800 font-medium text-base leading-relaxed truncate">
                  <span>Ask Swish View to </span>
                  <RotatingText
                    texts={rotatingTexts}
                    typingSpeed={40}
                    pauseDuration={1500}
                    className="text-gray-800"
                  />
                </div>
              </div>
              <button className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-full ml-4 flex-shrink-0">
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
