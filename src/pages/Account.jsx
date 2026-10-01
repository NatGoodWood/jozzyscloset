import { useEffect, useState } from 'react'
import { supabase, ghc } from '../supabase'
import { useStore } from '../store'

export default function Account() { const { user } = useStore(); return user ? <Orders user={user} /> : <Auth /> }

function Auth() {
  const [mode, setMode] = useState('login'), [f, setF] = useState({ name: '', email: '', pw: '' }), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  async function go(e) {
    e.preventDefault(); setBusy(true); setMsg('')
    const r = mode === 'login' ? await supabase.auth.signInWithPassword({ email: f.email, password: f.pw })
      : await supabase.auth.signUp({ email: f.email, password: f.pw, options: { data: { full_name: f.name } } })
    setBusy(false)
    if (r.error) return setMsg(r.error.message)
    if (mode === 'register' && !r.data.session) setMsg('Account created. Check your email to confirm, then log in.')
  }
  return (<main className="narrow"><h1>{mode === 'login' ? 'Login' : 'Create account'}</h1>
    <form className="box" onSubmit={go}>
      {mode === 'register' && <input placeholder="Full name" value={f.name} onChange={set('name')} autoComplete="name" />}
      <input type="email" placeholder="Email" value={f.email} onChange={set('email')} autoComplete="email" />
      <input type="password" placeholder="Password (6+ characters)" value={f.pw} onChange={set('pw')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      {msg && <p className={msg.startsWith('Account') ? 'ok' : 'error'}>{msg}</p>}
      <button className="btn black full" disabled={busy || !f.email || f.pw.length < 6}>{mode === 'login' ? 'Login →' : 'Register →'}</button>
    </form>
    <button className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg('') }}>{mode === 'login' ? 'New here? Create an account' : 'Have an account? Login'}</button>
  </main>)
}
function Orders({ user }) {
  const [rows, setRows] = useState(null)
  useEffect(() => { supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])) }, [user.id])
  return (<main><div className="between"><h1>My orders</h1><button className="btn ghost" onClick={() => supabase.auth.signOut()}>Log out</button></div>
    {rows && !rows.length && <p>No orders yet.</p>}
    {rows?.map(o => <div className="box" key={o.id}><div className="between"><b>{o.pieces} pieces · {ghc(o.total)}</b><span className={'tag ' + o.status}>{o.status}</span></div>
      <p>{o.items.map(i => `${i.name} (${i.size}) × ${i.qty}`).join(', ')}<br /><small>Reference {o.reference} · {new Date(o.created_at).toLocaleDateString()}</small></p></div>)}</main>)
}
