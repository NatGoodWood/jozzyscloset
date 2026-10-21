// Paste your Paystack PUBLIC key (starts with pk_live_ or pk_test_). The SECRET key (sk_...) must NEVER go in this project.
export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_0d71f4e52665e0b0e0bd1a906c75b961f6d0404f'
export const paystackReady = /^pk_(live|test)_/.test(PAYSTACK_PUBLIC_KEY) && !PAYSTACK_PUBLIC_KEY.includes('pk_live_0d71f4e52665e0b0e0bd1a906c75b961f6d0404f')
export function loadPaystack() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve()
    const s = document.createElement('script')
    s.src = 'https://js.paystack.co/v1/inline.js'; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}
