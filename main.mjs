import {
  createInitialState,
  setDirection,
  updateByTime,
  restartState,
  togglePause,
} from './snake-core.mjs';

const BOARD_SIZE = 16;
const gridEl = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');
const touchButtons = document.querySelectorAll('.mobile-controls button[data-dir]');

const state = createInitialState({ width: BOARD_SIZE, height: BOARD_SIZE });

let lastTimestamp = performance.now();

const cells = [];
for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i += 1) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  gridEl.appendChild(cell);
  cells.push(cell);
}

function idx(x, y) {
  return y * BOARD_SIZE + x;
}

function directionForKey(key) {
  if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up';
  if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
  return null;
}

function draw() {
  for (const cell of cells) {
    cell.className = 'cell';
  }

  for (const segment of state.snake) {
    const i = idx(segment.x, segment.y);
    if (cells[i]) cells[i].classList.add('snake');
  }

  if (state.food) {
    const foodCell = cells[idx(state.food.x, state.food.y)];
    if (foodCell) foodCell.classList.add('food');
  }

  scoreEl.textContent = String(state.score);

  if (state.gameOver) {
    statusEl.textContent = 'Game Over';
    pauseBtn.textContent = 'Pause';
  } else if (state.paused) {
    statusEl.textContent = 'Paused';
    pauseBtn.textContent = 'Resume';
  } else {
    statusEl.textContent = 'Running';
    pauseBtn.textContent = 'Pause';
  }
}

function update(elapsedMs) {
  updateByTime(state, elapsedMs);
}

function frame(now) {
  const elapsed = now - lastTimestamp;
  lastTimestamp = now;
  update(elapsed);
  draw();
  requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  const dir = directionForKey(event.key);
  if (dir) {
    setDirection(state, dir);
    return;
  }

  if (event.key === 'p' || event.key === 'P') {
    togglePause(state);
  } else if (event.key === 'r' || event.key === 'R') {
    restartState(state);
  }
});

restartBtn.addEventListener('click', () => restartState(state));
pauseBtn.addEventListener('click', () => togglePause(state));

for (const button of touchButtons) {
  button.addEventListener('click', () => {
    const dir = button.getAttribute('data-dir');
    setDirection(state, dir);
  });
}

window.render_game_to_text = () => {
  return JSON.stringify({
    coordinateSystem: 'origin top-left; +x right; +y down',
    mode: state.gameOver ? 'game_over' : state.paused ? 'paused' : 'running',
    width: state.width,
    height: state.height,
    snake: state.snake,
    food: state.food,
    score: state.score,
    direction: state.direction,
    nextDirection: state.nextDirection,
  });
};

window.advanceTime = (ms) => {
  update(ms);
  draw();
};

draw();
requestAnimationFrame(frame);
