import {
  createInitialState,
  setDirection,
  updateByTime,
  restartState,
  togglePause,
} from './snake-core.mjs';

const WORLD_SIZE = 9;
const CAMERA_YAW = -Math.PI / 4;
const CAMERA_PITCH = Math.PI / 6;
const CAMERA_DISTANCE = WORLD_SIZE * 2.9;
const CAMERA_FOCAL = WORLD_SIZE * 2.4;
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

function toViewSpace(pos) {
  const half = (WORLD_SIZE - 1) / 2;
  const x = pos.x - half;
  const y = half - pos.y;
  const z = pos.z - half;

  const yawCos = Math.cos(CAMERA_YAW);
  const yawSin = Math.sin(CAMERA_YAW);
  const pitchCos = Math.cos(CAMERA_PITCH);
  const pitchSin = Math.sin(CAMERA_PITCH);

  const x1 = x * yawCos - z * yawSin;
  const z1 = x * yawSin + z * yawCos;
  const y2 = y * pitchCos - z1 * pitchSin;
  const z2 = y * pitchSin + z1 * pitchCos;

  return { x: x1, y: y2, z: z2 };
}

function project(pos) {
  const unit = Math.min(canvas.clientWidth, canvas.clientHeight) / 13;
  const centerX = canvas.clientWidth * 0.5;
  const centerY = canvas.clientHeight * 0.56;
  const view = toViewSpace(pos);
  const depth = CAMERA_DISTANCE - view.z;
  const safeDepth = Math.max(0.6, depth);
  const scale = CAMERA_FOCAL / safeDepth;

  return {
    x: centerX + view.x * unit * scale,
    y: centerY - view.y * unit * scale,
    unit,
    scale,
    depth: safeDepth,
    viewZ: view.z,
  };
}

function drawCell(projected, fill, stroke = 'rgba(0, 0, 0, 0.3)') {
  const size = Math.max(4.6, projected.unit * 0.62 * projected.scale);
  const shadowAlpha = Math.max(0.06, Math.min(0.2, projected.scale * 0.2));

  ctx.fillStyle = `rgba(18, 33, 46, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(
    projected.x,
    projected.y + size * 0.25,
    size * 0.48,
    size * 0.22,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(projected.x - size * 0.5, projected.y - size * 0.82, size, size);
  ctx.fill();
  ctx.stroke();
}

function drawGroundShadow(pos, kind) {
  const floorPos = { x: pos.x, y: WORLD_SIZE - 1, z: pos.z };
  const ground = project(floorPos);
  const altitude = WORLD_SIZE - 1 - pos.y;
  const spread = 1 + altitude * 0.13;
  const baseSize = Math.max(6, ground.unit * 0.36 * ground.scale * spread);

  let alpha = 0.22 - altitude * 0.022;
  if (kind === 'food') alpha *= 0.8;
  if (kind === 'head') alpha *= 1.15;
  alpha = Math.max(0.03, Math.min(0.28, alpha));

  ctx.fillStyle = `rgba(17, 32, 44, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(
    ground.x,
    ground.y + baseSize * 0.08,
    baseSize * 0.68,
    baseSize * 0.27,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawTargetGuide(headPos, foodPos) {
  if (!headPos || !foodPos) return;

  const head = project(headPos);
  const food = project(foodPos);
  const foodFloor = project({ x: foodPos.x, y: WORLD_SIZE - 1, z: foodPos.z });
  const beamWidth = Math.max(1.2, 2.1 * Math.min(head.scale, food.scale));

  ctx.save();

  ctx.strokeStyle = 'rgba(88, 255, 142, 0.75)';
  ctx.lineWidth = beamWidth;
  ctx.shadowColor = 'rgba(67, 232, 123, 0.65)';
  ctx.shadowBlur = 8;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(head.x, head.y - 3);
  ctx.lineTo(food.x, food.y - 3);
  ctx.stroke();

  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = 'rgba(67, 232, 123, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(food.x, food.y);
  ctx.lineTo(foodFloor.x, foodFloor.y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(94, 255, 156, 0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(food.x, food.y - 2, Math.max(5.5, beamWidth * 2.6), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(foodFloor.x, foodFloor.y, Math.max(4, beamWidth * 1.9), 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
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

  const projected = corners.map((corner) => project(corner));
  const faces = [
    { ids: [0, 1, 2, 3], fill: 'rgba(138, 178, 206, 0.08)' },
    { ids: [4, 5, 6, 7], fill: 'rgba(73, 120, 154, 0.12)' },
    { ids: [0, 3, 7, 4], fill: 'rgba(90, 146, 178, 0.08)' },
    { ids: [1, 2, 6, 5], fill: 'rgba(74, 131, 167, 0.11)' },
    { ids: [0, 1, 5, 4], fill: 'rgba(170, 206, 227, 0.09)' },
    { ids: [3, 2, 6, 7], fill: 'rgba(73, 109, 138, 0.08)' },
  ];

  faces.sort((a, b) => {
    const az = a.ids.reduce((sum, id) => sum + projected[id].viewZ, 0) / a.ids.length;
    const bz = b.ids.reduce((sum, id) => sum + projected[id].viewZ, 0) / b.ids.length;
    return az - bz;
  });

  for (const face of faces) {
    const p0 = projected[face.ids[0]];
    ctx.fillStyle = face.fill;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < face.ids.length; i += 1) {
      const p = projected[face.ids[i]];
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(42, 68, 91, 0.45)';
  ctx.lineWidth = 1.35;
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  for (const [a, b] of edges) {
    const pa = projected[a];
    const pb = projected[b];
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
}

function drawReadyOverlay() {
  if (hasStarted || state.gameOver) return;

  const panelWidth = Math.min(canvas.clientWidth * 0.8, 470);
  const panelHeight = 102;
  const x = (canvas.clientWidth - panelWidth) * 0.5;
  const y = canvas.clientHeight * 0.06;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(32, 64, 94, 0.45)';
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  ctx.fillStyle = '#0e2f4f';
  ctx.font = '600 20px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('시작 준비 완료', x + panelWidth * 0.5, y + 34);
  ctx.font = '14px Trebuchet MS';
  ctx.fillText('방향키/WASD/Q/E 중 하나를 누르면 시작됩니다', x + panelWidth * 0.5, y + 62);
  ctx.fillText('공간 크기: 9 x 9 x 9', x + panelWidth * 0.5, y + 84);
}

function drawGameOverOverlay() {
  if (!state.gameOver) return;

  const panelWidth = Math.min(canvas.clientWidth * 0.65, 400);
  const panelHeight = 88;
  const x = (canvas.clientWidth - panelWidth) * 0.5;
  const y = canvas.clientHeight * 0.72;

  ctx.fillStyle = 'rgba(255, 247, 247, 0.9)';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(130, 42, 42, 0.45)';
  ctx.strokeRect(x, y, panelWidth, panelHeight);

  ctx.fillStyle = '#6f1d1d';
  ctx.textAlign = 'center';
  ctx.font = '700 18px Trebuchet MS';
  ctx.fillText('게임 오버', x + panelWidth * 0.5, y + 30);
  ctx.font = '14px Trebuchet MS';
  ctx.fillText('R 키 또는 재시작 버튼으로 다시 시작하세요', x + panelWidth * 0.5, y + 56);
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
    statusEl.textContent = '게임 오버';
    pauseBtn.textContent = '일시정지';
  } else if (!hasStarted) {
    statusEl.textContent = '대기 중';
    pauseBtn.textContent = '일시정지';
  } else if (state.paused) {
    statusEl.textContent = '일시정지';
    pauseBtn.textContent = '재개';
  } else {
    statusEl.textContent = '진행 중';
    pauseBtn.textContent = '일시정지';
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

  const drawableProjected = drawable
    .map((item) => ({ ...item, projected: project(item.pos) }))
    .sort((a, b) => b.projected.depth - a.projected.depth);

  for (const item of drawableProjected) {
    drawGroundShadow(item.pos, item.kind);
  }

  for (const item of drawableProjected) {
    const depthTone = item.pos.z / Math.max(1, WORLD_SIZE - 1);
    if (item.kind === 'food') {
      drawCell(item.projected, '#ff6b6b', '#972222');
    } else if (item.kind === 'head') {
      const g = Math.round(205 - depthTone * 55);
      drawCell(item.projected, `rgb(42, ${g}, 103)`, '#0b5929');
    } else {
      const g = Math.round(178 - depthTone * 52);
      drawCell(item.projected, `rgb(22, ${g}, 74)`);
    }
  }

  drawTargetGuide(state.snake[0], state.food);
  drawReadyOverlay();
  drawGameOverOverlay();
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
