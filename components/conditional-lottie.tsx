'use client';

import LottiePlayer from '@/components/ui/lottie-player';
import { useMapLoading } from '@/components/map-loading-context';
import { useProfileToggle } from '@/components/profile-toggle-context'; // Added import
import { useUsageToggle } from '@/components/usage-toggle-context';

const ConditionalLottie = () => {
  const { isMapLoaded } = useMapLoading();
  const { activeView } = useProfileToggle(); // Added this line
  const { isUsageOpen } = useUsageToggle();

  // Updated isVisible logic to hide lottie when settings or usage is open
  return <LottiePlayer isVisible={!isMapLoaded && activeView === null && !isUsageOpen} />;
};

export default ConditionalLottie;
