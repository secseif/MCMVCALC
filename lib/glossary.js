// Definições curtas em linguagem simples, para os tooltips de "?" ao lado
// dos termos técnicos. O objetivo é que quem nunca fez um financiamento
// entenda o que está lendo, não dar uma definição de dicionário.
export const GLOSSARY = {
  cet: {
    termo: "CET (Custo Efetivo Total)",
    definicao:
      "É a taxa que já soma tudo: juros, seguro obrigatório e tarifas do banco, em uma única porcentagem ao ano. É o número mais honesto pra comparar propostas de bancos diferentes — melhor que olhar só a 'taxa de juros'.",
  },
  sac: {
    termo: "SAC",
    definicao:
      "Sistema de Amortização Constante. Você paga sempre o mesmo valor de amortização (abatimento da dívida) todo mês, e os juros vão diminuindo porque incidem sobre um saldo devedor cada vez menor. Resultado: a parcela começa mais alta e vai caindo com o tempo. É o padrão usado pela Caixa no Minha Casa Minha Vida.",
  },
  price: {
    termo: "Tabela Price",
    definicao:
      "Sistema onde a parcela é sempre a mesma do início ao fim. No começo, a maior parte da parcela é juros; com o tempo, essa proporção se inverte e a maior parte vira abatimento da dívida.",
  },
  amortizacao: {
    termo: "Amortização",
    definicao:
      "É a parte da parcela que efetivamente reduz o quanto você ainda deve (o saldo devedor). O resto da parcela é juros — o custo de ter emprestado o dinheiro.",
  },
  saldoDevedor: {
    termo: "Saldo devedor",
    definicao: "É quanto você ainda deve ao banco naquele momento do financiamento, depois de descontar tudo que já foi amortizado.",
  },
  itbi: {
    termo: "ITBI",
    definicao:
      "Imposto sobre Transmissão de Bens Imóveis, cobrado pela prefeitura quando você compra um imóvel. Costuma ficar entre 2% e 3% do valor do imóvel, variando de cidade para cidade.",
  },
  fgts: {
    termo: "FGTS",
    definicao:
      "Fundo de Garantia por Tempo de Serviço. Além de sacar em situações específicas, dá pra usar o saldo para dar entrada num imóvel ou abater o saldo devedor do financiamento a cada 2 anos (ou reduzir até 80% de até 12 parcelas seguidas), desde que você tenha pelo menos 3 anos de trabalho sob o regime do FGTS.",
  },
  comprometimentoRenda: {
    termo: "Comprometimento de renda",
    definicao:
      "É qual fatia da sua renda mensal vai embora só para pagar a parcela do financiamento. A Caixa usa 30% como teto no SFH e no Minha Casa Minha Vida: se a parcela passar disso, o financiamento normalmente não é aprovado.",
  },
  faixaMcmv: {
    termo: "Faixa do Minha Casa Minha Vida",
    definicao:
      "O programa divide as famílias em faixas de renda (1 a 4), cada uma com condições, subsídios e taxas diferentes. Quanto menor a faixa, menor a renda e maior costuma ser o subsídio do governo.",
  },
  amortizacaoExtra: {
    termo: "Amortização extraordinária",
    definicao:
      "Um pagamento a mais, além da parcela normal, usado só para abater o saldo devedor. Você pode escolher se esse abatimento reduz o prazo (quita mais cedo) ou reduz o valor da parcela (mesmo prazo, parcela menor).",
  },
};
