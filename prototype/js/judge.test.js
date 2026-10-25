// 採点の自動テスト。リポジトリ直下で `npm test`（node --test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, normalize, approxFind, score } from './judge.js';

test('normalize: ひらがな→カタカナ、長音・記号を落とす、アクセントを外す', () => {
  assert.equal(normalize('かわいいねー！'), 'カワイイネ');
  assert.equal(normalize("It's Papá!"), 'itspapa');
  assert.equal(normalize('¿Qué bonito?'), 'quebonito');
  assert.equal(normalize(''), '');
  assert.equal(normalize(undefined), '');
  // 漢字・数字の読み替え（iPhone の ja-JP 認識）
  assert.equal(normalize('予想9'), 'ヨソウキュウ');
  assert.equal(normalize('添いママ'), 'ソイママ');
});

const cases = [
  // [説明, 国, Plan, 認識結果, 判定, 点数（10点満点）, fan, ボーナスfan]（仕様書v3。1歳＝両親2人）
  ['日本・最良', 'jp', 'A', 'パパですよ ママですよ かわいいね', 'best', 10, 2, 2],
  ['日本・順番違い', 'jp', 'A', 'ママですよ パパですよ かわいいね', 'normal', 8, 2, 0],
  ['日本・2語', 'jp', 'A', 'パパ ママ', 'normal', 6, 2, 0],
  ['日本・1語（漢字）', 'jp', 'A', '可愛いね', 'normal', 4, 2, 0],
  ['日本・無音', 'jp', 'A', '', 'silent', 0, 0, 0],
  ['日本・聞き取れない（核以外の語だけ）', 'jp', 'A', 'です', 'silent', 0, 0, 0],
  // 余計な語は点数に使わない（v3）
  ['日本・3語順番どおり＋余計な語は最良', 'jp', 'A', 'パパですよ ママですよ かわいいね こんにちは', 'best', 10, 2, 2],
  ['日本・1語＋余計な語は通常', 'jp', 'A', 'パパ こんにちは', 'normal', 4, 2, 0],
  ['日本・両親の言葉ではない言葉だけ', 'jp', 'A', 'こんにちは', 'creepy', 0, 0, 0],
  ['日本・1文字の聞き違いは見逃す', 'jp', 'A', 'パパですよ ママですよ かわいいね あ', 'best', 10, 2, 2],
  ['アメリカ・Plan A カタカナ', 'us', 'A', 'イッツパパ イッツママ ユアソーキュート', 'best', 10, 2, 2],
  ['アメリカ・Plan B', 'us', 'B', "It's Papa. It's Mama. You're so cute.", 'best', 10, 2, 2],
  ['アメリカ・Plan B 2語＋余計な語は通常', 'us', 'B', 'papa mama hello', 'normal', 6, 2, 0],
  ['アメリカ・Plan B 両親の言葉ではない言葉だけ', 'us', 'B', 'hello', 'creepy', 0, 0, 0],
  ['スペイン・Plan B アクセント付き', 'es', 'B', 'soy papá soy mamá qué bonito', 'best', 10, 2, 2],
  ['スペイン・Plan A カタカナ', 'es', 'A', 'ソイパパ ソイママ ケボニート', 'best', 10, 2, 2],
  ['スペイン・Plan B 1語（女性形）', 'es', 'B', 'bonita', 'normal', 4, 2, 0],
  // 実機で出た聞き違い（Android Chrome, Plan A, "It's Papa" → ビーツ パパ）
  ['アメリカ・Plan A 聞き違い（イッツ→ビーツ）', 'us', 'A', 'ビーツ パパ', 'normal', 4, 2, 0],
  ['アメリカ・Plan A 聞き違い2語', 'us', 'A', 'ビーツ パパ ビーツ ママ', 'normal', 6, 2, 0],
  ['アメリカ・Plan A 核の語が崩れても言葉全体が近ければ拾う', 'us', 'A', 'イッツパア', 'normal', 4, 2, 0],
  ['アメリカ・Plan A ママだけ（パパの言葉と誤認しない）', 'us', 'A', 'ママ', 'normal', 4, 2, 0],
  ['アメリカ・Plan A 近似照合は別の語まで拾わない', 'us', 'A', 'こんにちは', 'creepy', 0, 0, 0],
  // 実機で出た言い直し（Android Chrome, Plan A, パパ→パワー）
  ['アメリカ・Plan A 核の語が崩れた2語', 'us', 'A', 'イッツ パワーいつママ', 'normal', 6, 2, 0],
  // 実機で出た2語（Android Chrome, Plan B）
  ['アメリカ・Plan B 2語', 'us', 'B', "it's Papa it's mama", 'normal', 6, 2, 0],
  ['アメリカ・Plan B 聞き違いの語が混ざっても2語は通常', 'us', 'B', "it's Papa eats it's mama", 'normal', 6, 2, 0],
  // iPhone Safari（iOS 18）の Plan A で出た実例
  ['アメリカ・Plan A iPhone（漢字と数字で返る）', 'us', 'A', 'いつパパいつママ予想9', 'best', 10, 2, 2],
  ['スペイン・Plan A iPhone（テゴニド）', 'es', 'A', 'そいパパそいママテゴニド', 'best', 10, 2, 2],
  ['日本・Plan A iPhone（先頭のパパが欠けた）', 'jp', 'A', 'ですよママですよかわいいね', 'normal', 6, 2, 0],
  // ほかの言語で言った（v3）：点数は一致した国の言葉で同じ数え方の半分（相手の言語で返せて満点）、ファンは人数の半分
  ['アメリカ生まれで日本語の文を丸ごと言う', 'us', 'A', 'パパですよ ママですよ かわいいね', 'other', 5, 1, 0],
  ['アメリカ生まれで「かわいいね」だけ（日本語の1語）', 'us', 'A', 'かわいいね', 'other', 2, 1, 0],
  ['スペイン生まれで英語のカタカナ', 'es', 'A', 'イッツパパ イッツママ ユアソーキュート', 'other', 5, 1, 0],
  ['日本生まれでスペイン語のカタカナ', 'jp', 'A', 'ソイパパ ソイママ ケボニート', 'other', 5, 1, 0],
  ['アメリカ生まれでスペイン語（Plan B）', 'us', 'B', 'soy papá soy mamá qué bonito', 'other', 5, 1, 0],
  // パパ／ママは3言語でほぼ同じ音なので、それだけなら生まれた国の言葉として扱う
  ['アメリカ生まれで「パパ ママ」だけは生まれた国の言葉', 'us', 'A', 'パパ ママ', 'normal', 6, 2, 0],
  ['スペイン生まれで「papa mama」だけは生まれた国の言葉', 'es', 'B', 'papa mama', 'normal', 6, 2, 0],
  // ほかの言語に余計な語が混ざると「全体が一致」しないので、生まれた国の判定のまま
  ['アメリカ生まれで日本語＋余計な語は通常', 'us', 'A', 'パパですよ ママですよ かわいいね こんにちは', 'normal', 6, 2, 0],
];

for (const [name, countryId, plan, transcript, verdict, points, fan, bonusFan] of cases) {
  test(name, () => {
    const r = judge(transcript, { countryId, plan });
    assert.equal(r.verdict, verdict, JSON.stringify(r));
    assert.equal(r.points, points, JSON.stringify(r));
    assert.equal(r.fan, fan, JSON.stringify(r));
    assert.equal(r.bonusFan, bonusFan, JSON.stringify(r));
  });
}

test('ほかの言語の点数は、同じ数え方の半分（3語順番どおり5、順番違い4、2語3、1語2）', () => {
  const s = (count, inOrder) => score({ count: 0, inOrder: true, extra: true, other: { count, inOrder } }, 2).points;
  assert.deepEqual([s(3, true), s(3, false), s(2, true), s(1, true)], [5, 4, 3, 2]);
  // 生まれた国の言葉で言えば満点
  assert.equal(judge("It's Papa. It's Mama. You're so cute.", { countryId: 'us', plan: 'B' }).points, 10);
});

test('judge: ほかの言語で言ったときは、どの国の言葉と一致したかを返す', () => {
  const r = judge('パパですよ ママですよ かわいいね', { countryId: 'us', plan: 'A' });
  assert.equal(r.other.countryId, 'jp');
  assert.equal(r.other.lang, 'ja-JP');
  assert.deepEqual(r.other.found, ['papa', 'mama', 'cute']);
  assert.equal(judge('パパ ママ', { countryId: 'us', plan: 'A' }).other, null);
});

test('score: 判定ごとの点数とファン（人数2＝1歳の両親）', () => {
  const s = (args) => score(args, 2);
  assert.deepEqual(s({ count: 3, inOrder: true, extra: false }), { verdict: 'best', points: 10, fan: 2, bonusFan: 2 });
  assert.deepEqual(s({ count: 3, inOrder: true, extra: true }), { verdict: 'best', points: 10, fan: 2, bonusFan: 2 });
  assert.deepEqual(s({ count: 3, inOrder: false, extra: false }), { verdict: 'normal', points: 8, fan: 2, bonusFan: 0 });
  assert.deepEqual(s({ count: 2, inOrder: true, extra: false }), { verdict: 'normal', points: 6, fan: 2, bonusFan: 0 });
  assert.deepEqual(s({ count: 1, inOrder: true, extra: true }), { verdict: 'normal', points: 4, fan: 2, bonusFan: 0 });
  assert.deepEqual(s({ count: 0, inOrder: true, extra: false }), { verdict: 'silent', points: 0, fan: 0, bonusFan: 0 });
  assert.deepEqual(s({ count: 0, inOrder: true, extra: true }), { verdict: 'creepy', points: 0, fan: 0, bonusFan: 0 });
  assert.deepEqual(
    s({ count: 2, inOrder: true, extra: true, other: { count: 3, inOrder: true } }),
    { verdict: 'other', points: 5, fan: 1, bonusFan: 0 },
  );
  assert.deepEqual(
    s({ count: 0, inOrder: true, extra: true, other: { count: 2, inOrder: false } }),
    { verdict: 'other', points: 3, fan: 1, bonusFan: 0 },
  );
});

test('score: 人数が変わってもファンは人数に比例し、ほかの言語の半分は切り捨て', () => {
  assert.deepEqual(score({ count: 3, inOrder: true, extra: false }, 5), { verdict: 'best', points: 10, fan: 5, bonusFan: 5 });
  assert.equal(score({ count: 2, inOrder: true, extra: false }, 5).fan, 5);
  const other = { count: 1, inOrder: true };
  assert.equal(score({ count: 0, inOrder: true, extra: true, other }, 5).fan, 2);
  assert.equal(score({ count: 0, inOrder: true, extra: true, other }, 3).fan, 1);
  assert.equal(score({ count: 0, inOrder: true, extra: true, other }, 1).fan, 0);
  assert.equal(score({ count: 0, inOrder: true, extra: false }, 5).fan, 0);
});

test('judge: 人数を指定できる（既定は1歳の2人）', () => {
  const t = 'パパですよ ママですよ かわいいね';
  assert.equal(judge(t, { countryId: 'jp', plan: 'A' }).fan, 2);
  const r = judge(t, { countryId: 'jp', plan: 'A', audience: 4 });
  assert.deepEqual([r.fan, r.bonusFan], [4, 4]);
});

test('approxFind: 最も近い部分と文字違いの数を返す', () => {
  assert.deepEqual(approxFind('ビツパパ', 'イツパパ'), { distance: 1, start: 0, end: 4 });
  assert.deepEqual(approxFind('イツパパイツママ', 'イツママ'), { distance: 0, start: 4, end: 8 });
  assert.equal(approxFind('ママ', 'イツパパ').distance >= 3, true);
});

test('順番の判定は見つかった語の位置で決まる', () => {
  const r = judge('かわいい パパ ママ', { countryId: 'jp', plan: 'A' });
  assert.deepEqual(r.found, ['papa', 'mama', 'cute']);
  assert.equal(r.inOrder, false);
  assert.equal(r.verdict, 'normal');
  assert.equal(r.points, 8);
});
