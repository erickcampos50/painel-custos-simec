import {test} from 'node:test';
import assert from 'node:assert/strict';
import {histogram} from '../src/histogram.js';

test('conta observações e limita apenas a visualização', () => {
  const data = [1,2,3,4,5,6,7,8,9,10];
  const result = histogram(data, 50);
  assert.equal(result.shown, 5);
  assert.equal(result.bins.reduce((sum,b) => sum+b.count, 0), 5);
  assert.equal(histogram(data,100).shown,10);
});
test('valores iguais não criam divisões inválidas', () => {
  assert.deepEqual(histogram([5,5],95), {bins:[{from:5,to:5,count:2}],shown:2});
  assert.deepEqual(histogram([],95), {bins:[],shown:0});
});
