import React from "react";

const Header = () => {
  return (
    <header className="w-full h-[94px] bg-header-blue flex items-center justify-center">
      <img
        src="./images/bytedental-logo.png"
        alt="ByteDental Logo"
        className="max-h-[100%] w-auto object-contain"
      />
    </header>
  );
};

export default Header;