import {
  createInitialState,
  setDirection,
  updateByTime,
  restartState,
  togglePause,
} from './snake-core.mjs';
import { directionFromKeyboardEvent, actionFromKeyboardEvent } from './keyboard-input.mjs';
import {
  normalizeViewMode,
  toggleViewMode as nextViewMode,
  oppositeViewMode,
  labelForViewMode,
} from './view-mode.mjs';

const WORLD_SIZE = 9;
const CAMERA_YAW = -Math.PI / 4;
const CAMERA_PITCH = Math.PI / 6;
const CAMERA_DISTANCE = WORLD_SIZE * 2.9;
const CAMERA_FOCAL = WORLD_SIZE * 2.4;
const INSET_MARGIN = 14;
const INSET_LABEL_HEIGHT = 18;
const INSET_MIN_WIDTH = 180;
const INSET_MAX_WIDTH = 260;
const INSET_ASPECT = 1.45;
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const viewModeEl = document.getElementById('view-mode');
const headDepthEl = document.getElementById('head-depth');
const foodDepthEl = document.getElementById('food-depth');
const depthFillEl = document.getElementById('depth-fill');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');
const viewThirdBtn = document.getElementById('view-third-btn');
const viewFirstBtn = document.getElementById('view-first-btn');
const touchButtons = document.querySelectorAll('.mobile-controls button[data-dir]');

const state = createInitialState({ width: WORLD_SIZE, height: WORLD_SIZE, depth: WORLD_SIZE });

let hasStarted = false;
let lastTimestamp = performance.now();
let viewMode = normalizeViewMode('third_person');

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

function makeMainViewport() {
  return { x: 0, y: 0, width: canvas.clientWidth, height: canvas.clientHeight };
}

function makeInsetViewport(mainViewport) {
  const width = Math.max(
    INSET_MIN_WIDTH,
    Math.min(INSET_MAX_WIDTH, Math.round(mainViewport.width * 0.32))
  );
  const height = Math.max(124, Math.round(width / INSET_ASPECT));
  return {
    x: mainViewport.width - width - INSET_MARGIN,
    y: mainViewport.height - height - INSET_MARGIN,
    width,
    height,
  };
}

function withViewport(viewport, drawer) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.clip();
  ctx.translate(viewport.x, viewport.y);
  drawer();
  ctx.restore();
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

function project(pos, viewport) {
  const unit = Math.min(viewport.width, viewport.height) / 13;
  const centerX = viewport.width * 0.5;
  const centerY = viewport.height * 0.56;
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

function drawGroundShadow(pos, kind, viewport) {
  const floorPos = { x: pos.x, y: WORLD_SIZE - 1, z: pos.z };
  const ground = project(floorPos, viewport);
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

function drawTargetGuide(headPos, foodPos, viewport) {
  if (!headPos || !foodPos) return;

  const head = project(headPos, viewport);
  const food = project(foodPos, viewport);
  const foodFloor = project({ x: foodPos.x, y: WORLD_SIZE - 1, z: foodPos.z }, viewport);
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

function normalize3(v) {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length <= 1e-6) return { x: 0, y: 0, z: 0 };
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function toMathVec(pos) {
  return { x: pos.x, y: -pos.y, z: pos.z };
}

function getForwardVector(direction) {
  if (direction === 'right') return { x: 1, y: 0, z: 0 };
  if (direction === 'left') return { x: -1, y: 0, z: 0 };
  if (direction === 'up') return { x: 0, y: 1, z: 0 };
  if (direction === 'down') return { x: 0, y: -1, z: 0 };
  if (direction === 'in') return { x: 0, y: 0, z: 1 };
  return { x: 0, y: 0, z: -1 };
}

function toFirstPersonSpace(originPos, targetPos, direction) {
  const origin = toMathVec(originPos);
  const target = toMathVec(targetPos);
  const rel = { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z };

  const forward = getForwardVector(direction);
  let upRef = { x: 0, y: 1, z: 0 };
  if (Math.abs(dot3(forward, upRef)) > 0.98) upRef = { x: 0, y: 0, z: 1 };

  const right = normalize3(cross3(forward, upRef));
  const up = normalize3(cross3(right, forward));

  return {
    x: dot3(rel, right),
    y: dot3(rel, up),
    z: dot3(rel, forward),
  };
}

function projectFirstPerson(camVec, centerX, centerY, focal) {
  if (camVec.z <= 0) return null;
  const invDepth = 1 / (camVec.z + 0.9);
  return {
    x: centerX + camVec.x * focal * invDepth,
    y: centerY - camVec.y * focal * invDepth,
    depth: camVec.z,
    scale: invDepth,
  };
}

function drawFirstPersonScene(viewport, options = {}) {
  const width = viewport.width;
  const height = viewport.height;
  const isInset = options.isInset === true;
  const centerX = width * 0.5;
  const horizonY = height * 0.5;
  const focal = Math.min(width, height) * (isInset ? 0.68 : 0.78);
  const head = state.snake[0];

  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, '#d5efff');
  sky.addColorStop(1, '#c4e4f8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizonY);

  const floor = ctx.createLinearGradient(0, horizonY, 0, height);
  floor.addColorStop(0, '#eef6dc');
  floor.addColorStop(1, '#d8c89e');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  ctx.strokeStyle = 'rgba(63, 92, 112, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(width, horizonY);
  ctx.stroke();

  for (let i = 1; i <= 6; i += 1) {
    const depth = i * 1.8;
    const p = projectFirstPerson({ x: 0, y: 0, z: depth }, centerX, horizonY, focal);
    const corridorHalf = Math.min(width * 0.42, 410 / (depth * 0.32 + 0.9));
    const baseY = p ? p.y + 48 / (depth * 0.5 + 1) : horizonY;

    ctx.strokeStyle = 'rgba(56, 88, 101, 0.25)';
    ctx.beginPath();
    ctx.moveTo(centerX - corridorHalf, baseY);
    ctx.lineTo(centerX + corridorHalf, baseY);
    ctx.stroke();
  }

  const guideDepth = 9;
  const leftFar = projectFirstPerson({ x: -3, y: -1, z: guideDepth }, centerX, horizonY, focal);
  const rightFar = projectFirstPerson({ x: 3, y: -1, z: guideDepth }, centerX, horizonY, focal);
  const leftNear = projectFirstPerson({ x: -1.4, y: -1, z: 0.8 }, centerX, horizonY, focal);
  const rightNear = projectFirstPerson({ x: 1.4, y: -1, z: 0.8 }, centerX, horizonY, focal);
  if (leftFar && rightFar && leftNear && rightNear) {
    ctx.strokeStyle = 'rgba(48, 77, 88, 0.38)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(leftNear.x, leftNear.y + 80);
    ctx.lineTo(leftFar.x, leftFar.y + 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rightNear.x, rightNear.y + 80);
    ctx.lineTo(rightFar.x, rightFar.y + 40);
    ctx.stroke();
  }

  const food = state.food;
  if (head && food) {
    const foodCam = toFirstPersonSpace(head, food, state.direction);
    const foodScreen = projectFirstPerson(foodCam, centerX, horizonY + 26, focal);
    if (foodScreen) {
      const markerSize = Math.max(isInset ? 7 : 10, Math.min(44, 80 * foodScreen.scale + 8));
      ctx.strokeStyle = 'rgba(88, 255, 142, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, horizonY + 44);
      ctx.lineTo(foodScreen.x, foodScreen.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.shadowColor = 'rgba(67, 232, 123, 0.65)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255, 106, 106, 0.92)';
      ctx.fillRect(foodScreen.x - markerSize * 0.5, foodScreen.y - markerSize * 0.5, markerSize, markerSize);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(94, 255, 156, 0.95)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(foodScreen.x, foodScreen.y, markerSize * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      if (!isInset) {
        ctx.fillStyle = 'rgba(94, 255, 156, 0.9)';
        ctx.font = '600 13px Trebuchet MS';
        ctx.textAlign = 'center';
        ctx.fillText('타겟이 시야 뒤쪽에 있습니다', centerX, horizonY + 86);
      }
    }
  }

  if (head) {
    const body = state.snake.slice(1, 6);
    for (const segment of body) {
      const segCam = toFirstPersonSpace(head, segment, state.direction);
      const segScreen = projectFirstPerson(segCam, centerX, horizonY + 24, focal);
      if (!segScreen) continue;
      const size = Math.max(7, Math.min(30, 68 * segScreen.scale + 6));
      ctx.fillStyle = 'rgba(31, 171, 92, 0.72)';
      ctx.fillRect(segScreen.x - size * 0.5, segScreen.y - size * 0.5, size, size);
    }
  }

  ctx.strokeStyle = 'rgba(31, 69, 88, 0.8)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(centerX - 12, horizonY + 44);
  ctx.lineTo(centerX + 12, horizonY + 44);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX, horizonY + 32);
  ctx.lineTo(centerX, horizonY + 56);
  ctx.stroke();
}

function drawBackground(viewport) {
  const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
  gradient.addColorStop(0, '#dff4ff');
  gradient.addColorStop(1, '#fff7dd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.fillStyle = 'rgba(40, 82, 122, 0.08)';
  for (let i = 0; i < 12; i += 1) {
    const y = 25 + i * ((viewport.height - 50) / 12);
    ctx.fillRect(14, y, viewport.width - 28, 1);
  }
}

function drawWorldGuides(viewport) {
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

  const projected = corners.map((corner) => project(corner, viewport));
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

function drawReadyOverlay(viewport) {
  if (hasStarted || state.gameOver) return;

  const panelWidth = Math.min(viewport.width * 0.8, 470);
  const panelHeight = 102;
  const x = (viewport.width - panelWidth) * 0.5;
  const y = viewport.height * 0.06;

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

function drawGameOverOverlay(viewport) {
  if (!state.gameOver) return;

  const panelWidth = Math.min(viewport.width * 0.65, 400);
  const panelHeight = 88;
  const x = (viewport.width - panelWidth) * 0.5;
  const y = viewport.height * 0.72;

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
  viewModeEl.textContent = labelForViewMode(viewMode);
  viewThirdBtn.classList.toggle('view-active', viewMode === 'third_person');
  viewFirstBtn.classList.toggle('view-active', viewMode === 'first_person');

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

function drawThirdPersonScene(viewport, options = {}) {
  drawBackground(viewport);
  drawWorldGuides(viewport);

  const drawable = [];
  for (let i = state.snake.length - 1; i >= 0; i -= 1) {
    const segment = state.snake[i];
    drawable.push({ kind: i === 0 ? 'head' : 'snake', pos: segment });
  }
  if (state.food) {
    drawable.push({ kind: 'food', pos: state.food });
  }

  const drawableProjected = drawable
    .map((item) => ({ ...item, projected: project(item.pos, viewport) }))
    .sort((a, b) => b.projected.depth - a.projected.depth);

  for (const item of drawableProjected) {
    drawGroundShadow(item.pos, item.kind, viewport);
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

  if (!options.isInset) {
    drawTargetGuide(state.snake[0], state.food, viewport);
  }
}

function drawSceneByMode(mode, viewport, options = {}) {
  if (mode === 'first_person') {
    drawFirstPersonScene(viewport, options);
  } else {
    drawThirdPersonScene(viewport, options);
  }
}

function drawInsetScene(mainViewport) {
  const mode = oppositeViewMode(viewMode);
  const viewport = makeInsetViewport(mainViewport);
  const title = `보조: ${labelForViewMode(mode)}`;

  ctx.save();
  ctx.fillStyle = 'rgba(9, 26, 38, 0.2)';
  ctx.fillRect(viewport.x + 2, viewport.y + 3, viewport.width, viewport.height);
  ctx.fillStyle = 'rgba(239, 249, 255, 0.9)';
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.strokeStyle = 'rgba(28, 62, 86, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(viewport.x + 0.5, viewport.y + 0.5, viewport.width - 1, viewport.height - 1);
  ctx.restore();

  const contentViewport = {
    x: viewport.x + 4,
    y: viewport.y + INSET_LABEL_HEIGHT,
    width: viewport.width - 8,
    height: viewport.height - INSET_LABEL_HEIGHT - 4,
  };
  withViewport(contentViewport, () => drawSceneByMode(mode, contentViewport, { isInset: true }));

  ctx.save();
  ctx.fillStyle = 'rgba(12, 40, 58, 0.8)';
  ctx.font = '600 12px Trebuchet MS';
  ctx.textAlign = 'left';
  ctx.fillText(title, viewport.x + 8, viewport.y + 13);
  ctx.restore();
}

function draw() {
  const mainViewport = makeMainViewport();
  withViewport(mainViewport, () => drawSceneByMode(viewMode, mainViewport));
  drawInsetScene(mainViewport);
  drawReadyOverlay(mainViewport);
  drawGameOverOverlay(mainViewport);
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

function handleDirectionInput(dir) {
  setDirection(state, dir);
  if (!hasStarted && !state.gameOver) {
    hasStarted = true;
    state.paused = false;
  }
}

function setViewMode(mode) {
  viewMode = normalizeViewMode(mode, viewMode);
}

function toggleViewMode() {
  viewMode = nextViewMode(viewMode);
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
  const dir = directionFromKeyboardEvent(event);
  if (dir) {
    event.preventDefault();
    handleDirectionInput(dir);
    return;
  }

  const action = actionFromKeyboardEvent(event);
  if (action === 'toggle_pause') {
    if (hasStarted && !state.gameOver) togglePause(state);
  } else if (action === 'restart') {
    restartState(state);
    hasStarted = false;
  } else if (action === 'toggle_view') {
    toggleViewMode();
  } else if (action === 'toggle_fullscreen') {
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
viewThirdBtn.addEventListener('click', () => {
  setViewMode('third_person');
});
viewFirstBtn.addEventListener('click', () => {
  setViewMode('first_person');
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
    viewMode,
    secondaryViewMode: oppositeViewMode(viewMode),
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
