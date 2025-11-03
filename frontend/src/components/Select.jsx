import React, { Fragment, useId } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args) {
  return twMerge(clsx(args));
}

const Select = ({
  placeholder = "Seleccione una opción",
  children,
  className = '',
  error = false,
  value,
  onChange,
  name,
  disabled = false,
  size = "default", // ✅ Nueva prop para controlar altura mínima
  ...props
}) => {
  // Generar IDs únicos para accesibilidad
  const componentId = useId();
  const labelId = `${componentId}-label`;

  const sizeClasses = {
    small: 'min-h-[35px] py-0.5',
    default: 'min-h-[48px] py-3',
    large: 'min-h-[56px] py-4'
  };

  // Convertir children a array de opciones
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({
      value: child.props.value,
      label: child.props.children,
      disabled: child.props.disabled || child.props.value === ""
    }));

  // Encontrar la opción seleccionada
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const handleChange = (newValue) => {
    // Simular evento similar al select nativo
    const syntheticEvent = {
      target: {
        name: name,
        value: newValue
      }
    };
    onChange(syntheticEvent);
  };

  return (
    <div className={cn("relative w-full", className)}>
      {/* Label oculto para accesibilidad */}
      <label id={labelId} className="sr-only">
        {placeholder}
      </label>

      <Listbox value={value} onChange={handleChange} disabled={disabled}>
        {({ open }) => (
          <>
            <Listbox.Button
              className={cn(
                'w-full',
                sizeClasses[size],
                'rounded-[40px]',
                'border',
                'bg-white',
                !selectedOption ? 'text-gray-400' : 'text-gray-900',
                'text-18',
                'font-poppins',
                'px-4 sm:px-6 md:px-8',
                'shadow-sm',
                'focus:outline-none',
                'cursor-pointer',
                'flex items-center justify-between',
                'transition-all duration-200',
                {
                  'border-red-500 focus:border-red-500': error,
                  'border-gray-300 focus:border-primary-blue': !error,
                },
                'pr-12 sm:pr-14 md:pr-16',
                'py-3',
                disabled && 'opacity-60 cursor-not-allowed bg-gray-50'
              )}
              aria-labelledby={labelId}
              aria-invalid={error}
              aria-describedby={error ? `${componentId}-error` : undefined}
            >
              <span className="block flex-1 text-left leading-relaxed break-words min-w-0">
                {displayValue}
              </span>

              {/* Icono de flecha responsive */}
              <div className="absolute inset-y-0 right-3 sm:right-4 md:right-5 flex items-center pointer-events-none z-10 flex-shrink-0">
                <svg
                  className={cn(
                    'w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-all duration-200',
                    open && 'transform rotate-180 text-primary-blue',
                    !error && 'group-hover:text-primary-blue'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </Listbox.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Listbox.Options
                className={cn(
                  'absolute z-50 w-full mt-2',
                  'bg-white border-2 border-primary-blue rounded-2xl shadow-xl',
                  'max-h-60 sm:max-h-80 md:max-h-96 overflow-y-auto hide-scrollbar', // Altura responsive
                  'focus:outline-none',
                  'animate-in fade-in slide-in-from-top-2 duration-200',
                  'flex flex-col overflow-hidden'
                )}
              >
                {options.length === 0 ? (
                  <div className="px-3 sm:px-4 py-6 sm:py-8 text-center" role="status">
                    <svg
                      className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20a7.962 7.962 0 01-5-1.709M15 3H9a2 2 0 00-2 2v1.099l.797 2.389a1 1 0 00.783.656l2.88.863a2 2 0 001.08 0l2.88-.863a1 1 0 00.783-.656L17 6.099V5a2 2 0 00-2-2z" />
                    </svg>
                    <p className="text-gray-500 font-poppins text-14 sm:text-16 mb-1">No hay opciones disponibles</p>
                  </div>
                ) : (
                  options.map((option, optionIdx) => (
                    <Listbox.Option
                      key={optionIdx}
                      value={option.value}
                      disabled={option.disabled}
                      className={({ active, selected }) =>
                        cn(
                          'px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between transition-all border-b border-gray-50 last:border-b-0',
                          selected && 'bg-gradient-to-r from-primary-blue/10 to-header-blue/10 text-header-blue font-semibold border-l-4 border-l-primary-blue',
                          !selected && !option.disabled && active && 'bg-blue-50 text-header-blue cursor-pointer',
                          !selected && !option.disabled && !active && 'hover:bg-blue-50 hover:text-header-blue cursor-pointer',
                          option.disabled && 'text-gray-300 cursor-not-allowed bg-gray-25',
                          !selected && !option.disabled && optionIdx % 2 === 1 && !active && 'bg-gray-25'
                        )
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <div className="flex items-center flex-1 min-w-0">
                            <span className={cn(
                              "font-poppins text-14 sm:text-16 break-words leading-tight", // Texto responsive y break-words
                              selected && "font-semibold"
                            )}>
                              {option.label}
                            </span>
                          </div>
                          <div className="ml-2 sm:ml-3 flex-shrink-0" aria-hidden="true">
                            {selected ? (
                              <div className="bg-primary-blue rounded-full p-1">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : option.disabled ? (
                              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM4 10a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 rounded-full transition-colors border-gray-300 group-hover:border-primary-blue"></div>
                            )}
                          </div>
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  );
};

export default Select;
