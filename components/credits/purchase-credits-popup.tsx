'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/v0/use-auth';
import { Check, Loader2 } from 'lucide-react';
import { TIER_CONFIGS, TIERS, TierConfig } from '@/lib/utils/subscription';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const COOLDOWN_DAYS = 7;
const STORAGE_KEY = 'purchase_credits_popup_shown_date';

export function PurchaseCreditsPopup() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;

    // Delay slightly to not interfere with initial load
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleUpgrade = (tier: string) => {
      // Redirect to Stripe checkout
      const stripeUrl = 'https://buy.stripe.com/3cIaEX3tRcur9EM7ss';
      window.open(stripeUrl, '_blank');
      setIsOpen(false);
  }

  const standardTier = TIER_CONFIGS[TIERS.STANDARD];
  const freeTier = TIER_CONFIGS[TIERS.FREE];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-background">
        <div className="grid md:grid-cols-2">
            {/* Free Tier */}
            <div className="p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
                <div>
                    <div className="mb-4">
                        <h3 className="text-xl font-semibold mb-1">{freeTier.name}</h3>
                        <p className="text-muted-foreground text-sm">For casual exploration</p>
                    </div>
                    <div className="mb-6">
                         <span className="text-3xl font-bold">$0</span>
                         <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                        <li className="flex items-center text-sm">
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            <span>Basic Access</span>
                        </li>
                         <li className="flex items-center text-sm">
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            <span>Standard Community Support</span>
                        </li>
                    </ul>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
                    Continue with Free
                </Button>
            </div>

            {/* Standard Tier */}
            <div className="p-6 md:p-8 flex flex-col justify-between bg-muted/30 relative">
                <div className="absolute top-0 right-0 p-4">
                     <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">Recommended</Badge>
                </div>
                <div>
                     <div className="mb-4">
                        <h3 className="text-xl font-semibold mb-1">{standardTier.name}</h3>
                         <p className="text-muted-foreground text-sm">For power users</p>
                    </div>
                    <div className="mb-6">
                         <span className="text-3xl font-bold">${standardTier.price}</span>
                         <span className="text-muted-foreground text-sm">/{standardTier.billingCycle === 'monthly' ? 'mo' : 'mo (billed yearly)'}</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                         <li className="flex items-center text-sm">
                            <Check className="h-4 w-4 mr-2 text-primary" />
                            <span>{standardTier.credits.toLocaleString()} Credits</span>
                        </li>
                        <li className="flex items-center text-sm">
                            <Check className="h-4 w-4 mr-2 text-primary" />
                            <span>Priority Support</span>
                        </li>
                         <li className="flex items-center text-sm">
                            <Check className="h-4 w-4 mr-2 text-primary" />
                            <span>Access to Advanced Models</span>
                        </li>
                    </ul>
                </div>
                 <Button className="w-full" onClick={() => handleUpgrade(TIERS.STANDARD)}>
                    Upgrade to Standard
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
