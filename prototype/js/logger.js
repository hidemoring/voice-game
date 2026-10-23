// 記録（localStorage）、設定、書き出し、ブラウザ名。

const LOG_KEY = 'voiceGame.logs';
const SETTINGS_KEY = 'voiceGame.settings';
const UNLOCK_KEY = 'voiceGame.unlocked';
const DEFAULT_SETTINGS = { country: 'random', plan: 'A', tester: '', seconds: 6, showRaw: true, textInput: false };

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* プライベートモードなどで保存できない */
  }
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) };
}
export function saveSettings(patch) {
  const s = { ...getSettings(), ...patch };
  write(SETTINGS_KEY, s);
  return s;
}

// 合言葉を入れた端末を記憶する。合言葉を変えたら記憶も無効になる
export function isUnlockedWith(passphrase) {
  return read(UNLOCK_KEY, '') === passphrase;
}
export function saveUnlock(passphrase) {
  write(UNLOCK_KEY, passphrase);
}

export function getLogs() {
  return read(LOG_KEY, []);
}
export function addLog(entry) {
  const logs = getLogs();
  logs.push(entry);
  write(LOG_KEY, logs);
  return logs.length;
}
export function clearLogs() {
  write(LOG_KEY, []);
}

export const TSV_COLUMNS = [
  'time', 'build', 'tester', 'country', 'lang', 'plan', 'recogLang', 'method', 'seconds', 'browser',
  'transcript', 'alternatives', 'interim', 'found', 'inOrder', 'extra', 'rest', 'verdict', 'points',
  'selfReport', 'usedInterim', 'error', 'durationMs', 'ua',
];

export function toTSV(logs) {
  const esc = (v) => String(v ?? '').replace(/[\t\r\n]/g, ' ');
  const rows = logs.map((l) => TSV_COLUMNS.map((c) => esc(Array.isArray(l[c]) ? l[c].join('|') : l[c])).join('\t'));
  return [TSV_COLUMNS.join('\t'), ...rows].join('\n');
}

export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function browserInfo() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Mac/.test(ua) ? 'macOS'
    : 'other';
  let browser = 'other';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/CriOS/.test(ua)) browser = 'Chrome(iOS)';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  // iOS で "Safari/" がない＝アプリ内ブラウザ（WebView）かホーム画面から開いた状態。
  // 10/23 の iPhone 記録が「iOS/other」で、音声認識が空や「いいよ」しか返らなかった
  else if (os === 'iOS' && /AppleWebKit/.test(ua)) browser = navigator.standalone ? 'ホーム画面' : 'アプリ内ブラウザ';
  const inApp = browser === 'アプリ内ブラウザ' || browser === 'ホーム画面';
  return { os, browser, label: `${os}/${browser}`, ua, inApp };
}
