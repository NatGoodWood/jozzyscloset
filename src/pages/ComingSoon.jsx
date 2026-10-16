import { Link } from 'react-router-dom'
import { LAUNCH_AT } from '../supabase'

export default function ComingSoon({ left, settings }) {
  const t = Math.max(0, left), pad = n => String(n).padStart(2, '0')
  const units = [['Days', Math.floor(t / 864e5)], ['Hours', Math.floor(t % 864e5 / 36e5)], ['Minutes', Math.floor(t % 36e5 / 6e4)], ['Seconds', Math.floor(t % 6e4 / 1e3)]]
  const date = LAUNCH_AT.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const wa = settings && settings.whatsapp && settings.whatsapp !== '233240000000' ? 'https://wa.me/' + settings.whatsapp.replace(/\D/g, '') : null
  return (<div className="cs">
    <div className="cs-in">
      <div className="cs-logo">
        <svg width="34" height="25" viewBox="0 0 24 18" aria-hidden="true"><path d="M2 16l2-11 5 5 3-8 3 8 5-5 2 11z" fill="currentColor" /></svg>
        <div><span className="l1">Jozzys</span> <span className="l2">Closet</span></div><small>Wholesale Fashion</small>
      </div>
      <p className="script">Something beautiful is on its way</p>
      <h1>Coming Soon</h1>
      <p>Trendy styles, bigger profits. Our wholesale store opens on <b>{date}</b>.</p>
      <div className="count" role="timer" aria-label={`Time until launch: ${units.map(([l, n]) => n + ' ' + l).join(', ')}`}>
        {units.map(([l, n]) => <div key={l}><b>{l === 'Days' ? n : pad(n)}</b><span>{l}</span></div>)}
      </div>
      {wa && <a className="btn black" href={wa} target="_blank" rel="noreferrer">Message us on WhatsApp</a>}
      <p className="sub">For resellers and business owners. Minimum order {settings?.min_order ?? 10} pieces.</p>
    </div>
    <footer className="cs-foot"><span>© {new Date().getFullYear()} Jozzys Closet · jozzyscloset.com</span><Link to="/admin" className="fadmin">Admin</Link></footer>
  </div>)
}
