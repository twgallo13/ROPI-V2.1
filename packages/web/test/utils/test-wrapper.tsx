import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Test wrapper that provides MemoryRouter context.
 * Auth mocking should be done via vi.mock() in individual test files.
 */
export function renderWithProviders(ui: React.ReactElement, { auth = {}, ...options }: any = {}) {
  // Note: auth parameter is accepted for backwards compatibility but not used.
  // Auth should be mocked at the test file level using vi.mock('@/contexts/AuthProvider')
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>,
    options
  );
}
