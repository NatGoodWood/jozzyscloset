import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, ghc, shrink } from '../supabase'

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
    <div className="tabs">{['orders', 'items', 'payment'].map(t => <button key={t} className={tab === t ? 'btn' : 'btn light'} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'orders' ? <Orders /> : tab === 'items' ? <Items /> : <Payment />}
  </main>)
}
const SignOut = () => <button className="btn light" onClick={async () => { await supabase.auth.signOut(); location.href = '/' }}>Sign out</button>

function Orders() {
  const [rows, setRows] = useState([]), [filter, setFilter] = useState('pending')
  const load = useCallback(() => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])), [])
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i) }, [load])
  const setStatus = async (id, status) => { await supabase.from('orders').update({ status }).eq('id', id); load() }
  const shown = rows.filter(r => filter === 'all' || r.status === filter)
  return (<>
    <div className="tabs">{['pending', 'confirmed', 'rejected', 'all'].map(s => <button key={s} className={filter === s ? 'btn' : 'btn light'} onClick={() => setFilter(s)}>{s}</button>)}<button className="link" onClick={load}>Refresh</button></div>
    {!shown.length && <p>No {filter === 'all' ? '' : filter} orders.</p>}
    {shown.map(o => <div className="box" key={o.id}>
      <div className="between"><b>{o.customer_name}</b><span className={'tag ' + o.status}>{o.status}</span></div>
      <p>{o.phone} · {o.address}<br />{o.items.map(i => i.name).join(', ')}<br />Total {ghc(o.total)} · {new Date(o.created_at).toLocaleString()}</p>
      <p>Reference: <b className="ref">{o.reference}</b></p>
      <div className="tabs"><button className="btn" disabled={o.status === 'confirmed'} onClick={() => setStatus(o.id, 'confirmed')}>Confirm payment</button>
        <button className="btn light" disabled={o.status === 'rejected'} onClick={() => setStatus(o.id, 'rejected')}>Reject</button></div>
    </div>)}</>)
}

function Items() {
  const [rows, setRows] = useState([]), [name, setName] = useState(''), [price, setPrice] = useState(''), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const load = () => supabase.from('items').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data || []))
  useEffect(() => { load() }, [])
  async function add() {
    setBusy(true); setErr(''); let image_url = null, image_path = null
    if (file) {
      image_path = crypto.randomUUID() + '.jpg'
      const { error } = await supabase.storage.from('item-images').upload(image_path, await shrink(file), { contentType: 'image/jpeg' })
      if (error) { setBusy(false); return setErr(error.message) }
      image_url = supabase.storage.from('item-images').getPublicUrl(image_path).data.publicUrl
    }
    const { error } = await supabase.from('items').insert({ name: name.trim(), price: Number(price), image_url, image_path })
    setBusy(false); if (error) return setErr(error.message)
    setName(''); setPrice(''); setFile(null); load()
  }
  async function del(i) {
    if (!confirm(`Delete "${i.name}"? Past orders keep their own copy.`)) return
    await supabase.from('items').delete().eq('id', i.id)
    if (i.image_path) await supabase.storage.from('item-images').remove([i.image_path])
    load()
  }
  return (<>
    <section className="box"><h2>Add an item</h2>
      <input placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Price in GH₵" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={!name.trim() || price === '' || busy} onClick={add}>{busy ? 'Uploading…' : 'Add item'}</button></section>
    <section className="box"><h2>Items ({rows.length})</h2>
      {rows.map(i => <div className="row" key={i.id}><span className="thumb">{i.image_url && <img src={i.image_url} alt="" />}{i.name} · {ghc(i.price)}</span><button className="btn light" onClick={() => del(i)}>Delete</button></div>)}</section></>)
}

function Payment() {
  const [s, setS] = useState(null), [saved, setSaved] = useState(false)
  useEffect(() => { supabase.from('settings').select('*').single().then(({ data }) => setS(data)) }, [])
  if (!s) return <p>Loading…</p>
  const f = [['account_name', 'Account name'], ['method', 'Method or bank'], ['account_number', 'Number'], ['delivery_note', 'Delivery note']]
  return (<section className="box"><h2>Details customers see</h2>
    {f.map(([k, l]) => <label key={k}>{l}<input value={s[k]} onChange={e => { setSaved(false); setS({ ...s, [k]: e.target.value }) }} /></label>)}
    <button className="btn" onClick={async () => { await supabase.from('settings').update(s).eq('id', 1); setSaved(true) }}>Save changes</button>{saved && <span> Saved</span>}</section>)
}
