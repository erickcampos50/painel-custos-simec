export function histogram(values, percentile) {
  if (!values.length) return { bins: [], shown: 0 };
  const sorted = [...values].sort((a,b) => a-b);
  const position = (sorted.length - 1) * percentile / 100;
  const i = Math.floor(position);
  const max = sorted[i] + (sorted[Math.ceil(position)] - sorted[i]) * (position - i);
  const min = sorted[0];
  const shown = sorted.filter(v => v <= max).length;
  if (min === max) return { bins:[{from:min,to:max,count:shown}], shown };
  const width = (max - min) / 10;
  const bins = Array.from({length:10}, (_,index) => ({from:min + index*width, to:min + (index+1)*width, count:0}));
  sorted.forEach(v => { if (v <= max) bins[Math.min(9, Math.floor((v-min)/width))].count++; });
  return {bins, shown};
}
