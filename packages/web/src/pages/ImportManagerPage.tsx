/**
 * Import Manager Page
 * Sprint: 019A_vB — Import Manager UI with Mapping & Validation Preview
 * 
 * Source-of-truth pages:
 * - Section 1 — Navigation & Page Index (Import route)
 * - Ropi AOSS IA (Import/Export modules)
 * - Admin UI Build Spec — Import Settings (link from 3.1)
 * 
 * Flow:
 * 1. Upload CSV
 * 2. Map headers to normalized fields
 * 3. Preview normalized rows with validation
 * 4. Confirm and import
 * 5. View import history
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import PageLayout from '@/components/common/PageLayout';
import { useAuth } from '@/contexts/AuthProvider';
import { db } from '@/firebaseConfig';
import { ImportUploadStep } from '@/components/import/ImportUploadStep';
import { ImportMappingStep } from '@/components/import/ImportMappingStep';
import { ImportPreviewStep } from '@/components/import/ImportPreviewStep';
import { ImportConfirmStep } from '@/components/import/ImportConfirmStep';
import { ImportHistoryTable } from '@/components/import/ImportHistoryTable';
import type { ImportBatch } from '@ropi-aoss/sdk';
import './ImportManagerPage.css';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'confirm' | 'history';

interface UploadedFile {
  file: File;
  content: string;
  headers: string[];
  rows: Record<string, string>[];
}

interface ColumnMappingConfig {
  [sourceColumn: string]: string; // Maps CSV column to normalized field
}

function ImportManagerPage() {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ImportStep>('history');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMappingConfig>({});
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);

  // Check if user has write access (admin or merch role)
  useEffect(() => {
    async function checkAccess() {
      if (!currentUser) {
        setHasWriteAccess(false);
        return;
      }

      // Check for admin
      if (isAdmin) {
        setHasWriteAccess(true);
        return;
      }

      // Check for merch role via custom claims
      try {
        const tokenResult = await currentUser.getIdTokenResult();
        const role = tokenResult.claims.role;
        setHasWriteAccess(role === 'admin' || role === 'merch');
      } catch (error) {
        console.error('Failed to check user role:', error);
        setHasWriteAccess(false);
      }
    }

    checkAccess();
  }, [currentUser, isAdmin]);

  // Load import history
  useEffect(() => {
    if (!hasWriteAccess || !db) return;

    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const batchesRef = collection(db!, 'import_batches');
        const q = query(batchesRef, orderBy('createdAt', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        
        const batches: ImportBatch[] = snapshot.docs.map(doc => ({
          batchId: doc.id,
          ...doc.data()
        } as ImportBatch));
        
        setImportHistory(batches);
      } catch (error) {
        console.error('Failed to load import history:', error);
      } finally {
        setLoadingHistory(false);
      }
    }

    loadHistory();
  }, [hasWriteAccess]);

  const handleFileUploaded = (fileData: UploadedFile) => {
    setUploadedFile(fileData);
    setCurrentStep('mapping');
  };

  const handleMappingComplete = (mappings: ColumnMappingConfig) => {
    setColumnMappings(mappings);
    setCurrentStep('preview');
  };

  const handlePreviewConfirmed = () => {
    setCurrentStep('confirm');
  };

  const handleImportComplete = (batchId: string) => {
    // Navigate to batch detail page
    navigate(`/import/batches/${batchId}`);
  };

  const handleStartNewImport = () => {
    setUploadedFile(null);
    setColumnMappings({});
    setCurrentStep('upload');
  };

  const handleBackToHistory = () => {
    setUploadedFile(null);
    setColumnMappings({});
    setCurrentStep('history');
  };

  // Access control
  if (!currentUser) {
    return (
      <PageLayout title="Import Manager">
        <div className="import-access-denied">
          <h3>Authentication Required</h3>
          <p>Please sign in to access the Import Manager.</p>
        </div>
      </PageLayout>
    );
  }

  if (!hasWriteAccess) {
    return (
      <PageLayout title="Import Manager">
        <div className="import-access-denied">
          <h3>Access Denied</h3>
          <p>You do not have permission to access this page.</p>
          <p>Import Manager is restricted to Admin and Merch roles.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Import Manager">
      <div className="import-manager">
        {/* Step indicator */}
        {currentStep !== 'history' && (
          <div className="import-steps">
            <button
              className="step-back-button"
              onClick={handleBackToHistory}
              title="Back to import history"
            >
              ← Back to History
            </button>
            <div className="step-indicator">
              <div className={`step ${currentStep === 'upload' ? 'active' : 'completed'}`}>
                1. Upload
              </div>
              <div className={`step ${currentStep === 'mapping' ? 'active' : currentStep === 'preview' || currentStep === 'confirm' ? 'completed' : ''}`}>
                2. Map Columns
              </div>
              <div className={`step ${currentStep === 'preview' ? 'active' : currentStep === 'confirm' ? 'completed' : ''}`}>
                3. Preview
              </div>
              <div className={`step ${currentStep === 'confirm' ? 'active' : ''}`}>
                4. Confirm
              </div>
            </div>
          </div>
        )}

        {/* History view (default) */}
        {currentStep === 'history' && (
          <div className="import-history-view">
            <div className="history-header">
              <h2>Import History</h2>
              <button
                className="btn-primary"
                onClick={handleStartNewImport}
              >
                + New Import
              </button>
            </div>
            <ImportHistoryTable
              batches={importHistory}
              loading={loadingHistory}
              onBatchClick={(batchId) => navigate(`/import/batches/${batchId}`)}
            />
          </div>
        )}

        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <ImportUploadStep
            onFileUploaded={handleFileUploaded}
            onCancel={handleBackToHistory}
          />
        )}

        {/* Step 2: Mapping */}
        {currentStep === 'mapping' && uploadedFile && (
          <ImportMappingStep
            headers={uploadedFile.headers}
            onMappingComplete={handleMappingComplete}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {/* Step 3: Preview */}
        {currentStep === 'preview' && uploadedFile && (
          <ImportPreviewStep
            file={uploadedFile}
            mappings={columnMappings}
            onConfirm={handlePreviewConfirmed}
            onBack={() => setCurrentStep('mapping')}
          />
        )}

        {/* Step 4: Confirm & Import */}
        {currentStep === 'confirm' && uploadedFile && (
          <ImportConfirmStep
            file={uploadedFile.file}
            mappings={columnMappings}
            onImportComplete={handleImportComplete}
            onBack={() => setCurrentStep('preview')}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default ImportManagerPage;
