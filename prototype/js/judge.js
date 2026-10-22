// 認識結果の正規化・語の照合・順番・余計な語・採点。
// ブラウザに依存しないので node --test で確かめられる（judge.test.js）。

import { COUNTRIES, POINTS, EXTRA_MIN_LENGTH } from './data.js';

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

export function judge(transcript, { countryId, plan }) {
  const country = COUNTRIES[countryId];
  const rk = recogKey(plan);
  const norm = normalize(transcript);
  const keys = country.phrases.map((p) => p.key);

  // 核になる語がどこに出てくるか（最初の位置）
  const positions = {};
  for (const key of keys) {
    let pos = -1;
    for (const v of country.variants[rk][key]) {
      const nv = normalize(v);
      if (!nv) continue;
      const i = norm.indexOf(nv);
      if (i >= 0 && (pos < 0 || i < pos)) pos = i;
    }
    positions[key] = pos;
  }
  const found = keys.filter((k) => positions[k] >= 0);
  const inOrder = found.every((k, i) => i === 0 || positions[found[i - 1]] < positions[k]);

  // 余計な語：両親の言葉に含まれる語を取り除き、残りを見る
  const strip = [...keys.flatMap((k) => country.variants[rk][k]), ...country.fillers[rk]]
    .map(normalize)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  let rest = norm;
  for (const s of strip) rest = rest.split(s).join('');
  const extra = rest.length >= EXTRA_MIN_LENGTH;

  const { verdict, points } = score({ count: found.length, inOrder, extra });
  return { transcript: transcript || '', normalized: norm, found, positions, inOrder, extra, rest, verdict, points };
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
