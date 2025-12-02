/**
 * Mock User Context for ROPI AOSS
 * 
 * Provides a mock user for development until Firebase Auth is fully integrated.
 * 
 * TODO: Replace with actual Firebase Auth integration
 * TODO: Implement proper user authentication flow
 * TODO: Add user role/permission management
 */

import { createContext, useContext, ReactNode } from 'react';
import { ObservationCreator } from '../types/observation';

interface UserContextType {
  user: ObservationCreator;
  isAuthenticated: boolean;
}

const mockUser: ObservationCreator = {
  uid: 'mock_user_001',
  name: 'Demo User',
};

const UserContext = createContext<UserContextType>({
  user: mockUser,
  isAuthenticated: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  return (
    <UserContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
