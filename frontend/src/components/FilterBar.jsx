import React from 'react';
import { clsx } from 'clsx';
import SearchInput from './SearchInput';
import Select from './Select';

/**
 * FilterBar Component
 * 
 * Reusable filter bar component with search input and filter selects
 * 
 * @param {Object} props - Component properties
 * @param {string} props.searchValue - Current search value
 * @param {Function} props.onSearchChange - Callback when search changes
 * @param {Array} props.filters - Array of filter configurations
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.searchPlaceholder - Placeholder for search input
 * @param {string} props.searchAriaLabel - Aria label for search input
 * @param {Function} props.onPageReset - Callback to reset pagination
 * @returns {JSX.Element} The filter bar component
 */
const FilterBar = ({
    searchValue = '',
    onSearchChange,
    filters = [],
    className = '',
    searchPlaceholder = 'Buscar...',
    searchAriaLabel = 'Campo de búsqueda',
    onPageReset,
    ...props
}) => {
    // Handle search change with page reset
    const handleSearchChange = (e) => {
        if (onSearchChange) {
            onSearchChange(e);
        }
        if (onPageReset) {
            onPageReset();
        }
    };

    // Handle filter change with page reset
    const handleFilterChange = (filterIndex, e) => {
        const filter = filters[filterIndex];
        if (filter.onChange) {
            filter.onChange(e);
        }
        if (onPageReset) {
            onPageReset();
        }
    };

    return (
        <div className={clsx(
            'w-full flex flex-wrap items-center justify-between gap-4 mb-4',
            className
        )} {...props}>
            <div className="flex items-center gap-4 flex-wrap">
                {/* Search Input */}
                <SearchInput
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                    ariaLabel={searchAriaLabel}
                    className="w-[350px]"
                    size="large"
                />

                {/* Filter Selects */}
                {filters.map((filter, index) => (
                    <Select
                        key={filter.key || index}
                        className={clsx('font-poppins', filter.className || 'w-[180px]')}
                        size="small"
                        value={filter.value}
                        onChange={(e) => handleFilterChange(index, e)}
                        aria-label={filter.ariaLabel}
                        {...filter.selectProps}
                    >
                        {filter.options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                ))}
            </div>

            {/* Additional Actions */}
            {props.children && (
                <div className="flex items-center gap-2">
                    {props.children}
                </div>
            )}
        </div>
    );
};

export default FilterBar;