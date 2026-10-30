// 認識結果の正規化・語の照合・順番・余計な語・採点。
// ブラウザに依存しないので node --test で確かめられる（judge.test.js）。

import { COUNTRIES, SCENES, POINTS, EXTRA_MIN_LENGTH, FUZZY_RATIO, READINGS } from './data.js';

// 長いものから置き換える（「予想9」→「ヨソウキュウ」）
const READING_KEYS = Object.keys(READINGS).sort((a, b) => b.length - a.length);

const LATIN = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u' };
// 長音・促音・空白・記号は落とす（「近ければ拾う」ため）
const DROP = /[ーッ\s　。、．，！？!?.,'’"「」『』（）()・…\-¡¿]/g;

export function normalize(text) {
  if (!text) return '';
  let s = String(text).normalize('NFKC').toLowerCase();
  for (const k of READING_KEYS) s = s.split(k).join(READINGS[k]);
  s = s.replace(/[áéíóúüñàèìòù]/g, (ch) => LATIN[ch]);
  // ひらがな → カタカナ
  s = s.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
  return s.replace(DROP, '');
}

// Plan A は ja-JP 固定、Plan B はその場面で言うべき言語（6歳は授業の言語）
export function recogKey(plan) {
  return plan === 'B' ? 'native' : 'ja';
}
export function sceneFor(age) {
  return SCENES[(age || 1) - 1] || SCENES[0];
}
export function sceneLang(scene, country) {
  return scene.langOf(country);
}
export function recogLang(plan, country, age = 1) {
  return plan === 'B' ? sceneLang(sceneFor(age), country) : 'ja-JP';
}
// 1つの手本のセリフに含まれる核になる語（1〜3つ）
export const keysOf = (phrase) => phrase.keys || [phrase.key];
export const coreKeys = (lines) => lines.phrases.flatMap(keysOf);

// text の中で pattern に最も近い部分を探し、文字違いの数と位置を返す（近似部分文字列照合）
export function approxFind(text, pattern) {
  const n = text.length;
  const m = pattern.length;
  if (!m || !n) return null;
  let prev = new Array(n + 1).fill(0);
  let prevStart = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = new Array(n + 1);
    const curStart = new Array(n + 1);
    cur[0] = i;
    curStart[0] = 0;
    for (let j = 1; j <= n; j++) {
      let best = prev[j - 1] + (pattern[i - 1] === text[j - 1] ? 0 : 1);
      let start = prevStart[j - 1];
      if (prev[j] + 1 < best) {
        best = prev[j] + 1;
        start = prevStart[j];
      }
      if (cur[j - 1] + 1 < best) {
        best = cur[j - 1] + 1;
        start = curStart[j - 1];
      }
      cur[j] = best;
      curStart[j] = start;
    }
    prev = cur;
    prevStart = curStart;
  }
  let end = 0;
  for (let j = 1; j <= n; j++) if (prev[j] < prev[end]) end = j;
  return { distance: prev[end], start: prevStart[end], end };
}

// 場面と国から、言うべき言葉（target）と、ほかの言語の言葉（others）を取り出す
export function targetsFor(countryId, age = 1) {
  const country = COUNTRIES[countryId];
  const scene = sceneFor(age);
  const lang = sceneLang(scene, country);
  const target = { lang, ...scene.lines[lang] };
  const others = Object.entries(scene.lines)
    .filter(([l]) => l !== lang)
    .map(([l, lines]) => ({ lang: l, ...lines }));
  return { scene, lang, target, others, audience: scene.people.length };
}

export function judge(transcript, { countryId, plan, age = 1 }) {
  const rk = recogKey(plan);
  const norm = normalize(transcript);
  const { scene, target, others, audience } = targetsFor(countryId, age);
  const own = analyze(norm, target, rk);
  const total = coreKeys(target).length;

  // ほかの言語で言った（v3・v4）：言うべき言語の言葉では説明できない語が残り、
  // 同じ場面のほかの言語の言葉が全部そろって、全体の説明がつくとき（文全体が一致。10/28ユーザー決定）。
  // 一部だけ（例：アメリカ生まれが「かわいいね」だけ）は、ほかの言語にしない
  // パパ／ママ／バイバイのように言語で同じ音の語は、それだけなら言うべき言語の言葉として扱われ、ここには来ない
  let other = null;
  if (own.extra) {
    for (const cand of others) {
      const a = analyze(norm, cand, rk);
      const candTotal = coreKeys(cand).length;
      if (a.found.length === candTotal && !a.extra && !other) {
        other = { lang: cand.lang, found: a.found, inOrder: a.inOrder, total: candTotal };
      }
    }
  }

  const { verdict, points, fan, bonusFan } = score(
    {
      count: own.found.length,
      total,
      inOrder: own.inOrder,
      extra: own.extra,
      other: other && { count: other.found.length, total: other.total, inOrder: other.inOrder },
    },
    audience,
  );
  return {
    transcript: transcript || '',
    normalized: norm,
    age: scene.age,
    lang: target.lang,
    total,
    found: own.found,
    positions: own.positions,
    inOrder: own.inOrder,
    extra: own.extra,
    rest: own.rest,
    other,
    verdict,
    points,
    fan,
    bonusFan,
    byRole: fanByRole(scene.people, fan, bonusFan),
  };
}

// 1つの言語の言葉と照合する：見つかった語、順番、余計な語
function analyze(norm, lines, rk) {
  const keys = coreKeys(lines);
  const positions = {};
  for (const k of keys) positions[k] = -1;
  const regions = [];
  for (const p of lines.phrases) {
    // 核になる語そのもの
    for (const k of keysOf(p)) {
      for (const v of lines.variants[rk][k] || []) {
        const nv = normalize(v);
        if (!nv) continue;
        const i = norm.indexOf(nv);
        if (i >= 0 && (positions[k] < 0 || i < positions[k])) positions[k] = i;
      }
    }
    // 言葉全体の近似照合（核の語が崩れていても拾う）。
    // 核が2つ以上あるセリフ（4〜6歳）は、片方だけ言っても全体に近いと出てしまうので、
    // 近似照合は余計な語の判定にだけ使い、核の語は表記ゆれで拾う
    const expected = normalize(rk === 'ja' ? p.ja || p.text : p.text);
    const m = approxFind(norm, expected);
    if (m && m.end > m.start && m.distance <= Math.floor(expected.length / FUZZY_RATIO)) {
      const ks = keysOf(p);
      if (ks.length === 1 && positions[ks[0]] < 0) positions[ks[0]] = m.start;
      regions.push(m);
    }
  }
  const found = keys.filter((k) => positions[k] >= 0);
  const inOrder = found.every((k, i) => i === 0 || positions[found[i - 1]] <= positions[k]);

  // 余計な語：近似照合で拾った部分と、言葉に含まれる語を取り除き、残りを見る
  const chars = norm.split('');
  for (const r of regions) for (let i = r.start; i < r.end; i++) chars[i] = ' ';
  let rest = chars.join('');
  const strip = [...keys.flatMap((k) => lines.variants[rk][k] || []), ...(lines.fillers[rk] || [])]
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const s of strip) rest = rest.split(s).join(' ');
  const fragments = rest.split(' ').filter(Boolean);
  const extra = fragments.some((f) => f.length >= EXTRA_MIN_LENGTH);
  return { found, positions, inOrder, extra, rest: fragments.join('/') };
}

// 言えた度合いの点数（10点満点）。全部・順番どおりは10、それ以外は 2＋6×（言えた数÷核になる語の数）
function wordPoints(count, total, inOrder) {
  if (count === total && inOrder) return POINTS.best;
  return Math.round(POINTS.base + POINTS.range * (count / total));
}

// 判定・点数・ファン（仕様書v3・v4）。audience は画面に出ている人数
// - 最良：全部・順番どおり（余計な語があってもよい）→ 人数＋同数のボーナス
// - 通常：1語以上 → 人数
// - ほかの言語で言った（全部そろったときだけ）：点数は同じ数え方の半分（四捨五入。順番どおり5、順番違い4）、
//   ファンは人数の半分（切り捨て）。相手の言語で返せて満点なので、日本語を全部順番どおりに言っても相手が英語なら5点
// - 気持ち悪がられる：核の語が1つもなく、言うべき言葉ではない言葉しか言わない → 0点・0
// - 無音：何も言わない、聞き取れない、核以外の言葉だけ → 0点・0（10/25）
// 余計な語は点数に使わない
export function score({ count, total = 3, inOrder, extra, other = null }, audience) {
  if (other) {
    const points = Math.round(wordPoints(other.count, other.total, other.inOrder) * POINTS.otherRatio);
    return { verdict: 'other', points, fan: Math.floor(audience / 2), bonusFan: 0 };
  }
  if (count === total && inOrder) return { verdict: 'best', points: POINTS.best, fan: audience, bonusFan: audience };
  if (count > 0) return { verdict: 'normal', points: wordPoints(count, total, inOrder), fan: audience, bonusFan: 0 };
  if (extra) return { verdict: 'creepy', points: POINTS.creepy, fan: 0, bonusFan: 0 };
  return { verdict: 'silent', points: POINTS.silent, fan: 0, bonusFan: 0 };
}

// ファンの分類ごとの内訳。画面の人を左から fan 人ぶん数え、ボーナスも同じ人に付く
// （3歳でほかの言語＝1人なら、左端の近所のおばあさんが数えられる）
export function fanByRole(people, fan, bonusFan) {
  const by = {};
  const each = fan > 0 ? bonusFan / fan : 0;
  people.slice(0, fan).forEach((p) => {
    by[p.role] = (by[p.role] || 0) + 1 + each;
  });
  for (const r of Object.keys(by)) by[r] = Math.round(by[r]);
  return by;
}
