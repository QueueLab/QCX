'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Zap, Check } from 'lucide-react';

interface PurchaseCreditsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseCreditsPopup({ isOpen, onClose }: PurchaseCreditsPopupProps) {
  const handlePurchase = () => {
    window.open('https://buy.stripe.com/3cIaEX3tRcur9EM7tbasg00', '_blank');
    onClose();
  };

  const features = [
    'Internet Search',
    'Upload and analyze unlimited files',
    'Mapping tools',
    'Location Intelligence',
    'Community Support',
    'Exclusive Updates',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="text-yellow-500" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            You&apos;ve reached your credit limit. Upgrade now to continue using all features seamlessly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium">Standard Tier</p>
              <p className="font-bold">$500/year</p>
            </div>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check size={14} className="text-green-500 mt-1 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Later</Button>
          <Button onClick={handlePurchase} className="gap-2">
            <CreditCard size={16} />
            Pay Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
