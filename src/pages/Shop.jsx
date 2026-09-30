import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, ghc, MAX_ITEMS } from '../supabase'
import { useCart } from '../cart'

export default function Shop() {
  const [items, setItems] = useState(null), [err, setErr] = useState('')
  const { ids, toggle, msg } = useCart()
  useEffect(() => {
    supabase.from('items').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => error ? setErr('Could not load items. Refresh to try again.') : setItems(data))
  }, [])
  return (<main>
    <h1>Pick your pieces</h1>
    <div className="pick">
      <span>{ids.length} of {MAX_ITEMS} chosen</span>
      {msg && <b>{msg}</b>}
      {ids.length > 0 && <Link to="/cart" className="btn light">Go to cart</Link>}
    </div>
    {err && <p className="error">{err}</p>}
    {items && !items.length && <p>New pieces are on the way. Check back soon.</p>}
    {!items && !err && <p>Loading…</p>}
    <div className="grid">
      {items?.map(i => (
        <button key={i.id} className={'card' + (ids.includes(i.id) ? ' on' : '')} onClick={() => toggle(i.id)} aria-pressed={ids.includes(i.id)}>
          {i.image_url ? <img src={i.image_url} alt={i.name} loading="lazy" /> : <div className="ph" />}
          <span className="meta"><span>{i.name}</span><b>{ghc(i.price)}</b><small>{ids.includes(i.id) ? 'Chosen. Tap to remove' : 'Tap to choose'}</small></span>
        </button>))}
    </div>
  </main>)
}
