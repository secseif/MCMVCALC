import { NextResponse } from "next/server";
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { paymentClient } from "../../../../lib/mercadopago";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// Webhook do Mercado Pago. Ele é a única fonte de verdade sobre o
// pagamento ter sido aprovado de verdade — nunca confie apenas no
// redirecionamento do navegador (?status=approved), que pode ser forjado
// por qualquer pessoa só editando a URL.
export async function POST(request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));

  const paymentId =
    body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
  const type = body?.type || url.searchParams.get("type") || url.searchParams.get("topic");

  if (!paymentId || type !== "payment") {
    // Outros tipos de evento (ex.: merchant_order) são ignorados.
    return NextResponse.json({ received: true });
  }

  if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId: url.searchParams.get("data.id") || String(paymentId),
        secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
        toleranceSeconds: 300,
      });
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) {
        console.warn("Assinatura do webhook do Mercado Pago inválida:", err.reason);
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
      throw err;
    }
  } else {
    console.warn(
      "MERCADOPAGO_WEBHOOK_SECRET não configurado: a assinatura do webhook não está sendo validada. Configure antes de ir para produção."
    );
  }

  try {
    const payment = await paymentClient().get({ id: paymentId });
    const status = payment.status; // 'approved' | 'pending' | 'rejected' | ...
    const anonId = payment.external_reference;

    const db = supabaseAdmin();

    await db.from("payments").upsert(
      {
        id: String(paymentId),
        anon_id: anonId,
        status,
        amount: payment.transaction_amount,
      },
      { onConflict: "id" }
    );

    if (status === "approved" && anonId) {
      await db
        .from("anon_usage")
        .upsert({ id: anonId, paid: true }, { onConflict: "id" });
    }
  } catch (err) {
    console.error("Erro ao processar webhook do Mercado Pago:", err);
    // Ainda respondemos 200 para o MP não ficar reenviando indefinidamente
    // por um erro que já foi logado para investigação manual.
  }

  return NextResponse.json({ received: true });
}
