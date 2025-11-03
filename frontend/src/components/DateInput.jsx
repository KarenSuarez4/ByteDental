// src/components/DateInput.jsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const DateInput = ({ placeholder, className = '', error, ...props }) => {
  return (
    <input
      type="date"
      placeholder={placeholder}
      className={cn(
        'w-[310px]',
        'h-[48px]',
        'rounded-[40px]',
        'border',
        'bg-white',
        'text-gray-900',
        'text-18',
        'font-poppins',
        '!placeholder-gray-400',
        'px-8',
        'shadow-sm',
        'focus:outline-none',
        // Clases condicionales para el borde
        {
          'border-red-500 focus:border-red-500': error, // Borde rojo si hay error
          'border-gray-300 focus:border-primary-blue': !error, // Borde normal si no hay error
        },
        className
      )}
      {...props}
    />
  );
};

export default DateInput;
