"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AdSlot from "../components/AdSlot";
import Calculator from "../components/Calculator";
import PaywallModal from "../components/PaywallModal";
import AuthModal from "../components/AuthModal";

export default function Home() {
  const [session, setSession] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        setShowAuth(false);
        setShowPaywall(false);
      }
    });

    // Se o visitante acabou de voltar do Checkout do Mercado Pago
    // (?status=approved na URL), confere no servidor se o pagamento
    // já foi confirmado pelo webhook e, se sim, pede login/cadastro.
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "approved") {
      fetch("/api/payment/status")
        .then((r) => r.json())
        .then((d) => {
          if (d.paid) setShowAuth(true);
        })
        .catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="page-shell">
      <AdSlot position="left" />

      <div style={{ width: "100%", maxWidth: 880 }}>
        <div className="topbar">
          {session ? (
            <>
              <span>Conectado como {session.user.email}</span>
              <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>
                Sair
              </button>
            </>
          ) : null}
        </div>

        <Calculator
          session={session}
          onLimitReached={() => setShowPaywall(true)}
          onLoginRequired={() => setShowAuth(true)}
        />

        <footer className="note" style={{ textAlign: "center", marginTop: 24 }}>
          Simulação educativa — CET convertido pela fórmula de juros
          compostos. O valor real depende das condições do seu contrato.
        </footer>
      </div>

      <AdSlot position="right" />

      {showPaywall && !session && (
        <PaywallModal onClose={() => setShowPaywall(false)} />
      )}
      {showAuth && !session && (
        <AuthModal
          onAuthenticated={(sess) => {
            setSession(sess);
            setShowAuth(false);
          }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
