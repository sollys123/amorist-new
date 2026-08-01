// ============================================================
// 雨帘 —— 可调参数
// ============================================================

// —— 帘线 ——
const CURTAIN_LINE_COUNT = {{CURTAIN_LINE_COUNT|32}};
const CURTAIN_STROKE_WEIGHT = 1;
const CURTAIN_COLOR = "{{CURTAIN_COLOR|#7a7a7a}}";
const CURTAIN_STROKE_ALPHA = {{CURTAIN_STROKE_ALPHA|128}};
const CURTAIN_LENGTH = {{CURTAIN_LENGTH|750}};

// —— 雨滴 ——
const DROPS_PER_LINE_MIN = {{DROPS_PER_LINE_MIN|5}};
const DROPS_PER_LINE_MAX = {{DROPS_PER_LINE_MAX|12}};
const DROP_START_MIN = 30;
const DROP_START_MAX = 80;
const DROP_SIZE_MIN = {{DROP_SIZE_MIN|0.25}};
const DROP_SIZE_MAX = {{DROP_SIZE_MAX|0.55}};
const DROP_POS_JITTER = 6;

// —— Verlet 物理 ——
const VERLET_TIMESTEPS = {{VERLET_TIMESTEPS|40}};
const VERLET_GRAVITY = {{VERLET_GRAVITY|0.18}};
const VERLET_AIR_DRAG = 0.995;
const VERLET_MASS = 1.0;
const VERLET_REPULSION_SIZE = {{VERLET_REPULSION_SIZE|100}};
const VERLET_SEGMENT_DIVISOR = 5;
const VERLET_VEL_LIMIT = 15;
const ROPE_SUBDIVISIONS = 10;

// —— 下落动画 ——
const FALL_SETTLE_KIN_SCALE = 2.1;
const FALL_SETTLE_OFF_LINE = 38;
const FALL_SETTLE_OFF_MULT = 3;
const FALL_SETTLE_STABLE_FRAMES = 32;
const FALL_FORCE_LIVE_MS = 9000;

// —— 撩动脱落 ——
const DETACH_MOUSE_SPEED_MIN = {{DETACH_MOUSE_SPEED_MIN|1.2}};
const DETACH_BEAD_SPEED_MIN = 1.4;
const DETACH_PROBABILITY = {{DETACH_PROBABILITY|0.18}};
const DETACH_REPULSE_MULT = {{DETACH_REPULSE_MULT|1.45}};
const MAX_DETACH_PER_FRAME = 3;
const FALLING_DROP_GRAVITY = {{FALLING_DROP_GRAVITY|0.55}};
const FALLING_DROP_DRAG = 0.992;


// ============================================================
// 雨滴图片 CDN
// ============================================================
const DROP_IMAGE_COUNT = 12;
const DROP_URLS = [
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop1.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop2.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop3.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop4.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop5.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop6.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop7.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop8.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop9.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop10.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop11.png",
  "https://cdn.jsdelivr.net/gh/xxoogreymon-prog/image-resources@main/icons/rain_drops/drop12.png",
];

// ============================================================
// 全局变量
// ============================================================
let dropImages = [];

// 帘线悬挂点 (每根帘线一个 { x0, y1 })
let curtainLineFromTo = [];
// 雨滴数据 { y0, w, h, img, lineIndex, attached }
let curtainDrops = [];
// Verlet 刚体 (每根帘线一个)
let curtainBodies = [];
// 帘子状态: "loading" | "falling" | "live"
let curtainState = "loading";
// 落稳计数
let settleStable = 0;
let curtainLoadMs = 0;

// 已脱落的雨滴
let fallingDrops = [];

// ============================================================
// 雨滴构建
// ============================================================

function hasValidImages() {
  return dropImages.some(function (img) { return img && img.width > 0; });
}

function pickDropImage() {
  if (!hasValidImages()) return null;
  var valid = [];
  for (var i = 0; i < dropImages.length; i++) {
    if (dropImages[i] && dropImages[i].width > 0) valid.push(dropImages[i]);
  }
  return valid[floor(random(valid.length))];
}

function pushDropAt(lineIndex, yCenter) {
  var img = pickDropImage();
  if (!img) {
    var r = random(4, 7);
    curtainDrops.push({ y0: yCenter, w: r * 2, h: r * 2, img: null, lineIndex: lineIndex, attached: true });
    return;
  }
  var sc = random(DROP_SIZE_MIN, DROP_SIZE_MAX);
  var w = img.width * sc;
  var h = img.height * sc;
  curtainDrops.push({ y0: yCenter, w: w, h: h, img: img, lineIndex: lineIndex, attached: true });
}

function buildDrops() {
  curtainDrops = [];
  var loN = min(DROPS_PER_LINE_MIN, DROPS_PER_LINE_MAX);
  var hiN = max(DROPS_PER_LINE_MIN, DROPS_PER_LINE_MAX);
  for (var li = 0; li < curtainLineFromTo.length; li++) {
    var ln = curtainLineFromTo[li];
    var yTop = ln.y1 + random(DROP_START_MIN, DROP_START_MAX);
    var yEnd = ln.y1 + CURTAIN_LENGTH;
    if (yEnd - yTop < 2) continue;
    var n = max(1, floor(random(loN, hiN + 1)));
    for (var i = 0; i < n; i++) {
      if (i === n - 1) {
        pushDropAt(li, yEnd);
        continue;
      }
      var t = i / (n - 1);
      var yC = lerp(yTop, yEnd, t) + random(-DROP_POS_JITTER, DROP_POS_JITTER);
      yC = constrain(yC, yTop, yEnd - 2);
      pushDropAt(li, yC);
    }
  }
}

// ============================================================
// Verlet 物理
// ============================================================

function VerletPoint(x, y) {
  this.oldPos = createVector(x, y);
  this.pos = createVector(x, y);
  this.forces = createVector(0, 0);
  this.snap = false;
}

VerletPoint.prototype.applyForce = function (force) {
  var f = force.copy();
  f.mult(VERLET_MASS);
  this.forces.add(f);
};

VerletPoint.prototype.sim = function () {
  if (this.snap) return;
  this.applyForce(createVector(0, VERLET_GRAVITY));
  var d = dist(mouseX, mouseY, this.pos.x, this.pos.y);
  if (d < VERLET_REPULSION_SIZE && d > 1e-6) {
    var repulse = this.pos.copy().sub(createVector(mouseX, mouseY));
    repulse.normalize();
    this.applyForce(repulse);
  }
  var velocity = this.pos.copy().sub(this.oldPos);
  velocity.add(this.forces);
  velocity.mult(VERLET_AIR_DRAG);
  velocity.limit(VERLET_VEL_LIMIT);
  this.oldPos.set(this.pos);
  this.pos.add(velocity);
  this.forces.mult(0);
};

function VerletSegment(point1, point2) {
  this.point1 = point1;
  this.point2 = point2;
  this.restLength = point1.pos.dist(point2.pos);
}

VerletSegment.prototype.sim = function () {
  var currentLength = this.point1.pos.dist(this.point2.pos);
  if (currentLength < 1e-8) {
    if (!this.point2.snap) {
      this.point2.pos.y += random(0.05, 0.2);
    } else if (!this.point1.snap) {
      this.point1.pos.y += random(0.05, 0.2);
    }
    return;
  }
  var lengthDifference = this.restLength - currentLength;
  var offsetPercent = lengthDifference / currentLength / VERLET_SEGMENT_DIVISOR;
  var direction = this.point2.pos.copy().sub(this.point1.pos);
  direction.mult(offsetPercent);
  if (!this.point1.snap) this.point1.pos.sub(direction);
  if (!this.point2.snap) this.point2.pos.add(direction);
};

function CurtainRigidBody() {
  this.points = [];
  this.segments = [];
  this.lineIndex = 0;
  this.drops = [];
  this.restYFromTop = [];
  this.dropPointIndices = [];
}

CurtainRigidBody.prototype.addPoint = function (x, y) {
  var np = new VerletPoint(x, y);
  this.points.push(np);
  return np;
};

CurtainRigidBody.prototype.addSegment = function (p1, p2) {
  var ns = new VerletSegment(p1, p2);
  this.segments.push(ns);
  return ns;
};

CurtainRigidBody.prototype.sim = function () {
  for (var i = 0; i < this.points.length; i++) {
    this.points[i].sim();
  }
  for (var ts = 0; ts < VERLET_TIMESTEPS; ts++) {
    for (var j = 0; j < this.segments.length; j++) {
      this.segments[j].sim();
    }
  }
};

// ============================================================
// 初始化帘线
// ============================================================

function initCurtainLines() {
  curtainLineFromTo = [];
  var margin = (width - 760) / 2;
  var spacing = 760 / (CURTAIN_LINE_COUNT - 1);
  for (var i = 0; i < CURTAIN_LINE_COUNT; i++) {
    curtainLineFromTo.push({
      x0: margin + i * spacing,
      y1: -10,
    });
  }
}

function initVerletCurtain() {
  curtainBodies = [];
  settleStable = 0;
  fallingDrops = [];
  curtainLoadMs = millis();
  for (var i = 0; i < curtainDrops.length; i++) {
    curtainDrops[i].attached = true;
  }

  var nSub = max(1, round(ROPE_SUBDIVISIONS));
  for (var li = 0; li < curtainLineFromTo.length; li++) {
    var base = curtainLineFromTo[li];
    var drops = [];
    for (var di = 0; di < curtainDrops.length; di++) {
      if (curtainDrops[di].lineIndex === li) drops.push(curtainDrops[di]);
    }
    drops.sort(function (a, b) { return a.y0 - b.y0; });
    if (drops.length === 0) continue;

    var rb = new CurtainRigidBody();
    rb.lineIndex = li;
    rb.drops = drops;
    rb.dropPointIndices = [];
    var x0 = base.x0;
    var yTop = base.y1;
    var p0 = rb.addPoint(x0, yTop);
    p0.snap = true;
    rb.restYFromTop = [0];
    var beadRestY = [0];
    for (var dj = 0; dj < drops.length; dj++) {
      beadRestY.push(drops[dj].y0 - yTop);
    }

    for (var j = 0; j < drops.length; j++) {
      var spanStart = beadRestY[j];
      var spanEnd = beadRestY[j + 1];
      var subRest = max(1e-3, (spanEnd - spanStart) / nSub);
      for (var s = 0; s < nSub; s++) {
        var t = (s + 1) / nSub;
        var yOff = lerp(spanStart, spanEnd, t);
        var restY = yTop + yOff;
        var p = rb.addPoint(x0, restY);
        p.oldPos.set(x0, restY);
        rb.restYFromTop.push(yOff);
        if (s === nSub - 1) rb.dropPointIndices.push(rb.points.length - 1);
        var prev = rb.points[rb.points.length - 2];
        rb.addSegment(prev, p);
        rb.segments[rb.segments.length - 1].restLength = subRest;
      }
    }
    curtainBodies.push(rb);
  }
}

// ============================================================
// 锚点更新
// ============================================================

function updateCurtainAnchors() {
  for (var bi = 0; bi < curtainBodies.length; bi++) {
    var rb = curtainBodies[bi];
    var base = curtainLineFromTo[rb.lineIndex];
    var pin = rb.points[0];
    pin.pos.set(base.x0, base.y1);
    pin.oldPos.set(base.x0, base.y1);
  }
}

// ============================================================
// 脱落 & 下落
// ============================================================

function maybeDetachDropsFromAgitation() {
  if (curtainBodies.length === 0 || curtainState !== "live") return;

  var mspd = dist(mouseX, mouseY, pmouseX, pmouseY);
  var mouseFast = mspd >= DETACH_MOUSE_SPEED_MIN;
  var mouseDrag = mouseIsPressed && mouseButton === LEFT && mspd > 0.35;
  var r0 = VERLET_REPULSION_SIZE * DETACH_REPULSE_MULT;
  var detached = 0;

  for (var bi = 0; bi < curtainBodies.length; bi++) {
    if (detached >= MAX_DETACH_PER_FRAME) break;
    var rb = curtainBodies[bi];
    for (var k = 0; k < rb.drops.length; k++) {
      if (detached >= MAX_DETACH_PER_FRAME) break;
      var d = rb.drops[k];
      if (!d.attached) continue;
      var p = rb.points[rb.dropPointIndices[k]];
      if (dist(mouseX, mouseY, p.pos.x, p.pos.y) > r0) continue;
      var beadSpeed = p.pos.dist(p.oldPos);
      var beadSwing = beadSpeed >= DETACH_BEAD_SPEED_MIN;
      if (!mouseFast && !mouseDrag && !beadSwing) continue;
      if (random() < DETACH_PROBABILITY) {
        var v = p.pos.copy().sub(p.oldPos);
        fallingDrops.push({
          x: p.pos.x, y: p.pos.y,
          vx: v.x * 0.65 + random(-1.2, 1.2),
          vy: v.y * 0.65 + random(1.2, 4),
          img: d.img, w: d.w, h: d.h,
        });
        d.attached = false;
        detached++;
      }
    }
  }
}

function stepFallingDrops() {
  for (var i = fallingDrops.length - 1; i >= 0; i--) {
    var f = fallingDrops[i];
    f.vy += FALLING_DROP_GRAVITY;
    f.vx *= FALLING_DROP_DRAG;
    f.vy *= FALLING_DROP_DRAG;
    f.x += f.vx;
    f.y += f.vy;
    if (f.y > height + 100 || f.x < -120 || f.x > width + 120) {
      fallingDrops.splice(i, 1);
    }
  }
}

// ============================================================
// 落稳判定
// ============================================================

function maybeFinishCurtainFall() {
  if (curtainState !== "falling" || curtainBodies.length === 0) return;

  var kin = 0, off = 0;
  var nL = curtainBodies.length;
  for (var bi = 0; bi < curtainBodies.length; bi++) {
    var rb = curtainBodies[bi];
    var base = curtainLineFromTo[rb.lineIndex];
    var y1b = base.y1;
    for (var i = 1; i < rb.points.length; i++) {
      var p = rb.points[i];
      kin += p.pos.dist(p.oldPos);
      var tY = y1b + rb.restYFromTop[i];
      off += abs(p.pos.y - tY);
    }
  }
  var offLimit = FALL_SETTLE_OFF_LINE * nL * FALL_SETTLE_OFF_MULT;
  if (kin < FALL_SETTLE_KIN_SCALE * max(1, nL) && off < offLimit) {
    settleStable++;
  } else {
    settleStable = 0;
  }
  if (settleStable >= FALL_SETTLE_STABLE_FRAMES || millis() - curtainLoadMs > FALL_FORCE_LIVE_MS) {
    curtainState = "live";
  }
}

// ============================================================
// 绘制函数
// ============================================================

function drawDropImage(drop, x, y) {
  if (!drop.img || drop.img.width === 0) {
    if (hasValidImages()) {
      drop.img = pickDropImage();
      if (drop.img) {
        var sc = random(DROP_SIZE_MIN, DROP_SIZE_MAX);
        drop.w = drop.img.width * sc;
        drop.h = drop.img.height * sc;
      }
    }
  }
  if (drop.img && drop.img.width > 0) {
    var ctx = drawingContext;
    ctx.drawImage(drop.img, x - drop.w / 2, y - drop.h / 2, drop.w, drop.h);
  } else {
    noStroke();
    fill(80, 130, 200, 160);
    var r = drop.w * 0.5;
    ellipse(x, y, r, r);
  }
}

function loadDropImages(onAllDone) {
  var loaded = 0;
  for (var i = 0; i < DROP_URLS.length; i++) {
    (function (idx) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        loaded++;
        dropImages[idx] = img;
        if (loaded === DROP_URLS.length && onAllDone) onAllDone();
      };
      img.onerror = function () {
        loaded++;
        dropImages[idx] = null;
        if (loaded === DROP_URLS.length && onAllDone) onAllDone();
      };
      img.src = DROP_URLS[idx];
    })(i);
  }
}

function setup() {
  createCanvas(800, 800);
  background("#ffffff");

  initCurtainLines();
  buildDrops();

  initVerletCurtain();
  curtainState = "live";

  console.log("雨帘已初始化: " + curtainLineFromTo.length + " 根帘线, " + curtainDrops.length + " 颗雨滴");

  loadDropImages(function () {
    var loaded = 0;
    for (var i = 0; i < dropImages.length; i++) {
      if (dropImages[i] && dropImages[i].width > 0) loaded++;
    }
    console.log("图片加载完成: " + loaded + "/" + DROP_URLS.length + " 张成功");
  });
}

function draw() {
  background("#ffffff");

  if (curtainBodies.length === 0) {
    noStroke();
    fill(150);
    textAlign(CENTER, CENTER);
    textSize(16);
    text("loading...", width / 2, height / 2);
    return;
  }

  updateCurtainAnchors();
  for (var bi = 0; bi < curtainBodies.length; bi++) {
    curtainBodies[bi].sim();
  }
  maybeFinishCurtainFall();
  maybeDetachDropsFromAgitation();
  stepFallingDrops();

  push();
  var cc = color(CURTAIN_COLOR);
  stroke(red(cc), green(cc), blue(cc), CURTAIN_STROKE_ALPHA);
  strokeWeight(CURTAIN_STROKE_WEIGHT);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  for (var bi = 0; bi < curtainBodies.length; bi++) {
    var pts = curtainBodies[bi].points;
    for (var j = 0; j < pts.length - 1; j++) {
      line(pts[j].pos.x, pts[j].pos.y, pts[j + 1].pos.x, pts[j + 1].pos.y);
    }
  }
  pop();

  imageMode(CENTER);
  for (var bi = 0; bi < curtainBodies.length; bi++) {
    var rb = curtainBodies[bi];
    for (var k = 0; k < rb.drops.length; k++) {
      var d = rb.drops[k];
      if (!d.attached) continue;
      var p = rb.points[rb.dropPointIndices[k]];
      drawDropImage(d, p.pos.x, p.pos.y);
    }
  }
  for (var fi = 0; fi < fallingDrops.length; fi++) {
    var f = fallingDrops[fi];
    drawDropImage(f, f.x, f.y);
  }
  imageMode(CORNER);
}
