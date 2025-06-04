'use client';

import LottiePlayer from '@/components/ui/lottie-player';
import { useMapLoading } from '@/components/map-loading-context';

const ConditionalLottie = () => {
  const { isMapLoaded, hasAppInitiallyLoaded } = useMapLoading();
  return <LottiePlayer isVisible={!isMapLoaded && !hasAppInitiallyLoaded} />;
};

export default ConditionalLottie;
