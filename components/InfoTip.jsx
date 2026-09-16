"use client";

import { useEffect, useRef, useState } from "react";
import { GLOSSARY } from "../lib/glossary";

/**
 * Botão "?" que abre uma explicação curta em linguagem simples. Usa clique
 * em vez de só hover para funcionar bem no celular também.
 */
export default function InfoTip({ term }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const entry = GLOSSARY[term];

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!entry) return null;

  return (
    <span className="infotip" ref={ref}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={`O que é ${entry.termo}?`}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <span className="infotip-popover" role="tooltip">
          <strong>{entry.termo}</strong>
          <span>{entry.definicao}</span>
        </span>
      )}
    </span>
  );
}
