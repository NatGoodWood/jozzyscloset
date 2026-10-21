// Starts a Paystack payment from the server, so the amount cannot be changed in the browser
// and any Paystack error message is passed back to the customer's screen.
// Secret needed: PAYSTACK_SECRET_KEY. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
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
    if (typeof reference !== 'string' || reference.length < 5 || reference.length > 64) return json({ error: 'Invalid reference.' })
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!secret) return json({ error: 'Payments are not configured yet (missing PAYSTACK_SECRET_KEY secret).' })

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: o } = await db.from('orders').select('total,email,customer_name,phone,status').eq('reference', reference).maybeSingle()
    if (!o) return json({ error: 'Order not found.' })
    if (o.status !== 'unpaid') return json({ error: `This order is already ${o.status}.` })

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: o.email, amount: Math.round(Number(o.total) * 100), currency: 'GHS', reference, metadata: { customer: o.customer_name, phone: o.phone } }),
    })
    const body = await res.json().catch(() => null)
    if (!body?.status || !body?.data?.access_code) return json({ error: 'Paystack says: ' + (body?.message || 'the payment request was rejected.') })
    return json({ access_code: body.data.access_code })
  } catch (_e) {
    return json({ error: 'Could not start the payment. Please try again.' })
  }
})
