import { Link } from 'react-router-dom'
import { useStore } from '../store'

export function About() {
  const { settings: s } = useStore()
  return (<main className="narrow"><h1>About Jozzys Closet</h1><p>{s?.about}</p><p className="script big">Fashion Fuels Dreams</p><Link className="btn black" to="/shop">Shop Wholesale →</Link></main>)
}
export function Wholesale() {
  const { settings: s } = useStore(), min = s?.min_order ?? 10
  const steps = [['Choose your pieces', `Mix any styles and sizes. Your order starts at ${min} pieces in total.`], ['Pay and send the reference', 'Send the total to our account and enter the payment reference at checkout.'], ['We confirm', 'Our team checks your payment and confirms your order.'], ['Delivery', s?.delivery_note || '']]
  return (<main className="narrow"><h1>Wholesale</h1><p>Prices made for resellers and business owners. Minimum order: <b>{min} pieces</b>.</p>
    <ol className="steps">{steps.map(([a, b]) => <li key={a}><b>{a}</b><span>{b}</span></li>)}</ol><Link className="btn black" to="/shop">Start shopping →</Link></main>)
}
export function Contact() {
  const { settings: s } = useStore()
  return (<main className="narrow"><h1>Contact us</h1>{s && <div className="box"><dl><dt>Phone</dt><dd><a href={'tel:' + s.phone.replace(/\s/g, '')}>{s.phone}</a></dd>
    <dt>WhatsApp</dt><dd><a href={'https://wa.me/' + s.whatsapp.replace(/\D/g, '')} target="_blank" rel="noreferrer">Chat with us</a></dd><dt>Email</dt><dd><a href={'mailto:' + s.email}>{s.email}</a></dd></dl></div>}</main>)
}
