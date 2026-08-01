// ============================================================
// 可调整参数 (Adjustable Parameters)
// ============================================================
const CONFIG = {
  // —— 画布 (Canvas) ——
  canvasWidth: 800,
  canvasHeight: 800,
  backgroundColor: '{{backgroundColor|#ffffff}}',

  // —— 树枝生长 (Branch Growth) ——
  branchCount: {{branchCount|10}},
  branchStartX: 400,
  branchStartY: 800,
  branchColor: '{{branchColor|#938a82}}',
  branchStrokeWeight: 0.8,
  branchGrowthSpeed: {{branchGrowthSpeed|4}},
  branchMaxSegments: 200,
  branchDirectionJitter: 0.15,
  branchInitialAngleRange: 0.25,

  // —— 树枝分裂 (Branch Split) ——
  branchMaxLevel: {{branchMaxLevel|5}},
  branchSplitAngle: 0.50,
  branchSplitFracMin: 0.20,
  branchSplitFracMax: 0.45,
  branchSegmentsDecay: 0.55,

  // —— 花朵形状 (Flower Shape) ——
  flowerColor: '{{flowerColor|#e85d75}}',
  flowerMaxDiameter: {{flowerMaxDiameter|18}},
  flowerMinDiameter: 4,
  flowerMaxOpacity: 0.85,
  flowerBlurRadius: 0,
  flowerOpacityVariation: 0.4,

  // —— 花朵动画 (Flower Animation) ——
  flowerBloomDuration: {{flowerBloomDuration|45}},
  flowerSpawnProbability: {{flowerSpawnProbability|0.06}},
  flowerSpawnInterval: 3,

  // —— 摇摆动画 (Sway Animation) ——
  swayAmplitude: {{swayAmplitude|8}},
  swayFrequency: {{swayFrequency|0.025}},
  swayWaveSpeed: 280,
  swayRefHeight: 350,

};

// ============================================================
// 树枝类 (Branch)
// ============================================================

class Branch {
  constructor(startX, startY, level, parentAngle) {
    this.segments = [{ x: startX, y: startY }];
    this.level = level;
    this.alive = true;
    this.splitDone = false;
    this.segmentsGrown = 0;

    this.currentAngle = parentAngle + (Math.random() - 0.5) * CONFIG.branchDirectionJitter * 1.5;

    this.maxSegments = Math.floor(
      CONFIG.branchMaxSegments * Math.pow(CONFIG.branchSegmentsDecay, level - 1)
    );
    if (this.maxSegments < 5) this.maxSegments = 5;

    const sFrac = CONFIG.branchSplitFracMin +
      Math.random() * (CONFIG.branchSplitFracMax - CONFIG.branchSplitFracMin);
    this.splitAfter = Math.floor(this.maxSegments * sFrac);
    if (this.splitAfter < 3) this.splitAfter = 3;

    this._dx = null;
    this._dy = null;
    this._arcLenFromTip = null;
    this._perpX = null;
    this._perpY = null;

    this.parentBranch = null;
    this.parentSplitIndex = -1;
  }
}

// ============================================================
// 花朵类 (Flower)
// ============================================================

class Flower {
  constructor(x, y, startFrame) {
    this.x = x;
    this.y = y;
    this.startFrame = startFrame;
    const opVar = CONFIG.flowerOpacityVariation;
    this.opacityScale = (1 - opVar) + Math.random() * opVar;
    this.rShift = Math.floor((Math.random() - 0.5) * 60);
    this.gShift = Math.floor((Math.random() - 0.5) * 60);
    this.bShift = Math.floor((Math.random() - 0.5) * 60);
  }
}

// ============================================================
// 全局状态
// ============================================================

let branches = [];
let flowers = [];
let animFrame = 0;
let allBranchesGrown = false;
let branchTriggerFrame = 0;

// ============================================================
// 创建主树枝 (Spawn Primary Branches)
// ============================================================

function spawnPrimaryBranches() {
  const count = CONFIG.branchCount;
  const startX = CONFIG.branchStartX;
  const startY = CONFIG.branchStartY;

  for (let i = 0; i < count; i++) {
    const angleRange = CONFIG.branchInitialAngleRange;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * angleRange * 2;
    const branch = new Branch(startX, startY, 1, angle);
    branches.push(branch);
  }
}

// ============================================================
// 花朵生成 (Flower Spawning)
// ============================================================

function trySpawnFlower(x, y) {
  if (Math.random() < CONFIG.flowerSpawnProbability) {
    flowers.push(new Flower(x, y, animFrame));
  }
}

// ============================================================
// 树枝生长 (Grow Branches)
// ============================================================

function growBranches() {
  for (const branch of branches) {
    if (!branch.alive) continue;

    if (branch.segmentsGrown >= branch.maxSegments ||
        branch.segments.length >= CONFIG.branchMaxSegments * 2) {
      branch.alive = false;
      continue;
    }

    const tip = branch.segments[branch.segments.length - 1];

    let nextAngle = branch.currentAngle + (Math.random() - 0.5) * CONFIG.branchDirectionJitter * 2;

    const MIN_UP = -Math.PI + 0.3;
    const MAX_UP = -0.15;
    nextAngle = Math.max(MIN_UP, Math.min(MAX_UP, nextAngle));

    const step = CONFIG.branchGrowthSpeed;
    const newX = tip.x + Math.cos(nextAngle) * step;
    const newY = tip.y + Math.sin(nextAngle) * step;

    if (newX < 5 || newX > CONFIG.canvasWidth - 5 || newY < 5) {
      branch.alive = false;
      continue;
    }

    branch.segments.push({ x: newX, y: newY });
    branch.currentAngle = nextAngle;
    branch.segmentsGrown++;

    if (branch.segmentsGrown % CONFIG.flowerSpawnInterval === 0) {
      trySpawnFlower(newX, newY);
    }

    if (!branch.splitDone &&
        branch.level < CONFIG.branchMaxLevel &&
        branch.segmentsGrown >= branch.splitAfter) {
      branch.splitDone = true;
      branch.alive = false;
      const tipNow = branch.segments[branch.segments.length - 1];
      const spreadAngle = CONFIG.branchSplitAngle * Math.pow(0.8, branch.level - 1);

      for (let side = -1; side <= 1; side += 2) {
        const childAngle = nextAngle + side * spreadAngle;
        const child = new Branch(tipNow.x, tipNow.y, branch.level + 1, childAngle);
        child.parentBranch = branch;
        child.parentSplitIndex = branch.segments.length - 1;
        branches.push(child);
      }
    }
  }
}

// ============================================================
// 摇摆位移计算 (Compute Sway Displacements)
// ============================================================

function computeSwayDisplacements() {
  if (!allBranchesGrown) return;

  const totalPhase = animFrame * CONFIG.swayFrequency;
  const refH = CONFIG.swayRefHeight;

  for (const branch of branches) {
    const segs = branch.segments;
    const n = segs.length;
    if (n === 0) continue;

    if (!branch._dx || branch._dx.length !== n) {
      branch._dx = new Array(n);
      branch._dy = new Array(n);
    }

    if (!branch._arcLenFromTip || !branch._perpX) {
      branch._arcLenFromTip = new Array(n);
      branch._perpX = new Array(n);
      branch._perpY = new Array(n);

      branch._arcLenFromTip[n - 1] = 0;
      for (let i = n - 2; i >= 0; i--) {
        const dx = segs[i + 1].x - segs[i].x;
        const dy = segs[i + 1].y - segs[i].y;
        branch._arcLenFromTip[i] = branch._arcLenFromTip[i + 1] + Math.sqrt(dx * dx + dy * dy);
      }

      for (let i = 0; i < n; i++) {
        let tx, ty;
        if (n === 1) {
          tx = 0; ty = -1;
        } else if (i === 0) {
          tx = segs[1].x - segs[0].x;
          ty = segs[1].y - segs[0].y;
        } else if (i === n - 1) {
          tx = segs[i].x - segs[i - 1].x;
          ty = segs[i].y - segs[i - 1].y;
        } else {
          tx = segs[i + 1].x - segs[i - 1].x;
          ty = segs[i + 1].y - segs[i - 1].y;
        }
        const len = Math.sqrt(tx * tx + ty * ty) || 1;
        branch._perpX[i] = -ty / len;
        branch._perpY[i] = tx / len;
      }
    }

    for (let i = 0; i < n; i++) {
      const h = CONFIG.branchStartY - segs[i].y;
      if (h <= 0) continue;

      const arcLen = branch._arcLenFromTip[i];
      const phase = totalPhase + arcLen / CONFIG.swayWaveSpeed;
      const rawDisp = CONFIG.swayAmplitude * Math.sin(phase);
      const heightScale = Math.min(1.4, h / refH);

      branch._dx[i] = (branch._perpX[i] || 1) * rawDisp * heightScale;
      branch._dy[i] = (branch._perpY[i] || 0) * rawDisp * heightScale;
    }
  }

  for (const branch of branches) {
    if (branch.parentBranch && branch.parentSplitIndex >= 0) {
      const p = branch.parentBranch;
      const si = branch.parentSplitIndex;
      if (p._dx && si < p._dx.length) {
        branch._dx[0] = p._dx[si];
        branch._dy[0] = p._dy[si];
      }
    }
  }
}

// ============================================================
// 渲染树枝 (Render Branches)
// ============================================================

function renderBranches() {
  if (branches.length === 0) return;

  const ctx = drawingContext;
  ctx.save();

  for (const branch of branches) {
    const segs = branch.segments;
    if (segs.length < 2) continue;

    const r = parseInt(CONFIG.branchColor.substring(1, 3), 16);
    const g = parseInt(CONFIG.branchColor.substring(3, 5), 16);
    const b = parseInt(CONFIG.branchColor.substring(5, 7), 16);
    const lightness = Math.max(0, (branch.level - 1) * 10);
    const colorStr = `rgb(${Math.max(0, r - lightness)},${Math.max(0, g - lightness)},${Math.max(0, b - lightness)})`;

    ctx.strokeStyle = colorStr;
    ctx.lineWidth = CONFIG.branchStrokeWeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < segs.length; i++) {
      const sx = segs[i].x + (branch._dx?.[i] ?? 0);
      const sy = segs[i].y + (branch._dy?.[i] ?? 0);
      if (i === 0) {
        ctx.moveTo(sx, sy);
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================
// 渲染花朵 (Render Flowers)
// ============================================================

function renderFlowers() {
  if (flowers.length === 0) return;

  const hex = CONFIG.flowerColor.replace('#', '');
  const fr = parseInt(hex.substring(0, 2), 16);
  const fg = parseInt(hex.substring(2, 4), 16);
  const fb = parseInt(hex.substring(4, 6), 16);

  const ctx = drawingContext;
  ctx.save();
  if (CONFIG.flowerBlurRadius > 0) {
    ctx.filter = `blur(${CONFIG.flowerBlurRadius}px)`;
  }

  for (const flower of flowers) {
    const age = animFrame - flower.startFrame;
    if (age < 0) continue;

    const progress = Math.min(1, age / CONFIG.flowerBloomDuration);
    const eased = 1 - Math.pow(1 - progress, 3);

    const diameter = lerp(CONFIG.flowerMinDiameter, CONFIG.flowerMaxDiameter, eased);
    const alpha = lerp(0, CONFIG.flowerMaxOpacity * flower.opacityScale, eased);

    const r = constrain(fr + (flower.rShift || 0), 0, 255);
    const g = constrain(fg + (flower.gShift || 0), 0, 255);
    const b = constrain(fb + (flower.bShift || 0), 0, 255);

    let fx = flower.x;
    let fy = flower.y;
    if (allBranchesGrown) {
      const h = CONFIG.branchStartY - fy;
      if (h > 0) {
        const heightScale = Math.min(1.4, h / CONFIG.swayRefHeight);
        const phase = animFrame * CONFIG.swayFrequency + h / CONFIG.swayWaveSpeed;
        fx += CONFIG.swayAmplitude * Math.sin(phase) * heightScale * 0.7;
      }
    }

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(fx, fy, diameter / 2, diameter / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================
// 初始化
// ============================================================

function setup() {
  pixelDensity(1);
  createCanvas(CONFIG.canvasWidth, CONFIG.canvasHeight);

  spawnPrimaryBranches();
  branchTriggerFrame = animFrame;
}

// ============================================================
// 每帧绘制
// ============================================================

function draw() {
  background(CONFIG.backgroundColor);
  animFrame++;

  growBranches();

  if (!allBranchesGrown && branches.length > 0) {
    if (branches.every(b => !b.alive)) {
      allBranchesGrown = true;
    }
  }

  computeSwayDisplacements();

  renderBranches();
  renderFlowers();
}

// ============================================================
// 键盘交互：按空格键重置动画
// ============================================================

function keyPressed() {
  if (key === ' ') {
    branches = [];
    flowers = [];
    animFrame = 0;
    allBranchesGrown = false;
    spawnPrimaryBranches();
    branchTriggerFrame = 0;
  }
  if (key === 'r' || key === 'R') {
    CONFIG.branchCount = Math.floor(Math.random() * 3) + 3;
    branches = [];
    flowers = [];
    animFrame = 0;
    allBranchesGrown = false;
    spawnPrimaryBranches();
    branchTriggerFrame = 0;
  }
}
