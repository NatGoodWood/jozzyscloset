import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, ghc } from '../supabase'
import { loadPaystack } from '../paystack'
import { useStore } from '../store'

export default function Cart() {
  const { lines, setQty, clear, count, settings, user } = useStore()
  const [fresh, setFresh] = useState({})
  const price = l => Number(fresh[l.id]?.price ?? l.price)
  const min = settings?.min_order ?? 10, total = lines.reduce((a, l) => a + price(l) * l.qty, 0), short = min - count
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(null)
  const [t, setT] = useState({ ref: '', phone: '' }), [status, setStatus] = useState(null)
  const settled = useRef(false)
  useEffect(() => { const ids = [...new Set(lines.map(l => l.id))]; if (!ids.length) return; supabase.from('items').select('id,price').in('id', ids).then(({ data }) => setFresh(Object.fromEntries((data || []).map(i => [i.id, i])))) }, [lines.length])
  useEffect(() => { if (user) setF(x => ({ ...x, name: x.name || user.user_metadata?.full_name || '', email: x.email || user.email || '' })) }, [user])
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const validEmail = /^\S+@\S+\.\S+$/.test(f.email.trim())
  const ready = short <= 0 && f.name.trim() && validEmail && f.phone.trim().length >= 7 && f.address.trim()

  async function confirmPay(ref) {
    settled.current = true; setErr(''); setBusy(true)
    let ok = false
    try { const { data, error } = await supabase.functions.invoke('verify-payment', { body: { reference: ref } }); ok = !error && data?.status === 'confirmed' } catch { ok = false }
    setBusy(false); setDone({ ref, confirmed: ok }); clear()
  }
  async function pay() {
    setBusy(true); setErr(''); settled.current = false
    const { data, error } = await supabase.rpc('start_checkout', { p_name: f.name, p_email: f.email, p_phone: f.phone, p_address: f.address, p_lines: lines.map(l => ({ id: l.id, size: l.size, qty: l.qty })) })
    if (error) { setBusy(false); return setErr(error.message) }
    const ref = data.reference
    let init
    try { init = await supabase.functions.invoke('init-payment', { body: { reference: ref } }) } catch { init = { error: true } }
    if (init.error || init.data?.error || !init.data?.access_code) { setBusy(false); return setErr(init.data?.error || 'The payment service could not be reached. Please try again in a moment.') }
    try { await loadPaystack() } catch { setBusy(false); return setErr('Could not load the payment window. Check your internet and try again.') }
    try {
      new window.PaystackPop().resumeTransaction(init.data.access_code, {
        onSuccess: tx => confirmPay(tx?.reference || ref),
        onCancel: () => { if (!settled.current) { setBusy(false); setErr('The payment window was closed. If you already paid, do not pay again: check "Track an order" below in a minute.') } },
        onError: e => { setBusy(false); setErr(e?.message || 'The payment could not be started.') },
      })
    } catch { setBusy(false); setErr('The payment window could not open. Please try again.') }
  }
  async function track() { const { data } = await supabase.rpc('track_order', { p_reference: t.ref, p_phone: t.phone }); setStatus(data || 'none') }

  return (<main>
    <h1>Your cart</h1>
    {done?.confirmed && <div className="ok">Payment received. Your order <b>{done.ref}</b> is confirmed. We will message you about delivery.</div>}
    {done && !done.confirmed && <div className="ok">We received your payment for order <b>{done.ref}</b> and are confirming it. Please do not pay again. Check the status below in a minute.</div>}
    {!lines.length && !done && <p>Your cart is empty. <Link to="/shop">Start shopping</Link></p>}
    {lines.length > 0 && <>
      <section className="box">
        {lines.map(l => <div className="row" key={l.key}>
          <span className="thumb">{l.image && <img src={l.image} alt="" />}<span>{l.name}<small>Single piece · Size: {l.size} · {ghc(price(l))} each</small></span></span>
          <span className="qty"><button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Less">−</button><span>{l.qty}</span><button onClick={() => setQty(l.key, l.qty + 1)} aria-label="More">+</button></span>
        </div>)}
        <div className="row total"><span>{count} pieces</span><b>{ghc(total)}</b></div>
        <div className={'meter' + (short <= 0 ? ' full' : '')}><i style={{ width: Math.min(100, count / min * 100) + '%' }} /></div>
        <p className="sub">{short > 0 ? `Add ${short} more piece${short > 1 ? 's' : ''} to reach the ${min}-piece minimum.` : `Minimum of ${min} pieces reached. You can check out.`}</p>
        <Link to="/shop" className="btn ghost">Keep shopping</Link>
      </section>
      {short <= 0 && <section className="box">
        <h2>Pay securely</h2>
        <p>Total to pay: <b>{ghc(total)}</b>. Pay with Mobile Money or card. Your order is confirmed automatically once the payment goes through.</p>
        <input placeholder="Full name" value={f.name} onChange={set('name')} autoComplete="name" />
        <input type="email" placeholder="Email (for your payment receipt)" value={f.email} onChange={set('email')} autoComplete="email" />
        <input placeholder="Phone number" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
        <input placeholder="Delivery address" value={f.address} onChange={set('address')} autoComplete="street-address" />
        {err && <p className="error">{err}</p>}
        <button className="btn black full" disabled={!ready || busy} onClick={pay}>{busy ? 'Please wait…' : `Pay ${ghc(total)} with Paystack →`}</button>
        <p className="sub">Delivery is paid separately. See the note below.{!user && <> Tip: <Link to="/account">create an account</Link> to see all your orders in one place.</>}</p>
      </section>}</>}
    <section className="box"><h2>Track an order</h2>
      <input placeholder="Order reference (starts with JC)" value={t.ref} onChange={e => setT({ ...t, ref: e.target.value })} />
      <input placeholder="Phone number used on the order" value={t.phone} onChange={e => setT({ ...t, phone: e.target.value })} />
      <button className="btn ghost" disabled={!t.ref || !t.phone} onClick={track}>Check status</button>
      {status && <p>{status === 'none' ? 'No order matches those details.' : <>Status: <span className={'tag ' + status}>{status === 'unpaid' ? 'awaiting payment' : status}</span></>}</p>}
    </section>
    <p className="note">{settings?.delivery_note || 'Delivery within Sunyani is GH₵30 to GH₵50, depending on distance.'}</p>
  </main>)
}
