import { NextResponse } from "next/server";
import { preferenceClient } from "../../../../lib/mercadopago";
import { getOrCreateAnonId, anonCookieOptions } from "../../../../lib/anonId";

export async function POST() {
  const { id: anonId, isNew } = await getOrCreateAnonId();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  try {
    const preference = await preferenceClient().create({
      body: {
        items: [
          {
            title: "Liberação de simulações extras — Calculadora MCMV",
            quantity: 1,
            unit_price: 1.0,
            currency_id: "BRL",
          },
        ],
        // Amarra o pagamento a este visitante anônimo, para o webhook
        // saber de quem liberar o acesso.
        external_reference: anonId,
        back_urls: {
          success: `${siteUrl}/?status=approved`,
          pending: `${siteUrl}/?status=pending`,
          failure: `${siteUrl}/?status=failure`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/payment/webhook`,
      },
    });

    const checkoutUrl = preference.init_point || preference.sandbox_init_point;

    const response = NextResponse.json({ checkoutUrl });
    if (isNew) {
      const opts = anonCookieOptions();
      response.cookies.set(opts.name, anonId, opts);
    }
    return response;
  } catch (err) {
    console.error("Erro ao criar preferência Mercado Pago:", err);
    return NextResponse.json(
      { error: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
