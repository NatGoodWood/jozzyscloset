// Backup: Paystack calls this itself when a payment succeeds, so orders are confirmed even if the customer closes the page.
import { createClient } from 'npm:@supabase/supabase-js@2'

async function hmacHex(body: string, key: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const raw = await req.text()
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!secret) return new Response('not configured', { status: 500 })
  if ((await hmacHex(raw, secret)) !== (req.headers.get('x-paystack-signature') ?? '')) return new Response('bad signature', { status: 401 })
  try {
    const evt = JSON.parse(raw)
    if (evt.event === 'charge.success') {
      const d = evt.data
      const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: order } = await db.from('orders').select('id,total,status').eq('reference', d.reference).maybeSingle()
      if (order && order.status === 'unpaid' && d.currency === 'GHS' && Number(d.amount) >= Math.round(Number(order.total) * 100)) {
        await db.from('orders').update({ status: 'confirmed', paid_at: new Date().toISOString(), paystack_channel: d.channel ?? null }).eq('id', order.id).eq('status', 'unpaid')
      }
    }
  } catch (_e) { /* always answer 200 so Paystack does not retry forever */ }
  return new Response('ok', { status: 200 })
})
