/**
 * Attribute Field Renderer Component
 * 
 * Renders the correct form control based on attribute data_type:
 * - select → dropdown
 * - multiSelect → multi-select chips
 * - text/string → text input
 * - number → numeric input
 * - date → date picker
 * - boolean → toggle
 * - currency → currency input
 * 
 * PVS-0.1.9
 */

import { useState, useCallback } from 'react';
import './AttributeFieldRenderer.css';

export interface AttributeDefinition {
  attribute_id: string;
  label: string;
  data_type: 'text' | 'string' | 'number' | 'boolean' | 'select' | 'enum' | 'multiSelect' | 'date' | 'currency' | 'json';
  allowed_values?: string[];
  synonyms?: string[] | Record<string, string>;
  required_for_completion?: boolean;
  required_for_import?: boolean;
  required_for_export?: boolean;
  ai_usage_notes?: string;
  status?: string;
}

interface AttributeFieldRendererProps {
  attribute: AttributeDefinition;
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
  error?: string;
  onBlur?: () => void;
}

export function AttributeFieldRenderer({
  attribute,
  value,
  onChange,
  readOnly = false,
  error,
  onBlur
}: AttributeFieldRendererProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  
  const isRequired = attribute.required_for_completion;
  
  const validate = useCallback((val: any): string | null => {
    // Required validation
    if (isRequired && (val === undefined || val === null || val === '')) {
      return 'This field is required';
    }
    
    // Enum validation
    if ((attribute.data_type === 'select' || attribute.data_type === 'enum') && attribute.allowed_values) {
      if (val && !attribute.allowed_values.includes(val)) {
        return `Value must be one of: ${attribute.allowed_values.slice(0, 5).join(', ')}${attribute.allowed_values.length > 5 ? '...' : ''}`;
      }
    }
    
    // Number validation
    if (attribute.data_type === 'number' || attribute.data_type === 'currency') {
      if (val !== '' && val !== null && val !== undefined && isNaN(Number(val))) {
        return 'Must be a valid number';
      }
    }
    
    return null;
  }, [attribute, isRequired]);
  
  const handleBlur = () => {
    const err = validate(value);
    setLocalError(err);
    onBlur?.();
  };
  
  const handleChange = (newValue: any) => {
    setLocalError(null);
    onChange(newValue);
  };
  
  const displayError = error || localError;
  
  // Render based on data_type
  const renderField = () => {
    switch (attribute.data_type) {
      case 'select':
      case 'enum':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            disabled={readOnly}
            className={`attr-input attr-select ${displayError ? 'has-error' : ''}`}
          >
            <option value="">-- Select --</option>
            {attribute.allowed_values?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'multiSelect':
        return (
          <MultiSelectField
            value={value}
            options={attribute.allowed_values || []}
            onChange={handleChange}
            onBlur={handleBlur}
            readOnly={readOnly}
            hasError={!!displayError}
          />
        );
      
      case 'boolean':
        return (
          <label className="attr-toggle">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(e.target.checked)}
              onBlur={handleBlur}
              disabled={readOnly}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">{value ? 'Yes' : 'No'}</span>
          </label>
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            disabled={readOnly}
            className={`attr-input attr-date ${displayError ? 'has-error' : ''}`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value === '' ? null : Number(e.target.value))}
            onBlur={handleBlur}
            disabled={readOnly}
            className={`attr-input attr-number ${displayError ? 'has-error' : ''}`}
          />
        );
      
      case 'currency':
        return (
          <div className="currency-input-wrapper">
            <span className="currency-symbol">$</span>
            <input
              type="number"
              step="0.01"
              value={value ?? ''}
              onChange={(e) => handleChange(e.target.value === '' ? null : Number(e.target.value))}
              onBlur={handleBlur}
              disabled={readOnly}
              className={`attr-input attr-currency ${displayError ? 'has-error' : ''}`}
            />
          </div>
        );
      
      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(parsed);
              } catch {
                handleChange(e.target.value);
              }
            }}
            onBlur={handleBlur}
            disabled={readOnly}
            className={`attr-input attr-json ${displayError ? 'has-error' : ''}`}
            rows={4}
          />
        );
      
      case 'text':
      case 'string':
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            disabled={readOnly}
            className={`attr-input attr-text ${displayError ? 'has-error' : ''}`}
          />
        );
    }
  };
  
  return (
    <div className="attribute-field-renderer">
      <div className="attr-label-row">
        <label className="attr-label">
          {attribute.label}
          {isRequired && <span className="required-marker">*</span>}
        </label>
        <div className="attr-badges">
          {attribute.required_for_import && (
            <span className="attr-badge import">Import</span>
          )}
          {attribute.required_for_export && (
            <span className="attr-badge export">Export</span>
          )}
        </div>
      </div>
      
      <div className="attr-field-wrapper">
        {renderField()}
      </div>
      
      {displayError && (
        <div className="attr-error">{displayError}</div>
      )}
      
      {attribute.allowed_values && attribute.data_type === 'select' && (
        <div className="attr-hint">
          Allowed: {attribute.allowed_values.slice(0, 5).join(', ')}
          {attribute.allowed_values.length > 5 && `... (+${attribute.allowed_values.length - 5} more)`}
        </div>
      )}
      
      {attribute.ai_usage_notes && (
        <div className="attr-notes">{attribute.ai_usage_notes}</div>
      )}
    </div>
  );
}

// Multi-select field sub-component
interface MultiSelectFieldProps {
  value: string | string[] | null;
  options: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  hasError?: boolean;
}

function MultiSelectField({ value, options, onChange, onBlur, readOnly, hasError }: MultiSelectFieldProps) {
  const selectedValues = Array.isArray(value) 
    ? value 
    : typeof value === 'string' && value 
      ? value.split(',').map(v => v.trim()) 
      : [];
  
  const handleToggle = (option: string) => {
    if (readOnly) return;
    
    const newValues = selectedValues.includes(option)
      ? selectedValues.filter(v => v !== option)
      : [...selectedValues, option];
    
    onChange(newValues);
  };
  
  return (
    <div className={`multi-select-field ${hasError ? 'has-error' : ''}`} onBlur={onBlur}>
      <div className="multi-select-chips">
        {options.map(option => (
          <button
            key={option}
            type="button"
            className={`chip ${selectedValues.includes(option) ? 'selected' : ''}`}
            onClick={() => handleToggle(option)}
            disabled={readOnly}
          >
            {option}
            {selectedValues.includes(option) && <span className="chip-check">✓</span>}
          </button>
        ))}
      </div>
      {selectedValues.length > 0 && (
        <div className="selected-summary">
          Selected: {selectedValues.join(', ')}
        </div>
      )}
    </div>
  );
}

export default AttributeFieldRenderer;
