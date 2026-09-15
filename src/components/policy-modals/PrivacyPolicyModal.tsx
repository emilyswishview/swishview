
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PrivacyPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrivacyPolicyModal = ({ open, onOpenChange }: PrivacyPolicyModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Privacy Policy
          </DialogTitle>
          <DialogDescription className="sr-only">
            SwishView Privacy Policy
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
          <p>
            SwishView is committed to protecting your privacy. We collect basic information like
            your name, email address, and YouTube channel details to provide our services. This
            data helps us deliver personalized support and improve your experience on our
            platform.
          </p>
          <p>
            We do not sell your data to third parties. All personal data is stored securely and used
            only for purposes related to your service. By using SwishView, you consent to this
            data usage.
          </p>
          <p>
            Contact:{" "}
            <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
              support@swishview.com
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyPolicyModal;
