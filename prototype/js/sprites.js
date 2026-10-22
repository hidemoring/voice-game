// 両親のドット絵（仮）。12×16のマップをSVGの矩形に起こす。
// . 透明 / o 輪郭 / h 髪 / s 肌 / e 目 / c 服 / p ズボン

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

export function parentSVG(kind, colors) {
  const map = kind === 'papa' ? PAPA : MAMA;
  const fill = { o: '#111', e: '#111', s: colors.skin, h: colors.hair, c: colors[kind], p: '#333' };
  const rects = [];
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (fill[ch]) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill[ch]}"/>`);
    });
  });
  return `<svg viewBox="0 0 12 16" width="84" height="112" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}
