// Loads Paystack's payment popup. No key is needed here: the server starts each payment with the secret key (see supabase/functions/init-payment).
export function loadPaystack() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve()
    const s = document.createElement('script')
    s.src = 'https://js.paystack.co/v2/inline.js'; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}
