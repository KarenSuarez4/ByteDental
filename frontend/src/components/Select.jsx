import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const Select = ({ placeholder, children, className = '', error, value, ...props }) => {
  const isPlaceholder = value === "";
  return (
    <select
      className={cn(
        'w-[338px]',
        'h-[74px]',
        'rounded-[40px]',
        'border',
        'bg-white',
        isPlaceholder ? '!text-gray-400' : '!text-gray-900',
        'text-18',
        'font-poppins',
        'px-8',
        'shadow-sm',
        'focus:outline-none',
        'appearance-none', 
        'bg-right-8 bg-no-repeat',
        {
          'border-red-500 focus:border-red-500': error,
          'border-gray-300 focus:border-primary-blue': !error,
        },
        'pr-9',
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236B7280'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
        backgroundSize: '1.5rem',
        backgroundPosition: 'right 2rem center'
      }}
      value={value}
      {...props}
    >
      <option value="" disabled hidden>{placeholder}</option>
      {children}
    </select>
  );
};

export default Select;
