import React, { useRef, FormEvent, useState } from 'react';

export type VocabKey =
  | 'departments'
  | 'classes'
  | 'categories'
  | 'ageGroups'
  | 'genders'
  | 'materials'
  | 'statuses'
  | 'websites'
  | 'sportsTeams'
  | 'leagues'
  | 'fits'
  | 'taxClasses'
  | 'primaryColors'
  | 'descriptiveColors'
  | 'cutTypes'
  | 'closureTypes'
  | 'heelHeights'
  | 'platformHeights'
  | 'collections'
  | 'madeIn';

type Props = {
  title: string;
  vocabKey: VocabKey;
  items: string[];
  saving: boolean;
  error?: string | null;
  loading?: boolean;
  newValue: string;
  onNewChange(value: string): void;
  onAdd(): void;
  onEditStart(index: number, value: string): void;
  onEditSave(value: string): void;
  onEditCancel(): void;
  onDelete(index: number): void;
  isEditing(index: number): boolean;
  editValue: string;
  setEditValue(v: string): void;
  onReload?(): void;
  showAdminHint?: boolean;
  onBulkImport?: (items: string[]) => Promise<void>;
};

const VocabEditor: React.FC<Props> = ({
  title,
  vocabKey,
  items,
  saving,
  error,
  loading,
  newValue,
  onNewChange,
  onAdd,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  isEditing,
  editValue,
  setEditValue,
  onReload,
  showAdminHint,
  onBulkImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const lastActive = useRef<{ name?: string; start?: number; end?: number }>({});

  const restoreFocus = () => {
    const { name, start, end } = lastActive.current || {};
    if (!name) return;
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    if (typeof start === 'number' && typeof end === 'number') {
      try {
        el.setSelectionRange(start, end);
      } catch {
        // Ignore errors on non-text inputs
      }
    }
  };

  const handleNewInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNewChange(e.target.value);
    if (e.target.selectionStart != null) {
      lastActive.current = {
        name: e.target.name,
        start: e.target.selectionStart,
        end: e.target.selectionEnd ?? e.target.selectionStart,
      };
    }
  };

  const handleNewInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    lastActive.current = { name: e.currentTarget.name };
  };

  const handleAddClick = () => {
    onAdd();
    // Restore focus after React re-renders
    setTimeout(restoreFocus, 0);
  };

  const handleAddKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddClick();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditSave(editValue);
      setTimeout(restoreFocus, 0);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEditCancel();
      setTimeout(restoreFocus, 0);
    }
  };

  const handleEditSaveClick = () => {
    onEditSave(editValue);
    setTimeout(restoreFocus, 0);
  };

  const handleEditCancelClick = () => {
    onEditCancel();
    setTimeout(restoreFocus, 0);
  };

  const handleBulkImport = async () => {
    if (!onBulkImport || !bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;
    await onBulkImport(lines);
    setBulkText('');
    setShowBulkImport(false);
  };

  // Filter items by search term
  const filteredItems = searchTerm
    ? items.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
    : items;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {items.length > 10 && onBulkImport && (
          <button
            type="button"
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {showBulkImport ? 'Cancel Bulk Import' : 'Bulk Import'}
          </button>
        )}
      </div>
      
      {vocabKey === 'collections' && (
        <div className="mb-4 text-sm text-gray-600 bg-indigo-50 border border-indigo-200 rounded p-3">
          💡 <strong>Collections</strong> are seeded via <code className="bg-indigo-100 px-1 rounded">seedSettingsVocab</code> — edit with care.
        </div>
      )}

      {showBulkImport && onBulkImport && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste newline-separated values:
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm h-32"
            placeholder="Value 1&#10;Value 2&#10;Value 3"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleBulkImport}
              disabled={!bulkText.trim() || saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Import
            </button>
            <button
              type="button"
              onClick={() => { setBulkText(''); setShowBulkImport(false); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length > 10 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      )}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Failed to load {title}</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {onReload && (
                <button
                  type="button"
                  onClick={onReload}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <form ref={formRef}>
          <ul className="space-y-2 h-48 overflow-y-auto border rounded-md p-3 bg-gray-50 mb-4">
            {filteredItems.length === 0 && searchTerm ? (
              <li className="text-gray-400 text-sm italic">
                No matches for "{searchTerm}"
              </li>
            ) : filteredItems.length === 0 ? (
              <li className="text-gray-400 text-sm italic">
                No items yet
                {showAdminHint && (
                  <div className="mt-2 text-xs text-indigo-600">
                    💡 Run <strong>Actions → Seed Settings Vocab</strong>
                  </div>
                )}
              </li>
            ) : (
              filteredItems.map((item, displayIndex) => {
                const actualIndex = items.indexOf(item);
                return (
                <li
                  key={actualIndex}
                  className="flex items-center justify-between group hover:bg-white px-2 py-1 rounded transition-colors"
                >
                  {isEditing(actualIndex) ? (
                    <div className="flex items-center gap-2 flex-grow">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleEditKeyPress}
                        autoFocus
                        className="flex-grow border-indigo-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        aria-label={`Edit ${item}`}
                      />
                      <button
                        type="button"
                        onClick={handleEditSaveClick}
                        className="text-green-600 hover:text-green-800 font-bold text-lg"
                        title="Save (or press Enter)"
                        aria-label="Save"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={handleEditCancelClick}
                        className="text-gray-500 hover:text-gray-700 font-bold text-lg"
                        title="Cancel (or press Esc)"
                        aria-label="Cancel"
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
                          onClick={() => onEditStart(actualIndex, item)}
                          className="text-indigo-500 hover:text-indigo-700 text-sm font-medium px-2 py-1"
                          disabled={saving}
                          title="Edit"
                          aria-label={`Edit ${item}`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(actualIndex)}
                          className="text-red-500 hover:text-red-700 text-lg font-bold px-2 py-1"
                          disabled={saving}
                          title="Delete"
                          aria-label={`Delete ${item}`}
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </li>
                );
              })
            )}
          </ul>
          <div className="flex space-x-2">
            <label htmlFor={`new-${vocabKey}`} className="sr-only">
              Add new {title.toLowerCase()} item
            </label>
            <input
              id={`new-${vocabKey}`}
              name={`new-${vocabKey}`}
              type="text"
              value={newValue}
              onChange={handleNewInputChange}
              onFocus={handleNewInputFocus}
              onKeyPress={handleAddKeyPress}
              placeholder="Add new..."
              disabled={saving}
              autoComplete="off"
              autoCapitalize="none"
              inputMode="text"
              className="flex-grow block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={handleAddClick}
              disabled={saving || !newValue.trim()}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default React.memo(VocabEditor);
