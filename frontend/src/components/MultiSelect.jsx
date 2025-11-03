import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Button from './Button';
import { FaCheck, FaTrashAlt } from "react-icons/fa";


function cn(...args) {
  return twMerge(clsx(args));
}

const MultiSelect = ({
  placeholder,
  options = [],
  value = [],
  onChange,
  className = '',
  error = false,
  name,
  maxSelections = null,
  disabled = false,
  exclusiveOptions = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listboxRef = useRef(null);

  // Generar IDs únicos para accesibilidad
  const componentId = useId();
  const listboxId = `${componentId}-listbox`;
  const inputId = `${componentId}-input`;
  const labelId = `${componentId}-label`;

  // Memoizar opciones filtradas
  const filteredOptions = useMemo(() =>
    options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    ), [options, searchTerm]
  );

  // Memoizar etiquetas seleccionadas
  const selectedLabels = useMemo(() =>
    value.map(val => {
      const option = options.find(opt => opt.value === val);
      return option ? option.label : val;
    }),
    [value, options]
  );

  // Estados derivados memorizados
  const { hasSelections, isMaxReached, isSingleSelection, hasExclusiveSelected } = useMemo(() => ({
    hasSelections: selectedLabels.length > 0,
    isMaxReached: maxSelections ? value.length >= maxSelections : false,
    isSingleSelection: selectedLabels.length === 1,
    hasExclusiveSelected: value.some(val => exclusiveOptions.includes(val))
  }), [selectedLabels.length, maxSelections, value, exclusiveOptions]);

  // Función para verificar si una opción está deshabilitada
  const isOptionDisabled = useCallback((optionValue, option) => {
    if (option.disabled) return true;
    if (value.includes(optionValue)) return false;

    const hasExclusiveSelected = value.some(val => exclusiveOptions.includes(val));

    if (hasExclusiveSelected && !exclusiveOptions.includes(optionValue)) {
      return true;
    }

    if (exclusiveOptions.includes(optionValue) && value.length > 0 && !value.includes(optionValue)) {
      return true;
    }

    if (maxSelections && value.length >= maxSelections) {
      return true;
    }

    return false;
  }, [value, exclusiveOptions, maxSelections]);

  // Manejar toggle de opciones
  const handleOptionToggle = useCallback((optionValue) => {
    if (disabled) return;

    let newValue = [];

    if (value.includes(optionValue)) {
      newValue = value.filter(v => v !== optionValue);
    } else if (exclusiveOptions.includes(optionValue)) {
      newValue = [optionValue];
    } else {
      const hasExclusiveSelected = value.some(val => exclusiveOptions.includes(val));
      if (hasExclusiveSelected) {
        newValue = [optionValue];
      } else if (maxSelections && value.length >= maxSelections) {
        newValue = [...value];
      } else {
        newValue = [...value, optionValue];
      }
    }

    if (onChange) {
      onChange({ target: { name, value: newValue } });
    }
  }, [disabled, value, exclusiveOptions, maxSelections, name, onChange]);

  // Manejar limpiar todas las selecciones
  const handleClearAll = useCallback((e) => {
    e.stopPropagation();
    if (disabled) return;

    if (onChange) {
      onChange({ target: { name, value: [] } });
    }
  }, [disabled, name, onChange]);

  // Navegación por teclado
  const handleKeyDown = useCallback((e) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const nextIndex = activeIndex < filteredOptions.length - 1 ? activeIndex + 1 : 0;
          setActiveIndex(nextIndex);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const prevIndex = activeIndex > 0 ? activeIndex - 1 : filteredOptions.length - 1;
          setActiveIndex(prevIndex);
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          const activeOption = filteredOptions[activeIndex];
          if (!isOptionDisabled(activeOption.value, activeOption)) {
            handleOptionToggle(activeOption.value);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
          setActiveIndex(-1);
          setSearchTerm('');
        }
        break;

      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;

      case 'End':
        if (isOpen) {
          e.preventDefault();
          setActiveIndex(filteredOptions.length - 1);
        }
        break;

      default:
        // Para búsqueda por tipeo
        if (isOpen && e.key.length === 1) {
          setSearchTerm(prev => prev + e.key);
        }
        break;
    }
  }, [disabled, isOpen, activeIndex, filteredOptions, isOptionDisabled, handleOptionToggle]);

  // Función para manejar el click del campo principal
  const handleFieldClick = useCallback(() => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  }, [disabled, isOpen]);

  // Función para manejar el cambio del input de búsqueda
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Función para cerrar el dropdown
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Manejar clics fuera del componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Resetear índice activo cuando cambian las opciones filtradas
  useEffect(() => {
    if (activeIndex >= filteredOptions.length) {
      setActiveIndex(-1);
    }
  }, [activeIndex, filteredOptions.length]);

  // Enfocar entrada cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Función para generar tooltip
  const getTooltipText = useCallback((isDisabled, isSelected, isExclusive, hasExclusiveSelected, label) => {
    if (isDisabled && !isSelected) {
      if (hasExclusiveSelected) {
        return "Opción bloqueada por selección exclusiva";
      }
      if (isExclusive) {
        return "Esta opción excluye otras selecciones";
      }
      return "Opción no disponible";
    }
    return label;
  }, []);

  return (
    <div className={cn('relative w-full ', className)} ref={dropdownRef}>
      {/* Label oculto para accesibilidad */}
      <label id={labelId} className="sr-only ">
        {placeholder}
      </label>

      {/* Campo principal */}
      <div
        className={cn(
          'w-full',
          selectedLabels.length > 3 ? 'min-h-[60px]' : 'min-h-[48px]', // Altura dinámica
          'max-h-[120px]', // Altura máxima para evitar que crezca demasiado
          'rounded-[40px]',
          'border',
          'bg-white',
          !hasSelections ? 'text-gray-400' : 'text-gray-900',
          'text-18',
          'font-poppins',
          'px-4 sm:px-6 md:px-8',
          'shadow-sm',
          'focus:outline-none',
          'cursor-pointer',
          'flex items-center justify-between',
          {
            'border-red-500 focus:border-red-500': error,
            'border-gray-300 focus:border-primary-blue': !error,
          },
          'pr-16 sm:pr-14 md:pr-12',
          'py-3',
          disabled && 'opacity-60 cursor-not-allowed bg-gray-50'
        )}
        onClick={handleFieldClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={labelId}
        aria-activedescendant={
          isOpen && activeIndex >= 0
            ? `${componentId}-option-${activeIndex}`
            : undefined
        }
        aria-invalid={error}
        aria-describedby={error ? `${componentId}-error` : undefined}
      >
        <div className={cn(
          'flex-1 flex items-start min-h-[20px] overflow-y-auto max-h-[80px]',
          isSingleSelection ? 'justify-start' : 'flex-wrap gap-1'
        )}>
          {!hasSelections ? (
            <span className="w-full text-left leading-relaxed break-words">
              {placeholder}
            </span>
          ) : isSingleSelection ? (
            <span
              className="text-gray-900 flex-1 mr-2 min-w-0 leading-relaxed break-words"
              title={selectedLabels[0]}
            >
              {selectedLabels[0]}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1 items-start w-full">
              {selectedLabels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="inline-flex items-center bg-primary-blue text-white px-2 py-1 rounded-md text-11 sm:text-12 md:text-13 font-medium break-words leading-tight mb-1"
                  title={label}
                >
                  <span className="break-words text-left">
                    {label}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {hasSelections && !disabled && (
          <button
            type="button"
            onClick={handleClearAll}
            className="absolute right-8 sm:right-9 md:right-10 top-1/2 transform -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-red-500 transition-colors focus:outline-none z-10 flex-shrink-0"
            title="Limpiar selecciones"
            aria-label="Limpiar todas las selecciones"
            tabIndex={-1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Icono de flecha */}
      <div className="absolute inset-y-0 right-3 sm:right-4 flex items-center pointer-events-none z-10 flex-shrink-0">
        <svg
          className={cn(
            'w-5 h-5 text-gray-400 transition-all duration-200',
            isOpen && 'transform rotate-180 text-primary-blue',
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

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-primary-blue rounded-2xl shadow-xl max-h-96 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col overflow-hidden">
          {/* Búsqueda */}
          <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-primary-blue/10">
            <div className="relative">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                placeholder="Buscar opciones..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-8 sm:pl-10 pr-4 py-2 border border-gray-200 rounded-full text-14 sm:text-16 font-poppins focus:outline-none focus:ring-2 focus:ring-primary-blue transition-all"
                onClick={(e) => e.stopPropagation()}
                role="searchbox"
                aria-label="Buscar en las opciones disponibles"
              />
              <svg
                className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 gap-2 text-12 font-poppins">
              <span className="text-header-blue font-medium" aria-live="polite">
                {selectedLabels.length} seleccionado{selectedLabels.length !== 1 ? 's' : ''}
                {maxSelections && ` de ${maxSelections}`}
              </span>
              <div className="flex gap-2 flex-wrap">
                {isMaxReached && (
                  <span className="text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-full text-10 sm:text-12" role="status">
                    Máximo alcanzado
                  </span>
                )}
                {hasExclusiveSelected && (
                  <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full text-10 sm:text-12" role="status">
                    Opción exclusiva
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lista de opciones */}
          <div className="flex-1 overflow-y-auto hide-scrollbar" ref={listboxRef}>
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center" role="status">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20a7.962 7.962 0 01-5-1.709M15 3H9a2 2 0 00-2 2v1.099l.797 2.389a1 1 0 00.783.656l2.88.863a2 2 0 001.08 0l2.88-.863a1 1 0 00.783-.656L17 6.099V5a2 2 0 00-2-2z" />
                </svg>
                <p className="text-gray-500 font-poppins text-16 mb-1">No se encontraron opciones</p>
                <p className="text-gray-400 font-poppins text-12">
                  {searchTerm ? `para "${searchTerm}"` : 'Intenta con otros términos'}
                </p>
              </div>
            ) : (
              <ul
                role="listbox"
                id={listboxId}
                aria-labelledby={labelId}
                aria-multiselectable="true"
              >
                {filteredOptions.map((option, index) => {
                  const isSelected = value.includes(option.value);
                  const isDisabled = isOptionDisabled(option.value, option);
                  const isExclusive = exclusiveOptions.includes(option.value);
                  const isActive = activeIndex === index;

                  return (
                    <li
                      key={option.value}
                      id={`${componentId}-option-${index}`}
                      className={cn(
                        'px-4 py-3 flex items-center justify-between transition-all border-b border-gray-50 last:border-b-0',
                        isSelected && 'bg-gradient-to-r from-primary-blue/10 to-header-blue/10 text-header-blue font-semibold border-l-4 border-l-primary-blue',
                        !isSelected && !isDisabled && 'hover:bg-blue-50 hover:text-header-blue cursor-pointer',
                        isDisabled && 'text-gray-300 cursor-not-allowed bg-gray-25',
                        !isSelected && !isDisabled && index % 2 === 1 && 'bg-gray-25',
                        isExclusive && !isSelected && !isDisabled && 'border-l-2 border-l-orange-300',
                        isActive && 'ring-2 ring-primary-blue ring-inset'
                      )}
                      onClick={() => !isDisabled && handleOptionToggle(option.value)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled}
                      title={getTooltipText(isDisabled, isSelected, isExclusive, hasExclusiveSelected, option.label)}
                    >
                      <div className="flex items-center flex-1">
                        <span className={cn(
                          "font-poppins text-16 truncate",
                          isExclusive && "font-medium"
                        )}>
                          {option.label}
                        </span>
                        {isExclusive && !isSelected && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
                            Exclusiva
                          </span>
                        )}
                      </div>
                      <div className="ml-3" aria-hidden="true">
                        {(() => {
                          if (isSelected) {
                            return (
                              <div className="bg-primary-blue rounded-full p-1">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            );
                          }

                          if (isDisabled) {
                            return (
                              <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM4 10a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
                              </svg>
                            );
                          }

                          return (
                            <div className={cn(
                              "w-5 h-5 border-2 rounded-full transition-colors",
                              isExclusive ? "border-orange-300 group-hover:border-orange-500" : "border-gray-300 group-hover:border-primary-blue"
                            )}></div>
                          );
                        })()}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row justify-between items-center min-h-[60px] gap-2 sm:gap-4">
            {hasSelections ? (
              <Button
                onClick={handleClearAll}
                className="bg-header-blue hover:bg-primary-blue-hover shadow-sm hover:shadow-md transform hover:scale-105 transition-all text-white w-full sm:w-auto sm:flex-1 sm:max-w-[300px] h-auto !px-6 sm:!px-10 !py-2 sm:!py-4 font-bold rounded-full text-14 sm:text-18"
                aria-label="Limpiar todas las selecciones"
              >
                Limpiar
                <FaTrashAlt className="inline ml-2 sm:ml-3" />
              </Button>
            ) : (
              <div className="hidden sm:block sm:flex-1 sm:max-w-[160px]" />
            )}

            <Button
              type="button"
              onClick={handleClose}
              className="!w-full sm:!w-auto sm:!flex-1 sm:!max-w-[300px] shadow-sm !h-auto hover:!from-primary-blue-hover hover:!to-header-blue !text-14 sm:!text-18 !font-medium !px-6 sm:!px-10 !py-2 sm:!py-4 !rounded-full shadow-sm hover:shadow-md transition-all transform hover:scale-105 !min-w-[100px] text-white"
              aria-label="Cerrar lista de opciones"
            >
              Listo
              <FaCheck className="inline ml-2 sm:ml-3" />
            </Button>
          </div>

        </div>
      )}
    </div>
  );
};

export default MultiSelect;