import {
  createInitialState,
  setDirection,
  updateByTime,
  restartState,
  togglePause,
} from './snake-core.mjs';

const WORLD_SIZE = 9;
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const headDepthEl = document.getElementById('head-depth');
const foodDepthEl = document.getElementById('food-depth');
const depthFillEl = document.getElementById('depth-fill');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');
const touchButtons = document.querySelectorAll('.mobile-controls button[data-dir]');

const state = createInitialState({ width: WORLD_SIZE, height: WORLD_SIZE, depth: WORLD_SIZE });

let hasStarted = false;
let lastTimestamp = performance.now();

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.min(window.innerWidth - 32, 760);
  const height = Math.min(window.innerHeight * 0.68, 560);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${Math.floor(width)}px`;
  canvas.style.height = `${Math.floor(height)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function project(pos) {
  const unit = Math.min(canvas.clientWidth, canvas.clientHeight) / (WORLD_SIZE * 2.2);
  const centerX = canvas.clientWidth * 0.5;
  const baseY = canvas.clientHeight * 0.18;
  return {
    x: centerX + (pos.x - pos.z) * unit,
    y: baseY + (pos.x + pos.z) * unit * 0.56 + pos.y * unit * 0.9,
    unit,
  };
}

function drawCell(pos, fill, stroke = 'rgba(0, 0, 0, 0.28)') {
  const p = project(pos);
  const size = Math.max(6, p.unit * 0.82);
  const depthLift = (WORLD_SIZE - 1 - pos.z) * 0.22;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(p.x - size * 0.5, p.y - size * (0.72 + depthLift * 0.08), size, size);
  ctx.fill();
  ctx.stroke();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight);
  gradient.addColorStop(0, '#dff4ff');
  gradient.addColorStop(1, '#fff7dd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  ctx.fillStyle = 'rgba(40, 82, 122, 0.08)';
  for (let i = 0; i < 12; i += 1) {
    const y = 25 + i * ((canvas.clientHeight - 50) / 12);
    ctx.fillRect(14, y, canvas.clientWidth - 28, 1);
  }
}

function drawWorldGuides() {
  const corners = [
    { x: 0, y: 0, z: 0 },
    { x: WORLD_SIZE - 1, y: 0, z: 0 },
    { x: WORLD_SIZE - 1, y: WORLD_SIZE - 1, z: 0 },
    { x: 0, y: WORLD_SIZE - 1, z: 0 },
    { x: 0, y: 0, z: WORLD_SIZE - 1 },
    { x: WORLD_SIZE - 1, y: 0, z: WORLD_SIZE - 1 },
    { x: WORLD_SIZE - 1, y: WORLD_SIZE - 1, z: WORLD_SIZE - 1 },
    { x: 0, y: WORLD_SIZE - 1, z: WORLD_SIZE - 1 },
  ];

  ctx.strokeStyle = 'rgba(39, 64, 87, 0.32)';
  ctx.lineWidth = 1.2;

  function line(a, b) {
    const pa = project(corners[a]);
    const pb = project(corners[b]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  line(0, 1);
  line(1, 2);
  line(2, 3);
  line(3, 0);
  line(4, 5);
  line(5, 6);
  line(6, 7);
  line(7, 4);
  line(0, 4);
  line(1, 5);
  line(2, 6);
  line(3, 7);
}

function drawReadyOverlay() {
  if (hasStarted || state.gameOver) return;

  const panelWidth = Math.min(canvas.clientWidth * 0.72, 420);
  const panelHeight = 86;
  const x = (canvas.clientWidth - panelWidth) * 0.5;
  const y = canvas.clientHeight * 0.06;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(32, 64, 94, 0.45)';
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  ctx.fillStyle = '#0e2f4f';
  ctx.font = '600 20px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('Ready to Launch', x + panelWidth * 0.5, y + 32);
  ctx.font = '14px Trebuchet MS';
  ctx.fillText('Press any move key (Arrow/WASD/Q/E) to start', x + panelWidth * 0.5, y + 58);
}

function updateDepthHud() {
  const maxDepth = Math.max(1, state.depth - 1);
  const head = state.snake[0];

  if (head) {
    headDepthEl.textContent = `${head.z}/${state.depth - 1}`;
    const ratio = Math.max(0, Math.min(1, head.z / maxDepth));
    depthFillEl.style.width = `${Math.round(ratio * 100)}%`;
  }

  if (state.food) {
    foodDepthEl.textContent = `${state.food.z}/${state.depth - 1}`;
  } else {
    foodDepthEl.textContent = '-';
  }
}

function syncHud() {
  scoreEl.textContent = String(state.score);
  updateDepthHud();

  if (state.gameOver) {
    statusEl.textContent = 'Game Over';
    pauseBtn.textContent = 'Pause';
  } else if (!hasStarted) {
    statusEl.textContent = 'Ready';
    pauseBtn.textContent = 'Pause';
  } else if (state.paused) {
    statusEl.textContent = 'Paused';
    pauseBtn.textContent = 'Resume';
  } else {
    statusEl.textContent = 'Running';
    pauseBtn.textContent = 'Pause';
  }
}

function draw() {
  drawBackground();
  drawWorldGuides();

  const drawable = [];
  for (let i = state.snake.length - 1; i >= 0; i -= 1) {
    const segment = state.snake[i];
    drawable.push({ kind: i === 0 ? 'head' : 'snake', pos: segment });
  }
  if (state.food) {
    drawable.push({ kind: 'food', pos: state.food });
  }

  drawable.sort((a, b) => {
    const da = a.pos.x + a.pos.y + a.pos.z;
    const db = b.pos.x + b.pos.y + b.pos.z;
    return da - db;
  });

  for (const item of drawable) {
    if (item.kind === 'food') {
      drawCell(item.pos, '#ff6b6b', '#972222');
    } else if (item.kind === 'head') {
      drawCell(item.pos, '#22c55e', '#0b5929');
    } else {
      drawCell(item.pos, '#16a34a');
    }
  }

  drawReadyOverlay();
  syncHud();
}

function update(elapsedMs) {
  if (!hasStarted) return;
  updateByTime(state, elapsedMs);
}

function frame(now) {
  const elapsed = now - lastTimestamp;
  lastTimestamp = now;
  update(elapsed);
  draw();
  requestAnimationFrame(frame);
}

function directionForKey(key) {
  if (key === 'ArrowUp' || key === 'w' || key === 'W') return 'up';
  if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
  if (key === 'q' || key === 'Q' || key === 'PageUp') return 'in';
  if (key === 'e' || key === 'E' || key === 'PageDown') return 'out';
  return null;
}

function handleDirectionInput(dir) {
  setDirection(state, dir);
  if (!hasStarted && !state.gameOver) {
    hasStarted = true;
    state.paused = false;
  }
}

async function toggleFullscreenMode() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    // Ignore fullscreen errors caused by platform restrictions.
  }
}

document.addEventListener('keydown', (event) => {
  const dir = directionForKey(event.key);
  if (dir) {
    event.preventDefault();
    handleDirectionInput(dir);
    return;
  }

  if (event.key === 'p' || event.key === 'P') {
    if (hasStarted && !state.gameOver) togglePause(state);
  } else if (event.key === 'r' || event.key === 'R') {
    restartState(state);
    hasStarted = false;
  } else if (event.key === 'f' || event.key === 'F') {
    toggleFullscreenMode();
  }
});

restartBtn.addEventListener('click', () => {
  restartState(state);
  hasStarted = false;
});
pauseBtn.addEventListener('click', () => {
  if (hasStarted && !state.gameOver) togglePause(state);
});

for (const button of touchButtons) {
  button.addEventListener('click', () => {
    const dir = button.getAttribute('data-dir');
    handleDirectionInput(dir);
  });
}

window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});
window.addEventListener('fullscreenchange', () => {
  resizeCanvas();
  draw();
});

window.render_game_to_text = () => {
  return JSON.stringify({
    coordinateSystem: 'origin at top-left-near corner; +x right, +y down, +z deeper into screen',
    mode: state.gameOver ? 'game_over' : !hasStarted ? 'ready' : state.paused ? 'paused' : 'running',
    world: { width: state.width, height: state.height, depth: state.depth },
    snake: state.snake,
    food: state.food,
    score: state.score,
    direction: state.direction,
    nextDirection: state.nextDirection,
    headDepth: state.snake[0]?.z ?? null,
    foodDepth: state.food?.z ?? null,
  });
};

window.advanceTime = (ms) => {
  const fixedStep = 1000 / 60;
  const steps = Math.max(1, Math.round(ms / fixedStep));
  for (let i = 0; i < steps; i += 1) {
    update(fixedStep);
  }
  draw();
};

resizeCanvas();
draw();
requestAnimationFrame(frame);
