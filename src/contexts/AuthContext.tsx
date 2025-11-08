import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, provider, db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

type Role = 'admin' | 'specialist';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
  missingAdminRole: boolean;
  setAdminRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role is loaded from Firestore: /users/{uid} -> { role: 'admin' | 'specialist' }
// Live subscription via onSnapshot
// If missing, default to 'specialist' (but don't override existing roles)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingAdminRole, setMissingAdminRole] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const email = (firebaseUser.email || '').toLowerCase();
          const userRef = doc(db, 'users', firebaseUser.uid);

          // One-time seed rules based on email domain and Theo admin override
          try {
            const snap = await getDoc(userRef);
            const isTheo = email === 'theo@shiekhshoes.org';
            const isShiekhDomain = email.endsWith('@shiekhshoes.org');

            if (!snap.exists()) {
              if (isTheo) {
                await setDoc(userRef, {
                  email,
                  displayName: firebaseUser.displayName || '',
                  role: 'admin',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }, { merge: true });
              } else if (isShiekhDomain) {
                await setDoc(userRef, {
                  email,
                  displayName: firebaseUser.displayName || '',
                  role: 'specialist',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }, { merge: true });
              }
            } else {
              const data = snap.data() as { role?: Role };
              if (isTheo && data.role !== 'admin') {
                await setDoc(userRef, {
                  role: 'admin',
                  updatedAt: new Date().toISOString(),
                }, { merge: true });
              }
            }
          } catch (seedErr) {
            console.warn('[auth] Seeding user document failed or skipped:', seedErr);
          }
          
          // Subscribe to role changes via onSnapshot
          const unsubscribeRole = onSnapshot(
            userRef,
            async (snap) => {
              const data = snap.exists() ? (snap.data() as { role?: Role }) : {};
              const newRole = (data.role as Role) || 'specialist';
              
              // Check if this is an admin email without a role set
              const adminEmails = import.meta.env.VITE_ADMIN_EMAILS?.split(',').map((e: string) => e.trim().toLowerCase()) || [];
              const isAdminEmail = adminEmails.includes((firebaseUser.email || '').toLowerCase());
              
              if (!snap.exists() || !data.role) {
                if (isAdminEmail) {
                  // Admin email but no role in Firestore - show banner
                  setMissingAdminRole(true);
                  setRole('specialist'); // Temporary fallback
                } else {
                  // Regular user without role - default to specialist
                  setRole('specialist');
                  setMissingAdminRole(false);
                }
              } else {
                // Role exists in Firestore
                setRole(newRole);
                setMissingAdminRole(false);
                
                // If role changed, refresh ID token for server alignment
                if (role && role !== newRole) {
                  console.log('[auth] Role changed, refreshing ID token');
                  await firebaseUser.getIdToken(true);
                }
              }
            },
            (error) => {
              console.error('[auth] Failed to subscribe to role:', error);
              setRole('specialist');
              setMissingAdminRole(false);
            }
          );
          
          // Return cleanup function for role subscription
          return () => {
            unsubscribeRole();
          };
        } else {
          setUser(null);
          setRole(null);
          setMissingAdminRole(false);
        }
      } catch (e) {
        console.error('[auth] Failed to load role:', e);
        setUser(firebaseUser || null);
        setRole('specialist');
        setMissingAdminRole(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [role]); // Include role in deps to detect changes

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to sign in. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setRole(null);
      setMissingAdminRole(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshRole = async () => {
    if (!user) return;
    try {
      console.log('[auth] Manually refreshing ID token');
      await user.getIdToken(true);
    } catch (error) {
      console.error('[auth] Failed to refresh ID token:', error);
    }
  };

  const setAdminRole = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        role: 'admin', 
        email: user.email,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      setMissingAdminRole(false);
      console.log('[auth] Admin role set successfully');
    } catch (error) {
      console.error('[auth] Failed to set admin role:', error);
      alert('Failed to set admin role. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, role, login, logout, refreshRole, missingAdminRole, setAdminRole }}>
      {missingAdminRole && user && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-yellow-800">
                Admin role not found for {user.email}
              </span>
            </div>
            <button
              onClick={setAdminRole}
              className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition-colors"
            >
              Set Admin Role Now
            </button>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
