import React, { useState } from 'react';
import VocabSettingsTab from './VocabSettingsTab';
import Toast from '../../components/Toast';

const VocabManagedPage: React.FC = () => {
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const onShowToast = (message: string, type: 'success' | 'error') => setToast({ show: true, message, type });

  return (
    <>
      <VocabSettingsTab onShowToast={onShowToast} />
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />}
    </>
  );
};

export default VocabManagedPage;
