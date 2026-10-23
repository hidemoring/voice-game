# 音声入力ゲーム

音声入力で遊ぶブラウザゲームの企画・試作。世界を旅して人の輪を広げる人生ゲーム。

- 試作：[prototype/](prototype/)（遊び方・動かし方は [prototype/README.md](prototype/README.md)）
- 構想・仕様：[docs/](docs/)
  - [構想メモ](docs/音声入力ゲーム_構想メモ.md)
  - [プロトタイプ仕様書](docs/音声入力ゲーム_プロトタイプ仕様書.md)
  - [フレーズリスト](docs/音声入力ゲーム_フレーズリスト.md)
  - [引き継ぎサマリ v2](docs/音声入力ゲーム_引き継ぎサマリ_v2_20261023.md)（案件の現在地。最新版を読む）

## ローカルで動かす

```
npm start
```

`http://localhost:8080/` を Chrome で開く（マイクは `localhost` ならHTTPでも使える）。

```
npm test
```

で採点のテストを実行する。
