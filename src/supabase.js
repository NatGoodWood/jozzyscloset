import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hwhwltnpjmcgfqibsdcz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_cwxGc1O8o-VzF1cxfSAsfA_ZucOFS4k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
export const ghc = n => 'GH₵ ' + Number(n).toLocaleString('en-GH')
export const MAX_ITEMS = 10
export function shrink(file, max = 900) {
  return new Promise(res => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas')
      c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      c.toBlob(res, 'image/jpeg', 0.8)
    }; img.src = URL.createObjectURL(file)
  })
}