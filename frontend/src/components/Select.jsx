import React, { Fragment } from 'react';
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
  error,
  value,
  onChange,
  name,
  disabled = false,
  ...props
}) => {
  // Convertir children a array de opciones
  const options = React.Children.toArray(children)
    .filter(child => React.isValidElement(child) && child.type === 'option')
    .map(child => ({
      value: child.props.value,
      label: child.props.children
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
    <div className={cn("relative w-[310px]", className)}>
      <Listbox value={value} onChange={handleChange} disabled={disabled}>
        {({ open }) => (
          <>
            <Listbox.Button
              className={cn(
                'relative w-full',
                'h-[48px]',
                'rounded-[40px]',
                'border',
                'bg-white',
                !selectedOption ? 'text-gray-400' : 'text-gray-600',
                'text-18',
                'font-poppins',
                'px-8',
                'shadow-sm',
                'focus:outline-none',
                'text-left',
                'cursor-pointer',
                'transition-all duration-200',
                {
                  'border-red-500 focus:ring-2 focus:ring-red-200': error,
                  'border-gray-300 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20': !error && !disabled,
                  'bg-gray-100 cursor-not-allowed opacity-60': disabled,
                },
                'pr-12'
              )}
            >
              <span className="block truncate pr-2">{displayValue}</span>

              {/* Flecha personalizada */}
              <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    open ? "transform rotate-180 text-primary-blue" : "text-gray-400"
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className={cn(
                  'absolute z-50 mt-2 w-full',
                  'max-h-60 overflow-auto',
                  'rounded-2xl',
                  'bg-white',
                  'py-2',
                  'shadow-lg ring-1 ring-black ring-opacity-5',
                  'focus:outline-none',
                  'text-18 font-poppins', // Reducido de text-18 a text-16
                  'hide-scrollbar'
                )}
              >
                {options.map((option, optionIdx) => (
                  <Listbox.Option
                    key={optionIdx}
                    value={option.value}
                    disabled={option.value === ""}
                    className={({ active, selected }) =>
                      cn(
                        'relative cursor-pointer select-none py-3 px-8',
                        'transition-colors duration-150',
                        'min-h-[44px]', // Altura mínima para opciones largas
                        {
                          'bg-primary-blue/10 text-primary-blue': active && !selected,
                          'bg-primary-blue text-white font-semibold': selected,
                          'text-gray-600': !active && !selected,
                          'cursor-not-allowed opacity-50': option.value === "",
                        }
                      )
                    }
                  >
                    {({ selected, active }) => (
                      <div className="flex items-start justify-between gap-3">
                        <span className={cn(
                          'block flex-1 leading-snug', // Cambiado de truncate a leading-snug
                          'break-words', // Permite el salto de línea
                          selected ? 'font-semibold' : 'font-normal'
                        )}>
                          {option.label}
                        </span>
                        {selected && (
                          <svg
                            className="w-5 h-5 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  );
};

export default Select;
