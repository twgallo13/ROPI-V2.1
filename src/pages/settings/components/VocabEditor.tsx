import React, { useRef, FormEvent } from 'react';

export type VocabKey =
  | 'departments'
  | 'classes'
  | 'categories'
  | 'ageGroups'
  | 'genders'
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
  | 'platformHeights';

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
}) => {
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

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
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
            {items.length === 0 ? (
              <li className="text-gray-400 text-sm italic">
                No items yet
                {showAdminHint && (
                  <div className="mt-2 text-xs text-indigo-600">
                    💡 Run <strong>Actions → Seed Settings Vocab</strong>
                  </div>
                )}
              </li>
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
                          onClick={() => onEditStart(index, item)}
                          className="text-indigo-500 hover:text-indigo-700 text-sm font-medium px-2 py-1"
                          disabled={saving}
                          title="Edit"
                          aria-label={`Edit ${item}`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(index)}
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
              ))
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
