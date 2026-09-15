import { createClient } from "@supabase/supabase-js";

// Cliente de SERVIDOR: usa a service_role key, que ignora as regras de
// RLS. Só deve ser importado dentro de rotas de API (app/api/**/route.js),
// nunca em componentes que rodam no navegador.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
