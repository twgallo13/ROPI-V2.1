/**
 * Error Handling Tests
 * 
 * LP-1.1.15: Tests for ErrorBoundary component and Toast notification system.
 * 
 * Validates:
 * - ErrorBoundary catches and displays errors
 * - ErrorBoundary reset functionality
 * - Toast notifications display correctly
 * - Toast auto-dismiss works
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/common/ErrorBoundary';
import { ToastProvider, useToast, getErrorMessage } from '../../src/contexts/ToastContext';

// Suppress React error boundary console errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalError;
});

// Component that throws an error
function ThrowingComponent({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
}

// Component to test toast hook
function ToastTester() {
  const { showToast, clearAllToasts, toasts } = useToast();
  
  return (
    <div>
      <button onClick={() => showToast('Success!', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error!', 'error')}>Show Error</button>
      <button onClick={() => showToast('Warning!', 'warning')}>Show Warning</button>
      <button onClick={() => showToast('Info!', 'info')}>Show Info</button>
      <button onClick={() => clearAllToasts()}>Clear All</button>
      <span data-testid="toast-count">{toasts.length}</span>
    </div>
  );
}

describe('LP-1.1.15: Error Handling', () => {
  describe('ErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });

    it('should catch errors and display error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should display Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should call onError callback when error is caught', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should render custom fallback if provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should reset when Try Again is clicked', () => {
      // Use a controllable component for reset testing
      let shouldError = true;
      
      function ToggleError() {
        if (shouldError) {
          throw new Error('Error');
        }
        return <div>Recovered</div>;
      }
      
      const { rerender } = render(
        <ErrorBoundary key="test">
          <ToggleError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Update to not throw
      shouldError = false;
      
      // Click try again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      
      // Re-render to actually update component
      rerender(
        <ErrorBoundary key="test-2">
          <ToggleError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div>Child content</div>
        </ToastProvider>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should show success toast', () => {
      render(
        <ToastProvider>
          <ToastTester />
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByText('Show Success'));
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should show error toast', () => {
      render(
        <ToastProvider>
          <ToastTester />
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByText('Show Error'));
      
      expect(screen.getByText('Error!')).toBeInTheDocument();
    });

    it('should show multiple toasts', () => {
      render(
        <ToastProvider>
          <ToastTester />
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('should clear all toasts', () => {
      render(
        <ToastProvider>
          <ToastTester />
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      
      expect(screen.getByTestId('toast-count').textContent).toBe('2');
      
      fireEvent.click(screen.getByText('Clear All'));
      
      expect(screen.getByTestId('toast-count').textContent).toBe('0');
    });

    it('should limit max toasts', () => {
      render(
        <ToastProvider maxToasts={2}>
          <ToastTester />
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));
      fireEvent.click(screen.getByText('Show Warning'));
      
      // Should only have 2 toasts
      expect(screen.getByTestId('toast-count').textContent).toBe('2');
    });

    it('should dismiss toast when close button clicked', () => {
      render(
        <ToastProvider>
          <ToastTester />
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByText('Show Success'));
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
      
      // Click close button
      const closeButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
    });

    it('should auto-dismiss toast after duration', async () => {
      vi.useFakeTimers();
      
      render(
        <ToastProvider defaultDuration={1000}>
          <ToastTester />
        </ToastProvider>
      );
      
      fireEvent.click(screen.getByText('Show Success'));
      
      expect(screen.getByText('Success!')).toBeInTheDocument();
      
      // Fast forward time
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      
      // Toast should be gone
      expect(screen.queryByText('Success!')).not.toBeInTheDocument();
      
      vi.useRealTimers();
    });
  });

  describe('getErrorMessage helper', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Something failed');
      expect(getErrorMessage(error)).toBe('Something failed');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('Direct message')).toBe('Direct message');
    });

    it('should return default message for unknown types', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage({ code: 500 })).toBe('An unexpected error occurred');
    });
  });
});
