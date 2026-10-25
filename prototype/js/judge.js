// 認識結果の正規化・語の照合・順番・余計な語・採点。
// ブラウザに依存しないので node --test で確かめられる（judge.test.js）。

import { COUNTRIES, AUDIENCE, POINTS, EXTRA_MIN_LENGTH, FUZZY_RATIO, READINGS } from './data.js';

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

// Plan A は ja-JP 固定、Plan B はその国の言語
export function recogKey(plan) {
  return plan === 'B' ? 'native' : 'ja';
}
export function recogLang(plan, country) {
  return plan === 'B' ? country.lang : 'ja-JP';
}

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

export function judge(transcript, { countryId, plan, audience = AUDIENCE }) {
  const rk = recogKey(plan);
  const norm = normalize(transcript);
  const own = analyze(norm, COUNTRIES[countryId], rk);

  // ほかの言語で言った（v3）：生まれた国の言葉では説明できない語が残り、
  // ほかの国の両親の言葉なら1語以上見つかって全体の説明がつくとき。
  // パパ／ママは3言語でほぼ同じ音なので、それだけなら生まれた国の言葉では説明が残らず、ここには来ない
  let other = null;
  if (own.extra) {
    for (const c of Object.values(COUNTRIES)) {
      if (c.id === countryId) continue;
      const a = analyze(norm, c, rk);
      if (a.found.length > 0 && !a.extra && (!other || a.found.length > other.found.length)) {
        other = { countryId: c.id, lang: c.lang, found: a.found, inOrder: a.inOrder };
      }
    }
  }

  const { verdict, points, fan, bonusFan } = score(
    { count: own.found.length, inOrder: own.inOrder, extra: own.extra, other: other && { count: other.found.length, inOrder: other.inOrder } },
    audience,
  );
  return {
    transcript: transcript || '',
    normalized: norm,
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
  };
}

// 1つの国の両親の言葉と照合する：見つかった語、順番、余計な語
function analyze(norm, country, rk) {
  const keys = country.phrases.map((p) => p.key);

  // 核になる語の位置。核そのものが含まれるか、言葉全体が近ければ「言った」とする
  const positions = {};
  const regions = [];
  for (const p of country.phrases) {
    let pos = -1;
    for (const v of country.variants[rk][p.key]) {
      const nv = normalize(v);
      if (!nv) continue;
      const i = norm.indexOf(nv);
      if (i >= 0 && (pos < 0 || i < pos)) pos = i;
    }
    const expected = normalize(rk === 'ja' ? p.ja || p.text : p.text);
    const m = approxFind(norm, expected);
    if (m && m.end > m.start && m.distance <= Math.floor(expected.length / FUZZY_RATIO)) {
      if (pos < 0) pos = m.start;
      regions.push(m);
    }
    positions[p.key] = pos;
  }
  const found = keys.filter((k) => positions[k] >= 0);
  const inOrder = found.every((k, i) => i === 0 || positions[found[i - 1]] < positions[k]);

  // 余計な語：近似照合で拾った部分と、両親の言葉に含まれる語を取り除き、残りを見る
  const chars = norm.split('');
  for (const r of regions) for (let i = r.start; i < r.end; i++) chars[i] = ' ';
  let rest = chars.join('');
  const strip = [...keys.flatMap((k) => country.variants[rk][k]), ...country.fillers[rk]]
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const s of strip) rest = rest.split(s).join(' ');
  const fragments = rest.split(' ').filter(Boolean);
  const extra = fragments.some((f) => f.length >= EXTRA_MIN_LENGTH);
  return { found, positions, inOrder, extra, rest: fragments.join('/') };
}

// 言えた度合いの点数（10点満点）。3語順番どおりは10、それ以外は 2＋6×（言えた数÷3）
function wordPoints(count, inOrder) {
  if (count === 3 && inOrder) return POINTS.best;
  return Math.round(POINTS.base + POINTS.range * (count / 3));
}

// 判定・点数・ファン（仕様書v3）。audience は画面に出ている人数
// - 最良：3語・順番どおり（余計な語があってもよい）→ 人数＋同数のボーナス
// - 通常：1語以上 → 人数
// - ほかの言語で言った：点数は一致した国の言葉で同じ数え方の半分、ファンは人数の半分（切り捨て）。
//   相手の言語で返せて満点なので、日本語を3語順番どおりに言っても相手が英語なら5点
// - 気持ち悪がられる：核の語が1つもなく、両親の言葉ではない言葉しか言わない → 0
// - 無音：何も言わない、聞き取れない、核以外の両親の言葉だけ → 0点・0ファン（10/25）
// 余計な語は点数に使わない
export function score({ count, inOrder, extra, other = null }, audience = AUDIENCE) {
  if (other) {
    const points = Math.round(wordPoints(other.count, other.inOrder) * POINTS.otherRatio);
    return { verdict: 'other', points, fan: Math.floor(audience / 2), bonusFan: 0 };
  }
  if (count === 3 && inOrder) return { verdict: 'best', points: POINTS.best, fan: audience, bonusFan: audience };
  if (count > 0) return { verdict: 'normal', points: wordPoints(count, inOrder), fan: audience, bonusFan: 0 };
  if (extra) return { verdict: 'creepy', points: POINTS.creepy, fan: 0, bonusFan: 0 };
  return { verdict: 'silent', points: POINTS.silent, fan: 0, bonusFan: 0 };
}
