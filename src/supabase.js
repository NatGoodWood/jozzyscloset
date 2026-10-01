import { createClient } from '@supabase/supabase-js'

// 1) Supabase > Project Settings > API. Paste your Project URL and the "anon public" key here.
//    (Never paste the service_role key.) They can also come from a .env file.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hwhwltnpjmcgfqibsdcz.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_cwxGc1O8o-VzF1cxfSAsfA_ZucOFS4k'

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const CATEGORIES = ['Dresses', 'Tops', 'Bottoms', 'Sets', 'Bags', 'Accessories']
export const ghc = n => 'GH₵ ' + Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })
export function shrink(file, max = 1000) {
  return new Promise(res => {
    const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas')
      c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      c.toBlob(res, 'image/jpeg', 0.82)
    }; img.src = URL.createObjectURL(file)
  })
}
export async function uploadImage(file, prefix = '') {
  const path = prefix + crypto.randomUUID() + '.jpg'
  const { error } = await supabase.storage.from('item-images').upload(path, await shrink(file), { contentType: 'image/jpeg' })
  if (error) throw error
  return { path, url: supabase.storage.from('item-images').getPublicUrl(path).data.publicUrl }
}


