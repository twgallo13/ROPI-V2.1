import React from 'react';

const ImportPage: React.FC = () => {
  // Mock data for the mapping preview table
  const mockMapping = [
    { csvHeader: 'Mpn', targetField: 'mpn' },
    { csvHeader: 'Brand', targetField: 'brand' },
    { csvHeader: 'RICS Category', targetField: 'category' },
    { csvHeader: 'Name', targetField: 'name' },
    { csvHeader: 'Price', targetField: 'variants.price' },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Import Products from CSV</h1>
        <p className="text-gray-600 mt-1">
          Upload a CSV file to begin the import process.
        </p>
      </header>

      <div className="space-y-8">
        {/* Step 1: Upload */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 1: Upload File</h2>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                CSV up to 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Mapping Preview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 2: Auto-Map Preview</h2>
          <p className="text-sm text-gray-600 mb-4">
            Review the automatically detected column mappings. Mappings can be adjusted in the settings.
          </p>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CSV Header
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Field
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockMapping.map((mapping, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mapping.csvHeader}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{mapping.targetField}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Step 3: Confirm */}
        <div className="flex justify-end">
           <button
              type="button"
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Confirm & Import
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;