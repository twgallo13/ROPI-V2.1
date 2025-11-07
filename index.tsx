import React from 'react';
import './src/firebase';
// This import is for React 19
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './src/contexts/AuthContext';
import App from './src/App';

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    // This error will fire if the div is missing
    throw new Error("Could not find root element. Check index.html to ensure <div id='root'></div> exists.");
  }
  
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
};

// This is the robust "wait" logic
if (document.readyState === 'loading') {
  // If page is still loading, wait for it
  document.addEventListener('DOMContentLoaded', renderApp, { once: true });
} else {
  // If page is already loaded, run immediately
  renderApp();
}
