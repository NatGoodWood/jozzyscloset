import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, CATEGORIES } from '../supabase'
import { useStore } from '../store'
import { Icon, ItemCard } from '../ui'

export default function Home() {
  const { settings } = useStore(), [items, setItems] = useState([])
  useEffect(() => { supabase.from('items').select('*').order('created_at', { ascending: false }).limit(60).then(({ data }) => setItems(data || [])) }, [])
  const min = settings?.min_order ?? 10
  const trust = [['truck', 'Fast & Reliable Delivery', ''], ['shield', 'Quality Products You Can Trust', ''], ['tag', 'Bulk Orders', `(${min} Pieces Minimum)`], ['headset', 'Dedicated Customer Support', '']]
  return (<>
    <section className="hero">
      <div className="hero-t">
        <p className="script">Welcome to</p>
        <h1>Jozzys Closet <span className="script big">Wholesale</span></h1>
        <p>Quality fashion, trendy styles and unbeatable prices for resellers and business owners.</p>
        <Link className="btn black" to="/shop">Shop Wholesale →</Link>
      </div>
      <div className="hero-i" style={settings?.hero_url ? { backgroundImage: `url(${settings.hero_url})` } : null} />
    </section>
    <section className="trust">{trust.map(([i, a, b]) => <div key={a}><Icon n={i} size={28} /><span><b>{a}</b>{b && <small>{b}</small>}</span></div>)}</section>
    <main>
      <div className="between"><div><h2>Shop by Category</h2><p className="sub">Everything you need to stock your store</p></div><Link to="/shop" className="link">View All →</Link></div>
      <div className="tiles">{CATEGORIES.map(c => { const it = items.find(i => i.category === c); return (
        <Link key={c} to={'/shop?cat=' + c} className="tile">{it?.image_url ? <img src={it.image_url} alt="" loading="lazy" /> : <div className="ph" />}<span>{c}</span></Link>) })}</div>
      {items.length > 0 && <><h2 style={{ marginTop: 36 }}>New arrivals</h2><div className="grid">{items.slice(0, 8).map(i => <ItemCard key={i.id} i={i} />)}</div></>}
      <section className="join">
        <div><p className="script">Join Our</p><h2>Wholesale Family</h2><p>Great fashion. Better prices. Bigger opportunities.</p><Link className="btn black" to="/account">Register Now →</Link></div>
        <div className="badge"><small>Minimum order</small><b>{min}</b><small>pieces</small></div>
      </section>
    </main>
  </>)
}
