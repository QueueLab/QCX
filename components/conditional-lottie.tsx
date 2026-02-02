'use client';

import LottiePlayer from '@/components/ui/lottie-player';
import { useMapLoading } from '@/components/map-loading-context';
import { useProfileToggle } from '@/components/profile-toggle-context'; // Added import

const ConditionalLottie = () => {
  const { isMapLoaded } = useMapLoading();
  const { activeView } = useProfileToggle(); // Added this line

  // Updated isVisible logic
  return <LottiePlayer isVisible={!isMapLoaded && activeView === null} />;
};

export default ConditionalLottie;
