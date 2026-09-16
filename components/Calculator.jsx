"use client";

import { useEffect, useState } from "react";
import {
  fmtBRL,
  fmtPct,
  fmtDecimal,
  parseBRLInput,
  simulateExtraAmortization,
} from "../lib/amortization";
import {
  maxAffordablePV,
  savingsPlan,
  rentVsBuy,
  mcmvFaixa,
  interestVsInsurance,
} from "../lib/finance";
import { downloadSimulationPDF } from "../lib/pdf";
import InfoTip from "./InfoTip";

const RENDA_LIMITE_PCT = 30; // regra da Caixa: parcela não pode passar de 30% da renda bruta familiar (SFH e Minha Casa Minha Vida)

export default function Calculator({ session, onLimitReached, onLoginRequired }) {
  // Dados do financiamento
  const [imovel, setImovel] = useState("220.000,00");
  const [entrada, setEntrada] = useState("20.000,00");
  const [cet, setCet] = useState("8,00");
  const [nominalAnual, setNominalAnual] = useState(""); // opcional, para separar juro puro x encargos
  const [n, setN] = useState(420);
  const [system, setSystem] = useState("SAC");

  // Renda (composição de até 3 pessoas) + outras dívidas
  const [renda1, setRenda1] = useState("");
  const [renda2, setRenda2] = useState("");
  const [renda3, setRenda3] = useState("");
  const [outrasDividas, setOutrasDividas] = useState("");

  // Capital inicial (custos extras da compra)
  const [itbiPct, setItbiPct] = useState("3,00");
  const [custosCartorio, setCustosCartorio] = useState("3.000,00");
  const [fgtsDisponivel, setFgtsDisponivel] = useState("");

  // Meta de poupança para a entrada
  const [metaEntrada, setMetaEntrada] = useState("20.000,00");
  const [prazoParaJuntar, setPrazoParaJuntar] = useState(24);
  const [rendimentoPoupanca, setRendimentoPoupanca] = useState("0,50");

  // Alugar x financiar
  const [aluguelMensal, setAluguelMensal] = useState("");
  const [rendimentoInvestimento, setRendimentoInvestimento] = useState("0,50");

  // Resultado principal
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [remainingFree, setRemainingFree] = useState(null);

  // Amortização extra
  const [extraType, setExtraType] = useState("mensal");
  const [extraValue, setExtraValue] = useState("200,00");
  const [strategy, setStrategy] = useState("prazo");
  const [intervaloMeses, setIntervaloMeses] = useState(24);
  const [extraResult, setExtraResult] = useState(null);

  // Simulações salvas (usuário logado)
  const [savedSimulations, setSavedSimulations] = useState([]);
  const [savingSim, setSavingSim] = useState(false);
  const [simLabel, setSimLabel] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!session?.access_token) {
      setSavedSimulations([]);
      return;
    }
    fetchSavedSimulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  async function fetchSavedSimulations() {
    try {
      const res = await fetch("/api/simulations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) setSavedSimulations(data.simulations || []);
    } catch {
      // silencioso — não é crítico pra experiência principal
    }
  }

  async function handleCalcular() {
    setError("");
    setLoading(true);
    setExtraResult(null);
    setSavedMsg("");
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
      strategy: extraType === "unico" ? strategy : "prazo",
      intervaloMeses: extraType === "personalizado" ? Number(intervaloMeses) : undefined,
    });
    setExtraResult(sim);
  }

  function usarPresetFgts() {
    setExtraType("personalizado");
    setIntervaloMeses(24);
    const fgtsNum = parseBRLInput(fgtsDisponivel);
    if (fgtsNum > 0) setExtraValue(fgtsNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
  }

  async function handleSalvarSimulacao() {
    if (!result || !session?.access_token) return;
    setSavingSim(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          label: simLabel || null,
          input: { imovel, entrada, cet, n, system },
          summary: {
            firstInstallment: active.firstInstallment,
            lastInstallment: active.lastInstallment,
            totalPago: active.totalPago,
            totalJuros: active.totalJuros,
            iMensal: active.iMensal,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
      setSavedMsg("Simulação salva!");
      setSimLabel("");
      fetchSavedSimulations();
    } catch (e) {
      setSavedMsg(e.message);
    } finally {
      setSavingSim(false);
    }
  }

  async function handleApagarSimulacao(id) {
    if (!session?.access_token) return;
    try {
      await fetch(`/api/simulations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setSavedSimulations((list) => list.filter((s) => s.id !== id));
    } catch {
      // silencioso
    }
  }

  function handleBaixarPDF() {
    if (!result) return;
    downloadSimulationPDF({
      imovelNum: parseBRLInput(imovel),
      entradaNum: parseBRLInput(entrada),
      pv: result.pv,
      cetAnualPct: parseBRLInput(cet),
      n: Number(n),
      system,
      rendaTotal,
      iMensal: active.iMensal,
      firstInstallment: active.firstInstallment,
      lastInstallment: active.lastInstallment,
      totalPago: active.totalPago,
      totalJuros: active.totalJuros,
      comprometimentoPct,
      extra: extraResult
        ? {
            tipoLabel: extraTypeLabel(extraType),
            valor: parseBRLInput(extraValue),
            strategyLabel: extraType === "unico" && strategy === "parcela" ? "Reduzir parcela" : "Reduzir prazo",
            mesesUsados: extraResult.mesesUsados,
            economiaJuros: active.totalJuros - extraResult.totalJuros,
          }
        : null,
    });
  }

  // ---- Derivados ----
  const active = result ? (system === "SAC" ? result.sac : result.price) : null;

  const rendaTotal =
    (parseBRLInput(renda1) || 0) + (parseBRLInput(renda2) || 0) + (parseBRLInput(renda3) || 0);
  const outrasDividasNum = parseBRLInput(outrasDividas) || 0;
  const faixa = mcmvFaixa(rendaTotal);

  const comprometimentoPct =
    active && rendaTotal > 0 ? (active.firstInstallment / rendaTotal) * 100 : null;
  const comprometimentoTotalPct =
    active && rendaTotal > 0 && outrasDividasNum > 0
      ? ((active.firstInstallment + outrasDividasNum) / rendaTotal) * 100
      : null;

  const reverseCalc =
    rendaTotal > 0
      ? maxAffordablePV({
          rendaMensal: rendaTotal,
          cetAnual: parseBRLInput(cet) / 100 || 0,
          n: Number(n) || 1,
          system,
        })
      : null;

  const imovelNum = parseBRLInput(imovel) || 0;
  const entradaNum = parseBRLInput(entrada) || 0;
  const itbiValor = imovelNum * (parseBRLInput(itbiPct) / 100 || 0);
  const custosCartorioNum = parseBRLInput(custosCartorio) || 0;
  const fgtsNum = parseBRLInput(fgtsDisponivel) || 0;
  const capitalNecessario = entradaNum + itbiValor + custosCartorioNum;
  const capitalAposFgts = Math.max(capitalNecessario - fgtsNum, 0);

  const savingsResult =
    parseBRLInput(metaEntrada) > 0 && Number(prazoParaJuntar) > 0
      ? savingsPlan({
          metaEntrada: parseBRLInput(metaEntrada),
          prazoMeses: Number(prazoParaJuntar),
          rendimentoMensalPct: parseBRLInput(rendimentoPoupanca) || 0,
        })
      : null;

  const rentCompare =
    active && parseBRLInput(aluguelMensal) > 0
      ? rentVsBuy({
          parcela: active.firstInstallment,
          aluguelMensal: parseBRLInput(aluguelMensal),
          n: Number(n),
          rendimentoMensalPct: parseBRLInput(rendimentoInvestimento) || 0,
          valorImovel: imovelNum,
        })
      : null;

  const nominalAnualNum = parseBRLInput(nominalAnual);
  const breakdown =
    active && nominalAnualNum >= 0 && !isNaN(nominalAnualNum)
      ? interestVsInsurance({
          pv: result.pv,
          cetAnual: parseBRLInput(cet) / 100,
          nominalAnual: nominalAnualNum / 100,
          n: Number(n),
          system,
        })
      : null;

  return (
    <div className="calc-wrap">
      <h1>🏠 Calculadora de parcelas — Minha Casa Minha Vida</h1>
      <p className="sub">
        Simule o financiamento pelo CET (Custo Efetivo Total) ao ano, comparando SAC e Tabela Price
        — e use as ferramentas abaixo para planejar antes de assinar contrato.
      </p>

      {/* SUA RENDA */}
      <div className="card">
        <h2><span className="h2-sep" />Sua renda (opcional)</h2>
        <p className="note" style={{ marginBottom: 12 }}>
          Preencher isso libera o alerta de comprometimento de renda, a faixa do MCMV e o cálculo
          de quanto imóvel você consegue financiar. Nada aqui é obrigatório.
        </p>
        <div className="grid">
          <div>
            <label>Renda 1 (R$)</label>
            <input value={renda1} onChange={(e) => setRenda1(e.target.value)} inputMode="decimal" placeholder="opcional" />
          </div>
          <div>
            <label>Renda 2 (R$)</label>
            <input value={renda2} onChange={(e) => setRenda2(e.target.value)} inputMode="decimal" placeholder="opcional" />
          </div>
          <div>
            <label>Renda 3 (R$)</label>
            <input value={renda3} onChange={(e) => setRenda3(e.target.value)} inputMode="decimal" placeholder="opcional" />
          </div>
          <div>
            <label>Outras dívidas mensais (R$)</label>
            <input value={outrasDividas} onChange={(e) => setOutrasDividas(e.target.value)} inputMode="decimal" placeholder="opcional" />
          </div>
        </div>

        {rendaTotal > 0 && (
          <div className="income-check ok" style={{ marginTop: 14 }}>
            Renda familiar total: <strong>{fmtBRL(rendaTotal)}</strong>.{" "}
            {faixa && (
              <>
                Isso se enquadraria na <strong>{faixa.label}</strong> do Minha Casa Minha Vida{" "}
                <InfoTip term="faixaMcmv" />.
              </>
            )}
          </div>
        )}
      </div>

      {/* QUANTO POSSO FINANCIAR */}
      {rendaTotal > 0 && reverseCalc && (
        <div className="card">
          <h2><span className="h2-sep" />Quanto imóvel você consegue financiar?</h2>
          <p className="note" style={{ marginBottom: 12 }}>
            Com base na sua renda, no CET e no prazo preenchidos abaixo, mantendo a parcela dentro
            de {RENDA_LIMITE_PCT}% da renda <InfoTip term="comprometimentoRenda" />.
          </p>
          <div className="results">
            <Stat label="Parcela máxima recomendada" value={fmtBRL(reverseCalc.parcelaMax)} />
            <Stat label="Valor máximo financiável" value={fmtBRL(reverseCalc.pvMax)} />
            <Stat label="+ entrada atual = imóvel máximo" value={fmtBRL(reverseCalc.pvMax + entradaNum)} />
          </div>
        </div>
      )}

      {/* DADOS DO FINANCIAMENTO */}
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
            <label>CET ao ano (%) <InfoTip term="cet" /></label>
            <input value={cet} onChange={(e) => setCet(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label>Prazo (meses)</label>
            <input type="number" value={n} onChange={(e) => setN(e.target.value)} min={1} max={480} />
          </div>
          <div>
            <label>Taxa de juros nominal ao ano (opcional)</label>
            <input value={nominalAnual} onChange={(e) => setNominalAnual(e.target.value)} inputMode="decimal" placeholder="p/ separar juro x seguro" />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label>Sistema de amortização <InfoTip term="sac" /> <InfoTip term="price" /></label>
          <div className="system-toggle">
            <button type="button" className={system === "SAC" ? "active" : ""} onClick={() => setSystem("SAC")}>
              SAC (padrão Caixa/MCMV)
            </button>
            <button type="button" className={system === "Price" ? "active" : ""} onClick={() => setSystem("Price")}>
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

      {/* CAPITAL INICIAL NECESSÁRIO */}
      {imovelNum > 0 && (
        <div className="card">
          <h2><span className="h2-sep" />Capital inicial necessário</h2>
          <p className="note" style={{ marginBottom: 12 }}>
            Além da entrada, a compra tem custos extras que costumam pegar as pessoas de surpresa.
          </p>
          <div className="grid">
            <div>
              <label>ITBI da sua cidade (%) <InfoTip term="itbi" /></label>
              <input value={itbiPct} onChange={(e) => setItbiPct(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label>Escritura + registro (R$)</label>
              <input value={custosCartorio} onChange={(e) => setCustosCartorio(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label>FGTS disponível (opcional) <InfoTip term="fgts" /></label>
              <input value={fgtsDisponivel} onChange={(e) => setFgtsDisponivel(e.target.value)} inputMode="decimal" placeholder="opcional" />
            </div>
          </div>
          <div className="results" style={{ marginTop: 14 }}>
            <Stat label="ITBI estimado" value={fmtBRL(itbiValor)} />
            <Stat label="Entrada + ITBI + cartório" value={fmtBRL(capitalNecessario)} />
            <Stat label="Depois de usar o FGTS" value={fmtBRL(capitalAposFgts)} />
          </div>
        </div>
      )}

      {/* META DE POUPANÇA */}
      <div className="card">
        <h2><span className="h2-sep" />Quanto guardar por mês para juntar a entrada</h2>
        <div className="grid">
          <div>
            <label>Meta de valor a juntar (R$)</label>
            <input value={metaEntrada} onChange={(e) => setMetaEntrada(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label>Prazo para juntar (meses)</label>
            <input type="number" value={prazoParaJuntar} onChange={(e) => setPrazoParaJuntar(e.target.value)} min={1} />
          </div>
          <div>
            <label>Rendimento mensal estimado (%)</label>
            <input value={rendimentoPoupanca} onChange={(e) => setRendimentoPoupanca(e.target.value)} inputMode="decimal" placeholder="ex.: poupança" />
          </div>
        </div>
        {savingsResult && (
          <div className="results" style={{ marginTop: 14 }}>
            <Stat label="Depósito mensal necessário" value={fmtBRL(savingsResult.depositoMensal)} />
            <Stat label="Total depositado" value={fmtBRL(savingsResult.totalDepositado)} />
            <Stat label="Rendimento ganho" value={fmtBRL(savingsResult.rendimentoGanho)} />
          </div>
        )}
      </div>

      {result && (
        <>
          {/* TAXA MENSAL + JUROS x ENCARGOS */}
          <div className="card">
            <h2><span className="h2-sep" />Taxa mensal</h2>
            <div className="rate-hero">
              <div>
                <div className="small">Taxa mensal equivalente ao CET</div>
                <div className="big">{fmtPct(active.iMensal * 100, 4)} a.m.</div>
              </div>
              <div>
                <div className="small">Em decimal (usado nas fórmulas)</div>
                <div className="big" style={{ fontSize: "1.15rem" }}>{fmtDecimal(active.iMensal, 6)}</div>
              </div>
            </div>
            {breakdown && (
              <div className="income-check ok" style={{ marginTop: 14 }}>
                Do total de <strong>{fmtBRL(breakdown.totalJurosCET)}</strong> em juros, cerca de{" "}
                <strong>{fmtBRL(breakdown.totalJurosPuro)}</strong> é juro puro (pela taxa nominal
                informada) e <strong>{fmtBRL(breakdown.totalEncargosAprox)}</strong> é a estimativa
                de seguro + tarifas embutidos no CET. É uma aproximação — só o contrato tem a
                composição exata.
              </div>
            )}
          </div>

          {/* COMPARAR SAC x PRICE */}
          <div className="card">
            <h2><span className="h2-sep" />Comparar SAC x Tabela Price</h2>
            <div className="compare-grid">
              <div className={`compare-col ${system === "SAC" ? "after" : "before"}`}>
                <h3>SAC {system === "SAC" && "(selecionado)"}</h3>
                <div className="compare-row"><span>1ª parcela</span><strong>{fmtBRL(result.sac.firstInstallment)}</strong></div>
                <div className="compare-row"><span>Última parcela</span><strong>{fmtBRL(result.sac.lastInstallment)}</strong></div>
                <div className="compare-row"><span>Total de juros</span><strong>{fmtBRL(result.sac.totalJuros)}</strong></div>
                <div className="compare-row"><span>Total pago</span><strong>{fmtBRL(result.sac.totalPago)}</strong></div>
              </div>
              <div className={`compare-col ${system === "Price" ? "after" : "before"}`}>
                <h3>Tabela Price {system === "Price" && "(selecionado)"}</h3>
                <div className="compare-row"><span>Parcela fixa</span><strong>{fmtBRL(result.price.firstInstallment)}</strong></div>
                <div className="compare-row"><span>&nbsp;</span><strong>&nbsp;</strong></div>
                <div className="compare-row"><span>Total de juros</span><strong>{fmtBRL(result.price.totalJuros)}</strong></div>
                <div className="compare-row"><span>Total pago</span><strong>{fmtBRL(result.price.totalPago)}</strong></div>
              </div>
            </div>
            <div className="tablefoot">
              <span className="note">Os dois já foram calculados — trocar o sistema acima não gasta outra simulação.</span>
            </div>
          </div>

          {/* RESULTADO */}
          <div className="card">
            <h2><span className="h2-sep" />Resultado</h2>
            <div className="results">
              {system === "SAC" ? (
                <>
                  <Stat label="1ª parcela" value={fmtBRL(active.firstInstallment)} />
                  <Stat label="Última parcela" value={fmtBRL(active.lastInstallment)} />
                </>
              ) : (
                <Stat label="Parcela fixa" value={fmtBRL(active.firstInstallment)} />
              )}
              <Stat label="Total pago (principal + juros)" value={fmtBRL(active.totalPago)} />
              <Stat label="Total de juros" value={fmtBRL(active.totalJuros)} />
            </div>

            {comprometimentoPct !== null && (
              <div className={`income-check ${comprometimentoPct <= RENDA_LIMITE_PCT ? "ok" : "warn"}`}>
                A 1ª parcela representa <strong>{fmtPct(comprometimentoPct, 1)}</strong> da renda
                mensal informada <InfoTip term="comprometimentoRenda" />.{" "}
                {comprometimentoPct <= RENDA_LIMITE_PCT
                  ? `Isso fica dentro do limite de ${RENDA_LIMITE_PCT}% que a Caixa usa como teto de comprometimento de renda no SFH e no Minha Casa Minha Vida.`
                  : `Isso passa do limite de ${RENDA_LIMITE_PCT}% — na prática, esse financiamento provavelmente não seria aprovado com essa renda, a menos que a renda familiar seja composta com mais pessoas.`}
              </div>
            )}
            {comprometimentoTotalPct !== null && (
              <div className={`income-check ${comprometimentoTotalPct <= RENDA_LIMITE_PCT ? "ok" : "warn"}`} style={{ marginTop: 10 }}>
                Somando a parcela com suas outras dívidas mensais, o comprometimento total sobe
                para <strong>{fmtPct(comprometimentoTotalPct, 1)}</strong> da renda — isso é uma
                checagem do seu orçamento pessoal, não o critério oficial do banco (que olha só a
                parcela do imóvel).
              </div>
            )}

            <div className="tablefoot" style={{ marginTop: 16 }}>
              <button className="btn-ghost" onClick={handleBaixarPDF}>Baixar PDF desta simulação</button>
              {session ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    value={simLabel}
                    onChange={(e) => setSimLabel(e.target.value)}
                    placeholder="nome (opcional)"
                    style={{ width: 160 }}
                  />
                  <button className="btn-ghost" onClick={handleSalvarSimulacao} disabled={savingSim}>
                    {savingSim ? "Salvando…" : "Salvar esta simulação"}
                  </button>
                </div>
              ) : (
                <span className="note">Entre na sua conta para salvar simulações e comparar depois.</span>
              )}
            </div>
            {savedMsg && <p className="note" style={{ marginTop: 8 }}>{savedMsg}</p>}
          </div>

          {/* JUROS x AMORTIZAÇÃO */}
          <div className="card">
            <h2><span className="h2-sep" />Juros x amortização do saldo devedor</h2>
            <div className="breakdown-bar">
              <div className="seg-juros" style={{ width: `${(active.totalJuros / active.totalPago) * 100}%` }} />
              <div className="seg-amort" style={{ width: `${(active.totalAmort / active.totalPago) * 100}%` }} />
            </div>
            <div className="breakdown-legend">
              <span>
                <span className="dot juros" /> Juros pagos:{" "}
                <strong>{fmtBRL(active.totalJuros)} ({fmtPct((active.totalJuros / active.totalPago) * 100, 1)})</strong>
              </span>
              <span>
                <span className="dot amort" /> Abatimento do saldo devedor <InfoTip term="amortizacao" />:{" "}
                <strong>{fmtBRL(active.totalAmort)} ({fmtPct((active.totalAmort / active.totalPago) * 100, 1)})</strong>
              </span>
            </div>
          </div>

          {/* AMORTIZAÇÃO EXTRA */}
          <div className="card">
            <h2><span className="h2-sep" />Simular amortização extra <InfoTip term="amortizacaoExtra" /></h2>
            <p className="note" style={{ marginBottom: 14 }}>
              Veja o quanto você consegue abater pagando um valor a mais além da parcela.
            </p>

            <label>Tipo de aporte extra</label>
            <div className="extra-toggle">
              <button type="button" className={extraType === "mensal" ? "active" : ""} onClick={() => setExtraType("mensal")}>Todo mês</button>
              <button type="button" className={extraType === "anual" ? "active" : ""} onClick={() => setExtraType("anual")}>Uma vez por ano</button>
              <button type="button" className={extraType === "unico" ? "active" : ""} onClick={() => setExtraType("unico")}>Só uma vez</button>
              <button type="button" className={extraType === "personalizado" ? "active" : ""} onClick={() => setExtraType("personalizado")}>A cada X meses</button>
            </div>
            <button type="button" className="link-btn" onClick={usarPresetFgts} style={{ marginTop: 8 }}>
              Usar como saque do FGTS (a cada 24 meses) <InfoTip term="fgts" />
            </button>

            <div className="grid" style={{ marginTop: 14 }}>
              <div>
                <label>Valor do aporte extra (R$)</label>
                <input value={extraValue} onChange={(e) => setExtraValue(e.target.value)} inputMode="decimal" />
              </div>
              {extraType === "personalizado" && (
                <div>
                  <label>A cada quantos meses</label>
                  <input type="number" value={intervaloMeses} onChange={(e) => setIntervaloMeses(e.target.value)} min={1} />
                </div>
              )}
              <div>
                <label>O que fazer com o abatimento</label>
                <div className="extra-toggle">
                  <button type="button" className={strategy === "prazo" ? "active" : ""} onClick={() => setStrategy("prazo")}>Reduzir prazo</button>
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
                    Com aporte recorrente, o abatimento sempre reduz o prazo.
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
                    <div className="compare-row"><span>Prazo</span><strong>{active.rows.length} meses</strong></div>
                    <div className="compare-row"><span>Total de juros</span><strong>{fmtBRL(active.totalJuros)}</strong></div>
                    <div className="compare-row"><span>Total pago</span><strong>{fmtBRL(active.totalPago)}</strong></div>
                  </div>
                  <div className="compare-col after">
                    <h3>Com aporte extra</h3>
                    <div className="compare-row"><span>Prazo</span><strong>{extraResult.mesesUsados} meses</strong></div>
                    <div className="compare-row"><span>Total de juros</span><strong>{fmtBRL(extraResult.totalJuros)}</strong></div>
                    <div className="compare-row"><span>Total pago</span><strong>{fmtBRL(extraResult.totalPago)}</strong></div>
                  </div>
                </div>
                <div className="savings-banner">
                  {strategy === "prazo" || extraType !== "unico" ? (
                    <>
                      Você quitaria o financiamento <strong>{active.rows.length - extraResult.mesesUsados} meses</strong> mais
                      cedo e economizaria <strong>{fmtBRL(active.totalJuros - extraResult.totalJuros)}</strong> em juros.
                    </>
                  ) : (
                    <>
                      Mantendo o mesmo prazo de {active.rows.length} meses, sua parcela cairia para{" "}
                      <strong>{fmtBRL(extraResult.ultimaParcela)}</strong> ao final da simulação, e você
                      economizaria <strong>{fmtBRL(active.totalJuros - extraResult.totalJuros)}</strong> em juros.
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ALUGAR X FINANCIAR */}
          <div className="card">
            <h2><span className="h2-sep" />Alugar ou financiar?</h2>
            <p className="note" style={{ marginBottom: 12 }}>
              Comparação simplificada: não considera valorização do imóvel, reajuste do aluguel,
              IPTU/condomínio nem manutenção — é só um ponto de partida para pensar no assunto.
            </p>
            <div className="grid">
              <div>
                <label>Aluguel mensal atual (R$)</label>
                <input value={aluguelMensal} onChange={(e) => setAluguelMensal(e.target.value)} inputMode="decimal" placeholder="opcional" />
              </div>
              <div>
                <label>Rendimento mensal se investir a diferença (%)</label>
                <input value={rendimentoInvestimento} onChange={(e) => setRendimentoInvestimento(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            {rentCompare && (
              <div className="compare-grid" style={{ marginTop: 16 }}>
                <div className="compare-col before">
                  <h3>Continuar alugando</h3>
                  <div className="compare-row"><span>Diferença mensal investida</span><strong>{fmtBRL(Math.max(rentCompare.diferenca, 0))}</strong></div>
                  <div className="compare-row"><span>Patrimônio investido ao final</span><strong>{fmtBRL(rentCompare.patrimonioInvestindo)}</strong></div>
                  <div className="compare-row"><span>Imóvel próprio?</span><strong>Não</strong></div>
                </div>
                <div className="compare-col after">
                  <h3>Financiar</h3>
                  <div className="compare-row"><span>Parcela mensal</span><strong>{fmtBRL(active.firstInstallment)}</strong></div>
                  <div className="compare-row"><span>Valor do imóvel ao quitar</span><strong>{fmtBRL(rentCompare.patrimonioImovel)}</strong></div>
                  <div className="compare-row"><span>Imóvel próprio?</span><strong>Sim, ao final do prazo</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* TABELA */}
          <div className="card">
            <h2><span className="h2-sep" />Tabela de amortização</h2>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Mês</th><th>Parcela</th><th>Juros</th><th>Amortização</th><th>Saldo devedor <InfoTip term="saldoDevedor" /></th>
                  </tr>
                </thead>
                <tbody>
                  {(showFull ? active.rows : summaryRows(active.rows)).map((r, idx) =>
                    r === null ? (
                      <tr key={"gap-" + idx}>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>⋯</td>
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
                {showFull ? `Exibindo todos os ${active.rows.length} meses.` : `Exibindo os 6 primeiros e 6 últimos meses de ${active.rows.length}.`}
              </span>
              <button className="btn-ghost" onClick={() => setShowFull(!showFull)}>
                {showFull ? "Mostrar resumo" : "Mostrar tabela completa"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* MINHAS SIMULAÇÕES */}
      {session && (
        <div className="card">
          <h2><span className="h2-sep" />Minhas simulações salvas</h2>
          {savedSimulations.length === 0 ? (
            <p className="note">Você ainda não salvou nenhuma simulação.</p>
          ) : (
            <div className="sim-list">
              {savedSimulations.map((s) => (
                <div key={s.id} className="sim-item">
                  <div>
                    <strong>{s.label || "Simulação"}</strong>
                    <div className="note">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")} — {fmtBRL(s.summary.firstInstallment)}/mês,{" "}
                      {s.input.n} meses, {s.input.system}
                    </div>
                  </div>
                  <button className="btn-ghost" onClick={() => handleApagarSimulacao(s.id)}>Apagar</button>
                </div>
              ))}
            </div>
          )}
        </div>
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

function extraTypeLabel(type) {
  if (type === "mensal") return "Todo mês";
  if (type === "anual") return "Uma vez por ano";
  if (type === "unico") return "Só uma vez";
  return "Personalizado";
}
