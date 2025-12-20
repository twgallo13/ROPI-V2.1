/**
 * FieldPicker Component
 * 
 * LP-1.0.1: A typeahead/dropdown component for selecting canonical field links.
 * LP-1.1.11: Added compact mode for inline display in observation items.
 * 
 * Features:
 * - Typeahead search with fuzzy matching
 * - Groups options by type (Product fields, Attributes)
 * - Supports manual entry with client-side normalization
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Compact mode for space-constrained contexts
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FieldLink, FieldPickerOption, PRODUCT_FIELDS } from '../../types/fieldLink';
import { normalizeFieldLink } from '../../utils/normalizeFieldLink';
import attributeRegistry from '@/../../sdk/config/attributeRegistry.json';
import './FieldPicker.css';

interface FieldPickerProps {
  value: FieldLink | null;
  onChange: (fieldLink: FieldLink | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** LP-1.1.11: Compact mode for inline display */
  compact?: boolean;
}

interface AttributeFromRegistry {
  attribute_id: string;
  label: string;
  category?: string;
  status?: string;
}

/**
 * FieldPicker Component
 * Provides a typeahead dropdown for selecting canonical field links.
 */
export function FieldPicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select or type a field...',
  className = '',
  compact = false,
}: FieldPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build attribute options from registry
  const attributeOptions: FieldPickerOption[] = useMemo(() => {
    const attrs = (attributeRegistry as { attributes: AttributeFromRegistry[] }).attributes || [];
    return attrs
      .filter((attr) => attr.status === 'active')
      .map((attr) => ({
        type: 'attribute' as const,
        key: `attributes.${attr.attribute_id}`,
        label: attr.label,
        category: attr.category,
      }));
  }, []);

  // Get all attribute IDs for normalization
  const attributeIds = useMemo(() => {
    return attributeOptions.map((opt) => opt.key.replace('attributes.', ''));
  }, [attributeOptions]);

  // Combine all options
  const allOptions: FieldPickerOption[] = useMemo(() => {
    return [...PRODUCT_FIELDS, ...attributeOptions];
  }, [attributeOptions]);

  // Filter options based on input
  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) return allOptions;

    const searchTerm = inputValue.toLowerCase().trim();
    return allOptions.filter((opt) => {
      const labelMatch = opt.label.toLowerCase().includes(searchTerm);
      const keyMatch = opt.key.toLowerCase().includes(searchTerm);
      const categoryMatch = opt.category?.toLowerCase().includes(searchTerm);
      return labelMatch || keyMatch || categoryMatch;
    });
  }, [allOptions, inputValue]);

  // Group filtered options by type
  const groupedOptions = useMemo(() => {
    const productFields = filteredOptions.filter((opt) => opt.type === 'product');
    const attributes = filteredOptions.filter((opt) => opt.type === 'attribute');
    return { productFields, attributes };
  }, [filteredOptions]);

  // Flat list for keyboard navigation
  const flatOptions = useMemo(() => {
    return [...groupedOptions.productFields, ...groupedOptions.attributes];
  }, [groupedOptions]);

  // Sync input value with external value
  useEffect(() => {
    if (value) {
      const option = allOptions.find((opt) => opt.key === value.key);
      setInputValue(option?.label || value.key);
    } else {
      setInputValue('');
    }
  }, [value, allOptions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed something but didn't select, try to normalize it
        if (inputValue && !value) {
          handleManualEntry(inputValue);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.field-picker-option');
      const item = items[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleManualEntry = useCallback((text: string) => {
    if (!text.trim()) {
      onChange(null);
      return;
    }

    const normalized = normalizeFieldLink(text, attributeIds);
    onChange(normalized);
  }, [onChange, attributeIds]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Clear the field link if input is empty
    if (!newValue.trim()) {
      onChange(null);
    }
  };

  const handleOptionSelect = (option: FieldPickerOption) => {
    onChange({
      type: option.type,
      key: option.key,
    });
    setInputValue(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          prev < flatOptions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : flatOptions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && flatOptions[highlightedIndex]) {
          handleOptionSelect(flatOptions[highlightedIndex]);
        } else if (inputValue) {
          handleManualEntry(inputValue);
          setIsOpen(false);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        if (isOpen && highlightedIndex >= 0 && flatOptions[highlightedIndex]) {
          e.preventDefault();
          handleOptionSelect(flatOptions[highlightedIndex]);
        } else if (inputValue && !value) {
          handleManualEntry(inputValue);
        }
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleClear = () => {
    setInputValue('');
    onChange(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const renderOptionGroup = (
    title: string,
    options: FieldPickerOption[],
    startIndex: number
  ) => {
    if (options.length === 0) return null;

    return (
      <li key={title} className="field-picker-group">
        <div className="field-picker-group-title">{title}</div>
        <ul className="field-picker-group-list">
          {options.map((option, idx) => {
            const globalIndex = startIndex + idx;
            const isHighlighted = globalIndex === highlightedIndex;
            const isSelected = value?.key === option.key;

            return (
              <li
                key={option.key}
                className={`field-picker-option ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHighlightedIndex(globalIndex)}
                role="option"
                aria-selected={isSelected}
              >
                <span className="field-picker-option-label">{option.label}</span>
                <span className="field-picker-option-key">{option.key}</span>
              </li>
            );
          })}
        </ul>
      </li>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`field-picker ${className} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${compact ? 'compact' : ''}`}
    >
      <div className="field-picker-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="field-picker-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {(inputValue || value) && !disabled && (
          <button
            type="button"
            className="field-picker-clear"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
        <span className="field-picker-arrow">▼</span>
      </div>

      {isOpen && !disabled && (
        <ul
          ref={listRef}
          className="field-picker-dropdown"
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <li className="field-picker-no-results">
              No matching fields. Press Enter to use "{inputValue}".
            </li>
          ) : (
            <>
              {renderOptionGroup(
                'Product Fields',
                groupedOptions.productFields,
                0
              )}
              {renderOptionGroup(
                'Attributes',
                groupedOptions.attributes,
                groupedOptions.productFields.length
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}

export default FieldPicker;
