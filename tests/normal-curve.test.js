import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalCurve} from '../src/normal-curve.js';

test('sino centrado na média e faixa maior conforme escolha', () => {
  const data = [1, 2, 3, 4, 5];
  const a = normalCurve(data, 50), b = normalCurve(data, 99);
  assert.equal(a.mean, 3);
  assert.equal(a.points[50].x, 3);
  assert.equal(a.points[50].density, 1);
  assert.ok(b.min < a.min && b.max > a.max);
  assert.ok(Math.abs((a.mean-a.min) - (a.max-a.mean)) < 1e-12);
});
test('sem dispersão não cria curva normal fictícia', () => {
  assert.equal(normalCurve([5], 95), null);
  assert.equal(normalCurve([5,5], 95), null);
  assert.equal(normalCurve([], 95), null);
});
