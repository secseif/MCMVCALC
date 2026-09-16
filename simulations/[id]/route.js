import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getUserFromRequest } from "../../../../lib/authUser";

export async function DELETE(request, { params }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  // O filtro por user_id garante que ninguém apague a simulação de outra
  // pessoa mesmo sabendo o id.
  const { error } = await db.from("simulations").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    console.error("Erro ao apagar simulação:", error);
    return NextResponse.json({ error: "Não foi possível apagar a simulação." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
