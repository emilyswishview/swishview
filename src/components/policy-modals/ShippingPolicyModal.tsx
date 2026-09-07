
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShippingPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShippingPolicyModal = ({ open, onOpenChange }: ShippingPolicyModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Shipping & Delivery
          </DialogTitle>
          <DialogDescription className="sr-only">
            SwishView Shipping and Delivery Policy
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
          <p>
            SwishView offers only digital services and does not involve physical shipping. Service 
            activation typically begins within 24 hours of order confirmation.
          </p>
          <p>
            All delivery communication is done via email. If you don't receive a response within this 
            timeframe, contact{" "}
            <a href="mailto:support@swishview.com" className="text-orange-500 hover:underline">
              support@swishview.com
            </a>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingPolicyModal;
