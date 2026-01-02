/**
 * IFTTT Rule Builder Component
 * LP-smart-rules-admin-1.0.0: Admin Settings Smart Rules Manager
 * 
 * Visual IFTTT-style rule builder:
 * IF <condition> THEN <action>
 * 
 * Features:
 * - Condition builder with field/matchType/value
 * - Action builder with target field (exportable only) and value template
 * - Multiple conditions with AND/OR logic
 * - "Set only if empty" guardrail
 * - Real-time validation
 */

import { useState, useEffect, useCallback } from 'react';
import type { 
  SmartRuleForm, 
  RuleConditionForm, 
  RuleActionForm,
  ConditionMatchType,
} from '../../types/smartRulesAdmin';
import { 
  CONDITION_MATCH_TYPES, 
  CONDITION_SOURCE_FIELDS,
} from '../../types/smartRulesAdmin';
import { getExportableAttributes, generateRuleId, preSubmitValidation } from '../../services/smartRulesAdmin';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'var(--spacing-lg)',
    backgroundColor: 'var(--color-background)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  },
  section: {
    marginBottom: 'var(--spacing-lg)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 600,
    marginBottom: 'var(--spacing-md)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  iftttLabel: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  ifLabel: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
  },
  thenLabel: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  formGroup: {
    marginBottom: 'var(--spacing-md)',
  },
  label: {
    display: 'block',
    marginBottom: 'var(--spacing-xs)',
    fontWeight: 500,
    fontSize: 'var(--font-size-sm)',
  },
  input: {
    width: '100%',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: 'var(--font-size-base)',
    backgroundColor: 'var(--color-background)',
  },
  select: {
    width: '100%',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: 'var(--font-size-base)',
    backgroundColor: 'var(--color-background)',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: 'var(--font-size-base)',
    minHeight: '80px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  conditionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 150px 1fr auto',
    gap: 'var(--spacing-sm)',
    alignItems: 'start',
    marginBottom: 'var(--spacing-sm)',
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--color-background-secondary)',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
  },
  iconButton: {
    padding: 'var(--spacing-xs)',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    opacity: 0.6,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    backgroundColor: 'var(--color-background)',
    border: '1px dashed var(--color-border)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
  },
  logicToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    margin: 'var(--spacing-sm) 0',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-background-secondary)',
    borderRadius: '4px',
  },
  logicButton: {
    padding: 'var(--spacing-xs) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 500,
  },
  logicButtonActive: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    borderColor: 'var(--color-primary)',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    gap: 'var(--spacing-md)',
  },
  col: {
    flex: 1,
  },
  helpText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
    marginTop: 'var(--spacing-xs)',
  },
  errorText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-error)',
    marginTop: 'var(--spacing-xs)',
  },
  divider: {
    borderTop: '1px solid var(--color-border)',
    margin: 'var(--spacing-lg) 0',
  },
  tagInput: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--spacing-xs)',
    padding: 'var(--spacing-sm)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    minHeight: '40px',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    padding: '2px 8px',
    backgroundColor: 'var(--color-background-secondary)',
    borderRadius: '4px',
    fontSize: 'var(--font-size-sm)',
  },
  tagRemove: {
    cursor: 'pointer',
    opacity: 0.6,
  },
};

// ============================================================================
// Props
// ============================================================================

interface RuleBuilderProps {
  initialValue?: SmartRuleForm;
  onSave: (rule: SmartRuleForm) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RuleBuilder({ initialValue, onSave, onCancel, isEditing }: RuleBuilderProps) {
  // Form state
  const [name, setName] = useState(initialValue?.name || '');
  const [description, setDescription] = useState(initialValue?.description || '');
  const [enabled, setEnabled] = useState(initialValue?.enabled ?? true);
  const [priority, setPriority] = useState(initialValue?.priority ?? 1000);
  const [conditions, setConditions] = useState<RuleConditionForm[]>(
    initialValue?.conditions || [createEmptyCondition()]
  );
  const [conditionLogic, setConditionLogic] = useState<'and' | 'or'>(
    initialValue?.conditionLogic || 'and'
  );
  const [action, setAction] = useState<RuleActionForm>(
    initialValue?.action || createEmptyAction()
  );
  const [autoApply, setAutoApply] = useState(initialValue?.autoApply ?? false);
  const [autoApplyConfidence, setAutoApplyConfidence] = useState(
    initialValue?.autoApplyConfidence ?? 0.9
  );
  const [tags, setTags] = useState<string[]>(initialValue?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  // Target field options
  const [targetFields, setTargetFields] = useState<Array<{ id: string; label: string; group: string }>>([]);
  
  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Load exportable attributes for target field dropdown
  useEffect(() => {
    getExportableAttributes().then(setTargetFields);
  }, []);
  
  // Create empty condition (LP-smart-rules-schema-1.0.0: always include options)
  function createEmptyCondition(): RuleConditionForm {
    return {
      id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
      field: '',
      matchType: 'contains',
      value: '',
      options: {}, // Never undefined
    };
  }
  
  // Create empty action
  function createEmptyAction(): RuleActionForm {
    return {
      targetField: '',
      valueTemplate: '',
      setOnlyIfEmpty: true,
      confidenceModifier: undefined,
    };
  }
  
  // Add condition
  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, createEmptyCondition()]);
  }, []);
  
  // Remove condition
  const removeCondition = useCallback((id: string) => {
    setConditions(prev => prev.filter(c => c.id !== id));
  }, []);
  
  // Update condition
  const updateCondition = useCallback((id: string, updates: Partial<RuleConditionForm>) => {
    setConditions(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);
  
  // Add tag
  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);
  
  // Remove tag
  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);
  
  // Validate form (LP-smart-rules-schema-1.0.0: uses canonical SDK validation)
  const validate = useCallback((): boolean => {
    // Build the form object for validation
    const formData: SmartRuleForm = {
      ruleId: initialValue?.ruleId || '', // Temporary ID for validation
      name: name.trim(),
      description: description.trim(),
      enabled,
      priority,
      conditions: conditions.map(c => ({
        ...c,
        options: c.options || {}, // Ensure options is never undefined
      })),
      conditionLogic,
      action: {
        ...action,
        confidenceModifier: action.confidenceModifier,
      },
      autoApply,
      autoApplyConfidence,
      tags,
    };
    
    // Use SDK's canonical pre-submit validation
    const sdkErrors = preSubmitValidation(formData);
    
    // Convert SDK errors to UI format
    const newErrors: Record<string, string> = {};
    for (const [path, message] of Object.entries(sdkErrors)) {
      // Map SDK paths to UI field names
      if (path.startsWith('conditions.')) {
        const match = path.match(/conditions\.(\d+)\.(.+)/);
        if (match) {
          newErrors[`condition_${match[1]}_${match[2]}`] = message;
        }
      } else if (path === 'action.targetField') {
        newErrors['targetField'] = message;
      } else if (path === 'action.valueTemplate') {
        newErrors['valueTemplate'] = message;
      } else {
        newErrors[path] = message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, enabled, priority, conditions, conditionLogic, action, autoApply, autoApplyConfidence, tags, initialValue?.ruleId]);
  
  // Handle save (LP-smart-rules-schema-1.0.0: normalize all fields before saving)
  const handleSave = useCallback(() => {
    if (!validate()) {
      return;
    }
    
    // Build rule with explicit defaults (never undefined)
    const rule: SmartRuleForm = {
      ruleId: initialValue?.ruleId || generateRuleId(),
      name: name.trim(),
      description: description.trim() || '', // Default to empty string
      enabled,
      priority,
      conditions: conditions.map(c => ({
        ...c,
        field: c.field || '',
        matchType: c.matchType || 'contains',
        value: c.value || '',
        options: c.options || {}, // Never undefined
      })),
      conditionLogic,
      action: {
        targetField: action.targetField || '',
        valueTemplate: action.valueTemplate || '',
        setOnlyIfEmpty: action.setOnlyIfEmpty ?? false,
        // Only include confidenceModifier if set
        ...(action.confidenceModifier !== undefined && { 
          confidenceModifier: action.confidenceModifier 
        }),
      },
      autoApply,
      autoApplyConfidence,
      tags: tags || [],
    };
    
    onSave(rule);
  }, [
    validate, initialValue?.ruleId, name, description, enabled, priority,
    conditions, conditionLogic, action, autoApply, autoApplyConfidence, tags, onSave
  ]);
  
  return (
    <div style={styles.container}>
      {/* Rule Name & Description */}
      <div style={styles.section}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Rule Name *</label>
          <input
            type="text"
            style={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Women's Category Gender Rule"
          />
          {errors.name && <div style={styles.errorText}>{errors.name}</div>}
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Description</label>
          <textarea
            style={styles.textarea}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what this rule does..."
          />
        </div>
        
        <div style={styles.row}>
          <div style={styles.col}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Priority (lower = higher priority)</label>
              <input
                type="number"
                style={styles.input}
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                min={1}
                max={10000}
              />
              <div style={styles.helpText}>
                Rules with lower priority numbers run first (1-10000)
              </div>
            </div>
          </div>
          <div style={styles.col}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  style={styles.checkboxInput}
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                />
                <span>{enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div style={styles.divider} />
      
      {/* IF Section - Conditions */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span style={{ ...styles.iftttLabel, ...styles.ifLabel }}>IF</span>
          <span>Conditions</span>
        </div>
        
        {conditions.length > 1 && (
          <div style={styles.logicToggle}>
            <span>Match:</span>
            <button
              type="button"
              style={{
                ...styles.logicButton,
                ...(conditionLogic === 'and' ? styles.logicButtonActive : {}),
              }}
              onClick={() => setConditionLogic('and')}
            >
              ALL (AND)
            </button>
            <button
              type="button"
              style={{
                ...styles.logicButton,
                ...(conditionLogic === 'or' ? styles.logicButtonActive : {}),
              }}
              onClick={() => setConditionLogic('or')}
            >
              ANY (OR)
            </button>
          </div>
        )}
        
        {conditions.map((condition, index) => (
          <div key={condition.id} style={styles.conditionRow}>
            <div>
              <label style={styles.label}>Field</label>
              <select
                style={styles.select}
                value={condition.field}
                onChange={e => updateCondition(condition.id, { field: e.target.value })}
              >
                <option value="">Select field...</option>
                {Object.entries(
                  CONDITION_SOURCE_FIELDS.reduce((acc, f) => {
                    if (!acc[f.group]) acc[f.group] = [];
                    acc[f.group].push(f);
                    return acc;
                  }, {} as Record<string, typeof CONDITION_SOURCE_FIELDS[number][]>)
                ).map(([group, fields]) => (
                  <optgroup key={group} label={group}>
                    {fields.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors[`condition_${index}_field`] && (
                <div style={styles.errorText}>{errors[`condition_${index}_field`]}</div>
              )}
            </div>
            
            <div>
              <label style={styles.label}>Match Type</label>
              <select
                style={styles.select}
                value={condition.matchType}
                onChange={e => updateCondition(condition.id, { 
                  matchType: e.target.value as ConditionMatchType 
                })}
              >
                {CONDITION_MATCH_TYPES.map(mt => (
                  <option key={mt.value} value={mt.value} title={mt.description}>
                    {mt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={styles.label}>Value</label>
              <input
                type="text"
                style={styles.input}
                value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
                onChange={e => updateCondition(condition.id, { value: e.target.value })}
                placeholder={condition.matchType === 'in' ? 'value1, value2, ...' : 'Match value'}
                disabled={condition.matchType === 'exists'}
              />
              {errors[`condition_${index}_value`] && (
                <div style={styles.errorText}>{errors[`condition_${index}_value`]}</div>
              )}
            </div>
            
            <button
              type="button"
              style={styles.iconButton}
              onClick={() => removeCondition(condition.id)}
              disabled={conditions.length === 1}
              title="Remove condition"
            >
              ❌
            </button>
          </div>
        ))}
        
        <button type="button" style={styles.addButton} onClick={addCondition}>
          ➕ Add Condition
        </button>
        {errors.conditions && <div style={styles.errorText}>{errors.conditions}</div>}
      </div>
      
      <div style={styles.divider} />
      
      {/* THEN Section - Action */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span style={{ ...styles.iftttLabel, ...styles.thenLabel }}>THEN</span>
          <span>Action</span>
        </div>
        
        <div style={styles.row}>
          <div style={styles.col}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Set Attribute *</label>
              <select
                style={styles.select}
                value={action.targetField}
                onChange={e => setAction({ ...action, targetField: e.target.value })}
              >
                <option value="">Select target field...</option>
                {Object.entries(
                  targetFields.reduce((acc, f) => {
                    if (!acc[f.group]) acc[f.group] = [];
                    acc[f.group].push(f);
                    return acc;
                  }, {} as Record<string, typeof targetFields[number][]>)
                ).map(([group, fields]) => (
                  <optgroup key={group} label={group}>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.targetField && <div style={styles.errorText}>{errors.targetField}</div>}
              <div style={styles.helpText}>
                Only exportable attributes can be set by Smart Rules
              </div>
            </div>
          </div>
          
          <div style={styles.col}>
            <div style={styles.formGroup}>
              <label style={styles.label}>To Value *</label>
              <input
                type="text"
                style={styles.input}
                value={action.valueTemplate}
                onChange={e => setAction({ ...action, valueTemplate: e.target.value })}
                placeholder="e.g., Women's or {{source.brand}}"
              />
              {errors.valueTemplate && <div style={styles.errorText}>{errors.valueTemplate}</div>}
              <div style={styles.helpText}>
                Use {'{{'}<code>field</code>{'}}'}  for dynamic values
              </div>
            </div>
          </div>
        </div>
        
        <div style={styles.formGroup}>
          <div style={styles.checkbox}>
            <input
              type="checkbox"
              style={styles.checkboxInput}
              checked={action.setOnlyIfEmpty}
              onChange={e => setAction({ ...action, setOnlyIfEmpty: e.target.checked })}
            />
            <span>Set only if field is empty (guardrail)</span>
          </div>
          <div style={styles.helpText}>
            When enabled, this rule will not overwrite existing values
          </div>
        </div>
      </div>
      
      <div style={styles.divider} />
      
      {/* Auto-Apply Settings */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>⚡</span>
          <span>Auto-Apply</span>
        </div>
        
        <div style={styles.row}>
          <div style={styles.col}>
            <div style={styles.formGroup}>
              <div style={styles.checkbox}>
                <input
                  type="checkbox"
                  style={styles.checkboxInput}
                  checked={autoApply}
                  onChange={e => setAutoApply(e.target.checked)}
                />
                <span>Enable auto-apply</span>
              </div>
              <div style={styles.helpText}>
                Automatically apply this rule during import without manual review
              </div>
            </div>
          </div>
          
          {autoApply && (
            <div style={styles.col}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Confidence Threshold</label>
                <input
                  type="number"
                  style={styles.input}
                  value={autoApplyConfidence}
                  onChange={e => setAutoApplyConfidence(Number(e.target.value))}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <div style={styles.helpText}>
                  Only auto-apply when confidence ≥ this value (0-1)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div style={styles.divider} />
      
      {/* Tags */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>🏷️</span>
          <span>Tags</span>
        </div>
        
        <div style={styles.tagInput}>
          {tags.map(tag => (
            <span key={tag} style={styles.tag}>
              {tag}
              <span style={styles.tagRemove} onClick={() => removeTag(tag)}>×</span>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            onBlur={addTag}
            placeholder="Add tag..."
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              minWidth: '100px',
              background: 'transparent',
            }}
          />
        </div>
        <div style={styles.helpText}>
          Press Enter to add tags for organizing rules
        </div>
      </div>
      
      <div style={styles.divider} />
      
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'var(--color-background)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isEditing ? 'Save Changes' : 'Create Rule'}
        </button>
      </div>
    </div>
  );
}

export default RuleBuilder;
