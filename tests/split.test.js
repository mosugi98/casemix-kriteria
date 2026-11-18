import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCode, splitInput } from '../src/split.js';

test('normalizeCode uppercases and strips punctuation', () => {
  assert.equal(normalizeCode('j18.9'), 'J189');
});

test('splits on newline and semicolon but keeps commas', () => {
  assert.deepEqual(splitInput('Pneumonia\nDiabetes mellitus, type 2;  J18.9'), ['Pneumonia', 'Diabetes mellitus, type 2', 'J18.9']);
});

test('blank input gives empty list', () => {
  assert.deepEqual(splitInput('  \n '), []);
});

test('duplicate codes collapse to one item', () => {
  assert.deepEqual(splitInput('J18.9\nj18.9\nJ189'), ['J18.9']);
});

test('leading numbering is stripped', () => {
  assert.deepEqual(splitInput('1. Pneumonia\n2) Sepsis'), ['Pneumonia', 'Sepsis']);
});

test('a single line of several codes is split into codes', () => {
  assert.deepEqual(splitInput('J18.9 E11.9 I10'), ['J18.9', 'E11.9', 'I10']);
});

test('CRLF line endings work', () => {
  assert.deepEqual(splitInput('A09\r\nB20\r\n'), ['A09', 'B20']);
});
