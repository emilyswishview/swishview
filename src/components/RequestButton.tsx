import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ImprovedRaiseRequestForm from './ImprovedRaiseRequestForm';

interface RequestButtonProps {
  userId: string;
  className?: string;
  variant?: 'floating' | 'inline';
  requestType?: string;
}

const RequestButton = ({ 
  userId, 
  className, 
  variant = 'floating',
  requestType = 'general'
}: RequestButtonProps) => {
  const [requestFormOpen, setRequestFormOpen] = useState(false);

  if (variant === 'floating') {
    return (
      <>
        <Button
          onClick={() => setRequestFormOpen(true)}
          className={cn(
            "fixed bottom-20 sm:bottom-6 right-4 sm:right-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 z-40 bg-primary hover:bg-primary/90 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5",
            className
          )}
          title="Raise a Request"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Need Help?
        </Button>

        <ImprovedRaiseRequestForm
          userId={userId}
          isOpen={requestFormOpen}
          onClose={() => setRequestFormOpen(false)}
          requestType={requestType}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setRequestFormOpen(true)}
        variant="outline"
        className={cn("", className)}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Raise Request
      </Button>

      <ImprovedRaiseRequestForm
        userId={userId}
        isOpen={requestFormOpen}
        onClose={() => setRequestFormOpen(false)}
        requestType={requestType}
      />
    </>
  );
};

export default RequestButton;