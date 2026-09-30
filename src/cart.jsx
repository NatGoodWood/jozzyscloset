import { createContext, useContext, useEffect, useState } from 'react'
import { MAX_ITEMS } from './supabase'
const Ctx = createContext()
export const useCart = () => useContext(Ctx)
export function CartProvider({ children }) {
  const [ids, setIds] = useState(() => { try { return JSON.parse(localStorage.getItem('jc-cart')) || [] } catch { return [] } })
  const [msg, setMsg] = useState('')
  useEffect(() => { localStorage.setItem('jc-cart', JSON.stringify(ids)) }, [ids])
  const toggle = id => setIds(a => {
    if (a.includes(id)) { setMsg(''); return a.filter(x => x !== id) }
    if (a.length >= MAX_ITEMS) { setMsg(`You can choose up to ${MAX_ITEMS} items.`); return a }
    setMsg(''); return [...a, id]
  })
  return <Ctx.Provider value={{ ids, toggle, clear: () => setIds([]), msg }}>{children}</Ctx.Provider>
}
