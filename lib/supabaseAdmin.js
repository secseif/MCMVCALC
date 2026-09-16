import { createClient } from "@supabase/supabase-js";

// Cliente de SERVIDOR: usa a service_role key, que ignora as regras de
// RLS. Só deve ser importado dentro de rotas de API (app/api/**/route.js),
// nunca em componentes que rodam no navegador.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase não configurado no servidor: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente (Vercel > Settings > Environment Variables)."
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
