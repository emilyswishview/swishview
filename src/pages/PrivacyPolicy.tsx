import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                SwishView (“we,” “our,” or “us”) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, and safeguard your information 
                when you use our services.
              </p>

              <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
              <p>
                We may collect the following information when you use our platform:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Your name and email address (via Google Sign-In)</li>
                <li>YouTube channel details (channel name, profile image, subscriber count, views, watch hours, etc.)</li>
                <li>Basic usage data to improve our services</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
              <p>
                The data we collect is used only to:
              </p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Display personalized YouTube analytics in your SwishView dashboard</li>
                <li>Provide SEO and growth insights for your channel</li>
                <li>Improve the functionality and experience of our platform</li>
              </ul>

              <h2 className="text-xl font-semibold text-gray-900">3. Data Sharing & Security</h2>
              <p>
                We do not sell or rent your data to third parties. Your information is stored securely and 
                accessed only to provide you with services. All access to YouTube data is strictly read-only 
                as permitted by the scope <code>youtube.readonly</code>.
              </p>

              <h2 className="text-xl font-semibold text-gray-900">4. Data Retention</h2>
              <p>
                We retain your data only as long as necessary to provide our services. 
                You may revoke our access at any time from your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  Google Account settings
                </a>.
              </p>

              <h2 className="text-xl font-semibold text-gray-900">5. Your Rights</h2>
              <p>
                You can request access, correction, or deletion of your data by contacting us. 
                You also have the right to withdraw consent at any time by disconnecting SwishView 
                from your Google account.
              </p>

              <h2 className="text-xl font-semibold text-gray-900">6. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or how your data is handled, 
                please contact us at:{" "}
                <a
                  href="mailto:support@swishview.com"
                  className="text-orange-500 hover:underline"
                >
                  support@swishview.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
