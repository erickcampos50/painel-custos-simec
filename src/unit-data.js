// Custos e quantidades só podem ser agregados após selecionar uma unidade.
export function worksInUnit(works, unit) {
  if (typeof unit !== 'string' || !unit) return [];
  return works.filter(work => work.unit === unit);
}

export function comparableWorks(works, unit) {
  return worksInUnit(works, unit).filter(work => work.value > 0 && work.quantity > 0);
}
