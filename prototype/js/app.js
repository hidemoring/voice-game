// 画面遷移と進行。タイトル → 地球（矢） → 誕生 → 1歳（会話 → 入力 → 結果）

import { COUNTRIES, TEXTS, RECORD_SECONDS, REACTION_OF, BUILD, OPEN, PASSPHRASE } from './data.js';
import { judge, recogLang } from './judge.js';
import * as speech from './speech.js';
import { parentSVG } from './sprites.js';
import {
  getSettings, saveSettings, getLogs, addLog, clearLogs, toTSV, downloadText, copyText, browserInfo,
  isUnlockedWith, saveUnlock,
} from './logger.js';

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MARKS = { surprised: '！？', happy: '♪', puzzled: '？', creeped: '…' };
// マイクが使えなかったときの説明（判定せず、会話に戻す）
const MIC_ERRORS = {
  'not-allowed': 'マイクの使用が許可されていません。アドレスバーの左のアイコンからマイクを許可して、もう一度押してください。Claudeアプリ内のブラウザではマイクが使えないので、Chrome本体で開いてください。',
  'service-not-allowed': 'このブラウザでは音声認識サービスが使えません。Chrome本体で開いてください。',
  'audio-capture': 'マイクが見つかりません。マイクの接続を確認してください。',
  'no-start': '音声認識が始まりませんでした。マイクの許可を確認して、もう一度押してください。',
};

const state = { country: null, plan: 'A', loopToken: 0, loopPaused: false, input: null, result: null };
const LANG_NAMES = { 'ja-JP': '日本語', 'en-US': '英語', 'es-ES': 'スペイン語' };

// その国の言語の読み上げ声が端末にないときは読まない（既定の声で読むとローマ字読みになる）
function canSpeak(country) {
  return speech.hasVoiceFor(country.lang) !== false;
}

// ---- 画面 ----
function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  window.scrollTo(0, 0);
}
function setMode(mode) {
  $('#screen-age1').dataset.mode = mode;
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
  $('#btn-gate').addEventListener('click', tryUnlock);
  $('#gate-field').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
  if (!speech.recognitionSupported) {
    $('#support-note').textContent = TEXTS.noRecognition;
    $('#support-note').classList.add('warn');
  }
  $('#btn-start').addEventListener('click', () => {
    speech.unlockAudio();
    resetEarth();
    show('earth');
  });
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
  $('#birth-text').textContent = TEXTS.born(state.country.name);
  show('birth');
}

// ---- 1歳：会話 ----
function startAge1() {
  const c = state.country;
  $('#parent-papa .sprite').innerHTML = parentSVG('papa', c.colors);
  $('#parent-mama .sprite').innerHTML = parentSVG('mama', c.colors);
  $('#situation').textContent = TEXTS.situation;
  clearReaction();
  $('#result-lines').innerHTML = '';
  $('#raw-info').textContent = '';
  $('#after-buttons').hidden = true;
  $('#self-report').hidden = false;
  $('#btn-mic').disabled = false;
  $('#btn-mic').textContent = `▶ まねして言う（${recordSeconds()}秒）`;
  const note = $('#voice-note');
  note.hidden = canSpeak(c);
  note.textContent = `この端末には${LANG_NAMES[c.lang] || c.lang}の読み上げの声がないため、両親のセリフは字幕だけです。`;
  setMode('talk');
  show('age1');
  runParentLoop();
}
function recordSeconds() {
  return Number(getSettings().seconds) || RECORD_SECONDS;
}

function setDialogue(text) {
  $('#dialogue').textContent = text || '　';
}
function highlightSpeaker(who) {
  $('#parent-papa').classList.toggle('talking', who === 'papa' || who === 'both');
  $('#parent-mama').classList.toggle('talking', who === 'mama' || who === 'both');
}
// ボタンを押すまで3語を繰り返す
async function runParentLoop() {
  const token = ++state.loopToken;
  state.loopPaused = false;
  const c = state.country;
  const speakable = canSpeak(c);
  while (token === state.loopToken) {
    for (const p of c.phrases) {
      if (token !== state.loopToken) return;
      setDialogue(p.text);
      highlightSpeaker(p.speaker);
      if (speakable) await speech.speak(p.text, c.lang, { pitch: p.speaker === 'papa' ? 0.7 : 1.3, rate: 0.9 });
      else await wait(1500);
      highlightSpeaker(null);
      await wait(350);
    }
    await wait(700);
  }
}
function stopParentLoop() {
  state.loopToken++;
  speech.cancelSpeech();
  highlightSpeaker(null);
}
// タブが隠れたら両親の声を止め、戻ったら再開する（裏で鳴り続けないように）
function initVisibility() {
  document.addEventListener('visibilitychange', () => {
    const inTalk = $('#screen-age1').classList.contains('active') && $('#screen-age1').dataset.mode === 'talk';
    if (document.hidden) {
      speech.cancelSpeech();
      if (inTalk) {
        stopParentLoop();
        state.loopPaused = true;
      }
    } else if (state.loopPaused && inTalk) {
      runParentLoop();
    }
  });
  window.addEventListener('pagehide', () => speech.cancelSpeech());
}

// ---- 1歳：入力 ----
function setBar(ratio) {
  $('#bar-fill').style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}
async function startInput() {
  const s = getSettings();
  const c = state.country;
  state.plan = s.plan;
  stopParentLoop();
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

  const lang = recogLang(state.plan, c);
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
  $('#mic-error-text').textContent = `${MIC_ERRORS[error]}（${error}）`;
  $('#mic-error').hidden = false;
}
// 会話に戻る（両親の声のループを再開）
function backToTalk() {
  $('#btn-mic').disabled = false;
  setMode('talk');
  runParentLoop();
}
function submitText() {
  const t = $('#text-field').value;
  finishInput(t, {
    transcript: t, finals: [], interim: '', usedInterim: false, error: null, durationMs: 0,
    recogLang: recogLang(state.plan, state.country), method: 'text', seconds: recordSeconds(),
  });
}
function finishInput(transcript, raw) {
  const result = judge(transcript, { countryId: state.country.id, plan: state.plan });
  state.input = raw;
  state.result = result;
  showResult(result);
}

// ---- 1歳：結果 ----
function clearReaction() {
  const p = $('#parents');
  p.className = 'parents';
  document.querySelectorAll('.parent .mark').forEach((m) => { m.textContent = ''; });
}
function setReaction(kind) {
  const p = $('#parents');
  p.className = `parents reaction-${kind}`;
  document.querySelectorAll('.parent .mark').forEach((m) => { m.textContent = MARKS[kind]; });
}
function addLine(text, cls) {
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.textContent = text;
  $('#result-lines').appendChild(p);
}
function rawSummary(result, input) {
  const c = state.country;
  const parts = [
    `認識（${input.recogLang}／Plan ${state.plan}／${input.method === 'text' ? 'テキスト' : 'マイク'}）: 「${result.transcript}」`,
    `見つかった語: ${result.found.length ? result.found.map((k) => c.coreLabels[k]).join('、') : 'なし'}`,
    `順番: ${result.found.length === 3 ? (result.inOrder ? '○' : '×') : '—'}　余計な語: ${result.extra ? `あり（${result.rest}）` : 'なし'}`,
    `判定: ${TEXTS.verdictLabels[result.verdict]}　${result.points}点`,
  ];
  if (input.usedInterim) parts.push('※確定前の認識結果を使用');
  if (input.error) parts.push(`※認識エラー: ${input.error}`);
  const alts = (input.finals || []).flatMap((f) => f.alternatives.slice(1).map((a) => a.transcript)).filter(Boolean);
  if (alts.length) parts.push(`他の候補: ${alts.join(' / ')}`);
  return parts.join('\n');
}
async function showResult(result) {
  const c = state.country;
  const t = TEXTS.results[result.verdict];
  const reaction = REACTION_OF[result.verdict];
  setMode('result');
  $('#result-lines').innerHTML = '';

  // 両親の反応（絵と声）
  setReaction(reaction);
  setDialogue(c.reactions[reaction]);
  speech.playReaction(reaction);
  if (canSpeak(c)) speech.speak(c.reactions[reaction], c.lang, { pitch: 1.2, rate: 1 });
  await wait(1400);

  addLine(t.text);
  await wait(1200);
  addLine(`${t.group} ${result.points} point UP`, 'points');
  if (t.invite) {
    await wait(800);
    addLine(TEXTS.invite, 'invite');
  }
  await wait(500);

  if (getSettings().showRaw) $('#raw-info').textContent = rawSummary(result, state.input);
  buildSelfReport(c);
}

// ---- 自己申告と記録 ----
function buildSelfReport(c) {
  const box = $('#self-report-options');
  box.innerHTML = '';
  for (const p of c.phrases) {
    box.insertAdjacentHTML('beforeend', `<label><input type="checkbox" name="said" value="${p.key}"> ${c.coreLabels[p.key]}</label>`);
  }
  box.insertAdjacentHTML('beforeend', '<label><input type="checkbox" name="said" value="none"> 何も言わなかった</label>');
  // 「何も言わなかった」は他と同時に選べない
  const inputs = box.querySelectorAll('input');
  inputs.forEach((cb) => cb.addEventListener('change', () => {
    if (!cb.checked) return;
    if (cb.value === 'none') inputs.forEach((o) => { if (o !== cb) o.checked = false; });
    else box.querySelector('input[value="none"]').checked = false;
  }));
}
function saveRecord() {
  const s = getSettings();
  const c = state.country;
  const r = state.result;
  const i = state.input;
  const b = browserInfo();
  const said = [...document.querySelectorAll('#self-report-options input:checked')].map((x) => x.value);
  addLog({
    time: new Date().toISOString(),
    build: BUILD,
    tester: s.tester,
    country: c.id,
    lang: c.lang,
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
    selfReport: said,
  });
  $('#self-report').hidden = true;
  $('#after-buttons').hidden = false;
  $('#saved-note').textContent = `記録しました（${getLogs().length}件）`;
}

// ---- デバッグ設定 ----
function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
}
function refreshDebug() {
  const s = getSettings();
  $('#dbg-country').value = s.country;
  document.querySelector(`input[name="dbg-plan"][value="${s.plan}"]`).checked = true;
  $('#dbg-tester').value = s.tester;
  $('#dbg-seconds').value = String(s.seconds);
  $('#dbg-showraw').checked = s.showRaw;
  $('#dbg-textinput').checked = s.textInput;
  const v = speech.voiceStatus();
  const b = browserInfo();
  const mark = (ok) => (ok ? '○' : '×');
  $('#dbg-support').textContent =
    `build ${BUILD}｜${b.label}｜音声認識: ${mark(speech.recognitionSupported)}｜読み上げの声 ja:${mark(v.ja)} en:${mark(v.en)} es:${mark(v.es)}`;
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
  document.querySelectorAll('input[name="dbg-plan"]').forEach((r) => {
    r.addEventListener('change', (e) => saveSettings({ plan: e.target.value }));
  });
  $('#dbg-tester').addEventListener('input', (e) => saveSettings({ tester: e.target.value.trim() }));
  $('#dbg-seconds').addEventListener('change', (e) => {
    saveSettings({ seconds: Number(e.target.value) });
    $('#btn-mic').textContent = `▶ まねして言う（${recordSeconds()}秒）`;
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
  $('#btn-birth-next').addEventListener('click', startAge1);
  $('#btn-mic').addEventListener('click', startInput);
  $('#btn-text-judge').addEventListener('click', submitText);
  $('#btn-mic-retry').addEventListener('click', backToTalk);
  $('#text-field').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitText(); });
  $('#btn-save').addEventListener('click', saveRecord);
  $('#btn-again').addEventListener('click', () => { resetEarth(); show('earth'); });
  $('#btn-title').addEventListener('click', () => show('title'));
}
init();
