import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, CATEGORIES } from '../supabase'
import { useStore } from '../store'
import { ItemCard } from '../ui'

export function Shop() {
  const [sp, setSp] = useSearchParams(), cat = sp.get('cat') || '', q = sp.get('q') || '', sort = sp.get('sort') || 'latest'
  const [items, setItems] = useState(null)
  useEffect(() => { supabase.from('items').select('*').order('created_at', { ascending: false }).then(({ data }) => setItems(data || [])) }, [])
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n) }
  let list = (items || []).filter(i => (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())))
  if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price)
  if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price)
  return (<main>
    <nav className="crumbs"><Link to="/">Home</Link> / {cat ? <><Link to="/shop">Shop</Link> / <b>{cat}</b></> : <b>Shop</b>}</nav>
    <h1>{cat || (q ? `Results for “${q}”` : 'Shop')}</h1>
    <div className="filters">
      <div className="chips"><button className={'chip' + (!cat ? ' on' : '')} onClick={() => set('cat', '')}>All</button>
        {CATEGORIES.map(c => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => set('cat', c)}>{c}</button>)}</div>
      <label className="sort">Sort by <select value={sort} onChange={e => set('sort', e.target.value === 'latest' ? '' : e.target.value)}><option value="latest">Latest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
    </div>
    {!items && <p>Loading…</p>}
    {items && !list.length && <p>No items found. <button className="link" onClick={() => setSp({})}>Clear filters</button></p>}
    <div className="grid">{list.map(i => <ItemCard key={i.id} i={i} />)}</div>
  </main>)
}
export function Wishlist() {
  const { wish } = useStore(), [items, setItems] = useState([])
  useEffect(() => { if (wish.length) supabase.from('items').select('*').in('id', wish).then(({ data }) => setItems(data || [])) }, [wish])
  const list = items.filter(i => wish.includes(i.id))
  return (<main><h1>Wishlist</h1>{!list.length && <p>Tap the heart on any item to save it here. <Link to="/shop">Browse the shop</Link></p>}<div className="grid">{list.map(i => <ItemCard key={i.id} i={i} />)}</div></main>)
}
