import test from 'node:test';
import assert from 'node:assert/strict';
import { durationReferences } from '../src/estimativa-calculos.js';

const work = (key, quantity, value, endType = 'informada') => ({
  key, quantity, value,
  datas_execucao: { situacao: 'coerente', inicio: { tipo: 'informada', data: '01/01/2020' }, fim: { tipo: endType, data: '11/01/2020' } },
});
const works = [work('small', 50, 250000), work('match', 100, 500000), work('big', 200, 1000000), work('huge', 10000, 500000000), work('missing', 100, null), work('deadline', 100, 500000, 'prazo')];
test('sem dados de porte preserva o conjunto de durações válidas', () => {
  assert.equal(durationReferences(works).statistics.count, 5);
});
test('aplica faixa inclusiva ao valor atualizado, sem usar nominal ausente', () => {
  const result = durationReferences(works, { budget: 500000 });
  assert.deepEqual(result.references.map(x => x.work.key), ['small', 'match', 'big']);
  assert.equal(result.statistics.median, 10);
});
test('quantidade e orçamento informados devem atender a ambas as faixas', () => {
  const result = durationReferences(works, { quantity: 100, budget: 500000, lowerFactor: .75, upperFactor: 1.25 });
  assert.deepEqual(result.references.map(x => x.work.key), ['match']);
  assert.equal(result.sizeEligible.length, 2);
});
test('não amplia uma amostra vazia e valida fatores', () => {
  assert.equal(durationReferences(works, { budget: 100000000000 }).statistics.count, 0);
  assert.throws(() => durationReferences(works, { lowerFactor: 2, upperFactor: 1 }), RangeError);
});
