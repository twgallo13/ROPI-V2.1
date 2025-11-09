import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { describeProduct } from '../../services/describe';
import Toast from '../../components/Toast';

const CHANNELS = ['RetailOps', 'Shopify', 'PDP'];
const TONES = ['Clean', 'Hype', 'Technical'];
const LENGTHS = ['Short', 'Medium', 'Long'];

const DescribePage: React.FC = () => {
  const [productId, setProductId] = useState('');
  const [channel, setChannel] = useState('RetailOps');
  const [tone, setTone] = useState('Clean');
  const [length, setLength] = useState('Medium');
  const [generatedText, setGeneratedText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Check URL params for productId
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlProductId = params.get('productId');
    if (urlProductId) {
      setProductId(urlProductId);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => setToast((t) => ({ ...t, show: false }));

  const handleGenerate = async () => {
    if (!productId.trim()) {
      showToast('Please enter a Product ID', 'error');
      return;
    }

    try {
      setGenerating(true);
      const result = await describeProduct({
        productId: productId.trim(),
        channel,
        tone,
        length,
      });

      if (result.text) {
        setGeneratedText(result.text);
        showToast('Generated draft ready', 'success');
        // Auto-focus the textarea
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
      } else {
        showToast('No text returned from API', 'error');
      }
    } catch (err: any) {
      console.error('[DescribePage] Generate failed:', err);
      showToast(err?.message || 'Failed to generate description', 'error');
      setGeneratedText('');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsert = async () => {
    if (!productId.trim()) {
      showToast('Product ID is required', 'error');
      return;
    }

    if (!generatedText) {
      showToast('No generated text to insert', 'error');
      return;
    }

    try {
      setInserting(true);
      const descRef = doc(db, 'products', productId.trim(), 'descriptions', channel);
      await setDoc(
        descRef,
        {
          text: generatedText,
          meta: {
            tone,
            length,
            generatedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );

      showToast(`Saved to Descriptions · ${channel}`, 'success');
    } catch (err: any) {
      console.error('[DescribePage] Insert failed:', err);
      showToast(err?.message || 'Failed to save description', 'error');
    } finally {
      setInserting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Describe</h1>
        <p className="text-gray-600 mb-6">
          Generate AI-powered product descriptions using the existing apiDescribe function.
        </p>

        {/* Form Controls */}
        <div className="space-y-4 mb-6">
          {/* Product ID */}
          <div>
            <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-1">
              Product ID <span className="text-red-500">*</span>
            </label>
            <input
              id="productId"
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Enter product ID"
              disabled={generating}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            />
          </div>

          {/* Channel, Tone, Length in a grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Channel */}
            <div>
              <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">
                Channel
              </label>
              <select
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                disabled={generating}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                Tone
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={generating}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Length */}
            <div>
              <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-1">
                Length
              </label>
              <select
                id="length"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                disabled={generating}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              >
                {LENGTHS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleGenerate}
            disabled={generating || !productId.trim()}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : '✨ Generate with AI'}
          </button>

          <button
            onClick={handleInsert}
            disabled={inserting || !generatedText || !productId.trim()}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inserting ? 'Saving...' : 'Insert to Product'}
          </button>
        </div>

        {/* Rate Limit Notice */}
        {generating && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            Please wait… Generating description
          </div>
        )}

        {/* Generated Text Display */}
        {generatedText && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Generated Description</label>
            <textarea
              ref={textareaRef}
              readOnly
              value={generatedText}
              rows={12}
              className="w-full border-gray-300 rounded-md shadow-sm bg-gray-50 font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Generated with: <strong>{tone}</strong> tone, <strong>{length}</strong> length for{' '}
              <strong>{channel}</strong>
            </p>
          </div>
        )}
      </div>

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default DescribePage;
