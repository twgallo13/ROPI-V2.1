import { useState } from 'react';
import PageLayout from '@/components/common/PageLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLaunchSignup } from '@/hooks/useLaunchSignup';
import { usePageTitle } from '@/hooks/usePageTitle';
import SignInModal from '@/components/Auth/SignInModal';

/**
 * Launch Calendar Page
 * 
 * Shows upcoming product launches with "NOTIFY ME" signup functionality.
 * 
 * Auth Integration (PROMPT_018B):
 * - Unauthenticated: "NOTIFY ME" opens SignInModal
 * - Authenticated: "NOTIFY ME" writes to Firestore launchSignups
 * - Show confirmation message after signup
 * 
 * TODO: Full calendar UI implementation according to Section 7
 * https://www.notion.so/2b845ee1ec5a811d8d47ef14b3d0f46c
 * 
 * Expected features (future):
 * - Calendar view (month, week, day)
 * - Product launch timelines
 * - Status indicators
 * - Filter by brand, category, status
 * - Quick add/edit launch dates
 */

// Mock launch data for demo
const mockLaunches = [
  {
    id: 'launch_2025_q1_ropi_runner',
    productId: 'prod_ropi_runner_2025',
    name: 'Ropi Runner 2025',
    description: 'Next generation running shoe with enhanced cushioning',
    launchDate: '2025-03-15',
    category: 'Footwear',
    status: 'upcoming',
  },
  {
    id: 'launch_2025_q2_ropi_classic_colorways',
    productId: 'prod_ropi_classic_colorways_2025',
    name: 'Ropi Classic - New Colorways',
    description: 'Spring 2025 color palette for the Ropi Classic line',
    launchDate: '2025-04-01',
    category: 'Footwear',
    status: 'upcoming',
  },
  {
    id: 'launch_2025_q2_ropi_hightop_v2',
    productId: 'prod_ropi_hightop_v2_2025',
    name: 'Ropi HighTop V2',
    description: 'Updated design with improved ankle support',
    launchDate: '2025-05-20',
    category: 'Footwear',
    status: 'upcoming',
  },
];

function LaunchCalendarPage() {
  usePageTitle('Launch Calendar');
  
  const { currentUser, loading: authLoading } = useAuth();
  const { signupForLaunch, loading: signupLoading } = useLaunchSignup();
  
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [pendingLaunch, setPendingLaunch] = useState<{ launchId: string; productId: string } | null>(null);
  const [signedUpLaunches, setSignedUpLaunches] = useState<Set<string>>(new Set());
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const handleNotifyMe = async (launchId: string, productId: string) => {
    if (!currentUser) {
      // Unauthenticated: Show sign-in modal
      setPendingLaunch({ launchId, productId });
      setShowSignInModal(true);
      return;
    }

    // Authenticated: Sign up immediately
    try {
      await signupForLaunch({ launchId, productId, mode: 'account' });
      setSignedUpLaunches(prev => new Set(prev).add(launchId));
      
      // Show confirmation
      setConfirmationMessage("You're in. We'll notify you about this launch.");
      setTimeout(() => setConfirmationMessage(null), 3000);
    } catch (error: any) {
      alert(error.message || 'Failed to sign up for launch. Please try again.');
    }
  };

  const handleSignInSuccess = async () => {
    // After successful sign-in, complete pending signup if exists
    if (pendingLaunch) {
      try {
        await signupForLaunch({ 
          launchId: pendingLaunch.launchId, 
          productId: pendingLaunch.productId, 
          mode: 'account' 
        });
        setSignedUpLaunches(prev => new Set(prev).add(pendingLaunch.launchId));
        
        // Show confirmation
        setConfirmationMessage("You're in. We'll notify you about this launch.");
        setTimeout(() => setConfirmationMessage(null), 3000);
      } catch (error: any) {
        alert(error.message || 'Failed to sign up for launch. Please try again.');
      }
      setPendingLaunch(null);
    }
  };

  return (
    <>
      <PageLayout title="Launch Calendar">
        {/* Confirmation Message */}
        {confirmationMessage && (
          <div 
            data-testid="launch-signup-success"
            style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '1rem 1.5rem',
            background: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '8px',
            color: '#065f46',
            fontWeight: 500,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            animation: 'slideDown 0.3s ease-out',
          }}>
            ✅ {confirmationMessage}
          </div>
        )}

        <div style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Upcoming Launches
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Get notified about product launches. Sign up to receive launch reminders.
            </p>
          </div>

          {/* Launch List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} data-testid="launch-list">
            {mockLaunches.map((launch) => (
              <div
                key={launch.id}
                data-launch-id={launch.id}
                data-product-id={launch.productId}
                data-testid="launch-card"
                className="launch-card"
                style={{
                  padding: '1.5rem',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {launch.name}
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    {launch.description}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                    <span>
                      📅 <strong>Launch Date:</strong> {new Date(launch.launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span>
                      🏷️ <strong>Category:</strong> {launch.category}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleNotifyMe(launch.id, launch.productId)}
                  disabled={authLoading || signupLoading || signedUpLaunches.has(launch.id)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: signedUpLaunches.has(launch.id) ? '#d1fae5' : '#3b82f6',
                    color: signedUpLaunches.has(launch.id) ? '#065f46' : 'white',
                    border: signedUpLaunches.has(launch.id) ? '1px solid #6ee7b7' : 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: signedUpLaunches.has(launch.id) ? 'default' : 'pointer',
                    transition: 'background-color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => {
                    if (!signedUpLaunches.has(launch.id) && !authLoading && !signupLoading) {
                      e.currentTarget.style.background = '#2563eb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!signedUpLaunches.has(launch.id)) {
                      e.currentTarget.style.background = '#3b82f6';
                    }
                  }}
                >
                  {signedUpLaunches.has(launch.id) ? '✓ Signed Up' : 'NOTIFY ME'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '0.875rem', color: '#92400e' }}>
            <strong>📋 Note:</strong> Full calendar view with month/week/day views coming soon. 
            See Notion: Section 7 — Frontend & Launch Calendar
          </div>
        </div>
      </PageLayout>

      {/* Sign-In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => {
          setShowSignInModal(false);
          setPendingLaunch(null);
        }}
        onSuccess={handleSignInSuccess}
      />

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </>
  );
}

export default LaunchCalendarPage;
