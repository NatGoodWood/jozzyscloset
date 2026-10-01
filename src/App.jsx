import { useEffect, useState } from 'react'
import { Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { configured, CATEGORIES } from './supabase'
import { useStore } from './store'
import { Icon, Logo } from './ui'
import Home from './pages/Home'
import { Shop, Wishlist } from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Account from './pages/Account'
import { About, Wholesale, Contact } from './pages/Info'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'

export default function App() {
  const { count, wish, user } = useStore(), { pathname } = useLocation(), nav = useNavigate()
  const [open, setOpen] = useState(false), [q, setQ] = useState('')
  useEffect(() => { window.scrollTo(0, 0); setOpen(false) }, [pathname])
  const search = e => { e.preventDefault(); nav('/shop?q=' + encodeURIComponent(q)); setQ('') }
  if (!configured) return <main className="narrow"><h1>Connect Supabase</h1><p>Open <code>src/supabase.js</code>, paste your Project URL and anon public key, then save.</p></main>
  return (<>
    <header className="top">
      <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}><Icon n="menu" /></button>
      <Logo />
      <nav className={'links' + (open ? ' open' : '')}>
        <NavLink to="/" end>Home</NavLink><NavLink to="/shop" end>Shop</NavLink>
        <div className="dd"><span tabIndex="0">Categories ▾</span><div className="menu">{CATEGORIES.map(c => <Link key={c} to={'/shop?cat=' + c}>{c}</Link>)}</div></div>
        <NavLink to="/about">About Us</NavLink><NavLink to="/wholesale">Wholesale</NavLink><NavLink to="/contact">Contact</NavLink>
      </nav>
      <form className="search" onSubmit={search} role="search"><input placeholder="Search for products…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" /><button aria-label="Search"><Icon n="search" size={18} /></button></form>
      <div className="acts">
        <Link to="/account" className="act"><Icon n="user" /><span>{user ? 'Account' : 'Login / Register'}</span></Link>
        <Link to="/wishlist" className="act" aria-label="Wishlist"><Icon n="heart" />{wish.length > 0 && <i className="dot">{wish.length}</i>}</Link>
        <Link to="/cart" className="act" aria-label="Cart"><Icon n="cart" /><i className="dot">{count}</i></Link>
      </div>
    </header>
    <Routes>
      <Route path="/" element={<Home />} /><Route path="/shop" element={<Shop />} /><Route path="/product/:id" element={<Product />} />
      <Route path="/cart" element={<Cart />} /><Route path="/wishlist" element={<Wishlist />} /><Route path="/account" element={<Account />} />
      <Route path="/about" element={<About />} /><Route path="/wholesale" element={<Wholesale />} /><Route path="/contact" element={<Contact />} />
      <Route path="/admin/login" element={<AdminLogin />} /><Route path="/admin" element={<Admin />} />
      <Route path="*" element={<main><h1>Page not found</h1><Link to="/">Back to home</Link></main>} />
    </Routes>
    <footer>
      <div className="creed"><span>Fashion</span><span>Quality</span><span>Trust</span><span>Grow Together</span></div>
      <div className="fbar"><span>© {new Date().getFullYear()} Jozzys Closet · jozzyscloset.com||Developed by PacaWood Services &reg;</span><Link to="/admin" className="fadmin">Admin</Link></div>
    </footer>
  </>)
}
