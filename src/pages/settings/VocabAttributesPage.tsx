import React from 'react';
import { useVocab } from '../../hooks/useVocab';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Display-only page for shoe-specific vocab attributes seeded via seedSettingsVocab.
 * Shows admin note when lists are empty.
 */
const VocabAttributesPage: React.FC = () => {
  const vocab = useVocab();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const vocabSections = [
    { key: 'primaryColors', label: 'Primary Colors', items: vocab.primaryColors },
    { key: 'descriptiveColors', label: 'Descriptive Colors', items: vocab.descriptiveColors },
    { key: 'cutTypes', label: 'Cut Types', items: vocab.cutTypes },
    { key: 'closureTypes', label: 'Closure Types', items: vocab.closureTypes },
    { key: 'heelHeights', label: 'Heel Heights', items: vocab.heelHeights },
    { key: 'platformHeights', label: 'Platform Heights', items: vocab.platformHeights },
  ];

  if (vocab.loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-20 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Shoe Attributes</h2>
        <p className="text-sm text-gray-600 mt-1">
          View vocabulary options for shoe-specific attributes. These are seeded via the Cloud Function.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vocabSections.map(({ key, label, items }) => (
          <div key={key} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{label}</h3>
            
            {items.length === 0 ? (
              <div className="border rounded-md p-4 bg-gray-50">
                <p className="text-gray-400 text-sm italic mb-2">No options yet.</p>
                {isAdmin && (
                  <p className="text-xs text-indigo-600">
                    💡 Run <strong>Actions → Seed Settings Vocab</strong> to populate.
                  </p>
                )}
              </div>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-3 bg-gray-50">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className="px-2 py-1 text-sm text-gray-700 hover:bg-white rounded transition-colors"
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VocabAttributesPage;
