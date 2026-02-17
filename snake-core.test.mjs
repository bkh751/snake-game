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

test('moves one cell forward per step on x axis', () => {
  const state = createInitialState({ width: 10, height: 10, depth: 10, rng: createRng(1) });
  const startHead = { ...state.snake[0] };
  step(state);
  assert.deepEqual(state.snake[0], { x: startHead.x + 1, y: startHead.y, z: startHead.z });
});

test('moves one cell on z axis', () => {
  const state = createInitialState({ width: 10, height: 10, depth: 10, rng: createRng(1) });
  const startHead = { ...state.snake[0] };
  setDirection(state, 'in');
  step(state);
  assert.deepEqual(state.snake[0], { x: startHead.x, y: startHead.y, z: startHead.z + 1 });
});

test('cannot reverse directly into opposite z direction', () => {
  const state = createInitialState({ width: 10, height: 10, depth: 10, rng: createRng(1) });
  setDirection(state, 'in');
  step(state);
  setDirection(state, 'out');
  assert.equal(state.nextDirection, 'in');
});

test('eating food grows snake and increases score', () => {
  const state = createInitialState({ width: 10, height: 10, depth: 10, rng: createRng(2) });
  const head = state.snake[0];
  state.food = { x: head.x + 1, y: head.y, z: head.z };
  const lengthBefore = state.snake.length;

  step(state);

  assert.equal(state.score, 1);
  assert.equal(state.snake.length, lengthBefore + 1);
});

test('wall collision causes game over in z', () => {
  const state = createInitialState({ width: 4, height: 4, depth: 4, rng: createRng(1) });
  state.snake = [{ x: 2, y: 1, z: 3 }, { x: 2, y: 1, z: 2 }, { x: 2, y: 1, z: 1 }];
  state.direction = 'in';
  state.nextDirection = 'in';

  step(state);

  assert.equal(state.gameOver, true);
});

test('self collision causes game over in 3d body', () => {
  const state = createInitialState({ width: 8, height: 8, depth: 8, rng: createRng(1) });
  state.snake = [
    { x: 4, y: 4, z: 4 },
    { x: 3, y: 4, z: 4 },
    { x: 3, y: 5, z: 4 },
    { x: 4, y: 5, z: 4 },
    { x: 5, y: 5, z: 4 },
    { x: 5, y: 4, z: 4 },
  ];
  state.direction = 'left';
  state.nextDirection = 'down';

  step(state);

  assert.equal(state.gameOver, true);
});

test('food placement avoids blocked cells in 3d', () => {
  const blocked = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 1, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: 1, z: 1 },
  ];
  const food = randomFreeCell(2, 2, 2, blocked, () => 0);
  assert.deepEqual(food, { x: 1, y: 1, z: 1 });
});

test('updateByTime steps according to tick interval', () => {
  const state = createInitialState({ width: 10, height: 10, depth: 10, rng: createRng(1) });
  const startX = state.snake[0].x;
  updateByTime(state, state.tickMs * 2 + 5);
  assert.equal(state.snake[0].x, startX + 2);
});
