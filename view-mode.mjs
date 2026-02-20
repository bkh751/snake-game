const VIEW_MODE_SET = new Set(['third_person', 'first_person']);

export function normalizeViewMode(requested, fallback = 'third_person') {
  if (VIEW_MODE_SET.has(requested)) return requested;
  if (VIEW_MODE_SET.has(fallback)) return fallback;
  return 'third_person';
}

export function toggleViewMode(current) {
  return current === 'first_person' ? 'third_person' : 'first_person';
}

export function labelForViewMode(mode) {
  return mode === 'first_person' ? '1인칭' : '3인칭';
}
