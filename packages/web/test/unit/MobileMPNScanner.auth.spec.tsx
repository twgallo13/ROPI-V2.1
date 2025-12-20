import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Mock ZXing reader to avoid real camera/stream operations in tests
vi.mock('@zxing/library', () => {
  return {
    BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
      decodeFromVideoDevice: vi.fn(),
      reset: vi.fn(),
    })),
  };
});

vi.mock('../../src/hooks/useAuth', () => {
  const fakeUser = {
    getIdToken: vi.fn(async () => 'test-id-token'),
  };
  return {
    useAuth: () => ({ currentUser: fakeUser }),
  };
});

// Mock fetch
const fetchMock = vi.fn(async (url: string, init?: any) => {
  // Return a 200 with a minimal product payload
  return {
    ok: true,
    status: 200,
    json: async () => ({ id: 'p1', product_mpn: '123', title: 'Test' }),
  } as any;
});

vi.stubGlobal('fetch', fetchMock);

import MobileMPNScanner from '../../src/components/observations/MobileMPNScanner';

describe('MobileMPNScanner — Authorization header', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    // Mock camera API to avoid getUserMedia errors in jsdom
    const nav: any = global.navigator || {};
    nav.mediaDevices = nav.mediaDevices || {};
    nav.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] });
    (global as any).navigator = nav;
  });

  it('includes Authorization header when currentUser is present', async () => {
    const user = userEvent.setup();
    const onProductFound = vi.fn();
    const onClose = vi.fn();

    render(
      <MobileMPNScanner onProductFound={onProductFound} onClose={onClose} />
    );

    // Switch to manual mode first
    const manualTab = screen.getByRole('button', { name: /manual/i });
    await user.click(manualTab);

    // Enter MPN and submit
    const input = screen.getByRole('textbox');
    await user.type(input, '123');
    const submit = screen.getByRole('button', { name: /find product/i });
    await user.click(submit);

    // Verify fetch called with Authorization header
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/api/products/by-mpn/123');
    const init = call[1];
    expect(init.headers).toBeDefined();
    expect(init.headers.Authorization).toMatch(/^Bearer\s+test-id-token$/);
  });
});
