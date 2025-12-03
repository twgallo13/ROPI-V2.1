/**
 * Import Mapping Step Component
 * Step 2: Map CSV headers to normalized fields
 */

import { useState, useEffect } from 'react';
import { DEFAULT_COLUMN_MAPPINGS } from '@ropi-aoss/sdk';
import './ImportMappingStep.css';

interface ImportMappingStepProps {
  headers: string[];
  onMappingComplete: (mappings: ColumnMappingConfig) => void;
  onBack: () => void;
}

interface ColumnMappingConfig {
  [sourceColumn: string]: string; // Maps CSV column to normalized field
}

// Build available target fields from DEFAULT_COLUMN_MAPPINGS
const AVAILABLE_FIELDS = DEFAULT_COLUMN_MAPPINGS.map((m: any) => ({
  value: m.targetField,
  label: m.targetField,
  required: m.required || false,
}));

// Add unmapped option
const FIELD_OPTIONS = [
  { value: '', label: '(Unmapped)', required: false },
  ...AVAILABLE_FIELDS,
];

export function ImportMappingStep({ headers, onMappingComplete, onBack }: ImportMappingStepProps) {
  const [mappings, setMappings] = useState<ColumnMappingConfig>({});
  const [missingRequired, setMissingRequired] = useState<string[]>([]);

  // Auto-suggest mappings on mount
  useEffect(() => {
    const suggestedMappings: ColumnMappingConfig = {};
    
    // Try to match CSV headers to default column mappings
    headers.forEach(header => {
      const match = DEFAULT_COLUMN_MAPPINGS.find(
        (m: any) => m.sourceColumn.toLowerCase() === header.toLowerCase()
      );
      
      if (match) {
        suggestedMappings[header] = match.targetField;
      }
    });

    setMappings(suggestedMappings);
  }, [headers]);

  // Check for missing required fields
  useEffect(() => {
    const mappedFields = Object.values(mappings).filter(Boolean);
    const required = DEFAULT_COLUMN_MAPPINGS
      .filter((m: any) => m.required)
      .map((m: any) => m.targetField);
    
    const missing = required.filter((field: any) => !mappedFields.includes(field));
    setMissingRequired(missing);
  }, [mappings]);

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings(prev => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const handleContinue = () => {
    if (missingRequired.length > 0) {
      alert(`Missing required fields: ${missingRequired.join(', ')}`);
      return;
    }

    onMappingComplete(mappings);
  };

  const isFieldMapped = (targetField: string): boolean => {
    return Object.values(mappings).includes(targetField);
  };

  const isRequired = (targetField: string): boolean => {
    return DEFAULT_COLUMN_MAPPINGS.some(
      (m: any) => m.targetField === targetField && m.required
    );
  };

  return (
    <div className="import-mapping-step">
      <h2>Map CSV Columns</h2>
      <p className="step-description">
        Map your CSV columns to normalized product fields. Suggested mappings have been auto-detected.
      </p>

      {missingRequired.length > 0 && (
        <div className="mapping-warning">
          ⚠️ Missing required fields: <strong>{missingRequired.join(', ')}</strong>
        </div>
      )}

      <div className="mapping-table-wrapper">
        <table className="mapping-table">
          <thead>
            <tr>
              <th>CSV Column</th>
              <th>Maps To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {headers.map(header => {
              const currentMapping = mappings[header] || '';
              const isMapped = !!currentMapping;
              const isReq = isRequired(currentMapping);

              return (
                <tr key={header}>
                  <td className="csv-column">
                    <code>{header}</code>
                  </td>
                  <td className="target-field">
                    <select
                      value={currentMapping}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="field-select"
                    >
                      {FIELD_OPTIONS.map(option => {
                        const alreadyMapped = option.value && isFieldMapped(option.value) && currentMapping !== option.value;
                        return (
                          <option
                            key={option.value}
                            value={option.value}
                            disabled={!!alreadyMapped}
                          >
                            {option.label}
                            {option.required && ' (required)'}
                            {alreadyMapped && ' (already mapped)'}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="mapping-status">
                    {isMapped ? (
                      <span className={`status-badge ${isReq ? 'required' : 'mapped'}`}>
                        {isReq ? 'Required ✓' : 'Mapped ✓'}
                      </span>
                    ) : (
                      <span className="status-badge unmapped">Unmapped</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mapping-summary">
        <div className="summary-item">
          <strong>Total Columns:</strong> {headers.length}
        </div>
        <div className="summary-item">
          <strong>Mapped:</strong> {Object.values(mappings).filter(Boolean).length}
        </div>
        <div className="summary-item">
          <strong>Unmapped:</strong> {headers.length - Object.values(mappings).filter(Boolean).length}
        </div>
        <div className="summary-item">
          <strong>Required Fields Missing:</strong>{' '}
          <span className={missingRequired.length > 0 ? 'text-error' : 'text-success'}>
            {missingRequired.length}
          </span>
        </div>
      </div>

      <div className="mapping-actions">
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Upload
        </button>
        <button
          className="btn-primary"
          onClick={handleContinue}
          disabled={missingRequired.length > 0}
        >
          Continue to Preview →
        </button>
      </div>
    </div>
  );
}
