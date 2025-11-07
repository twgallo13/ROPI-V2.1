import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

type VocabSettings = {
  banned: string[];
  synonyms: Record<string, string>;
};

type VocabSettingsTabProps = {
  onShowToast: (message: string, type: 'success' | 'error') => void;
};

const VocabSettingsTab: React.FC<VocabSettingsTabProps> = ({ onShowToast }) => {
  const [settings, setSettings] = useState<VocabSettings>({
    banned: [],
    synonyms: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [newSynonymKey, setNewSynonymKey] = useState('');
  const [newSynonymValue, setNewSynonymValue] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'settings', 'vocab');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as VocabSettings);
      }
    } catch (err: any) {
      const errorCode = err?.code || 'unknown';
      const errorMessage = err?.message || 'Unknown error';
      console.error('[settings] load failed', errorCode, errorMessage);
      onShowToast(`Could not load vocabulary settings (${errorCode})`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'settings', 'vocab');
      await setDoc(docRef, settings);
      onShowToast('Vocabulary settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving vocabulary settings:', error);
      onShowToast('Failed to save vocabulary settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBannedWord = () => {
    const word = newBannedWord.trim();
    if (word && !settings.banned.includes(word)) {
      setSettings({
        ...settings,
        banned: [...settings.banned, word],
      });
      setNewBannedWord('');
    }
  };

  const removeBannedWord = (word: string) => {
    setSettings({
      ...settings,
      banned: settings.banned.filter((w) => w !== word),
    });
  };

  const addSynonym = () => {
    const key = newSynonymKey.trim();
    const value = newSynonymValue.trim();
    if (key && value) {
      setSettings({
        ...settings,
        synonyms: { ...settings.synonyms, [key]: value },
      });
      setNewSynonymKey('');
      setNewSynonymValue('');
    }
  };

  const removeSynonym = (key: string) => {
    const newSynonyms = { ...settings.synonyms };
    delete newSynonyms[key];
    setSettings({
      ...settings,
      synonyms: newSynonyms,
    });
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vocabulary Settings</h2>
      
      <div className="space-y-8">
        {/* Banned Words */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Banned Words/Phrases</h3>
          <p className="text-sm text-gray-600 mb-4">
            These words or phrases will be flagged or removed from product descriptions.
          </p>
          
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newBannedWord}
                onChange={(e) => setNewBannedWord(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBannedWord()}
                placeholder="Add banned word/phrase..."
                className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={addBannedWord}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add
              </button>
            </div>
          </div>

          <div className="border rounded-md p-4 bg-gray-50 max-h-48 overflow-y-auto">
            {settings.banned.length === 0 ? (
              <p className="text-gray-500 text-sm">No banned words added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {settings.banned.map((word, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                  >
                    {word}
                    <button
                      onClick={() => removeBannedWord(word)}
                      className="ml-2 text-red-600 hover:text-red-800 focus:outline-none"
                      aria-label={`Remove ${word}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Synonyms */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Synonyms / Replacements</h3>
          <p className="text-sm text-gray-600 mb-4">
            Define word replacements to standardize terminology.
          </p>
          
          <div className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newSynonymKey}
                onChange={(e) => setNewSynonymKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSynonym()}
                placeholder="From (e.g., 'grey')"
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="flex items-center text-gray-500">→</span>
              <input
                type="text"
                value={newSynonymValue}
                onChange={(e) => setNewSynonymValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSynonym()}
                placeholder="To (e.g., 'gray')"
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={addSynonym}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add
              </button>
            </div>
          </div>

          <div className="border rounded-md bg-gray-50 max-h-48 overflow-y-auto">
            {Object.keys(settings.synonyms).length === 0 ? (
              <p className="text-gray-500 text-sm p-4">No synonyms added yet.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(settings.synonyms).map(([key, value]) => (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">{key}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 font-mono">{value}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        <button
                          onClick={() => removeSynonym(key)}
                          className="text-red-600 hover:text-red-800 focus:outline-none"
                          aria-label={`Remove synonym ${key}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Vocabulary Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VocabSettingsTab;
