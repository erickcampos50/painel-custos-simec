import test from 'node:test';
import assert from 'node:assert/strict';
import { durationDays, statistics } from '../src/estimativa-calculos.js';

const work = (inicio, fim, situacao = 'coerente') => ({ datas_execucao: { inicio, fim, situacao } });
const date = (data, tipo = 'informada') => ({ data, tipo });
test('calcula apenas intervalos efetivamente informados e coerentes', () => {
  assert.equal(durationDays(work(date('01/01/2020'), date('11/01/2020'))), 10);
  assert.equal(durationDays(work(date('01/01/2020', 'aproximada'), date('11/01/2020'))), null);
  assert.equal(durationDays(work(date('01/01/2020'), date('11/01/2020', 'prazo'))), null);
  assert.equal(durationDays(work(date('01/01/2020'), date('11/01/2020'), 'inconsistente')), null);
  assert.equal(durationDays(work(date('31/02/2020'), date('11/03/2020'))), null);
  assert.equal(durationDays(work(date('11/01/2020'), date('11/01/2020'))), null);
});
test('mediana e quartis usam interpolação linear', () => {
  assert.deepEqual(statistics([4, 1, 3, 2]), { count: 4, q1: 1.75, median: 2.5, q3: 3.25 });
  assert.equal(statistics([]).median, null);
});
