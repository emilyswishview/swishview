
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PolicyModal = ({ open, onOpenChange }: PolicyModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            SwishView Policy Document
          </DialogTitle>
          <DialogDescription className="sr-only">
            Complete policy document including privacy policy, terms and conditions, and other policies
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8 text-gray-700">
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              📄 1. Privacy Policy
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                Swishview is committed to protecting your privacy. We collect basic information like
                your name, email address, and YouTube channel details to provide our services. This
                data helps us deliver personalized support and improve your experience on our
                platform.
              </p>
              <p>
                We do not sell your data to third parties. All personal data is stored securely and used
                only for purposes related to your service. By using Swishview, you consent to this
                data usage.
              </p>
              <p>
                If you have any privacy concerns, you can reach us at{" "}
                <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
                  support@swishview.com
                </a>.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              📄 2. Terms and Conditions
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                Swishview helps YouTube content creators promote their videos to increase visibility
                and audience reach. You must provide accurate details and comply with YouTube
                policies.
              </p>
              <p>
                While we aim to improve your reach, we do not guarantee views or subscribers. All
                services are subject to fair use, and any attempt to misuse the platform may result in
                termination of service without notice.
              </p>
              <p>
                We reserve the right to suspend service for misuse or policy violations. These terms
                are governed by the laws of India.
              </p>
              <p>
                For any questions, contact{" "}
                <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
                  support@swishview.com
                </a>.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              📄 3. Cancellation and Refund Policy
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                You may request a cancellation within 7 days of purchasing a service from Swishview.
                If services have already been fully or partially delivered, refunds may be adjusted
                accordingly.
              </p>
              <p>
                Refunds will be issued within 7 business days from the date of approval. To request a
                refund or cancellation, please email{" "}
                <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
                  support@swishview.com
                </a>{" "}
                with your order details.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              📄 4. Shipping and Delivery Policy
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                Swishview offers only digital services and does not involve physical shipping. Once
                your order is confirmed, service activation typically begins within 24 hours.
              </p>
              <p>
                All updates and delivery communication will be done via email. If you do not receive a
                response within this timeframe, please reach out to{" "}
                <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
                  support@swishview.com
                </a>.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              📄 5. Contact Us
            </h3>
            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                For any questions, service inquiries, or support needs, you can contact us by email at{" "}
                <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
                  support@swishview.com
                </a>. We aim to respond within 12-24 hours on business days.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyModal;
