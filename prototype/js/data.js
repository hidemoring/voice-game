// 国・言語・場面（1〜6歳）・判定用の語・結果テキスト・点数とファンの決まり。
// 仕様書v4と場面データ（1〜6歳）に基づく。「仮」「未確認」の値は検証の結果を見て直す。
// 判定の調整はこのファイルだけ直せば済むようにしてある。

// ビルド番号。タイトル画面・⚙・記録に出す。端末が古いコードを使っていないか見分けるため、
// prototype を直して push するたびに上げる（GitHub Pages は10分間キャッシュされる）
export const BUILD = '20261030-19';

// 公開の開閉。false にして push すると、タイトルが「ただいま準備中」になり、
// 合言葉を入れた人だけ先に進める（一度入れた端末は記憶する）。
// 合言葉はソースを読めば分かるので本当の保護ではなく、気軽に遊ばれるのを止める程度。
export const OPEN = true;
export const PASSPHRASE = 'papamama';

// 録音する秒数（認識が始まってから数える）
// 仕様書v1は3秒だったが、10/23実機検証（Android Chrome）で3秒だと1語目しか残らず、
// 5秒でも母語でぎりぎりだったため6秒に変更（10/23ユーザー決定）
export const RECORD_SECONDS = 6;

// 手本の繰り返し（仕様書v4）：最大5回。5回目のあと3秒待っても押されなければ、
// 場面に合った形で終わって無音の結果になる。1歳は3つのセリフで1回と数える
export const ROUNDS = 5;
export const END_WAIT_MS = 3000;

// 1部は1〜20歳の20イベント（10/27決定）。試作は6歳までなので n は1〜6
export const TOTAL_EVENTS = 20;

// 採点（仕様書v3・v4）：言えた度合いを点数に、相手への届き方をファンにする。
// 点数は10点満点（10/25ユーザー決定。100点満点は世界的には一般的でないため）。
// 最良10、一部でも言えたら 2＋6×（言えた数÷核になる語の数）、無音0、気持ち悪がられる0。
// ほかの言語で言ったときは同じ数え方の半分（四捨五入）。相手の言語で返せて満点（10/24ユーザー決定）
// 無音は仕様書v3では点が付いたが、何も言わずに点が付くのは不思議なので0点に（10/25ユーザー決定）
export const POINTS = { best: 10, base: 2, range: 6, silent: 0, creepy: 0, otherRatio: 0.5 };
// ファン：画面に出ている人数ぶん増える（場面ごと）。最良は同数のボーナス、ほかの言語は半分（切り捨て）。
// 無音・気持ち悪がられるは0。分類は人ごとに持つ（SCENES の people）

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
  美味しい: 'オイシイ',
  有難う: 'アリガトウ',
  初めまして: 'ハジメマシテ',
  今日は: 'コンニチハ',
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
    // 反応の声（仮。読み上げで代用）。1歳の両親が使う（2〜6歳は場面ごとの reactions）
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
    reactions: {
      surprised: '¡¿Qué?! ¡Ha hablado! ¡Increíble!',
      happy: '¡Bien! ¡Muy bien!',
      puzzled: '¿Mmm?',
      creeped: '... ¿Qué ha sido eso?',
    },
  },
};

export const LANG_NAMES = { 'ja-JP': '日本語', 'en-US': '英語', 'es-ES': 'スペイン語' };
// 言語 → その言語の国（反応の声を借りる）
export const COUNTRY_OF_LANG = { 'ja-JP': 'jp', 'en-US': 'us', 'es-ES': 'es' };

// ---- 場面ごとの言うべき言葉（3言語） ----
// phrases: 手本のセリフ（順番＝核になる語の順番）。ja は Plan A（ja-JPで認識）のときに期待するカタカナ。
// coreLabels: 自己申告チェックと結果画面に出す語
// variants: 核になる語の表記ゆれ。ja = Plan A、native = Plan B（その言語で認識）
// fillers: セリフに含まれる核以外の語。余計な語の判定で取り除く
// 英語・スペイン語はネイティブ未確認（1歳はv1から、2〜6歳は場面データ）

const AGE1 = {
  'ja-JP': {
    phrases: [
      { key: 'papa', text: 'パパですよー', ja: 'パパですよ', speaker: 'papa' },
      { key: 'mama', text: 'ママですよー', ja: 'ママですよ', speaker: 'mama' },
      { key: 'cute', text: 'かわいいねー', ja: 'かわいいね', speaker: 'both' },
    ],
    coreLabels: { papa: 'パパ', mama: 'ママ', cute: 'かわいい' },
    variants: {
      ja: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['かわいい', '可愛い', 'かわい'] },
      native: { papa: ['パパ', 'ババ'], mama: ['ママ', 'マンマ'], cute: ['かわいい', '可愛い', 'かわい'] },
    },
    fillers: { ja: ['です', 'よ', 'ね', 'だよ'], native: ['です', 'よ', 'ね', 'だよ'] },
  },
  'en-US': {
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
  },
  'es-ES': {
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
  },
};

const AGE2 = {
  'ja-JP': {
    phrases: [{ key: 'yummy', text: 'おいしいねー', ja: 'おいしいね', speaker: 'grandma' }],
    coreLabels: { yummy: 'おいしい' },
    variants: { ja: { yummy: ['おいしい', '美味しい', 'オイシ'] }, native: { yummy: ['おいしい', '美味しい', 'オイシ'] } },
    fillers: { ja: ['ね', 'ねー', 'です', 'よ'], native: ['ね', 'ねー', 'です', 'よ'] },
  },
  'en-US': {
    phrases: [{ key: 'yummy', text: 'Mmm, yummy!', ja: 'ヤミー', speaker: 'grandma' }],
    coreLabels: { yummy: 'yummy' },
    variants: { ja: { yummy: ['ヤミー', 'ヤミ', 'ヤミィ', 'ヤミイ'] }, native: { yummy: ['yummy', 'yum', 'yummie'] } },
    fillers: { ja: ['ンー', 'ムー', 'ンム', 'ウーン'], native: ['mmm', 'mm', 'so', "it's", 'its', 'oh'] },
  },
  'es-ES': {
    phrases: [{ key: 'yummy', text: '¡Mmm, qué rico!', ja: 'ケリコ', speaker: 'grandma' }],
    coreLabels: { yummy: 'rico' },
    variants: { ja: { yummy: ['リコ', 'リーコ', 'ケリコ'] }, native: { yummy: ['rico', 'rica', 'riquísimo', 'riquisimo'] } },
    fillers: { ja: ['ケ', 'ケー', 'ンー', 'ムー'], native: ['mmm', 'mm', 'qué', 'que', 'muy', 'está', 'esta'] },
  },
};

const AGE3 = {
  'ja-JP': {
    phrases: [{ key: 'thanks', text: 'ありがとう', ja: 'ありがとう', speaker: 'mother' }],
    coreLabels: { thanks: 'ありがとう' },
    variants: { ja: { thanks: ['ありがとう', '有難う', 'アリガト'] }, native: { thanks: ['ありがとう', '有難う', 'アリガト'] } },
    fillers: { ja: ['ございます', 'ね'], native: ['ございます', 'ね'] },
  },
  'en-US': {
    phrases: [{ key: 'thanks', text: 'Thank you!', ja: 'サンキュー', speaker: 'mother' }],
    coreLabels: { thanks: 'thank you' },
    variants: {
      ja: { thanks: ['サンキュー', 'サンキュ', 'センキュー', 'センキュ', 'サンク'] },
      native: { thanks: ['thank you', 'thanks', 'thankyou', 'thank u'] },
    },
    fillers: { ja: ['ベリーマッチ', 'ソーマッチ'], native: ['so much', 'very much', 'oh'] },
  },
  'es-ES': {
    phrases: [{ key: 'thanks', text: '¡Gracias!', ja: 'グラシアス', speaker: 'mother' }],
    coreLabels: { thanks: 'gracias' },
    variants: {
      ja: { thanks: ['グラシアス', 'グラシャス', 'グラスィアス', 'グラシア'] },
      native: { thanks: ['gracias', 'grasias'] },
    },
    fillers: { ja: ['ムーチャス', 'ムチャス'], native: ['muchas', 'mucho', 'oh'] },
  },
};

const AGE4 = {
  'ja-JP': {
    phrases: [{ key: 'bye', text: 'バイバイ、またね', ja: 'バイバイマタネ', speaker: 'cousin', keys: ['bye', 'seeyou'] }],
    coreLabels: { bye: 'バイバイ', seeyou: 'またね' },
    variants: {
      ja: { bye: ['バイバイ', 'バイ'], seeyou: ['またね', 'マタネ', 'また', 'マタ'] },
      native: { bye: ['バイバイ', 'バイ'], seeyou: ['またね', 'マタネ', 'また', 'マタ'] },
    },
    fillers: { ja: ['ね'], native: ['ね'] },
  },
  'en-US': {
    phrases: [{ key: 'bye', text: 'Bye-bye! See you!', ja: 'バイバイシーユー', speaker: 'cousin', keys: ['bye', 'seeyou'] }],
    coreLabels: { bye: 'bye-bye', seeyou: 'see you' },
    variants: {
      ja: { bye: ['バイバイ', 'バイ'], seeyou: ['シーユー', 'シユ', 'シーユ', 'シユー', 'シーユゥ'] },
      native: { bye: ['bye-bye', 'bye bye', 'byebye', 'bye'], seeyou: ['see you', 'see ya', 'seeyou', 'see u', 'see yeah'] },
    },
    fillers: { ja: ['レーター', 'スーン'], native: ['later', 'soon', 'oh'] },
  },
  'es-ES': {
    phrases: [{ key: 'bye', text: '¡Adiós! ¡Hasta luego!', ja: 'アディオスアスタルエゴ', speaker: 'cousin', keys: ['bye', 'seeyou'] }],
    coreLabels: { bye: 'adiós', seeyou: 'hasta luego' },
    variants: {
      ja: { bye: ['アディオス', 'アディオ', 'アジオス', 'アディヨス'], seeyou: ['アスタルエゴ', 'アスタ', 'ルエゴ', 'アスタルエーゴ', 'アスタルゴ'] },
      native: { bye: ['adiós', 'adios'], seeyou: ['hasta luego', 'hasta', 'luego'] },
    },
    fillers: { ja: [], native: ['oh'] },
  },
};

// 5歳（生まれた国の言葉）と6歳（授業の言語）は同じ言葉。英語・スペイン語は「こんにちは → はじめまして」の順
const GREETING = {
  'ja-JP': {
    phrases: [{ key: 'greet', text: 'はじめまして、こんにちは', ja: 'ハジメマシテコンニチハ', speaker: 'teacher', keys: ['nice', 'hello'] }],
    coreLabels: { nice: 'はじめまして', hello: 'こんにちは' },
    variants: {
      ja: { nice: ['はじめまして', '初めまして', 'ハジメマシテ', 'ハジメマシ'], hello: ['こんにちは', 'こんにちわ', 'コンニチワ', 'コンニチ'] },
      native: { nice: ['はじめまして', '初めまして', 'ハジメマシテ', 'ハジメマシ'], hello: ['こんにちは', 'こんにちわ', 'コンニチワ', 'コンニチ'] },
    },
    fillers: { ja: [], native: [] },
  },
  'en-US': {
    phrases: [{ key: 'greet', text: 'Hello! Nice to meet you!', ja: 'ハローナイストゥミーチュー', speaker: 'teacher', keys: ['hello', 'nice'] }],
    coreLabels: { hello: 'Hello', nice: 'Nice to meet you' },
    variants: {
      ja: { hello: ['ハロー', 'ハロ', 'ハロウ', 'ハローー'], nice: ['ナイストゥミーチュー', 'ナイストゥ', 'ナイス', 'ミーチュー', 'ミーチュ', 'ミートユー'] },
      native: { hello: ['hello', 'hallo', 'hullo'], nice: ['nice to meet you', 'nice to meet', 'meet you', 'nice to meetcha', 'nice 2 meet you'] },
    },
    fillers: { ja: ['トゥ', 'ツー'], native: ['to', 'oh', 'hi'] },
  },
  'es-ES': {
    phrases: [{ key: 'greet', text: '¡Hola! Mucho gusto.', ja: 'オラムーチョグスト', speaker: 'teacher', keys: ['hello', 'nice'] }],
    coreLabels: { hello: 'Hola', nice: 'Mucho gusto' },
    variants: {
      ja: { hello: ['オラ', 'オーラ', 'ホラ', 'オラー'], nice: ['ムーチョグスト', 'ムーチョ', 'ムチョ', 'グスト', 'グースト'] },
      native: { hello: ['hola', 'ola'], nice: ['mucho gusto', 'mucho', 'gusto'] },
    },
    fillers: { ja: [], native: ['oh'] },
  },
};

// 6歳の授業の言語：日本・スペイン生まれは英語、アメリカ生まれはスペイン語
export const LESSON_LANG = { jp: 'en-US', us: 'es-ES', es: 'en-US' };

// 6歳の先生の反応の声（仮。授業の言語）
const TEACHER_REACTIONS = {
  'en-US': { surprised: 'Excellent!', happy: 'Good!', puzzled: 'Hmm?', creeped: '...' },
  'es-ES': { surprised: '¡Excelente!', happy: '¡Bien!', puzzled: '¿Mmm?', creeped: '...' },
};

// ---- 場面（年齢ごと） ----
// people: 画面に出る人（順番は左から）。kind は絵、role はファンの分類、speaker は手本を言う人
// langOf: その場面で言うべき言語（6歳だけ授業の言語）
// beat(round, lang): 繰り返しのあいだの動作。before は手本の前、after は手本のあとに会話窓へ出す。anim は絵の動き
// ending: 5回繰り返して押されなかったときの終わり方（会話窓の文か、話す人のセリフ）
// reactions: 反応の声（言語ごと。仮・英語とスペイン語はネイティブ未確認）。ない場面（1歳）は COUNTRIES の reactions
// reactor: 反応する人。その人の声（app.js の VOICES）で読む。ない場面（1歳・6歳）は既定の高さ
// results: 判定ごとの結果テキスト（1歳はv8の例文、2〜6歳はすべて仮）
export const SCENES = [
  {
    age: 1,
    situation: () => '1歳。パパとママが一生懸命に話しかけてきます。真似して言ってみましょう。',
    imitate: true,
    people: [
      { id: 'papa', kind: 'papa', role: '家族・親戚', speaker: true },
      { id: 'mama', kind: 'mama', role: '家族・親戚', speaker: true },
    ],
    langOf: (country) => country.lang,
    lines: AGE1,
    beat: () => null,
    ending: { text: '（パパとママは顔を見合わせた）' },
    results: {
      best: '両親があなたを人前に連れ出し「この子がすごいの」と言いまわった。あなたは近所と親戚の人気者になった！',
      normal: '両親があなたを家族や親戚に見せ「この子がしゃべったの」と言いまわった。あなたは家族・親戚の人気者になった！',
      other: '両親はきょとんとしたあと、顔を見合わせて笑った。',
      silent: '両親は少しがっかりしたが、「まだ早いよね」と笑い合った。',
      creepy: '両親は顔を見合わせた。「……今の、なに？」',
    },
  },
  {
    age: 2,
    situation: () => '2歳。おじいちゃんとおばあちゃんの家で、おばあちゃんと一緒にごはんを食べています。おばあちゃんの言葉を真似してみましょう。',
    imitate: true,
    people: [
      { id: 'grandma', kind: 'grandma', role: '家族・親戚', speaker: true },
      { id: 'cat', kind: 'cat', role: '家族・親戚' },
    ],
    langOf: (country) => country.lang,
    lines: AGE2,
    beat: () => ({ before: '（モグモグモグ）', anim: { id: 'grandma', cls: 'chew' } }),
    ending: { text: '（おばあちゃんは食べ終わった）' },
    // 「通常」は1語の場面なので出ないが、データとして入れておく
    reactor: 'grandma',
    reactions: {
      'ja-JP': { surprised: 'あらまあ！ 上手に言えたねえ！', happy: 'そうそう、おいしいねえ', puzzled: 'おや？', creeped: '……あらまあ' },
      'en-US': { surprised: 'Oh my! You said it!', happy: "That's right. Yummy!", puzzled: 'Hmm?', creeped: '...Oh dear.' },
      'es-ES': { surprised: '¡Ay, qué bien! ¡Lo has dicho!', happy: '¡Eso es, qué rico!', puzzled: '¿Mmm?', creeped: '...Ay, ay, ay.' },
    },
    results: {
      best: 'おばあちゃんは目を丸くした。「今、おいしいって言った！」その日の食卓は、いつもより長く続いた。',
      normal: 'おばあちゃんは目を丸くした。「今、おいしいって言った！」その日の食卓は、いつもより長く続いた。',
      other: 'おばあちゃんはスプーンを止めた。「……どこで覚えたの？」',
      silent: 'おばあちゃんは食べ終わってしまった。あなたは黙々と食べ続けた。',
      creepy: 'おばあちゃんはスプーンを置いた。「……今の、なに？」',
    },
  },
  {
    age: 3,
    situation: () => '3歳。近所のおばあさんとおじいさんが、飴をくれます。お母さんの言葉を真似してみましょう。',
    imitate: true,
    people: [
      { id: 'ngrandma', kind: 'neighborGrandma', role: '近所' },
      { id: 'grandpa', kind: 'grandpa', role: '近所' },
      { id: 'mother', kind: 'mother', role: '家族・親戚', speaker: true },
    ],
    langOf: (country) => country.lang,
    lines: AGE3,
    beat: (round) => (round % 2 === 0
      ? { before: '（おばあさんが飴を手渡す）', anim: { id: 'ngrandma', cls: 'hand' }, candy: round + 1 }
      : { before: '（おじいさんが飴を手渡す）', anim: { id: 'grandpa', cls: 'hand' }, candy: round + 1 }),
    ending: { text: '（2人の飴がなくなった）' },
    // 反応するのは近所のおばあさん（手本を言う母ではない）。「通常」は出ないが、データとして入れておく
    reactor: 'ngrandma',
    reactions: {
      'ja-JP': { surprised: 'まあ！ ちゃんとお礼が言えるのね！', happy: 'どういたしまして', puzzled: 'おや？', creeped: '……おやおや' },
      'en-US': { surprised: 'Oh! Such good manners!', happy: "You're welcome!", puzzled: 'Hmm?', creeped: '...Oh my.' },
      'es-ES': { surprised: '¡Ay, qué bien! ¡Qué educación!', happy: '¡De nada!', puzzled: '¿Mmm?', creeped: '...Vaya, vaya.' },
    },
    results: {
      best: 'おばあさんとおじいさんは大喜びで、飴をもうひと袋ずつくれた。あなたは近所で「ありがとうが言える子」と評判になった。',
      normal: 'おばあさんとおじいさんは大喜びで、飴をもうひと袋ずつくれた。あなたは近所で「ありがとうが言える子」と評判になった。',
      other: 'おばあさんとおじいさんは顔を見合わせ、とりあえず飴をもう1個くれた。',
      silent: '2人の飴がなくなった。母の手の中は、飴でいっぱいになった。',
      creepy: 'おじいさんは、そっと飴を引っ込めた。',
    },
  },
  {
    age: 4,
    situation: () => '4歳。遊びに来ていた親戚が帰ります。',
    imitate: false,
    people: [
      { id: 'uncle', kind: 'uncle', role: '家族・親戚' },
      { id: 'aunt', kind: 'aunt', role: '家族・親戚' },
      { id: 'cousin', kind: 'cousin', role: '家族・親戚', speaker: true },
    ],
    langOf: (country) => country.lang,
    lines: AGE4,
    beat: (round) => ({ before: '（いとこが一歩歩いて、振り返る）', anim: { id: 'cousin', cls: 'step', round } }),
    ending: { text: '（いとこは去って行った）' },
    reactor: 'cousin',
    reactions: {
      'ja-JP': { surprised: 'やったー！ またね！', happy: 'うん、またね！', puzzled: 'え？', creeped: '……こわい' },
      'en-US': { surprised: 'Yay! See you!', happy: 'Yeah, see you!', puzzled: 'Huh?', creeped: '...Scary.' },
      'es-ES': { surprised: '¡Bien! ¡Hasta luego!', happy: '¡Sí, adiós!', puzzled: '¿Eh?', creeped: '...Qué miedo.' },
    },
    results: {
      best: 'いとこは走って戻ってきて、あなたを抱きしめた。「すぐまた来るからね！」',
      normal: 'いとこはうれしそうに、見えなくなるまで手を振り続けた。',
      other: 'いとこは立ち止まって首をかしげ、また歩き出した。',
      silent: 'いとこは寂しそうに去って行った。',
      creepy: 'いとこは、おばさんの後ろに隠れた。',
    },
  },
  {
    age: 5,
    situation: () => '5歳。幼稚園の初日です。先生があいさつしてくれます。',
    imitate: false,
    people: [
      { id: 'teacher', kind: 'teacher', role: '学校', speaker: true },
      { id: 'kid1', kind: 'kid', role: '学校' },
      { id: 'kid2', kind: 'kid', role: '学校' },
      { id: 'kid3', kind: 'kid', role: '学校' },
      { id: 'kid4', kind: 'kid', role: '学校' },
    ],
    langOf: (country) => country.lang,
    lines: GREETING,
    beat: (round) => ({ after: '（にっこりして待つ）', anim: { id: 'kids', cls: 'lean', round } }),
    ending: {
      say: {
        'ja-JP': '大丈夫、ちょっとずつ慣れていこうね',
        'en-US': "That's okay. Let's take it slow.",
        'es-ES': 'No pasa nada. Poco a poco.',
      },
    },
    reactor: 'teacher',
    reactions: {
      'ja-JP': { surprised: 'まあ！ 上手にあいさつできたね！', happy: 'はい、よろしくね', puzzled: 'あら？', creeped: '……あらあら' },
      'en-US': { surprised: 'Wow! What a great hello!', happy: 'Nice to meet you, too!', puzzled: 'Oh?', creeped: '...Oh, my.' },
      'es-ES': { surprised: '¡Qué bien! ¡Muy bien dicho!', happy: '¡Mucho gusto!', puzzled: '¿Eh?', creeped: '...Vaya.' },
    },
    results: {
      best: '先生はしゃがんだまま固まり、それから満面の笑みになった。「みんな、今の聞いた？」あなたは初日から人気者になった。',
      normal: '先生はにっこり笑って、あなたの頭をなでた。',
      other: '先生は「あら？」と言って、園児たちと顔を見合わせた。',
      silent: '先生は「大丈夫、ちょっとずつ慣れていこうね」と笑った。',
      creepy: '先生の笑顔が、一瞬だけ固まった。',
    },
  },
  {
    age: 6,
    situation: (country) => `6歳。小学校で初めての${LANG_NAMES[LESSON_LANG[country.id]]}の授業です。`,
    imitate: false,
    people: [
      { id: 'teacher', kind: 'teacher', role: '学校', speaker: true },
      { id: 'kid1', kind: 'kid', role: '学校' },
      { id: 'kid2', kind: 'kid', role: '学校' },
      { id: 'kid3', kind: 'kid', role: '学校' },
    ],
    langOf: (country) => LESSON_LANG[country.id],
    lines: GREETING,
    intro: { text: 'Repeat after me.', lang: 'en-US', speaker: 'teacher' },
    beat: () => ({ after: '（先生がこちらを見て待つ）', anim: { id: 'teacher', cls: 'look' } }),
    ending: { say: { 'en-US': 'OK, next!', 'es-ES': 'Vale, ¡siguiente!' } },
    reactions: TEACHER_REACTIONS,
    results: {
      best: '先生は「Excellent!」と拍手した。クラスのみんなも、なぜか拍手した。',
      normal: '先生は「Good!」と親指を立てた。',
      other: '先生は「Almost!」と笑った。教室に笑いが起きた。',
      silent: '先生は「OK, next!」と言って、次に進んだ。',
      creepy: '教室が、しんと静まりかえった。',
    },
  },
];

// 判定 → 反応（絵と声）
// ほかの言語で言ったときは「首をかしげる」を使い回す（v3）
export const REACTION_OF = { best: 'surprised', normal: 'happy', other: 'puzzled', silent: 'puzzled', creepy: 'creeped' };

export const TEXTS = {
  micNotice: 'このゲームはマイクを使います。はじめると、ブラウザがマイクの許可を求めます。',
  noRecognition: 'このブラウザは音声認識に対応していません。デバッグ設定（右上の⚙）の「テキストで入力」で判定だけ試せます。',
  earth: 'どこで生まれるかは、矢にまかせましょう。',
  born: (name) => `${name}で生まれました`,
  aged: (age) => `${age}歳になりました`,
  // 点数とファンの表示（v3）。「+N Bonus Fans」「0 Fans」は仮の文言。
  // 数と語の間は改行しない空白（スマホ幅で語だけが次の行に落ちないように）
  pointsLine: (n) => `${n}点`,
  fanLine: (n) => (n === 0 ? '0 Fans' : `${n} ${n === 1 ? 'Fan' : 'Fans'} Get!`),
  bonusLine: (n) => `+${n} Bonus ${n === 1 ? 'Fan' : 'Fans'}`,
  fansWord: (n) => (n === 1 ? 'Fan' : 'Fans'),
  verdictLabels: { best: '最良', normal: '通常', other: 'ほかの言語', silent: '無音', creepy: '気持ち悪がられる' },
};
