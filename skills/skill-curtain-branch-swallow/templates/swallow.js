// ============================================================
//  Swallow Flock — 一群飞燕飞过
//  素材：CDN SVG 拼装飞燕，颜色通过 SVG fill 内嵌实现
// ============================================================

// ============================================================
//  ██  画布  ██
// ============================================================
const CANVAS_W   = 800;
const CANVAS_H   = 800;
const BG_COLOR   = '{{BG_COLOR|#ffffff}}';

// ============================================================
//  ██  飞燕素材 CDN 地址  ██
// ============================================================
const BIRD_BODY_URL = 'https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/bird/bird_body.svg';
const BIRD_WING_L_URL = 'https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/bird/bird_wing_l.svg';
const BIRD_WING_R_URL = 'https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/bird/bird_wing_r.svg';

// ============================================================
//  ██  素材显式像素尺寸（SVG viewBox 原生尺寸）  ██
//  body viewBox≈16.68×68.51, wing viewBox≈66.33×28.04
// ============================================================
const BIRD_BODY_W = 17;
const BIRD_BODY_H = 69;
const BIRD_WING_W = 66;
const BIRD_WING_H = 28;

// ============================================================
//  ██  飞行路径参数  ██
// ============================================================

// -- 每群数量 --
const FLOCK_SIZE = {{FLOCK_SIZE|20}};

// -- 飞行时长 --
const FLIGHT_DURATION_MIN = {{FLIGHT_DURATION_MIN|2800}};    // 飞行时长下限 (ms)
const FLIGHT_DURATION_MAX = {{FLIGHT_DURATION_MAX|4200}};    // 飞行时长上限 (ms)

// -- 群内错开 --
const STAGGER_SPAN = {{STAGGER_SPAN|1000}};           // 群内起飞错开总时长 (ms)

// -- 贝塞尔弧线 --
const ARC_BOW    = 0.30;             // 弧线弯曲量 (0=直线, 越大越弯)
const ARC_JITTER = 0.10;             // 弧线弯曲量随机抖动比例

// -- 缓动 --
const EASE_POWER = 2.8;              // 飞行缓出幂次 (>1=先快后慢)

// -- 入场：画布右侧外侧 --
const ENTRY_X_MIN = 30;
const ENTRY_X_MAX = 300;
const ENTRY_Y_MIN = 60;
const ENTRY_Y_MAX = 740;

// -- 退场：画布左侧外侧 --
const EXIT_X_MIN  = -400;
const EXIT_X_MAX  = -50;
const EXIT_Y_MIN  = 60;
const EXIT_Y_MAX  = 740;

// ============================================================
//  ██  飞燕外观参数  ██
// ============================================================
const BIRD_SCALE         = {{BIRD_SCALE|0.60}};      // 飞燕缩放
const BIRD_SCALE_JITTER  = 0.20;      // 缩放随机范围 (±比例)
const WING_FLAP_SPEED    = {{WING_FLAP_SPEED|0.22}};      // 翅膀扑动速度
const WING_SCALE_MIN     = 0.20;      // 翅膀收缩最小比例
const BIRD_COLOR         = '{{BIRD_COLOR|#2d2d44}}'; // 飞燕颜色（hex 格式）

// ============================================================
//  ██  叉尾参数（Verlet 物理）  ██
// ============================================================
const TAIL_COLOR           = '{{TAIL_COLOR|#2d2d44}}';   // 尾色（白底用深色）
const TAIL_HALF_W          = 0.5;          // 尾带半宽 (px)
const TAIL_PARTICLE_COUNT  = 12;           // 每叉粒子数
const TAIL_TOTAL_LEN       = 90;           // 叉尾总长 (px)
const TAIL_SPREAD_ANGLE    = 8;            // 叉尾张开角度 (度)
const TAIL_DAMPING         = 0.94;         // 阻尼
const TAIL_CONSTRAINT_ITERS = 5;           // 约束迭代次数
const TAIL_ROOT_TRANSFER   = 0.3;          // 根部动量传递

// ============================================================
//  ██  动画触发  ██
// ============================================================
const START_DELAY   = {{START_DELAY|600}};             // 开场后延迟 (ms)
const LOOP_INTERVAL = {{LOOP_INTERVAL|5500}};            // 群间隔 (ms)，设 0 为只飞一次

// ============================================================
//  全局状态
// ============================================================
let birdImages   = { body: null, wingL: null, wingR: null };
let swallows     = [];
let flockPhase   = 'idle';          // idle → flying → done
let flockTimer   = 0;               // 群计时起点
let _birdImgsReady = false;

// 缓存的 SVG 原文（去除 <style>），供颜色变更时重建素材
let _svgBody = '', _svgWingL = '', _svgWingR = '';

// ============================================================
//  SVG → p5.Image（将 fill 色直接嵌入 SVG 行内，绕过 CSS）
// ============================================================
function makeBirdImage(svgText, fillHex, targetW, targetH) {
  // 给图形元素嵌入行内 fill（presentation attribute，<img> 下生效）
  let colored = svgText.replace(
    /(<(?:path|polygon|circle|ellipse|rect|polyline|line)\s)/gi,
    '$1fill="' + fillHex + '" '
  );
  const blob = new Blob([colored], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const p5img = createImage(targetW, targetH);
  const native = new Image();
  return new Promise((resolve, reject) => {
    native.onload = () => {
      p5img.drawingContext.drawImage(native, 0, 0, targetW, targetH);
      URL.revokeObjectURL(url);
      resolve(p5img);
    };
    native.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Decode failed'));
    };
    native.src = url;
  });
}

async function buildBirdImages(fillHex) {
  const [bodyImg, wingL, wingR] = await Promise.all([
    makeBirdImage(_svgBody,   fillHex, BIRD_BODY_W, BIRD_BODY_H),
    makeBirdImage(_svgWingL,  fillHex, BIRD_WING_W, BIRD_WING_H),
    makeBirdImage(_svgWingR,  fillHex, BIRD_WING_W, BIRD_WING_H),
  ]);
  return { body: bodyImg, wingL: wingL, wingR: wingR };
}

// ============================================================
//  加载飞燕素材
// ============================================================
async function loadBirdImages() {
  async function fetchSVGText(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Fetch failed: ' + url);
    // 移除 <style>（<img> 不应用 CSS）
    return resp.text().then(t => t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ''));
  }

  [_svgBody, _svgWingL, _svgWingR] = await Promise.all([
    fetchSVGText(BIRD_BODY_URL),
    fetchSVGText(BIRD_WING_L_URL),
    fetchSVGText(BIRD_WING_R_URL),
  ]);

  birdImages = await buildBirdImages(BIRD_COLOR);
}

// 运行时切换颜色：控制台执行 setBirdColor('#ff0000') 即时生效
function setBirdColor(hex) {
  buildBirdImages(hex).then(imgs => { birdImages = imgs; });
}

// ============================================================
//  SwallowBird — 单只飞燕
//  组装方式完全按照参考项目 bird.js / summer_birds.js
// ============================================================
class SwallowBird {
  constructor(index, total) {
    // —— 入场：画布右侧外侧 ——
    this.startX = CANVAS_W + random(ENTRY_X_MIN, ENTRY_X_MAX);
    this.startY = random(ENTRY_Y_MIN, ENTRY_Y_MAX);

    // —— 退场：画布左侧外侧 ——
    this.exitX = random(EXIT_X_MIN, EXIT_X_MAX);
    this.exitY = random(EXIT_Y_MIN, EXIT_Y_MAX);

    // —— 贝塞尔控制点（弧线飞行） ——
    const mx = (this.startX + this.exitX) / 2;
    const my = (this.startY + this.exitY) / 2;
    const dx = this.exitX - this.startX;
    const dy = this.exitY - this.startY;
    const dist = sqrt(dx * dx + dy * dy) || 1;
    const perpX =  dy / dist;
    const perpY = -dx / dist;
    const bow = dist * (ARC_BOW + random(-ARC_JITTER, ARC_JITTER));
    this.cpX = mx + perpX * bow + random(-50, 50);
    this.cpY = my + perpY * bow + random(-50, 50);

    // —— 时间参数 ——
    const totalForSpan = max(total - 1, 1);
    this.startDelay     = (index / totalForSpan) * STAGGER_SPAN;
    this.flightDuration = random(FLIGHT_DURATION_MIN, FLIGHT_DURATION_MAX);
    this.birthTime      = 0;

    // —— 位置状态 ——
    this.x      = this.startX;
    this.y      = this.startY;
    this.prevX  = this.x;
    this.prevY  = this.y;
    this.opacity = 0;
    this.done    = false;

    // —— 翅膀 ——
    this.wingPhase = random(TWO_PI);
    this.wingTime  = random(TWO_PI);

    // —— 缩放 ——
    this.scale = BIRD_SCALE * random(
      1 - BIRD_SCALE_JITTER,
      1 + BIRD_SCALE_JITTER,
    );

    // —— 素材尺寸 ——
    this._bodyW = BIRD_BODY_W;
    this._bodyH = BIRD_BODY_H;
    this._wingLW = BIRD_WING_W;
    this._wingLH = BIRD_WING_H;
    this._wingRW = BIRD_WING_W;
    this._wingRH = BIRD_WING_H;

    // —— 锚点布局（相对 wingL 左上角 = 原点，1:1 还原 Swallow 结构） ——
    this._anchorWingLX = 0;
    this._anchorWingLY = 0;
    this._anchorWingRX = 68;
    this._anchorWingRY = 0;
    this._anchorBodyX  = 58;
    this._anchorBodyY  = -14.5;
    this._anchorTailX  = 67;
    this._anchorTailY  = 54;

    // —— 包围盒中心 ——
    this._centerX = null;
    this._centerY = null;

    // ---- Verlet 叉尾 ----
    this._tailL = [];
    this._tailR = [];
    this._initTail();
  }

  // ==========================================================
  //  初始化叉尾粒子（完全按参考项目逻辑）
  // ==========================================================
  _initTail() {
    const N = TAIL_PARTICLE_COUNT;
    const segLen = TAIL_TOTAL_LEN / (N - 1);
    const ax = this._anchorTailX;
    const ay = this._anchorTailY;
    const spreadRad = radians(TAIL_SPREAD_ANGLE);
    const forkAngL = PI / 2 + spreadRad;
    const forkAngR = PI / 2 - spreadRad;

    for (let i = 0; i < N; i++) {
      const d = i * segLen;
      this._tailL.push({
        x: ax + cos(forkAngL) * d, y: ay + sin(forkAngL) * d,
        px: ax + cos(forkAngL) * d, py: ay + sin(forkAngL) * d,
      });
      this._tailR.push({
        x: ax + cos(forkAngR) * d, y: ay + sin(forkAngR) * d,
        px: ax + cos(forkAngR) * d, py: ay + sin(forkAngR) * d,
      });
    }
  }

  // ==========================================================
  //  更新叉尾 — Verlet 积分 + 距离约束（完全按参考项目逻辑）
  // ==========================================================
  _updateTail() {
    const N = TAIL_PARTICLE_COUNT;
    const segLen = TAIL_TOTAL_LEN / (N - 1);
    const damp = TAIL_DAMPING;
    const transfer = TAIL_ROOT_TRANSFER;
    const iters = TAIL_CONSTRAINT_ITERS;
    const ax = this._anchorTailX;
    const ay = this._anchorTailY;

    for (const fork of [this._tailL, this._tailR]) {
      // 根部粒子固定到锚点
      const rootPrevX = fork[0].x;
      const rootPrevY = fork[0].y;
      fork[0].px = fork[0].x;
      fork[0].py = fork[0].y;
      fork[0].x = ax;
      fork[0].y = ay;
      const rootDx = fork[0].x - rootPrevX;
      const rootDy = fork[0].y - rootPrevY;

      // Verlet 积分
      for (let i = 1; i < N; i++) {
        const p = fork[i];
        const vx = (p.x - p.px) * damp;
        const vy = (p.y - p.py) * damp;
        p.px = p.x;
        p.py = p.y;
        p.x += vx + rootDx * transfer;
        p.y += vy + rootDy * transfer;
      }

      // 距离约束
      for (let iter = 0; iter < iters; iter++) {
        for (let i = 0; i < N - 1; i++) {
          const a = fork[i], b = fork[i + 1];
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = sqrt(dx * dx + dy * dy) || 0.001;
          const corr = (d - segLen) / d * 0.5;
          if (i > 0)     { a.x += dx * corr; a.y += dy * corr; }
          if (i < N - 2) { b.x -= dx * corr; b.y -= dy * corr; }
        }
      }
    }
  }

  // ==========================================================
  //  计算包围盒中心（用于旋转原点）
  // ==========================================================
  _calcCenter() {
    const bW = this._bodyW, bH = this._bodyH;
    const lW = this._wingLW, lH = this._wingLH;
    const rW = this._wingRW, rH = this._wingRH;

    const minX = min(this._anchorWingLX, this._anchorWingRX, this._anchorBodyX);
    const maxX = max(this._anchorWingLX + lW, this._anchorWingRX + rW, this._anchorBodyX + bW);
    const minY = min(this._anchorWingLY, this._anchorWingRY, this._anchorBodyY);
    const maxY = max(this._anchorWingLY + lH, this._anchorWingRY + rH, this._anchorBodyY + bH);

    this._centerX = (minX + maxX) / 2;
    this._centerY = (minY + maxY) / 2;
  }

  // ==========================================================
  //  每帧更新
  // ==========================================================
  update() {
    const elapsed = millis() - this.birthTime - this.startDelay;

    // 还没轮到起飞
    if (elapsed < 0) {
      this.opacity = 0;
      this.prevX = this.x;
      this.prevY = this.y;
      this._updateTail();
      return;
    }

    // 淡入
    this.opacity = constrain(map(elapsed, 0, 200, 0, 255), 0, 255);

    const rawT = constrain(elapsed / this.flightDuration, 0, 1);
    this.prevX = this.x;
    this.prevY = this.y;

    if (rawT >= 1) {
      // 到达终点，标记完成
      this.done = true;
      this.x = this.exitX;
      this.y = this.exitY;
    } else {
      // 贝塞尔曲线: 二次贝塞尔 B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
      const t = 1 - pow(1 - rawT, EASE_POWER);   // ease-out
      const u = 1 - t;
      this.x = u * u * this.startX + 2 * u * t * this.cpX + t * t * this.exitX;
      this.y = u * u * this.startY + 2 * u * t * this.cpY + t * t * this.exitY;
    }

    // 翅膀扑动
    this.wingTime += WING_FLAP_SPEED;

    // 叉尾物理更新
    this._updateTail();
  }

  // ==========================================================
  //  绘制（完全按参考项目 display 逻辑）
  // ==========================================================
  display() {
    if (this.opacity <= 0 || this.done) return;
    if (!birdImages.body || !birdImages.wingL || !birdImages.wingR) return;

    if (this._centerX === null) this._calcCenter();

    push();
    translate(this.x, this.y);

    // 飞行方向角（基于前后帧位移，与参考项目一致）
    const ddx = this.x - this.prevX;
    const ddy = this.y - this.prevY;
    const flyAngle = (abs(ddx) < 0.01 && abs(ddy) < 0.01)
      ? -PI / 4
      : atan2(ddx, -ddy);
    rotate(flyAngle);

    // 以包围盒中心为旋转原点
    translate(-this._centerX, -this._centerY);
    scale(this.scale);

    // ---- 翅膀扑动 ----
    const flapT = (sin(this.wingTime + this.wingPhase) + 1) / 2;
    const wingSX = lerp(WING_SCALE_MIN, 1.0, flapT);

    // 右翅（以左缘为收缩轴）
    push();
    translate(this._anchorWingRX, this._anchorWingRY);
    scale(wingSX, 1);
    tint(255, this.opacity);
    image(birdImages.wingR, 0, 0);
    noTint();
    pop();

    // 左翅（以右缘为收缩轴）
    push();
    translate(this._anchorWingLX + this._wingLW, this._anchorWingLY);
    scale(wingSX, 1);
    tint(255, this.opacity);
    image(birdImages.wingL, -this._wingLW, 0);
    noTint();
    pop();

    // 身体
    push();
    translate(this._anchorBodyX, this._anchorBodyY);
    tint(255, this.opacity);
    image(birdImages.body, 0, 0);
    noTint();
    pop();

    // ---- Verlet 叉尾 ----
    const tc = color(TAIL_COLOR);
    noStroke();
    for (const fork of [this._tailL, this._tailR]) {
      const N = fork.length;

      // 逐顶点法线
      const normals = [];
      for (let i = 0; i < N; i++) {
        let nx = 0, ny = 0;
        if (i > 0) {
          let dx = fork[i].x - fork[i - 1].x, dy = fork[i].y - fork[i - 1].y;
          const d = sqrt(dx * dx + dy * dy) || 1;
          nx += -dy / d; ny += dx / d;
        }
        if (i < N - 1) {
          let dx = fork[i + 1].x - fork[i].x, dy = fork[i + 1].y - fork[i].y;
          const d = sqrt(dx * dx + dy * dy) || 1;
          nx += -dy / d; ny += dx / d;
        }
        const nl = sqrt(nx * nx + ny * ny) || 1;
        normals.push({ x: nx / nl * TAIL_HALF_W, y: ny / nl * TAIL_HALF_W });
      }

      // 逐段四边形（根部不透明 → 尖部全透）
      for (let i = 0; i < N - 1; i++) {
        const a1 = this.opacity * (1 - i / (N - 1));
        const a2 = this.opacity * (1 - (i + 1) / (N - 1));
        const p1 = fork[i], n1 = normals[i];
        const p2 = fork[i + 1], n2 = normals[i + 1];

        fill(red(tc), green(tc), blue(tc), a1);
        beginShape();
        vertex(p1.x + n1.x, p1.y + n1.y);
        vertex(p1.x - n1.x, p1.y - n1.y);
        fill(red(tc), green(tc), blue(tc), a2);
        vertex(p2.x - n2.x, p2.y - n2.y);
        vertex(p2.x + n2.x, p2.y + n2.y);
        endShape(CLOSE);
      }
    }

    pop();
  }
}

// ============================================================
//  生成一群飞燕
// ============================================================
function spawnFlock() {
  swallows = [];
  for (let i = 0; i < FLOCK_SIZE; i++) {
    swallows.push(new SwallowBird(i, FLOCK_SIZE));
  }
}

// ============================================================
//  启动飞行动画
// ============================================================
function startFlock() {
  if (!_birdImgsReady) return;
  flockPhase = 'flying';
  flockTimer = millis();
  spawnFlock();
  for (const b of swallows) {
    b.birthTime = flockTimer;
  }
}

// ============================================================
//  p5 生命周期
// ============================================================
async function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  try {
    await loadBirdImages();
    _birdImgsReady = true;
    console.log('✅ 飞燕素材加载成功');
  } catch (e) {
    console.error('❌ 飞燕素材加载失败:', e);
  }
}

function draw() {
  // 背景
  background(BG_COLOR);

  // 初始化完成检查
  if (!_birdImgsReady) return;

  // ---- 阶段管理 ----
  const now = millis();

  if (flockPhase === 'idle') {
    if (now > START_DELAY) {
      startFlock();
    }
    return;
  }

  if (flockPhase === 'flying') {
    // 更新所有飞燕
    for (const b of swallows) b.update();

    // 绘制所有飞燕
    for (const b of swallows) b.display();

    // 检查是否全部飞完
    if (swallows.every(b => b.done)) {
      flockPhase = 'done';
      flockTimer = now;
      console.log('🕊️ 一群飞燕已飞过');
    }
  }

  if (flockPhase === 'done') {
    // 循环模式：等待间隔后重新起飞
    if (LOOP_INTERVAL > 0 && now - flockTimer > LOOP_INTERVAL) {
      flockPhase = 'idle';
    }
  }
}
