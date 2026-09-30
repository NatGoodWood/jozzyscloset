import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useCart } from './cart'
import Shop from './pages/Shop'
import Cart from './pages/Cart'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'

export default function App() {
  const { ids } = useCart(); const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return (<>
    <header className="top">
      <Link to="/" className="logo">Jozzy's <em>Closet</em></Link>
      <Link to="/cart" className="btn">Cart ({ids.length})</Link>
    </header>
    <Routes>
      <Route path="/" element={<Shop />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<main><h2>Page not found</h2><Link to="/">Back to the shop</Link></main>} />
    </Routes>
    <footer>
      <div>© {new Date().getFullYear()} Jozzy's Closet</div>
      <Link to="/admin" className="fadmin">Admin</Link>
    </footer>
  </>)
}
