import React from 'react';
import { VocabOption } from '../../../hooks/useVocab';

type Props = {
  title: string;
  items: VocabOption[];
  loading?: boolean;
  showAdminHint?: boolean;
};

/**
 * Read-only vocab viewer for seeded collections.
 * Shows admin hint when empty.
 */
const VocabViewer: React.FC<Props> = ({ title, items, loading, showAdminHint }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <ul className="space-y-2 h-48 overflow-y-auto border rounded-md p-3 bg-gray-50">
          {items.length === 0 ? (
            <li className="text-gray-400 text-sm italic">
              No options yet.
              {showAdminHint && (
                <div className="mt-2 text-xs text-indigo-600">
                  💡 Run <strong>GitHub Actions → Seed Settings Vocab</strong>
                </div>
              )}
            </li>
          ) : (
            items.map((item, index) => (
              <li
                key={index}
                className="px-2 py-1 text-gray-700 hover:bg-white rounded transition-colors"
              >
                {item.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default VocabViewer;
