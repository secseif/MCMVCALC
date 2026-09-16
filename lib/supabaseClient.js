"use client";

import { createClient } from "@supabase/supabase-js";

// Cliente usado no navegador (login, cadastro, sessão do usuário).
// Usa a anon key, que é pública por design — a segurança real fica nas
// regras de acesso (RLS) do banco e nas rotas de servidor que usam a
// service_role key (ver lib/supabaseAdmin.js).
//
// Se NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não
// estiverem configuradas (esquecidas no painel da Vercel, por exemplo),
// usamos um valor de placeholder em vez de deixar createClient() explodir
// e derrubar o build inteiro — o login simplesmente não vai funcionar até
// você configurar as variáveis de verdade, e o aviso abaixo aparece no
// console do navegador para deixar isso óbvio.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured && typeof window !== "undefined") {
  console.error(
    "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja .env.example / Settings > Environment Variables na Vercel)."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
