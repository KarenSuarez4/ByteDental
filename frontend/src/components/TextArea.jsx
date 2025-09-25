import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const TextArea = React.forwardRef(({
  className,
  error,
  ...props
}, ref) => {
  return (
    <textarea
      className={cn(
        'w-full',
        'rounded-[12px]',
        'border',
        'bg-white',
        'text-gray-900',
        'text-18',
        'font-poppins',
        '!placeholder-gray-400',
        'px-4',
        'py-3',
        'shadow-sm',
        'focus:outline-none',
        'disabled:cursor-not-allowed', 
        'disabled:opacity-50',
        // Clases condicionales para el borde
        {
          'border-red-500 focus:border-red-500': error, // Borde rojo si hay error
          'border-gray-300 focus:border-primary-blue': !error, // Borde normal si no hay error
        },
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

TextArea.displayName = "TextArea";

export default TextArea;