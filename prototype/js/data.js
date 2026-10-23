// 国・言語・両親の言葉・判定用の語・結果テキスト・ポイント表。
// 仕様書v1に基づく。「仮」「未確認」の値は検証の結果を見て直す。
// 判定の調整はこのファイルだけ直せば済むようにしてある。

// ビルド番号。タイトル画面・⚙・記録に出す。端末が古いコードを使っていないか見分けるため、
// prototype を直して push するたびに上げる（GitHub Pages は10分間キャッシュされる）
export const BUILD = '20261023-14';

// 公開の開閉。false にして push すると、タイトルが「ただいま準備中」になり、
// 合言葉を入れた人だけ先に進める（一度入れた端末は記憶する）。
// 合言葉はソースを読めば分かるので本当の保護ではなく、気軽に遊ばれるのを止める程度。
export const OPEN = true;
export const PASSPHRASE = 'papamama';

// 録音する秒数（認識が始まってから数える）
// 仕様書v1は3秒だったが、10/23実機検証（Android Chrome）で3秒だと1語目しか残らず、
// 5秒でも母語でぎりぎりだったため6秒に変更（10/23ユーザー決定）
export const RECORD_SECONDS = 6;

// 採点（仕様書の表。案）
export const POINTS = {
  best: 12, // 3語すべて、順番どおり、余計な語なし → お誘い
  three: 8, // 3語すべて、順番違い
  two: 6,
  one: 4,
  silent: 1, // 何も言わない、または聞き取れない
  extraPenalty: 3, // 両親の言葉でない語が混ざる（最低0）
};

// 正規化後にこれ以上の文字が残ったら「余計な語あり」。1文字の聞き違いは見逃す
export const EXTRA_MIN_LENGTH = 2;

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
      ja: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['キュート', 'キュウト', 'キュー'] },
      native: {
        papa: ['papa', 'poppa', 'pappa', 'pa pa'],
        mama: ['mama', 'momma', 'mamma', 'ma ma'],
        cute: ['cute', 'cutie', 'cuter'],
      },
    },
    fillers: {
      ja: ['イッツ', 'イツ', 'イッ', 'ユアソー', 'ユアー', 'ユア', 'ユー', 'ソー', 'ソウ', 'です', 'よ', 'ね'],
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
      ja: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['ボニート', 'ボニト', 'ボニータ', 'ボニー'] },
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
export const REACTION_OF = { best: 'surprised', normal: 'happy', silent: 'puzzled', creepy: 'creeped' };

export const TEXTS = {
  micNotice: 'このゲームはマイクを使います。はじめると、ブラウザがマイクの許可を求めます。',
  noRecognition: 'このブラウザは音声認識に対応していません。デバッグ設定（右上の⚙）の「テキストで入力」で判定だけ試せます。',
  earth: 'どこで生まれるかは、矢にまかせましょう。',
  born: (name) => `${name}で生まれました`,
  situation: '1歳。パパとママが一生懸命に話しかけてきます。真似して言ってみましょう。',
  results: {
    best: {
      text: '両親があなたを人前に連れ出し「この子がすごいの」と言いまわった。あなたは近所と親戚の人気者になった！',
      group: '近所・親戚',
      invite: true,
    },
    normal: {
      text: '両親があなたを家族や親戚に見せ「この子がしゃべったの」と言いまわった。あなたは家族・親戚の人気者になった！',
      group: '家族・親戚',
    },
    silent: {
      text: '両親は少しがっかりしたが、「まだ早いよね」と笑い合った。',
      group: '家族',
    },
    creepy: {
      text: '両親は顔を見合わせた。「……今の、なに？」',
      group: '家族',
    },
  },
  invite: 'お誘いが来た',
  verdictLabels: { best: '最良', normal: '通常', silent: '無音', creepy: '気持ち悪がられる' },
};
