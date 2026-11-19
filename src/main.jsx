import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ConfigProvider, Drawer, Empty, Input, InputNumber, Segmented, Select, Spin, Table } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { ApartmentOutlined, DownloadOutlined, FileTextOutlined, PlusOutlined, MinusOutlined, SearchOutlined } from '@ant-design/icons';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
function densityCurve(values, percentile) {
  if (!values.length) return { points: [], shown: 0 };
  const min = Math.min(...values), max = percentile === 100 ? Math.max(...values) : quantile(values, percentile / 100);
  const shown = values.filter(v => v <= max).length;
  if (min === max) return { points: [], shown, single: min };
  const mean = values.reduce((a,b) => a+b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((sum,v) => sum + (v-mean)**2, 0) / values.length);
  const robust = (quantile(values,.75) - quantile(values,.25)) / 1.34;
  const scale = robust > 0 ? Math.min(sd, robust) : sd;
  const bandwidth = Math.max(0.9 * scale * values.length**(-.2), (max-min)/500, Number.EPSILON);
  const points = Array.from({length:81}, (_, i) => {
    const x = min + (max-min) * i / 80;
    const density = values.reduce((sum,v) => sum + Math.exp(-0.5 * ((x-v)/bandwidth)**2), 0) / (values.length * bandwidth * Math.sqrt(2*Math.PI));
    return {x, density};
  });
  return {points, shown, min, max};
}
function download(rows) {
  const columns = [['ID','id'],['Nome','name'],['Instituição','institution'],['UF','state'],['Município','city'],['Tipo','type'],['Tipologia','typology'],['Unidade','unit'],['Quantidade','quantity'],['Valor contratado','value'],['Data do contrato','date']];
  const escape = v => { const text = String(v ?? ''); return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`; };
  const csv = [columns.map(c => escape(c[0])).join(';'), ...rows.map(w => columns.map(c => escape(w[c[1]])).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type:'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = 'obras-simec.csv'; a.click(); URL.revokeObjectURL(url);
}

function App() {
  const [works, setWorks] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const [filters, setFilters] = useState({ unit:'m2' }), [ranges, setRanges] = useState({}), [search, setSearch] = useState('');
  const [excluded, setExcluded] = useState([]), [selected, setSelected] = useState(null), [quantity, setQuantity] = useState(1000), [percentile, setPercentile] = useState(95), [method, setMethod] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [generating, setGenerating] = useState(false), [reportError, setReportError] = useState(false);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}obras.json`).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setWorks).catch(() => setError(true)).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => works.filter(w => {
    if (!Object.entries(filters).every(([k, v]) => Array.isArray(v) ? !v.length || v.includes(w[k]) : !v || w[k] === v)) return false;
    if (search.trim() && !String(w.name ?? '').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) return false;
    return [['quantity','quantity'],['value','value'],['year','date']].every(([field, property]) => {
      const lo = ranges[`${field}Min`], hi = ranges[`${field}Max`];
      if (lo == null && hi == null) return true;
      const v = field === 'year' ? year(w[property]) : w[property];
      return v != null && (lo == null || v >= lo) && (hi == null || v <= hi);
    });
  }), [works, filters, ranges, search]);
  const candidates = useMemo(() => filtered.filter(w => valid(w) && w.unit === filters.unit), [filtered, filters.unit]);
  const reference = useMemo(() => candidates.filter(w => !excluded.includes(w.key)), [candidates, excluded]);
  const quantities = filters.unit ? filtered.filter(w => w.quantity > 0).map(w => w.quantity) : [];
  const values = filtered.filter(w => w.value > 0).map(w => w.value);
  const costs = candidates.map(cost);
  const quantityStats = stats(quantities), valueStats = stats(values), costStats = stats(costs), refStats = stats(reference.map(cost));
  const byTypology = Object.entries(filtered.reduce((acc, w) => { const label = w.typology || 'Não informada'; acc[label] = (acc[label] || 0) + 1; return acc; }, {})).sort((a,b) => b[1]-a[1]).slice(0, 7).map(([name, count]) => ({name, count}));
  const setFilter = (field, value) => { setFilters(f => ({...f, [field]:value, ...(field === 'state' ? {city:undefined} : {})})); if (field === 'unit') setRanges(r => ({...r, quantityMin:undefined, quantityMax:undefined})); setExcluded([]); };
  const setRange = (field, value) => { setRanges(r => ({...r, [field]:value})); setExcluded([]); };
  const clear = () => { setFilters({ unit:'m2' }); setRanges({}); setSearch(''); setExcluded([]); };
  const report = async () => {
    setGenerating(true); setReportError(false);
    try {
      const { generateReport } = await import('./report');
      generateReport({reference, filters, ranges, search, quantity, refStats, candidateCount:candidates.length});
    } catch (error) { console.error('Erro ao gerar PDF:', error); setReportError(true); }
    finally { setGenerating(false); }
  };
  const columns = [
    { title:'Obra', key:'name', sorter:(a,b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'), render:(_, w) => <div className="work-name"><button onClick={() => setSelected(w)}>{w.name || `Obra ${w.id}`}</button><small>{w.institution || '—'} · {w.id}</small></div> },
    { title:'Local', key:'location', sorter:(a,b) => [a.city,a.state].filter(Boolean).join(', ').localeCompare([b.city,b.state].filter(Boolean).join(', '), 'pt-BR'), render:(_, w) => [w.city, w.state].filter(Boolean).join(', ') || '—' },
    { title:'Tipo', dataIndex:'type', sorter:(a,b) => (a.type || '').localeCompare(b.type || '', 'pt-BR'), render:v => v || '—' },
    { title:'Tipologia', dataIndex:'typology', sorter:(a,b) => (a.typology || '').localeCompare(b.typology || '', 'pt-BR'), render:v => v || '—' },
    { title:'Quantidade', key:'quantity', sorter:(a,b) => (a.quantity || 0) - (b.quantity || 0), render:(_,w) => w.quantity > 0 ? `${number(w.quantity)} ${unitLabel(w.unit)}` : '—' },
    { title:'Contratado', dataIndex:'value', sorter:(a,b) => (a.value || 0) - (b.value || 0), render:money },
    { title:'Custo unitário', key:'cost', sorter:(a,b) => (valid(a) ? cost(a) : 0) - (valid(b) ? cost(b) : 0), render:(_,w) => valid(w) ? money(cost(w)) : '—' },
  ];
  if (loading) return <div className="loading"><Spin size="large" /></div>;
  if (error) return <div className="loading">Não foi possível carregar os dados. <Button onClick={() => window.location.reload()}>Tentar novamente</Button></div>;
  return <ConfigProvider locale={ptBR} componentSize="large" theme={{token:{colorPrimary:'#146c62', borderRadius:10, fontSize:16, fontFamily:'Inter, system-ui, sans-serif', colorText:'#203331'}}}>
    <header className="hero-header"><div className="hero-inner"><div className="hero-nav"><div className="brand"><span className="brand-icon"><ApartmentOutlined /></span><strong>ESTIMATIVA INDEPENDENTE</strong></div><Button onClick={() => setMethod(true)}>Metodologia</Button></div><div className="hero-content"><span className="hero-kicker">ESTIMATIVA INTERATIVA</span><h1>Custo unitário<br/>de obras universitárias<span>.</span></h1><p>Compare obras e encontre referências para seu projeto.</p><div className="hero-source">Dados: SIMEC / MEC · extração: outubro de 2025 · revisão: não informada<br/>Projeto independente, sem vínculo com o SIMEC ou o MEC.</div></div></div></header>
    <main className="dashboard">
      <div className="page-title"><div><h1>Explore as referências</h1><span>{number(filtered.length)} obras no recorte</span></div><div className="page-actions"><Button className="filter-toggle" type="primary" icon={filtersOpen ? <MinusOutlined /> : <PlusOutlined />} aria-expanded={filtersOpen} aria-controls="filters-panel" onClick={() => setFiltersOpen(v => !v)}>{filtersOpen ? 'Ocultar filtros' : 'Selecionar filtros'}</Button><Button icon={<DownloadOutlined />} onClick={() => download(filtered)}>Exportar CSV</Button></div></div>
      <div className="active-filters" aria-label="Filtros ativos"><span>Filtros:</span>{Object.entries(filters).filter(([,v]) => Array.isArray(v) ? v.length : v).map(([k,v]) => <span className="filter-chip" key={k}>{({state:'UF',city:'Município',institution:'Instituição',type:'Tipo',typology:'Tipologia',unit:'Unidade'})[k]}: {Array.isArray(v) ? v.join(', ') : k === 'unit' ? unitLabel(v) : v}</span>)}{Object.entries(ranges).filter(([,v]) => v != null).map(([k,v]) => <span className="filter-chip" key={k}>{({quantityMin:'Qtd. mín.',quantityMax:'Qtd. máx.',valueMin:'Valor mín.',valueMax:'Valor máx.',yearMin:'Ano mín.',yearMax:'Ano máx.'})[k]}: {number(v)}</span>)}{search && <span className="filter-chip">Nome: {search}</span>}{!Object.values(filters).some(v => Array.isArray(v) ? v.length : v) && !Object.values(ranges).some(v => v != null) && !search && <span>Nenhum</span>}</div>
      {filtersOpen && <section id="filters-panel" className="panel filters-panel" aria-label="Filtros">
        <div className="section-heading"><h2>Filtros</h2><Button type="link" onClick={clear}>Limpar</Button></div>
        <div className="filter-grid">
          {[['state','UF',works],['city','Município',filters.state?.length ? works.filter(w => filters.state.includes(w.state)) : works],['institution','Instituição',works],['type','Tipo de obra',works],['typology','Tipologia',works],['unit','Unidade',works]].map(([field,label,data]) => <label key={field}><span>{label}</span><Select aria-label={label} mode={multiFields.has(field) ? 'multiple' : undefined} maxTagCount="responsive" allowClear showSearch={{optionFilterProp:'label'}} placeholder="Todas" value={filters[field]} options={options(data,field)} onChange={v => setFilter(field,v)} /></label>)}
          <label className="search-field"><span>Nome da obra</span><Input aria-label="Buscar pelo nome da obra" prefix={<SearchOutlined />} placeholder="Buscar pelo nome da obra" value={search} onChange={e => {setSearch(e.target.value); setExcluded([]);}} allowClear /></label>
        </div>
        <div className="range-grid">{[['quantity',`Quantidade${filters.unit ? ` (${unitLabel(filters.unit)})` : ''}`],['value','Valor contratado (R$)'],['year','Ano do contrato']].map(([field,label]) => <fieldset key={field}><legend>{label}</legend><div><InputNumber {...numericInput} aria-label={`${label} mínimo`} placeholder="Mínimo" disabled={field === 'quantity' && !filters.unit} value={ranges[`${field}Min`]} onChange={v => setRange(`${field}Min`,v)} min={0} precision={field === 'year' ? 0 : undefined} /><span>—</span><InputNumber {...numericInput} aria-label={`${label} máximo`} placeholder="Máximo" disabled={field === 'quantity' && !filters.unit} value={ranges[`${field}Max`]} onChange={v => setRange(`${field}Max`,v)} min={0} precision={field === 'year' ? 0 : undefined} /></div></fieldset>)}</div>
      </section>}
      <section className="panel estimate"><div className="section-heading"><div><span className="estimate-kicker">SUA REFERÊNCIA</span><h2>Estimativa de custo</h2><span>Mediana das obras selecionadas</span></div><Button type="primary" icon={<FileTextOutlined />} loading={generating} disabled={!reference.length || !filters.unit || !(quantity > 0)} onClick={report}>Gerar PDF</Button></div><div className="estimate-body"><div className="estimate-inputs"><label>Quantidade do projeto<InputNumber aria-label="Quantidade do projeto" min={0} value={quantity} onChange={setQuantity} addonAfter={filters.unit ? unitLabel(filters.unit) : '—'} /></label><label>Atualização monetária<Select aria-label="Atualização monetária" value="nominal" options={[{value:'nominal',label:'Sem atualização · valores nominais'},{value:'incc',label:'INCC · em breve',disabled:true},{value:'igpm',label:'IGP-M · em breve',disabled:true},{value:'ipca',label:'IPCA · em breve',disabled:true}]} /></label><span className="estimate-note">Índices de correção ainda não disponíveis.</span></div><div className="estimate-results"><div className="estimate-primary"><small>Estimativa total</small><strong>{money(quantity > 0 && refStats.median != null ? quantity * refStats.median : null)}</strong><span>Faixa: {money(quantity > 0 && refStats.q1 != null ? quantity * refStats.q1 : null)} – {money(quantity > 0 && refStats.q3 != null ? quantity * refStats.q3 : null)}</span></div><div className="estimate-metrics"><div><small>Custo unitário mediano</small><strong>{money(refStats.median)}{filters.unit ? ` / ${unitLabel(filters.unit)}` : ''}</strong></div><div><small>Faixa unitária · P25–P75</small><strong>{money(refStats.q1)} – {money(refStats.q3)}</strong></div><div><small>Referências selecionadas</small><strong>{number(reference.length)}</strong></div></div></div></div>{!filters.unit && <p className="hint">Selecione uma unidade para calcular a estimativa.</p>}{reportError && <p className="hint" role="alert">Não foi possível gerar o PDF. Tente novamente.</p>}</section>
      <div className="summary-grid"><Summary label="Obras no recorte" value={number(filtered.length)} /><Summary label={`Mediana da quantidade${filters.unit ? ` · ${unitLabel(filters.unit)}` : ''}`} value={filters.unit ? number(quantityStats.median) : '—'} /><Summary label="Mediana do valor contratado" value={money(valueStats.median)} /><Summary label={`Mediana do custo unitário${filters.unit ? ` · ${unitLabel(filters.unit)}` : ''}`} value={filters.unit ? money(costStats.median) : '—'} /></div>
      <section className="profile"><div className="section-heading"><div><h2>Perfil dos dados</h2><span>Valores nominais · recorte filtrado</span></div><div className="chart-control"><span>Limite dos gráficos</span><Segmented aria-label="Limite dos gráficos" value={percentile} onChange={setPercentile} options={[50,75,90,95,99].map(value => ({value,label:`P${value}`})).concat({value:100,label:'Todos'})} /></div></div>
        <div className="profile-grid"><Distribution title={`Quantidade${filters.unit ? ` (${unitLabel(filters.unit)})` : ''}`} data={quantities} info={quantityStats} percentile={percentile} disabled={!filters.unit} /><Distribution title="Valor contratado (R$)" data={values} info={valueStats} percentile={percentile} currency /><Distribution title={`Custo unitário${filters.unit ? ` (R$ / ${unitLabel(filters.unit)})` : ''}`} data={costs} info={costStats} percentile={percentile} currency disabled={!filters.unit} /></div>
        <div className="panel category-panel"><div className="panel-title"><h3>Tipologias</h3><span>{number(filtered.length)} obras</span></div><div className="category-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={byTypology} layout="vertical" margin={{left:0,right:20}}><CartesianGrid stroke="#edf1ef" horizontal={false}/><XAxis type="number" tickLine={false} axisLine={false} tick={{fontSize:11}} allowDecimals={false}/><YAxis dataKey="name" type="category" width={165} tickLine={false} axisLine={false} tick={{fontSize:11}}/><Tooltip formatter={v => [number(v),'Obras']} /><Bar dataKey="count" fill="#73aa99" radius={[0,4,4,0]} barSize={13}/></BarChart></ResponsiveContainer></div></div>
      </section>
      <section className="works-section"><div className="section-heading"><div><h2>Obras <span className="count">{number(filtered.length)}</span></h2><span>Marque as referências da estimativa</span></div><Button onClick={() => setExcluded([])}>Selecionar elegíveis</Button></div><div className="panel table-panel"><Table rowKey="key" columns={columns} dataSource={filtered} rowSelection={{selectedRowKeys:reference.map(w => w.key), getCheckboxProps:w => ({disabled:!filters.unit || !valid(w) || w.unit !== filters.unit}), onChange:keys => setExcluded(candidates.filter(w => !keys.includes(w.key)).map(w => w.key))}} pagination={{defaultPageSize:10, showSizeChanger:true, pageSizeOptions:[10,20,50,100], showTotal:t => `${number(t)} obras`}} scroll={{x:1100}} /></div></section>
      <footer>Fonte: SIMEC / MEC · Extração: outubro de 2025 · Revisão: não informada<br/>Projeto independente, sem vínculo com o SIMEC ou o MEC.</footer>
    </main>
    <Drawer title="Obra" open={!!selected} onClose={() => setSelected(null)} size={560}>{selected && <div className="details"><small>ID {selected.id} · {selected.institution}</small><h2>{selected.name || 'Obra sem nome'}</h2><p>{selected.description}</p>{[['Instituição',selected.university],['Campus',selected.campus],['Local',[selected.city,selected.state].filter(Boolean).join(', ')],['Tipo',selected.type],['Tipologia',selected.typology],['Quantidade',selected.quantity ? `${number(selected.quantity)} ${unitLabel(selected.unit)}` : '—'],['Valor contratado',money(selected.value)],['Contrato',selected.date],['Conclusão',selected.completion]].map(([k,v]) => <div className="detail-row" key={k}><span>{k}</span><strong>{v || '—'}</strong></div>)}{selected.link && <Button href={selected.link} target="_blank" rel="noopener noreferrer">Ver no SIMEC</Button>}</div>}</Drawer>
    <Drawer title="Metodologia" open={method} onClose={() => setMethod(false)} size={520}><div className="details"><p>Projeto independente, sem vínculo com o SIMEC ou o MEC. Fonte: obras concluídas do SIMEC/MEC, extração em outubro de 2025; data de revisão não informada.</p><p>O custo unitário é o valor contratado dividido pela quantidade. A estimativa usa a mediana das referências selecionadas multiplicada pela quantidade do projeto. A faixa usa os percentis 25 e 75. Não se trata do CUB oficial.</p><p>Valores nominais, sem atualização monetária. INCC, IGP-M e IPCA ainda não estão integrados. Registros duplicados permanecem na base.</p><p>As curvas são estimativas de densidade suavizadas por kernel gaussiano, calculadas a partir de todo o recorte, sem pressupor distribuição normal. O percentil altera apenas o trecho visível; quartis e cálculos permanecem baseados no recorte completo.</p></div></Drawer>
  </ConfigProvider>;
}
function Summary({label,value}) { return <div className="panel summary"><span>{label}</span><strong>{value}</strong></div>; }
function Distribution({title,data,info,percentile,currency,disabled}) {
  const chart = densityCurve(data, percentile), format = currency ? money : number;
  return <div className="panel distribution"><div className="panel-title"><h3>{title}</h3><span>n = {number(data.length)}</span></div>{disabled ? <div className="chart-empty">Selecione uma unidade</div> : chart.points.length ? <><div className="histogram"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart.points} margin={{left:-20,right:12,top:12,bottom:0}}><CartesianGrid stroke="#edf1ef" vertical={false}/><XAxis type="number" dataKey="x" domain={[chart.min,chart.max]} tickFormatter={short} tick={{fontSize:10}} tickLine={false} axisLine={false} minTickGap={18}/><YAxis tickFormatter={v => v === 0 ? '0' : v.toExponential(1)} tick={{fontSize:10}} tickLine={false} axisLine={false}/><Tooltip labelFormatter={v => format(v)} formatter={v => [Number(v).toExponential(3),'Densidade estimada']} /><Area type="monotone" dataKey="density" stroke="#398875" strokeWidth={3} fill="#b8dacc" fillOpacity={0.7} isAnimationActive={false} />{[['P25',info.q1],['Mediana',info.median],['P75',info.q3]].filter(([,v]) => v >= chart.min && v <= chart.max).map(([label,v]) => <ReferenceLine key={label} x={v} stroke={label === 'Mediana' ? '#175d4b' : '#8ba99a'} strokeWidth={label === 'Mediana' ? 2 : 1} strokeDasharray="4 4" />)}</AreaChart></ResponsiveContainer></div><div className="chart-caption">Densidade estimada · {number(chart.shown)} de {number(data.length)} obras no intervalo</div></> : chart.single != null ? <div className="chart-empty">Valores iguais no intervalo: {format(chart.single)}</div> : <div className="chart-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem dados" /></div>}<div className="statistics">{[['P25',info.q1],['Mediana',info.median],['P75',info.q3],['Média',info.mean]].map(([label,v]) => <div key={label}><span>{label}</span><strong>{format(v)}</strong></div>)}</div></div>;
}
createRoot(document.getElementById('root')).render(<App />);
