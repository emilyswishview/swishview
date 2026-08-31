
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const RefundPolicy = () => {
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
            <h1 className="text-3xl font-bold text-gray-900">Cancellation & Refund</h1>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                You may request a cancellation within 7 days of purchasing a service. If services have 
                already been fully or partially delivered, refunds may be adjusted accordingly.
              </p>
              <p>
                Refunds are processed within 7 business days from approval. To request cancellation, email{" "}
                <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
                  support@swishview.com
                </a>{" "}
                with your order details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
