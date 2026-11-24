export function contractMonth(date) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || '');
  if (!match) return null;
  const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${match[3]}-${match[2]}`;
}

export function updateWork(work, mode, target, indices) {
  const originalValue = work.value;
  if (mode === 'nominal') return {...work, originalValue, factor:1};
  if (mode !== 'incc' && mode !== 'igpm') return {...work, originalValue, value:null, factor:null};
  const origin = contractMonth(work.date);
  const initial = indices[origin], final = indices[target];
  if (!origin || !initial || !final || origin > target || !(originalValue > 0)) {
    return {...work, originalValue, value:null, factor:null, origin};
  }
  const factor = final / initial;
  return {...work, originalValue, value:originalValue * factor, factor, origin};
}
