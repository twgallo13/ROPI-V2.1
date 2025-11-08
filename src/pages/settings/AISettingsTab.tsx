import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import Select from '../../components/ui/Select';

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
  const formRef = useRef<HTMLFormElement>(null);

  const { saveState, debouncedSave, saveNow, trackChange } = useDebouncedSave(settings, {
    saveFn: async (data) => {
      const docRef = doc(db, 'settings', 'ai');
      await setDoc(docRef, data);
    },
    onSuccess: () => onShowToast('AI settings saved', 'success'),
    onError: (error) => {
      console.error('Error saving AI settings:', error);
      onShowToast('Failed to save AI settings', 'error');
    },
  });

  useEffect(() => {
    // Subscribe to real-time updates
    const docRef = doc(db, 'settings', 'ai');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AISettings);
        }
        setLoading(false);
      },
      (err: any) => {
        const errorCode = err?.code || 'unknown';
        console.error('[settings] load failed', errorCode, err?.message);
        onShowToast(`Could not load AI settings (${errorCode})`, 'error');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [onShowToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveNow();
        return;
      }

      // Esc: Reset changes (reload from Firestore)
      if (e.key === 'Escape') {
        window.location.reload();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveNow]);

  const handleInputChange = (name: string, value: any) => {
    trackChange(name);
    setSettings({ ...settings, [name]: value });
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">AI Settings</h2>
        {saveState !== 'idle' && (
          <div className="flex items-center gap-2 text-sm">
            {saveState === 'saving' && (
              <>
                <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-600">Saving...</span>
              </>
            )}
            {saveState === 'saved' && (
              <>
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-green-600">Saved</span>
              </>
            )}
          </div>
        )}
      </div>
      
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          saveNow();
        }}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            e.target instanceof HTMLElement &&
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
          ) {
            e.preventDefault();
          }
        }}
        className="space-y-6"
      >
        {/* Model Selection */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            AI Model
          </label>
          <Select
            name="model"
            value={settings.model}
            onChange={(val) => handleInputChange('model', val)}
            onBlur={debouncedSave}
            options={[
              'gemini-1.5-flash',
              'gemini-1.5-pro',
              'gpt-4',
              'gpt-3.5-turbo',
            ]}
          />
        </div>

        {/* Temperature */}
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
            Temperature: {settings.temperature.toFixed(1)}
          </label>
          <input
            type="range"
            id="temperature"
            name="temperature"
            min="0"
            max="1"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
            onBlur={debouncedSave}
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
          <Select
            name="tone"
            value={settings.tone}
            onChange={(val) => handleInputChange('tone', val)}
            onBlur={debouncedSave}
            options={['professional', 'neutral', 'casual', 'enthusiastic']}
          />
        </div>

        {/* Allow Auto Without Context */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowAutoWithoutContext"
            name="allowAutoWithoutContext"
            checked={settings.allowAutoWithoutContext}
            onChange={(e) => handleInputChange('allowAutoWithoutContext', e.target.checked)}
            onBlur={debouncedSave}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="allowAutoWithoutContext" className="ml-2 block text-sm text-gray-700">
            Allow auto-generation without context
          </label>
        </div>

        {/* Manual Save Button */}
        <div className="pt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saveState === 'saving'}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveState === 'saving' ? 'Saving...' : 'Save AI Settings'}
          </button>
          <span className="text-sm text-gray-500">
            or press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Cmd/Ctrl+S</kbd>
          </span>
        </div>
      </form>
    </div>
  );
};

export default AISettingsTab;
