import React from "react";

const Header = () => {
  return (
    <header className="w-full h-[145px] bg-header-blue flex items-center justify-center">
      <img
        src="./images/bytedental-logo.png"
        alt="ByteDental Logo"
        className="max-h-[120%] w-auto object-contain"
      />
    </header>
  );
};

export default Header;