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
