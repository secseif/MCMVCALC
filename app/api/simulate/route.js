import { NextResponse } from "next/server";
import { buildAmortizationTable } from "../../../lib/amortization";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getOrCreateAnonId, anonCookieOptions } from "../../../lib/anonId";

const FREE_LIMIT = 3;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { imovel, entrada, cetAnualPct, n, system } = body;

  if (
    !(Number(imovel) > 0) ||
    Number(entrada) < 0 ||
    Number(entrada) >= Number(imovel) ||
    !(Number(cetAnualPct) >= 0) ||
    !(Number(n) > 0) ||
    !["SAC", "Price"].includes(system)
  ) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  // system aqui só decide qual dos dois vem marcado como "ativo" na
  // resposta — calculamos SAC e Price juntos, para a comparação entre os
  // dois sistemas não custar uma segunda simulação grátis.

  const db = supabaseAdmin();

  // 1) Usuário autenticado? Se sim, sem limite de simulações.
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let userId = null;
  if (token) {
    const { data, error } = await db.auth.getUser(token);
    if (!error && data?.user) userId = data.user.id;
  }

  if (!userId) {
    // 2) Visitante anônimo: aplica o limite de 3 simulações grátis,
    //    e verifica se já pagou (mas ainda não fez login).
    const { id: anonId, isNew } = await getOrCreateAnonId();

    const { data: usage } = await db
      .from("anon_usage")
      .select("free_count, paid")
      .eq("id", anonId)
      .maybeSingle();

    const freeCount = usage?.free_count ?? 0;
    const paid = usage?.paid ?? false;

    if (paid) {
      // Pagou, mas o app exige login para continuar usando.
      return withAnonCookie(
        NextResponse.json({ error: "LOGIN_REQUIRED" }, { status: 401 }),
        anonId,
        isNew
      );
    }

    if (freeCount >= FREE_LIMIT) {
      return withAnonCookie(
        NextResponse.json({ error: "LIMIT_REACHED" }, { status: 402 }),
        anonId,
        isNew
      );
    }

    await db
      .from("anon_usage")
      .upsert(
        { id: anonId, free_count: freeCount + 1 },
        { onConflict: "id" }
      );

    const result = calc(imovel, entrada, cetAnualPct, n);
    return withAnonCookie(
      NextResponse.json({
        ...result,
        system,
        remainingFree: FREE_LIMIT - (freeCount + 1),
      }),
      anonId,
      isNew
    );
  }

  // Usuário logado: calcula sem restrição.
  const result = calc(imovel, entrada, cetAnualPct, n);
  return NextResponse.json({ ...result, system, remainingFree: null });
}

function calc(imovel, entrada, cetAnualPct, n) {
  const pv = Number(imovel) - Number(entrada);
  const cetAnual = Number(cetAnualPct) / 100;
  const nNum = Number(n);
  const sac = buildAmortizationTable(pv, cetAnual, nNum, "SAC");
  const price = buildAmortizationTable(pv, cetAnual, nNum, "Price");
  return { pv, sac, price };
}

function withAnonCookie(response, anonId, isNew) {
  if (isNew) {
    const opts = anonCookieOptions();
    response.cookies.set(opts.name, anonId, opts);
  }
  return response;
}
