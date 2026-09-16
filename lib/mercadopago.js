import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "Mercado Pago não configurado: defina MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente (Vercel > Settings > Environment Variables)."
    );
  }
  return new MercadoPagoConfig({ accessToken });
}

export function preferenceClient() {
  return new Preference(client());
}

export function paymentClient() {
  return new Payment(client());
}
