import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const Button = ({ children, onClick, className = '',...props }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-[300px]', 
        'h-[48px]',
        'rounded-[40px]', 
        'bg-primary-blue', 
        '!text-white', 
        'text-24', 
        'font-poppins', 
        'font-normal', 
        'border-none', 
        'cursor-pointer', 
        'flex items-center justify-center', 
        'transition-colors duration-200', 
        'hover:bg-primary-blue-hover', 
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;