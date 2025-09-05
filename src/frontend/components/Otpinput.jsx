import React, { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const OtpInput = ({ length = 4, onComplete }) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (/[^0-9]/.test(value)) {
      return; 
    }

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Mueve el foco al siguiente input
    if (value && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    // Llama a onComplete si todos los campos están llenos
    if (newOtp.every(digit => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (e, index) => {
    // Maneja el retroceso (backspace) para mover el foco hacia atrás
    if (e.key === 'Backspace' &&!otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').trim();
    if (pasteData.length === length && /^\d+$/.test(pasteData)) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      onComplete(pasteData);
    }
  };

  return (
    <div className="flex justify-center space-x-4">
      {otp.map((digit, index) => (
        <input
          key={index}
          type="text"
          maxLength="1"
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          ref={(el) => (inputRefs.current[index] = el)}
          className={cn(
            'w-16 h-16', 
            'border-b-2', 
            'text-center',
            'text-4xl', 
            'font-poppins',
            'focus:outline-none',
            'bg-transparent', 
            'border-gray-300 focus:border-primary-blue',
            'caret-primary-blue'
          )}
        />
      ))}
    </div>
  );
};

export default OtpInput;