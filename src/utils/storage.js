const PLAYER_NAME_KEY = 'koaplay_player_name';
const HOST_TOKENS_KEY = 'koaplay_host_tokens';

export function getSavedPlayerName() {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

export function savePlayerName(name) {
  if (name?.trim()) {
    localStorage.setItem(PLAYER_NAME_KEY, name.trim());
  }
}

export function getHostTokens() {
  try {
    return JSON.parse(localStorage.getItem(HOST_TOKENS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getHostTokenForCode(code) {
  const tokens = getHostTokens();
  return tokens[code?.toUpperCase()] || '';
}

export function saveHostToken(code, token) {
  if (!code || !token) return;
  const tokens = getHostTokens();
  tokens[code.toUpperCase()] = token;
  localStorage.setItem(HOST_TOKENS_KEY, JSON.stringify(tokens));
}

export function formatDateTimeID(isoString) {
  if (!isoString) return 'Belum ditentukan';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDateID(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toLocalDateTimeInput(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getNowLocalDateTimeInput() {
  return toLocalDateTimeInput(new Date().toISOString());
}
