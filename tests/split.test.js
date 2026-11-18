import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCode, splitInput } from '../src/split.js';

test('normalizeCode uppercases and strips punctuation', () => {
  assert.equal(normalizeCode('j18.9'), 'J189');
});

test('splits on newline, semicolon and comma', () => {
  assert.deepEqual(splitInput('Pneumonia, Sepsis; Diabetes\nJ18.9, E11.9,I10'), ['Pneumonia', 'Sepsis', 'Diabetes', 'J18.9', 'E11.9', 'I10']);
});

test('a comma-containing name stays whole when it is known', () => {
  const known = (s) => ['cholera, unspecified', 'diabetes mellitus, type 2'].includes(s.toLowerCase());
  assert.deepEqual(splitInput('Cholera, unspecified, J18.9\nDiabetes mellitus, type 2; Sepsis', known), ['Cholera, unspecified', 'J18.9', 'Diabetes mellitus, type 2', 'Sepsis']);
});

test('unknown comma-containing text is split', () => {
  assert.deepEqual(splitInput('Diabetes mellitus, type 2'), ['Diabetes mellitus', 'type 2']);
});

test('numbering after a comma is stripped and empty pieces are skipped', () => {
  assert.deepEqual(splitInput('1. Pneumonia, 2. Sepsis,, '), ['Pneumonia', 'Sepsis']);
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
