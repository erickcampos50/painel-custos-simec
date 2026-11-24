import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { durationDays } from './estimativa-calculos';

const n = value => value == null || !Number.isFinite(value) ? 'Não informado' : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const money = value => value == null || !Number.isFinite(value) ? 'Não disponível' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const unitName = value => value === 'm2' ? 'm²' : value;

export function generateFullReport({ candidates, selected, costWorks, costStats, durationStats, durationResult, sizeOptions, filters, search, quantity, budget, mode, target, incc, excludedByIncc }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const unit = unitName(filters.unit);
  const quantityValid = quantity != null && quantity > 0;
  const budgetValid = budget != null && budget > 0;
  const hasCosts = costStats.count > 0;
  const updated = mode !== 'nominal';
  const seriesName = incc?.nome || (mode === 'igpm' ? 'IGP-M' : 'INCC-Brasil-DI');
  const estimated = hasCosts && quantityValid ? costStats.median * quantity : null;
  const selectedKeys = new Set(selected.map(w => w.key));
  const excluded = candidates.filter(w => !selectedKeys.has(w.key));
  const durationKeys = new Set(durationResult.references.map(item => item.work.key));
  const costKeys = new Set(costWorks.map(w => w.key));
  const lines = [
    'Relatório de referências de custo e duração',
    'Estimativa preliminar · Ferramenta independente e gratuita, sem vínculo com o SIMEC ou o MEC.',
    'Fonte: obras universitárias registradas como concluídas no SIMEC/MEC. Extração: outubro de 2025 (dia não informado); revisão da base não informada.',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}.`,
    '',
    'Critérios e dados do projeto',
    `Unidade: ${unit}. Tipo: ${filters.type || 'todos'}. Tipologia: ${filters.typology || 'todas'}. Estado: ${filters.state || 'todos'}.`,
    ...(search?.trim() ? [`Busca livre: ${search.trim()}.`] : []),
    `Quantidade informada: ${quantityValid ? `${n(quantity)} ${unit}` : 'não informada'}. Orçamento máximo: ${budgetValid ? money(budget) : 'não informado'}.`,
    `Obras no recorte: ${n(candidates.length)}. Selecionadas: ${n(selected.length)}. Excluídas manualmente: ${n(excluded.length)}.`,
    updated
      ? `Valores atualizados pelo ${seriesName}, FGV IBRE, até ${target || 'período indisponível'}. A assinatura é aproximação da data-base. ${n(excludedByIncc)} obras com valor positivo no recorte não puderam ser atualizadas.`
      : 'Valores nominais, sem atualização monetária. Contratos de datas diferentes são comparados sem correção.',
    ...(updated && incc ? [`Índice do mês de destino: ${n(incc.registros.find(r => r.periodo === target)?.indice)}. Série ${incc.codigo_fgv}, cobertura ${incc.primeiro_periodo} a ${incc.ultimo_periodo}; não extrapolar.`] : []),
    '',
    'Custo de referência',
    `Faixa configurada: ${n(sizeOptions.lowerFactor * 100)}% a ${n(sizeOptions.upperFactor * 100)}%. Aplicar ao custo por quantidade: ${sizeOptions.applyCostSize ? 'sim' : 'não'}; aplicar ao prazo: ${sizeOptions.applyDurationSize ? 'sim' : 'não'}.`,
    sizeOptions.applyCostSize && quantityValid ? `Porte para custo: ${n(quantity * sizeOptions.lowerFactor)} a ${n(quantity * sizeOptions.upperFactor)} ${unit}.` : 'Custo sem restrição por porte de quantidade.',
    `Referências com valor e quantidade positivos: ${n(costStats.count)}. Custo unitário = valor usado / quantidade em ${unit}.`,
    `Mediana: ${money(costStats.median)} / ${unit}. P25: ${money(costStats.q1)} / ${unit}. P75: ${money(costStats.q3)} / ${unit}.`,
    `Custo total estimado: ${money(estimated)}. Faixa P25–P75: ${money(hasCosts && quantityValid ? costStats.q1 * quantity : null)} a ${money(hasCosts && quantityValid ? costStats.q3 * quantity : null)}.`,
    `Cálculo do total: mediana do custo unitário x quantidade informada. Sem quantidade, não há total estimado.`,
    ...(budgetValid ? [
      `Quantidade indicativa pelo orçamento: ${hasCosts ? `${n(budget / costStats.median)} ${unit}` : 'não disponível'}. Faixa indicativa: ${hasCosts ? `${n(budget / costStats.q3)} a ${n(budget / costStats.q1)} ${unit}` : 'não disponível'}.`,
      `Cálculo da quantidade: orçamento dividido pelos custos unitários; a divisão pelo P75 produz o limite inferior.`,
      `Comparação da estimativa central com o orçamento: ${estimated == null ? 'não disponível sem quantidade e custo válidos' : `${money(Math.abs(budget - estimated))} ${estimated <= budget ? 'abaixo' : 'acima'} do limite informado`}.`,
    ] : []),
    '',
    'Duração histórica das referências',
    durationResult.hasQuantity || durationResult.hasBudget
      ? `Porte para duração: de ${n(durationResult.lowerFactor * 100)}% a ${n(durationResult.upperFactor * 100)}% ${durationResult.hasQuantity && durationResult.hasBudget ? 'da quantidade e do orçamento simultaneamente' : durationResult.hasQuantity ? 'da quantidade' : 'do orçamento'} informado. ${n(durationResult.sizeEligible.length)} obras selecionadas atendem ao porte.`
      : sizeOptions.applyDurationSize ? 'Sem quantidade ou orçamento: a duração usa todas as obras selecionadas com datas elegíveis.' : 'Filtro de porte para prazo desativado: a duração usa todas as obras selecionadas com datas elegíveis.',
    ...(durationResult.hasQuantity ? [`Quantidade para prazo: ${n(quantity * durationResult.lowerFactor)} a ${n(quantity * durationResult.upperFactor)} ${unit}.`] : []),
    ...(durationResult.hasBudget ? [`Valor contratado para prazo: ${money(budget * durationResult.lowerFactor)} a ${money(budget * durationResult.upperFactor)}.`] : []),
    ...(durationResult.hasBudget ? [`O orçamento máximo é aproximação do porte: compara-se com o valor ${updated ? `atualizado por ${seriesName} em ${target}` : 'nominal'} de cada obra. Valores ausentes não são utilizados nesse recorte.`] : []),
    `Obras com duração válida: ${n(durationStats.count)}. Mediana: ${n(durationStats.median)} dias. P25–P75: ${n(durationStats.q1)} a ${n(durationStats.q3)} dias.`,
    'Duração em dias corridos entre início de execução e conclusão informados, coerentes e com intervalo positivo. Inícios aproximados, prazos previstos e datas de vistoria não são usados.',
    'Faixas de porte são heurísticas não calibradas e não alteram a duração das obras. É uma distribuição histórica, não uma previsão garantida; as referências de custo e duração podem ser diferentes.',
    '',
    'Limitações',
    'P25–P75 descreve a distribuição observada; não é garantia ou intervalo de confiança. Quartis e mediana usam interpolação linear. O valor contratado não é necessariamente o custo final.',
    'Os registros podem conter duplicidades, valores extremos e escopos diferentes. A análise não é o CUB oficial, não comprova viabilidade e não substitui orçamento detalhado ou análise técnica.',
    ...(costStats.count < 5 || durationStats.count < 5 ? ['Há menos de cinco referências em pelo menos um indicador; a amostra pode não ser representativa.'] : []),
    '',
    'Referências selecionadas e elegibilidade',
    'A tabela identifica as obras selecionadas e se cada uma participa do custo, da duração ou de ambos. Confira o escopo das obras antes de utilizar os resultados.',
  ];
  let y = 16;
  const headings = new Set(['Critérios e dados do projeto', 'Custo de referência', 'Duração histórica das referências', 'Limitações', 'Referências selecionadas e elegibilidade']);
  for (const [i, line] of lines.entries()) {
    doc.setFont('helvetica', i === 0 || headings.has(line) ? 'bold' : 'normal');
    doc.setFontSize(i === 0 ? 15 : 9);
    for (const part of doc.splitTextToSize(line || ' ', 178)) {
      if (y > 278) { doc.addPage(); y = 16; }
      doc.text(part, 16, y);
      y += i === 0 ? 7 : 4.7;
    }
    y += 1;
  }
  const rows = selected.map(w => {
    const days = durationDays(w);
    const costEligible = w.value > 0 && w.quantity > 0;
    return [
      `ID ${w.id || '—'} · ${w.name || 'Sem nome'}\n${w.institution || '—'} · ${[w.city, w.state].filter(Boolean).join(', ') || '—'}\n${w.type || '—'} · ${w.typology || '—'}\n${w.link || ''}`,
      `${n(w.quantity)} ${unit}\nOriginal: ${money(w.originalValue)}\n${updated ? `Usado: ${money(w.value)}\nFator: ${w.factor == null ? 'não disponível' : w.factor.toFixed(6)}\n` : ''}Custo: ${costEligible ? `${money(w.value / w.quantity)} / ${unit}` : 'não elegível'}\nUsada no custo: ${costKeys.has(w.key) ? 'sim' : 'não'}`,
      `Início: ${w.datas_execucao?.inicio?.data || '—'} (${w.datas_execucao?.inicio?.tipo || 'não informado'})\nFim: ${w.datas_execucao?.fim?.data || '—'} (${w.datas_execucao?.fim?.tipo || 'não informado'})\nDuração: ${days == null ? 'não elegível' : `${n(days)} dias`}\nUsada no prazo: ${durationKeys.has(w.key) ? 'sim' : 'não'}`,
    ];
  });
  if (rows.length) {
    autoTable(doc, { startY: y, head: [['Obra', 'Custo e quantidade', 'Datas e duração']], body: rows, margin: { left: 16, right: 16 }, styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [20, 108, 98] }, columnStyles: { 0: { cellWidth: 82 }, 1: { cellWidth: 48 }, 2: { cellWidth: 48 } }, rowPageBreak: 'auto' });
  }
  if (excluded.length) {
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Obras excluídas manualmente', 16, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('As obras abaixo não participam dos indicadores.', 16, 24);
    autoTable(doc, { startY: 28, head: [['ID', 'Obra', 'Instituição / local']], body: excluded.map(w => [w.id || '—', w.name || 'Sem nome', `${w.institution || '—'} · ${[w.city, w.state].filter(Boolean).join(', ') || '—'}`]), margin: { left: 16, right: 16 }, styles: { font: 'helvetica', fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [20, 108, 98] } });
  }
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) { doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100); doc.text(`${page} / ${total}`, 194, 289, { align: 'right' }); }
  doc.save('relatorio-custo-e-duracao.pdf');
}
