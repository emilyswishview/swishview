import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import MobileBottomNav from "@/components/MobileBottomNav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { initSecurity } from "@/utils/security";
import SEOHead from "./components/SEOHead";

// Landing page stays eagerly bundled: it is the LCP-critical entry route.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Everything else is code-split so the initial download only contains
// what the current route actually needs.
const lazyPage = (loader: () => Promise<{ default: React.ComponentType<any> }>) =>
  React.lazy(loader);

const Login = lazyPage(() => import("./pages/Login"));
const Signup = lazyPage(() => import("./pages/Signup"));
const ForgotPassword = lazyPage(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyPage(() => import("./pages/ResetPassword"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const Payment = lazyPage(() => import("./pages/Payment"));
const Contact = lazyPage(() => import("./pages/Contact"));
const PrivacyPolicy = lazyPage(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazyPage(() => import("./pages/TermsConditions"));
const RefundPolicy = lazyPage(() => import("./pages/RefundPolicy"));
const ShippingPolicy = lazyPage(() => import("./pages/ShippingPolicy"));
const Profile = lazyPage(() => import("./pages/Profile"));
const CreatePromotion = lazyPage(() => import("./pages/CreatePromotion"));
const CreateSEO = lazyPage(() => import("./pages/CreateSEO"));
const RequestCallback = lazyPage(() => import("./pages/RequestCallback"));
const CallingAgent = lazyPage(() => import("./pages/CallingAgent"));
const AdminDashboardNew = lazyPage(() => import("./components/admin/AdminDashboard"));
const Product = lazyPage(() => import("./pages/Product"));
const Pricing = lazyPage(() => import("./pages/Pricing"));
const Success = lazyPage(() => import("./pages/Success"));
const Partners = lazyPage(() => import("./pages/Partners"));
const Blogs = lazyPage(() => import("./pages/Blogs"));
const BlogPost = lazyPage(() => import("./pages/BlogPost"));
const CreatorLanding = lazyPage(() => import("./pages/CreatorLanding"));
const BlogVideoPage = lazyPage(() => import("./pages/BlogVideoPage"));
const AIThumbnailGenerator = lazyPage(() => import("./pages/AIThumbnailGenerator"));
const Auth = lazyPage(() => import("./pages/Auth"));
const EmailTracker = lazyPage(() => import("./pages/EmailTracker"));
const BookAProject = lazyPage(() => import("./pages/BookAProject"));
const VideoPromotion = lazyPage(() => import("./pages/VideoPromotion"));
const ChannelOptimization = lazyPage(() => import("./pages/ChannelOptimization"));
const ChannelAudit = lazyPage(() => import("./pages/ChannelAudit"));
const BlogsManagement = lazyPage(() => import("./pages/BlogsManagement"));
const Tracker = lazyPage(() => import("./pages/Tracker"));
const Boost = lazyPage(() => import("./pages/Boost"));
const CampaignManagement = lazyPage(() => import("./pages/CampaignManagement"));
const ChildSafety = lazyPage(() => import("./pages/ChildSafety"));
const LegacyCreatorRedirect = lazyPage(() => import("./components/LegacyCreatorRedirect"));
const Reviews = lazyPage(() => import("./pages/Reviews"));
const WhySwishView = lazyPage(() => import("./pages/WhySwishView"));
const Crm = lazyPage(() => import("./pages/Crm"));
const Roadmap = lazyPage(() => import("./pages/Roadmap"));
const Report = lazyPage(() => import("./pages/Report"));
const CrmLogin = lazyPage(() => import("./pages/CrmLogin"));
const Prospects = lazyPage(() => import("./pages/Prospects"));
const ProspectsLogin = lazyPage(() => import("./pages/ProspectsLogin"));
const PhoneFinder = lazyPage(() => import("./pages/PhoneFinder"));
const EmailDeliverability = lazyPage(() => import("./pages/EmailDeliverability"));
const SEOManager = lazyPage(() => import("./pages/SEOManager"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="p-8 text-sm text-muted-foreground">Loading…</div>
);

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
              <React.Suspense fallback={<RouteFallback />}>
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
                  <Route path="/request-callback" element={<RequestCallback />} />
                  <Route path="/book-consultation" element={<Navigate to="/request-callback" replace />} />
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
                  <Route path="/whyswishview" element={<WhySwishView />} />
                  <Route path="/crm-login" element={<CrmLogin />} />
                  <Route path="/crm" element={<Crm />} />
                  <Route path="/roadmap/:slug" element={<Roadmap />} />
                  <Route path="/report/:slug" element={<Report />} />
                  <Route path="/calling" element={<CallingAgent />} />
                  <Route path="/prospects-login" element={<ProspectsLogin />} />
                  <Route path="/prospects" element={<Prospects />} />
                  <Route path="/prospects/leads" element={<Prospects />} />
                  <Route path="/prospects/unqualified" element={<Prospects />} />
                  <Route path="/prospects/banned" element={<Prospects />} />
                  <Route path="/prospects/calling" element={<Prospects />} />
                  <Route path="/prospects/queue" element={<Prospects />} />
                  <Route path="/prospects/bounces" element={<Prospects />} />
                  <Route path="/seo" element={<SEOManager />} />
                  <Route path="/email-check" element={<EmailDeliverability />} />
                  <Route path="/email-deliverability" element={<Navigate to="/email-check" replace />} />
                  <Route path="/phone" element={<PhoneFinder />} />

                  {/* SEO redirects for legacy/short URLs */}
                  <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
                  <Route path="/terms" element={<Navigate to="/terms-conditions" replace />} />
                  <Route path="/refund" element={<Navigate to="/refund-policy" replace />} />
                  <Route path="/shipping" element={<Navigate to="/shipping-policy" replace />} />
                  {/* Legacy /creator/* URLs → consolidated to /blogs/* */}
                  <Route path="/creator/:creatorSlug/:postSlug/:videoSlug" element={<LegacyCreatorRedirect type="video" />} />
                  <Route path="/creator/:creatorSlug/:postSlug" element={<LegacyCreatorRedirect type="post" />} />
                  <Route path="/creator/:creatorSlug" element={<LegacyCreatorRedirect type="creator" />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </React.Suspense>
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
