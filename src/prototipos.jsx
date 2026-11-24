import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './prototipos.css';

const money = value => value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const num = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const scenarios = [
  { id: 'area', icon: '▧', title: 'Tenho a área', description: 'Quero estimar o custo da obra.' },
  { id: 'budget', icon: '◈', title: 'Tenho o orçamento', description: 'Quero entender o que ele permite.' },
  { id: 'both', icon: '▤', title: 'Tenho os dois', description: 'Quero comparar custo e orçamento.' },
];

function App() {
  const [version, setVersion] = useState('a');
  const [scenario, setScenario] = useState('both');
  const [step, setStep] = useState(1);
  const [area, setArea] = useState('');
  const [budget, setBudget] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const hasArea = scenario !== 'budget' && Number(area) > 0;
  const hasBudget = scenario !== 'area' && Number(budget) > 0;
  const estimate = hasArea ? Number(area) * 4200 : null;
  const areaEstimate = hasBudget ? Number(budget) / 4200 : null;
  const ready = scenario === 'area' ? hasArea : scenario === 'budget' ? hasBudget : hasArea && hasBudget;
  const chooseScenario = value => { setScenario(value); setStep(1); };
  const fields = <div className="p-fields">
    <label className="p-wide">Nome da obra <small>opcional</small><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: novo bloco de salas" /></label>
    <label>Tipo de intervenção <small>opcional</small><select value={type} onChange={e => setType(e.target.value)}><option value="">Selecione</option><option>Construção</option><option>Reforma</option><option>Ampliação</option></select></label>
    <label>Localização <small>opcional</small><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex.: Belo Horizonte, MG" /></label>
    {scenario !== 'budget' && <label>Área da obra <span className="p-required">necessária</span><div className="p-input"><input type="number" min="0" value={area} onChange={e => setArea(e.target.value)} placeholder="Informe a área" /><span>m²</span></div></label>}
    {scenario !== 'area' && <label>Orçamento máximo <span className="p-required">necessário</span><div className="p-input"><span>R$</span><input type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Informe o valor" /></div></label>}
  </div>;
  const result = <Results ready={ready} estimate={estimate} areaEstimate={areaEstimate} budget={hasBudget ? Number(budget) : null} scenario={scenario} name={name} />;
  return <div className="prototype">
    <div className="p-switch"><div><strong>LABORATÓRIO DE INTERFACE</strong><span>Compare duas propostas para a mesma tarefa</span></div><div className="p-switch-actions"><div className="p-toggle" aria-label="Versão da interface"><button className={version === 'a' ? 'active' : ''} onClick={() => setVersion('a')}>A · Guiada</button><button className={version === 'b' ? 'active' : ''} onClick={() => setVersion('b')}>B · Painel</button></div><a href={import.meta.env.BASE_URL}>Voltar à interface atual ↗</a></div></div>
    <div className="p-warning"><strong>Protótipo para avaliação.</strong> Valores, prazo e referências são fictícios; não usam a base SIMEC e não devem fundamentar decisões. Relatórios não são gerados nesta demonstração.</div>
    {version === 'a' ? <><header className="a-hero"><div className="p-container"><div className="p-brand"><span>◫</span> OBSERVATÓRIO DE OBRAS <em> / ESTIMATIVAS</em></div><div className="a-hero-content"><div><div className="p-eyebrow">PLANEJE COM MAIS CLAREZA</div><h1>Uma ideia mais clara<br />para a sua obra<span>.</span></h1><p>Comece pelo que você já sabe. Vamos organizar uma estimativa preliminar de custo e prazo.</p></div><div className="a-hero-mark" aria-hidden="true">⌁<small>DO PRIMEIRO DADO<br />À DECISÃO</small></div></div></div></header>
      <main className="p-container a-main"><nav className="p-steps" aria-label="Etapas da estimativa"><span className={step === 1 ? 'current' : ''}><b>01</b> Seu ponto de partida</span><span className={step === 2 ? 'current' : ''}><b>02</b> Dados da obra</span><span className={step === 3 ? 'current' : ''}><b>03</b> Estimativa</span></nav>
        {step === 1 && <section className="a-section"><div className="p-eyebrow">PRIMEIRO PASSO</div><h2>O que você já sabe sobre a obra?</h2><p>Escolha uma opção. Você poderá alterar os dados depois.</p><ScenarioCards value={scenario} onChange={chooseScenario} /><div className="p-bottom"><span>Sem área ou orçamento? <a href={import.meta.env.BASE_URL}>Explore a base atual ↗</a></span><button className="p-primary" onClick={() => setStep(2)}>Continuar <span>→</span></button></div></section>}
        {step === 2 && <section className="a-section"><div className="p-eyebrow">SOBRE O PROJETO</div><h2>Conte um pouco sobre a obra</h2><p>Preencha o que souber para simular a experiência.</p>{fields}<div className="p-bottom"><button className="p-text-button" onClick={() => setStep(1)}>← Voltar</button><button className="p-primary" disabled={!ready} onClick={() => setStep(3)}>Ver estimativa <span>→</span></button></div>{!ready && <p className="p-hint">Preencha os dados necessários para continuar.</p>}</section>}
        {step === 3 && <section className="a-section"><div className="p-eyebrow">SUA ESTIMATIVA</div><h2>Um ponto de partida para planejar.</h2><p>Confira o resultado e entenda as premissas por trás dele.</p>{result}<div className="p-bottom"><button className="p-text-button" onClick={() => setStep(2)}>← Editar dados</button><button className="p-secondary" disabled>Gerar relatório · indisponível</button></div></section>}
      </main></> : <><header className="b-header"><div className="p-container"><div className="p-brand"><span>◫</span> OBSERVATÓRIO DE OBRAS <em> / ESTIMATIVAS</em></div><div className="b-title"><div><div className="p-eyebrow">ESTIMATIVA PRELIMINAR</div><h1>Sua obra, em perspectiva<span>.</span></h1><p>Informe o que você sabe e acompanhe os resultados ao lado.</p></div><div className="b-badge">◷ &nbsp; SIMULAÇÃO INTERATIVA</div></div></div></header>
      <main className="p-container b-main"><div className="b-inputs"><div className="p-card"><div className="p-eyebrow">01 / PONTO DE PARTIDA</div><h2>O que você já sabe?</h2><p>Selecione os dados disponíveis.</p><ScenarioCards value={scenario} onChange={chooseScenario} compact /></div><div className="p-card"><div className="p-eyebrow">02 / DADOS DO PROJETO</div><h2>Sobre a obra</h2><p>Os resultados mudam conforme você preenche.</p>{fields}</div></div><div className="b-results"><div className="b-result-heading"><div><div className="p-eyebrow">03 / RESULTADO</div><h2>Estimativa preliminar</h2></div><span>● EXEMPLO</span></div>{result}<button className="p-secondary p-full" disabled>↓ &nbsp; Gerar relatório · indisponível no protótipo</button></div></main></>}
    <footer className="p-footer">Propostas de interface · dados fictícios · projeto independente, sem vínculo com o SIMEC ou o MEC</footer>
  </div>;
}

function ScenarioCards({ value, onChange, compact }) {
  return <div className={compact ? 'p-scenarios compact' : 'p-scenarios'}>{scenarios.map(item => <button key={item.id} className={value === item.id ? 'selected' : ''} aria-pressed={value === item.id} onClick={() => onChange(item.id)}><span className="scenario-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><span className="scenario-check">{value === item.id ? '✓' : '→'}</span></button>)}</div>;
}

function Results({ ready, estimate, areaEstimate, budget, scenario, name }) {
  if (!ready) return <div className="p-empty"><div className="empty-icon">▧</div><h3>O resultado aparece aqui</h3><p>Preencha os dados necessários para visualizar uma simulação de custo, prazo e orçamento.</p><div>✓ &nbsp; Estimativa de custo<br />✓ &nbsp; Referência de prazo<br />✓ &nbsp; Comparação com orçamento</div></div>;
  return <div className="p-result-content">
    <div className="p-result-intro"><span>SIMULAÇÃO ILUSTRATIVA {name && ` / ${name}`}</span><strong>Resultado preliminar</strong><p>Os números abaixo são exemplos fixos para avaliar a interface.</p></div>
    <div className="p-result-grid">
      {estimate != null ? <article className="p-metric primary"><div>◈ &nbsp; CUSTO ESTIMADO</div><strong>{money(estimate)}</strong><p>Faixa ilustrativa: {money(estimate * 3500 / 4200)} a {money(estimate * 4900 / 4200)}</p><small>Área informada × R$ 4.200/m² fictícios</small></article> : <article className="p-metric primary"><div>▧ &nbsp; ÁREA INDICATIVA</div><strong>{num(areaEstimate)} m²</strong><p>Faixa ilustrativa: {num(budget / 4900)} a {num(budget / 3500)} m²</p><small>Orçamento ÷ R$ 4.200/m² fictícios</small></article>}
      <article className="p-metric"><div>◷ &nbsp; PRAZO DE EXECUÇÃO</div><strong>12–18 meses</strong><p>Exemplo fictício, não calculado.</p><small>Metodologia de prazo ainda não validada</small></article>
      {scenario === 'both' && <article className="p-metric p-wide"><div>◉ &nbsp; COMPARAÇÃO COM ORÇAMENTO</div><strong>{estimate <= budget ? 'Abaixo do limite informado' : 'Acima do limite informado'}</strong><p>Diferença ilustrativa: {money(Math.abs(budget - estimate))} {estimate <= budget ? 'abaixo' : 'acima'} do orçamento.</p><small>Não representa uma análise de viabilidade.</small></article>}
    </div>
    <details className="p-details"><summary>Como seria fundamentada esta estimativa? <span>＋</span></summary><p>A versão final poderá apresentar critérios de comparação, obras selecionadas, cobertura das datas e fórmulas. Nenhuma referência real foi utilizada neste protótipo.</p></details>
    <div className="p-disclaimer">ⓘ &nbsp; Exemplo para teste de interface. Valores históricos, atualização monetária e prazo precisam ser validados antes do uso real.</div>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
