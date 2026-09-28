
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RefundPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RefundPolicyModal = ({ open, onOpenChange }: RefundPolicyModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Cancellation & Refund
          </DialogTitle>
          <DialogDescription className="sr-only">
            SwishView Cancellation and Refund Policy
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
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
      </DialogContent>
    </Dialog>
  );
};

export default RefundPolicyModal;
