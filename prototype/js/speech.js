// 音声認識（Web Speech API）、読み上げ（speechSynthesis）、効果音（WebAudioで生成）。

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const recognitionSupported = !!SR;
export const synthesisSupported = 'speechSynthesis' in window;

// ---- 音声認識 ----
// 認識が実際に始まってから seconds 秒で止め、確定した結果を返す。
// 返り値: { transcript, usedInterim, finals, interim, error, durationMs }
export function listen({ lang, seconds = 3, onPhase, onTick }) {
  return new Promise((resolve) => {
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    const finals = [];
    let interim = '';
    let error = null;
    let started = false;
    let startedAt = 0;
    let done = false;
    let tick = null;
    let stopGuard = null;
    let startGuard = null;

    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(tick);
      clearTimeout(stopGuard);
      clearTimeout(startGuard);
      // Android Chrome は空の確定結果を混ぜてくるので除く
      const list = finals.filter((f) => f && f.transcript.trim());
      const final = list.map((f) => f.transcript).join(' ').trim();
      const transcript = final || interim.trim();
      resolve({
        transcript,
        usedInterim: !final && !!interim.trim(),
        finals: list,
        interim: interim.trim(),
        error,
        durationMs: startedAt ? Date.now() - startedAt : 0,
      });
    };

    rec.onstart = () => {
      started = true;
      startedAt = Date.now();
      onPhase?.('listening');
      tick = setInterval(() => {
        const remain = Math.max(0, seconds - (Date.now() - startedAt) / 1000);
        onTick?.(remain);
        if (remain <= 0) {
          clearInterval(tick);
          onPhase?.('judging');
          try { rec.stop(); } catch { /* 既に止まっている */ }
          // stop() のあと onend が来ないブラウザ対策
          stopGuard = setTimeout(() => {
            try { rec.abort(); } catch { /* ignore */ }
            finish();
          }, 2500);
        }
      }, 100);
    };

    rec.onresult = (e) => {
      interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finals[i] = {
            transcript: r[0].transcript,
            alternatives: Array.from(r)
              .map((a) => ({ transcript: a.transcript, confidence: a.confidence }))
              .filter((a) => a.transcript.trim()),
          };
        } else {
          interim += r[0].transcript;
        }
      }
    };

    rec.onerror = (e) => {
      error = e.error || 'unknown';
      // 許可なし・マイクなしは即終了。no-speech などは onend を待つ
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(error)) finish();
    };

    rec.onend = () => finish();

    onPhase?.('starting');
    try {
      rec.start();
    } catch (err) {
      error = `start-failed: ${err.message}`;
      finish();
      return;
    }
    // onstart が来ない（許可ダイアログで止まったまま、など）場合の保険
    startGuard = setTimeout(() => {
      if (!started) {
        error = error || 'no-start';
        try { rec.abort(); } catch { /* ignore */ }
        finish();
      }
    }, 8000);
  });
}

// ---- 読み上げ ----
let voices = [];
let currentUtterance = null; // GCで onend が来なくなるのを防ぐ

function loadVoices() {
  if (synthesisSupported) voices = speechSynthesis.getVoices();
}
if (synthesisSupported) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function voiceFor(lang) {
  if (!voices.length) loadVoices();
  const want = lang.toLowerCase();
  const exact = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === want);
  const prefix = voices.filter((v) => v.lang.toLowerCase().startsWith(want.slice(0, 2)));
  const list = exact.length ? exact : prefix;
  return list.find((v) => /google/i.test(v.name)) || list[0] || null;
}

export function voiceStatus() {
  return { ja: !!voiceFor('ja-JP'), en: !!voiceFor('en-US'), es: !!voiceFor('es-ES') };
}

export function speak(text, lang, { rate = 0.9, pitch = 1 } = {}) {
  return new Promise((resolve) => {
    if (!synthesisSupported || !text) {
      setTimeout(resolve, 1200);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = pitch;
    const v = voiceFor(lang);
    if (v) u.voice = v;
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      resolve();
    };
    u.onend = end;
    u.onerror = end;
    const guard = setTimeout(end, 6000);
    currentUtterance = u;
    speechSynthesis.speak(u);
  });
}

export function cancelSpeech() {
  if (synthesisSupported) speechSynthesis.cancel();
}

// 最初のタップで呼ぶ。iPhoneは操作なしに音を出せない
export function unlockAudio() {
  if (synthesisSupported) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }
  getAudioContext()?.resume();
}

// ---- 効果音 ----
let ctx = null;
function getAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

function note(c, freq, start, dur, type = 'square') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

export function playReaction(kind) {
  const c = getAudioContext();
  if (!c) return;
  const t = c.currentTime + 0.02;
  switch (kind) {
    case 'surprised': // 驚きの音（仕様で必須）
      note(c, 880, t, 0.08);
      note(c, 1320, t + 0.09, 0.08);
      note(c, 1760, t + 0.18, 0.2);
      break;
    case 'happy':
      note(c, 660, t, 0.1);
      note(c, 990, t + 0.12, 0.15);
      break;
    case 'puzzled':
      note(c, 330, t, 0.25, 'triangle');
      break;
    case 'creeped':
      note(c, 440, t, 0.12);
      note(c, 220, t + 0.14, 0.3);
      break;
    default:
      break;
  }
}
