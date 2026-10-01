import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, ghc, uploadImage, CATEGORIES } from '../supabase'

export default function Admin() {
  const [state, setState] = useState('loading'), [tab, setTab] = useState('orders')
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return setState('out')
      const { data } = await supabase.from('admins').select('user_id').maybeSingle()
      setState(data ? 'in' : 'denied')
    })
  }, [])
  if (state === 'loading') return <main>Loading…</main>
  if (state === 'out') return <Navigate to="/admin/login" replace />
  if (state === 'denied') return <main><h1>No access</h1><p>This account is not an admin.</p><SignOut /></main>
  return (<main>
    <div className="between"><h1>Admin</h1><SignOut /></div>
    <div className="tabs">{['orders', 'items', 'settings'].map(t => <button key={t} className={'btn cap ' + (tab === t ? 'black' : 'ghost')} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'orders' ? <Orders /> : tab === 'items' ? <Items /> : <Settings />}
  </main>)
}
const SignOut = () => <button className="btn ghost" onClick={async () => { await supabase.auth.signOut(); location.href = '/' }}>Sign out</button>

function Orders() {
  const [rows, setRows] = useState([]), [filter, setFilter] = useState('pending')
  const load = useCallback(() => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])), [])
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i) }, [load])
  const setStatus = async (id, status) => { await supabase.from('orders').update({ status }).eq('id', id); load() }
  const shown = rows.filter(r => filter === 'all' || r.status === filter)
  return (<>
    <div className="tabs">{['pending', 'confirmed', 'rejected', 'all'].map(s => <button key={s} className={'btn cap ' + (filter === s ? 'blush' : 'ghost')} onClick={() => setFilter(s)}>{s}</button>)}<button className="link" onClick={load}>Refresh</button></div>
    {!shown.length && <p>No {filter === 'all' ? '' : filter} orders.</p>}
    {shown.map(o => <div className="box" key={o.id}>
      <div className="between"><b>{o.customer_name}</b><span className={'tag ' + o.status}>{o.status}</span></div>
      <p>{o.phone} · {o.address}</p>
      <p>{o.items.map(i => `${i.name} (${i.size}) × ${i.qty}`).join(', ')}<br /><b>{o.pieces} pieces · {ghc(o.total)}</b> · {new Date(o.created_at).toLocaleString()}</p>
      <p>Reference: <b className="ref">{o.reference}</b></p>
      <div className="tabs"><button className="btn black" disabled={o.status === 'confirmed'} onClick={() => setStatus(o.id, 'confirmed')}>Confirm payment</button>
        <button className="btn ghost" disabled={o.status === 'rejected'} onClick={() => setStatus(o.id, 'rejected')}>Reject</button></div>
    </div>)}</>)
}

function Items() {
  const blank = { name: '', price: '', category: CATEGORIES[0], sizes: 'S, M, L, XL', description: '' }
  const [rows, setRows] = useState([]), [f, setF] = useState(blank), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const load = () => supabase.from('items').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data || []))
  useEffect(() => { load() }, [])
  const set = k => e => setF({ ...f, [k]: e.target.value })
  async function add() {
    setBusy(true); setErr('')
    try {
      const img = file ? await uploadImage(file) : { url: null, path: null }
      const { error } = await supabase.from('items').insert({ name: f.name.trim(), price: Number(f.price), category: f.category, description: f.description.trim(),
        sizes: f.sizes.split(',').map(s => s.trim()).filter(Boolean), image_url: img.url, image_path: img.path })
      if (error) throw error
      setF(blank); setFile(null); e_reset(); load()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const e_reset = () => document.querySelectorAll('input[type=file]').forEach(i => (i.value = ''))
  async function del(i) {
    if (!confirm(`Delete "${i.name}"? Past orders keep their own copy.`)) return
    await supabase.from('items').delete().eq('id', i.id)
    if (i.image_path) await supabase.storage.from('item-images').remove([i.image_path])
    load()
  }
  const stock = async i => { await supabase.from('items').update({ in_stock: !i.in_stock }).eq('id', i.id); load() }
  return (<>
    <section className="box"><h2>Add an item</h2>
      <input placeholder="Item name" value={f.name} onChange={set('name')} />
      <input placeholder="Price per piece in GH₵" type="number" min="0" step="0.01" value={f.price} onChange={set('price')} />
      <select value={f.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
      <input placeholder="Sizes, separated by commas (leave empty for one size)" value={f.sizes} onChange={set('sizes')} />
      <input placeholder="Short description (optional)" value={f.description} onChange={set('description')} />
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
      {err && <p className="error">{err}</p>}
      <button className="btn black" disabled={!f.name.trim() || f.price === '' || busy} onClick={add}>{busy ? 'Uploading…' : 'Add item'}</button></section>
    <section className="box"><h2>Items ({rows.length})</h2>
      {rows.map(i => <div className="row" key={i.id}><span className="thumb">{i.image_url && <img src={i.image_url} alt="" />}<span>{i.name}<small>{i.category} · {ghc(i.price)}</small></span></span>
        <span className="tabs"><button className="btn ghost" onClick={() => stock(i)}>{i.in_stock ? 'In stock' : 'Out of stock'}</button><button className="btn ghost" onClick={() => del(i)}>Delete</button></span></div>)}</section></>)
}

function Settings() {
  const [s, setS] = useState(null), [saved, setSaved] = useState(false), [err, setErr] = useState('')
  useEffect(() => { supabase.from('settings').select('*').single().then(({ data }) => setS(data)) }, [])
  if (!s) return <p>Loading…</p>
  const fields = [['account_name', 'Account name'], ['method', 'Payment method or bank'], ['account_number', 'Payment number'], ['delivery_note', 'Delivery note'], ['min_order', 'Minimum pieces per order'],
    ['phone', 'Phone'], ['whatsapp', 'WhatsApp number (with country code, e.g. 233240000000)'], ['email', 'Email'], ['about', 'About us text']]
  const ch = (k, v) => { setSaved(false); setS({ ...s, [k]: v }) }
  async function banner(file) { try { const img = await uploadImage(file, 'hero-'); ch('hero_url', img.url) } catch (e) { setErr(e.message) } }
  async function save() { setErr(''); const { error } = await supabase.from('settings').update({ ...s, min_order: Number(s.min_order) || 10 }).eq('id', 1); error ? setErr(error.message) : setSaved(true) }
  return (<section className="box"><h2>Shop settings</h2>
    {fields.map(([k, l]) => <label key={k}>{l}<input value={s[k] ?? ''} onChange={e => ch(k, e.target.value)} /></label>)}
    <label>Homepage banner photo<input type="file" accept="image/*" onChange={e => e.target.files[0] && banner(e.target.files[0])} /></label>
    {s.hero_url && <img src={s.hero_url} alt="" width="160" />}
    {err && <p className="error">{err}</p>}
    <div className="tabs"><button className="btn black" onClick={save}>Save changes</button>{saved && <span>Saved</span>}</div></section>)
}
