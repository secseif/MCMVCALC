import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getOrCreateAnonId, anonCookieOptions } from "../../../../lib/anonId";

// Usado pela página logo que o visitante volta do Checkout do Mercado
// Pago, para saber se o webhook já confirmou o pagamento (pode levar
// alguns segundos a mais que o redirecionamento do navegador).
export async function GET() {
  const { id: anonId, isNew } = await getOrCreateAnonId();
  const db = supabaseAdmin();

  const { data } = await db
    .from("anon_usage")
    .select("paid")
    .eq("id", anonId)
    .maybeSingle();

  const response = NextResponse.json({ paid: Boolean(data?.paid) });
  if (isNew) {
    const opts = anonCookieOptions();
    response.cookies.set(opts.name, anonId, opts);
  }
  return response;
}
