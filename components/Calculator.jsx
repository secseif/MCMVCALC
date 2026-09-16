"use client";

import { useState } from "react";
import {
  fmtBRL,
  fmtPct,
  fmtDecimal,
  parseBRLInput,
  simulateExtraAmortization,
} from "../lib/amortization";

const RENDA_LIMITE_PCT = 30; // regra da Caixa: parcela não pode passar de 30% da renda bruta familiar (SFH e Minha Casa Minha Vida)

export default function Calculator({ session, onLimitReached, onLoginRequired }) {
  const [imovel, setImovel] = useState("220.000,00");
  const [entrada, setEntrada] = useState("20.000,00");
  const [cet, setCet] = useState("8,00");
  const [n, setN] = useState(420);
  const [system, setSystem] = useState("SAC");
  const [renda, setRenda] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [remainingFree, setRemainingFree] = useState(null);

  // Amortização extra (simulada localmente, sem gastar simulação grátis —
  // é só uma outra visão do resultado que a pessoa já calculou).
  const [extraType, setExtraType] = useState("mensal");
  const [extraValue, setExtraValue] = useState("200,00");
  const [strategy, setStrategy] = useState("prazo");
  const [extraResult, setExtraResult] = useState(null);

  async function handleCalcular() {
    setError("");
    setLoading(true);
    setExtraResult(null);
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

  function handleSimularExtra() {
    if (!result) return;
    const val = parseBRLInput(extraValue);
    if (!(val > 0)) return;

    const sim = simulateExtraAmortization({
      pv: result.pv,
      cetAnual: parseBRLInput(cet) / 100,
      n: Number(n),
      system,
      extraType,
      extraValue: val,
      // "Reduzir parcela" só é aplicável a um aporte único (ver comentário
      // em lib/amortization.js); para aportes recorrentes o efeito é
      // sempre reduzir o prazo.
      strategy: extraType === "unico" ? strategy : "prazo",
    });
    setExtraResult(sim);
  }

  const rendaNum = parseBRLInput(renda);
  const comprometimentoPct =
    result && rendaNum > 0 ? (result.firstInstallment / rendaNum) * 100 : null;

  return (
    <div className="calc-wrap">
      <h1>🏠 Calculadora de parcelas — Minha Casa Minha Vida</h1>
      <p className="sub">
        Simule o financiamento pelo CET (Custo Efetivo Total) ao ano,
        comparando SAC e Tabela Price.
      </p>

      <div className="card">
        <h2><span className="h2-sep" />Dados do financiamento</h2>
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
          <div>
            <label>Renda mensal familiar (opcional)</label>
            <input
              value={renda}
              onChange={(e) => setRenda(e.target.value)}
              inputMode="decimal"
              placeholder="não obrigatório"
            />
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
            <h2><span className="h2-sep" />Taxa mensal</h2>
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
            <h2><span className="h2-sep" />Resultado</h2>
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

            {comprometimentoPct !== null && (
              <div className={`income-check ${comprometimentoPct <= RENDA_LIMITE_PCT ? "ok" : "warn"}`}>
                A 1ª parcela representa <strong>{fmtPct(comprometimentoPct, 1)}</strong> da renda
                mensal informada.{" "}
                {comprometimentoPct <= RENDA_LIMITE_PCT
                  ? `Isso fica dentro do limite de ${RENDA_LIMITE_PCT}% que a Caixa usa como teto de comprometimento de renda no SFH e no Minha Casa Minha Vida.`
                  : `Isso passa do limite de ${RENDA_LIMITE_PCT}% que a Caixa usa como teto de comprometimento de renda — na prática, esse financiamento provavelmente não seria aprovado com essa renda informada, a menos que a renda familiar seja composta com mais pessoas.`}
              </div>
            )}
          </div>

          <div className="card">
            <h2><span className="h2-sep" />Juros x amortização do saldo devedor</h2>
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
            <h2><span className="h2-sep" />Simular amortização extra</h2>
            <p className="note" style={{ marginBottom: 14 }}>
              Veja o quanto você consegue abater pagando um valor a mais além
              da parcela — todo mês, uma vez por ano (ex.: 13º salário) ou só
              uma vez.
            </p>

            <label>Tipo de aporte extra</label>
            <div className="extra-toggle">
              <button type="button" className={extraType === "mensal" ? "active" : ""} onClick={() => setExtraType("mensal")}>
                Todo mês
              </button>
              <button type="button" className={extraType === "anual" ? "active" : ""} onClick={() => setExtraType("anual")}>
                Uma vez por ano
              </button>
              <button type="button" className={extraType === "unico" ? "active" : ""} onClick={() => setExtraType("unico")}>
                Só uma vez
              </button>
            </div>

            <div className="grid" style={{ marginTop: 14 }}>
              <div>
                <label>Valor do aporte extra (R$)</label>
                <input value={extraValue} onChange={(e) => setExtraValue(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <label>O que fazer com o abatimento</label>
                <div className="extra-toggle">
                  <button type="button" className={strategy === "prazo" ? "active" : ""} onClick={() => setStrategy("prazo")}>
                    Reduzir prazo
                  </button>
                  <button
                    type="button"
                    className={strategy === "parcela" ? "active" : ""}
                    onClick={() => setStrategy("parcela")}
                    disabled={extraType !== "unico"}
                    title={extraType !== "unico" ? "Só disponível para um aporte único" : undefined}
                  >
                    Reduzir parcela
                  </button>
                </div>
                {extraType !== "unico" && (
                  <p className="note" style={{ marginTop: 6 }}>
                    Com aporte recorrente, o abatimento sempre reduz o prazo — "reduzir parcela" só se aplica a um aporte único.
                  </p>
                )}
              </div>
            </div>

            <button className="btn-primary btn-accent2" style={{ marginTop: 16 }} onClick={handleSimularExtra}>
              Simular abatimento
            </button>

            {extraResult && (
              <>
                <div className="compare-grid" style={{ marginTop: 18 }}>
                  <div className="compare-col before">
                    <h3>Sem aporte extra</h3>
                    <div className="compare-row"><span>Prazo</span><strong>{result.rows.length} meses</strong></div>
                    <div className="compare-row"><span>Total de juros</span><strong>{fmtBRL(result.totalJuros)}</strong></div>
                    <div className="compare-row"><span>Total pago</span><strong>{fmtBRL(result.totalPago)}</strong></div>
                  </div>
                  <div className="compare-col after">
                    <h3>Com aporte extra</h3>
                    <div className="compare-row"><span>Prazo</span><strong>{extraResult.mesesUsados} meses</strong></div>
                    <div className="compare-row"><span>Total de juros</span><strong>{fmtBRL(extraResult.totalJuros)}</strong></div>
                    <div className="compare-row"><span>Total pago</span><strong>{fmtBRL(extraResult.totalPago)}</strong></div>
                  </div>
                </div>

                <div className="savings-banner">
                  {strategy === "prazo" ? (
                    <>
                      Você quitaria o financiamento <strong>{result.rows.length - extraResult.mesesUsados} meses</strong> mais
                      cedo e economizaria <strong>{fmtBRL(result.totalJuros - extraResult.totalJuros)}</strong> em juros.
                    </>
                  ) : (
                    <>
                      Mantendo o mesmo prazo de {result.rows.length} meses, sua parcela cairia para{" "}
                      <strong>{fmtBRL(extraResult.ultimaParcela)}</strong> ao final da simulação, e você economizaria{" "}
                      <strong>{fmtBRL(result.totalJuros - extraResult.totalJuros)}</strong> em juros.
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h2><span className="h2-sep" />Tabela de amortização</h2>
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
