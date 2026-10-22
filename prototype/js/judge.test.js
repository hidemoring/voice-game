// 採点の自動テスト。リポジトリ直下で `npm test`（node --test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, normalize } from './judge.js';

test('normalize: ひらがな→カタカナ、長音・記号を落とす、アクセントを外す', () => {
  assert.equal(normalize('かわいいねー！'), 'カワイイネ');
  assert.equal(normalize("It's Papá!"), 'itspapa');
  assert.equal(normalize('¿Qué bonito?'), 'quebonito');
  assert.equal(normalize(''), '');
  assert.equal(normalize(undefined), '');
});

const cases = [
  // [説明, 国, Plan, 認識結果, 判定, 点]
  ['日本・最良', 'jp', 'A', 'パパですよ ママですよ かわいいね', 'best', 12],
  ['日本・順番違い', 'jp', 'A', 'ママですよ パパですよ かわいいね', 'normal', 8],
  ['日本・2語', 'jp', 'A', 'パパ ママ', 'normal', 6],
  ['日本・1語（漢字）', 'jp', 'A', '可愛いね', 'normal', 4],
  ['日本・無音', 'jp', 'A', '', 'silent', 1],
  ['日本・聞き取れない（核以外の語だけ）', 'jp', 'A', 'です', 'silent', 1],
  ['日本・3語順番どおり＋余計な語', 'jp', 'A', 'パパですよ ママですよ かわいいね こんにちは', 'creepy', 5],
  ['日本・余計な語だけ', 'jp', 'A', 'こんにちは', 'creepy', 0],
  ['日本・1文字の聞き違いは見逃す', 'jp', 'A', 'パパですよ ママですよ かわいいね あ', 'best', 12],
  ['アメリカ・Plan A カタカナ', 'us', 'A', 'イッツパパ イッツママ ユアソーキュート', 'best', 12],
  ['アメリカ・Plan B', 'us', 'B', "It's Papa. It's Mama. You're so cute.", 'best', 12],
  ['アメリカ・Plan B 2語＋余計な語', 'us', 'B', 'papa mama hello', 'creepy', 3],
  ['スペイン・Plan B アクセント付き', 'es', 'B', 'soy papá soy mamá qué bonito', 'best', 12],
  ['スペイン・Plan A カタカナ', 'es', 'A', 'ソイパパ ソイママ ケボニート', 'best', 12],
  ['スペイン・Plan B 1語（女性形）', 'es', 'B', 'bonita', 'normal', 4],
];

for (const [name, countryId, plan, transcript, verdict, points] of cases) {
  test(name, () => {
    const r = judge(transcript, { countryId, plan });
    assert.equal(r.verdict, verdict, JSON.stringify(r));
    assert.equal(r.points, points, JSON.stringify(r));
  });
}

test('順番の判定は見つかった語の位置で決まる', () => {
  const r = judge('かわいい パパ ママ', { countryId: 'jp', plan: 'A' });
  assert.deepEqual(r.found, ['papa', 'mama', 'cute']);
  assert.equal(r.inOrder, false);
  assert.equal(r.verdict, 'normal');
});
