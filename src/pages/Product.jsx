import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, ghc } from '../supabase'
import { useStore } from '../store'
import { Icon } from '../ui'

export default function Product() {
  const { id } = useParams(), { add, settings, wish, toggleWish } = useStore()
  const [i, setI] = useState(undefined), [size, setSize] = useState(''), [qty, setQty] = useState(1), [added, setAdded] = useState(false)
  useEffect(() => { supabase.from('items').select('*').eq('id', id).maybeSingle().then(({ data }) => { setI(data); setSize(data?.sizes?.[0] || '') }) }, [id])
  if (i === undefined) return <main>Loading…</main>
  if (!i) return <main><h1>Item not found</h1><Link to="/shop">Back to the shop</Link></main>
  const sizes = i.sizes?.length ? i.sizes : ['One size']
  return (<main>
    <nav className="crumbs"><Link to="/">Home</Link> / <Link to={'/shop?cat=' + i.category}>{i.category}</Link> / <b>{i.name}</b></nav>
    <div className="pdp">
      {i.image_url ? <img src={i.image_url} alt={i.name} /> : <div className="ph big" />}
      <div>
        <h1>{i.name}</h1><p className="price">{ghc(i.price)} <small>per piece</small></p>
        {i.description && <p>{i.description}</p>}
        <p className="label">Size</p>
        <div className="chips">{sizes.map(s => <button key={s} className={'chip' + ((size || 'One size') === s ? ' on' : '')} onClick={() => setSize(s)}>{s}</button>)}</div>
        <p className="label">Quantity</p>
        <div className="qty"><button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Less">−</button><span>{qty}</span><button onClick={() => setQty(qty + 1)} aria-label="More">+</button></div>
        <p className={i.in_stock ? 'stock in' : 'stock'}>{i.in_stock ? 'In stock' : 'Out of stock'}</p>
        <div className="tabs">
          <button className="btn blush" disabled={!i.in_stock} onClick={() => { add(i, size || 'One size', qty); setAdded(true) }}>Add to Cart →</button>
          <button className={'btn ghost' + (wish.includes(i.id) ? ' liked' : '')} onClick={() => toggleWish(i.id)}><Icon n="heart" size={18} /> Wishlist</button>
        </div>
        {added && <p className="ok">Added to your cart. <Link to="/cart">View cart</Link></p>}
        <p className="note">Wholesale orders start at {settings?.min_order ?? 10} pieces in total, and you can mix any styles and sizes.</p>
      </div>
    </div>
  </main>)
}
