
// /home/ubuntu/components/ui/loading-screen.tsx
"use client";

import React from "react";
import Lottie from "lottie-react";
// Assuming Qzoom.lottie is in the public folder or accessible via this path.
// If not, this path will need to be adjusted.
import qzoomAnimation from "../../../public/Qzoom.lottie"; // Placeholder path

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.9)", // Semi-transparent white background
        zIndex: 9999, // Ensure it's on top
      }}
    >
      <div style={{ width: 300, height: 300 }}>
        <Lottie animationData={qzoomAnimation} loop={true} />
      </div>
    </div>
  );
};

export default LoadingScreen;

