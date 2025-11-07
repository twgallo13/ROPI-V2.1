import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, provider } from '../firebase';

type Role = 'admin' | 'specialist';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_DOMAIN = '@shiekhshoes.org';

// Determine role based on email (you can adjust this logic)
const determineRole = (email: string | null): Role => {
  // For now, all @shiekhshoes.org users are admins
  // You can add more sophisticated logic here
  return 'admin';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        
        // Check if email ends with allowed domain
        if (email.endsWith(ALLOWED_DOMAIN)) {
          setUser(firebaseUser);
          setRole(determineRole(email));
        } else {
          // Sign out user if not from allowed domain
          await firebaseSignOut(auth);
          setUser(null);
          setRole(null);
          alert(`Access restricted to ${ALLOWED_DOMAIN} emails only.`);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || '';
      
      // Double-check domain after sign-in
      if (!email.endsWith(ALLOWED_DOMAIN)) {
        await firebaseSignOut(auth);
        setUser(null);
        setRole(null);
        alert(`Access restricted to ${ALLOWED_DOMAIN} emails only.`);
      }
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
