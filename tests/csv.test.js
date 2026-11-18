import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/csv.js';

test('parses BOM, CRLF and quoted comma', () => {
  assert.deepEqual(parseCsv('﻿kode,Uraian\r\nJ18.9,"Demam, batuk"\r\n'), [{ kode: 'J18.9', uraian: 'Demam, batuk' }]);
});

test('doubled quote becomes a literal quote', () => {
  assert.deepEqual(parseCsv('a,b\n1,"say ""hi"""\n'), [{ a: '1', b: 'say "hi"' }]);
});

test('skips blank lines', () => {
  assert.deepEqual(parseCsv('a\n1\n\n2\n'), [{ a: '1' }, { a: '2' }]);
});

test('header-only input returns empty array', () => {
  assert.deepEqual(parseCsv('a,b\n'), []);
});

test('quoted field may contain a newline', () => {
  assert.deepEqual(parseCsv('a,b\n1,"x\ny"\n'), [{ a: '1', b: 'x\ny' }]);
});
