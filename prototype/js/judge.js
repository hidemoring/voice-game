// 認識結果の正規化・語の照合・順番・余計な語・採点。
// ブラウザに依存しないので node --test で確かめられる（judge.test.js）。

import { COUNTRIES, POINTS, EXTRA_MIN_LENGTH, FUZZY_RATIO } from './data.js';

const LATIN = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u' };
// 長音・促音・空白・記号は落とす（「近ければ拾う」ため）
const DROP = /[ーッ\s　。、．，！？!?.,'’"「」『』（）()・…\-¡¿]/g;

export function normalize(text) {
  if (!text) return '';
  let s = String(text).normalize('NFKC').toLowerCase();
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

export function judge(transcript, { countryId, plan }) {
  const country = COUNTRIES[countryId];
  const rk = recogKey(plan);
  const norm = normalize(transcript);
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

  const { verdict, points } = score({ count: found.length, inOrder, extra });
  return {
    transcript: transcript || '',
    normalized: norm,
    found,
    positions,
    inOrder,
    extra,
    rest: fragments.join('/'),
    verdict,
    points,
  };
}

export function score({ count, inOrder, extra }) {
  if (count === 3 && inOrder && !extra) return { verdict: 'best', points: POINTS.best };
  let base;
  let verdict = 'normal';
  if (count === 3) base = POINTS.three;
  else if (count === 2) base = POINTS.two;
  else if (count === 1) base = POINTS.one;
  else {
    base = POINTS.silent;
    verdict = 'silent';
  }
  if (extra) {
    verdict = 'creepy';
    base = Math.max(0, base - POINTS.extraPenalty);
  }
  return { verdict, points: base };
}
