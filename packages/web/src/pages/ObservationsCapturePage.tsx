/**
 * Mobile Observations Capture Page
 * 
 * LP-1.1.1: Mobile-first observation capture workflow.
 * Allows users to scan/select MPN, capture observations with images,
 * and sync offline when connectivity is restored.
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 */

import MobileObservationCapture from '../components/observations/MobileObservationCapture';
import { useAuth } from '../hooks/useAuth';
import './ObservationsCapturePage.css';

function ObservationsCapturePage() {
  const { currentUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="observations-capture-page loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="observations-capture-page auth-required">
        <div className="auth-message">
          <h2>Sign In Required</h2>
          <p>Please sign in to capture observations.</p>
          <a href="/login" className="sign-in-btn">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="observations-capture-page">
      {/* Main capture UI - handles its own sync state */}
      <MobileObservationCapture />
    </div>
  );
}

export default ObservationsCapturePage;
