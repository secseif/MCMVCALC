// Cálculo de financiamento habitacional (SAC e Tabela Price) a partir do
// CET (Custo Efetivo Total) anual, seguindo a mesma lógica usada na
// calculadora original: a taxa mensal equivalente é obtida por juros
// compostos -> i_mensal = (1 + CET_anual)^(1/12) - 1.

export function monthlyRateFromCET(cetAnual) {
  return Math.pow(1 + cetAnual, 1 / 12) - 1;
}

/**
 * Gera a tabela de amortização completa.
 * @param {number} pv - valor financiado (valor do imóvel - entrada)
 * @param {number} cetAnual - CET ao ano, em decimal (ex.: 0.08 para 8%)
 * @param {number} n - prazo em meses
 * @param {'SAC'|'Price'} system
 */
export function buildAmortizationTable(pv, cetAnual, n, system) {
  const iMensal = monthlyRateFromCET(cetAnual);
  const rows = [];
  let totalJuros = 0;
  let saldo = pv;

  if (system === "SAC") {
    const amort = pv / n;
    for (let mes = 1; mes <= n; mes++) {
      const juros = saldo * iMensal;
      const parcela = amort + juros;
      totalJuros += juros;
      saldo -= amort;
      rows.push({ mes, parcela, juros, amort, saldo: Math.max(saldo, 0) });
    }
  } else {
    const pmt =
      (pv * (iMensal * Math.pow(1 + iMensal, n))) /
      (Math.pow(1 + iMensal, n) - 1);
    for (let mes = 1; mes <= n; mes++) {
      const juros = saldo * iMensal;
      const amort = pmt - juros;
      totalJuros += juros;
      saldo -= amort;
      rows.push({ mes, parcela: pmt, juros, amort, saldo: Math.max(saldo, 0) });
    }
  }

  const totalPago = pv + totalJuros;

  return {
    iMensal,
    rows,
    totalJuros,
    totalAmort: pv,
    totalPago,
    firstInstallment: rows[0].parcela,
    lastInstallment: rows[rows.length - 1].parcela,
  };
}

/**
 * Simula o efeito de aportes extras (amortização extraordinária) sobre um
 * financiamento já em andamento, comparando com a tabela original.
 *
 * @param {number} pv - valor financiado original
 * @param {number} cetAnual - CET ao ano, em decimal
 * @param {number} n - prazo original em meses
 * @param {'SAC'|'Price'} system
 * @param {'mensal'|'anual'|'unico'} extraType - todo mês, uma vez por ano (mês 12, 24, ...), ou um único aporte no mês 1
 * @param {number} extraValue - valor de cada aporte extra
 * @param {'prazo'|'parcela'} strategy - reduzir o prazo (mantém a parcela e quita antes) ou reduzir a parcela (mantém a data final)
 */
export function simulateExtraAmortization({
  pv,
  cetAnual,
  n,
  system,
  extraType,
  extraValue,
  strategy,
}) {
  const iMensal = monthlyRateFromCET(cetAnual);
  let saldo = pv;
  let amortFixa = system === "SAC" ? pv / n : null;
  let pmt =
    system === "Price"
      ? (pv * (iMensal * Math.pow(1 + iMensal, n))) /
        (Math.pow(1 + iMensal, n) - 1)
      : null;

  let totalJuros = 0;
  let totalExtra = 0;
  const rows = [];
  const maxMeses = n * 2; // trava de segurança contra loop infinito
  let mes = 0;

  while (saldo > 0.005 && mes < maxMeses) {
    mes += 1;
    const juros = saldo * iMensal;
    let amortMes = system === "SAC" ? amortFixa : pmt - juros;
    if (amortMes > saldo) amortMes = saldo;
    const parcela = amortMes + juros;
    saldo -= amortMes;
    totalJuros += juros;

    let extraAplicado = 0;
    if (saldo > 0.005 && extraValue > 0) {
      const aplicaEsteMes =
        extraType === "mensal" ||
        (extraType === "anual" && mes % 12 === 0) ||
        (extraType === "unico" && mes === 1);

      if (aplicaEsteMes) {
        extraAplicado = Math.min(extraValue, saldo);
        saldo -= extraAplicado;
        totalExtra += extraAplicado;

        if (strategy === "parcela") {
          const restante = n - mes;
          if (restante > 0 && saldo > 0) {
            if (system === "SAC") {
              amortFixa = saldo / restante;
            } else {
              pmt =
                (saldo * (iMensal * Math.pow(1 + iMensal, restante))) /
                (Math.pow(1 + iMensal, restante) - 1);
            }
          }
        }
      }
    }

    rows.push({
      mes,
      parcela,
      juros,
      amort: amortMes,
      extra: extraAplicado,
      saldo: Math.max(saldo, 0),
    });

    if (saldo <= 0.005) break;
  }

  const totalPago = pv + totalJuros;

  return {
    rows,
    totalJuros,
    totalPago,
    totalExtra,
    mesesUsados: rows.length,
    ultimaParcela: rows[rows.length - 1]?.parcela ?? 0,
  };
}

export function fmtBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtPct(v, digits = 4) {
  return (
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + "%"
  );
}

export function fmtDecimal(v, digits = 6) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function parseBRLInput(str) {
  if (typeof str !== "string") return NaN;
  const cleaned = str.trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned);
}
