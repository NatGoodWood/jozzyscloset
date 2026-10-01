import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
export default function AdminLogin() {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), nav = useNavigate()
  async function login(e) {
    e.preventDefault(); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) return setErr('Wrong email or password.')
    nav('/admin')
  }
  return (<main className="narrow"><h1>Admin sign in</h1>
    <form className="box" onSubmit={login}>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
      <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" />
      {err && <p className="error">{err}</p>}
      <button className="btn black full" disabled={!email || !pw}>Sign in</button>
    </form></main>)
}
