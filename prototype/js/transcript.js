// 確定した認識結果を1つの文字列にまとめる。
// Android Chrome は continuous のとき、途中経過を「確定」として何度も送り、
// そのたびに先頭からの累積テキストになる（例：パパですよ → パパですよ ママですよ → …）。
// 単純につなぐと同じ語が何度も並ぶので、前の結果を含む結果はそれで置き換え、
// 含まれない結果（PC Chrome の区切りごとの確定）だけをつなぐ。

const key = (s) => s.replace(/\s+/g, '');

export function mergeFinals(texts) {
  let acc = '';
  for (const raw of texts) {
    const t = (raw || '').trim();
    if (!t) continue;
    if (!acc) {
      acc = t;
      continue;
    }
    if (key(t).startsWith(key(acc))) acc = t; // 累積型：新しいほうで置き換え
    else if (key(acc).startsWith(key(t))) continue; // 古い版の再送：捨てる
    else acc = `${acc} ${t}`; // 別の発話：つなぐ
  }
  return acc;
}
