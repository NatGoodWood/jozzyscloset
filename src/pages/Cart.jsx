import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, ghc } from '../supabase'
import { useCart } from '../cart'

export default function Cart() {
  const { ids, toggle, clear } = useCart()
  const [items, setItems] = useState([]), [pay, setPay] = useState(null)
  const [f, setF] = useState({ name: '', phone: '', address: '', ref: '' })
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState('')
  const [t, setT] = useState({ ref: '', phone: '' }), [status, setStatus] = useState(null)

  useEffect(() => { supabase.from('settings').select('*').single().then(({ data }) => setPay(data)) }, [])
  useEffect(() => { if (ids.length) supabase.from('items').select('*').in('id', ids).then(({ data }) => setItems(data || [])) }, [ids])

  const mine = items.filter(i => ids.includes(i.id)), total = mine.reduce((a, i) => a + Number(i.price), 0)
  const ready = mine.length && f.name && f.phone && f.address && f.ref.trim().length > 2
  const set = k => e => setF({ ...f, [k]: e.target.value })

  async function submit() {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('place_order', { p_name: f.name, p_phone: f.phone, p_address: f.address, p_reference: f.ref, p_item_ids: ids })
    setBusy(false)
    if (error) return setErr(error.message)
    setDone(f.ref.trim()); clear()
  }
  async function track() {
    const { data } = await supabase.rpc('track_order', { p_reference: t.ref, p_phone: t.phone }); setStatus(data || 'none')
  }
  return (<main>
    <h1>Your cart</h1>
    {done && <div className="ok">Order received. We'll confirm reference <b>{done}</b> once your payment reaches us. Track it below.</div>}
    {!mine.length && !done && <p>Your cart is empty. <Link to="/">Choose some items</Link></p>}
    {mine.length > 0 && <>
      <section className="box">
        {mine.map(i => <div className="row" key={i.id}><span>{i.name}</span><span>{ghc(i.price)} <button className="link" onClick={() => toggle(i.id)}>Remove</button></span></div>)}
        <div className="row total"><span>Total</span><b>{ghc(total)}</b></div>
      </section>
      <section className="box pay">
        <h2>Payment details</h2>
        <p>Send <b>{ghc(total)}</b> to:</p>
        {pay && <dl><dt>Account name</dt><dd>{pay.account_name}</dd><dt>Method</dt><dd>{pay.method}</dd><dt>Number</dt><dd>{pay.account_number}</dd></dl>}
        <p>Then enter your details and the payment reference from your receipt or SMS.</p>
        <input placeholder="Full name" value={f.name} onChange={set('name')} autoComplete="name" />
        <input placeholder="Phone number" value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
        <input placeholder="Delivery address" value={f.address} onChange={set('address')} autoComplete="street-address" />
        <input placeholder="Payment reference" value={f.ref} onChange={set('ref')} />
        {err && <p className="error">{err}</p>}
        <button className="btn full" disabled={!ready || busy} onClick={submit}>{busy ? 'Sending…' : 'Send payment reference'}</button>
      </section></>}
    <section className="box">
      <h2>Track an order</h2>
      <input placeholder="Payment reference" value={t.ref} onChange={e => setT({ ...t, ref: e.target.value })} />
      <input placeholder="Phone number used on the order" value={t.phone} onChange={e => setT({ ...t, phone: e.target.value })} />
      <button className="btn light" disabled={!t.ref || !t.phone} onClick={track}>Check status</button>
      {status && <p>{status === 'none' ? 'No order matches those details.' : <>Status: <span className={'tag ' + status}>{status}</span></>}</p>}
    </section>
    <p className="note">{pay?.delivery_note || 'Delivery within Sunyani is GH₵30 to GH₵50, depending on distance.'}</p>
  </main>)
}
