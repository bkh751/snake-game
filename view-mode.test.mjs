import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeViewMode, toggleViewMode, labelForViewMode } from './view-mode.mjs';

test('view_mode__set_first_person__kept', () => {
  assert.equal(normalizeViewMode('first_person', 'third_person'), 'first_person');
});

test('view_mode__invalid_requested__fallback_used', () => {
  assert.equal(normalizeViewMode('invalid', 'third_person'), 'third_person');
});

test('view_mode__toggle_roundtrip__returns_original', () => {
  const first = toggleViewMode('third_person');
  const second = toggleViewMode(first);
  assert.equal(second, 'third_person');
});

test('view_mode__labels__korean', () => {
  assert.equal(labelForViewMode('third_person'), '3인칭');
  assert.equal(labelForViewMode('first_person'), '1인칭');
});
