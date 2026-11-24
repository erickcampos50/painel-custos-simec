import React, { useId } from 'react';

export function PorteControls({ lower, upper, setLower, setUpper, cost, duration, setCost, setDuration }) {
  const id = useId();
  return <details className="porte-controls">
    <summary>Ajustar faixa de porte · {lower}%–{upper}%</summary>
    <div className="porte-controls-body">
      <p>Faixa de {lower}% a {upper}% dos valores informados.</p>
      <label htmlFor={`${id}-lower`}>Limite inferior: {lower}%</label>
      <input id={`${id}-lower`} type="range" min="1" max="400" step="1" value={lower} aria-valuetext={`${lower}% do informado`} onChange={e => setLower(Math.min(Number(e.target.value), upper))} />
      <label htmlFor={`${id}-upper`}>Limite superior: {upper}%</label>
      <input id={`${id}-upper`} type="range" min="1" max="400" step="1" value={upper} aria-valuetext={`${upper}% do informado`} onChange={e => setUpper(Math.max(Number(e.target.value), lower))} />
      <div className="porte-checks">
        <label><input type="checkbox" checked={cost} onChange={e => setCost(e.target.checked)} /> Aplicar ao custo unitário pela área ou quantidade</label>
        <label><input type="checkbox" checked={duration} onChange={e => setDuration(e.target.checked)} /> Aplicar ao prazo pela quantidade e/ou orçamento</label>
      </div>
      <p>A faixa afeta apenas os indicadores marcados e só é aplicada quando os dados correspondentes são informados.</p>
    </div>
  </details>;
}
