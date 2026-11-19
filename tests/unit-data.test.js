import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparableWorks, worksInUnit } from '../src/unit-data.js';

const works = [
  { unit:'m2', quantity:100, value:200000 },
  { unit:'m3', quantity:100, value:10000 },
  { unit:'Furo', quantity:1, value:5000 },
  { unit:'m2', quantity:0, value:1000 },
  { unit:'m2', quantity:40, value:0 },
  { unit:'', quantity:2, value:1000 },
];

test('cada unidade é selecionada isoladamente', () => {
  assert.deepEqual(comparableWorks(works, 'm2'), [works[0]]);
  assert.deepEqual(comparableWorks(works, 'm3'), [works[1]]);
  assert.deepEqual(comparableWorks(works, 'Furo'), [works[2]]);
  assert.equal(worksInUnit(works, 'm2').length, 3);
});

test('sem unidade explícita nenhuma obra é comparável', () => {
  for (const unit of ['', undefined, null]) {
    assert.deepEqual(worksInUnit(works, unit), []);
    assert.deepEqual(comparableWorks(works, unit), []);
  }
});
