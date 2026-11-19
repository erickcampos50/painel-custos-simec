import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contractMonth, updateWork} from '../src/incc.js';

test('corrige pela razão entre os índices dos meses', () => {
  const result = updateWork({value:100, date:'01/06/2020'}, 'incc', '2021-06', {'2020-06':100,'2021-06':125});
  assert.equal(result.value,125);
  assert.equal(result.originalValue,100);
  assert.equal(result.factor,1.25);
});
test('não mistura valores sem data ou índice e posteriores ao destino', () => {
  for (const date of ['', '31/02/2020', '01/01/1994', '01/07/2021']) {
    assert.equal(updateWork({value:100,date}, 'incc', '2021-06', {'2021-06':125}).value,null);
  }
  assert.equal(contractMonth('29/02/2020'),'2020-02');
});
test('modo nominal preserva o valor original', () => {
  assert.equal(updateWork({value:100,date:''}, 'nominal', '', {}).value,100);
});
