// Calculadoras adicionais de educação financeira para quem está comprando
// a primeira casa: "quanto eu consigo pagar", meta de poupança para a
// entrada, aluguel x financiar, faixa do Minha Casa Minha Vida e a
// separação aproximada entre juro puro e encargos (seguro/tarifas) dentro
// do CET.
//
// IMPORTANTE sobre as faixas do Minha Casa Minha Vida: os valores abaixo
// refletem as faixas de renda familiar mensal bruta em vigor no momento em
// que este código foi escrito (2026), segundo reportagens que citam a
// atualização do programa publicada em 2026. O governo revisa esses
// valores periodicamente (a própria legislação do programa prevê reajuste),
// então trate isso como uma estimativa educativa, não como critério oficial
// de aprovação — sempre confirme o enquadramento real com a Caixa ou em
// gov.br/cidades antes de tomar uma decisão.
import { buildAmortizationTable, monthlyRateFromCET } from "./amortization.js";

export const MCMV_FAIXAS = [
  { faixa: 1, label: "Faixa 1", min: 0, max: 3200 },
  { faixa: 2, label: "Faixa 2", min: 3200.01, max: 5000 },
  { faixa: 3, label: "Faixa 3", min: 5000.01, max: 9600 },
  { faixa: 4, label: "Faixa 4", min: 9600.01, max: 13000 },
];

/**
 * A partir de uma renda mensal, calcula o valor máximo de imóvel que dá
 * para financiar sem estourar o limite de comprometimento de renda (30%
 * por padrão, o mesmo teto usado pela Caixa no SFH e no MCMV).
 */
export function maxAffordablePV({ rendaMensal, cetAnual, n, system, limitePct = 30 }) {
  const iMensal = monthlyRateFromCET(cetAnual);
  const parcelaMax = rendaMensal * (limitePct / 100);

  let pvMax;
  if (system === "SAC") {
    // 1ª parcela (a maior) = pv/n + pv*i = pv * (1/n + i)
    pvMax = parcelaMax / (1 / n + iMensal);
  } else {
    const fator =
      (iMensal * Math.pow(1 + iMensal, n)) / (Math.pow(1 + iMensal, n) - 1);
    pvMax = parcelaMax / fator;
  }

  return { parcelaMax, pvMax: Math.max(pvMax, 0), iMensal };
}

/**
 * Quanto guardar por mês para juntar uma meta de entrada em X meses, dado
 * um rendimento mensal estimado da aplicação (poupança, CDB, Tesouro...).
 */
export function savingsPlan({ metaEntrada, prazoMeses, rendimentoMensalPct }) {
  const r = rendimentoMensalPct / 100;
  const depositoMensal =
    r === 0 ? metaEntrada / prazoMeses : (metaEntrada * r) / (Math.pow(1 + r, prazoMeses) - 1);
  const totalDepositado = depositoMensal * prazoMeses;

  return {
    depositoMensal,
    totalDepositado,
    rendimentoGanho: metaEntrada - totalDepositado,
  };
}

/**
 * Compara, de forma simplificada, continuar alugando (e investindo a
 * diferença entre o aluguel e a parcela) versus financiar o imóvel.
 *
 * Simplificações importantes (deixe isso claro para quem for ler o
 * resultado): não considera valorização/desvalorização do imóvel, reajuste
 * do aluguel ao longo do tempo, IPTU, condomínio ou manutenção — é uma
 * comparação didática, não uma recomendação de investimento.
 */
export function rentVsBuy({ parcela, aluguelMensal, n, rendimentoMensalPct, valorImovel }) {
  const r = rendimentoMensalPct / 100;
  const diferenca = parcela - aluguelMensal;

  let patrimonioInvestindo = 0;
  if (diferenca > 0) {
    patrimonioInvestindo =
      r === 0 ? diferenca * n : diferenca * ((Math.pow(1 + r, n) - 1) / r);
  }

  return {
    diferenca,
    patrimonioInvestindo,
    patrimonioImovel: valorImovel,
  };
}

/**
 * Identifica a faixa do Minha Casa Minha Vida a partir da renda familiar
 * mensal bruta (ver aviso no topo do arquivo sobre esses valores mudarem).
 */
export function mcmvFaixa(rendaMensal) {
  if (!(rendaMensal > 0)) return null;
  const encontrada = MCMV_FAIXAS.find((f) => rendaMensal >= f.min && rendaMensal <= f.max);
  if (encontrada) return encontrada;
  if (rendaMensal > MCMV_FAIXAS[MCMV_FAIXAS.length - 1].max) {
    return { faixa: null, label: "Fora do MCMV", min: 13000.01, max: null };
  }
  return null;
}

/**
 * Separação APROXIMADA entre "juro puro" e "encargos" (seguros MIP/DFI +
 * tarifas) dentro do CET, comparando a taxa de juros nominal contratada
 * (informada à parte) com a taxa efetiva do CET. Isso não é o
 * detalhamento oficial do contrato — só o próprio banco tem essa
 * composição exata —, mas dá uma ideia de quanto do custo total é "aluguel
 * do dinheiro" e quanto é seguro/tarifa.
 */
export function interestVsInsurance({ pv, cetAnual, nominalAnual, n, system }) {
  if (!(nominalAnual >= 0) || nominalAnual > cetAnual) return null;

  const comCET = buildAmortizationTable(pv, cetAnual, n, system);
  const comNominal = buildAmortizationTable(pv, nominalAnual, n, system);

  const totalJurosPuro = comNominal.totalJuros;
  const totalEncargosAprox = Math.max(comCET.totalJuros - totalJurosPuro, 0);

  return {
    totalJurosCET: comCET.totalJuros,
    totalJurosPuro,
    totalEncargosAprox,
  };
}
