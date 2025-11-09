export async function describeProduct(payload: {
  productId: string;
  channel: string;
  tone: string;
  length: string;
}) {
  const timeout = 10000; // 10 seconds
  const retryDelay = 500; // 500ms before retry
  const cloudFunctionUrl = 'https://us-central1-ropi-bccee.cloudfunctions.net/apiDescribe';

  // Helper to attempt fetch with timeout
  const attemptFetch = async (url: string): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Helper to validate response
  const validateResponse = (response: Response): boolean => {
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.includes('application/json');
  };

  try {
    // First attempt: local API route
    console.log('[describe] Attempting local API route...');
    const response = await attemptFetch('/api/describe');
    
    if (validateResponse(response)) {
      return await response.json();
    }
    
    // First attempt failed - retry with Cloud Function URL
    console.warn('[describe] Local API failed, retrying with Cloud Function URL...');
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    const retryResponse = await attemptFetch(cloudFunctionUrl);
    
    if (validateResponse(retryResponse)) {
      return await retryResponse.json();
    }
    
    throw new Error(`Server returned ${retryResponse.status}: ${retryResponse.statusText}`);
    
  } catch (error: any) {
    console.error('[describe] All attempts failed:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw new Error(
      error.message || 'Failed to generate description. Please check your connection and try again.'
    );
  }
}
