import React, { useState } from 'react';
import { clsx } from 'clsx';
import { FaSearch, FaTimes } from 'react-icons/fa';
import Input from './Input';
/**
 * SearchInput Component
 * 
 * Reusable search input component with optional clear button and customizable styling
 * 
 * @param {Object} props - Component properties
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Callback when search value changes
 * @param {Function} props.onClear - Optional callback when clear button is clicked
 * @param {string} props.placeholder - Placeholder text for the input
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showClearButton - Whether to show clear button when there's text
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.size - Size variant ('small', 'medium', 'large')
 * @param {Object} props.icon - Custom search icon component
 * @param {string} props.ariaLabel - Accessibility label
 * @returns {JSX.Element} The search input component
 */
const SearchInput = ({
    value = '',
    onChange,
    onClear,
    placeholder = 'Buscar...',
    className = '',
    showClearButton = true,
    disabled = false,
    icon = <FaSearch />,
    ariaLabel = 'Campo de búsqueda',
    ...props
}) => {
    const [error, setError] = useState('');
    const allowedPattern = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]*$/;

    const handleChange = (e) => {
        const inputValue = e.target.value;

        if (!allowedPattern.test(inputValue)) {
            setError('Caracter no permitido');
            return;
        }

        setError(''); // limpia el error si se corrige
        if (onChange) onChange(e);
    };

    const handleClear = () => {
        if (onClear) {
            onClear();
        } else if (onChange) {
            const syntheticEvent = { target: { value: '' } };
            onChange(syntheticEvent);
        }
    };


    return (
        <div className={clsx('relative inline-flex flex-col', className)}>
            <div className="relative inline-flex items-center">
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                    <div className="text-gray-400 transition-colors w-4 h-4">
                        {icon}
                    </div>
                </div>

                <Input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    className={clsx(
                        'w-[350px]',
                        'h-[45px]',
                        'rounded-[20px]',
                        'pl-12',
                        'border-gray-300 focus:ring-2 focus:ring-primary-blue focus:border-b-primary-blue-hover',
                        showClearButton && value ? 'pr-12' : 'pr-8',
                        disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60',
                        error && 'border border-red-400  ring-red-200'
                    )}
                    {...props}
                />

                 
                {showClearButton && value && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:text-primary-blue z-10 w-4 h-4"
                        aria-label="Limpiar búsqueda"
                        title="Limpiar búsqueda"
                    >
                        <FaTimes />
                    </button>
                )}
            </div>

            {error && (
                <span className="text-red-500 text-sm mt-1 pl-2">
                    {error}
                </span>
            )}
        </div>
    );
};

export default SearchInput;
