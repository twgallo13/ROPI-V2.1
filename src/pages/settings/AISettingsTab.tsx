import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

type AISettings = {
  model: string;
  temperature: number;
  tone: string;
  allowAutoWithoutContext: boolean;
};

type AISettingsTabProps = {
  onShowToast: (message: string, type: 'success' | 'error') => void;
};

const AISettingsTab: React.FC<AISettingsTabProps> = ({ onShowToast }) => {
  const [settings, setSettings] = useState<AISettings>({
    model: 'gemini-1.5-flash',
    temperature: 0.4,
    tone: 'neutral',
    allowAutoWithoutContext: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'settings', 'ai');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AISettings);
      }
    } catch (err: any) {
      const errorCode = err?.code || 'unknown';
      const errorMessage = err?.message || 'Unknown error';
      console.error('[settings] load failed', errorCode, errorMessage);
      onShowToast(`Could not load AI settings (${errorCode})`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'settings', 'ai');
      await setDoc(docRef, settings);
      onShowToast('AI settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      onShowToast('Failed to save AI settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Settings</h2>
      
      <div className="space-y-6">
        {/* Model Selection */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            AI Model
          </label>
          <select
            id="model"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>

        {/* Temperature */}
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
            Temperature: {settings.temperature.toFixed(1)}
          </label>
          <input
            type="range"
            id="temperature"
            min="0"
            max="1"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>More focused</span>
            <span>More creative</span>
          </div>
        </div>

        {/* Tone */}
        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
            Tone
          </label>
          <select
            id="tone"
            value={settings.tone}
            onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="professional">Professional</option>
            <option value="neutral">Neutral</option>
            <option value="casual">Casual</option>
            <option value="enthusiastic">Enthusiastic</option>
          </select>
        </div>

        {/* Allow Auto Without Context */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowAutoWithoutContext"
            checked={settings.allowAutoWithoutContext}
            onChange={(e) => setSettings({ ...settings, allowAutoWithoutContext: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="allowAutoWithoutContext" className="ml-2 block text-sm text-gray-700">
            Allow auto-generation without context
          </label>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsTab;
