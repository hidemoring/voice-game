# 音声入力ゲーム 試作 v1

仕様は `docs/音声入力ゲーム_プロトタイプ仕様書.md`。素のHTML／CSS／JSで、ビルドなし。

## 動かす

リポジトリ直下で：

```
npm start
```

`http://localhost:8080/prototype/` をPC Chromeで開く。マイクは `localhost` ならHTTPでも使える。スマホで試すにはHTTPS配信（GitHub Pages）が必要。

## 採点のテスト

```
npm test
```

## デバッグ設定（右上の⚙）

- 生まれる国の固定、Plan A（ja-JP固定）／Plan B（その国の言語）の切り替え、テスター名
- 結果画面に認識結果を出す／マイクの代わりにテキストで入力する（判定の確認用）
- 記録の表示・TSVコピー・TSV／JSON保存・消去。記録は端末の localStorage に貯まる

## 公開と反映

`git push` で1〜2分後に https://hidemoring.github.io/voice-game/ へ反映される。ただし GitHub Pages は10分間キャッシュされるので、開いたばかりの端末は古いコードのままのことがある。タイトル画面と⚙の「build」番号（`js/data.js` の `BUILD`。push のたびに上げる）で見分け、古ければ10分待つか、Chrome のサイト設定でデータを消去して開き直す。

## 判定の調整

`js/data.js` の `variants`（核になる語の表記ゆれ）と `fillers`（両親の言葉に含まれる核以外の語）を直す。
認識結果は正規化（ひらがな→カタカナ、長音・促音・記号・アクセントを落とす）してから照合する。

## ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` / `style.css` | 画面とファミコンRPG風の見た目 |
| `js/data.js` | 国・言葉・判定用の語・結果テキスト・ポイント |
| `js/judge.js` | 正規化・照合・採点（`judge.test.js` でテスト） |
| `js/speech.js` | 音声認識・読み上げ・効果音 |
| `js/transcript.js` | 確定結果のまとめ（Android Chrome の累積型に対応。`transcript.test.js` でテスト） |
| `js/logger.js` | 記録と設定（localStorage）、書き出し |
| `js/sprites.js` | 両親のドット絵（仮） |
| `js/app.js` | 画面遷移と進行 |
