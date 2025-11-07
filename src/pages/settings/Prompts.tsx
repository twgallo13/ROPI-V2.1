import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// NOTE: ShadCN UI is not installed in this workspace. We'll use a minimal tabs UI
// that can be swapped for shadcn/ui Tabs later without changing behavior.

type TabKey = 'templates' | 'preview' | 'history';

// Firestore path: we store prompts under collection 'settings', doc id 'ai.prompts'
// Assumption: Using a single doc at settings/ai.prompts rather than a subcollection path.
const FS_DOC = doc(db, 'settings', 'ai.prompts');

const defaultTemplate = `You are an expert retail copywriter for athletic footwear.
Write a concise, on-brand product description.

Context:
- Title: {{title}}
- Brand: {{brand}}
- Keywords: {{keywords}}
- Features: {{features}}
- Variant: {{color}} / {{size}}

Tone: energetic, clear, benefit-led.
Length: 60-90 words.
Avoid: superlatives, clichés, and repeated brand mentions.`;

const PromptsPage: React.FC = () => {
  const [active, setActive] = useState<TabKey>('templates');
  const [template, setTemplate] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Load from Firestore
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(FS_DOC);
        if (snap.exists()) {
          const data = snap.data() as { template?: string };
          setTemplate(data.template || defaultTemplate);
        } else {
          setTemplate(defaultTemplate);
        }
      } catch (e) {
        console.error('[prompts] load failed', e);
        setTemplate(defaultTemplate);
        setStatus('Failed to load from Firestore — using defaults');
        setTimeout(() => setStatus(''), 2000);
      }
    })();
  }, []);

  const onSave = async () => {
    try {
      const cleaned = JSON.parse(JSON.stringify({ template }));
      await setDoc(FS_DOC, cleaned, { merge: true });
      setStatus('Saved.');
    } catch (e) {
      console.error('[prompts] save failed', e);
      setStatus('Save failed');
    } finally {
      setTimeout(() => setStatus(''), 1500);
    }
  };

  const exampleData = {
    title: 'Air Zoom Rival Fly 4',
    brand: 'Nike',
    keywords: ['responsive cushioning', 'daily training', 'breathable mesh'],
    features: ['Zoom Air unit', 'durable rubber outsole', 'secure midfoot fit'],
    color: 'Black/White',
    size: 'M 9',
  };

  const preview = useMemo(() => {
    const fill = (t: string) =>
      t
        .replace(/{{title}}/g, exampleData.title)
        .replace(/{{brand}}/g, exampleData.brand)
        .replace(/{{keywords}}/g, exampleData.keywords.join(', '))
        .replace(/{{features}}/g, exampleData.features.join('; '))
        .replace(/{{color}}/g, exampleData.color)
        .replace(/{{size}}/g, exampleData.size);
    return fill(template);
  }, [template]);

  const TabButton: React.FC<{ k: TabKey; label: string }> = ({ k, label }) => (
    <button
      onClick={() => setActive(k)}
      className={`px-3 py-2 text-sm font-medium rounded-t-md border-b-2 ${
        active === k
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">AI Prompt Templates</h1>
        <p className="text-gray-600 mt-1">
          Edit templates used to generate product copy. Intended Firestore path: <code>/settings/ai/prompts</code>.
        </p>
      </header>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton k="templates" label="Templates" />
          <TabButton k="preview" label="Preview" />
          <TabButton k="history" label="History" />
        </nav>
      </div>

      {active === 'templates' && (
        <section className="bg-white p-6 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">Default Product Prompt</label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={14}
            className="w-full border-gray-300 rounded-md shadow-sm font-mono"
          />
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
            {status && <span className="text-sm text-green-600">{status}</span>}
          </div>
        </section>
      )}

      {active === 'preview' && (
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Filled Prompt Preview</h2>
          <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm whitespace-pre-wrap">{preview}</pre>
        </section>
      )}

      {active === 'history' && (
        <section className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">History coming soon. Will append revisions with timestamps.</p>
        </section>
      )}
    </div>
  );
};

export default PromptsPage;
