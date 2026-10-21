// Helpers for WhatsApp / SMS links. Numbers are turned into international format (Ghana +233 by default).
export function toIntl(raw) {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('233')) return d
  if (d.startsWith('0')) return '233' + d.slice(1)
  if (d.length === 9) return '233' + d
  return d
}
export const validPhone = raw => { const n = toIntl(raw).length; return n >= 11 && n <= 15 }
export const waLink = (phone, text) => `https://wa.me/${toIntl(phone)}?text=${encodeURIComponent(text)}`
export const smsLink = (phone, text) => `sms:+${toIntl(phone)}?&body=${encodeURIComponent(text)}`
export const firstName = n => String(n || '').trim().split(/\s+/)[0] || 'there'
const money = n => 'GH₵ ' + Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })

export const TEMPLATE_LABELS = { pending: 'Order received', unpaid: 'Payment not completed', confirmed: 'Payment confirmed', rejected: 'Payment not found', delivery: 'Out for delivery', custom: 'Custom message' }
export function buildMessage(kind, o) {
  const n = firstName(o.customer_name), ref = o.reference, tot = money(o.total)
  if (kind === 'confirmed') return `Hi ${n}, your payment (ref ${ref}) of ${tot} has been confirmed. Your order of ${o.pieces} pieces is being prepared for delivery to ${o.address}. Thank you for shopping with Jozzys Closet.`
  if (kind === 'rejected') return `Hi ${n}, we could not find a payment matching reference ${ref} for your order of ${tot}. Please check the reference and reply to this message, or send a screenshot of your payment. Jozzys Closet.`
  if (kind === 'delivery') return `Hi ${n}, your Jozzys Closet order (ref ${ref}) is on its way to ${o.address}. Please keep your phone close for our rider. Thank you!`
  if (kind === 'unpaid') return `Hi ${n}, your Jozzys Closet order (${tot}) was not completed because the payment did not go through. You can place it again at jozzyscloset.com whenever you are ready.`
  if (kind === 'custom') return ''
  return `Hi ${n}, we have received your order of ${o.pieces} pieces (${tot}) with payment reference ${ref}. We are confirming your payment and will message you shortly. Jozzys Closet.`
}
