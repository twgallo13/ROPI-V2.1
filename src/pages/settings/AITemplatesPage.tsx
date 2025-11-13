import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AITemplate {
  key: string;
  scope: string;
  title: string;
  prompt_body: string;
  seo_rules: string;
  tone_rules: string;
  length_rules: string;
  examples: Array<{ label: string; input: string; output: string }>;
  banned_terms: string; // comma-separated, will be stored as array
  version: string;
  updatedBy?: string;
  updatedAt?: any;
}

interface AITemplatesPageProps {
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const TEMPLATE_KEYS = ['default', 'mens', 'womens', 'gradeSchool', 'toddler'];

const AITemplatesPage: React.FC<AITemplatesPageProps> = ({ onShowToast }) => {
  const [selectedKey, setSelectedKey] = useState<string>('default');
  const [template, setTemplate] = useState<AITemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load template from Firestore
  useEffect(() => {
    if (!selectedKey) return;

    const loadTemplate = async () => {
      setLoading(true);
      try {
        const templateDoc = await getDoc(doc(db, 'settings', 'ai', 'prompts', selectedKey));
        
        if (templateDoc.exists()) {
          const data = templateDoc.data() as AITemplate;
          // Convert banned_terms array to comma-separated string for editing
          const bannedStr = Array.isArray(data.banned_terms) 
            ? data.banned_terms.join(', ') 
            : data.banned_terms || '';
          
          setTemplate({ ...data, banned_terms: bannedStr });
        } else {
          // Template doesn't exist yet, create default structure
          setTemplate({
            key: selectedKey,
            scope: 'audience',
            title: getTitleForKey(selectedKey),
            prompt_body: '',
            seo_rules: '',
            tone_rules: '',
            length_rules: '',
            examples: [],
            banned_terms: '',
            version: 'v1',
          });
        }
      } catch (error) {
        console.error('[AITemplates] Failed to load template:', error);
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
      mens: "Men's Template",
      womens: "Women's Template",
      gradeSchool: 'Grade School Template',
      toddler: 'Toddler Template',
    };
    return titles[key] || key;
  };

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      // Convert banned_terms comma-separated string to array
      const bannedArray = template.banned_terms
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const templateData: any = {
        key: template.key,
        scope: template.scope,
        title: template.title,
        prompt_body: template.prompt_body,
        seo_rules: template.seo_rules,
        tone_rules: template.tone_rules,
        length_rules: template.length_rules,
        examples: template.examples,
        banned_terms: bannedArray,
        version: template.version,
        updatedBy: 'admin', // TODO: Get from auth context
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'settings', 'ai', 'prompts', template.key), templateData);
      
      onShowToast?.('Template saved successfully', 'success');
    } catch (error) {
      console.error('[AITemplates] Failed to save template:', error);
      onShowToast?.('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!template) return;
    if (!confirm('Reset this template to default? This will overwrite your current changes.')) return;

    try {
      // Load from seed data
      const response = await fetch('/scripts/ai-templates-seed.json');
      const seedData = await response.json();
      const seedTemplate = seedData.templates.find((t: any) => t.key === selectedKey);

      if (seedTemplate) {
        const bannedStr = Array.isArray(seedTemplate.banned_terms)
          ? seedTemplate.banned_terms.join(', ')
          : seedTemplate.banned_terms || '';

        setTemplate({ ...seedTemplate, banned_terms: bannedStr });
        onShowToast?.('Template reset to default', 'success');
      }
    } catch (error) {
      console.error('[AITemplates] Failed to load seed data:', error);
      onShowToast?.('Failed to reset template', 'error');
    }
  };

  const handleFieldChange = (field: keyof AITemplate, value: any) => {
    if (!template) return;
    setTemplate({ ...template, [field]: value });
  };

  const handleExampleChange = (index: number, field: 'label' | 'input' | 'output', value: string) => {
    if (!template) return;
    const newExamples = [...template.examples];
    newExamples[index] = { ...newExamples[index], [field]: value };
    setTemplate({ ...template, examples: newExamples });
  };

  const handleAddExample = () => {
    if (!template) return;
    setTemplate({
      ...template,
      examples: [...template.examples, { label: '', input: '', output: '' }],
    });
  };

  const handleRemoveExample = (index: number) => {
    if (!template) return;
    const newExamples = template.examples.filter((_, i) => i !== index);
    setTemplate({ ...template, examples: newExamples });
  };

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
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel: Template Editor */}
      <div className="col-span-3">
        {loading ? (
          <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
            Loading template...
          </div>
        ) : template ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{template.title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Template Key: <code className="bg-gray-100 px-2 py-0.5 rounded">{template.key}</code>
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
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={template.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Prompt Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt Body
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    (Main template text sent to AI)
                  </span>
                </label>
                <textarea
                  value={template.prompt_body}
                  onChange={(e) => handleFieldChange('prompt_body', e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder="You are ROPI AI..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use Handlebars syntax for variables: {`{{name}}`}, {`{{brand}}`}, {`{{#if condition}}...{{/if}}`}
                </p>
              </div>

              {/* SEO Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SEO Rules</label>
                <textarea
                  value={template.seo_rules}
                  onChange={(e) => handleFieldChange('seo_rules', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Rules for meta_keywords, meta_title, meta_description..."
                />
              </div>

              {/* Tone Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tone Rules</label>
                <textarea
                  value={template.tone_rules}
                  onChange={(e) => handleFieldChange('tone_rules', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Guidelines for tone and voice..."
                />
              </div>

              {/* Length Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length Rules</label>
                <textarea
                  value={template.length_rules}
                  onChange={(e) => handleFieldChange('length_rules', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Short: 1-2 sentences. Medium: 3-4 sentences..."
                />
              </div>

              {/* Banned Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banned Terms
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    (Comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={template.banned_terms}
                  onChange={(e) => handleFieldChange('banned_terms', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="guaranteed, revolutionary, game-changer"
                />
              </div>

              {/* Examples */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Examples</label>
                  <button
                    type="button"
                    onClick={handleAddExample}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add Example
                  </button>
                </div>
                <div className="space-y-3">
                  {template.examples.map((example, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <input
                          type="text"
                          value={example.label}
                          onChange={(e) => handleExampleChange(idx, 'label', e.target.value)}
                          placeholder="Example label"
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExample(idx)}
                          className="ml-2 text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Input</label>
                          <textarea
                            value={example.input}
                            onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                            placeholder="Product attributes..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Output</label>
                          <textarea
                            value={example.output}
                            onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                            placeholder="Expected description..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {template.examples.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No examples yet. Click "Add Example" to create one.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
            Select a template to edit
          </div>
        )}
      </div>
    </div>
  );
};

export default AITemplatesPage;
