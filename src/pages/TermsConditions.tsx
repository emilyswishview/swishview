
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const TermsConditions = () => {
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
            <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                SwishView helps YouTube content creators promote their videos to increase visibility
                and audience reach. You must provide accurate details and comply with YouTube
                policies.
              </p>
              <p>
                While we aim to improve your reach, we do not guarantee views or subscribers. All
                services are subject to fair use, and any attempt to misuse the platform may result in
                termination of service without notice.
              </p>
              <p>
                These terms are governed by the laws of India.
              </p>
              <p>
                Contact:{" "}
                <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
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

export default TermsConditions;
