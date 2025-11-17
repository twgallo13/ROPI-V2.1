import React, { createContext, useContext, useState, ReactNode } from 'react';

type ValidationContextType = {
  validatedCount: number;
  setValidatedCount: (n: number) => void;
};

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const ValidationProvider = ({ children }: { children: ReactNode }) => {
  const [validatedCount, setValidatedCount] = useState<number>(0);
  return (
    <ValidationContext.Provider value={{ validatedCount, setValidatedCount }}>
      {children}
    </ValidationContext.Provider>
  );
};

export const useValidation = (): ValidationContextType => {
  const ctx = useContext(ValidationContext);
  if (!ctx) {
    throw new Error('useValidation must be used within ValidationProvider');
  }
  return ctx;
};
