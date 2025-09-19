import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const ProgressIndicator = ({ step = 1 }) => {
  const steps = [1, 2, 3];

  return (
    <div className="flex items-center space-x-4 mb-6">
      {steps.map((num) => (
        <div
          key={num}
          className={cn(
            'size-10', 
            'rounded-full',
            'flex items-center justify-center',
            'transition-colors duration-200',
            {
              'bg-primary-blue border !border-primary-blue !text-white': num === step, // Paso activo
              'bg-white border border-primary-blue text-primary-blue': num!== step, // Pasos inactivos
            }
          )}
        >
          {num}
        </div>
      ))}
    </div>
  );
};

export default ProgressIndicator;