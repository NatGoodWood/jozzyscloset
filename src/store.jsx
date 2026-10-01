import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
const Ctx = createContext()
export const useStore = () => useContext(Ctx)
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(null), [user, setUser] = useState(null)
  const [lines, setLines] = useState(() => load('jc-lines', [])), [wish, setWish] = useState(() => load('jc-wish', []))
  useEffect(() => localStorage.setItem('jc-lines', JSON.stringify(lines)), [lines])
  useEffect(() => localStorage.setItem('jc-wish', JSON.stringify(wish)), [wish])
  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data }) => setSettings(data))
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])
  const add = (item, size, qty = 1) => setLines(ls => {
    const key = item.id + '|' + size, f = ls.find(l => l.key === key)
    return f ? ls.map(l => l.key === key ? { ...l, qty: l.qty + qty } : l)
      : [...ls, { key, id: item.id, name: item.name, price: item.price, image: item.image_url, size, qty }]
  })
  const setQty = (key, q) => setLines(ls => q < 1 ? ls.filter(l => l.key !== key) : ls.map(l => l.key === key ? { ...l, qty: Math.min(q, 500) } : l))
  const toggleWish = id => setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id])
  const count = lines.reduce((a, l) => a + l.qty, 0)
  return <Ctx.Provider value={{ settings, user, lines, add, setQty, clear: () => setLines([]), count, wish, toggleWish }}>{children}</Ctx.Provider>
}
