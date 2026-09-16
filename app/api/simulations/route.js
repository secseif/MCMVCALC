import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getUserFromRequest } from "../../../lib/authUser";

// Histórico de simulações salvas — só para usuários logados. Cada usuário
// só vê e mexe nas próprias simulações (filtramos por user_id em toda
// consulta, já que a service_role key ignora as regras de RLS do banco).

export async function GET(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("simulations")
    .select("id, label, input, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erro ao listar simulações:", error);
    return NextResponse.json({ error: "Não foi possível carregar suas simulações." }, { status: 500 });
  }

  return NextResponse.json({ simulations: data });
}

export async function POST(request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { label, input, summary } = body;

  if (!input || !summary) {
    return NextResponse.json({ error: "Dados da simulação incompletos." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("simulations")
    .insert({
      user_id: user.id,
      label: label || null,
      input,
      summary,
    })
    .select("id, label, input, summary, created_at")
    .single();

  if (error) {
    console.error("Erro ao salvar simulação:", error);
    return NextResponse.json({ error: "Não foi possível salvar a simulação." }, { status: 500 });
  }

  return NextResponse.json({ simulation: data });
}
