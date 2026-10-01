import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, ghc } from '../supabase'
import { useStore } from '../store'

export default function Cart() {
  const { lines, setQty, clear, count, settings, user } = useStore()
  const min = settings?.min_order ?? 10, total = lines.reduce((a, l) => a + l.price * l.qty, 0), short = min - count
  const [f, setF] = useState({ name: '', phone: '', address: '', ref: '' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState('')
  const [t, setT] = useState({ ref: '', phone: '' }), [status, setStatus] = useState(null)
  useEffect(() => { const n = user?.user_metadata?.full_name; if (n) setF(x => ({ ...x, name: x.name || n })) }, [user])
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const ready = short <= 0 && f.name && f.phone && f.address && f.ref.trim().length > 2

  async function submit() {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('place_order', { p_name: f.name, p_phone: f.phone, p_address: f.address, p_reference: f.ref, p_lines: lines.map(l => ({ id: l.id, size: l.size, qty: l.qty })) })
    setBusy(false)
    if (error) return setErr(error.message)
    setDone(f.ref.trim()); clear()
  }
  async function track() { const { data } = await supabase.rpc('track_order', { p_reference: t.ref, p_phone: t.phone }); setStatus(data || 'none') }

  return (<main>
    <h1>Your cart</h1>
    {done && <div className="ok">Order received. We'll confirm reference <b>{done}</b> once your payment reaches us. You can track it below.</div>}
    {!lines.length && !done && <p>Your cart is empty. <Link to="/shop">Start shopping</Link></p>}
    {lines.length > 0 && <>
      <section className="box">
        {lines.map(l => <div className="row" key={l.key}>
          <span className="thumb">{l.image && <img src={l.image} alt="" />}<span>{l.name}<small>Size: {l.size} · {ghc(l.price)} each</small></span></span>
          <span className="qty"><button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Less">−</button><span>{l.qty}</span><button onClick={() => setQty(l.key, l.qty + 1)} aria-label="More">+</button></span>
        </div>)}
        <div className="row total"><span>{count} pieces</span><b>{ghc(total)}</b></div>
        <div className={'meter' + (short <= 0 ? ' full' : '')}><i style={{ width: Math.min(100, count / min * 100) + '%' }} /></div>
        <p className="sub">{short > 0 ? `Add ${short} more piece${short > 1 ? 's' : ''} to reach the ${min}-piece minimum.` : `Minimum of ${min} pieces reached. You can check out.`}</p>
        <Link to="/shop" className="btn ghost">Keep shopping</Link>
      </section>
      {short <= 0 && <section className="box">
        <h2>Payment details</h2>
        <p>Send <b>{ghc(total)}</b> to:</p>
        {settings && <dl><dt>Account name</dt><dd>{settings.account_name}</dd><dt>Method</dt><dd>{settings.method}</dd><dt>Number</dt><dd>{settings.account_number}</dd></dl>}
        <p>Then enter your details and the payment reference from your receipt or SMS.</p>
        <input placeholder="Full name" value={f.name} onChange={set('name')} autoComplete="name" />
        <input placeholder="Phone number" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
        <input placeholder="Delivery address" value={f.address} onChange={set('address')} autoComplete="street-address" />
        <input placeholder="Payment reference" value={f.ref} onChange={set('ref')} />
        {err && <p className="error">{err}</p>}
        <button className="btn black full" disabled={!ready || busy} onClick={submit}>{busy ? 'Sending…' : 'Send payment reference →'}</button>
        {!user && <p className="sub">Tip: <Link to="/account">create an account</Link> to see all your orders in one place.</p>}
      </section>}</>}
    <section className="box"><h2>Track an order</h2>
      <input placeholder="Payment reference" value={t.ref} onChange={e => setT({ ...t, ref: e.target.value })} />
      <input placeholder="Phone number used on the order" value={t.phone} onChange={e => setT({ ...t, phone: e.target.value })} />
      <button className="btn ghost" disabled={!t.ref || !t.phone} onClick={track}>Check status</button>
      {status && <p>{status === 'none' ? 'No order matches those details.' : <>Status: <span className={'tag ' + status}>{status}</span></>}</p>}
    </section>
    <p className="note">{settings?.delivery_note || 'Delivery within Sunyani is GH₵30 to GH₵50, depending on distance.'}</p>
  </main>)
}
