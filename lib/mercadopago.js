import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

function client() {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  });
}

export function preferenceClient() {
  return new Preference(client());
}

export function paymentClient() {
  return new Payment(client());
}
