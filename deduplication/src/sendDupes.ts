import { requireArg } from './utils/args';

async function main() {
  const mode = process.argv[2] || 'payload'; // 'payload' | 'id'
  const SOURCE_URL = requireArg('--url');

  const basePayload = {
    type: 'demo.product.updated',
    data: { sku: 'SKU-123', price: 199, stock: 50 }
  };

  const sharedId = 'evt_demo_fixed_id';
  const payloadA = mode === 'id'
    ? { ...basePayload, event_id: sharedId }
    : { ...basePayload, event_id: `evt_${Date.now()}`, marker: 'A' };

  const payloadB = mode === 'id'
    ? { ...basePayload, event_id: sharedId }
    : { ...basePayload, event_id: `evt_${Date.now()}`, marker: 'A' }; // identical payload

  console.log(`sending duplicates in mode=${mode}`);
  await post(payloadA);
  await post(payloadB);

  async function post(body: any) {
    const res = await fetch(SOURCE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) console.error('non-2xx from source:', res.status, await res.text());
  }
}

main().catch(console.error);