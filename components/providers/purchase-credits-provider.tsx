'use client';

import React from 'react';
import { PurchaseCreditsPopup } from '@/components/credits/purchase-credits-popup';

interface PurchaseCreditsProviderProps {
  children: React.ReactNode;
}

export function PurchaseCreditsProvider({ children }: PurchaseCreditsProviderProps) {
  return (
    <>
      {children}
      <PurchaseCreditsPopup />
    </>
  );
}
