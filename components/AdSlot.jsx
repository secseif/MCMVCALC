"use client";

import { useEffect, useRef } from "react";

/**
 * Espaço reservado para anúncios (Google AdSense).
 *
 * Antes de ter uma conta AdSense aprovada para o seu domínio, isto
 * renderiza só uma placa "Espaço para anúncio" — não inventa cliques nem
 * carrega nada de rede alguma. Assim que você preencher
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID e o slot correspondente no .env, o bloco
 * <ins class="adsbygoogle"> passa a ser real e o script do AdSense (já
 * carregado 1x em app/layout.js) o preenche sozinho.
 */
export default function AdSlot({ position }) {
  const insRef = useRef(null);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slot =
    position === "left"
      ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEFT
      : process.env.NEXT_PUBLIC_ADSENSE_SLOT_RIGHT;

  const configured = Boolean(clientId && slot);

  useEffect(() => {
    if (!configured) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // O script do AdSense ainda pode não ter carregado; sem problema,
      // ele mesmo tenta de novo quando terminar de carregar.
    }
  }, [configured]);

  if (!configured) {
    return (
      <div className="ad-slot ad-slot-placeholder" aria-hidden="true">
        <span>Espaço para anúncio</span>
      </div>
    );
  }

  return (
    <div className="ad-slot">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "160px", height: "600px" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-full-width-responsive="false"
      />
    </div>
  );
}
