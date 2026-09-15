"use client";

import { createClient } from "@supabase/supabase-js";

// Cliente usado no navegador (login, cadastro, sessão do usuário).
// Usa a anon key, que é pública por design — a segurança real fica nas
// regras de acesso (RLS) do banco e nas rotas de servidor que usam a
// service_role key (ver lib/supabaseAdmin.js).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
