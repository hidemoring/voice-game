// 人物のドット絵（仮）。小さなマップをSVGの矩形に起こす。
// . 透明 / o 輪郭 / h 髪 / s 肌 / e 目 / c 服 / p ズボン / g 眼鏡 / m ひげ / f 毛（ネコ）
// 2〜6歳の人物は両親と同じ型の色違い・小物違い（仕様書v4）

const PAPA = [
  '....oooo....',
  '...ohhhho...',
  '..ohhhhhho..',
  '..ohssssho..',
  '..osesseso..',
  '..osssssso..',
  '...osssso...',
  '....osso....',
  '..ooccccoo..',
  '.osccccccso.',
  '.osccccccso.',
  '..ooccccoo..',
  '...oppppo...',
  '...opoopo...',
  '...opo.opo..',
  '...oo..oo...',
];

const MAMA = [
  '....oooo....',
  '...ohhhho...',
  '..ohhhhhho..',
  '.ohhsssshho.',
  '.ohsessesho.',
  '.ohssssssho.',
  '.ohhossohho.',
  '..ohossoho..',
  '..ooccccoo..',
  '.osccccccso.',
  '.osccccccso.',
  '..occcccco..',
  '.occcccccco.',
  '.occcccccco.',
  '.oooooooooo.',
  '...oo..oo...',
];

// おじいさん：髪が薄く、ひげ
const GRANDPA = [
  '............',
  '....oooo....',
  '..oohhhhoo..',
  '..ohssssho..',
  '..osesseso..',
  '..osmmmmso..',
  '...osssso...',
  '....osso....',
  '..ooccccoo..',
  '.osccccccso.',
  '.osccccccso.',
  '..ooccccoo..',
  '...oppppo...',
  '...opoopo...',
  '...opo.opo..',
  '...oo..oo...',
];

// 眼鏡をかけた女性（近所のおばあさん、先生）
const GLASSES_MAMA = MAMA.map((row, y) => (y === 4 ? '.ohgsggsgho.' : row));

// 子ども（いとこ、園児、クラスの子）：小さめ
const CHILD = [
  '...oooo...',
  '..ohhhho..',
  '.ohssssho.',
  '.osesseso.',
  '.osssssso.',
  '..osssso..',
  '..occcco..',
  '.osccccso.',
  '.osccccso.',
  '..occcco..',
  '...oppo...',
  '...oo.oo..',
];

// ネコ（2歳。祖母の隣）
const CAT = [
  '.oo......oo.',
  '.offo..offo.',
  '.offffffffo.',
  '.ofeffffefo.',
  '.offffffffo.',
  '..offffffo..',
  '.offffffffoo',
  '.offffffffo.',
  '..oo.oo.oo..',
];

const MAPS = { PAPA, MAMA, GRANDPA, GLASSES_MAMA, CHILD, CAT };
const SIZES = { adult: { w: 12, h: 16 }, child: { w: 10, h: 12 }, cat: { w: 12, h: 9 } };
// 1ドットの大きさ（px）。画面の人数が多い場面は小さくして、スマホ幅（375px）でも1列に収める
const PX = 7;
export function pxFor(count) {
  if (count >= 5) return 5;
  if (count === 4) return 6;
  return PX;
}
const KID_CLOTH = ['#d9534f', '#5bc0de', '#5cb85c', '#f0ad4e'];

// 種類ごとの絵・服の色・髪の色。髪と肌は国の色を使う（指定がなければ）
const KINDS = {
  papa: { map: 'PAPA', cloth: (c) => c.papa },
  mama: { map: 'MAMA', cloth: (c) => c.mama },
  mother: { map: 'MAMA', cloth: (c) => c.mama },
  grandma: { map: 'MAMA', cloth: () => '#7a5c99', hair: () => '#bdbdbd' },
  neighborGrandma: { map: 'GLASSES_MAMA', cloth: () => '#5b8a72', hair: () => '#e6e6e6' },
  grandpa: { map: 'GRANDPA', cloth: () => '#5a6b7a', hair: () => '#d0d0d0' },
  uncle: { map: 'PAPA', cloth: () => '#8b5a2b' },
  aunt: { map: 'MAMA', cloth: () => '#c2567a' },
  cousin: { map: 'CHILD', cloth: () => '#e08a2e', size: 'child' },
  teacher: { map: 'GLASSES_MAMA', cloth: () => '#3b7dd8' },
  kid: { map: 'CHILD', cloth: (c, i) => KID_CLOTH[i % KID_CLOTH.length], size: 'child' },
  cat: { map: 'CAT', size: 'cat' },
};

export function personSVG(kind, colors, index = 0, px = PX) {
  const k = KINDS[kind] || KINDS.papa;
  const map = MAPS[k.map];
  const size = SIZES[k.size || 'adult'];
  const hair = k.hair ? k.hair(colors) : colors.hair;
  const fill = {
    o: '#111', e: '#111', g: '#111',
    s: colors.skin, h: hair, m: hair,
    c: k.cloth ? k.cloth(colors, index) : '#888',
    p: '#333', f: '#d9a066',
  };
  const rects = [];
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (fill[ch]) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill[ch]}"/>`);
    });
  });
  return `<svg viewBox="0 0 ${size.w} ${size.h}" width="${size.w * px}" height="${size.h * px}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

// 1歳の両親（以前からの呼び方）
export function parentSVG(kind, colors) {
  return personSVG(kind, colors);
}
