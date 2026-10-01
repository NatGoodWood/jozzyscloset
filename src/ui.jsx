import { Link } from 'react-router-dom'
import { ghc } from './supabase'
import { useStore } from './store'
const P = {
  heart: 'M12 20.5s-7.5-4.6-9.3-9.4A5 5 0 0 1 12 7.6a5 5 0 0 1 9.3 3.5c-1.800 4.800-9.300 9.400-9.300 9.400z',
  cart: 'M3 4h2l2.500 11h10.500L20 7H6.500M9.500 20h.01M17 20h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  truck: 'M2 6h12v10H2zM14 10h4l3 3v3h-7zM6 19h.01M17 19h.01',
  shield: 'M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6zM9 12l2 2 4-4',
  tag: 'M3 12V3h9l9 9-9 9zM7.500 7.500h.01',
  headset: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3z',
  menu: 'M4 6h16M4 12h16M4 18h16', home: 'M3 11l9-8 9 8v9H3z', shop: 'M4 7h16l-1 13H5zM8 7a4 4 0 0 1 8 0'
}
export const Icon = ({ n, size = 22 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.600" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
export const Logo = () => (
  <Link to="/" className="logo" aria-label="Jozzys Closet home">
    <svg className="crown" width="22" height="16" viewBox="0 0 24 18" aria-hidden="true"><path d="M2 16l2-11 5 5 3-8 3 8 5-5 2 11z" fill="currentColor" /></svg>
    <span className="l1">Jozzys</span><span className="l2">Closet</span><small>Wholesale Fashion</small>
  </Link>)
export function ItemCard({ i }) {
  const { wish, toggleWish } = useStore(), on = wish.includes(i.id)
  return (<div className="pcard">
    <Link to={'/product/' + i.id}>{i.image_url ? <img src={i.image_url} alt={i.name} loading="lazy" /> : <div className="ph" />}</Link>
    <button className={'heart' + (on ? ' on' : '')} onClick={() => toggleWish(i.id)} aria-label={on ? 'Remove from wishlist' : 'Save to wishlist'}><Icon n="heart" size={18} /></button>
    <div className="pm"><Link to={'/product/' + i.id}>{i.name}</Link><b>{ghc(i.price)}</b>{!i.in_stock && <small className="out">Out of stock</small>}</div>
  </div>)
}
