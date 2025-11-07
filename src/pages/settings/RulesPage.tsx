import React from 'react';

// Simple mock rules table (same as previous tab)

type Rule = {
  condition: string;
  action: string;
  status: 'Active' | 'Paused';
};

const mockRules: Rule[] = [
  { condition: 'IF Department = Footwear', action: 'SET Category = Shoes', status: 'Active' },
  { condition: 'IF Brand = Nike', action: 'SET Department = Footwear', status: 'Active' },
  { condition: 'IF Category = Hoodies', action: 'SET Department = Apparel', status: 'Paused' },
];

const RulesPage: React.FC = () => {
  return (
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition (IF)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action (THEN)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockRules.map((rule, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{rule.condition}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{rule.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${rule.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {rule.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RulesPage;
