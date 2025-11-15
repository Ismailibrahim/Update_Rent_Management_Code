'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Input } from './Input';
import { Search, ChevronDown, X } from 'lucide-react';

interface SearchableSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  className,
  disabled = false,
  required = false,
  emptyMessage = 'No options found',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected option label
  const selectedOption = options.find(opt => String(opt.value) === String(value) && value !== 0 && value !== '');
  const displayValue = selectedOption?.label || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(0);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Selected Value Display */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOpen && 'ring-2 ring-ring ring-offset-2',
          !selectedOption && 'text-muted-foreground',
          className
        )}
      >
        <span className="truncate">{displayValue}</span>
        <div className="flex items-center gap-2">
          {value && value !== 0 && value !== '' && !disabled && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Search Input */}
          <div className="sticky top-0 border-b border-gray-200 bg-white p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-auto" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={`${String(option.value)}-${index}`}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  role="option"
                  aria-selected={String(option.value) === String(value)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm transition-colors',
                    'hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
                    String(option.value) === String(value) && 'bg-blue-50 text-blue-900',
                    option.disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center" role="option">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

