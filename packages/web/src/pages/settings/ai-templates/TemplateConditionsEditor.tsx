import { useState } from 'react';

interface TemplateCondition {
  id: string;
  type: 'site' | 'attribute';
  attributeId?: string;
  operator?: 'equals' | 'contains' | 'not_equals';
  value: string;
  description?: string;
}

interface TemplateConditionsEditorProps {
  conditions: TemplateCondition[];
  onChange: (conditions: TemplateCondition[]) => void;
}

// Common attribute IDs that can be used in conditions
const COMMON_ATTRIBUTES = [
  'brand', 'category', 'color', 'size', 'gender', 'material', 'style', 'season',
  'price_range', 'collection', 'product_type', 'target_audience'
];

function TemplateConditionsEditor({ conditions, onChange }: TemplateConditionsEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  function generateConditionId(): string {
    return `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function addCondition() {
    const newCondition: TemplateCondition = {
      id: generateConditionId(),
      type: 'site',
      value: '',
      description: ''
    };
    onChange([...conditions, newCondition]);
    setShowAddForm(false);
  }

  function updateCondition(index: number, updates: Partial<TemplateCondition>) {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  }

  function removeCondition(index: number) {
    const updated = conditions.filter((_, i) => i !== index);
    onChange(updated);
  }

  function getConditionDescription(condition: TemplateCondition): string {
    if (condition.type === 'site') {
      return `Apply when site equals "${condition.value}"`;
    } else if (condition.type === 'attribute') {
      const operator = condition.operator || 'equals';
      const operatorText = {
        equals: 'equals',
        contains: 'contains', 
        not_equals: 'does not equal'
      }[operator];
      return `Apply when attribute "${condition.attributeId}" ${operatorText} "${condition.value}"`;
    }
    return 'Invalid condition';
  }

  return (
    <div style={{ border: '1px solid var(--color-border, #ddd)', borderRadius: '6px', padding: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem' 
      }}>
        <div>
          <h5 style={{ margin: 0, fontSize: '1rem' }}>When to Use This Template</h5>
          <p style={{ 
            margin: '0.25rem 0 0', 
            fontSize: '0.875rem', 
            color: 'var(--color-text-secondary, #666)' 
          }}>
            Add conditions to control when this template is selected. If no conditions are set, template applies to all products.
          </p>
        </div>
        <button
          type="button"
          onClick={addCondition}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-primary, #007bff)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Add Condition
        </button>
      </div>

      {conditions.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem 1rem',
          color: 'var(--color-text-secondary, #666)',
          fontStyle: 'italic'
        }}>
          No conditions set. This template will apply to all products and sites.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {conditions.map((condition, index) => (
            <div 
              key={condition.id}
              style={{
                border: '1px solid var(--color-border, #eee)',
                borderRadius: '4px',
                padding: '0.75rem',
                backgroundColor: 'var(--color-bg-secondary, #f8f9fa)'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.5rem', alignItems: 'start' }}>
                
                {/* Condition Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    Type
                  </label>
                  <select
                    value={condition.type}
                    onChange={(e) => updateCondition(index, { 
                      type: e.target.value as 'site' | 'attribute',
                      attributeId: e.target.value === 'attribute' ? 'brand' : undefined
                    })}
                    style={{
                      padding: '0.375rem',
                      border: '1px solid var(--color-border, #ccc)',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      minWidth: '100px'
                    }}
                  >
                    <option value="site">Site</option>
                    <option value="attribute">Attribute</option>
                  </select>
                </div>

                {/* Condition Details */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
                  {condition.type === 'attribute' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          Attribute
                        </label>
                        <select
                          value={condition.attributeId || ''}
                          onChange={(e) => updateCondition(index, { attributeId: e.target.value })}
                          style={{
                            padding: '0.375rem',
                            border: '1px solid var(--color-border, #ccc)',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            minWidth: '120px'
                          }}
                        >
                          <option value="">Select attribute...</option>
                          {COMMON_ATTRIBUTES.map(attr => (
                            <option key={attr} value={attr}>{attr}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          Operator
                        </label>
                        <select
                          value={condition.operator || 'equals'}
                          onChange={(e) => updateCondition(index, { 
                            operator: e.target.value as 'equals' | 'contains' | 'not_equals' 
                          })}
                          style={{
                            padding: '0.375rem',
                            border: '1px solid var(--color-border, #ccc)',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            minWidth: '100px'
                          }}
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="not_equals">Not Equals</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div style={{ flexGrow: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {condition.type === 'site' ? 'Site Name' : 'Value'}
                    </label>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder={
                        condition.type === 'site' 
                          ? 'e.g., shiekh, ccs, zumiez' 
                          : 'e.g., Nike, red, large'
                      }
                      style={{
                        width: '100%',
                        padding: '0.375rem',
                        border: '1px solid var(--color-border, #ccc)',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                {/* Remove Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    style={{
                      padding: '0.375rem',
                      backgroundColor: 'var(--color-error, #dc3545)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      marginTop: '1.125rem'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Condition Description */}
              <div style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.75rem', 
                color: 'var(--color-text-secondary, #666)',
                fontStyle: 'italic',
                borderTop: '1px solid var(--color-border, #ddd)',
                paddingTop: '0.5rem'
              }}>
                {getConditionDescription(condition)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logic Explanation */}
      {conditions.length > 1 && (
        <div style={{ 
          marginTop: '0.75rem', 
          padding: '0.5rem', 
          backgroundColor: 'var(--color-info-bg, #e7f3ff)',
          border: '1px solid var(--color-info, #0066cc)',
          borderRadius: '4px',
          fontSize: '0.75rem'
        }}>
          <strong>Logic:</strong> Template will be used when <strong>ALL</strong> conditions match (AND logic). 
          Higher priority templates are checked first.
        </div>
      )}
    </div>
  );
}

export default TemplateConditionsEditor;