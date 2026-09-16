import { supabaseAdmin } from "./supabaseAdmin";

// Extrai e valida o usuário autenticado a partir do header
// "Authorization: Bearer <token>" que o navegador envia (ver
// lib/supabaseClient.js — o token vem de supabase.auth.getSession()).
// Retorna null se não houver token ou se ele for inválido/expirado.
export async function getUserFromRequest(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
