import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFinals } from './transcript.js';

test('Android Chrome の累積型の確定結果は最後の1つにまとまる', () => {
  // 10/23 実機検証（日本・5秒）で出た実例
  const finals = [
    'パパですよ', 'パパですよ', 'パパですよ', 'パパですよ',
    'パパですよ ママですよ', 'パパですよ ママです', 'パパですよ ママですよ',
    'パパですよ ママですよ', 'パパですよ ママですよ 可愛いね',
  ];
  assert.equal(mergeFinals(finals), 'パパですよ ママですよ 可愛いね');
});

test('累積の途中で短くなったり語が直されたりしても1つにまとまる', () => {
  // 10/23 実機検証（スペイン・6秒）で出た実例
  const finals = [
    'ソイ', 'ソイ パパ', 'ソイ', 'ソイ', 'ソイ', 'ソイ',
    'ソイ パパーソイママ', 'ソイ パパーソイ', 'ソイ パパーソイマ', 'ソイ パパーソイマ',
    'ソイ パパーソイマ', 'ソイ パパーソイマ マケボ', 'ソイ パパーソイマ マケボ ニート',
  ];
  assert.equal(mergeFinals(finals), 'ソイ パパーソイマ マケボ ニート');
  // 先頭の語が1文字直された累積
  assert.equal(mergeFinals(['ビーツ パパ', 'イーツ パパ イッツママ']), 'イーツ パパ イッツママ');
});

test('cumulative（Android Chrome）では最後の空でない結果を使う', () => {
  // 10/23 実機検証（アメリカ・Plan B）：途中の「eats」が「it's」に言い直された
  const finals = ["it's", "it's Papa", "it's Papa eats", "it's Papa it's mama"];
  assert.equal(mergeFinals(finals, { cumulative: true }), "it's Papa it's mama");
  assert.equal(mergeFinals(['ソイ パパ', ''], { cumulative: true }), 'ソイ パパ');
  assert.equal(mergeFinals([], { cumulative: true }), '');
});

test('PC Chrome の区切りごとの確定結果はつなぐ', () => {
  assert.equal(mergeFinals(["It's Papa", "It's Mama", "You're so cute"]), "It's Papa It's Mama You're so cute");
  assert.equal(mergeFinals(['ソイ パパ', 'ソイ ママ', 'ケ ボニート']), 'ソイ パパ ソイ ママ ケ ボニート');
  assert.equal(mergeFinals(['パパ', 'ママ']), 'パパ ママ');
});

test('空の結果は無視し、空白の違いは同じとみなす', () => {
  assert.equal(mergeFinals(['', 'ソイ パパ', 'ソイパパ ソイママ']), 'ソイパパ ソイママ');
  assert.equal(mergeFinals([]), '');
});
