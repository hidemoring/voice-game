// 国・言語・両親の言葉・判定用の語・結果テキスト・ポイント表。
// 仕様書v1に基づく。「仮」「未確認」の値は検証の結果を見て直す。
// 判定の調整はこのファイルだけ直せば済むようにしてある。

// ビルド番号。タイトル画面・⚙・記録に出す。端末が古いコードを使っていないか見分けるため、
// prototype を直して push するたびに上げる（GitHub Pages は10分間キャッシュされる）
export const BUILD = '20261025-17';

// 公開の開閉。false にして push すると、タイトルが「ただいま準備中」になり、
// 合言葉を入れた人だけ先に進める（一度入れた端末は記憶する）。
// 合言葉はソースを読めば分かるので本当の保護ではなく、気軽に遊ばれるのを止める程度。
export const OPEN = true;
export const PASSPHRASE = 'papamama';

// 録音する秒数（認識が始まってから数える）
// 仕様書v1は3秒だったが、10/23実機検証（Android Chrome）で3秒だと1語目しか残らず、
// 5秒でも母語でぎりぎりだったため6秒に変更（10/23ユーザー決定）
export const RECORD_SECONDS = 6;

// 採点（仕様書v3）：言えた度合いを点数に、両親への届き方をファンにする。
// 点数は10点満点（10/25ユーザー決定。100点満点は世界的には一般的でないため）。
// 最良10、通常は 2＋6×（言えた数÷3）＝8／6／4、無音0、気持ち悪がられる0。
// ほかの言語で言ったときは同じ数え方の半分（5／4／3／2）。相手の言語で返せて満点（10/24ユーザー決定）
// 無音は仕様書v3では点が付いたが、何も言わずに点が付くのは不思議なので0点に（10/25ユーザー決定）
export const POINTS = { best: 10, base: 2, range: 6, silent: 0, creepy: 0, otherRatio: 0.5 };
// ファン：画面に出ている人数ぶん増える。最良は同数のボーナス、ほかの言語で言ったときは半分（切り捨て）。
// 人数はイベントごとに変わる前提。1歳は両親の2人
export const AUDIENCE = 2;

// 正規化後にこれ以上の文字が残ったら「余計な語あり」。1文字の聞き違いは見逃す
export const EXTRA_MIN_LENGTH = 2;

// ja-JP の認識は外国語を漢字や数字に変換してしまうことがある（iPhone に多い）。
// 照合の前にカタカナへ読み替える。実機の記録で出たものを足していく
export const READINGS = {
  予想: 'ヨソウ', // You're so（iPhone）
  9: 'キュウ', // cute（iPhone）
  九: 'キュウ',
  添い: 'ソイ', // Soy（Android・iPhone）
  沿い: 'ソイ',
  可愛い: 'カワイイ',
};

// 言葉全体の近似照合で許す文字違いの数 = floor(言葉の長さ / FUZZY_RATIO)
// 例：「イツパパ」（4文字）なら1文字違いまで、「ユアソキュト」（6文字）なら2文字違いまで
export const FUZZY_RATIO = 3;

export const COUNTRIES = {
  jp: {
    id: 'jp',
    name: '日本',
    lang: 'ja-JP',
    colors: { skin: '#f3c9a0', hair: '#222222', papa: '#2b5fb3', mama: '#d64a6a' },
    // ja は Plan A（ja-JPで認識）のときに期待するカタカナ。言葉全体の近似照合に使う
    phrases: [
      { key: 'papa', text: 'パパですよー', ja: 'パパですよ', speaker: 'papa' },
      { key: 'mama', text: 'ママですよー', ja: 'ママですよ', speaker: 'mama' },
      { key: 'cute', text: 'かわいいねー', ja: 'かわいいね', speaker: 'both' },
    ],
    // 自己申告チェックと結果画面に出す語
    coreLabels: { papa: 'パパ', mama: 'ママ', cute: 'かわいい' },
    // 核になる語の表記ゆれ。ja = Plan A（ja-JPで認識）、native = Plan B（その国の言語で認識）
    // 正規化（ひらがな→カタカナ、長音・促音・記号・アクセントを落とす）してから「含まれていれば言った」と判定する
    variants: {
      ja: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['かわいい', '可愛い', 'かわい'] },
      native: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['かわいい', '可愛い', 'かわい'] },
    },
    // 両親の言葉に含まれる核以外の語。余計な語の判定で取り除く
    fillers: {
      ja: ['です', 'よ', 'ね', 'だよ'],
      native: ['です', 'よ', 'ね', 'だよ'],
    },
    // 反応の声（仮。読み上げで代用）
    reactions: {
      surprised: 'えっ！？ しゃべった！ すごい！',
      happy: 'わあ、しゃべった！',
      puzzled: 'んー？',
      creeped: '……今の、なに？',
    },
  },

  us: {
    id: 'us',
    name: 'アメリカ',
    lang: 'en-US',
    colors: { skin: '#f8d8c0', hair: '#c9a24a', papa: '#2e8b57', mama: '#8a4fc0' },
    // 未確認（ネイティブ確認待ち）
    phrases: [
      { key: 'papa', text: "It's Papa!", ja: 'イッツパパ', speaker: 'papa' },
      { key: 'mama', text: "It's Mama!", ja: 'イッツママ', speaker: 'mama' },
      { key: 'cute', text: "You're so cute!", ja: 'ユアソーキュート', speaker: 'both' },
    ],
    coreLabels: { papa: 'Papa', mama: 'Mama', cute: 'cute' },
    variants: {
      // キュウ：iPhone で "cute" が「9」と返った（READINGS で キュウ に読み替え）
      ja: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['キュート', 'キュウト', 'キュー', 'キュウ'] },
      native: {
        papa: ['papa', 'poppa', 'pappa', 'pa pa'],
        mama: ['mama', 'momma', 'mamma', 'ma ma'],
        cute: ['cute', 'cutie', 'cuter'],
      },
    },
    fillers: {
      // ヨソウ・ヨソ：iPhone で "You're so" が「予想」と返った
      ja: ['イッツ', 'イツ', 'イッ', 'ユアソー', 'ユアー', 'ユア', 'ユー', 'ヨソウ', 'ヨソ', 'ソー', 'ソウ', 'です', 'よ', 'ね'],
      // 1文字の語は入れない（「eats」が「e」「ts」に割れて余計な語の判定が狂う。10/23実機検証）
      native: ["it's", 'its', 'it is', 'it', 'is', "you're", 'your', 'you are', 'you', 'are', 'so', 'yes', 'oh'],
    },
    reactions: {
      surprised: 'What!? Did you hear that!? Amazing!',
      happy: 'Yay! Good job!',
      puzzled: 'Hmm?',
      creeped: '...What was that?',
    },
  },

  es: {
    id: 'es',
    name: 'スペイン',
    lang: 'es-ES',
    colors: { skin: '#e0a878', hair: '#4a2c17', papa: '#c0392b', mama: '#e5b200' },
    // 未確認（ネイティブ確認待ち。赤ちゃんの性別で語尾が変わる）
    phrases: [
      { key: 'papa', text: 'Soy papá', ja: 'ソイパパ', speaker: 'papa' },
      { key: 'mama', text: 'Soy mamá', ja: 'ソイママ', speaker: 'mama' },
      { key: 'cute', text: 'Qué bonito', ja: 'ケボニート', speaker: 'both' },
    ],
    coreLabels: { papa: 'papá', mama: 'mamá', cute: 'bonito' },
    variants: {
      // ゴニド・ゴニト：iPhone で "Qué bonito" が「テゴニド」と返った
      ja: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['ボニート', 'ボニト', 'ボニータ', 'ボニー', 'ゴニド', 'ゴニト', 'ボニド'] },
      native: {
        papa: ['papá', 'papa', 'papi'],
        mama: ['mamá', 'mama', 'mami'],
        cute: ['bonito', 'bonita', 'bonit'],
      },
    },
    fillers: {
      ja: ['ソイ', 'ソーイ', 'ソ', 'ケ', 'ケー', 'です', 'よ', 'ね'],
      native: ['soy', 'qué', 'que', 'es', 'muy', 'sí', 'si', 'ay'],
    },
    reactions: {
      surprised: '¡¿Qué?! ¡Ha hablado! ¡Increíble!',
      happy: '¡Bien! ¡Muy bien!',
      puzzled: '¿Mmm?',
      creeped: '... ¿Qué ha sido eso?',
    },
  },
};

// 判定 → 両親の反応
// ほかの言語で言ったときは「首をかしげる」を使い回す（v3）
export const REACTION_OF = { best: 'surprised', normal: 'happy', other: 'puzzled', silent: 'puzzled', creepy: 'creeped' };

export const TEXTS = {
  micNotice: 'このゲームはマイクを使います。はじめると、ブラウザがマイクの許可を求めます。',
  noRecognition: 'このブラウザは音声認識に対応していません。デバッグ設定（右上の⚙）の「テキストで入力」で判定だけ試せます。',
  earth: 'どこで生まれるかは、矢にまかせましょう。',
  born: (name) => `${name}で生まれました`,
  situation: '1歳。パパとママが一生懸命に話しかけてきます。真似して言ってみましょう。',
  results: {
    best: {
      text: '両親があなたを人前に連れ出し「この子がすごいの」と言いまわった。あなたは近所と親戚の人気者になった！',
      invite: true,
    },
    normal: {
      text: '両親があなたを家族や親戚に見せ「この子がしゃべったの」と言いまわった。あなたは家族・親戚の人気者になった！',
    },
    other: {
      text: '両親はきょとんとしたあと、顔を見合わせて笑った。', // 仮（v3）
    },
    silent: {
      text: '両親は少しがっかりしたが、「まだ早いよね」と笑い合った。',
    },
    creepy: {
      text: '両親は顔を見合わせた。「……今の、なに？」',
    },
  },
  // 点数とファンの表示（v3）。「+N Bonus Fans」「0 Fans」は仮の文言。
  // 数と語の間は改行しない空白（スマホ幅で語だけが次の行に落ちないように）
  pointsLine: (n) => `${n}点`,
  fanLine: (n) => (n === 0 ? '0\u00a0Fans' : `${n}\u00a0${n === 1 ? 'Fan' : 'Fans'}\u00a0Get!`),
  bonusLine: (n) => `+${n}\u00a0Bonus\u00a0${n === 1 ? 'Fan' : 'Fans'}`,
  invite: 'お誘いが来た',
  verdictLabels: { best: '最良', normal: '通常', other: 'ほかの言語', silent: '無音', creepy: '気持ち悪がられる' },
};
