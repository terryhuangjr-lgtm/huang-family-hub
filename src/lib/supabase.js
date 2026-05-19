import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
}
if (supabaseKey && !supabaseKey.endsWith('cks') && supabaseKey.length < 200) {
  console.warn('Supabase anon key looks truncated (length: ' + supabaseKey.length + ')')
}
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase key length:', supabaseKey ? supabaseKey.length : 'missing')

export const supabase = createClient(supabaseUrl, supabaseKey)
