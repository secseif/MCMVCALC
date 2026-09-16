"use client";

// Gera um PDF-resumo da simulação, pensado para a pessoa levar ao gerente
// do banco ou mandar pro corretor. Roda inteiramente no navegador (jsPDF),
// sem precisar de um servidor de PDF.
import { fmtBRL, fmtPct } from "./amortization";

export async function downloadSimulationPDF(data) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const marginX = 48;
  let y = 56;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - marginX * 2;

  function ensureSpace(extra = 20) {
    if (y + extra > pageHeight - 48) {
      doc.addPage();
      y = 56;
    }
  }

  function h1(text) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(text, marginX, y);
    y += 22;
  }

  function h2(text) {
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(0, 77, 135); // azul Caixa escuro
    doc.text(text.toUpperCase(), marginX, y);
    doc.setTextColor(20, 20, 20);
    y += 16;
    doc.setDrawColor(230, 230, 230);
    doc.line(marginX, y - 10, pageWidth - marginX, y - 10);
  }

  function row(label, value) {
    ensureSpace(16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(90, 90, 90);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(value, marginX + 230, y);
    y += 16;
  }

  function paragraph(text) {
    ensureSpace(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(110, 110, 110);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, marginX, y);
    y += lines.length * 12 + 8;
  }

  // Cabeçalho (sem emoji: as fontes padrão do PDF não renderizam bem esses glifos)
  h1("Simulação de financiamento — Minha Casa Minha Vida");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, y);
  y += 24;

  // Dados informados
  h2("Dados informados");
  row("Valor do imóvel", fmtBRL(data.imovelNum));
  row("Entrada", fmtBRL(data.entradaNum));
  row("Valor financiado", fmtBRL(data.pv));
  row("CET ao ano", fmtPct(data.cetAnualPct, 2));
  row("Prazo", `${data.n} meses`);
  row("Sistema de amortização", data.system === "SAC" ? "SAC (padrão Caixa/MCMV)" : "Tabela Price");
  if (data.rendaTotal > 0) row("Renda familiar mensal informada", fmtBRL(data.rendaTotal));
  y += 8;

  // Resultado
  h2("Resultado");
  row("Taxa mensal equivalente ao CET", fmtPct(data.iMensal * 100, 4) + " a.m.");
  if (data.system === "SAC") {
    row("1ª parcela", fmtBRL(data.firstInstallment));
    row("Última parcela", fmtBRL(data.lastInstallment));
  } else {
    row("Parcela fixa", fmtBRL(data.firstInstallment));
  }
  row("Total pago (principal + juros)", fmtBRL(data.totalPago));
  row("Total de juros", fmtBRL(data.totalJuros));
  if (data.comprometimentoPct !== null && data.comprometimentoPct !== undefined) {
    row("Comprometimento da renda com a parcela", fmtPct(data.comprometimentoPct, 1));
  }
  y += 8;

  if (data.extra) {
    h2("Simulação de amortização extra");
    row("Tipo de aporte", data.extra.tipoLabel);
    row("Valor do aporte", fmtBRL(data.extra.valor));
    row("Estratégia", data.extra.strategyLabel);
    row("Novo prazo", `${data.extra.mesesUsados} meses`);
    row("Economia de juros estimada", fmtBRL(data.extra.economiaJuros));
    y += 8;
  }

  paragraph(
    "Esta é uma simulação educativa gerada automaticamente a partir do CET " +
      "informado, convertido para taxa mensal por juros compostos. Os valores " +
      "reais do seu contrato dependem da análise de crédito e das condições " +
      "definidas pelo banco no momento da contratação."
  );

  doc.save(`simulacao-mcmv-${Date.now()}.pdf`);
}
