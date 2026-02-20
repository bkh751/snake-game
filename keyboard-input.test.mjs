import test from 'node:test';
import assert from 'node:assert/strict';
import { directionFromKeyboardEvent, actionFromKeyboardEvent } from './keyboard-input.mjs';

test('keyboard_direction__code_keyq__maps_in', () => {
  const dir = directionFromKeyboardEvent({ key: 'q', code: 'KeyQ' });
  assert.equal(dir, 'in');
});

test('keyboard_direction__unknown_key__returns_null', () => {
  const dir = directionFromKeyboardEvent({ key: 'x', code: 'KeyX' });
  assert.equal(dir, null);
});

test('keyboard_direction__korean_layout_key_with_code__maps_correctly', () => {
  assert.equal(directionFromKeyboardEvent({ key: 'ㅂ', code: 'KeyQ' }), 'in');
  assert.equal(directionFromKeyboardEvent({ key: 'ㄷ', code: 'KeyE' }), 'out');
});

test('keyboard_action__code_keyr__maps_restart', () => {
  const action = actionFromKeyboardEvent({ key: 'ㄱ', code: 'KeyR' });
  assert.equal(action, 'restart');
});

test('keyboard_action__unknown__returns_null', () => {
  const action = actionFromKeyboardEvent({ key: 'x', code: 'KeyX' });
  assert.equal(action, null);
});
