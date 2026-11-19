import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const n = value => value == null || !Number.isFinite(value) ? 'Não disponível' : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const money = value => value == null || !Number.isFinite(value) ? 'Não disponível' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const labels = {state:'UF',city:'Município',institution:'Instituição',type:'Tipo',typology:'Tipologia',unit:'Unidade',quantityMin:'Quantidade mínima',quantityMax:'Quantidade máxima',valueMin:'Valor mínimo',valueMax:'Valor máximo',yearMin:'Ano inicial do contrato',yearMax:'Ano final do contrato'};

export function generateReport({ reference, filters, ranges, search, quantity, refStats, candidateCount }) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4', compress:true });
  const lines = [
    'Memorial de cálculo · Estimativa de custo unitário',
    'Projeto independente, sem vínculo institucional com o SIMEC ou o MEC.',
    'Fonte: dados de obras concluídas do SIMEC/MEC. Extração: outubro de 2025 (dia não informado).',
    'Revisão da base: não informada. Gerado em: ' + new Date().toLocaleString('pt-BR'),
    'Valores contratados nominais; nenhuma atualização monetária aplicada.',
    '',
    'Critérios do recorte',
    ...Object.entries({...filters,...ranges}).filter(([,v]) => Array.isArray(v) ? v.length : v != null && v !== '').map(([k,v]) => `${labels[k] || k}: ${Array.isArray(v) ? v.join(', ') : v === 'm2' ? 'm²' : v}`),
    ...(search ? [`Nome da obra: ${search}`] : []),
    `Obras elegíveis no recorte: ${n(candidateCount)}. Referências selecionadas: ${n(reference.length)}. Excluídas manualmente: ${n(candidateCount-reference.length)}.`,
    '',
    'Memorial de cálculo',
    `Custo unitário de cada referência = valor contratado / quantidade da obra (${filters.unit === 'm2' ? 'm²' : filters.unit || 'unidade'}).`,
    `Mediana dos custos unitários: ${money(refStats.median)}. P25: ${money(refStats.q1)}. P75: ${money(refStats.q3)}.`,
    `Quantidade do projeto: ${n(quantity)} ${filters.unit === 'm2' ? 'm²' : filters.unit || ''}.`,
    `Estimativa total = ${money(refStats.median)} x ${n(quantity)} = ${money(quantity > 0 && refStats.median != null ? quantity * refStats.median : null)}.`,
    `Faixa total (P25 a P75): ${money(quantity > 0 && refStats.q1 != null ? quantity * refStats.q1 : null)} a ${money(quantity > 0 && refStats.q3 != null ? quantity * refStats.q3 : null)}.`,
    'Quartis e mediana calculados por interpolação linear. Os valores estimados não constituem o CUB oficial.',
    '',
    'Dados das referências selecionadas',
    'Valores contratuais e quantidades são os dados originais normalizados do arquivo. Custo unitário é calculado.',
  ];
  let y = 18;
  for (const [i,line] of lines.entries()) {
    doc.setFont('helvetica', i === 0 || ['Critérios do recorte','Memorial de cálculo','Dados das referências selecionadas'].includes(line) ? 'bold' : 'normal');
    doc.setFontSize(i === 0 ? 15 : 10);
    const wrapped = doc.splitTextToSize(line || ' ', 178);
    const height = wrapped.length * (i === 0 ? 7 : 5);
    if (y + height > 280) {doc.addPage(); y = 18;}
    doc.text(wrapped, 16, y); y += height + 1;
  }
  const raw = reference.map(w => [
    `ID: ${w.id || '—'}\nObra: ${w.name || '—'}\nInstituição: ${w.institution || '—'} · ${w.university || '—'}\nCampus: ${w.campus || '—'}\nLocal: ${[w.city,w.state].filter(Boolean).join(', ') || '—'}\nTipo: ${w.type || '—'} · ${w.typology || '—'}\nContrato: ${w.date || '—'} · Conclusão: ${w.completion || '—'}\nDescrição: ${w.description || '—'}\nLink: ${w.link || '—'}`,
    `${n(w.quantity)} ${w.unit === 'm2' ? 'm²' : w.unit}`,
    money(w.value),
    money(w.value / w.quantity),
  ]);
  if (raw.length) autoTable(doc, { startY:y, head:[['Dados da obra','Quantidade','Contratado','Custo unitário']], body:raw, margin:{left:16,right:16}, styles:{font:'helvetica',fontSize:8,cellPadding:2,overflow:'linebreak'}, headStyles:{fillColor:[20,108,98]}, columnStyles:{0:{cellWidth:100},1:{cellWidth:23},2:{cellWidth:28},3:{cellWidth:27}}, rowPageBreak:'auto' });
  else doc.text('Nenhuma referência selecionada.',16,y);
  const total = doc.getNumberOfPages();
  for (let page=1; page<=total; page++) {doc.setPage(page);doc.setFontSize(8);doc.setTextColor(100);doc.text(`${page} / ${total}`, 194, 289, {align:'right'});}
  doc.save('memorial-custos-universitarios.pdf');
}
