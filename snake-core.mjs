const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function createRng(seed = 1) {
  let value = seed >>> 0;
  return function rng() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

export function nextHead(head, direction) {
  const delta = DIRECTIONS[direction];
  return { x: head.x + delta.x, y: head.y + delta.y };
}

export function isOutOfBounds(pos, width, height) {
  return pos.x < 0 || pos.y < 0 || pos.x >= width || pos.y >= height;
}

export function selfCollision(snake, head) {
  return snake.some((segment) => segment.x === head.x && segment.y === head.y);
}

export function randomFreeCell(width, height, blocked, rng = Math.random) {
  const blockedSet = new Set(blocked.map((p) => `${p.x},${p.y}`));
  const freeCells = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`;
      if (!blockedSet.has(key)) freeCells.push({ x, y });
    }
  }

  if (freeCells.length === 0) return null;
  const idx = Math.floor(rng() * freeCells.length);
  return freeCells[idx];
}

export function createInitialState({ width = 16, height = 16, rng = Math.random } = {}) {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  const snake = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];

  return {
    width,
    height,
    snake,
    direction: 'right',
    nextDirection: 'right',
    food: randomFreeCell(width, height, snake, rng),
    score: 0,
    gameOver: false,
    paused: false,
    tickMs: 140,
    accumulatorMs: 0,
    rng,
  };
}

export function setDirection(state, requested) {
  if (!DIRECTIONS[requested]) return;
  if (OPPOSITES[state.direction] === requested) return;
  state.nextDirection = requested;
}

export function step(state) {
  if (state.gameOver || state.paused) return state;

  state.direction = state.nextDirection;
  const proposedHead = nextHead(state.snake[0], state.direction);
  const ateFood = state.food && proposedHead.x === state.food.x && proposedHead.y === state.food.y;
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);

  if (isOutOfBounds(proposedHead, state.width, state.height) || selfCollision(collisionBody, proposedHead)) {
    state.gameOver = true;
    return state;
  }

  state.snake.unshift(proposedHead);

  if (ateFood) {
    state.score += 1;
    state.food = randomFreeCell(state.width, state.height, state.snake, state.rng);
  } else {
    state.snake.pop();
  }

  return state;
}

export function updateByTime(state, elapsedMs) {
  state.accumulatorMs += elapsedMs;
  while (!state.gameOver && state.accumulatorMs >= state.tickMs) {
    state.accumulatorMs -= state.tickMs;
    step(state);
  }
  return state;
}

export function restartState(state) {
  const restarted = createInitialState({ width: state.width, height: state.height, rng: state.rng });
  state.snake = restarted.snake;
  state.direction = restarted.direction;
  state.nextDirection = restarted.nextDirection;
  state.food = restarted.food;
  state.score = 0;
  state.gameOver = false;
  state.paused = false;
  state.accumulatorMs = 0;
  return state;
}

export function togglePause(state) {
  if (!state.gameOver) state.paused = !state.paused;
  return state;
}
