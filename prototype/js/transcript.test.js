import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFinals } from './transcript.js';

test('Android Chrome の累積型の確定結果は最後の1つにまとまる', () => {
  // 10/23 実機検証で出た実例
  const finals = [
    'パパですよ', 'パパですよ', 'パパですよ', 'パパですよ',
    'パパですよ ママですよ', 'パパですよ ママです', 'パパですよ ママですよ',
    'パパですよ ママですよ', 'パパですよ ママですよ 可愛いね',
  ];
  assert.equal(mergeFinals(finals), 'パパですよ ママですよ 可愛いね');
});

test('PC Chrome の区切りごとの確定結果はつなぐ', () => {
  assert.equal(mergeFinals(["It's Papa", "It's Mama", "You're so cute"]), "It's Papa It's Mama You're so cute");
});

test('空の結果は無視し、空白の違いは同じとみなす', () => {
  assert.equal(mergeFinals(['', 'ソイ パパ', 'ソイパパ ソイママ']), 'ソイパパ ソイママ');
  assert.equal(mergeFinals([]), '');
});
