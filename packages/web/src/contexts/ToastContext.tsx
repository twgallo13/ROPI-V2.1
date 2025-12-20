/**
 * Toast Notification Context
 * 
 * LP-1.1.15: Central toast notification system for showing
 * success, error, warning, and info messages to users.
 * 
 * Usage:
 * ```tsx
 * import { useToast } from '@/contexts/ToastContext';
 * 
 * function MyComponent() {
 *   const { showToast } = useToast();
 *   
 *   const handleSave = () => {
 *     try {
 *       // save logic
 *       showToast('Saved successfully!', 'success');
 *     } catch (err) {
 *       showToast('Failed to save', 'error');
 *     }
 *   };
 * }
 * ```
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import './Toast.css';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast item interface
export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

// Toast context interface
interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Default context value
const ToastContext = createContext<ToastContextValue | null>(null);

// Generate unique ID
function generateId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Toast icon mapping
const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
  /** Default duration in milliseconds */
  defaultDuration?: number;
}

/**
 * Toast Provider component
 */
export function ToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 4000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = defaultDuration) => {
      const id = generateId();
      const toast: ToastItem = { id, message, type, duration };

      setToasts((prev) => {
        // Limit max toasts
        const newToasts = [...prev, toast];
        if (newToasts.length > maxToasts) {
          return newToasts.slice(-maxToasts);
        }
        return newToasts;
      });

      // Auto-hide after duration
      if (duration > 0) {
        setTimeout(() => hideToast(id), duration);
      }
    },
    [defaultDuration, maxToasts, hideToast]
  );

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

/**
 * Toast Container component - renders all active toasts
 */
function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
          aria-live="polite"
        >
          <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-close"
            onClick={() => onClose(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Hook to use toast notifications
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Helper function to show error toast from catch block
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export default ToastProvider;
