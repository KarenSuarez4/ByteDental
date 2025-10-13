import React from "react";

const Header = () => {
  return (
    <header className="w-full h-[94px] bg-header-blue flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-center w-full max-w-7xl">
        <img
          src="./images/bytedental-logo.png"
          alt="ByteDental Logo"
          className="h-16 sm:h-20 lg:h-24 w-auto object-contain max-w-full"
        />
      </div>
    </header>
  );
};

export default Header;