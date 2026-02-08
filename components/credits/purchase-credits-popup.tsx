'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { Check, Loader2 } from 'lucide-react';
import { TIER_CONFIGS, TIERS, Tier } from '@/lib/utils/subscription';
import { Badge } from '@/components/ui/badge';
import { useCredits } from './credits-provider';
import { toast } from 'sonner';

export function PurchaseCreditsPopup() {
  const { user } = useCurrentUser();
  const { refreshCredits } = useCredits();
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleUpgrade = async (tier: string) => {
    setLoading(true);
    try {
      const tierConfig = TIER_CONFIGS[tier as Tier];
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: tierConfig.priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to process upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const standardTier = TIER_CONFIGS[TIERS.STANDARD];
  const freeTier = TIER_CONFIGS[TIERS.FREE];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-background">
        <div className="grid md:grid-cols-2">
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
                 <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(TIERS.STANDARD)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Upgrade to Standard'
                    )}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
