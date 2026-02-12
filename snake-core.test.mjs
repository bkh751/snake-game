import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  setDirection,
  step,
  randomFreeCell,
  createRng,
  updateByTime,
} from './snake-core.mjs';

test('moves one cell forward per step', () => {
  const state = createInitialState({ width: 10, height: 10, rng: createRng(1) });
  const startHead = { ...state.snake[0] };
  step(state);
  assert.deepEqual(state.snake[0], { x: startHead.x + 1, y: startHead.y });
});

test('cannot reverse directly into opposite direction', () => {
  const state = createInitialState({ width: 10, height: 10, rng: createRng(1) });
  setDirection(state, 'left');
  step(state);
  assert.equal(state.direction, 'right');
});

test('eating food grows snake and increases score', () => {
  const state = createInitialState({ width: 10, height: 10, rng: createRng(2) });
  const head = state.snake[0];
  state.food = { x: head.x + 1, y: head.y };
  const lengthBefore = state.snake.length;

  step(state);

  assert.equal(state.score, 1);
  assert.equal(state.snake.length, lengthBefore + 1);
});

test('wall collision causes game over', () => {
  const state = createInitialState({ width: 4, height: 4, rng: createRng(1) });
  state.snake = [{ x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }];
  state.direction = 'right';
  state.nextDirection = 'right';

  step(state);

  assert.equal(state.gameOver, true);
});

test('self collision causes game over', () => {
  const state = createInitialState({ width: 8, height: 8, rng: createRng(1) });
  state.snake = [
    { x: 4, y: 4 },
    { x: 3, y: 4 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 5, y: 4 },
  ];
  state.direction = 'left';
  state.nextDirection = 'down';

  step(state);

  assert.equal(state.gameOver, true);
});

test('moving into previous tail cell is allowed when not eating', () => {
  const state = createInitialState({ width: 8, height: 8, rng: createRng(1) });
  state.snake = [
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 2, y: 3 },
  ];
  state.direction = 'up';
  state.nextDirection = 'left';
  state.food = { x: 7, y: 7 };

  step(state);

  assert.equal(state.gameOver, false);
  assert.deepEqual(state.snake[0], { x: 2, y: 3 });
});

test('food placement avoids blocked cells', () => {
  const blocked = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];
  const food = randomFreeCell(2, 2, blocked, () => 0);
  assert.deepEqual(food, { x: 1, y: 1 });
});

test('updateByTime steps according to tick interval', () => {
  const state = createInitialState({ width: 10, height: 10, rng: createRng(1) });
  const startX = state.snake[0].x;
  updateByTime(state, state.tickMs * 2 + 5);
  assert.equal(state.snake[0].x, startX + 2);
});
