// 確定した認識結果を1つの文字列にまとめる。
// Android Chrome は continuous のとき、途中経過を「確定」として何度も送り、
// そのたびに先頭からの累積テキストになる（例：パパですよ → パパですよ ママですよ → …）。
// 単純につなぐと同じ語が何度も並ぶので、前の結果を含む結果はそれで置き換え、
// 含まれない結果（PC Chrome の区切りごとの確定）だけをつなぐ。
// 累積のたびに先頭の語が少し直されることもあるので、先頭部分は1/5までの文字違いを同じとみなす
//（「It's Papa」と「It's Mama」のような別の発話は2文字違いなので区別できる）。

const key = (s) => s.replace(/\s+/g, '');

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function similar(a, b) {
  const n = Math.max(a.length, b.length);
  return levenshtein(a, b) <= Math.max(1, Math.floor(n / 5));
}

// cumulative: true のとき（Android Chrome）は、最後の空でない結果をそのまま使う。
// 10/23 実機検証の Android 記録7件はすべて「最後の結果＝先頭からの全文」だった。
// 途中の言い直し（「it's Papa eats」→「it's Papa it's mama」）は先頭が3文字以上違うことがあり、
// 下の近似照合では別の発話とみなしてつないでしまうため。
export function mergeFinals(texts, { cumulative = false } = {}) {
  if (cumulative) {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = (texts[i] || '').trim();
      if (t) return t;
    }
    return '';
  }
  let acc = '';
  for (const raw of texts) {
    const t = (raw || '').trim();
    if (!t) continue;
    if (!acc) {
      acc = t;
      continue;
    }
    const kt = key(t);
    const ka = key(acc);
    if (kt.length >= ka.length) {
      if (similar(kt.slice(0, ka.length), ka)) acc = t; // 累積型：新しいほうで置き換え
      else acc = `${acc} ${t}`; // 別の発話：つなぐ
    } else if (similar(ka.slice(0, kt.length), kt)) {
      // 古い版の再送：捨てる
    } else {
      acc = `${acc} ${t}`;
    }
  }
  return acc;
}
