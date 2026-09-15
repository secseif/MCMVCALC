"use client";

import { useState } from "react";
import { fmtBRL, fmtPct, fmtDecimal, parseBRLInput } from "../lib/amortization";

export default function Calculator({ session, onLimitReached, onLoginRequired }) {
  const [imovel, setImovel] = useState("220.000,00");
  const [entrada, setEntrada] = useState("20.000,00");
  const [cet, setCet] = useState("8,00");
  const [n, setN] = useState(420);
  const [system, setSystem] = useState("SAC");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [remainingFree, setRemainingFree] = useState(null);

  async function handleCalcular() {
    setError("");
    setLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/simulate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          imovel: parseBRLInput(imovel),
          entrada: parseBRLInput(entrada),
          cetAnualPct: parseBRLInput(cet),
          n: Number(n),
          system,
        }),
      });

      const data = await res.json();

      if (res.status === 402 && data.error === "LIMIT_REACHED") {
        onLimitReached();
        return;
      }
      if (res.status === 401 && data.error === "LOGIN_REQUIRED") {
        onLoginRequired();
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível calcular.");
      }

      setResult(data);
      setRemainingFree(data.remainingFree);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="calc-wrap">
      <h1>🏠 Calculadora de parcelas — Minha Casa Minha Vida</h1>
      <p className="sub">
        Simule o financiamento pelo CET (Custo Efetivo Total) ao ano,
        comparando SAC e Tabela Price.
      </p>

      <div className="card">
        <h2>Dados do financiamento</h2>
        <div className="grid">
          <div>
            <label>Valor do imóvel (R$)</label>
            <input value={imovel} onChange={(e) => setImovel(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label>Entrada (R$)</label>
            <input value={entrada} onChange={(e) => setEntrada(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label>CET ao ano (%)</label>
            <input value={cet} onChange={(e) => setCet(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label>Prazo (meses)</label>
            <input type="number" value={n} onChange={(e) => setN(e.target.value)} min={1} max={480} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label>Sistema de amortização</label>
          <div className="system-toggle">
            <button
              type="button"
              className={system === "SAC" ? "active" : ""}
              onClick={() => setSystem("SAC")}
            >
              SAC (padrão Caixa/MCMV)
            </button>
            <button
              type="button"
              className={system === "Price" ? "active" : ""}
              onClick={() => setSystem("Price")}
            >
              Tabela Price
            </button>
          </div>
        </div>

        <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleCalcular} disabled={loading}>
          {loading ? "Calculando…" : "Calcular parcelas"}
        </button>

        {error && <p className="modal-error">{error}</p>}

        {remainingFree !== null && (
          <p className="note" style={{ marginTop: 10 }}>
            {remainingFree > 0
              ? `Você ainda tem ${remainingFree} simulação(ões) grátis.`
              : "Essa foi sua última simulação grátis."}
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="card">
            <h2>Taxa mensal</h2>
            <div className="rate-hero">
              <div>
                <div className="small">Taxa mensal equivalente ao CET</div>
                <div className="big">{fmtPct(result.iMensal * 100, 4)} a.m.</div>
              </div>
              <div>
                <div className="small">Em decimal (usado nas fórmulas)</div>
                <div className="big" style={{ fontSize: "1.15rem" }}>
                  {fmtDecimal(result.iMensal, 6)}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Resultado</h2>
            <div className="results">
              {system === "SAC" ? (
                <>
                  <Stat label="1ª parcela" value={fmtBRL(result.firstInstallment)} />
                  <Stat label="Última parcela" value={fmtBRL(result.lastInstallment)} />
                </>
              ) : (
                <Stat label="Parcela fixa" value={fmtBRL(result.firstInstallment)} />
              )}
              <Stat label="Total pago (principal + juros)" value={fmtBRL(result.totalPago)} />
              <Stat label="Total de juros" value={fmtBRL(result.totalJuros)} />
            </div>
          </div>

          <div className="card">
            <h2>Juros x amortização do saldo devedor</h2>
            <div className="breakdown-bar">
              <div
                className="seg-juros"
                style={{ width: `${(result.totalJuros / result.totalPago) * 100}%` }}
              />
              <div
                className="seg-amort"
                style={{ width: `${(result.totalAmort / result.totalPago) * 100}%` }}
              />
            </div>
            <div className="breakdown-legend">
              <span>
                <span className="dot juros" /> Juros pagos:{" "}
                <strong>
                  {fmtBRL(result.totalJuros)} ({fmtPct((result.totalJuros / result.totalPago) * 100, 1)})
                </strong>
              </span>
              <span>
                <span className="dot amort" /> Abatimento do saldo devedor:{" "}
                <strong>
                  {fmtBRL(result.totalAmort)} ({fmtPct((result.totalAmort / result.totalPago) * 100, 1)})
                </strong>
              </span>
            </div>
          </div>

          <div className="card">
            <h2>Tabela de amortização</h2>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Parcela</th>
                    <th>Juros</th>
                    <th>Amortização</th>
                    <th>Saldo devedor</th>
                  </tr>
                </thead>
                <tbody>
                  {(showFull ? result.rows : summaryRows(result.rows)).map((r, idx) =>
                    r === null ? (
                      <tr key={"gap-" + idx}>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>
                          ⋯
                        </td>
                      </tr>
                    ) : (
                      <tr key={r.mes}>
                        <td>{r.mes}</td>
                        <td>{fmtBRL(r.parcela)}</td>
                        <td>{fmtBRL(r.juros)}</td>
                        <td>{fmtBRL(r.amort)}</td>
                        <td>{fmtBRL(r.saldo)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
            <div className="tablefoot">
              <span className="note">
                {showFull
                  ? `Exibindo todos os ${result.rows.length} meses.`
                  : `Exibindo os 6 primeiros e 6 últimos meses de ${result.rows.length}.`}
              </span>
              <button className="btn-ghost" onClick={() => setShowFull(!showFull)}>
                {showFull ? "Mostrar resumo" : "Mostrar tabela completa"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function summaryRows(rows) {
  if (rows.length <= 12) return rows;
  return [...rows.slice(0, 6), null, ...rows.slice(rows.length - 6)];
}
