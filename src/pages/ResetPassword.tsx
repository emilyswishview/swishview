
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import SwishViewLogo from "@/components/SwishViewLogo";
import RotatingText from "@/components/RotatingText";
import { ArrowUp } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const rotatingTexts = [
    "grow your YouTube views.",
    "boost your video reach.",
    "run your viral campaign."
  ];

  useEffect(() => {
    // Get the session from the URL parameters (sent by Supabase)
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        toast({
          title: "Error",
          description: "Invalid or expired reset link. Please request a new one.",
          variant: "destructive",
        });
        navigate("/forgot-password");
        return;
      }

      if (session) {
        setSession(session);
      } else {
        toast({
          title: "Error",
          description: "Invalid or expired reset link. Please request a new one.",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
    };

    getSession();
  }, [navigate, toast]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      toast({ 
        title: "Password updated!", 
        description: "Your password has been successfully updated." 
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/login");
      
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <SwishViewLogo size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
              Reset your password
            </h1>
            <p className="text-gray-600">
              Enter your new password below
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handlePasswordUpdate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-bold text-gray-900">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 border-gray-200 bg-white shadow-sm"
                placeholder="Enter new password"
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-bold text-gray-900">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-10 border-gray-200 bg-white shadow-sm"
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 font-display bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all duration-200 transform shadow-xl" 
              disabled={loading}
            >
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              className="text-gray-600 hover:text-gray-800 underline font-medium font-display"
              onClick={() => navigate("/login")}
            >
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

export default ResetPassword;
