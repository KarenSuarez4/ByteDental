import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-header-blue">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
    </div>
  );
};

export default LoadingScreen;