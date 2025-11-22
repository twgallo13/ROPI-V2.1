/**
 * Sandbox Panel
 * Upload CSV and preview attribute mappings
 */
import React, { useState } from 'react';
import { 
  XMarkIcon,
  ArrowUpTrayIcon,
  BeakerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface SandboxPanelProps {
  onClose: () => void;
}

interface MappingProposal {
  csvHeader: string;
  canonicalPath: string;
  confidence: number;
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'none';
  matchedAlias: string;
}

export default function SandboxPanel({ onClose }: SandboxPanelProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [mappings, setMappings] = useState<MappingProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [_csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [_previewData, _setPreviewData] = useState<unknown>(null);

  async function handleLoadTestCSV() {
    try {
      setLoading(true);
      // Fetch test CSV and upload as multipart
      const testCsvResponse = await fetch('/test-import-sample.csv');
      if (!testCsvResponse.ok) {
        throw new Error('Test CSV not found');
      }
      const csvBlob = await testCsvResponse.blob();
      const testFile = new File([csvBlob], 'Test 2.csv', { type: 'text/csv' });
      
      const fd = new FormData();
      fd.append('file', testFile);
      
      const response = await fetch('/api/attributes/propose-mapping', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(body.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setMappings(data.mappings || []);
      setCsvHeaders(data.headers || []);
    } catch (error) {
      console.error('Load test CSV error:', error);
      alert(`Failed to load test CSV: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    try {
      setLoading(true);
      
      const fd = new FormData();
      fd.append('file', file);
      
      const response = await fetch('/api/attributes/propose-mapping', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(body.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setMappings(data.mappings || []);
      setCsvHeaders(data.headers || []);
    } catch (error) {
      console.error('File upload error:', error);
      alert(`Failed to analyze CSV file: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function getMatchBadge(matchType: string, confidence: number) {
    if (matchType === 'exact') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Exact</span>;
    }
    if (matchType === 'synonym') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Synonym</span>;
    }
    if (matchType === 'fuzzy' && confidence > 0.7) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Fuzzy ({(confidence * 100).toFixed(0)}%)</span>;
    }
    return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">No Match</span>;
  }

  const foundationAttributes = mappings.filter(m => {
    const path = m.canonicalPath.toLowerCase();
    return path.includes('age') || path.includes('gender') || path.includes('department') || 
           path.includes('class') || path.includes('category');
  });

  const hasFoundationCoverage = foundationAttributes.length >= 5;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-purple-50">
        <div className="flex items-center gap-2">
          <BeakerIcon className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-900">Mapping Sandbox</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Load CSV</h3>
          <div className="space-y-2">
            <button
              onClick={handleLoadTestCSV}
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BeakerIcon className="w-4 h-4" />
              Load Test 2 CSV
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                Upload CSV File
              </label>
            </div>

            {csvFile && (
              <p className="text-xs text-gray-600">
                Loaded: <span className="font-medium">{csvFile.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Analyzing CSV...</p>
          </div>
        )}

        {/* Foundation Checklist */}
        {mappings.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              {hasFoundationCoverage ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />
              )}
              <h3 className="text-sm font-medium text-gray-700">Foundation Attributes</h3>
            </div>
            <div className="space-y-2">
              {['Age Group', 'Gender', 'Department', 'Class', 'Category'].map(foundation => {
                const found = foundationAttributes.some(m => 
                  m.canonicalPath.toLowerCase().includes(foundation.toLowerCase().replace(' ', '_'))
                );
                return (
                  <div key={foundation} className="flex items-center gap-2 text-sm">
                    {found ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded" />
                    )}
                    <span className={found ? 'text-gray-900' : 'text-gray-400'}>{foundation}</span>
                  </div>
                );
              })}
            </div>
            {!hasFoundationCoverage && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Missing foundation attributes. Export readiness may be affected.
              </p>
            )}
          </div>
        )}

        {/* Mapping Preview */}
        {mappings.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Proposed Mappings ({mappings.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mappings.map((mapping, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{mapping.csvHeader}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                      → {mapping.canonicalPath || 'No mapping'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getMatchBadge(mapping.matchType, mapping.confidence)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {mappings.length > 0 && (
          <div className="space-y-2">
            <button
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              onClick={() => alert('Apply mappings functionality will be implemented')}
            >
              Apply Suggested Mappings
            </button>
            <button
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              onClick={() => alert('Preflight minimal check will be implemented')}
            >
              Run Preflight (Minimal)
            </button>
            <button
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              onClick={() => alert('Preflight full check will be implemented')}
            >
              Run Preflight (Full)
            </button>
            <button
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
              onClick={() => alert('Import to staging will be implemented')}
            >
              Import (Staging Only)
            </button>
          </div>
        )}

        {/* Mapping Decisions JSON */}
        {mappings.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Mapping Decisions JSON</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(mappings, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
