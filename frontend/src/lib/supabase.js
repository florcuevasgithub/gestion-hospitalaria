import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidas en .env.local'
  )
}

// AGREGA ESTO TEMPORALMENTE
console.log("LLAVE QUE ESTOY ENVIANDO: ", supabaseKey.substring(0, 15) + "...");
export const supabase = createClient(supabaseUrl, supabaseKey)
