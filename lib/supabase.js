// Importamos la funcion para crear el cliente de Supabase
import { createClient } from '@supabase/supabase-js'
 
// Leemos las variables de entorno del archivo .env.local
// NEXT_PUBLIC_ significa que estas variables son accesibles desde el navegador
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 
// Cliente principal para usar en toda la app desde el navegador
// Usa la clave publica (publishable key) y respeta las politicas de seguridad RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
 