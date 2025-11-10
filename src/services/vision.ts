/**
 * Vision service for analyzing product images using AI
 */

export async function analyzeImage(url: string): Promise<string[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // Longer timeout for vision

  const tryFetch = async (endpoint: string) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: url }),
      signal: controller.signal
    });
    clearTimeout(id);
    
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      throw new Error(`Vision API failed: ${res.status}`);
    }
    
    const data = await res.json() as { observations?: string[] };
    return data.observations || [];
  };

  // Primary via Hosting rewrite, fallback to CF URL
  try {
    return await tryFetch('/api/vision');
  } catch {
    return await tryFetch('https://us-central1-ropi-bccee.cloudfunctions.net/apiVision');
  }
}
