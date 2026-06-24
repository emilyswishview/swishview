
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, User } from "lucide-react";
import DashboardNavbar from "@/components/DashboardNavbar";
import { useForm } from "react-hook-form";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProfileData {
  full_name: string;
  channel_name: string;
  location: string;
  contact_email: string;
  phone_number: string;
  bio: string;
  website: string;
}

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileData>({
    defaultValues: {
      full_name: "",
      channel_name: "",
      location: "",
      contact_email: "",
      phone_number: "",
      bio: "",
      website: ""
    }
  });

  useEffect(() => {
    checkUserAndLoadProfile();
  }, []);

  const checkUserAndLoadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setUser(session.user);

      // Load existing profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading profile:", error);
      } else if (profile) {
        // Set form values with existing data
        setValue("full_name", profile.full_name || "");
        setValue("channel_name", profile.channel_name || "");
        setValue("location", profile.location || "");
        setValue("contact_email", profile.contact_email || "");
        setValue("phone_number", profile.phone_number || "");
        setValue("bio", profile.bio || "");
        setValue("website", profile.website || "");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: ProfileData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          ...data
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your profile has been updated successfully.",
      });

      // Navigate back to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <DashboardNavbar user={user} />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ paddingTop: '80px' }}>
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 hover:bg-gray-100 rounded-3xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2 " />
          Back to Dashboard
        </Button>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 shadow-lg rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-display font-bold text-gray-900">
              Edit Your Profile
            </CardTitle>
            <p className="text-gray-600 font-display">
              Update your personal information and preferences
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-gray-900">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    {...register("full_name", { required: "Full name is required" })}
                    className="border-gray-200 bg-white shadow-sm"
                    placeholder="Enter your full name"
                  />
                  {errors.full_name && (
                    <p className="text-sm text-red-600">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel_name" className="text-sm font-medium text-gray-900">
                    Channel Name
                  </Label>
                  <Input
                    id="channel_name"
                    {...register("channel_name")}
                    className="border-gray-200 bg-white shadow-sm"
                    placeholder="Your YouTube channel name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-gray-900">
                    Location
                  </Label>
                  <Input
                    id="location"
                    {...register("location")}
                    className="border-gray-200 bg-white shadow-sm"
                    placeholder="City, Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email" className="text-sm font-medium text-gray-900">
                    Contact Email
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...register("contact_email", {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                    className="border-gray-200 bg-white shadow-sm"
                    placeholder="contact@example.com"
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-600">{errors.contact_email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-sm font-medium text-gray-900">
                    Phone Number
                  </Label>
                  <Input
                    id="phone_number"
                    {...register("phone_number")}
                    className="border-gray-200 bg-white shadow-sm"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm font-medium text-gray-900">
                    Website
                  </Label>
                  <Input
                    id="website"
                    {...register("website")}
                    className="border-gray-200 bg-white shadow-sm"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium text-gray-900">
                  Bio
                </Label>
                <textarea
                  id="bio"
                  {...register("bio")}
                  rows={4}
                  className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                  placeholder="Tell us about yourself and your channel..."
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="px-6 rounded-3xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-6 rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                >
                  {loading ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
