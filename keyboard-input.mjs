const DIRECTION_BY_CODE = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyQ: 'in',
  KeyE: 'out',
  PageUp: 'in',
  PageDown: 'out',
};

const DIRECTION_BY_KEY = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  q: 'in',
  e: 'out',
  '\u3142': 'in',
  '\u3137': 'out',
};

const ACTION_BY_CODE = {
  KeyP: 'toggle_pause',
  KeyR: 'restart',
  KeyF: 'toggle_fullscreen',
  KeyV: 'toggle_view',
};

const ACTION_BY_KEY = {
  p: 'toggle_pause',
  r: 'restart',
  f: 'toggle_fullscreen',
  v: 'toggle_view',
  '\u3154': 'toggle_pause',
  '\u3131': 'restart',
  '\u3139': 'toggle_fullscreen',
  '\u314d': 'toggle_view',
};

function normalizeKey(key) {
  if (typeof key !== 'string') return null;
  return key.length === 1 ? key.toLowerCase() : key;
}

export function directionFromKeyboardEvent(eventLike) {
  const code = eventLike?.code;
  if (code && DIRECTION_BY_CODE[code]) return DIRECTION_BY_CODE[code];

  const key = normalizeKey(eventLike?.key);
  if (key && DIRECTION_BY_KEY[key]) return DIRECTION_BY_KEY[key];

  return null;
}

export function actionFromKeyboardEvent(eventLike) {
  const code = eventLike?.code;
  if (code && ACTION_BY_CODE[code]) return ACTION_BY_CODE[code];

  const key = normalizeKey(eventLike?.key);
  if (key && ACTION_BY_KEY[key]) return ACTION_BY_KEY[key];

  return null;
}
