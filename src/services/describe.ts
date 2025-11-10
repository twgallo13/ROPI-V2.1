export async function describeProduct(payload: {
  productId: string;
  channel: string;        // RetailOps | Shopify | PDP
  tone: string;           // Clean | Hype | Technical
  length: string;         // Short | Medium | Long
  facts?: any;            // product facts doc (observations, materials, ...)
  aiContext?: any;        // keywords, featureBullets, designNotes
  attributes?: any;       // brand, category, gender, ageGroup, price, etc.
  imageUrl?: string;      // optional primary image URL
}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);

  const tryFetch = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(id);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      throw new Error(`Describe failed: ${res.status}`);
    }
    return res.json() as Promise<{ 
      text: string; 
      title?: string; 
      bullets?: string[]; 
      seoTitle?: string; 
      metaDescription?: string; 
      keywords?: string[] 
    }>;
  };

  // Primary via Hosting rewrite, fallback to CF URL
  try {
    return await tryFetch('/api/describe');
  } catch {
    return await tryFetch('https://us-central1-ropi-bccee.cloudfunctions.net/apiDescribe');
  }
}
