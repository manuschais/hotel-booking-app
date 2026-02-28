import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || url.includes('YOUR_PROJECT')) {
  console.warn('⚠️ กรุณาตั้งค่า VITE_SUPABASE_URL ใน .env')
}

export const supabase = createClient(url, key)
