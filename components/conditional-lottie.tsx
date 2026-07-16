'use client';

import LottiePlayer from '@/components/ui/lottie-player';
import { useMapLoading } from '@/components/map-loading-context';
import { useProfileToggle } from '@/components/profile-toggle-context'; // Added import
import { useUsageToggle } from '@/components/usage-toggle-context';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ConditionalLottie = () => {
  const pathname = usePathname();
  const { isMapLoaded } = useMapLoading();
  const { activeView } = useProfileToggle(); // Added this line
  const { isUsageOpen } = useUsageToggle();
  const [isPlaywright, setIsPlaywright] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isTest = Boolean(
        navigator.webdriver ||
        navigator.userAgent.toLowerCase().includes('playwright') ||
        (window as any).isPlaywright ||
        process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === 'true'
      );
      setIsPlaywright(isTest);
    }
  }, []);

  const isAuthPage = pathname?.startsWith('/sign-in') ||
                     pathname?.startsWith('/discord-auth') ||
                     pathname?.startsWith('/auth/discord') ||
                     pathname?.startsWith('/sso-callback');

  if (isPlaywright || isAuthPage) {
    return null;
  }

  // Updated isVisible logic
  return <LottiePlayer isVisible={!isMapLoaded && activeView === null && !isUsageOpen} />;
};

export default ConditionalLottie;
