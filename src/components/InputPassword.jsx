import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const InputPassword = ({ placeholder, className = '', error,...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) =>!prev);
  };

  return (
    <div className={cn('relative w-[338px]', className)}>
      <input
        type={showPassword? 'text' : 'password'}
        placeholder={placeholder}
        className={cn(
          'w-full',
          'h-[74px]',
          'rounded-[40px]',
          'border',
          'bg-white',
          'text-gray-900',
          'text-18',
          'font-poppins',
          '!placeholder-gray-400',
          'pl-8 pr-16',
          'shadow-sm',
          'focus:outline-none',
          {
            'border-red-500 focus:border-red-500': error,
            'border-gray-300 focus:border-primary-blue':!error,
          }
        )}
        {...props}
      />
      <button
        type="button" // Es importante que sea tipo "button" para no enviar formularios
        onClick={togglePasswordVisibility}
        className="absolute inset-y-0 right-0 pr-6 flex items-center text-sm leading-5 focus:outline-none"
      >
        <img
          src={showPassword? './images/eye-closed.svg' : './images/open-eye.svg'}
          alt={showPassword? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="size-8" 
        />
      </button>
    </div>
  );
};

export default InputPassword;