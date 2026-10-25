import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, ghc, uploadImage, CATEGORIES } from '../supabase'
import { toIntl, waLink, smsLink, firstName, buildMessage, TEMPLATE_LABELS } from '../messages'

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
    <div className="tabs">{['orders', 'messages', 'items', 'settings'].map(t => <button key={t} className={'btn cap ' + (tab === t ? 'black' : 'ghost')} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'orders' ? <Orders /> : tab === 'messages' ? <Messages /> : tab === 'items' ? <Items /> : <Settings />}
  </main>)
}
const SignOut = () => <button className="btn ghost" onClick={async () => { await supabase.auth.signOut(); location.href = '/' }}>Sign out</button>

function Orders() {
  const [rows, setRows] = useState([]), [filter, setFilter] = useState('confirmed')
  const load = useCallback(() => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])), [])
  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i) }, [load])
  const setStatus = async (id, status) => { await supabase.from('orders').update({ status }).eq('id', id); load() }
  const shown = rows.filter(r => filter === 'all' || r.status === filter)
  return (<>
    <div className="tabs">{['confirmed', 'pending', 'unpaid', 'rejected', 'all'].map(s => <button key={s} className={'btn cap ' + (filter === s ? 'blush' : 'ghost')} onClick={() => setFilter(s)}>{s}</button>)}<button className="link" onClick={load}>Refresh</button></div>
    {!shown.length && <p>No {filter === 'all' ? '' : filter} orders.</p>}
    {shown.map(o => <div className="box" key={o.id}>
      <div className="between"><b>{o.customer_name}</b><span className={'tag ' + o.status}>{o.status}</span></div>
      <p>{o.phone}{o.email ? ' · ' + o.email : ''} · {o.address}</p>
      <p>{o.items.map(i => `${i.name} (${i.size}) × ${i.qty}`).join(', ')}<br /><b>{o.pieces} pieces · {ghc(o.total)}</b> · {new Date(o.created_at).toLocaleString()}</p>
      <p>Reference: <b className="ref">{o.reference}</b></p>
      <MessageBox o={o} />
      <div className="tabs"><button className="btn black" disabled={o.status === 'confirmed'} onClick={() => setStatus(o.id, 'confirmed')}>Confirm payment</button>
        <button className="btn ghost" disabled={o.status === 'rejected'} onClick={() => setStatus(o.id, 'rejected')}>Reject</button></div>
    </div>)}</>)
}

function Items() {
  const blank = { name: '', price: '', category: CATEGORIES[0], sizes: 'S, M, L, XL', description: '' }
  const [rows, setRows] = useState([]), [f, setF] = useState(blank), [file, setFile] = useState(null), [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const load = () => supabase.from('items').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows(data || []))
  useEffect(() => { load() }, [])
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const clearFile = () => document.querySelectorAll('input[type=file]').forEach(i => (i.value = ''))
  const parseSizes = s => s.split(',').map(x => x.trim()).filter(Boolean)
  const valid = f.name.trim() && f.price !== '' && Number(f.price) >= 0

  function startEdit(i) {
    setEditing(i); setErr(''); setFile(null); clearFile()
    setF({ name: i.name, price: String(i.price), category: CATEGORIES.includes(i.category) ? i.category : CATEGORIES[0], sizes: (i.sizes || []).join(', '), description: i.description || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function cancel() { setEditing(null); setF(blank); setFile(null); clearFile(); setErr('') }
  async function save() {
    setBusy(true); setErr('')
    let img = null
    try {
      const fields = { name: f.name.trim(), price: Number(f.price), category: f.category, description: f.description.trim(), sizes: parseSizes(f.sizes) }
      if (file) img = await uploadImage(file)
      if (editing) {
        const patch = img ? { ...fields, image_url: img.url, image_path: img.path } : fields
        const { error } = await supabase.from('items').update(patch).eq('id', editing.id)
        if (error) throw error
        if (img && editing.image_path) await supabase.storage.from('item-images').remove([editing.image_path])
      } else {
        const { error } = await supabase.from('items').insert({ ...fields, image_url: img?.url ?? null, image_path: img?.path ?? null })
        if (error) throw error
      }
      cancel(); load()
    } catch (e) {
      if (img) await supabase.storage.from('item-images').remove([img.path])
      setErr(e.message)
    }
    setBusy(false)
  }
  async function del(i) {
    if (!confirm(`Delete "${i.name}"? Past orders keep their own copy.`)) return
    await supabase.from('items').delete().eq('id', i.id)
    if (i.image_path) await supabase.storage.from('item-images').remove([i.image_path])
    if (editing?.id === i.id) cancel()
    load()
  }
  const stock = async i => { await supabase.from('items').update({ in_stock: !i.in_stock }).eq('id', i.id); load() }
  return (<>
    <section className="box"><h2>{editing ? 'Edit item' : 'Add an item'}</h2>
      <p className="sub">Every item is listed as a single piece. Customers mix pieces to reach the minimum order.</p>
      {editing && <div className="editbar">Editing <b>{editing.name}</b>. Past orders are not changed.</div>}
      <input placeholder="Item name" value={f.name} onChange={set('name')} />
      <input placeholder="Price per piece in GH₵" type="number" min="0" step="0.01" value={f.price} onChange={set('price')} />
      <select value={f.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
      <input placeholder="Sizes, separated by commas (leave empty for one size)" value={f.sizes} onChange={set('sizes')} />
      <input placeholder="Short description (optional)" value={f.description} onChange={set('description')} />
      {editing?.image_url && <div className="thumb"><img src={editing.image_url} alt="" /><small>Current photo. Choose a new file below only if you want to replace it.</small></div>}
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
      {err && <p className="error">{err}</p>}
      <div className="tabs">
        <button className="btn black" disabled={!valid || busy} onClick={save}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add item'}</button>
        {editing && <button className="btn ghost" disabled={busy} onClick={cancel}>Cancel</button>}
      </div></section>
    <section className="box"><h2>Items ({rows.length})</h2>
      {rows.map(i => <div className="row" key={i.id}><span className="thumb">{i.image_url && <img src={i.image_url} alt="" />}<span>{i.name}<small>{i.category} · {ghc(i.price)} · Single piece</small></span></span>
        <span className="tabs"><button className="btn ghost" onClick={() => startEdit(i)}>Edit</button><button className="btn ghost" onClick={() => stock(i)}>{i.in_stock ? 'In stock' : 'Out of stock'}</button><button className="btn ghost" onClick={() => del(i)}>Delete</button></span></div>)}</section></>)
}

function Settings() {
  const [s, setS] = useState(null), [saved, setSaved] = useState(false), [err, setErr] = useState('')
  useEffect(() => { supabase.from('settings').select('*').single().then(({ data }) => setS(data)) }, [])
  if (!s) return <p>Loading…</p>
  const fields = [['account_name', 'Account name'], ['method', 'Payment method or bank'], ['account_number', 'Payment number'], ['delivery_note', 'Delivery note'], ['min_order', 'Minimum pieces per order'],
    ['phone', 'Phone'], ['whatsapp', 'WhatsApp number (with country code, e.g. 233240000000)'], ['email', 'Email'], ['about', 'About us text']]
  const ch = (k, v) => { setSaved(false); setS({ ...s, [k]: v }) }
  async function banner(file) { try { const img = await uploadImage(file, 'hero-', 2000); ch('hero_url', img.url) } catch (e) { setErr(e.message) } }
  async function save() { setErr(''); const { error } = await supabase.from('settings').update({ ...s, min_order: Number(s.min_order) || 10 }).eq('id', 1); error ? setErr(error.message) : setSaved(true) }
  return (<section className="box"><h2>Shop settings</h2>
    {fields.map(([k, l]) => <label key={k}>{l}<input value={s[k] ?? ''} onChange={e => ch(k, e.target.value)} /></label>)}
    <label>Homepage banner photo<input type="file" accept="image/*" onChange={e => e.target.files[0] && banner(e.target.files[0])} /></label>
    {s.hero_url && <img src={s.hero_url} alt="" width="160" />}
    {err && <p className="error">{err}</p>}
    <div className="tabs"><button className="btn black" onClick={save}>Save changes</button>{saved && <span>Saved</span>}</div></section>)
}

function MessageBox({ o }) {
  const def = s => (['confirmed', 'rejected', 'unpaid'].includes(s) ? s : 'pending')
  const [kind, setKind] = useState(def(o.status)), [text, setText] = useState(() => buildMessage(def(o.status), o))
  useEffect(() => { setKind(def(o.status)) }, [o.status])
  useEffect(() => { if (kind !== 'custom') setText(buildMessage(kind, o)) }, [kind, o.status])
  const ok = toIntl(o.phone).length >= 11 && toIntl(o.phone).length <= 15
  return (<details className="msg"><summary>Message {firstName(o.customer_name)}</summary>
    <select value={kind} onChange={e => setKind(e.target.value)} aria-label="Message type">{Object.entries(TEMPLATE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    <textarea rows="5" value={text} onChange={e => { setText(e.target.value); setKind('custom') }} aria-label="Message text" />
    {ok && text.trim() ? <div className="tabs">
      <a className="btn black" href={waLink(o.phone, text)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
      <a className="btn ghost" href={smsLink(o.phone, text)}>Send as text message</a></div>
      : <p className="error">{ok ? 'Write a message first.' : 'This phone number looks incomplete, so it cannot be messaged.'}</p>}
  </details>)
}

function Messages() {
  const [rows, setRows] = useState(null), [status, setStatus] = useState('all'), [sent, setSent] = useState({}), [copied, setCopied] = useState(false)
  const [text, setText] = useState('Hi {name}, thank you for shopping with Jozzys Closet. ')
  useEffect(() => { supabase.from('orders').select('customer_name,phone,status').order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])) }, [])
  const map = new Map()
  ;(rows || []).filter(r => status === 'all' || r.status === status).forEach(r => {
    const k = toIntl(r.phone)
    if (!map.has(k)) map.set(k, { key: k, name: r.customer_name, phone: r.phone, orders: 0 })
    map.get(k).orders++
  })
  const clients = [...map.values()], msg = c => text.split('{name}').join(firstName(c.name))
  async function copy() { try { await navigator.clipboard.writeText(clients.map(c => '+' + c.key).join(', ')); setCopied(true) } catch { setCopied(false) } }
  return (<>
    <section className="box"><h2>Message your clients</h2>
      <p className="sub">Write one message, then tap a client's button. WhatsApp or your Messages app opens with the text ready, and you press send there. Use <code>{'{name}'}</code> to insert each client's first name.</p>
      <label>Who should receive it?<select value={status} onChange={e => setStatus(e.target.value)}>
        <option value="all">Everyone who has ordered</option><option value="confirmed">Confirmed orders</option><option value="pending">Pending orders</option><option value="rejected">Rejected orders</option></select></label>
      <textarea rows="4" value={text} onChange={e => setText(e.target.value)} aria-label="Message to send" />
      <div className="tabs"><button className="btn ghost" onClick={copy} disabled={!clients.length}>Copy all numbers</button>{copied && <span>Copied</span>}</div>
    </section>
    <section className="box"><h2>Clients ({clients.length})</h2>
      {!rows && <p>Loading…</p>}{rows && !clients.length && <p>No clients yet. They appear here after their first order.</p>}
      {clients.map(c => { const ok = c.key.length >= 11 && c.key.length <= 15; return (
        <div className="row" key={c.key}><span>{c.name}<small>{c.phone} · {c.orders} order{c.orders > 1 ? 's' : ''}{sent[c.key] ? ' · opened' : ''}</small></span>
          {ok && text.trim() ? <span className="tabs">
            <a className="btn black" href={waLink(c.phone, msg(c))} target="_blank" rel="noreferrer" onClick={() => setSent({ ...sent, [c.key]: true })}>WhatsApp</a>
            <a className="btn ghost" href={smsLink(c.phone, msg(c))} onClick={() => setSent({ ...sent, [c.key]: true })}>Text</a></span>
            : <small className="error">{ok ? 'Write a message' : 'Number incomplete'}</small>}</div>) })}
    </section></>)
}
