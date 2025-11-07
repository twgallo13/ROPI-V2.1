import React, { useState, ChangeEvent } from 'react';
import AISettingsTab from './settings/AISettingsTab';
import VocabSettingsTab from './settings/VocabSettingsTab';
import Toast from '../components/Toast';
import { useAttributesSettings, type AttributeKey } from '../hooks/useAttributesSettings';
import { useAuth } from '../contexts/AuthContext';

// Define the types for the keys we'll be managing
type VocabKey = keyof typeof editableVocabs;
const editableVocabs = {
  departments: 'Departments',
  classes: 'Classes',
  categories: 'Categories',
  ageGroups: 'Age Groups',
  genders: 'Genders',
  statuses: 'Statuses',
  websites: 'Websites',
  sportsTeams: 'Sports Teams',
  leagues: 'Leagues',
};

// Define the type for an automation rule
type Rule = {
  condition: string;
  action: string;
  status: 'Active' | 'Paused';
};

// Mock data for the rules table
const mockRules: Rule[] = [
  { condition: "IF Department = Footwear", action: "SET Category = Shoes", status: "Active" },
  { condition: "IF Brand = Nike", action: "SET Department = Footwear", status: "Active" },
  { condition: "IF Category = Hoodies", action: "SET Department = Apparel", status: "Paused" },
];

type ActiveTab = 'prompts' | 'vocab' | 'vocabManaged' | 'rules' | 'brands' | 'ai' | 'export';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ai');
  const { user } = useAuth();
  const attributes = useAttributesSettings();
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [newItems, setNewItems] = useState({
    departments: '',
    classes: '',
    categories: '',
    ageGroups: '',
    genders: '',
    statuses: '',
    websites: '',
    sportsTeams: '',
    leagues: '',
  });
  const [editingItem, setEditingItem] = useState<{ key: AttributeKey; index: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, show: false });
  };

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
      showToast(result.error || 'Couldn\'t save — try again', 'error');
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
      showToast(result.error || 'Couldn\'t save — try again', 'error');
    }
  };

  const handleDelete = async (key: AttributeKey, index: number) => {
    if (!user) {
      showToast('Please sign in to edit settings', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    const result = await attributes.deleteItem(key, index);
    
    if (result.success) {
      showToast('Deleted', 'success');
    } else {
      showToast(result.error || 'Couldn\'t delete — try again', 'error');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, key: VocabKey) => {
    if (e.key === 'Enter') {
      handleAddItem(key);
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const TabButton: React.FC<{ tabName: ActiveTab; label: string }> = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
        activeTab === tabName
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );

  const VocabEditor: React.FC<{ vocabKey: VocabKey; title: string }> = ({ vocabKey, title }) => {
    const items = attributes.data[vocabKey as AttributeKey] || [];
    const isEditing = (index: number) => editingItem?.key === vocabKey && editingItem?.index === index;

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        
        {attributes.loading ? (
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
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleEditKeyPress}
                        onBlur={cancelEdit}
                        autoFocus
                        className="flex-grow border-indigo-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    ) : (
                      <>
                        <span 
                          className="text-gray-700 flex-grow cursor-pointer"
                          onClick={() => user && startEdit(vocabKey as AttributeKey, index, item)}
                          title="Click to edit"
                        >
                          {item}
                        </span>
                        <button
                          onClick={() => handleDelete(vocabKey as AttributeKey, index)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity ml-2"
                          disabled={attributes.saving}
                          title="Delete"
                        >
                          ×
                        </button>
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

  const PlaceholderTab: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="mt-2 text-gray-600">Configuration for this section will be available here.</p>
    </div>
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage system-wide settings and configurations.
        </p>
      </header>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <TabButton tabName="ai" label="AI Settings" />
          <TabButton tabName="vocabManaged" label="Vocab (Managed)" />
          <TabButton tabName="prompts" label="AI Prompts" />
          <TabButton tabName="vocab" label="Vocab / Dropdowns" />
          <TabButton tabName="rules" label="Rules" />
          <TabButton tabName="brands" label="Brands" />
          <TabButton tabName="export" label="Export Settings" />
        </nav>
      </div>

      <main>
        {activeTab === 'ai' && <AISettingsTab onShowToast={showToast} />}
        {activeTab === 'vocabManaged' && <VocabSettingsTab onShowToast={showToast} />}
        {activeTab === 'vocab' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(editableVocabs).map(([key, title]) => (
                <VocabEditor key={key} vocabKey={key as VocabKey} title={title} />
            ))}
          </div>
        )}
        {activeTab === 'rules' && (
           <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Attribute Automation Rules</h2>
                    <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Add New Rule
                    </button>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition (IF)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action (THEN)</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockRules.map((rule, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{rule.condition}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{rule.action}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            rule.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {rule.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        {activeTab === 'prompts' && <PlaceholderTab title="Manage AI Prompts" />}
        {activeTab === 'brands' && <PlaceholderTab title="Manage Brands" />}
        {activeTab === 'export' && <PlaceholderTab title="Manage Export Settings" />}
      </main>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
};

export default SettingsPage;