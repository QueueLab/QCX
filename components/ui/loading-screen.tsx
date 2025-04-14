import React from 'react';
import Lottie from 'react-lottie';
import animationData from '../../public/images/Q zoom.json';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  };

  return (
    <div style={{ display: isLoading ? 'block' : 'none' }}>
      <Lottie options={defaultOptions} height={400} width={400} />
    </div>
  );
};

export default LoadingScreen;
