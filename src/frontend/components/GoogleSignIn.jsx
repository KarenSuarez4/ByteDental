import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const GoogleSignIn = ({ onClick, className = '',...props }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-[338px]', 
        'h-[74px]',
        'rounded-[40px]',
        'bg-white',
        'border border-gray-300',
        'text-google-blue',
        'text-18',
        'font-poppins',
        'font-medium', 
        'cursor-pointer',
        'flex items-center justify-center',
        'space-x-4', // Espacio entre el logo y el texto
        'transition-colors duration-200',
        'hover:bg-gray-50', 
        className
      )}
      {...props}
    >
      <img src="./images/google-logo.png" alt="Google Logo" className="size-6" />
      <span>Iniciar sesión con Google</span>
    </button>
  );
};
export default GoogleSignIn;