# Admin UI Build Spec — Settings CRUD

This document provides complete specifications for building the Admin Console UI screens. Use this with Cursor, Copilot, or any AI coding assistant.

---

## Settings Hub (`/app/settings`)

The Settings Hub is the central administrative page providing access to all configuration subsystems. It replaces older "tabbed settings" descriptions with a modern, card-based layout.

Route: `/app/settings`

Component: `SettingsDashboard`

Access: `admin` only

Firestore: All subsystems reference `settings/*` collections.

### Cards Displayed on `/app/settings`

1. **Attributes**
    - Route: `/app/settings/attributes`
    - Allows admins to define, edit, and manage attribute keys, labels, allowed values, and data type rules.
2. **Smart Rules**
    - Route: `/app/settings/smart-rules`
    - Create automation rules that observe product data and perform transformations or suggestions.
3. **AI Templates (Audience Templates)**
    - Route: `/app/settings/ai-templates`
    - Full Audience Template Builder (see Section 4).
    - Controls tone, formatting, conditions, SEO templates, banned words, examples.
4. **AI Settings (Global Controls)**
    - Route: `/app/settings/ai`
    - System-wide knobs for Describe behavior: default template per site, global tone preset, rate limits, async flags, experimentation toggles.
5. **Export Profiles**
    - Route: `/app/settings/export-profiles`
    - Controls CSV/Feed mapping defaults used in export pipelines.
6. **Archiver & Retention**
    - Route: `/app/settings/archiver`
    - Controls automated cleanup, retention lengths, and archive thresholds.
7. **Users**
    - Route: `/app/settings/users`
    - Admin-only user list, role editor, and access control.
8. **Search & Filters**
    - Route: `/app/settings/search`
    - Controls which attributes are searchable, which attributes appear as filters in product lists, and the default search/filter behavior for the catalog UI.
    - Connected to: Product catalog list (search, filters, bulk actions) in "Ropi AOSS", product API filters in Section 6 — API Contracts, and attribute flags in "Attribute Registry — Human & JSON".
9. **Import Settings**
    - Route: `/app/settings/import-settings`
    - Allows configuration of import normalization rules, default field mappings, allowed values, and error-handling policies.
    - Ties directly into Section 3.1 (Row Schema) and Section 3.2 (Normalization Rules).
10. **Export Settings**
    - Route: `/app/settings/export-settings`
    - Controls site-specific CSV/Feed mapping, field transforms, and default distributions.
    - Connects to product-completion pipelines and outbound syndication rules.
11. **Bulk Actions Settings**
    - Route: `/app/settings/bulk-actions`
    - Controls which bulk actions are available in the product list:
        - Bulk Describe
        - Bulk Apply Template
        - Bulk Update Attributes
        - Bulk Status Changes
        - Bulk Export
        - Bulk Smart Rule Execution
12. **Workflow Settings**
    - Route: `/app/settings/workflows`
    - Controls workflow toggles, required fields, Describe preconditions, and automation behavior across:
        - Workflow W1 — Observations → Product
        - Workflow W2 — Full Product Completion
        - Product Completion Required Field groups
        - Enforcement rules for Describe
13. **AI Performance & Caching**
    - Route: `/app/settings/ai-performance`
    - Controls AI Describe performance behavior: concurrency limits, queueing, and result caching TTLs.
    - Ties into: Section 5 — AI Describe Engine and Section 11 — Observability, Monitoring & Runbooks.
14. **Roles & Permissions**
    - Route: `/app/settings/permissions`
    - Defines which roles can access which modules, including AI Templates, AI Settings, Bulk Actions, Workflows, Search Settings, and Import/Export Settings.
    - Integrated with Firebase Security Rules (Section 9).

Each card displays:

- Title
- Short description
- "Manage" button
- Status indicator (e.g., "X templates active", "Y rules configured") where applicable

This card layout is the **canonical** and **only** definition of the Settings root page.

### 1.8 Related Systems

The Settings Hub integrates with the following system components:

- **AI Describe Engine** (Section 5)
- **Workflow W2 — Product Completion**
- **Observations System** (attribute quality affects filters, templates, and Describe)
- **Import Engine (Section 3)** — inputs to product data
- **Export Engine (Section 6)** — outputs based on templates and metadata

---

## Overview

### Routes to Build

| Route | Component | Purpose |
| --- | --- | --- |
| `/app/settings` | `SettingsDashboard` | Root Settings Hub. Displays all settings cards: Attributes, Smart Rules, AI Templates, AI Settings, Export Profiles, Archiver, Users. |
| `/app/settings/attributes` | `AttributeManager` | Manage all attributes |
| `/app/settings/attributes/:id` | `AttributeEditor` | Edit single attribute |
| `/app/settings/smart-rules` | `SmartRulesManager` | Manage Smart Rules |
| `/app/settings/smart-rules/:id` | `SmartRuleEditor` | Edit single rule |
| `/app/settings/ai-templates` | `AITemplateBuilder` | Admin-only Audience Template Builder for AI product descriptions. Manages audience-based templates, formatting rules, tone presets, SEO patterns, and matching conditions used by Section 5 — AI Describe Engine. |
| `/app/settings/users` | `UserManager` | Manage users |

### Tech Stack

- React + TypeScript
- React Router v6
- Firebase Firestore
- React Hook Form (for forms)
- Tailwind CSS (styling)

---

## 1. Settings Dashboard

### Route: `/app/settings`

### Component: `SettingsDashboard.tsx`

```tsx
// src/pages/settings/SettingsDashboard.tsx
import { Link } from 'react-router-dom';
import { 
  TagIcon, 
  CogIcon, 
  SparklesIcon, 
  UsersIcon,
  DocumentTextIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  count?: number;
}

export function SettingsDashboard() {
  const cards: SettingsCard[] = [
    {
      title: 'Attributes',
      description: 'Manage product attributes and allowed values',
      href: '/app/settings/attributes',
      icon: TagIcon,
    },
    {
      title: 'Smart Rules',
      description: 'Configure automation rules for product enrichment',
      href: '/app/settings/smart-rules',
      icon: CogIcon,
    },
    {
      title: 'AI Templates',
      description: 'Manage AI description generation templates',
      href: '/app/settings/ai-templates',
      icon: SparklesIcon,
    },
    {
      title: 'Users',
      description: 'Manage user access and roles',
      href: '/app/settings/users',
      icon: UsersIcon,
    },
    {
      title: 'Export Profiles',
      description: 'Configure CSV export mappings',
      href: '/app/settings/export-profiles',
      icon: DocumentTextIcon,
    },
    {
      title: 'Archiver',
      description: 'Configure retention and archival settings',
      href: '/app/settings/archiver',
      icon: ArchiveBoxIcon,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[cards.map](http://cards.map)((card) => (
          <Link
            key={card.href}
            to={card.href}
            className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <card.icon className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">{card.title}</h2>
            </div>
            <p className="text-gray-600 text-sm">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## 2. Attribute Manager

### Route: `/app/settings/attributes`

### Firestore Collection: `settings/attributes/keys/{attributeId}`

### Document Schema

```tsx
// src/types/attribute.ts
export interface Attribute {
  attribute_id: string;           // e.g., "descriptive.primaryColor"
  label: string;                  // e.g., "Primary Color"
  external_header: string | null; // CSV column name
  category: 'sku_core' | 'descriptive' | 'technical' | 'pricing' | 'launch';
  data_type: 'string' | 'number' | 'boolean' | 'select' | 'multi-select' | 'date';
  allowed_values?: string[];      // For select/multi-select
  synonyms?: Record<string, string>; // e.g., {"blk": "Black"}
  required_for_completion: boolean;
  required_for_export: boolean;
  import_required: boolean;
  ai_usage_notes?: string;
  status: 'active' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}
```

### Component: `AttributeManager.tsx`

```tsx
// src/pages/settings/AttributeManager.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Attribute } from '@/types/attribute';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export function AttributeManager() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadAttributes();
  }, []);

  async function loadAttributes() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'settings/attributes/keys'));
      const attrs = [snapshot.docs.map](http://snapshot.docs.map)(doc => ({
        ...[doc.data](http://doc.data)(),
        attribute_id: [doc.id](http://doc.id)
      })) as Attribute[];
      setAttributes(attrs.sort((a, b) => a.label.localeCompare(b.label)));
    } catch (error) {
      console.error('Failed to load attributes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this attribute?')) return;
    
    try {
      await deleteDoc(doc(db, 'settings/attributes/keys', id));
      setAttributes(prev => prev.filter(a => a.attribute_id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete attribute');
    }
  }

  const filteredAttributes = attributes.filter(attr => {
    if (filter === 'all') return true;
    if (filter === 'active') return attr.status === 'active';
    if (filter === 'deprecated') return attr.status === 'deprecated';
    return attr.category === filter;
  });

  const categories = ['sku_core', 'descriptive', 'technical', 'pricing', 'launch'];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attributes</h1>
          <p className="text-gray-600">Manage product attributes and allowed values</p>
        </div>
        <Link
          to="/app/settings/attributes/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Add Attribute
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          All ({attributes.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-3 py-1 rounded-full text-sm ${filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('deprecated')}
          className={`px-3 py-1 rounded-full text-sm ${filter === 'deprecated' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
        >
          Deprecated
        </button>
        {[categories.map](http://categories.map)(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-sm ${filter === cat ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Label</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Values</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[filteredAttributes.map](http://filteredAttributes.map)((attr) => (
                <tr key={attr.attribute_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{attr.label}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{attr.attribute_id}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">{[attr.data](http://attr.data)_type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{attr.category}</td>
                  <td className="px-4 py-3 text-sm">
                    {attr.allowed_values?.length || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${attr.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {attr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/app/settings/attributes/${encodeURIComponent(attr.attribute_id)}`}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5 text-gray-600" />
                      </Link>
                      <button
                        onClick={() => handleDelete(attr.attribute_id)}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### Component: `AttributeEditor.tsx`

```tsx
// src/pages/settings/AttributeEditor.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Attribute } from '@/types/attribute';
import { useForm, useFieldArray } from 'react-hook-form';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

type FormData = Omit<Attribute, 'createdAt' | 'updatedAt'>;

export function AttributeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      attribute_id: '',
      label: '',
      external_header: '',
      category: 'descriptive',
      data_type: 'string',
      allowed_values: [],
      synonyms: {},
      required_for_completion: false,
      required_for_export: false,
      import_required: false,
      ai_usage_notes: '',
      status: 'active',
    }
  });

  const dataType = watch('data_type');
  const [allowedValues, setAllowedValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');
  const [synonyms, setSynonyms] = useState<Array<{key: string, value: string}>>([]);

  useEffect(() => {
    if (!isNew && id) {
      loadAttribute(decodeURIComponent(id));
    }
  }, [id, isNew]);

  async function loadAttribute(attributeId: string) {
    try {
      const docRef = doc(db, 'settings/attributes/keys', attributeId);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        const data = [snapshot.data](http://snapshot.data)() as Attribute;
        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'createdAt' && key !== 'updatedAt') {
            setValue(key as keyof FormData, value);
          }
        });
        setAllowedValues(data.allowed_values || []);
        setSynonyms(
          Object.entries(data.synonyms || {}).map(([key, value]) => ({ key, value }))
        );
      }
    } catch (error) {
      console.error('Failed to load attribute:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const attributeId = isNew ? data.attribute_id : id!;
      const docRef = doc(db, 'settings/attributes/keys', attributeId);
      
      const synonymsObj = synonyms.reduce((acc, { key, value }) => {
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      await setDoc(docRef, {
        ...data,
        attribute_id: attributeId,
        allowed_values: allowedValues,
        synonyms: synonymsObj,
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {})
      }, { merge: true });

      navigate('/app/settings/attributes');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save attribute');
    } finally {
      setSaving(false);
    }
  }

  function addAllowedValue() {
    if (newValue.trim() && !allowedValues.includes(newValue.trim())) {
      setAllowedValues([...allowedValues, newValue.trim()]);
      setNewValue('');
    }
  }

  function removeAllowedValue(index: number) {
    setAllowedValues(allowedValues.filter((_, i) => i !== index));
  }

  function addSynonym() {
    setSynonyms([...synonyms, { key: '', value: '' }]);
  }

  function updateSynonym(index: number, field: 'key' | 'value', val: string) {
    const updated = [...synonyms];
    updated[index][field] = val;
    setSynonyms(updated);
  }

  function removeSynonym(index: number) {
    setSynonyms(synonyms.filter((_, i) => i !== index));
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">
        {isNew ? 'New Attribute' : 'Edit Attribute'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Attribute ID *</label>
              <input
                {...register('attribute_id', { required: true })}
                disabled={!isNew}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100"
                placeholder="descriptive.primaryColor"
              />
              <p className="text-xs text-gray-500 mt-1">Use dot notation (e.g., descriptive.primaryColor)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Label *</label>
              <input
                {...register('label', { required: true })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Primary Color"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="sku_core">SKU Core</option>
                <option value="descriptive">Descriptive</option>
                <option value="technical">Technical</option>
                <option value="pricing">Pricing</option>
                <option value="launch">Launch</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Data Type *</label>
              <select
                {...register('data_type')}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="select">Select (single)</option>
                <option value="multi-select">Multi-Select</option>
                <option value="date">Date</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">External Header</label>
            <input
              {...register('external_header')}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="CSV column name for import/export"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </div>

        {/* Allowed Values (for select/multi-select) */}
        {(dataType === 'select' || dataType === 'multi-select') && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Allowed Values</h2>
            
            <div className="flex gap-2 mb-4">
              <input
                value={newValue}
                onChange={(e) => setNewValue([e.target](http://e.target).value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllowedValue())}
                className="flex-1 px-3 py-2 border rounded-lg"
                placeholder="Add a value..."
              />
              <button
                type="button"
                onClick={addAllowedValue}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {[allowedValues.map](http://allowedValues.map)((value, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full"
                >
                  {value}
                  <button
                    type="button"
                    onClick={() => removeAllowedValue(index)}
                    className="hover:text-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            
            {allowedValues.length === 0 && (
              <p className="text-gray-500 text-sm">No values added yet</p>
            )}
          </div>
        )}

        {/* Synonyms */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Synonyms</h2>
            <button
              type="button"
              onClick={addSynonym}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              + Add Synonym
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Map input values to canonical values (e.g., "blk" → "Black")
          </p>

          <div className="space-y-2">
            {[synonyms.map](http://synonyms.map)((syn, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  value={syn.key}
                  onChange={(e) => updateSynonym(index, 'key', [e.target](http://e.target).value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="Input (e.g., blk)"
                />
                <span className="text-gray-400">→</span>
                <input
                  value={syn.value}
                  onChange={(e) => updateSynonym(index, 'value', [e.target](http://e.target).value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="Output (e.g., Black)"
                />
                <button
                  type="button"
                  onClick={() => removeSynonym(index)}
                  className="p-2 hover:bg-red-100 rounded"
                >
                  <XMarkIcon className="w-5 h-5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Flags */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Requirements</h2>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('required_for_completion')}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Required for Completion</span>
                <p className="text-sm text-gray-600">Product won't be "complete" without this field</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('required_for_export')}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Required for Export</span>
                <p className="text-sm text-gray-600">Product can't be exported without this field</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('import_required')}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Required on Import</span>
                <p className="text-sm text-gray-600">Import will fail if this field is missing</p>
              </div>
            </label>
          </div>
        </div>

        {/* AI Notes */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">AI Usage Notes</h2>
          <textarea
            {...register('ai_usage_notes')}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Instructions for AI when using this attribute in descriptions..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Attribute'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/settings/attributes')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## 3. Smart Rules Manager

### Route: `/app/settings/smart-rules`

### Firestore Collection: `settings/smartRules/{ruleId}`

### Document Schema

```tsx
// src/types/smartRule.ts
export interface SmartRuleCondition {
  source: string;           // e.g., "source.rics.category_tokens"
  matchType: 'equals' | 'contains' | 'regex' | 'token' | 'in' | 'exists' | 'and' | 'or' | 'not';
  value: string | string[] | boolean | number | null;
  options?: Record<string, any>;
}

export interface SmartRuleAction {
  targetField: string;      // e.g., "descriptive.gender"
  valueTemplate: string;    // e.g., "{{tokenNormalized}}"
  confidenceModifier?: number;
}

export interface SmartRule {
  ruleId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;         // Higher = runs first
  tags?: string[];
  condition: SmartRuleCondition;
  action: SmartRuleAction;
  autoApply: boolean;
  autoApplyConfidence: number; // 0-1
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Component: `SmartRulesManager.tsx`

### Cross-Links

Smart Rules operate before the AI Describe Engine runs. They may:

- Enforce or normalize product attributes that audience templates depend on
- Set flags or values that influence template matching (e.g., modifying `department`, `gender`, or `materials`)
- Generate or adjust fields used in template conditions

Because of this, changes to Smart Rules may affect which AI Templates match a product and may alter the Describe output. Admins should review AI Settings and Templates when major rule adjustments are made.

### Interaction with Search Filters

Smart Rules that modify filterable attributes (e.g., gender, category, ageGroup) will immediately affect the visibility and grouping of products in catalog search views. Admins should validate that Smart Rules do not unintentionally collapse or split search facets.

### Workflow Integration

- Workflow Settings may override when Smart Rules run (manual vs automatic).

---

### Component: `SmartRulesManager.tsx`

```tsx
// src/pages/settings/SmartRulesManager.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SmartRule } from '@/types/smartRule';
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';

export function SmartRulesManager() {
  const [rules, setRules] = useState<SmartRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'settings/smartRules'));
      const rulesList = [snapshot.docs.map](http://snapshot.docs.map)(doc => ({
        ...[doc.data](http://doc.data)(),
        ruleId: [doc.id](http://doc.id)
      })) as SmartRule[];
      setRules(rulesList.sort((a, b) => b.priority - a.priority));
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(rule: SmartRule) {
    try {
      const docRef = doc(db, 'settings/smartRules', rule.ruleId);
      await updateDoc(docRef, { enabled: !rule.enabled });
      setRules(prev => [prev.map](http://prev.map)(r => 
        r.ruleId === rule.ruleId ? { ...r, enabled: !r.enabled } : r
      ));
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await deleteDoc(doc(db, 'settings/smartRules', ruleId));
      setRules(prev => prev.filter(r => r.ruleId !== ruleId));
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Smart Rules</h1>
          <p className="text-gray-600">Automate product attribute enrichment</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/app/settings/smart-rules/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add Rule
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold">{rules.length}</div>
          <div className="text-gray-600 text-sm">Total Rules</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">
            {rules.filter(r => r.enabled).length}
          </div>
          <div className="text-gray-600 text-sm">Enabled</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {rules.filter(r => r.autoApply).length}
          </div>
          <div className="text-gray-600 text-sm">Auto-Apply</div>
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-3">
          {[rules.map](http://rules.map)((rule) => (
            <div
              key={rule.ruleId}
              className={`bg-white rounded-lg border p-4 ${!rule.enabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleEnabled(rule)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <h3 className="font-semibold">{[rule.name](http://rule.name)}</h3>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Priority: {rule.priority}</span>
                    {rule.autoApply && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Auto-Apply</span>
                    )}
                  </div>
                  {rule.description && (
                    <p className="text-gray-600 text-sm mt-1">{rule.description}</p>
                  )}
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-mono bg-gray-100 px-1 rounded">{rule.condition.source}</span>
                    <span className="mx-2">→</span>
                    <span className="font-mono bg-gray-100 px-1 rounded">{rule.action.targetField}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/app/settings/smart-rules/${rule.ruleId}/test`}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Test Rule"
                  >
                    <PlayIcon className="w-5 h-5 text-gray-600" />
                  </Link>
                  <Link
                    to={`/app/settings/smart-rules/${rule.ruleId}`}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <PencilIcon className="w-5 h-5 text-gray-600" />
                  </Link>
                  <button
                    onClick={() => handleDelete(rule.ruleId)}
                    className="p-2 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Firestore Security Rules Update

---

## 4. AI Templates Manager (Audience Template Builder)

### 4.1 Purpose

The AI Templates Manager (Audience Template Builder) is the admin UI for configuring how AI writes product descriptions and SEO content for different audiences.

- Route: `/app/settings/ai-templates`
- Component: `AITemplateBuilder`
- Audience: `admin` role only (see Section 1 — Navigation & Page Index, Settings visibility)
- Backed by Firestore: `settings/ai/prompts/{templateKey}`

This page replaces the earlier minimal "AI Templates" concept and is the single source of truth for audience-specific AI Describe behavior.

---

### Cross-Links

- Audience templates feed directly into the AI Describe Engine (see Section 5 — AI Describe Engine, Template System).
- If an audience template does not specify tone, bullets, layout, SEO rules, or banned terms, the Describe Engine falls back to global AI Settings (see Section 5 — AI Settings).
- Smart Rules may pre-transform product data before Describe runs. When designing template conditions, consider how Smart Rules may modify attributes (see Section 4 — Smart Rules).

---

### 4.2 Template Object Model (`AITemplate`)

Templates are stored under `settings/ai/prompts/{templateKey}` and follow this shape (normalized from the existing UI and code):

```tsx
export type TemplateStatus = 'active' | 'draft' | 'disabled';
export type MatchMode = 'ALL' | 'ANY';
export type LayoutStyle = 'headline+paragraph+bullets' | 'paragraph-only' | 'short-blurb';
export type VoicePreset =
  | 'clean-retail'
  | 'hype-drop'
  | 'parent-friendly'
  | 'tech-performance'
  | 'luxury';

export type BulletTopic =
  | 'fit'
  | 'comfort'
  | 'durability'
  | 'use_case'
  | 'care'
  | 'traction';

export type ConditionField =
  | 'gender'
  | 'department'
  | 'ageGroup'
  | 'materials'
  | 'launchDate';

export type ConditionOperator =
  | '=='
  | 'is-any-of'
  | 'includes'
  | 'within-last-n-days';

export interface TemplateCondition {
  field: ConditionField;
  operator: ConditionOperator;
  /**
   * For 'is-any-of', value is string[]
   * For others, value is string or number
   */
  value: string | number | string[];
}

export interface AITemplate {
  /** Stable key for this audience template (e.g. 'default', 'mens_footwear'). */
  key: string;

  /** Logical scope for targeting (currently 'audience'). */
  scope: 'audience';

  /** Human-readable name shown in the UI left rail. */
  title: string;

  /** Status determines if the template can be used in production. */
  status: TemplateStatus; // 'active' | 'draft' | 'disabled'

  /** Short explanation of what this template is for (e.g. "Fallback template for all products"). */
  description: string;

  /** Semantic version label (e.g. 'v2'). Used in UI only; not enforced by backend. */
  version: string;

  /** Matching rules to decide when this template should be used (see 4.4). */
  conditions: TemplateCondition[];

  /** Whether ALL or ANY conditions must match for this template. */
  matchMode: MatchMode;

  /** Formatting controls for paragraphs, bullets, and optional headline. */
  format: {
    layout: LayoutStyle;
    headlineEnabled: boolean;
    headlinePattern?: string;
    paragraph: {
      min: number; // min word count
      max: number; // max word count
      allowTwoParagraphs: boolean;
    };
    bullets: {
      min: number;
      max: number;
      topics: BulletTopic[];
    };
  };

  /** Tone & voice rules for this audience. */
  voice: {
    /** One of the supported presets (see UI). */
    preset: VoicePreset;
    /** Freeform description of the desired voice. */
    description: string;
    /** Words/phrases to avoid entirely. */
    avoid: string[];
    /** Brand-specific guidelines. */
    brandRules: string;
  };

  /** SEO-specific patterns and flags. */
  seo: {
    /** Handlebars-style pattern for meta title (e.g. 'brand name | fit category'). */
    metaTitlePattern: string;
    includeFit: boolean;
    includeUseCase: boolean;
    includeMaterial: boolean;
  };

  /** Advanced prompt-level controls (legacy-compatible fields). */
  prompt_body: string;
  seo_rules: string;
  tone_rules: string;
  length_rules: string;

  /** Labeled example inputs/outputs to steer AI behavior. */
  examples: Array<{
    label: string;
    input: string;
    output: string;
  }>;

  /** Words the AI should never use (superset of `voice.avoid`). */
  banned_terms: string[];

  /** Audit fields. */
  updatedBy?: string;
  updatedAt?: any;
}
```

**Note:** Earlier, simpler template docs that only contained `prompt_body`, `seo_rules`, `tone_rules`, `length_rules`, `examples`, and `banned_terms` are treated as **legacy** and will be normalized into the full `AITemplate` shape on load.

---

### 4.3 Layout & Components

The page is a two-column layout:

- **Left rail — Audience Templates list**
    - Shows predefined template keys:
        - `default`
        - `mens_footwear`
        - `womens_footwear`
        - `kids_gs`
        - `toddler`
        - `apparel_mens`
        - `apparel_womens`
        - `accessories`
    - Each item shows the template title. If the currently loaded template for that key is in `draft` status, append a small `(Draft)` label.
- **Right panel — Template Builder form**
    - Header:
        - Title (template title)
        - Key and Version chips
        - Actions: **Reset to Default**, **Save Template**
    - Sections (in order):
        1. **Basic Info**
            - Template Name (title)
            - Status (active / draft / disabled)
            - Description
        2. **Audience & Conditions**
            - Match Mode: ALL vs ANY
            - Conditions list: add/remove rows of (field, operator, value)
        3. **Formatting Style**
            - Layout select (paragraph-only, headline+paragraph+bullets, short blurb)
            - Headline toggle + pattern input
            - Paragraph min/max word counts + "Allow 2 paragraphs"
            - Bullet min/max + bullet topics chips (Fit, Comfort, Durability, Use Case, Care, Traction)
        4. **Tone & Voice**
            - Voice preset select
            - Custom voice description
            - "Words to avoid" chips (add/remove)
            - Brand rules textarea
        5. **SEO Configuration**
            - Meta Title Pattern input (Handlebars-style)
            - Checkboxes: Include Fit, Include Use Case, Include Material
        6. **Advanced JSON (optional)**
            - Toggle to show/hide raw JSON representation of the template (read-only; warning text about editing).

Each section should follow the existing visual pattern: label, small helper text, and simple controls (inputs, selects, checkboxes, buttons).

---

### 4.4 Template Matching Behavior (Frontend Expectations)

The Admin UI only **configures** templates; the actual selection logic is implemented in the AI Describe backend (see Section 5 — AI Describe Engine). The Settings CRUD spec should document the expected behavior:

- Templates are evaluated **per product**.
- For a given product:
    - The system considers all `active` templates whose `scope === 'audience'`.
    - For each candidate template, all its `conditions` are evaluated against the product's data using the specified `field` and `operator`.
    - If `matchMode === 'ALL'`, every condition must match.
    - If `matchMode === 'ANY'`, at least one condition must match.
- If more than one template matches:
    - The backend resolves priority (for now, assume a deterministic order such as most specific → default; the exact rule lives in Section 5).
- If **no** audience template matches:
    - The `default` template is used as the fallback (as long as its status is not `disabled`).

The front-end does **not** implement this logic; it simply saves a valid `AITemplate` document for each key.

---

### 4.5 Reset to Default Behavior

- Clicking **Reset to Default** fetches a seed file (e.g., `/scripts/ai-templates-seed-v2.json`) and replaces the current in-memory template with the seed template matching the selected key.
- The UI should show a confirm dialog before overwriting.
- The seed file is source-controlled and treated as initial configuration; admins are free to override templates after seeding.

---

### 4.6 Acceptance Criteria

- Loading `/app/settings/ai-templates` shows the Audience Templates list and loads the selected template.
- Saving writes a normalized `AITemplate` into `settings/ai/prompts/{templateKey}` with `updatedBy` and `updatedAt` populated.
- Resetting pulls from the seed JSON and updates the UI state.
- Status = `active` is required for a template to be considered in production matching.
- Legacy templates missing some fields are normalized (defaulted) without breaking the UI.

### Attribute Registry Alignment

All fields referenced in template conditions must exist either:

- As core product fields, or
- As attributes marked `filter: true` or `search: true` in the Attribute Registry.

This ensures that template conditions map cleanly to searchable/filterable product data.

### Workflow Integration

- Template conditions should reference attributes that appear in Workflow Preconditions when relevant.

---

## 5. AI Settings (Global AI Controls)

### 5.1 Purpose

The AI Settings page provides system-wide administrative controls for how the AI Describe Engine behaves across all products and sites.

This includes:

- Default template selection per site
- Global tone/voice presets
- AI rate-limiting and safety controls
- Optional experimental features
- Governance rules for description generation

Route: `/app/settings/ai`

Component: `AISettings`

Firestore Document: `settings/system/aiSettings` (single document)

---

### 5.2 Data Model — `aiSettings`

Stored at: `settings/system/aiSettings`

```tsx
export interface AISettings {
  /** Default audience template for each website (e.g., Shiekh, MLTD, Karmaloop). */
  defaultTemplateBySite: Record<string, string>; // { shiekh: 'default', mltd: 'mens_footwear', ... }

  /** Global tone preset applied across all sites unless overridden by the selected template. */
  globalTonePreset: 'clean-retail' | 'hype-drop' | 'parent-friendly' | 'tech-performance' | 'luxury' | null;

  /** Optional freeform override for global tone. */
  globalToneDescription?: string;

  /** Whether bulk generation ("Generate All") is allowed. */
  allowBulkGenerate: boolean;

  /** Maximum products per minute for synchronous Describe calls. */
  maxSyncDescribePerMinute: number;

  /** Allows or disables async Describe batch jobs. */
  allowAsyncBatchDescribe: boolean;

  /** Enforces a maximum number of regenerations per product/user/session. */
  maxRegenerations: number;

  /** Experimental features (toggles for beta functionality). */
  experimental: {
    enableAdvancedSEO: boolean;
    enableStructuredBullets: boolean;
    enableTwoPassDescribe: boolean;
  };

  /** Audit fields. */
  updatedBy?: string;
  updatedAt?: any;
}
```

---

### 5.3 UI Layout

The page is a card-based form with the following sections:

**Section A — Default Templates (per site)**

- A table or list of configured sites:
    - `shiekh`
    - `mltd`
    - `karmaloop`
    - `sangremia`
- Each row allows selecting which audience template is the default:
    - Dropdown populated from `/settings/ai/prompts/*`
- Rules:
    - Must select ONE default template per site.
    - Disabled templates (`status === 'disabled'`) cannot be selected.

**Section B — Global Tone & Voice**

Fields:

- `globalTonePreset` (select)
- `globalToneDescription` (textarea)

Behavior:

- If a template has a `voice.preset`, that takes priority.
- If a template does NOT specify tone, this global preset is used.
- `globalToneDescription` merges into the template-level prompt during Describe.

**Section C — Rate Limits & Safety Controls**

Fields:

- `allowBulkGenerate` (toggle)
- `maxSyncDescribePerMinute` (numeric input)
- `allowAsyncBatchDescribe` (toggle)
- `maxRegenerations` (numeric input)

Rules:

- Prevent setting `maxSyncDescribePerMinute` below recommended threshold (10).
- If `allowAsyncBatchDescribe` is false, bulk generation must be disabled.

**Section D — Experimental Features**

Toggles:

- `enableAdvancedSEO`
- `enableStructuredBullets`
- `enableTwoPassDescribe`

Purpose:

- Enables incremental rollout of new AI behaviors.
- Defaults: all toggles off.

---

### 5.4 Save / Validation Behavior

- Save writes entire object to `settings/system/aiSettings`.
- All fields must validate before save:
    - Templates referenced in `defaultTemplateBySite` must exist.
    - `maxRegenerations >= 0`
    - `maxSyncDescribePerMinute >= 1`
- Save writes:
    - `updatedBy`
    - `updatedAt: serverTimestamp()`

---

### 5.5 Acceptance Criteria

- `/app/settings/ai` loads the current `aiSettings` document.
- Admin can edit and save without errors.
- Defaults apply when fields missing.
- AI Describe Engine uses:
    - Template matching first (per Section 5.6)
    - Then falls back to global tone, defaults, and rate limits from this document.
- No breaking changes occur if future fields are added.

---

### 5.6 Related Systems

- **AI Templates:** AI Settings determine which audience template is used as a default when no template matches. Templates also override global tone settings when they define their own voice rules.
- **Smart Rules:** Smart Rules can modify product attributes before Describe runs, which can change which audience templates match. For example, a Smart Rule that enforces `gender = 'mens'` may shift template selection toward `mens_footwear`.
- **Describe Engine:** AI Settings supply the engine with defaults for tone, rate limits, async behavior, and experimental modes. See Section 5 — AI Describe Engine for the full integration pipeline.

### Cross-Module Behavior

- **Import Settings:** Normalized values and Smart Rule transformations defined in import pipelines affect template matching and Describe behavior.
- **Export Settings:** SEO fields generated by Describe (meta title, keywords, description) flow directly into export pipelines. Export field mappings must include these fields when required by a partner feed.
- **Bulk Describe and Workflow auto-run behaviors depend on these rate limits and async settings.**

### Cross-Module Behavior

- **Import Settings:** Normalized values and Smart Rule transformations defined in import pipelines affect template matching and Describe behavior.
- **Export Settings:** SEO fields generated by Describe (meta title, keywords, description) flow directly into export pipelines. Export field mappings must include these fields when required by a partner feed.
- **Bulk Describe and Workflow auto-run behaviors depend on these rate limits and async settings.**

---

## 5.7 Launch & Calendar Attribute Settings — drawing

Add `drawing` to the Launch/Calendar attribute settings table.

- **Key:** `drawing`
- **Label:** Drawing mode
- **Type:** Enum (select)
- **Options (non-editable):**
    - FCFS (value: `fcfs`)
    - Store-only (value: `store_only`)
    - Web-only (value: `web_only`)
    - Store & Web (value: `store_web`)
    - Token set (value: `token_set`)

This attribute:

- Is available on the Product Editor Launch tab.
- Controls how Launch Calendar UI labels the launch (drawing vs FCFS, store vs web).
- Is not imported or exported.
- Does not need per-tenant customization; the option set is fixed.

---

## 6. Import Settings

### 6.1 Purpose

Import Settings define how product data entering AOSS (CSV, API, or bulk upload) is normalized, validated, and transformed before reaching the core product record.

These controls ensure consistency with:

- Section 3.1 — Import Row Schema
- Section 3.2 — Normalization Rules
- Attribute Registry (Section 2.3)
- Smart Rules (Section 4)

### 6.2 Route & Component

- Route: `/app/settings/import-settings`
- Component: `ImportSettingsManager`
- Firestore: `settings/importSettings`

### 6.3 Data Model — `importSettings`

```tsx
export interface ImportSettings {
  // Default mapping: incoming CSV column → product field
  defaultMappings: Record<string, string>;

  // Normalization rules enabled/disabled (Section 3.2)
  enabledNormalizations: string[];

  // Enforcement behavior for missing or invalid fields
  errorPolicy: 'reject-row' | 'skip-field' | 'use-default' | 'warn-only';

  // Default values used when data is missing
  fallbackDefaults: Record<string, any>;

  // Whether to auto-run Smart Rules immediately post-import
  runSmartRulesAfterImport: boolean;

  updatedBy?: string;
  updatedAt?: any;
}
```

### 6.4 UI Layout

- **Mappings Table**
    - Left: Imported Column
    - Right: AOSS Product Field (dropdown from attribute registry)
- **Normalization Toggles**
    - Pulled directly from Section 3.2 rules
    - Example: `normalizeGender`, `canonicalizeColors`, `stripSKUWhitespace`
- **Error Handling Policy**
    - Radio buttons
- **Fallback Defaults**
    - Attribute key → default value
- **Smart Rules Integration**
    - Toggle: "Run Smart Rules after import"

### 6.5 Acceptance Criteria

- Saving updates `settings/importSettings`
- Mappings validate against Attribute Registry
- Normalization keys validate against Section 3.2
- Describe Engine sees normalized data (after import + Smart Rules)

### Cross-Module Requirements

- Imported fields used in Search facets must satisfy attribute domain rules or be flagged in Observations.
- Imported values that feed into AI Templates (gender, department, ageGroup) must normalize correctly; otherwise Describe will fall back to defaults or prevent template matching.
- Import pipeline order is: Import → Normalize → Smart Rules → Describe → Export.
- Imported fields must satisfy Workflow Describe Preconditions before triggering Describe.

---

## 7. Export Settings

### 7.1 Purpose

Export Settings control how AOSS product data is transformed for downstream destinations (sites, feeds, partners).

These settings ensure consistency between:

- Export Profiles (if present)
- Product Completion Workflow
- Section 6 — API Contracts (outbound)
- Section 2.1/2.2 product schemas

### 7.2 Route & Component

- Route: `/app/settings/export-settings`
- Component: `ExportSettingsManager`
- Firestore: `settings/exportSettings`

### 7.3 Data Model — `exportSettings`

```tsx
export interface ExportSettings {
  // Mapping of internal field → external field for each site
  fieldMappingsBySite: Record<string, Record<string, string>>;

  // Whether to include optional fields in each export
  includeOptionalFields: boolean;

  // Override rules (e.g., enforce lowercase, strip html)
  outputTransforms: string[];

  // Bulk export default format
  defaultFormat: 'csv' | 'json' | 'feed';

  updatedBy?: string;
  updatedAt?: any;
}
```

### 7.4 UI Layout

- **Site Selector**
    - Shiekh / MLTD / Karmaloop / Sangremia
- **Field Mapping Table**
    - Internal product field → external feed/CSV field name
- **Optional Field Toggles**
    - Include color2, keywords, metaDescription, launchDate, badges, etc.
- **Output Transforms**
    - List of checkboxes (e.g., lowercase, stripTags, limitLength)

### 7.5 Acceptance Criteria

- Updates stored in `settings/exportSettings`
- Compatible with Product Completion Workflows
- Export pipelines reference these mappings consistently

### Cross-Module Behavior

- Export must include SEO fields generated by Describe if the destination requires metadata.
- Export mappings should align with Search Filter attributes so downstream systems can replicate filters (e.g., site category navigation).
- All fields mapped for export must be valid against the Attribute Registry.
- Export metadata often originates from Describe; ensure W2 is completed before export.

---

## 8. Search & Filter Settings

### 8.1 Purpose

The Search & Filter Settings module defines how the product catalog list's search bar and filters behave:

- Which fields are searchable (e.g., name, brand, style code)
- Which attributes appear as filters (e.g., gender, category, color, website)
- Default sort and filter presets
- How API-level filters (`filters` param) map to UI chips and facets

This aligns with:

- Product catalog list "search, filters, bulk actions" in **Ropi AOSS**
- `filters` query param on product APIs in **Section 6 — API Contracts**
- Attribute flags for navigation/filtering in **Attribute Registry — Human & JSON**
- Search/filter signals described in **Observations — Overview, purpose, workflow, and logic**

### 8.2 Route & Component

- Route: `/app/settings/search`
- Component: `SearchSettingsManager`
- Firestore: `settings/searchSettings`

### 8.3 Data Model — `searchSettings`

```tsx
export interface SearchFacetConfig {
  /** Attribute key used for this facet (e.g., gender, category, color). */
  attributeKey: string;

  /** Human-readable label in the UI (e.g., "Gender", "Category"). */
  label: string;

  /** Whether this facet is shown by default. */
  enabled: boolean;

  /** If true, facet is pinned (always visible); otherwise may go into "More filters". */
  pinned: boolean;

  /** Optional default values for pre-filtered views (e.g., { gender: ['mens'] }). */
  defaultSelectedValues?: string[];
}

export interface SearchSettings {
  /** Searchable fields in the product document (e.g., name, styleCode, brand). */
  searchableFields: string[];

  /** Default sort option for the product catalog list. */
  defaultSort: 'newest' | 'oldest' | 'alphabetical' | 'updatedDescending';

  /** Configurable filter facets for the catalog UI. */
  facets: SearchFacetConfig[];

  /** Maximum number of filters that can be active at once (UI safeguard). */
  maxActiveFilters: number;

  /** Whether to show an "Advanced Filters" panel by default. */
  showAdvancedFiltersByDefault: boolean;

  /** Audit fields. */
  updatedBy?: string;
  updatedAt?: any;
}
```

### 8.4 UI Layout

The Search Settings page has three main sections:

1. **Searchable Fields**
    - Multi-select list of fields (from the product schema and attribute registry) that search queries should target.
    - Examples: `name`, `styleCode`, `brand`, `sku`, etc.
2. **Default Sort**
    - Radio buttons or dropdown with options:
        - Newest first
        - Oldest first
        - Alphabetical (A–Z)
        - Recently updated
3. **Filter Facets**
    - Table with:
        - Attribute Key (dropdown from attribute registry)
        - Label (text)
        - Enabled (checkbox)
        - Pinned (checkbox)
    - "Add Facet" button to add new filter rows.
    - `maxActiveFilters` numeric input.
    - `showAdvancedFiltersByDefault` toggle.

### 8.5 Validation Rules

- `searchableFields` must only reference existing product fields or attributes marked as searchable/filterable in the **Attribute Registry — Human & JSON**.
- `facets.attributeKey` must also exist in the registry and should be marked as valid for filtering.
- `maxActiveFilters >= 1`.

### 8.6 Integration Notes

- The catalog UI uses `searchSettings.searchableFields` to determine which fields are included in text search queries.
- Filter facets are mapped to the `filters` query param in the product API (see Section 6 — API Contracts).
- Global Observations and completion signals may later be used to drive "Smart Filters" or suggestions for common filter sets.

### Templates & Smart Rules Integration

- Audience templates often match on the same attributes used as filters. Admins should ensure consistency across Search facets and Template conditions.
- If Smart Rules modify a filterable attribute, the product will both:
    - Move to a different filter bucket, and
    - Potentially match a different audience template.

### Workflow Integration

- Workflow required fields often include filterable attributes; ensure consistency with Search facets.

---

## 10. Bulk Actions Settings

### 10.1 Purpose

Bulk Actions allow admins to efficiently modify or process multiple products at once. This settings module defines which actions are available globally.

### 10.2 Route & Component

- Route: `/app/settings/bulk-actions`
- Component: `BulkActionsSettingsManager`
- Firestore: `settings/bulkActionsSettings`

### 10.3 Data Model — `bulkActionsSettings`

```tsx
export interface BulkActionsSettings {
  enableBulkDescribe: boolean;
  enableBulkTemplateApply: boolean;
  enableBulkAttributeUpdate: boolean;
  enableBulkStatusChange: boolean;
  enableBulkExport: boolean;
  enableBulkSmartRulesExecute: boolean;

  // Max items allowed in a single bulk operation
  maxItemsPerBulkAction: number;

  updatedBy?: string;
  updatedAt?: any;
}
```

### 10.4 Behavior Notes

- If `enableBulkDescribe` is false, the product list must hide the "Describe All" option.
- Bulk Describe must also respect:
    - AI Settings: `allowBulkGenerate`, `allowAsyncBatchDescribe`
    - Rate limits from AI Settings
- Bulk Export must use Export Settings (Section 7).
- Bulk Attribute Update must validate against Attribute Registry.
- Bulk Smart Rule Execution must re-run Smart Rules on the selected items.

### 10.5 Acceptance Criteria

- All bulk action dropdown items in product list reflect these toggles.
- Bulk operations enforce `maxItemsPerBulkAction`.

---

## 11. Workflow Settings

### 11.1 Purpose

Workflow Settings control how major AOSS workflows behave. This includes required fields, describe preconditions, and automation switches for W1 and W2.

### 11.2 Route & Component

- Route: `/app/settings/workflows`
- Component: `WorkflowSettingsManager`
- Firestore: `settings/workflowSettings`

### 11.3 Data Model — `workflowSettings`

```tsx
export interface WorkflowSettings {
  // Workflow toggles
  enableW1Observations: boolean;
  enableW2Completion: boolean;

  // Required fields for product completion (W2)
  requiredFieldsForCompletion: string[];

  // Preconditions for Describe
  describePreconditions: string[]; 
  // e.g., ['gender', 'ageGroup', 'materials']

  // Auto-trigger rules
  autoRunDescribeAfterSave: boolean;
  autoRunSmartRulesAfterEdit: boolean;

  updatedBy?: string;
  updatedAt?: any;
}
```

### 11.4 Behavior Notes

- Product page checks `requiredFieldsForCompletion` before allowing "Complete Product".
- Describe button is disabled until **all** `describePreconditions` are met.
- W1 (Observations → Product) only executes if `enableW1Observations === true`.
- Auto-run Smart Rules must respect Smart Rules Settings.
- Auto-run Describe must respect:
    - AI Settings rate limits
    - Template availability
    - Global tone fallback

### 11.5 Acceptance Criteria

- UI for product completion correctly validates fields.
- Observations only run when enabled.
- Automatic behaviors work only when toggles are true.
- Workflow settings persist in Firestore at `settings/workflowSettings`.

---

## 12. AI Performance & Caching Settings

### 12.1 Purpose

The AI Performance & Caching Settings module defines how the AI Describe Engine behaves under load and how long Describe results are cached.

It is focused on:

- Concurrency and queueing limits
- Per-user and global throughput
- Result caching TTL
- Degradation / fallback behavior under heavy load

These settings complement:

- AI Settings (`/app/settings/ai`) — tone, defaults, bulk flags
- Section 5 — AI Describe Engine
- Section 11 — Observability, Monitoring & Runbooks

### 12.2 Route & Component

- Route: `/app/settings/ai-performance`
- Component: `AIPerformanceSettingsManager`
- Firestore: `settings/system/aiPerformanceSettings`

### 12.3 Data Model — `aiPerformanceSettings`

```tsx
export interface AIPerformanceSettings {
  /** Max concurrent Describe requests per user (UI-initiated). */
  maxConcurrentPerUser: number;

  /** Global max concurrent Describe requests across the project. */
  maxConcurrentGlobal: number;

  /** Maximum items allowed in a single async Describe job. */
  maxItemsPerAsyncJob: number;

  /** If true, Describe results are cached. */
  enableResultCaching: boolean;

  /** Time-to-live (minutes) for a Describe result cache entry. */
  cacheTTLMinutes: number;

  /**
   * Behavior when concurrency limits are hit:
   * - 'queue': enqueue and process later
   * - 'reject': fail immediately with an error
   */
  onLimitBehavior: 'queue' | 'reject';

  /** Maximum queue depth for queued jobs. */
  maxQueueDepth: number;

  /** Whether to log detailed timing metrics for Describe. */
  enableTimingMetrics: boolean;

  updatedBy?: string;
  updatedAt?: any;
}
```

### 12.4 UI Layout

Sections:

1. **Concurrency Limits**
    - `maxConcurrentPerUser` (numeric input)
    - `maxConcurrentGlobal` (numeric input)
    - `maxItemsPerAsyncJob` (numeric input)
2. **Caching**
    - `enableResultCaching` (toggle)
    - `cacheTTLMinutes` (numeric input; disabled if caching is off)
    - Helper text explaining:
        - Cached results are reused for the same product + site + template
        - Cache invalidates on product updates that touch Describe-relevant fields
3. **Limit Behavior**
    - `onLimitBehavior` (radio: queue vs reject)
    - `maxQueueDepth` (numeric input; used only when behavior = queue)
4. **Instrumentation**
    - `enableTimingMetrics` (toggle; hints that metrics appear in Section 11 dashboards)

### 12.5 Validation Rules

- `maxConcurrentPerUser >= 1`
- `maxConcurrentGlobal >= maxConcurrentPerUser`
- `maxItemsPerAsyncJob >= 1`
- If `enableResultCaching === true`, then `cacheTTLMinutes >= 1`
- If `onLimitBehavior === 'queue'`, then `maxQueueDepth >= 0`

### 12.6 Integration Notes

- Describe Engine must respect these limits when executing:
    - Single-product Describe
    - Bulk Describe (when allowed)
    - Async jobs
- Cache invalidation should be tied to:
    - Product changes in core descriptive fields
    - Template changes for the matched template
- Detailed metrics (when `enableTimingMetrics` is true) are surfaced in Section 11's monitoring dashboards.

---

## 13. Roles & Permissions Settings

### 13.1 Purpose

The Roles & Permissions module defines access control for all major AOSS modules.

Admins can assign capabilities to roles such as:

- `viewer`
- `editor`
- `manager`
- `admin`
- `owner` (optional high-privilege role)

Access is enforced throughout:

- Settings Hub
- Product list
- Product completion workflows
- AI Describe Engine UI actions
- Import/Export tools

### 13.2 Route & Component

- Route: `/app/settings/permissions`
- Component: `PermissionsSettingsManager`
- Firestore: `settings/permissionSettings`

### 13.3 Data Model — `permissionSettings`

```tsx
export interface PermissionSettings {
  roles: {
    [role: string]: {
      // Settings modules
      canAccessAttributes: boolean;
      canAccessSmartRules: boolean;
      canAccessAITemplates: boolean;
      canAccessAISettings: boolean;
      canAccessSearchSettings: boolean;
      canAccessImportSettings: boolean;
      canAccessExportSettings: boolean;
      canAccessBulkActionsSettings: boolean;
      canAccessWorkflowSettings: boolean;
      canAccessUsersModule: boolean;
      canAccessPerformanceSettings: boolean;

      // Product-level capabilities
      canEditProducts: boolean;
      canRunDescribe: boolean;
      canBulkDescribe: boolean;
      canRunSmartRules: boolean;

      // Admin / owner capabilities
      canManageRoles: boolean;
    };
  };

  updatedBy?: string;
  updatedAt?: any;
}
```

### 13.4 Default Role Definitions

**Viewer**

- Read-only access to product list and catalog search
- No access to any Settings modules

**Editor**

- Can edit products
- Can run Describe
- Cannot access Settings

**Manager**

- Editor privileges + can run Bulk Actions
- Read-only access to Search Settings, Import Settings, and Workflow Settings

**Admin**

- Full access to all Settings modules except Roles & Permissions

**Owner**

- Full access to ALL modules including Roles & Permissions
- Required for modifying AI Settings, AI Templates, or Security Rules

### 13.5 UI Layout

Sections in `/app/settings/permissions`:

1. **Role List**
    - List of defined roles
    - "Add Role" button
    - "Delete Role" disabled for system roles (admin, owner)
2. **Permissions Matrix**
    - Table with rows = modules, columns = roles
    - Checkboxes determine access
3. **Product-Level Capabilities**
    - Toggles for:
        - canEditProducts
        - canRunDescribe
        - canBulkDescribe
        - canRunSmartRules
4. **Danger Zone**
    - "Modify Admin Permissions"
    - "Modify Owner Permissions"
    - Requires 2-step confirmation

### 13.6 Integration Notes

- Section 9 (Firebase Security Rules) must enforce permissions defined here.
- All Settings pages must check capabilities before rendering or enabling actions.
- Product Completion checks:
    - canRunDescribe
    - canEditProducts
    - workflow preconditions tied to permissions
- Bulk Actions respect:
    - canBulkDescribe
    - canRunSmartRules
    - canEditProducts
- Only Owners may modify AI templates, AI settings, or Performance Settings in production environments.

### 13.7 Acceptance Criteria

- UI correctly hides unauthorized modules.
- Unauthorized API calls fail via Firebase Security Rules.
- Product list options (bulk actions, describe) match permission flags.
- Admin/Owner-only pages require elevated permissions.

---

**File:** `firestore.rules`

```jsx
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function signedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return signedIn() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if signedIn();
      allow create: if signedIn() && request.auth.uid == userId;
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if isAdmin();
    }
    
    // Products - all signed-in users can CRUD
    match /products/{productId} {
      allow read, write: if signedIn();
    }
    
    // Settings - admin only for writes
    match /settings/{document=**} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }
    
    // Smart Rules - admin only for writes
    match /smartRules/{ruleId} {
      allow read: if signedIn();
      allow write: if isAdmin();
    }
    
    // AI Jobs - read for all, write for functions only
    match /descriptionJobs/{jobId} {
      allow read: if signedIn();
      allow write: if false; // Cloud Functions only
    }
    
    // Imports/Exports - signed-in users
    match /imports/{jobId} {
      allow read, write: if signedIn();
    }
    
    match /exports/{jobId} {
      allow read, write: if signedIn();
    }
    
    // Launch Cards - signed-in users
    match /launchCards/{cardId} {
      allow read, write: if signedIn();
    }
  }
}
```

---

## 5. Router Setup

```tsx
// src/App.tsx or src/routes.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsDashboard } from './pages/settings/SettingsDashboard';
import { AttributeManager } from './pages/settings/AttributeManager';
import { AttributeEditor } from './pages/settings/AttributeEditor';
import { SmartRulesManager } from './pages/settings/SmartRulesManager';
import { SmartRuleEditor } from './pages/settings/SmartRuleEditor';
import { AdminGuard } from './components/AdminGuard';

export function AppRoutes() {
  return (
    <Routes>
      {/* ... other routes ... */}
      
      {/* Settings - Admin Only */}
      <Route path="/app/settings" element={<AdminGuard><SettingsDashboard /></AdminGuard>} />
      <Route path="/app/settings/attributes" element={<AdminGuard><AttributeManager /></AdminGuard>} />
      <Route path="/app/settings/attributes/:id" element={<AdminGuard><AttributeEditor /></AdminGuard>} />
      <Route path="/app/settings/smart-rules" element={<AdminGuard><SmartRulesManager /></AdminGuard>} />
      <Route path="/app/settings/smart-rules/:id" element={<AdminGuard><SmartRuleEditor /></AdminGuard>} />
    </Routes>
  );
}
```

---

## 6. Admin Guard Component

```tsx
// src/components/AdminGuard.tsx
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, userDoc, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userDoc?.role !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-2">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## 7. File Structure

```
src/
├── pages/
│   └── settings/
│       ├── SettingsDashboard.tsx
│       ├── AttributeManager.tsx
│       ├── AttributeEditor.tsx
│       ├── SmartRulesManager.tsx
│       ├── SmartRuleEditor.tsx
│       ├── AITemplatesManager.tsx
│       └── UserManager.tsx
├── types/
│   ├── attribute.ts
│   ├── smartRule.ts
│   └── user.ts
├── components/
│   └── AdminGuard.tsx
└── hooks/
    └── useAuth.ts
```

---

## Quick Start for Cursor/Copilot

1. Copy the TypeScript interfaces to `src/types/`
2. Create the page components in `src/pages/settings/`
3. Add routes to your router
4. Update `firestore.rules` and deploy
5. Test with admin account

---

### Navigation

[← Back to ROPI AOSS (Main Page)]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})