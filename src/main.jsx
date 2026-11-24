import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ConfigProvider, Drawer, Empty, Input, InputNumber, Segmented, Select, Spin, Table } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { ApartmentOutlined, DownloadOutlined, FileTextOutlined, PlusOutlined, MinusOutlined, SearchOutlined } from '@ant-design/icons';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { comparableWorks, worksInUnit } from './unit-data';
import { updateWork } from './incc';
import { normalCurve } from './normal-curve';
import { histogram } from './histogram';
import 'antd/dist/reset.css';
import './style.css';

const number = n => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const money = n => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const short = n => Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const unitLabel = unit => unit === 'm2' ? 'm²' : unit;
const multiFields = new Set(['state', 'institution', 'type', 'typology']);
const numericInput = {
  inputMode:'decimal',
  decimalSeparator:',',
  onKeyDown:e => { if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && !/[\d,.]/.test(e.key)) e.preventDefault(); },
  onPaste:e => { if (!/^\d*(?:[,.]\d*)?$/.test(e.clipboardData.getData('text').trim())) e.preventDefault(); },
};
const valid = w => w.value > 0 && w.quantity > 0 && !!w.unit;
const cost = w => w.value / w.quantity;
const year = date => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || '');
  if (!match) return null;
  const day = Number(match[1]), month = Number(match[2]), y = Number(match[3]);
  const d = new Date(Date.UTC(y, month - 1, day));
  return d.getUTCFullYear() === y && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? y : null;
};
const quantile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), pos = (sorted.length - 1) * p, i = Math.floor(pos);
  return sorted[i] + (sorted[Math.ceil(pos)] - sorted[i]) * (pos - i);
};
const options = (data, field) => [...new Set(data.map(w => w[field]).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'pt-BR')).map(value => ({ value, label: field === 'unit' ? unitLabel(value) : value }));
const stats = values => ({
  count: values.length,
  median: quantile(values, .5),
  q1: quantile(values, .25),
  q3: quantile(values, .75),
  mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
});
function download(rows, mode, target) {
  const columns = [['ID','id'],['Nome','name'],['Instituição','institution'],['UF','state'],['Município','city'],['Tipo','type'],['Tipologia','typology'],['Unidade','unit'],['Quantidade','quantity'],['Valor contratado original','originalValue'],['Valor usado','value'],['Fator','factor'],['Modo',null],['Mês de referência',null],['Data do contrato','date'],['Início adotado','inicio'],['Fonte do início','inicioFonte'],['Fim adotado','fim'],['Fonte do fim','fimFonte'],['Tipo do fim','fimTipo'],['Situação das datas','datasSituacao']];
  const escape = v => { const text = String(v ?? ''); return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`; };
  const csv = [columns.map(c => escape(c[0])).join(';'), ...rows.map(w => {
    const dates = w.datas_execucao || {};
    const extended = {...w, inicio:dates.inicio?.data, inicioFonte:dates.inicio?.fonte, fim:dates.fim?.data, fimFonte:dates.fim?.fonte, fimTipo:dates.fim?.tipo, datasSituacao:dates.situacao};
    return columns.map(c => escape(c[0] === 'Modo' ? mode : c[0] === 'Mês de referência' ? (mode !== 'nominal' ? target : '') : extended[c[1]])).join(';');
  })].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type:'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = 'obras-simec.csv'; a.click(); URL.revokeObjectURL(url);
}

function App() {
  const [works, setWorks] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const [filters, setFilters] = useState({ unit:'m2' }), [ranges, setRanges] = useState({}), [search, setSearch] = useState('');
  const [excluded, setExcluded] = useState([]), [selected, setSelected] = useState(null), [quantity, setQuantity] = useState(null), [percentile, setPercentile] = useState(95), [method, setMethod] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [generating, setGenerating] = useState(false), [reportError, setReportError] = useState(false);
  const [series, setSeries] = useState({}), [mode, setMode] = useState('incc'), [target, setTarget] = useState('');
  const incc = series[mode] || null;
  const [chartMode, setChartMode] = useState('observado');
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}obras.json`).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setWorks).catch(() => setError(true)).finally(() => setLoading(false)); }, []);
  useEffect(() => { Promise.all(['incc','igpm'].map(key => fetch(`${import.meta.env.BASE_URL}${key}.json`).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => [key,data]).catch(() => [key,null]))).then(entries => { const data = Object.fromEntries(entries); setSeries(data); setTarget(data.incc?.ultimo_periodo || ''); }); }, []);
  const indices = useMemo(() => Object.fromEntries((incc?.registros || []).map(r => [r.periodo,r.indice])), [incc]);
  const filteredOriginal = useMemo(() => works.filter(w => {
    if (!Object.entries(filters).every(([k, v]) => Array.isArray(v) ? !v.length || v.includes(w[k]) : !v || w[k] === v)) return false;
    if (search.trim() && !String(w.name ?? '').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) return false;
    return [['quantity','quantity'],['value','value'],['year','date']].every(([field, property]) => {
      const lo = ranges[`${field}Min`], hi = ranges[`${field}Max`];
      if (lo == null && hi == null) return true;
      const v = field === 'year' ? year(w[property]) : w[property];
      return v != null && (lo == null || v >= lo) && (hi == null || v <= hi);
    });
  }), [works, filters, ranges, search]);
  const filtered = useMemo(() => filteredOriginal.map(w => updateWork(w, mode, target, indices)), [filteredOriginal, mode, target, indices]);
  const unitWorks = useMemo(() => worksInUnit(filtered, filters.unit), [filtered, filters.unit]);
  const candidates = useMemo(() => comparableWorks(filtered, filters.unit), [filtered, filters.unit]);
  const reference = useMemo(() => candidates.filter(w => !excluded.includes(w.key)), [candidates, excluded]);
  const quantities = unitWorks.filter(w => w.quantity > 0).map(w => w.quantity);
  const values = filtered.filter(w => w.value > 0).map(w => w.value);
  const costs = reference.map(cost);
  const excludedByIncc = mode !== 'nominal' ? filtered.filter(w => w.originalValue > 0 && w.value == null).length : 0;
  const quantityStats = stats(quantities), valueStats = stats(values), refStats = stats(costs);
  const byTypology = Object.entries(filtered.reduce((acc, w) => { const label = w.typology || 'Não informada'; acc[label] = (acc[label] || 0) + 1; return acc; }, {})).sort((a,b) => b[1]-a[1]).map(([name, count]) => ({name, count}));
  const setFilter = (field, value) => { setFilters(f => ({...f, [field]:value, ...(field === 'state' ? {city:undefined} : {})})); if (field === 'unit') setRanges(r => ({...r, quantityMin:undefined, quantityMax:undefined})); setExcluded([]); };
  const setRange = (field, value) => { setRanges(r => ({...r, [field]:value})); setExcluded([]); };
  const clear = () => { setFilters({ unit:'m2' }); setRanges({}); setSearch(''); setExcluded([]); };
  const report = async () => {
    setGenerating(true); setReportError(false);
    try {
      const { generateReport } = await import('./report');
      generateReport({reference, filters, ranges, search, quantity, refStats, candidateCount:candidates.length, mode, target, incc, excludedByIncc});
    } catch (error) { console.error('Erro ao gerar PDF:', error); setReportError(true); }
    finally { setGenerating(false); }
  };
  const columns = [
    { title:'Obra', key:'name', sorter:(a,b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'), render:(_, w) => <div className="work-name"><button onClick={() => setSelected(w)}>{w.name || `Obra ${w.id}`}</button><small>{w.institution || '—'} · {w.id}</small></div> },
    { title:'Local', key:'location', sorter:(a,b) => [a.city,a.state].filter(Boolean).join(', ').localeCompare([b.city,b.state].filter(Boolean).join(', '), 'pt-BR'), render:(_, w) => [w.city, w.state].filter(Boolean).join(', ') || '—' },
    { title:'Tipo', dataIndex:'type', sorter:(a,b) => (a.type || '').localeCompare(b.type || '', 'pt-BR'), render:v => v || '—' },
    { title:'Tipologia', dataIndex:'typology', sorter:(a,b) => (a.typology || '').localeCompare(b.typology || '', 'pt-BR'), render:v => v || '—' },
    { title:'Início adotado', key:'start', render:(_,w) => <DateValue date={w.datas_execucao?.inicio} /> },
    { title:'Conclusão / prazo', key:'end', render:(_,w) => <DateValue date={w.datas_execucao?.fim} /> },
    { title:'Quantidade', key:'quantity', sorter:filters.unit ? (a,b) => (a.quantity || 0) - (b.quantity || 0) : undefined, render:(_,w) => w.quantity > 0 ? `${number(w.quantity)} ${unitLabel(w.unit) || '(unidade não informada)'}` : '—' },
    { title:mode !== 'nominal' ? 'Contratado atualizado' : 'Contratado', dataIndex:'value', sorter:(a,b) => (a.value || 0) - (b.value || 0), render:money },
    { title:'Custo unitário', key:'cost', sorter:filters.unit ? (a,b) => (valid(a) ? cost(a) : 0) - (valid(b) ? cost(b) : 0) : undefined, render:(_,w) => valid(w) ? `${money(cost(w))} / ${unitLabel(w.unit)}` : '—' },
  ];
  if (loading) return <div className="loading"><Spin size="large" /></div>;
  if (error) return <div className="loading">Não foi possível carregar os dados. <Button onClick={() => window.location.reload()}>Tentar novamente</Button></div>;
  return <ConfigProvider locale={ptBR} componentSize="large" theme={{token:{colorPrimary:'#146c62', borderRadius:10, fontSize:16, fontFamily:'Inter, system-ui, sans-serif', colorText:'#203331'}}}>
    <header className="hero-header"><div className="hero-inner"><div className="hero-nav"><div className="brand"><span className="brand-icon"><ApartmentOutlined /></span><strong>OBSERVATÓRIO DE CUSTOS · FERRAMENTA INDEPENDENTE</strong></div><div><Button href={import.meta.env.BASE_URL}>Voltar ao painel básico</Button> <Button onClick={() => setMethod(true)}>Metodologia</Button></div></div><div className="hero-content"><span className="hero-kicker">EXPLORAÇÃO AVANÇADA</span><h1>Explore as obras<br/>e suas referências<span>.</span></h1><p>Refine filtros, examine gráficos e selecione obras universitárias para fundamentar referências preliminares de custo. Para consultar a duração histórica, volte ao painel básico.</p><div className="hero-source">Dados: SIMEC / MEC · obras concluídas · extração: outubro de 2025 · revisão: não informada<br/>Ferramenta gratuita e independente, sem vínculo com o SIMEC ou o MEC. Não é o CUB oficial.</div></div></div></header>
    <main className="dashboard">
      <div className="page-title"><div><h1>Exploração avançada</h1><span>{number(filtered.length)} obras no recorte · filtre e revise a comparabilidade antes de usar os resultados</span></div><div className="page-actions"><Button className="filter-toggle" type="primary" icon={filtersOpen ? <MinusOutlined /> : <PlusOutlined />} aria-expanded={filtersOpen} aria-controls="filters-panel" onClick={() => setFiltersOpen(v => !v)}>{filtersOpen ? 'Ocultar filtros' : 'Selecionar filtros'}</Button><Button icon={<DownloadOutlined />} onClick={() => download(filtered, mode, target)}>Exportar CSV do recorte</Button></div></div>
      <div className="active-filters" aria-label="Filtros ativos"><span>Filtros:</span>{Object.entries(filters).filter(([,v]) => Array.isArray(v) ? v.length : v).map(([k,v]) => <span className="filter-chip" key={k}>{({state:'UF',city:'Município',institution:'Instituição',type:'Tipo',typology:'Tipologia',unit:'Unidade'})[k]}: {Array.isArray(v) ? v.join(', ') : k === 'unit' ? unitLabel(v) : v}</span>)}{Object.entries(ranges).filter(([,v]) => v != null).map(([k,v]) => <span className="filter-chip" key={k}>{({quantityMin:'Qtd. mín.',quantityMax:'Qtd. máx.',valueMin:'Valor mín.',valueMax:'Valor máx.',yearMin:'Ano mín.',yearMax:'Ano máx.'})[k]}: {number(v)}</span>)}{search && <span className="filter-chip">Nome: {search}</span>}{!Object.values(filters).some(v => Array.isArray(v) ? v.length : v) && !Object.values(ranges).some(v => v != null) && !search && <span>Nenhum</span>}</div>
      {filtersOpen && <section id="filters-panel" className="panel filters-panel" aria-label="Filtros">
        <div className="section-heading"><h2>Filtros</h2><Button type="link" onClick={clear}>Limpar</Button></div>
        <div className="filter-grid">
          {[['state','UF',works],['city','Município',filters.state?.length ? works.filter(w => filters.state.includes(w.state)) : works],['institution','Instituição',works],['type','Tipo de obra',works],['typology','Tipologia',works],['unit','Unidade',works]].map(([field,label,data]) => <label key={field}><span>{label}</span><Select aria-label={label} mode={multiFields.has(field) ? 'multiple' : undefined} maxTagCount="responsive" allowClear showSearch={{optionFilterProp:'label'}} placeholder="Todas" value={filters[field]} options={options(data,field)} onChange={v => setFilter(field,v)} /></label>)}
          <label className="search-field"><span>Nome da obra</span><Input aria-label="Buscar pelo nome da obra" prefix={<SearchOutlined />} placeholder="Buscar pelo nome da obra" value={search} onChange={e => {setSearch(e.target.value); setExcluded([]);}} allowClear /></label>
        </div>
        <div className="range-grid">{[['quantity',`Quantidade${filters.unit ? ` (${unitLabel(filters.unit)})` : ''}`],['value','Valor contratado original (R$)'],['year','Ano do contrato']].map(([field,label]) => <fieldset key={field}><legend>{label}</legend><div><InputNumber {...numericInput} aria-label={`${label} mínimo`} placeholder="Mínimo" disabled={field === 'quantity' && !filters.unit} value={ranges[`${field}Min`]} onChange={v => setRange(`${field}Min`,v)} min={0} precision={field === 'year' ? 0 : undefined} /><span>—</span><InputNumber {...numericInput} aria-label={`${label} máximo`} placeholder="Máximo" disabled={field === 'quantity' && !filters.unit} value={ranges[`${field}Max`]} onChange={v => setRange(`${field}Max`,v)} min={0} precision={field === 'year' ? 0 : undefined} /></div></fieldset>)}</div>
      </section>}
      <section className="panel estimate"><div className="section-heading"><div><span className="estimate-kicker">SUA REFERÊNCIA</span><h2>Estimativa de custo</h2><span>Mediana das obras selecionadas</span></div><Button type="primary" icon={<FileTextOutlined />} loading={generating} disabled={!reference.length || !filters.unit || !(quantity > 0)} onClick={report}>Gerar PDF</Button></div><div className="estimate-body"><div className="estimate-inputs"><label>{filters.unit === 'm2' ? 'Área do projeto' : 'Quantidade do projeto'}<InputNumber aria-label={filters.unit === 'm2' ? 'Área do projeto' : 'Quantidade do projeto'} min={0} value={quantity} onChange={setQuantity} addonAfter={filters.unit ? unitLabel(filters.unit) : '—'} /></label><label>Atualização monetária<Select aria-label="Atualização monetária" value={mode} onChange={v => {setMode(v);if(v !== 'nominal') setTarget(series[v]?.ultimo_periodo || '');setExcluded([]);}} options={[{value:'nominal',label:'Sem atualização · valores nominais'},{value:'incc',label:'INCC-Brasil-DI',disabled:!series.incc},{value:'igpm',label:'IGP-M',disabled:!series.igpm},{value:'ipca',label:'IPCA · em breve',disabled:true}]} /></label>{mode !== 'nominal' && <label>Mês de referência<Select aria-label="Mês de referência" value={target} showSearch={{optionFilterProp:'label'}} onChange={v => {setTarget(v);setExcluded([]);}} options={(incc?.registros || []).slice().reverse().map(r => ({value:r.periodo,label:`${r.periodo.slice(5)}/${r.periodo.slice(0,4)}`}))} /></label>}<span className="estimate-note">{mode !== 'nominal' ? `${incc?.nome || "Índice indisponível"}, FGV IBRE; data do contrato usada como aproximação. ${number(excludedByIncc)} obras com valor positivo sem atualização possível.` : 'Valores nominais, sem atualização monetária.'}</span></div><div className="estimate-results"><div className="estimate-primary"><small>Estimativa total</small><strong>{money(quantity > 0 && refStats.median != null ? quantity * refStats.median : null)}</strong><span>Faixa: {money(quantity > 0 && refStats.q1 != null ? quantity * refStats.q1 : null)} – {money(quantity > 0 && refStats.q3 != null ? quantity * refStats.q3 : null)}</span></div><div className="estimate-metrics"><div><small>Custo unitário mediano</small><strong>{money(refStats.median)}{filters.unit ? ` / ${unitLabel(filters.unit)}` : ''}</strong></div><div><small>Faixa unitária · P25–P75</small><strong>{money(refStats.q1)} – {money(refStats.q3)}</strong></div><div><small>Referências selecionadas</small><strong>{number(reference.length)}</strong></div></div></div></div>{!filters.unit && <p className="hint">Selecione uma unidade para calcular a estimativa.</p>}{reportError && <p className="hint" role="alert">Não foi possível gerar o PDF. Tente novamente.</p>}</section>
      <div className="reference-context"><strong>{mode !== 'nominal' ? `${incc?.nome || "Índice indisponível"} · referência ${target.slice(5)}/${target.slice(0,4)}` : 'Valores nominais · sem atualização'}</strong><span>{number(filtered.length)} obras no recorte → {number(candidates.length)} aptas ao cálculo → {number(reference.length)} selecionadas</span><span>Custo unitário mediano × {filters.unit === 'm2' ? 'área' : 'quantidade'} do projeto = estimativa total</span><span>Faixa central observada: do 1º ao 3º quartil (P25–P75).</span></div>
      <section className="profile"><div className="section-heading"><div><h2>Como variam os custos?</h2><span>Obras selecionadas para a estimativa · {mode !== 'nominal' ? `${incc?.nome || "Índice indisponível"} ${target.slice(5)}/${target.slice(0,4)}` : 'valores nominais'}</span></div><div className="chart-control"><Segmented aria-label="Tipo de visualização" value={chartMode} onChange={setChartMode} options={[{value:'observado',label:'Dados observados'},{value:'teorico',label:'Sino teórico'}]} /></div></div>
        <div className="chart-range"><span>{chartMode === 'observado' ? 'Mostrar até o percentil observado' : 'Faixa central da curva teórica'}</span><Segmented aria-label="Faixa exibida" value={percentile} onChange={setPercentile} options={[50,75,90,95,99].map(value => ({value,label:chartMode === 'observado' ? `P${value}` : `${value}%`})).concat({value:100,label:chartMode === 'observado' ? 'Todos' : '±4σ'})} /></div>
        <Distribution title={`Custo unitário das referências${filters.unit ? ` (R$ / ${unitLabel(filters.unit)})` : ''}`} data={costs} info={refStats} percentile={percentile} chartMode={chartMode} currency disabled={!filters.unit} />
        <details className="additional-profile"><summary>Explorar perfil das obras</summary><p>Estas análises consideram todas as obras no recorte, inclusive as não selecionadas para a estimativa.</p><div className="profile-grid profile-secondary"><Distribution title={`${filters.unit === 'm2' ? 'Área das obras' : 'Quantidade das obras'}${filters.unit ? ` (${unitLabel(filters.unit)})` : ''}`} data={quantities} info={quantityStats} percentile={percentile} chartMode={chartMode} disabled={!filters.unit} /><Distribution title={`Valor contratado ${mode !== 'nominal' ? 'atualizado' : 'nominal'} (R$)`} data={values} info={valueStats} percentile={percentile} chartMode={chartMode} currency /></div>
        <div className="panel category-panel"><div className="panel-title"><h3>Tipologias</h3><span>{number(filtered.length)} obras</span></div><div className="category-table-wrap"><table className="category-table"><thead><tr><th>Tipologia</th><th>Obras</th><th>Participação</th></tr></thead><tbody>{byTypology.map(({name,count}) => <tr key={name}><td>{name}</td><td>{number(count)}</td><td>{filtered.length ? `${number(count / filtered.length * 100)}%` : '—'}</td></tr>)}</tbody></table>{!byTypology.length && <div className="category-empty">Nenhuma obra no recorte</div>}</div></div></details>
      </section>
      <section className="works-section"><div className="section-heading"><div><h2>Obras <span className="count">{number(filtered.length)}</span></h2><span>Marque as referências da estimativa</span></div><Button onClick={() => setExcluded([])}>Selecionar elegíveis</Button></div><div className="panel table-panel"><Table rowKey="key" columns={columns} dataSource={filtered} rowSelection={{selectedRowKeys:reference.map(w => w.key), getCheckboxProps:w => ({disabled:!filters.unit || !valid(w) || w.unit !== filters.unit}), onChange:keys => setExcluded(candidates.filter(w => !keys.includes(w.key)).map(w => w.key))}} pagination={{defaultPageSize:10, showSizeChanger:true, pageSizeOptions:[10,20,50,100], showTotal:t => `${number(t)} obras`}} scroll={{x:1100}} /></div></section>
      <footer>Fonte: SIMEC / MEC · Extração: outubro de 2025 · Revisão: não informada<br/>Projeto independente, sem vínculo com o SIMEC ou o MEC.</footer>
    </main>
    <Drawer title="Obra" open={!!selected} onClose={() => setSelected(null)} size={560}>{selected && <div className="details"><small>ID {selected.id} · {selected.institution}</small><h2>{selected.name || 'Obra sem nome'}</h2><p>{selected.description}</p>{[['Instituição',selected.university],['Campus',selected.campus],['Local',[selected.city,selected.state].filter(Boolean).join(', ')],['Tipo',selected.type],['Tipologia',selected.typology],['Quantidade',selected.quantity ? `${number(selected.quantity)} ${unitLabel(selected.unit)}` : '—'],['Valor contratado original',money(selected.originalValue)],...(mode !== 'nominal' ? [['Valor atualizado',money(selected.value)],['Fator de atualização',selected.factor == null ? '—' : selected.factor.toFixed(6)]] : []),['Contrato',selected.date],['Início adotado',dateDescription(selected.datas_execucao?.inicio)],['Conclusão / prazo adotado',dateDescription(selected.datas_execucao?.fim)],['Coerência das datas',selected.datas_execucao?.situacao]].map(([k,v]) => <div className="detail-row" key={k}><span>{k}</span><strong>{v || '—'}</strong></div>)}<details><summary>Datas originais</summary>{Object.entries(selected.datas_originais || {}).map(([k,v]) => <div className="detail-row" key={k}><span>{k}</span><strong>{v || '—'}</strong></div>)}</details>{selected.link && <Button href={selected.link} target="_blank" rel="noopener noreferrer">Ver no SIMEC</Button>}</div>}</Drawer>
    <Drawer title="Metodologia" open={method} onClose={() => setMethod(false)} size={520}><div className="details"><p>Projeto independente, sem vínculo com o SIMEC ou o MEC. Fonte: obras concluídas do SIMEC/MEC, extração em outubro de 2025; data de revisão não informada.</p><p>O custo unitário é o valor contratado dividido pela quantidade. O valor contratado não é necessariamente o custo final da obra. A estimativa usa a mediana das referências selecionadas multiplicada pela quantidade do projeto. A faixa usa os percentis 25 e 75. Não se trata do CUB oficial.</p><p>INCC-Brasil-DI e IGP-M são séries FGV IBRE. O mês da assinatura é aproximação da data-base; registros sem índices ou posteriores ao destino não são atualizados. IPCA não está integrado. Registros duplicados permanecem na base.</p><p>As barras representam frequências observadas por faixa e podem ser limitadas até um percentil observado. O sino opcional é uma curva normal teórica centrada na média, usando o desvio-padrão populacional; não representa a distribuição real. Seus controles indicam a parcela central teórica e podem incluir valores negativos. As escolhas afetam apenas os gráficos, não os cálculos.</p></div></Drawer>
  </ConfigProvider>;
}
function dateDescription(value) { return value ? `${value.data} · ${value.tipo} · ${value.fonte}` : '—'; }
function DateValue({date}) { return date ? <span className="table-date">{date.data}<small>{date.tipo === 'prazo' ? (date.fonte.includes('Aditivo') ? 'Prazo após aditivo' : 'Prazo original') : date.tipo === 'aproximada' ? 'Aproximada' : 'Informada'}</small></span> : '—'; }
function Distribution({title,data,info,percentile,chartMode,currency,disabled}) {
  const theoretical = chartMode === 'teorico';
  const chart = theoretical ? normalCurve(data, percentile) : histogram(data, percentile);
  const format = currency ? money : number;
  const hasChart = theoretical ? !!chart : chart.bins.length > 0;
  return <div className="panel distribution">
    <div className="panel-title"><h3>{title}</h3><span>{number(data.length)} obras com dados válidos</span></div>
    {disabled ? <div className="chart-empty">Selecione uma unidade</div> : hasChart ? <>
      {theoretical && <div className="bell-mean"><span>Média observada</span><strong>{format(chart.mean)}</strong></div>}
      <div className="histogram"><ResponsiveContainer width="100%" height="100%">{theoretical ?
        <AreaChart data={chart.points} margin={{left:4,right:12,top:12,bottom:0}}><CartesianGrid stroke="#edf1ef" vertical={false}/><XAxis type="number" dataKey="x" domain={[chart.min,chart.max]} tickFormatter={short} tickLine={false} axisLine={false} minTickGap={25}/><YAxis hide domain={[0,1.05]}/><Tooltip labelFormatter={v => format(v)} formatter={v => [`${number(v*100)}%`,'Altura relativa teórica']} /><Area type="monotone" dataKey="density" stroke="#398875" strokeWidth={3} fill="#b8dacc" fillOpacity={0.65} isAnimationActive={false}/><ReferenceLine x={chart.mean} stroke="#175d4b" strokeWidth={2} strokeDasharray="4 4"/></AreaChart> :
        <BarChart data={chart.bins} margin={{left:-12,right:12,top:12,bottom:0}}><CartesianGrid stroke="#edf1ef" vertical={false}/><XAxis dataKey="from" tickFormatter={short} tickLine={false} axisLine={false} minTickGap={25}/><YAxis allowDecimals={false} tickLine={false} axisLine={false}/><Tooltip labelFormatter={(_,items) => items?.[0] ? `${format(items[0].payload.from)} a ${format(items[0].payload.to)}` : ''} formatter={v => [number(v),'Obras']} /><Bar dataKey="count" fill="#64a391" radius={[4,4,0,0]} isAnimationActive={false}/></BarChart>}
      </ResponsiveContainer></div>
      <div className="chart-caption">{theoretical ? `Curva normal teórica · ${percentile === 100 ? '±4 desvios-padrão' : `${percentile}% central teórico`} · não representa a distribuição real` : `Obras por faixa · ${number(chart.shown)} de ${number(data.length)} exibidas; estatísticas usam todas as referências`}</div>
    </> : <div className="chart-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={data.length ? 'Dados sem dispersão suficiente' : 'Sem dados'} /></div>}
    <div className="statistics">{[['1º quartil · P25',info.q1],['Mediana observada',info.median],['3º quartil · P75',info.q3],...(theoretical ? [] : [['Média observada',info.mean]])].map(([label,v]) => <div key={label}><span>{label}</span><strong>{format(v)}</strong></div>)}</div>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
