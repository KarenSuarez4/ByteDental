// src/components/ProgressBar.jsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from "framer-motion";

function cn(...args) {
  return twMerge(clsx(args));
}

const ProgressBar = ({ progress = 0, className = '' }) => {
  const isComplete = progress >= 100;

  return (
    <div className={cn('w-full max-w-[700px] mb-8', className)}>
      <div className="flex justify-between items-center mb-2">
        <span className={cn(
          "text-sm font-poppins",
          isComplete ? "text-teal-700" : "text-gray-600"
        )}>
          {isComplete ? "¡Registro completo!" : "Progreso del registro"}
        </span>
        <span className={cn(
          "text-sm font-poppins",
          isComplete ? "text-teal-700 font-semibold" : "text-gray-600"
        )}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={cn(
            "h-3 rounded-full transition-all duration-500 ease-out",
            isComplete ? "bg-teal-500" : "bg-primary-blue"
          )}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
