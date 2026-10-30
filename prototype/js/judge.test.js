// 採点の自動テスト。リポジトリ直下で `npm test`（node --test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, normalize, approxFind, score, fanByRole, targetsFor, recogLang } from './judge.js';
import { SCENES, COUNTRIES } from './data.js';

test('normalize: ひらがな→カタカナ、長音・記号を落とす、アクセントを外す', () => {
  assert.equal(normalize('かわいいねー！'), 'カワイイネ');
  assert.equal(normalize("It's Papá!"), 'itspapa');
  assert.equal(normalize('¿Qué bonito?'), 'quebonito');
  assert.equal(normalize(''), '');
  assert.equal(normalize(undefined), '');
  // 漢字・数字の読み替え（iPhone の ja-JP 認識）
  assert.equal(normalize('予想9'), 'ヨソウキュウ');
  assert.equal(normalize('添いママ'), 'ソイママ');
  assert.equal(normalize('今日は、初めまして'), 'コンニチハハジメマシテ');
});

// ---- 1歳（v3のケース。年齢を省くと1歳） ----
const cases1 = [
  // [説明, 国, Plan, 認識結果, 判定, 点数（10点満点）, fan, ボーナスfan]（1歳＝両親2人）
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
  // ほかの言語は全部そろったときだけ（10/28）。一部だけなら、言うべき言葉が1つもない＝気持ち悪がられる
  ['アメリカ生まれで「かわいいね」だけ（日本語の一部）はほかの言語にしない', 'us', 'A', 'かわいいね', 'creepy', 0, 0, 0],
  ['アメリカ生まれで日本語3語の順番違い（全部そろえばほかの言語。半分の4点）', 'us', 'A', 'ママですよ パパですよ かわいいね', 'other', 4, 1, 0],
  ['スペイン生まれで英語のカタカナ', 'es', 'A', 'イッツパパ イッツママ ユアソーキュート', 'other', 5, 1, 0],
  ['日本生まれでスペイン語のカタカナ', 'jp', 'A', 'ソイパパ ソイママ ケボニート', 'other', 5, 1, 0],
  ['アメリカ生まれでスペイン語（Plan B）', 'us', 'B', 'soy papá soy mamá qué bonito', 'other', 5, 1, 0],
  // パパ／ママは3言語でほぼ同じ音なので、それだけなら生まれた国の言葉として扱う
  ['アメリカ生まれで「パパ ママ」だけは生まれた国の言葉', 'us', 'A', 'パパ ママ', 'normal', 6, 2, 0],
  ['スペイン生まれで「papa mama」だけは生まれた国の言葉', 'es', 'B', 'papa mama', 'normal', 6, 2, 0],
  // ほかの言語は余計な語を条件にしない（10/30）
  ['アメリカ生まれで日本語＋余計な語はほかの言語', 'us', 'A', 'パパですよ ママですよ かわいいね こんにちは', 'other', 5, 1, 0],
  ['アメリカ生まれで日本語（順番違い）＋余計な語はほかの言語', 'us', 'A', 'ママですよ パパですよ かわいいね おはよう', 'other', 4, 1, 0],
  // 判定の順番は 最良 → ほかの言語 → 通常（10/30）。言うべき言葉が全部・順番どおりなら、ほかの言語が混ざっても最良
  ['アメリカ生まれで英語の前に日本語の文は最良', 'us', 'A', 'パパですよ ママですよ かわいいね イッツパパ イッツママ ユアソーキュート', 'best', 10, 2, 2],
  ['アメリカ生まれで英語の後に日本語の文は最良', 'us', 'A', 'イッツパパ イッツママ ユアソーキュート パパですよ ママですよ かわいいね', 'best', 10, 2, 2],
  ['アメリカ生まれで英語の途中に日本語の文は最良', 'us', 'A', 'イッツパパ パパですよ ママですよ かわいいね イッツママ ユアソーキュート', 'best', 10, 2, 2],
];
for (const [name, countryId, plan, transcript, verdict, points, fan, bonusFan] of cases1) {
  test(`1歳・${name}`, () => {
    const r = judge(transcript, { countryId, plan });
    assert.equal(r.verdict, verdict, JSON.stringify(r));
    assert.equal(r.points, points, JSON.stringify(r));
    assert.equal(r.fan, fan, JSON.stringify(r));
    assert.equal(r.bonusFan, bonusFan, JSON.stringify(r));
  });
}

// ---- 2〜6歳（仕様書v4・場面データ） ----
const cases = [
  // [説明, 年齢, 国, Plan, 認識結果, 判定, 点数, fan, ボーナスfan]
  // 2歳：おいしい（人数2＝祖母とネコ。1語なので 10／5／0 のどれか）
  ['2歳・日本・最良', 2, 'jp', 'A', 'おいしいね', 'best', 10, 2, 2],
  ['2歳・日本・漢字', 2, 'jp', 'A', '美味しい', 'best', 10, 2, 2],
  ['2歳・アメリカ・Plan A', 2, 'us', 'A', 'ヤミー', 'best', 10, 2, 2],
  ['2歳・アメリカ・Plan B', 2, 'us', 'B', 'Mmm, yummy!', 'best', 10, 2, 2],
  ['2歳・スペイン・Plan A', 2, 'es', 'A', 'ケ リコ', 'best', 10, 2, 2],
  ['2歳・スペイン・Plan B', 2, 'es', 'B', 'qué rico', 'best', 10, 2, 2],
  ['2歳・アメリカ生まれで日本語（ほかの言語）', 2, 'us', 'A', 'おいしいね', 'other', 5, 1, 0],
  ['2歳・日本生まれで英語のカタカナ（ほかの言語）', 2, 'jp', 'A', 'ヤミー', 'other', 5, 1, 0],
  ['2歳・無音', 2, 'jp', 'A', '', 'silent', 0, 0, 0],
  ['2歳・違う言葉', 2, 'jp', 'A', 'こんにちは', 'creepy', 0, 0, 0],
  // 3歳：ありがとう（人数3＝近所2人と母）
  ['3歳・日本・最良', 3, 'jp', 'A', 'ありがとう', 'best', 10, 3, 3],
  ['3歳・アメリカ・Plan A', 3, 'us', 'A', 'サンキュー', 'best', 10, 3, 3],
  ['3歳・アメリカ・Plan B', 3, 'us', 'B', 'Thank you', 'best', 10, 3, 3],
  ['3歳・スペイン・Plan A', 3, 'es', 'A', 'グラシアス', 'best', 10, 3, 3],
  ['3歳・スペイン・Plan B', 3, 'es', 'B', 'gracias', 'best', 10, 3, 3],
  ['3歳・スペイン生まれで英語（ほかの言語。ファンは3の半分で1）', 3, 'es', 'A', 'サンキュー', 'other', 5, 1, 0],
  ['3歳・違う言葉', 3, 'us', 'B', 'hello', 'creepy', 0, 0, 0],
  // 4歳：バイバイ → またね（人数3。2語なので 10／8／5）
  ['4歳・日本・最良', 4, 'jp', 'A', 'バイバイ またね', 'best', 10, 3, 3],
  ['4歳・日本・順番違い', 4, 'jp', 'A', 'またね バイバイ', 'normal', 8, 3, 0],
  ['4歳・日本・一部だけ', 4, 'jp', 'A', 'バイバイ', 'normal', 5, 3, 0],
  ['4歳・アメリカ・Plan A', 4, 'us', 'A', 'バイバイ シーユー', 'best', 10, 3, 3],
  ['4歳・アメリカ・Plan B', 4, 'us', 'B', 'Bye-bye! See you!', 'best', 10, 3, 3],
  ['4歳・アメリカ・Plan B 順番違い', 4, 'us', 'B', 'see you, bye bye', 'normal', 8, 3, 0],
  ['4歳・アメリカ・Plan B 一部だけ', 4, 'us', 'B', 'see you', 'normal', 5, 3, 0],
  ['4歳・スペイン・Plan A', 4, 'es', 'A', 'アディオス アスタルエゴ', 'best', 10, 3, 3],
  ['4歳・スペイン・Plan B', 4, 'es', 'B', '¡Adiós! ¡Hasta luego!', 'best', 10, 3, 3],
  // 「バイバイ」は日本語と英語で同じ音。それだけなら生まれた国の言葉として扱う
  ['4歳・アメリカ生まれで「バイバイ」だけ', 4, 'us', 'A', 'バイバイ', 'normal', 5, 3, 0],
  ['4歳・アメリカ生まれで日本語の2語（ほかの言語）', 4, 'us', 'A', 'バイバイ またね', 'other', 5, 1, 0],
  ['4歳・無音', 4, 'jp', 'A', '', 'silent', 0, 0, 0],
  // 5歳：はじめまして → こんにちは（人数5。英語・スペイン語は hello → nice の順）
  ['5歳・日本・最良', 5, 'jp', 'A', 'はじめまして こんにちは', 'best', 10, 5, 5],
  ['5歳・日本・順番違い', 5, 'jp', 'A', 'こんにちは はじめまして', 'normal', 8, 5, 0],
  ['5歳・日本・一部だけ（漢字）', 5, 'jp', 'A', '今日は', 'normal', 5, 5, 0],
  ['5歳・アメリカ・Plan A', 5, 'us', 'A', 'ハロー ナイストゥミーチュー', 'best', 10, 5, 5],
  ['5歳・アメリカ・Plan B', 5, 'us', 'B', 'Hello! Nice to meet you!', 'best', 10, 5, 5],
  ['5歳・アメリカ・Plan B 順番違い', 5, 'us', 'B', 'Nice to meet you. Hello!', 'normal', 8, 5, 0],
  ['5歳・アメリカ・Plan B 一部だけ', 5, 'us', 'B', 'hello', 'normal', 5, 5, 0],
  ['5歳・スペイン・Plan A', 5, 'es', 'A', 'オラ ムーチョグスト', 'best', 10, 5, 5],
  ['5歳・スペイン・Plan B', 5, 'es', 'B', '¡Hola! Mucho gusto.', 'best', 10, 5, 5],
  ['5歳・日本生まれで英語（ほかの言語。ファンは5の半分で2）', 5, 'jp', 'A', 'ハロー ナイストゥミーチュー', 'other', 5, 2, 0],
  ['5歳・違う言葉', 5, 'jp', 'A', 'おはよう', 'creepy', 0, 0, 0],
  // 6歳：授業の言語で判定（人数4）。日本・スペイン生まれは英語、アメリカ生まれはスペイン語
  ['6歳・日本生まれ・英語の授業・最良（Plan A）', 6, 'jp', 'A', 'ハロー ナイストゥミーチュー', 'best', 10, 4, 4],
  ['6歳・日本生まれ・英語の授業・最良（Plan B）', 6, 'jp', 'B', 'Hello! Nice to meet you!', 'best', 10, 4, 4],
  ['6歳・日本生まれ・一部だけ', 6, 'jp', 'B', 'nice to meet you', 'normal', 5, 4, 0],
  ['6歳・日本生まれ・順番違い', 6, 'jp', 'A', 'ナイストゥミーチュー ハロー', 'normal', 8, 4, 0],
  ['6歳・日本生まれが日本語で言う（ほかの言語）', 6, 'jp', 'A', 'はじめまして こんにちは', 'other', 5, 2, 0],
  ['6歳・アメリカ生まれ・スペイン語の授業・最良（Plan A）', 6, 'us', 'A', 'オラ ムーチョグスト', 'best', 10, 4, 4],
  ['6歳・アメリカ生まれ・スペイン語の授業・最良（Plan B）', 6, 'us', 'B', 'Hola, mucho gusto', 'best', 10, 4, 4],
  ['6歳・アメリカ生まれが英語で言う（ほかの言語）', 6, 'us', 'A', 'ハロー ナイストゥミーチュー', 'other', 5, 2, 0],
  ['6歳・アメリカ生まれが英語で言う（Plan B・スペイン語で認識。同じ文字なので拾える）', 6, 'us', 'B', 'Hello, nice to meet you', 'other', 5, 2, 0],
  ['6歳・スペイン生まれ・英語の授業・最良', 6, 'es', 'A', 'ハロー ナイストゥミーチュー', 'best', 10, 4, 4],
  ['6歳・スペイン生まれがスペイン語で言う（ほかの言語）', 6, 'es', 'A', 'オラ ムーチョグスト', 'other', 5, 2, 0],
  ['6歳・無音', 6, 'us', 'B', '', 'silent', 0, 0, 0],
  ['6歳・違う言葉', 6, 'jp', 'B', 'good morning', 'creepy', 0, 0, 0],
  // ほかの言語のセリフ全部＋余計な語 → ほかの言語（10/30。余計な語は条件にしない）
  ['2歳・アメリカ生まれで日本語＋余計な語（ほかの言語）', 2, 'us', 'A', 'おいしいね ごはん', 'other', 5, 1, 0],
  ['4歳・アメリカ生まれで日本語の2語＋余計な語（ほかの言語）', 4, 'us', 'A', 'バイバイ またね げんきでね', 'other', 5, 1, 0],
  ['5歳・日本生まれで英語＋余計な語（ほかの言語）', 5, 'jp', 'B', 'Hello! Nice to meet you! I am Ken', 'other', 5, 2, 0],
  ['6歳・アメリカ生まれが英語＋余計な語（Plan B。ほかの言語）', 6, 'us', 'B', 'Hello, nice to meet you, teacher', 'other', 5, 2, 0],
  // 言うべき言葉を全部・順番どおり＋ほかの言語のセリフ全部（前・後・途中）→ 最良（10/30。判定の順番）
  ['5歳・アメリカ生まれで英語の後に日本語（最良）', 5, 'us', 'A', 'ハロー ナイストゥミーチュー はじめまして こんにちは', 'best', 10, 5, 5],
  ['5歳・アメリカ生まれで英語の前に日本語（最良）', 5, 'us', 'A', 'はじめまして こんにちは ハロー ナイストゥミーチュー', 'best', 10, 5, 5],
  ['5歳・アメリカ生まれで英語の途中に日本語（最良）', 5, 'us', 'A', 'ハロー はじめまして こんにちは ナイストゥミーチュー', 'best', 10, 5, 5],
  ['4歳・日本生まれで日本語の後に英語（最良）', 4, 'jp', 'A', 'バイバイ またね バイバイ シーユー', 'best', 10, 3, 3],
  ['4歳・日本生まれで日本語の前に英語（最良）', 4, 'jp', 'A', 'バイバイ シーユー バイバイ またね', 'best', 10, 3, 3],
  ['4歳・日本生まれで日本語の途中に英語（最良）', 4, 'jp', 'A', 'バイバイ バイバイ シーユー またね', 'best', 10, 3, 3],
  ['2歳・スペイン生まれでスペイン語の後に日本語（最良）', 2, 'es', 'A', 'ケリコ おいしいね', 'best', 10, 2, 2],
  ['3歳・日本生まれで日本語の前に英語（最良）', 3, 'jp', 'A', 'サンキュー ありがとう', 'best', 10, 3, 3],
  ['6歳・アメリカ生まれでスペイン語の後に英語（Plan B。最良）', 6, 'us', 'B', 'Hola, mucho gusto. Hello, nice to meet you', 'best', 10, 4, 4],
  ['6歳・アメリカ生まれでスペイン語の前に英語（Plan B。最良）', 6, 'us', 'B', 'Hello, nice to meet you. Hola, mucho gusto', 'best', 10, 4, 4],
  ['6歳・アメリカ生まれでスペイン語の途中に英語（Plan B。最良）', 6, 'us', 'B', 'Hola, hello, nice to meet you, mucho gusto', 'best', 10, 4, 4],
  // 言うべき言葉が順番違い＋ほかの言語のセリフ全部 → ほかの言語（最良でなければ、ほかの言語が先）
  ['5歳・アメリカ生まれで英語の順番違い＋日本語（ほかの言語）', 5, 'us', 'A', 'ナイストゥミーチュー ハロー はじめまして こんにちは', 'other', 5, 2, 0],
  // 言うべき言葉が一部だけ＋ほかの言語のセリフ全部 → ほかの言語（今と同じ）
  ['5歳・アメリカ生まれで英語の一部＋日本語（ほかの言語）', 5, 'us', 'A', 'ハロー はじめまして こんにちは', 'other', 5, 2, 0],
];
for (const [name, age, countryId, plan, transcript, verdict, points, fan, bonusFan] of cases) {
  test(name, () => {
    const r = judge(transcript, { countryId, plan, age });
    assert.equal(r.verdict, verdict, JSON.stringify(r));
    assert.equal(r.points, points, JSON.stringify(r));
    assert.equal(r.fan, fan, JSON.stringify(r));
    assert.equal(r.bonusFan, bonusFan, JSON.stringify(r));
  });
}

test('場面ごとの人数と、言うべき言語（6歳は授業の言語）', () => {
  assert.deepEqual(SCENES.map((s) => s.people.length), [2, 2, 3, 3, 5, 4]);
  assert.equal(targetsFor('jp', 6).lang, 'en-US');
  assert.equal(targetsFor('us', 6).lang, 'es-ES');
  assert.equal(targetsFor('es', 6).lang, 'en-US');
  assert.equal(targetsFor('us', 5).lang, 'en-US');
  assert.equal(recogLang('B', COUNTRIES.us, 6), 'es-ES');
  assert.equal(recogLang('B', COUNTRIES.us, 1), 'en-US');
  assert.equal(recogLang('A', COUNTRIES.us, 6), 'ja-JP');
});

test('2〜5歳の反応の声は場面ごと（3言語×4つの反応）。反応する人は祖母・近所のおばあさん・いとこ・先生', () => {
  const kinds = ['surprised', 'happy', 'puzzled', 'creeped'];
  for (const s of SCENES.slice(1, 5)) {
    for (const lang of ['ja-JP', 'en-US', 'es-ES']) {
      for (const k of kinds) assert.ok(s.reactions[lang][k], `${s.age}歳 ${lang} ${k}`);
    }
  }
  assert.deepEqual(SCENES.slice(1, 5).map((s) => s.reactor), ['grandma', 'ngrandma', 'cousin', 'teacher']);
  assert.equal(SCENES[4].reactions['ja-JP'].surprised, 'まあ！ 上手にあいさつできたね！');
  // 1歳は両親の文言のまま（場面に reactions を持たない）
  assert.equal(SCENES[0].reactions, undefined);
});

test('全部最良なら6歳までの合計は38 Fans', () => {
  const total = SCENES.reduce((sum, s) => sum + s.people.length * 2, 0);
  assert.equal(total, 38);
});

test('ファンの分類ごとの内訳', () => {
  const s3 = SCENES[2].people; // 近所、近所、家族・親戚
  assert.deepEqual(fanByRole(s3, 3, 3), { 近所: 4, '家族・親戚': 2 });
  assert.deepEqual(fanByRole(s3, 3, 0), { 近所: 2, '家族・親戚': 1 });
  assert.deepEqual(fanByRole(s3, 1, 0), { 近所: 1 });
  assert.deepEqual(fanByRole(s3, 0, 0), {});
  assert.deepEqual(fanByRole(SCENES[4].people, 5, 5), { 学校: 10 });
  assert.deepEqual(judge('ありがとう', { countryId: 'jp', plan: 'A', age: 3 }).byRole, { 近所: 4, '家族・親戚': 2 });
});

test('judge: ほかの言語で言ったときは、どの言語と一致したかを返す', () => {
  const r = judge('パパですよ ママですよ かわいいね', { countryId: 'us', plan: 'A' });
  assert.equal(r.other.lang, 'ja-JP');
  assert.deepEqual(r.other.found, ['papa', 'mama', 'cute']);
  assert.equal(judge('パパ ママ', { countryId: 'us', plan: 'A' }).other, null);
  // 最良のときは、ほかの言語が混ざっていても返さない（記録の otherLang は空）
  assert.equal(judge('ハロー ナイストゥミーチュー はじめまして こんにちは', { countryId: 'us', plan: 'A', age: 5 }).other, null);
});

test('score: 判定ごとの点数とファン（人数2）', () => {
  const s = (args) => score({ total: 3, ...args }, 2);
  assert.deepEqual(s({ count: 3, inOrder: true, extra: false }), { verdict: 'best', points: 10, fan: 2, bonusFan: 2 });
  assert.deepEqual(s({ count: 3, inOrder: true, extra: true }), { verdict: 'best', points: 10, fan: 2, bonusFan: 2 });
  assert.deepEqual(s({ count: 3, inOrder: false, extra: false }), { verdict: 'normal', points: 8, fan: 2, bonusFan: 0 });
  assert.deepEqual(s({ count: 2, inOrder: true, extra: false }), { verdict: 'normal', points: 6, fan: 2, bonusFan: 0 });
  assert.deepEqual(s({ count: 1, inOrder: true, extra: true }), { verdict: 'normal', points: 4, fan: 2, bonusFan: 0 });
  assert.deepEqual(s({ count: 0, inOrder: true, extra: false }), { verdict: 'silent', points: 0, fan: 0, bonusFan: 0 });
  assert.deepEqual(s({ count: 0, inOrder: true, extra: true }), { verdict: 'creepy', points: 0, fan: 0, bonusFan: 0 });
  assert.deepEqual(
    s({ count: 2, inOrder: true, extra: true, other: { count: 3, total: 3, inOrder: true } }),
    { verdict: 'other', points: 5, fan: 1, bonusFan: 0 },
  );
  assert.deepEqual(
    s({ count: 0, inOrder: true, extra: true, other: { count: 3, total: 3, inOrder: false } }),
    { verdict: 'other', points: 4, fan: 1, bonusFan: 0 },
  );
  // 判定の順番は 最良 → ほかの言語 → 通常（10/30）
  assert.deepEqual(
    s({ count: 3, inOrder: true, extra: true, other: { count: 3, total: 3, inOrder: true } }),
    { verdict: 'best', points: 10, fan: 2, bonusFan: 2 },
  );
  assert.deepEqual(
    s({ count: 3, inOrder: false, extra: true, other: { count: 3, total: 3, inOrder: true } }),
    { verdict: 'other', points: 5, fan: 1, bonusFan: 0 },
  );
});

test('score: 核になる語の数が2のとき 10／8／5、1のとき 10。ほかの言語（全部そろったとき）は半分（四捨五入）', () => {
  const s = (count, total, inOrder) => score({ count, total, inOrder, extra: false }, 3).points;
  assert.deepEqual([s(2, 2, true), s(2, 2, false), s(1, 2, true)], [10, 8, 5]);
  assert.equal(s(1, 1, true), 10);
  const o = (total, inOrder) => score({ count: 0, total, inOrder: true, extra: true, other: { count: total, total, inOrder } }, 3).points;
  assert.deepEqual([o(3, true), o(3, false), o(2, true), o(2, false), o(1, true)], [5, 4, 5, 4, 5]);
});

test('ほかの言語は全部そろったときだけ（一部だけなら生まれた国の判定）', () => {
  // 4歳・アメリカ生まれ：日本語の「またね」だけ → 言うべき言葉が1つもない
  assert.equal(judge('またね', { countryId: 'us', plan: 'A', age: 4 }).verdict, 'creepy');
  // 4歳・アメリカ生まれ：日本語の2語がそろえば、ほかの言語
  assert.equal(judge('バイバイ またね', { countryId: 'us', plan: 'A', age: 4 }).verdict, 'other');
  // 6歳・日本生まれ：日本語の「こんにちは」だけ → 英語の授業の言葉が1つもない
  assert.equal(judge('こんにちは', { countryId: 'jp', plan: 'A', age: 6 }).verdict, 'creepy');
  // 1歳・スペイン生まれ：英語の2語だけ（cute がない）→ パパ・ママが言えているので通常
  assert.equal(judge('イッツパパ イッツママ', { countryId: 'es', plan: 'A' }).verdict, 'normal');
});

test('score: 人数が変わってもファンは人数に比例し、ほかの言語の半分は切り捨て', () => {
  assert.deepEqual(score({ count: 3, total: 3, inOrder: true, extra: false }, 5), { verdict: 'best', points: 10, fan: 5, bonusFan: 5 });
  const other = { count: 3, total: 3, inOrder: true };
  assert.equal(score({ count: 0, total: 3, inOrder: true, extra: true, other }, 5).fan, 2);
  assert.equal(score({ count: 0, total: 3, inOrder: true, extra: true, other }, 3).fan, 1);
  assert.equal(score({ count: 0, total: 3, inOrder: true, extra: true, other }, 1).fan, 0);
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
