export function quantile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}

export function statistics(values) {
  return { count: values.length, q1: quantile(values, .25), median: quantile(values, .5), q3: quantile(values, .75) };
}

function parseDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  if (!match) return null;
  const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() : null;
}

// Somente início e conclusão informados; prazos e inícios aproximados não são duração efetiva.
export function durationDays(work) {
  const dates = work.datas_execucao;
  if (dates?.situacao !== 'coerente' || dates.inicio?.tipo !== 'informada' || dates.fim?.tipo !== 'informada') return null;
  const start = parseDate(dates.inicio.data), end = parseDate(dates.fim.data);
  if (start === null || end === null || end <= start) return null;
  return (end - start) / 86400000;
}

// Faixas multiplicativas são heurísticas de comparação, não um modelo preditivo.
export function durationReferences(works, { quantity, budget, lowerFactor = 0.5, upperFactor = 2 } = {}) {
  if (!Number.isFinite(lowerFactor) || !Number.isFinite(upperFactor) || lowerFactor <= 0 || upperFactor < lowerFactor) {
    throw new RangeError('Faixa de porte inválida');
  }
  const hasQuantity = Number.isFinite(quantity) && quantity > 0;
  const hasBudget = Number.isFinite(budget) && budget > 0;
  const inRange = (value, target) => Number.isFinite(value) && value > 0 && value >= target * lowerFactor && value <= target * upperFactor;
  const sizeEligible = works.filter(work =>
    (!hasQuantity || inRange(work.quantity, quantity)) &&
    (!hasBudget || inRange(work.value, budget))
  );
  const references = sizeEligible.map(work => ({ work, days: durationDays(work) })).filter(item => item.days != null);
  return { sizeEligible, references, statistics: statistics(references.map(item => item.days)), hasQuantity, hasBudget, lowerFactor, upperFactor };
}
