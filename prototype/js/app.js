// 画面遷移と進行。タイトル → 地球（矢） → 誕生 → 1歳 … 6歳（会話 → 入力 → 結果）→ まとめ

import {
  COUNTRIES, SCENES, TEXTS, RECORD_SECONDS, ROUNDS, END_WAIT_MS, TOTAL_EVENTS,
  REACTION_OF, BUILD, OPEN, PASSPHRASE, LANG_NAMES, COUNTRY_OF_LANG,
} from './data.js';
import { judge, recogLang, sceneFor, sceneLang, coreKeys } from './judge.js';
import * as speech from './speech.js';
import { personSVG, pxFor } from './sprites.js';
import {
  getSettings, saveSettings, getLogs, addLog, clearLogs, toTSV, downloadText, copyText, browserInfo,
  isUnlockedWith, saveUnlock,
} from './logger.js';

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MARKS = { surprised: '！？', happy: '♪', puzzled: '？', creeped: '…' };
// 話す人ごとの声の高さ・速さ（仮。場面データ「読み上げの声」）
const VOICES = {
  papa: { pitch: 0.7, rate: 0.9 },
  mama: { pitch: 1.3, rate: 0.9 },
  both: { pitch: 1.3, rate: 0.9 },
  mother: { pitch: 1.3, rate: 0.9 },
  grandma: { pitch: 1.0, rate: 0.75 },
  ngrandma: { pitch: 1.1, rate: 0.75 },
  grandpa: { pitch: 0.6, rate: 0.75 },
  cousin: { pitch: 1.6, rate: 1.0 },
  teacher: { pitch: 1.2, rate: 0.95 },
};
// マイクが使えなかったときの説明（判定せず、会話に戻す）。iPhone は設定の場所が違う
const MIC_ERRORS = {
  'not-allowed': 'マイクの使用が許可されていません。アドレスバーの左のアイコンからマイクを許可して、もう一度押してください。Claudeアプリ内のブラウザではマイクが使えないので、Chrome本体で開いてください。',
  'service-not-allowed': 'このブラウザでは音声認識サービスが使えません。Chrome本体で開いてください。',
  'audio-capture': 'マイクが見つかりません。マイクの接続を確認してください。',
  'no-start': '音声認識が始まりませんでした。マイクの許可を確認して、もう一度押してください。',
};
const MIC_ERRORS_IOS = {
  'not-allowed': 'マイクか音声認識が許可されていません。①アドレスバー左のアイコン → Webサイトの設定 → マイクを「許可」 ②iPhoneの設定 → Safari → マイクを「確認」か「許可」 ③設定 → プライバシーとセキュリティ → マイク → Safariをオン ④設定 → 一般 → キーボード → 音声入力をオン。変えたらページを再読み込みしてください。',
  'service-not-allowed': '音声認識が使えません。iPhoneの設定 → 一般 → キーボード → 「音声入力」をオンにして、ページを再読み込みしてください。',
  'audio-capture': 'マイクが見つかりません。マイクの接続を確認してください。',
  'no-start': '音声認識が始まりませんでした。マイクの許可を確認して、もう一度押してください。',
};
function micErrorText(error) {
  return (browserInfo().os === 'iOS' ? MIC_ERRORS_IOS : MIC_ERRORS)[error];
}

const state = {
  country: null,
  plan: 'A',
  age: 1,
  history: [], // 年齢ごとの結果（まとめ画面用）
  loopToken: 0,
  loopPaused: false,
  round: 0, // 繰り返しの何回目まで進んだか（タブを離れて戻ったときの再開用）
  input: null,
  result: null,
};

const currentScene = () => sceneFor(state.age);
const currentLang = () => sceneLang(currentScene(), state.country);

// その言語の読み上げ声が端末にないときは読まない（既定の声で読むとローマ字読みになる）
function canSpeak(lang) {
  return speech.hasVoiceFor(lang) !== false;
}

// ---- 画面 ----
function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  window.scrollTo(0, 0);
}
function setMode(mode) {
  $('#screen-scene').dataset.mode = mode;
}
function inTalk() {
  return $('#screen-scene').classList.contains('active') && $('#screen-scene').dataset.mode === 'talk';
}

// ---- 閉鎖フラグと合言葉 ----
const normPass = (s) => String(s || '').normalize('NFKC').trim().toLowerCase();
function applyGate() {
  const open = OPEN || isUnlockedWith(PASSPHRASE);
  $('#title-main').hidden = !open;
  $('#gate').hidden = open;
  $('#btn-debug').hidden = !open;
}
function tryUnlock() {
  if (normPass($('#gate-field').value) === normPass(PASSPHRASE)) {
    saveUnlock(PASSPHRASE);
    $('#gate-field').value = '';
    $('#gate-msg').textContent = '';
    applyGate();
  } else {
    $('#gate-msg').textContent = '合言葉が違います。';
  }
}

// ---- タイトル ----
function initTitle() {
  $('#build').textContent = `build ${BUILD}`;
  applyGate();
  if (browserInfo().inApp) {
    $('#support-note').textContent += ' いまはアプリ内ブラウザで開いているようです。音声認識が働かないことがあるので、右下の共有ボタンなどから Safari で開き直してください。';
    $('#support-note').classList.add('warn');
  }
  $('#btn-gate').addEventListener('click', tryUnlock);
  $('#gate-field').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
  if (!speech.recognitionSupported) {
    $('#support-note').textContent = TEXTS.noRecognition;
    $('#support-note').classList.add('warn');
  }
  $('#btn-start').addEventListener('click', () => {
    speech.unlockAudio();
    startLife();
  });
}

// 1つの人生を始める（地球の画面へ）
function startLife() {
  state.history = [];
  resetEarth();
  show('earth');
}

// ---- 地球と矢 ----
function resetEarth() {
  $('#arrow').classList.remove('fly');
  $('.globe').classList.remove('hit');
  $('#btn-arrow').disabled = false;
}
function pickCountry() {
  const s = getSettings();
  if (COUNTRIES[s.country]) return COUNTRIES[s.country];
  const ids = Object.keys(COUNTRIES);
  return COUNTRIES[ids[Math.floor(Math.random() * ids.length)]];
}
async function shootArrow() {
  $('#btn-arrow').disabled = true;
  $('#arrow').classList.add('fly');
  await wait(700);
  $('.globe').classList.add('hit');
  state.country = pickCountry();
  await wait(900);
  // デバッグ「年齢を選んで始める」：誕生のあと、その年齢から
  state.age = Math.min(SCENES.length, Math.max(1, Number(getSettings().startAge) || 1));
  $('#birth-text').textContent = TEXTS.born(state.country.name);
  show('birth');
}

// ---- 場面：会話 ----
function startScene(age) {
  state.age = age;
  const scene = currentScene();
  const c = state.country;
  const lang = currentLang();
  $('#status-age').textContent = `${age}歳`;
  $('#status-event').textContent = `イベント ${age}／${TOTAL_EVENTS}`;
  renderPeople(scene, c);
  $('#situation').textContent = scene.situation(c);
  $('#result-lines').innerHTML = '';
  $('#raw-info').textContent = '';
  $('#after-buttons').hidden = true;
  $('#self-report').hidden = false;
  $('#btn-mic').disabled = false;
  $('#btn-mic').textContent = micLabel();
  const note = $('#voice-note');
  note.hidden = canSpeak(lang);
  note.textContent = `この端末には${LANG_NAMES[lang] || lang}の読み上げの声がないため、セリフは字幕だけです。`;
  setDialogue('');
  setMode('talk');
  show('scene');
  state.round = 0;
  runSceneLoop();
}
function micLabel() {
  return `▶ ${currentScene().imitate ? 'まねして言う' : '言う'}（${recordSeconds()}秒）`;
}
function recordSeconds() {
  return Number(getSettings().seconds) || RECORD_SECONDS;
}
function renderPeople(scene, country) {
  const box = $('#people');
  box.className = 'people';
  box.dataset.count = String(scene.people.length);
  box.innerHTML = '';
  const px = pxFor(scene.people.length);
  let kidIndex = 0;
  for (const p of scene.people) {
    const el = document.createElement('div');
    el.className = 'person';
    el.id = `person-${p.id}`;
    el.dataset.kind = p.kind;
    el.innerHTML = `<span class="mark"></span><div class="sprite">${personSVG(p.kind, country.colors, p.kind === 'kid' ? kidIndex++ : 0, px)}</div><div class="badge"></div>`;
    box.appendChild(el);
  }
}

function setDialogue(text) {
  $('#dialogue').textContent = text || '　';
}
function highlightSpeaker(who) {
  document.querySelectorAll('.person').forEach((el) => {
    const id = el.id.replace('person-', '');
    el.classList.toggle('talking', who === 'both' ? id === 'papa' || id === 'mama' : id === who);
  });
}
// 繰り返しのあいだの動作：絵を少し動かす
function animate(anim) {
  if (!anim) return;
  if (anim.id === 'kids') {
    document.querySelectorAll('.person[data-kind="kid"] .sprite').forEach((s, i) => {
      s.style.transform = `translate(${(i % 2 ? 1 : -1) * 2 * (anim.round + 1)}px, ${-2 * (anim.round + 1)}px)`;
    });
    return;
  }
  const el = $(`#person-${anim.id}`);
  if (!el) return;
  if (anim.cls === 'step') {
    // いとこが一歩ずつ遠ざかる（小さくなる）
    el.querySelector('.sprite').style.transform = `translateX(${-14 * (anim.round + 1)}px) scale(${1 - 0.12 * (anim.round + 1)})`;
    el.classList.add('anim-turn');
    setTimeout(() => el.classList.remove('anim-turn'), 700);
    return;
  }
  el.classList.add(`anim-${anim.cls}`);
  setTimeout(() => el.classList.remove(`anim-${anim.cls}`), 1300);
}
function setBadge(id, text) {
  const el = $(`#person-${id} .badge`);
  if (el) el.textContent = text;
}

// 手本を最大5回繰り返す。5回目のあと3秒待っても押されなければ、場面に合った形で終わって無音の結果へ
async function runSceneLoop() {
  const token = ++state.loopToken;
  state.loopPaused = false;
  const scene = currentScene();
  const lang = currentLang();
  const lines = scene.lines[lang];
  const speakable = canSpeak(lang);
  const say = async (text, sayLang, who) => {
    setDialogue(text);
    highlightSpeaker(who);
    if (speakable && canSpeak(sayLang)) await speech.speak(text, sayLang, VOICES[who] || VOICES.teacher);
    else await wait(1500);
    highlightSpeaker(null);
  };
  if (scene.intro && state.round === 0) {
    await say(scene.intro.text, scene.intro.lang, scene.intro.speaker);
    if (token !== state.loopToken) return;
    await wait(500);
  }
  for (let r = state.round; r < ROUNDS; r++) {
    state.round = r;
    const beat = scene.beat(r, lang);
    if (beat && beat.before) {
      if (token !== state.loopToken) return;
      setDialogue(beat.before);
      animate(beat.anim);
      await wait(1300);
    }
    if (beat && beat.candy) setBadge('mother', `飴×${beat.candy}`);
    for (const p of lines.phrases) {
      if (token !== state.loopToken) return;
      await say(p.text, lang, p.speaker);
      await wait(350);
    }
    if (beat && beat.after) {
      if (token !== state.loopToken) return;
      setDialogue(beat.after);
      animate(beat.anim);
      await wait(1300);
    }
    await wait(500);
  }
  state.round = ROUNDS;
  // 5回目のあと、押されるのを待つ
  await wait(END_WAIT_MS);
  if (token !== state.loopToken) return;
  endWithoutInput();
}
function stopSceneLoop() {
  state.loopToken++;
  speech.cancelSpeech();
  highlightSpeaker(null);
}
// 押されずに終わった：場面に合った終わり方 → 無音の結果（自己申告なしで記録）
async function endWithoutInput() {
  stopSceneLoop();
  const scene = currentScene();
  const lang = currentLang();
  $('#btn-mic').disabled = true;
  if (scene.ending.say) {
    const text = scene.ending.say[lang] || Object.values(scene.ending.say)[0];
    setDialogue(text);
    highlightSpeaker(scene.people.find((p) => p.speaker).id);
    if (canSpeak(lang)) await speech.speak(text, lang, VOICES.teacher);
    else await wait(1500);
    highlightSpeaker(null);
  } else {
    setDialogue(scene.ending.text);
    await wait(1500);
  }
  const result = judge('', { countryId: state.country.id, plan: state.plan, age: state.age });
  state.input = {
    transcript: '', finals: [], interim: '', usedInterim: false, error: null, durationMs: 0,
    recogLang: recogLang(state.plan, state.country, state.age), method: 'none', seconds: 0,
  };
  state.result = result;
  showResult(result, { auto: true });
}
// タブが隠れたら声を止め、戻ったら続きから再開する（裏で鳴り続けないように）
function initVisibility() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      speech.cancelSpeech();
      if (inTalk()) {
        stopSceneLoop();
        state.loopPaused = true;
      }
    } else if (state.loopPaused && inTalk()) {
      runSceneLoop();
    }
  });
  window.addEventListener('pagehide', () => speech.cancelSpeech());
}

// ---- 場面：入力 ----
function setBar(ratio) {
  $('#bar-fill').style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}
async function startInput() {
  const s = getSettings();
  state.plan = s.plan;
  stopSceneLoop();
  setDialogue('……');
  $('#btn-mic').disabled = true;
  setMode('input');

  const useText = s.textInput || !speech.recognitionSupported;
  $('#text-input').hidden = !useText;
  $('#mic-error').hidden = true;
  $('#countdown').hidden = useText;
  if (useText) {
    $('#input-phase').textContent = 'テキストで入力してください（認識の代わり）';
    $('#text-field').value = '';
    $('#text-field').focus();
    return;
  }

  const lang = recogLang(state.plan, state.country, state.age);
  const seconds = recordSeconds();
  $('#input-phase').textContent = 'マイクを準備中…';
  $('#remain').textContent = seconds.toFixed(1);
  setBar(1);
  const raw = await speech.listen({
    lang,
    seconds,
    onPhase: (ph) => {
      if (ph === 'listening') $('#input-phase').textContent = '言ってみよう！';
      if (ph === 'judging') $('#input-phase').textContent = '判定中…';
    },
    onTick: (remain) => {
      $('#remain').textContent = remain.toFixed(1);
      setBar(remain / seconds);
    },
  });
  if (MIC_ERRORS[raw.error]) {
    showMicError(raw.error);
    return;
  }
  finishInput(raw.transcript, { ...raw, recogLang: lang, method: 'mic', seconds });
}
function showMicError(error) {
  $('#countdown').hidden = true;
  $('#input-phase').textContent = 'マイクが使えませんでした';
  $('#mic-error-text').textContent = `${micErrorText(error)}（${error}）`;
  $('#mic-error').hidden = false;
}
// 会話に戻る（手本の繰り返しを続きから再開）
function backToTalk() {
  $('#btn-mic').disabled = false;
  setMode('talk');
  runSceneLoop();
}
function submitText() {
  const t = $('#text-field').value;
  finishInput(t, {
    transcript: t, finals: [], interim: '', usedInterim: false, error: null, durationMs: 0,
    recogLang: recogLang(state.plan, state.country, state.age), method: 'text', seconds: recordSeconds(),
  });
}
function finishInput(transcript, raw) {
  const result = judge(transcript, { countryId: state.country.id, plan: state.plan, age: state.age });
  state.input = raw;
  state.result = result;
  showResult(result);
}

// ---- 場面：結果 ----
function clearReaction() {
  $('#people').className = 'people';
  document.querySelectorAll('.person .mark').forEach((m) => { m.textContent = ''; });
}
function setReaction(kind) {
  $('#people').className = `people reaction-${kind}`;
  document.querySelectorAll('.person .mark').forEach((m) => { m.textContent = MARKS[kind]; });
}
function addLine(text, cls) {
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = text;
  $('#result-lines').appendChild(p);
}
// 反応の声：その場面で話す人の言語の国のもの。6歳は先生の言葉
function reactionVoice(scene, lang, kind) {
  const set = (scene.reactions && scene.reactions[lang]) || COUNTRIES[COUNTRY_OF_LANG[lang]].reactions;
  return set[kind];
}
function rawSummary(result, input) {
  const labels = currentScene().lines[result.lang].coreLabels;
  const fans = `${result.fan} ${TEXTS.fansWord(result.fan)}${result.bonusFan ? `＋${result.bonusFan} Bonus ${TEXTS.fansWord(result.bonusFan)}` : ''}`;
  const method = { text: 'テキスト', mic: 'マイク', none: '入力なし' }[input.method] || input.method;
  const parts = [
    `認識（${input.recogLang}／Plan ${state.plan}／${method}）: 「${result.transcript}」`,
    `見つかった語: ${result.found.length ? result.found.map((k) => labels[k]).join('、') : 'なし'}`,
    `順番: ${result.found.length === result.total && result.total > 1 ? (result.inOrder ? '○' : '×') : '—'}　余計な語: ${result.extra ? `あり（${result.rest}）` : 'なし'}`,
    `判定: ${TEXTS.verdictLabels[result.verdict]}　${result.points}点　${fans}`,
  ];
  if (result.other) {
    const ol = currentScene().lines[result.other.lang].coreLabels;
    parts.push(`ほかの言語: ${LANG_NAMES[result.other.lang]}の言葉（${result.other.found.map((k) => ol[k]).join('、')}）`);
  }
  if (input.usedInterim) parts.push('※確定前の認識結果を使用');
  if (input.error) parts.push(`※認識エラー: ${input.error}`);
  const alts = (input.finals || []).flatMap((f) => f.alternatives.slice(1).map((a) => a.transcript)).filter(Boolean);
  if (alts.length) parts.push(`他の候補: ${alts.join(' / ')}`);
  return parts.join('\n');
}
async function showResult(result, { auto = false } = {}) {
  const scene = currentScene();
  const lang = currentLang();
  const text = scene.results[result.verdict] || scene.results.best;
  const reaction = REACTION_OF[result.verdict];
  setMode('result');
  $('#result-lines').innerHTML = '';

  // 反応（絵と声）
  setReaction(reaction);
  const voice = reactionVoice(scene, lang, reaction);
  setDialogue(voice);
  speech.playReaction(reaction);
  if (canSpeak(lang)) speech.speak(voice, lang, { pitch: 1.2, rate: 1 });
  await wait(1400);

  addLine(text);
  await wait(1200);
  addLine(TEXTS.pointsLine(result.points), 'score');
  await wait(800);
  addLine(TEXTS.fanLine(result.fan), 'fan');
  if (result.bonusFan) {
    await wait(800);
    addLine(TEXTS.bonusLine(result.bonusFan), 'fan');
  }
  await wait(500);

  if (getSettings().showRaw) $('#raw-info').textContent = rawSummary(result, state.input);
  if (auto) {
    // 押されずに終わったときは自己申告を出さず、そのまま記録する
    saveRecord([]);
  } else {
    buildSelfReport(scene.lines[lang]);
  }
}

// ---- 自己申告と記録 ----
function buildSelfReport(lines) {
  const box = $('#self-report-options');
  box.innerHTML = '';
  for (const k of coreKeys(lines)) {
    box.insertAdjacentHTML('beforeend', `<label><input type="checkbox" name="said" value="${k}"> ${lines.coreLabels[k]}</label>`);
  }
  box.insertAdjacentHTML('beforeend', '<label><input type="checkbox" name="said" value="none"> 何も言わなかった</label>');
  // 「何も言わなかった」は他と同時に選べない
  const inputs = box.querySelectorAll('input');
  inputs.forEach((cb) => cb.addEventListener('change', () => {
    if (!cb.checked) return;
    if (cb.value === 'none') inputs.forEach((o) => { if (o !== cb) o.checked = false; });
    else box.querySelector('input[value="none"]').checked = false;
  }));
  $('#self-report').hidden = false;
}
function saveRecord(saidOverride) {
  const s = getSettings();
  const c = state.country;
  const r = state.result;
  const i = state.input;
  const b = browserInfo();
  const said = saidOverride || [...document.querySelectorAll('#self-report-options input:checked')].map((x) => x.value);
  addLog({
    time: new Date().toISOString(),
    build: BUILD,
    tester: s.tester,
    country: c.id,
    age: state.age,
    lang: r.lang,
    plan: state.plan,
    recogLang: i.recogLang,
    method: i.method,
    seconds: i.seconds,
    browser: b.label,
    ua: b.ua,
    transcript: r.transcript,
    normalized: r.normalized,
    alternatives: [...new Set((i.finals || []).flatMap((f) => f.alternatives.map((a) => a.transcript)))],
    interim: i.interim,
    usedInterim: !!i.usedInterim,
    error: i.error,
    durationMs: i.durationMs,
    found: r.found,
    inOrder: r.inOrder,
    extra: r.extra,
    rest: r.rest,
    verdict: r.verdict,
    points: r.points,
    fan: r.fan,
    bonusFan: r.bonusFan,
    otherLang: r.other ? r.other.lang : '',
    selfReport: said,
  });
  state.history.push({ age: state.age, verdict: r.verdict, points: r.points, fan: r.fan, bonusFan: r.bonusFan, byRole: r.byRole });
  $('#self-report').hidden = true;
  $('#after-buttons').hidden = false;
  $('#saved-note').textContent = `記録しました（${getLogs().length}件）`;
  $('#btn-next').textContent = state.age < SCENES.length ? `▼ ${state.age + 1}歳へ` : '▼ まとめへ';
}
// 次の年齢へ（「◯歳になりました」を挟む）。6歳のあとはまとめ
function goNext() {
  if (state.age < SCENES.length) {
    state.age += 1;
    $('#birth-text').textContent = TEXTS.aged(state.age);
    show('birth');
  } else {
    showSummary();
  }
}

// ---- まとめ ----
function showSummary() {
  const tbody = $('#summary-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  const roles = {};
  for (const h of state.history) {
    const fans = h.fan + h.bonusFan;
    total += fans;
    for (const [role, n] of Object.entries(h.byRole)) roles[role] = (roles[role] || 0) + n;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${h.age}歳</td><td>${TEXTS.verdictLabels[h.verdict]}</td><td class="num">${h.points}点</td><td class="num">${h.fan}${h.bonusFan ? `+${h.bonusFan}` : ''}</td>`;
    tbody.appendChild(tr);
  }
  $('#summary-country').textContent = state.country ? `${state.country.name}生まれ` : '';
  $('#summary-total').textContent = `合計 ${total} ${TEXTS.fansWord(total)}`;
  const order = ['家族・親戚', '近所', '学校'];
  $('#summary-roles').textContent = `内訳：${order.filter((r) => roles[r]).map((r) => `${r} ${roles[r]}`).join('／') || 'なし'}`;
  show('summary');
}

// ---- デバッグ設定 ----
function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
}
function refreshDebug() {
  const s = getSettings();
  $('#dbg-country').value = s.country;
  $('#dbg-start-age').value = String(s.startAge || 1);
  document.querySelector(`input[name="dbg-plan"][value="${s.plan}"]`).checked = true;
  $('#dbg-tester').value = s.tester;
  $('#dbg-seconds').value = String(s.seconds);
  $('#dbg-showraw').checked = s.showRaw;
  $('#dbg-textinput').checked = s.textInput;
  const v = speech.voiceStatus();
  const b = browserInfo();
  const mark = (ok) => (ok ? '○' : '×');
  $('#dbg-support').textContent =
    `build ${BUILD}｜${b.label}｜音声認識: ${mark(speech.recognitionSupported)}｜読み上げの声 ja:${mark(v.ja)} en:${mark(v.en)} es:${mark(v.es)}`
    + (b.inApp ? '｜※アプリ内ブラウザでは音声認識が働かないことがあります。Safari で開いてください' : '');
  const logs = getLogs();
  $('#dbg-count').textContent = `${logs.length}件`;
  $('#dbg-tsv').value = toTSV(logs);
  $('#dbg-msg').textContent = '';
}
function initDebug() {
  const panel = $('#debug-panel');
  $('#btn-debug').addEventListener('click', () => {
    if (panel.hidden) refreshDebug();
    panel.hidden = !panel.hidden;
  });
  $('#btn-debug-close').addEventListener('click', () => { panel.hidden = true; });
  $('#dbg-country').addEventListener('change', (e) => saveSettings({ country: e.target.value }));
  $('#dbg-start-age').addEventListener('change', (e) => saveSettings({ startAge: Number(e.target.value) }));
  document.querySelectorAll('input[name="dbg-plan"]').forEach((r) => {
    r.addEventListener('change', (e) => saveSettings({ plan: e.target.value }));
  });
  $('#dbg-tester').addEventListener('input', (e) => saveSettings({ tester: e.target.value.trim() }));
  $('#dbg-seconds').addEventListener('change', (e) => {
    saveSettings({ seconds: Number(e.target.value) });
    if (state.country) $('#btn-mic').textContent = micLabel();
  });
  $('#dbg-showraw').addEventListener('change', (e) => saveSettings({ showRaw: e.target.checked }));
  $('#dbg-textinput').addEventListener('change', (e) => saveSettings({ textInput: e.target.checked }));
  $('#dbg-copy').addEventListener('click', async () => {
    const ok = await copyText(toTSV(getLogs()));
    $('#dbg-msg').textContent = ok ? 'コピーしました' : 'コピーできませんでした。下の欄から手でコピーしてください';
  });
  $('#dbg-download-tsv').addEventListener('click', () => {
    downloadText(`voice-game-log-${stamp()}.tsv`, toTSV(getLogs()), 'text/tab-separated-values');
  });
  $('#dbg-download').addEventListener('click', () => {
    downloadText(`voice-game-log-${stamp()}.json`, JSON.stringify(getLogs(), null, 2), 'application/json');
  });
  $('#dbg-clear').addEventListener('click', () => {
    if (window.confirm('記録をすべて消しますか？')) {
      clearLogs();
      refreshDebug();
    }
  });
}

// ---- 起動 ----
function init() {
  initTitle();
  initDebug();
  initVisibility();
  $('#btn-arrow').addEventListener('click', shootArrow);
  $('#btn-birth-next').addEventListener('click', () => { clearReaction(); startScene(state.age); });
  $('#btn-mic').addEventListener('click', startInput);
  $('#btn-text-judge').addEventListener('click', submitText);
  $('#btn-mic-retry').addEventListener('click', backToTalk);
  $('#text-field').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitText(); });
  $('#btn-save').addEventListener('click', () => saveRecord());
  $('#btn-next').addEventListener('click', goNext);
  $('#btn-title').addEventListener('click', () => { stopSceneLoop(); show('title'); });
  $('#btn-summary-again').addEventListener('click', startLife);
  $('#btn-summary-title').addEventListener('click', () => show('title'));
}
init();
