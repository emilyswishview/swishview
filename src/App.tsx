
import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import MobileBottomNav from "@/components/MobileBottomNav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { initSecurity } from "@/utils/security";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CreateCampaign from "./pages/CreateCampaign";
import Payment from "./pages/Payment";

import AdminDashboard from "./pages/AdminDashboard";
import AdminPanel from "./components/AdminPanel";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import Profile from "./pages/Profile";
import CreatePromotion from "./pages/CreatePromotion";
import CreateSEO from "./pages/CreateSEO";
import SEOHead from "./components/SEOHead";
import AdminDashboardNew from "./components/admin/AdminDashboard";
import Product from "./pages/Product";
import Pricing from "./pages/Pricing";
import Success from "./pages/Success";
import Partners from "./pages/Partners";
import Blogs from "./pages/Blogs";
import BlogPost from "./pages/BlogPost";
import CreatorBlog from "./pages/CreatorBlog";
import CreatorLanding from "./pages/CreatorLanding";
import BlogVideoPage from "./pages/BlogVideoPage";

import AIThumbnailGenerator from "./pages/AIThumbnailGenerator";
import Auth from "./pages/Auth";
import EmailTracker from "./pages/EmailTracker";
import BookAProject from "./pages/BookAProject";
import VideoPromotion from "./pages/VideoPromotion";
import ChannelOptimization from "./pages/ChannelOptimization";
import ChannelAudit from "./pages/ChannelAudit";
import BlogsManagement from "./pages/BlogsManagement";
import Tracker from "./pages/Tracker";
import Boost from "./pages/Boost";
import CampaignManagement from "./pages/CampaignManagement";
import ChildSafety from "./pages/ChildSafety";
import LegacyCreatorRedirect from "./components/LegacyCreatorRedirect";
import Reviews from "./pages/Reviews";
import Crm from "./pages/Crm";
import CrmLogin from "./pages/CrmLogin";
import Prospects from "./pages/Prospects";
import ProspectsLogin from "./pages/ProspectsLogin";
import EmailDeliverability from "./pages/EmailDeliverability";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  React.useEffect(() => {
    // Initialize security measures
    initSecurity();
  }, []);

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <BrowserRouter>
            <TooltipProvider>
              <SEOHead />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-conditions" element={<TermsConditions />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
          <Route path="/create-promotion" element={<CreatePromotion />} />
          <Route path="/create-campaign" element={<CreatePromotion />} /> {/* Legacy route */}
          <Route path="/edit-campaign/:campaignId" element={<CreatePromotion />} />
          <Route path="/create-seo" element={<CreateSEO />} />
                <Route path="/payment/:campaignId" element={<Payment />} />
                
                <Route path="/product" element={<Product />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/success" element={<Success />} />
                <Route path="/admin" element={<AdminDashboardNew />} />
                <Route path="/partners" element={<Partners />} />
        <Route path="/blogs" element={<Blogs />} />
        <Route path="/blogs/:creatorSlug/:postSlug/:videoSlug" element={<BlogVideoPage />} />
        <Route path="/blogs/:creatorSlug/:slug" element={<BlogPost />} />
        <Route path="/blogs/:creatorSlug" element={<CreatorLanding />} />
        
          <Route path="/ai" element={<AIThumbnailGenerator />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/email-tracker" element={<EmailTracker />} />
           <Route path="/bookaproject" element={<BookAProject />} />
           <Route path="/videopromotion" element={<VideoPromotion />} />
           <Route path="/channeloptimization" element={<ChannelOptimization />} />
           <Route path="/channelaudit" element={<ChannelAudit />} />
           <Route path="/blogs-management" element={<BlogsManagement />} />
           <Route path="/tracker" element={<Tracker />} />
           <Route path="/channel-growth" element={<Boost />} />
           <Route path="/boost" element={<Boost />} />
           <Route path="/campaign-management" element={<CampaignManagement />} />
           <Route path="/campaign-management/:userId" element={<CampaignManagement />} />
           <Route path="/child-safety" element={<ChildSafety />} />
           <Route path="/reviews" element={<Reviews />} />
           <Route path="/crm-login" element={<CrmLogin />} />
           <Route path="/crm" element={<Crm />} />
           <Route path="/prospects-login" element={<ProspectsLogin />} />
           <Route path="/prospects" element={<Prospects />} />
           <Route path="/email-check" element={<EmailDeliverability />} />
           <Route path="/email-deliverability" element={<Navigate to="/email-check" replace />} />
           {/* SEO redirects for legacy/short URLs */}
           <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
           <Route path="/terms" element={<Navigate to="/terms-conditions" replace />} />
           <Route path="/refund" element={<Navigate to="/refund-policy" replace />} />
           <Route path="/shipping" element={<Navigate to="/shipping-policy" replace />} />
           {/* Legacy /creator/* URLs → consolidated to /blogs/* (fixes Google soft 404s & duplicate canonicals) */}
           <Route path="/creator/:creatorSlug/:postSlug/:videoSlug" element={<LegacyCreatorRedirect type="video" />} />
           <Route path="/creator/:creatorSlug/:postSlug" element={<LegacyCreatorRedirect type="post" />} />
           <Route path="/creator/:creatorSlug" element={<LegacyCreatorRedirect type="creator" />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <MobileBottomNav />
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </BrowserRouter>
        </HelmetProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
