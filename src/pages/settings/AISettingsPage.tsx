import React, { useState } from 'react';
import AISettingsTab from './AISettingsTab';
import Toast from '../../components/Toast';

const AISettingsPage: React.FC = () => {
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const onShowToast = (message: string, type: 'success' | 'error') => setToast({ show: true, message, type });

  return (
    <>
      <AISettingsTab onShowToast={onShowToast} />
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />}
    </>
  );
};

export default AISettingsPage;
