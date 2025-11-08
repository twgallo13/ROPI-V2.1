import React, { useState, ChangeEvent } from 'react';
import { useAttributesSettings, AttributeKey } from '../../hooks/useAttributesSettings';
import { useAuth } from '../../contexts/AuthContext';
import Toast from '../../components/Toast';

// Editable vocab keys & labels
const editableVocabs: Record<string, string> = {
  departments: 'Departments',
  classes: 'Classes',
  categories: 'Categories',
  ageGroups: 'Age Groups',
  genders: 'Genders',
  statuses: 'Statuses',
  websites: 'Websites',
  sportsTeams: 'Sports Teams',
  leagues: 'Leagues',
  fits: 'Fits',
  taxClasses: 'Tax Classes',
};

type VocabKey = keyof typeof editableVocabs;

const VocabDropdownsPage: React.FC = () => {
  const attributes = useAttributesSettings();
  const { user } = useAuth();
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [newItems, setNewItems] = useState<Record<string, string>>({
    departments: '',
    classes: '',
    categories: '',
    ageGroups: '',
    genders: '',
    statuses: '',
    websites: '',
    sportsTeams: '',
    leagues: '',
    fits: '',
    taxClasses: '',
  });
  const [editingItem, setEditingItem] = useState<{ key: AttributeKey; index: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => setToast({ show: true, message, type });
  const hideToast = () => setToast(t => ({ ...t, show: false }));

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>, key: VocabKey) => {
    const { value } = e.target;
    setNewItems(prev => ({ ...prev, [key]: value }));
  };

  const handleAddItem = async (key: VocabKey) => {
    if (!user) {
      showToast('Please sign in to edit settings', 'error');
      return;
    }
    const newItem = newItems[key].trim();
    if (!newItem) return;
    const result = await attributes.addItem(key as AttributeKey, newItem);
    if (result.success) {
      setNewItems(prev => ({ ...prev, [key]: '' }));
      showToast('Saved', 'success');
    } else {
      showToast(result.error || "Couldn't save — try again", 'error');
    }
  };

  const startEdit = (key: AttributeKey, index: number, currentValue: string) => {
    setEditingItem({ key, index });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingItem || !user) {
      cancelEdit();
      return;
    }
    const result = await attributes.editItem(editingItem.key, editingItem.index, editValue);
    if (result.success) {
      showToast('Saved', 'success');
      cancelEdit();
    } else {
      showToast(result.error || "Couldn't save — try again", 'error');
    }
  };

  const handleDelete = async (key: AttributeKey, index: number) => {
    if (!user) {
      showToast('Please sign in to edit settings', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this item?')) return;
    const result = await attributes.deleteItem(key, index);
    if (result.success) {
      showToast('Deleted', 'success');
    } else {
      showToast(result.error || "Couldn't delete — try again", 'error');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, key: VocabKey) => {
    if (e.key === 'Enter') handleAddItem(key);
  };

  const handleEditKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const VocabEditor: React.FC<{ vocabKey: VocabKey; title: string }> = ({ vocabKey, title }) => {
    const items = attributes.data[vocabKey as AttributeKey] || [];
    const isEditing = (index: number) => editingItem?.key === vocabKey && editingItem?.index === index;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        {attributes.error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Failed to load {title}</h3>
                <p className="text-sm text-red-700 mt-1">{attributes.error}</p>
                <button
                  type="button"
                  onClick={() => attributes.reload()}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : attributes.loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <ul className="space-y-2 h-48 overflow-y-auto border rounded-md p-3 bg-gray-50 mb-4">
              {items.length === 0 ? (
                <li className="text-gray-400 text-sm italic">No items yet</li>
              ) : (
                items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between group hover:bg-white px-2 py-1 rounded transition-colors"
                  >
                    {isEditing(index) ? (
                      <div className="flex items-center gap-2 flex-grow">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          autoFocus
                          className="flex-grow border-indigo-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="text-green-600 hover:text-green-800 font-bold text-lg"
                          title="Save (or press Enter)"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-gray-500 hover:text-gray-700 font-bold text-lg"
                          title="Cancel (or press Esc)"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-gray-700 flex-grow">{item}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => user && startEdit(vocabKey as AttributeKey, index, item)}
                            className="text-indigo-500 hover:text-indigo-700 text-sm font-medium px-2 py-1"
                            disabled={attributes.saving}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(vocabKey as AttributeKey, index)}
                            className="text-red-500 hover:text-red-700 text-lg font-bold px-2 py-1"
                            disabled={attributes.saving}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))
              )}
            </ul>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newItems[vocabKey]}
                onChange={(e) => handleInputChange(e, vocabKey)}
                onKeyPress={(e) => handleKeyPress(e, vocabKey)}
                placeholder="Add new..."
                disabled={attributes.saving}
                className="flex-grow block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={() => handleAddItem(vocabKey)}
                disabled={attributes.saving || !newItems[vocabKey].trim()}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {attributes.saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(editableVocabs).map(([key, title]) => (
          <VocabEditor key={key} vocabKey={key as VocabKey} title={title} />
        ))}
      </div>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default VocabDropdownsPage;
