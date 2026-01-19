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
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { Check, Loader2 } from 'lucide-react';
import { TIER_CONFIGS, TIERS, TierConfig } from '@/lib/utils/subscription';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { loadStripe } from '@stripe/stripe-js';

// Use sessionStorage so it resets when the tab is closed, 
// allowing the popup to show again on next visit/login.
const STORAGE_KEY = 'purchase_credits_popup_shown_session';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PurchaseCreditsPopupProps {
  isOpenExternal?: boolean;
  setIsOpenExternal?: (isOpen: boolean) => void;
}

export function PurchaseCreditsPopup({ isOpenExternal, setIsOpenExternal }: PurchaseCreditsPopupProps = {}) {
  const { user, loading: authLoading } = useCurrentUser();
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Determine which state controls the dialog
  const isControlled = isOpenExternal !== undefined && setIsOpenExternal !== undefined;
  const isOpen = isControlled ? isOpenExternal : internalIsOpen;
  const setIsOpen = isControlled ? setIsOpenExternal : setInternalIsOpen;

  React.useEffect(() => {
    // If controlled externally (e.g. by header button), skip the auto-popup logic
    if (isControlled) return;

    // If auth is still loading or no user, do nothing yet.
    if (authLoading || !user) return;

    // Check if we already showed it this session
    const alreadyShown = sessionStorage.getItem(STORAGE_KEY);
    if (alreadyShown) {
      console.log('Purchase popup already shown this session.');
      return;
    }

    console.log('Scheduling purchase popup...');
    
    // Delay slightly to not interfere with initial load
    const timer = setTimeout(() => {
      console.log('Showing purchase popup now.');
      setIsOpen(true);
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, authLoading, isControlled, setIsOpen]);

  const handleUpgrade = async (tier: string) => {
      setLoading(true);
      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // You should store your Price IDs in env vars or a config file
            priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID, 
            returnUrl: window.location.href,
          }),
        });

        const { url, error } = await response.json();

        if (error) {
          console.error('Checkout error:', error);
          // Show error toast or message
          return;
        }

        if (url) {
          window.location.href = url;
        }
      } catch (err) {
        console.error('Error initiating checkout:', err);
      } finally {
        setLoading(false);
      }
  }

  const standardTier = TIER_CONFIGS[TIERS.STANDARD];
  const freeTier = TIER_CONFIGS[TIERS.FREE];

  // If we are in "auto mode" (not controlled), don't render if no user
  // If controlled (clicked button), we might want to show it even if user state is loading (though likely they are logged in if they see the button)
  if (!isControlled && !user) return null;

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
                 <Button className="w-full" onClick={() => handleUpgrade(TIERS.STANDARD)} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    Upgrade to Standard
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
