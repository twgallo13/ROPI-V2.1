import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp, query, getDocs } from 'firebase/firestore';
import type {
  AITemplate,
  TemplateStatus,
  LayoutStyle,
  VoicePreset,
  MatchMode,
  ConditionOperator,
  ConditionField,
  BulletTopic,
  TemplateCondition
} from '../../types/ai-template';

interface AITemplateBuilderProps {
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const TEMPLATE_KEYS = [
  'default',
  'mens_footwear',
  'womens_footwear',
  'kids_gs',
  'toddler',
  'apparel_mens',
  'apparel_womens',
  'accessories'
];

const VOICE_PRESETS: { value: VoicePreset; label: string }[] = [
  { value: 'clean-retail', label: 'Clean Retail' },
  { value: 'hype-drop', label: 'Hype Drop' },
  { value: 'parent-friendly', label: 'Parent-Friendly' },
  { value: 'tech-performance', label: 'Tech Performance' },
  { value: 'luxury', label: 'Luxury' }
];

const LAYOUT_OPTIONS: { value: LayoutStyle; label: string }[] = [
  { value: 'headline+paragraph+bullets', label: 'Headline + Paragraph + Bullets' },
  { value: 'paragraph-only', label: 'Paragraph Only' },
  { value: 'short-blurb', label: 'Short Blurb' }
];

const BULLET_TOPICS: { value: BulletTopic; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'durability', label: 'Durability' },
  { value: 'use_case', label: 'Use Case' },
  { value: 'care', label: 'Care' },
  { value: 'traction', label: 'Traction' }
];

const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
  { value: 'gender', label: 'Gender' },
  { value: 'department', label: 'Department' },
  { value: 'ageGroup', label: 'Age Group' },
  { value: 'materials', label: 'Materials' },
  { value: 'launchDate', label: 'Launch Date' }
];

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: '==', label: 'Equals' },
  { value: 'is-any-of', label: 'Is Any Of' },
  { value: 'includes', label: 'Includes' },
  { value: 'within-last-n-days', label: 'Within Last N Days' }
];

const AITemplateBuilder: React.FC<AITemplateBuilderProps> = ({ onShowToast }) => {
  const [selectedKey, setSelectedKey] = useState<string>('default');
  const [template, setTemplate] = useState<AITemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdvancedJSON, setShowAdvancedJSON] = useState(false);

  // Normalize legacy/partial template docs to full AITemplate
  const normalizeTemplate = (data: Partial<AITemplate>, key: string): AITemplate => {
    return {
      key,
      scope: data.scope || 'audience',
      title: data.title || getTitleForKey(key),
      status: (data.status as TemplateStatus) || 'draft',
      description: data.description || '',
      version: data.version || 'v2',
      conditions: data.conditions || [],
      matchMode: data.matchMode || 'ALL',
      format: {
        layout: data.format?.layout || 'paragraph-only',
        headlineEnabled: data.format?.headlineEnabled ?? false,
        headlinePattern: data.format?.headlinePattern || '',
        paragraph: {
          min: data.format?.paragraph?.min ?? 40,
          max: data.format?.paragraph?.max ?? 80,
          allowTwoParagraphs: data.format?.paragraph?.allowTwoParagraphs ?? false,
        },
        bullets: {
          min: data.format?.bullets?.min ?? 0,
          max: data.format?.bullets?.max ?? 0,
          topics: data.format?.bullets?.topics || [],
        },
      },
      voice: {
        preset: data.voice?.preset || 'clean-retail',
        description: data.voice?.description || '',
        avoid: data.voice?.avoid || [],
        brandRules: data.voice?.brandRules || '',
      },
      seo: {
        metaTitlePattern: data.seo?.metaTitlePattern || '{{brand}} {{name}} | {{fit}} {{category}}',
        includeFit: data.seo?.includeFit ?? true,
        includeUseCase: data.seo?.includeUseCase ?? false,
        includeMaterial: data.seo?.includeMaterial ?? true,
      },
      prompt_body: data.prompt_body || '',
      seo_rules: data.seo_rules || '',
      tone_rules: data.tone_rules || '',
      length_rules: data.length_rules || '',
      examples: data.examples || [],
      banned_terms: (data as any).banned_terms || [],
      updatedBy: data.updatedBy,
      updatedAt: data.updatedAt,
    };
  };

  // Load template from Firestore
  useEffect(() => {
    if (!selectedKey) return;

    const loadTemplate = async () => {
      setLoading(true);
      try {
        const templateDoc = await getDoc(doc(db, 'settings', 'ai', 'prompts', selectedKey));        
        if (templateDoc.exists()) {
          const data = templateDoc.data() as Partial<AITemplate>;
          const normalized = normalizeTemplate(data, selectedKey);
          setTemplate(normalized);
        } else {
          // Create default template structure
          setTemplate({
            key: selectedKey,
            scope: 'audience',
            title: getTitleForKey(selectedKey),
            status: 'draft',
            description: '',
            version: 'v2',
            conditions: [],
            matchMode: 'ALL',
            format: {
              layout: 'paragraph-only',
              headlineEnabled: false,
              paragraph: { min: 40, max: 80, allowTwoParagraphs: false },
              bullets: { min: 0, max: 0, topics: [] }
            },
            voice: {
              preset: 'clean-retail',
              description: '',
              avoid: [],
              brandRules: ''
            },
            seo: {
              metaTitlePattern: '{{brand}} {{name}} | {{category}}',
              includeFit: true,
              includeUseCase: false,
              includeMaterial: true
            },
            prompt_body: '',
            seo_rules: '',
            tone_rules: '',
            length_rules: '',
            examples: [],
            banned_terms: []
          });
        }
      } catch (error) {
        console.error('[AITemplateBuilder] Failed to load template:', error);
        onShowToast?.('Failed to load template', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [selectedKey, onShowToast]);

  const getTitleForKey = (key: string): string => {
    const titles: Record<string, string> = {
      default: 'Default Template',
      mens_footwear: "Men's Footwear",
      womens_footwear: "Women's Footwear",
      kids_gs: 'Grade School Kids',
      toddler: 'Toddler/Infant',
      apparel_mens: "Men's Apparel",
      apparel_womens: "Women's Apparel",
      accessories: 'Accessories'
    };
    return titles[key] || key;
  };

  const handleSave = async () => {
    if (!template || !selectedKey) return;

    setSaving(true);
    try {
      const templateData: AITemplate = {
        ...template,
        updatedBy: 'admin', // TODO: Get from auth context
        updatedAt: serverTimestamp()
      };

      await setDoc(
        doc(db, 'settings', 'ai', 'prompts', selectedKey),
        { ...templateData, key: selectedKey },
        { merge: true }
      );
      
      onShowToast?.('Template saved successfully', 'success');
    } catch (error) {
      console.error('[AITemplateBuilder] Failed to save template:', error);
      onShowToast?.('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!template) return;
    if (!confirm('Reset this template to default? This will overwrite your current changes.')) return;

    try {
      const response = await fetch('/scripts/ai-templates-seed-v2.json');
      const seedData = await response.json();
      const seedTemplate = seedData.templates.find((t: AITemplate) => t.key === selectedKey);

      if (seedTemplate) {
        setTemplate(seedTemplate);
        onShowToast?.('Template reset to default', 'success');
      }
    } catch (error) {
      console.error('[AITemplateBuilder] Failed to load seed data:', error);
      onShowToast?.('Failed to reset template', 'error');
    }
  };

  // Condition handlers
  const handleAddCondition = () => {
    if (!template) return;
    const newCondition: TemplateCondition = {
      field: 'gender',
      operator: '==',
      value: ''
    };
    setTemplate({
      ...template,
      conditions: [...(template.conditions || []), newCondition]
    });
  };

  const handleRemoveCondition = (index: number) => {
    if (!template || !template.conditions) return;
    const newConditions = template.conditions.filter((_, i) => i !== index);
    setTemplate({ ...template, conditions: newConditions });
  };

  const handleConditionChange = (index: number, field: keyof TemplateCondition, value: any) => {
    if (!template || !template.conditions) return;
    const newConditions = [...template.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setTemplate({ ...template, conditions: newConditions });
  };

  // Bullet topic handlers
  const handleToggleBulletTopic = (topic: BulletTopic) => {
    if (!template?.format?.bullets) return;
    const topics = template.format.bullets.topics || [];
    const newTopics = topics.includes(topic)
      ? topics.filter(t => t !== topic)
      : [...topics, topic];
    
    setTemplate({
      ...template,
      format: {
        ...template.format,
        bullets: {
          ...template.format.bullets,
          topics: newTopics
        }
      }
    });
  };

  // Voice avoid words handlers
  const handleAddAvoidWord = (word: string) => {
    if (!template?.voice || !word.trim()) return;
    const avoid = template.voice.avoid || [];
    if (!avoid.includes(word.trim())) {
      setTemplate({
        ...template,
        voice: {
          ...template.voice,
          avoid: [...avoid, word.trim()]
        }
      });
    }
  };

  const handleRemoveAvoidWord = (word: string) => {
    if (!template?.voice) return;
    const avoid = template.voice.avoid || [];
    setTemplate({
      ...template,
      voice: {
        ...template.voice,
        avoid: avoid.filter(w => w !== word)
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
        Loading template...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
        Select a template to edit
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Left Sidebar: Template List */}
      <div className="col-span-1">
        <div className="bg-white shadow rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Audience Templates</h3>
          <ul className="space-y-1">
            {TEMPLATE_KEYS.map(key => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    selectedKey === key
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {getTitleForKey(key)}
                  {template && template.key === key && template.status === 'draft' && (
                    <span className="ml-2 text-xs text-yellow-600">(Draft)</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel: Template Builder Form */}
      <div className="col-span-3">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{template.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Key: <code className="bg-gray-100 px-2 py-0.5 rounded">{template.key}</code>
                {' • '}
                Version: <code className="bg-gray-100 px-2 py-0.5 rounded">{template.version}</code>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Reset to Default
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !selectedKey}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {/* Section 1: Basic Info */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Basic Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={template.title}
                    onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={template.status || 'draft'}
                    onChange={(e) => setTemplate({ ...template, status: e.target.value as TemplateStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Only "Active" templates will be used in production
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={template.description || ''}
                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Brief description of this template's purpose..."
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Audience & Conditions */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Audience & Conditions</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Match Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={template.matchMode === 'ALL'}
                      onChange={() => setTemplate({ ...template, matchMode: 'ALL' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">ALL conditions must match</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={template.matchMode === 'ANY'}
                      onChange={() => setTemplate({ ...template, matchMode: 'ANY' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">ANY condition can match</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Conditions</label>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Condition
                  </button>
                </div>

                <div className="space-y-2">
                  {(template.conditions || []).map((condition, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                      <select
                        value={condition.field}
                        onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md"
                      >
                        {CONDITION_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md"
                      >
                        {CONDITION_OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value)}
                        onChange={(e) => {
                          const val = condition.operator === 'is-any-of' 
                            ? e.target.value.split(',').map(v => v.trim())
                            : e.target.value;
                          handleConditionChange(idx, 'value', val);
                        }}
                        placeholder={condition.operator === 'is-any-of' ? 'Value1, Value2, ...' : 'Value'}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="text-red-600 hover:text-red-800 text-sm px-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {(!template.conditions || template.conditions.length === 0) && (
                    <p className="text-sm text-gray-500 italic py-2">
                      No conditions set. This template will only be used if no other template matches.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Section 3: Formatting Style */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Formatting Style</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
                  <select
                    value={template.format?.layout || 'paragraph-only'}
                    onChange={(e) => setTemplate({
                      ...template,
                      format: { ...(template.format || { paragraph: { min: 40, max: 80, allowTwoParagraphs: false }, bullets: { min: 0, max: 0, topics: [] } }), layout: e.target.value as LayoutStyle }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {LAYOUT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <input
                      type="checkbox"
                      checked={template.format?.headlineEnabled || false}
                      onChange={(e) => setTemplate({
                        ...template,
                        format: { ...(template.format || { layout: 'paragraph-only', paragraph: { min: 40, max: 80, allowTwoParagraphs: false }, bullets: { min: 0, max: 0, topics: [] } }), headlineEnabled: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Enable Headline
                  </label>
                  {template.format?.headlineEnabled && (
                    <input
                      type="text"
                      value={template.format.headlinePattern || ''}
                      onChange={(e) => setTemplate({
                        ...template,
                        format: { ...template.format!, headlinePattern: e.target.value }
                      })}
                      placeholder="{{brand}} {{name}} - {{fit}} {{category}}"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paragraph Length</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Words</label>
                      <input
                        type="number"
                        value={template.format?.paragraph?.min || 40}
                        onChange={(e) => setTemplate({
                          ...template,
                          format: {
                            ...(template.format || { layout: 'paragraph-only', headlineEnabled: false, bullets: { min: 0, max: 0, topics: [] } }),
                            paragraph: { ...(template.format?.paragraph || { max: 80, allowTwoParagraphs: false }), min: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Words</label>
                      <input
                        type="number"
                        value={template.format?.paragraph?.max || 80}
                        onChange={(e) => setTemplate({
                          ...template,
                          format: {
                            ...(template.format || { layout: 'paragraph-only', headlineEnabled: false, bullets: { min: 0, max: 0, topics: [] } }),
                            paragraph: { ...(template.format?.paragraph || { min: 40, allowTwoParagraphs: false }), max: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={template.format?.paragraph?.allowTwoParagraphs || false}
                          onChange={(e) => setTemplate({
                            ...template,
                            format: {
                              ...(template.format || { layout: 'paragraph-only', headlineEnabled: false, bullets: { min: 0, max: 0, topics: [] } }),
                              paragraph: { ...(template.format?.paragraph || { min: 40, max: 80 }), allowTwoParagraphs: e.target.checked }
                            }
                          })}
                          className="mr-2"
                        />
                        Allow 2 Paragraphs
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bullet Structure</label>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Bullets</label>
                      <input
                        type="number"
                        value={template.format?.bullets?.min || 0}
                        onChange={(e) => setTemplate({
                          ...template,
                          format: {
                            ...(template.format || { layout: 'paragraph-only', headlineEnabled: false, paragraph: { min: 40, max: 80, allowTwoParagraphs: false } }),
                            bullets: { ...(template.format?.bullets || { max: 0, topics: [] }), min: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Bullets</label>
                      <input
                        type="number"
                        value={template.format?.bullets?.max || 0}
                        onChange={(e) => setTemplate({
                          ...template,
                          format: {
                            ...(template.format || { layout: 'paragraph-only', headlineEnabled: false, paragraph: { min: 40, max: 80, allowTwoParagraphs: false } }),
                            bullets: { ...(template.format?.bullets || { min: 0, topics: [] }), max: parseInt(e.target.value) || 0 }
                          }
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Bullet Topics (click to select)</label>
                    <div className="flex flex-wrap gap-2">
                      {BULLET_TOPICS.map(topic => {
                        const isSelected = (template.format?.bullets?.topics || []).includes(topic.value);
                        return (
                          <button
                            key={topic.value}
                            type="button"
                            onClick={() => handleToggleBulletTopic(topic.value)}
                            className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {topic.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Tone & Voice */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Tone & Voice</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voice Preset</label>
                  <select
                    value={template.voice?.preset || 'clean-retail'}
                    onChange={(e) => setTemplate({
                      ...template,
                      voice: { ...(template.voice || { description: '', avoid: [], brandRules: '' }), preset: e.target.value as VoicePreset }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {VOICE_PRESETS.map(preset => (
                      <option key={preset.value} value={preset.value}>{preset.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Voice Description</label>
                  <textarea
                    value={template.voice?.description || ''}
                    onChange={(e) => setTemplate({
                      ...template,
                      voice: { ...(template.voice || { preset: 'clean-retail', avoid: [], brandRules: '' }), description: e.target.value }
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe the tone and voice for this audience..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Words to Avoid</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(template.voice?.avoid || []).map(word => (
                      <span
                        key={word}
                        className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-sm rounded"
                      >
                        {word}
                        <button
                          type="button"
                          onClick={() => handleRemoveAvoidWord(word)}
                          className="ml-1 text-red-900 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Type word and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAvoidWord(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Press Enter to add each word</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Rules</label>
                  <textarea
                    value={template.voice?.brandRules || ''}
                    onChange={(e) => setTemplate({
                      ...template,
                      voice: { ...(template.voice || { preset: 'clean-retail', description: '', avoid: [] }), brandRules: e.target.value }
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Brand-specific tone rules..."
                  />
                </div>
              </div>
            </section>

            {/* Section 5: SEO */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">SEO Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title Pattern</label>
                  <input
                    type="text"
                    value={template.seo?.metaTitlePattern || ''}
                    onChange={(e) => setTemplate({
                      ...template,
                      seo: { ...(template.seo || { includeFit: true, includeUseCase: false, includeMaterial: true }), metaTitlePattern: e.target.value }
                    })}
                    placeholder="{{brand}} {{name}} | {{fit}} {{category}}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Use {'{'}{'{'} brand {'}'}{'}'},  {'{'}{'{'} name {'}'}{'}'},  {'{'}{'{'} category {'}'}{'}'},  {'{'}{'{'} fit {'}'}{'}'} variables</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={template.seo?.includeFit || false}
                      onChange={(e) => setTemplate({
                        ...template,
                        seo: { ...(template.seo || { metaTitlePattern: '', includeUseCase: false, includeMaterial: true }), includeFit: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Include Fit
                  </label>
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={template.seo?.includeUseCase || false}
                      onChange={(e) => setTemplate({
                        ...template,
                        seo: { ...(template.seo || { metaTitlePattern: '', includeFit: true, includeMaterial: true }), includeUseCase: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Include Use Case
                  </label>
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={template.seo?.includeMaterial || false}
                      onChange={(e) => setTemplate({
                        ...template,
                        seo: { ...(template.seo || { metaTitlePattern: '', includeFit: true, includeUseCase: false }), includeMaterial: e.target.checked }
                      })}
                      className="mr-2"
                    />
                    Include Material
                  </label>
                </div>
              </div>
            </section>

            {/* Section 6: Advanced JSON */}
            <section>
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="text-lg font-medium text-gray-900">Advanced JSON</h3>
                <button
                  type="button"
                  onClick={() => setShowAdvancedJSON(!showAdvancedJSON)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {showAdvancedJSON ? 'Hide' : 'Show'} Raw JSON
                </button>
              </div>

              {showAdvancedJSON && (
                <div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Warning:</strong> Editing raw JSON directly can break the template. 
                      Only modify if you know what you're doing.
                    </p>
                  </div>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-xs font-mono max-h-96">
                    {JSON.stringify(template, null, 2)}
                  </pre>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITemplateBuilder;
