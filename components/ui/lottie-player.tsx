'use client';

import Lottie from 'lottie-react';
import animationData from '@/public/images/Q zoom.json';

interface LottiePlayerProps {
  isVisible: boolean;
}

const LottiePlayer: React.FC<LottiePlayerProps> = ({ isVisible }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-screen h-screen flex justify-center items-center bg-background/80 backdrop-blur-lg md:backdrop-blur-sm z-[9999]">
      <Lottie animationData={animationData} style={{ width: 300, height: 300 }} loop={true} />
    </div>
  );
};

export default LottiePlayer;
