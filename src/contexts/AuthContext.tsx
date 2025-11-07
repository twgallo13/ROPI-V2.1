import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, provider, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

type Role = 'admin' | 'specialist';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role is loaded from Firestore: /users/{uid} -> { role: 'admin' | 'specialist' }
// If missing, default to 'specialist'.

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Load role from Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          const data = snap.exists() ? (snap.data() as { role?: Role }) : {};
          setRole((data.role as Role) ?? 'specialist');
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (e) {
        console.error('[auth] failed to load role', e);
        setUser(firebaseUser || null);
        setRole('specialist');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, role, login, logout }}>
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
