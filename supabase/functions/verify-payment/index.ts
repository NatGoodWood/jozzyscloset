// Confirms a Paystack payment on the server, then marks the order as paid.
// Secrets needed: PAYSTACK_SECRET_KEY (you add it). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { reference } = await req.json()
    if (typeof reference !== 'string' || reference.length < 5 || reference.length > 64) return json({ error: 'Invalid reference' }, 400)
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!secret) return json({ error: 'Payments are not configured' }, 500)

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: order } = await db.from('orders').select('id,total,status').eq('reference', reference).maybeSingle()
    if (!order) return json({ error: 'Order not found' }, 404)
    if (order.status !== 'unpaid') return json({ status: order.status })

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } })
    const body = await res.json()
    const d = body?.data
    if (!body?.status || d?.status !== 'success') return json({ status: d?.status ?? 'failed' })
    if (d.currency !== 'GHS' || Number(d.amount) < Math.round(Number(order.total) * 100)) return json({ error: 'Payment amount does not match the order' }, 400)

    await db.from('orders').update({ status: 'confirmed', paid_at: new Date().toISOString(), paystack_channel: d.channel ?? null }).eq('id', order.id).eq('status', 'unpaid')
    return json({ status: 'confirmed' })
  } catch (_e) {
    return json({ error: 'Could not verify payment' }, 500)
  }
})
