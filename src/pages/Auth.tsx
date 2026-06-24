
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import SwishViewLogo from "@/components/SwishViewLogo";
import PolicyModal from "@/components/PolicyModal";
import RotatingText from "@/components/RotatingText";
import { ArrowUp } from "lucide-react";
import { notifyUserActivity } from "@/utils/notifyActivity";

const ADMIN_EMAIL = "admin@swishview.com";
const ADMIN_PASSWORD = "SwishAdmin2024!";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const rotatingTexts = [
    "grow your YouTube views.",
    "boost your video reach.",
    "run your viral campaign."
  ];

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (session.user.email === ADMIN_EMAIL) {
          navigate("/admin");
        } else {
          navigate("/ai");
        }
      }
    };

    checkExistingSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session);
        if (session && event === 'SIGNED_IN') {
          localStorage.setItem('supabase.auth.token', JSON.stringify(session));
          
          if (session.user.email === ADMIN_EMAIL) {
            navigate("/admin");
          } else {
            navigate("/ai");
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('supabase.auth.token');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && !agreeToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the Terms and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        console.log("Sign in successful:", data);
        
        toast({ 
          title: "Welcome back!", 
          description: "Successfully logged in." 
        });

        setTimeout(() => {
          navigate("/ai");
        }, 100);
        
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/ai`
          },
        });
        
        if (error) throw error;
        
        console.log("Sign up successful:", data);
        
        // Send notification for new signup
        await notifyUserActivity({
          type: "new_signup",
          data: {
            email: email,
            full_name: fullName,
            auth_method: "Email/Password",
          },
        });
        
        toast({ 
          title: "Account created!", 
          description: "Welcome! You can now start creating AI thumbnails." 
        });

        if (data.user && !data.user.email_confirmed_at) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError) {
            setTimeout(() => {
              navigate("/ai");
            }, 100);
          }
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/ai`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/yt-analytics-monetary.readonly"
          ].join(' ')
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google auth error", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTermsChange = (checked: boolean | "indeterminate") => {
    setAgreeToTerms(checked === true);
  };

  return (
    <div className="max-h-screen  flex">
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
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-gray-600">
              {isLogin ? "Sign in to create AI thumbnails" : "Join us and start creating stunning AI-powered thumbnails"}
            </p>
          </div>

           {/* Google Auth Button */}
  
          {/* <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 flex items-center justify-center gap-3 border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm"
              onClick={handleGoogleAuth}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div> */}

          {/* Divider */}
           {/* <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500 font-medium">OR</span>
            </div>
          </div>  */}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-bold text-gray-900">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="h-10 border-gray-200 bg-white  shadow-sm"
                  placeholder="Name"
                />
              </div>
            )}
            
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
                className="h-10 border-gray-200 bg-white  shadow-sm"
                placeholder="Email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-bold text-gray-900">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 border-gray-200 bg-white   shadow-sm"
                placeholder="Password"
              />
            </div>

            {!isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={handleTermsChange}
                  className="border-gray-300"
                />
                <Label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to our{" "}
                  <button
                    type="button"
                    className="text-grey-500  hover:text-pulse-500 underline"
                    onClick={() => navigate("/terms-conditions")}
                  >   Terms & Conditions
                  </button>
                  <span> and </span>
                  <button
                    type="button"
                    className="text-grey-500 hover:text-pulse-500 underline"
                    onClick={() => navigate("/privacy-policy")}
                  >
                    Privacy Policy
                  </button>
                     
                </Label>
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-10 font-display   bg-orange-500 hover:bg-orange-600 text-white font-medium transition-all duration-200 transform   shadow-xl" 
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Log in" : "Create your account"}
            </Button>
          </form>

          {/* Switch Auth Mode */}
          <div className="text-center">
            <button
              type="button"
              className="text-grey-700 hover:underline font-medium font-display"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>

            {/* Right Panel - White Background with Image and Bubble */}
<div className="hidden lg:flex flex-1 bg-white items-center justify-center relative p-3">
  {/* Curved Image Container */}
  <div className="relative w-full h-full rounded-3xl overflow-hidden  bg-white ">
    {/* Background Image */}
    <img
      src="/background-section3.png"
      alt="Gradient"
      className="w-full h-full object-cover rounded-3xl"
    />

    {/* Centered Bubble on Image */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[550px] h-[70px] bg-white shadow-xl rounded-full flex items-center justify-between px-6 transition-all duration-300 ">
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

      <PolicyModal open={isPolicyOpen} onOpenChange={setIsPolicyOpen} />
    </div>
  );
};

export default Auth;
