import React, { useState, useRef } from 'react';
import MappingReview from '../components/MappingReview';
import Toast from '../components/Toast';
import { parseCSVAsync, generateErrorCSV, downloadFile, getDelimiterName, type ColumnMapping, type ParseResult } from '../utils/csvParser';
import { importToFirestore, generateErrorCSV as generateErrorCSVV2, type ImportRow } from '../utils/firestoreImportV2';

type ImportStep = 'upload' | 'mapping' | 'importing' | 'complete';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

const ImportPage: React.FC = () => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importProgress, setImportProgress] = useState({ imported: 0, skipped: 0 });
  const [errorCSV, setErrorCSV] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, show: false });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setFileName(file.name);
      const content = await file.text();
      // Lisa v2.0: Use async parser with registry support
      const result = await parseCSVAsync(content);
      
      setParseResult(result);
      setMappings(result.mappings);
      setStep('mapping');
      
      showToast(`Parsed ${result.rows.length} rows from CSV (registry-enhanced mapping)`, 'success');
    } catch (error) {
      showToast(`Error parsing CSV: ${error}`, 'error');
      console.error('CSV parse error:', error);
    }
  };

  const handleMappingChange = (index: number, newTargetField: string | null) => {
    const updatedMappings = [...mappings];
    updatedMappings[index] = {
      ...updatedMappings[index],
      targetField: newTargetField,
    };
    setMappings(updatedMappings);
  };

  const handleConfirmImport = async () => {
    if (!parseResult) return;

    try {
      setStep('importing');
      setImportProgress({ success: 0, failed: 0 });

      // Apply mappings to rows
      const mappedRows: ImportRow[] = parseResult.rows.map((row) => {
        const mappedData: Record<string, any> = {};
        
        mappings.forEach((mapping, index) => {
          if (mapping.targetField) {
            const value = row.data[parseResult.headers[index]];
            if (value !== undefined) {
              mappedData[mapping.targetField] = value;
            }
          }
        });

        return {
          rowNumber: row.rowNumber,
          data: mappedData,
        };
      });

      // Import to Firestore
      const result = await importToFirestore(mappedRows, parseResult.rawData);
      
      setImportProgress({ imported: result.imported, skipped: result.skipped });
      setStep('complete');

      // Generate error CSV if there were validation errors
      if (result.errors.length > 0) {
        const errorCSV = generateErrorCSV(parseResult.headers, result.errors);
        setErrorCSV(errorCSV);
        showToast(
          `Import completed: ${result.imported} imported, ${result.skipped} skipped. ${result.errors.length} errors - download CSV for details.`,
          result.errors.length > 0 ? 'error' : 'success'
        );
      } else {
        setErrorCSV(null);
        showToast(`Successfully imported ${result.imported} rows! ${result.skipped} skipped (duplicates or empty rows).`, 'success');
      }
    } catch (error) {
      showToast(`Import failed: ${error}`, 'error');
      console.error('Import error:', error);
      setStep('mapping');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParseResult(null);
    setMappings([]);
    setFileName('');
    setImportProgress({ imported: 0, skipped: 0 });
    setErrorCSV(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadErrors = () => {
    if (errorCSV) {
      downloadFile(errorCSV, `import-errors-${Date.now()}.csv`);
    }
  };

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
        {step === 'upload' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Step 1: Upload File</h2>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>Upload a file</span>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV up to 10MB</p>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Required:</strong> MPN and SKU
                </p>
                <p className="text-xs text-gray-500">
                  Optional: name, brand, price, size, color, etc.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Mapping Review */}
        {step === 'mapping' && parseResult && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    File: {fileName}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Parsed {parseResult.rows.length} rows with {parseResult.headers.length} columns</p>
                    <p className="mt-1">
                      Detected delimiter: <strong>{getDelimiterName(parseResult.delimiter)}</strong> 
                      {parseResult.delimiter === '\t' ? ' (tab)' : ` (${parseResult.delimiter})`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {parseResult.headers.length === 1 && parseResult.rows.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Possible parsing issue detected
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        It looks like your file might be tab- or semicolon-delimited. We auto-detected '{getDelimiterName(parseResult.delimiter)}', 
                        but if this is wrong, please re-export as standard CSV (comma-separated).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <MappingReview
              mappings={mappings}
              onMappingChange={handleMappingChange}
              onConfirm={handleConfirmImport}
              onCancel={handleReset}
            />
          </>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Importing...</h2>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
            </div>
            <p className="text-center text-gray-600">Processing your import. Please wait...</p>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Import Complete</h2>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-800">
                  <div className="text-3xl font-bold">{importProgress.imported}</div>
                  <div className="text-sm">Imported</div>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-gray-800">
                  <div className="text-3xl font-bold">{importProgress.skipped}</div>
                  <div className="text-sm">Skipped</div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-yellow-800">
                  <div className="text-3xl font-bold">{errorCSV ? parseResult?.rows.length - importProgress.imported || 0 : 0}</div>
                  <div className="text-sm">Errors</div>
                </div>
              </div>
            </div>

            {errorCSV && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800 mb-3">
                  Some rows had validation errors and were not imported. Download the error report for details (includes MPN references).
                </p>
                <button
                  onClick={handleDownloadErrors}
                  className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Download Error Report (CSV)
                </button>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Import Summary</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• All products are keyed by MPN (Manufacturer Part Number)</li>
                <li>• Variants are grouped under their parent MPN</li>
                <li>• Products are in "intake" status and ready for review</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDownloadErrors}
                disabled={!errorCSV}
                className="px-6 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Download Error Report
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
};

export default ImportPage;