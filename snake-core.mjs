const DIRECTIONS = {
  up: { x: 0, y: -1, z: 0 },
  down: { x: 0, y: 1, z: 0 },
  left: { x: -1, y: 0, z: 0 },
  right: { x: 1, y: 0, z: 0 },
  in: { x: 0, y: 0, z: 1 },
  out: { x: 0, y: 0, z: -1 },
};

const OPPOSITES = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  in: 'out',
  out: 'in',
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
  return { x: head.x + delta.x, y: head.y + delta.y, z: head.z + delta.z };
}

export function isOutOfBounds(pos, width, height, depth) {
  return pos.x < 0 || pos.y < 0 || pos.z < 0 || pos.x >= width || pos.y >= height || pos.z >= depth;
}

export function selfCollision(snake, head) {
  return snake.some((segment) => segment.x === head.x && segment.y === head.y && segment.z === head.z);
}

export function randomFreeCell(width, height, depth, blocked, rng = Math.random) {
  const blockedSet = new Set(blocked.map((p) => `${p.x},${p.y},${p.z}`));
  const freeCells = [];

  for (let z = 0; z < depth; z += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const key = `${x},${y},${z}`;
        if (!blockedSet.has(key)) freeCells.push({ x, y, z });
      }
    }
  }

  if (freeCells.length === 0) return null;
  const idx = Math.floor(rng() * freeCells.length);
  return freeCells[idx];
}

export function createInitialState({ width = 9, height = 9, depth = 9, rng = Math.random } = {}) {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  const midZ = Math.floor(depth / 2);
  const snake = [
    { x: midX, y: midY, z: midZ },
    { x: midX - 1, y: midY, z: midZ },
    { x: midX - 2, y: midY, z: midZ },
  ];

  return {
    width,
    height,
    depth,
    snake,
    direction: 'right',
    nextDirection: 'right',
    food: randomFreeCell(width, height, depth, snake, rng),
    score: 0,
    gameOver: false,
    paused: false,
    tickMs: 170,
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
  const ateFood =
    state.food && proposedHead.x === state.food.x && proposedHead.y === state.food.y && proposedHead.z === state.food.z;
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);

  if (isOutOfBounds(proposedHead, state.width, state.height, state.depth) || selfCollision(collisionBody, proposedHead)) {
    state.gameOver = true;
    return state;
  }

  state.snake.unshift(proposedHead);

  if (ateFood) {
    state.score += 1;
    state.food = randomFreeCell(state.width, state.height, state.depth, state.snake, state.rng);
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
  const restarted = createInitialState({
    width: state.width,
    height: state.height,
    depth: state.depth,
    rng: state.rng,
  });

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
