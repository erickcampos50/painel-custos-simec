// As faixas são centrais na normal teórica, não percentis empíricos dos dados.
const Z = {50:0.67448975, 75:1.15034938, 90:1.64485363, 95:1.95996398, 99:2.5758293, 100:4};

export function normalCurve(values, range) {
  if (values.length < 2 || !Z[range]) return null;
  const mean = values.reduce((a,b) => a+b, 0) / values.length;
  const deviation = Math.sqrt(values.reduce((sum,v) => sum + (v-mean)**2, 0) / values.length);
  if (!Number.isFinite(deviation) || deviation === 0) return null;
  const z = Z[range];
  const points = Array.from({length:101}, (_,i) => {
    const standard = -z + 2*z*i/100;
    return {x:mean + standard*deviation, density:Math.exp(-(standard**2)/2)};
  });
  return {mean, deviation, points, min:points[0].x, max:points[100].x};
}
