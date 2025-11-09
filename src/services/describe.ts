export async function describeProduct(payload: {
  productId: string;
  channel: string;
  tone: string;
  length: string;
}) {
  const res = await fetch('/api/describe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Describe failed: ${res.status}`);
  return res.json(); // expect { text: string }
}
