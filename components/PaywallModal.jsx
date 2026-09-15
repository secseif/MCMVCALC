"use client";

import { useState } from "react";

export default function PaywallModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payment/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Não foi possível iniciar o pagamento.");
      }
      // Redireciona para o Checkout do Mercado Pago (Pix, cartão etc.).
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Você usou suas 3 simulações grátis</h2>
        <p>
          Para continuar simulando, é preciso liberar o acesso pagando uma
          taxa única de <strong>R$ 1,00</strong> (via Pix ou cartão, pelo
          Mercado Pago). Depois do pagamento, você vai criar uma conta ou
          entrar na sua, para manter o acesso liberado.
        </p>
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>
            Agora não
          </button>
          <button className="btn-primary" onClick={handlePay} disabled={loading}>
            {loading ? "Abrindo pagamento…" : "Pagar R$ 1,00 e continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
