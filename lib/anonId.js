import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const COOKIE_NAME = "mcmv_anon_id";

// Identifica o visitante anônimo por um cookie httpOnly assinado pelo
// próprio Next (SameSite=Lax). Isso é mais difícil de burlar do que
// contar só no localStorage, mas não é à prova de tudo: limpar cookies
// ou usar aba anônima gera um novo id e reseta a contagem gratuita.
// Para algo realmente robusto seria preciso amarrar o limite ao CPF/telefone
// verificado, o que exige um KYC mais forte do que vale a pena para R$1.
export async function getOrCreateAnonId() {
  // A partir do Next.js 15, cookies() é assíncrona.
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return { id: existing, isNew: false };

  const id = uuidv4();
  return { id, isNew: true };
}

export function anonCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  };
}

export const ANON_COOKIE_NAME = COOKIE_NAME;
