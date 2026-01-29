const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();

const PETAL_COUNT = 90;
const petals = [];
const rand = (a, b) => a + Math.random() * (b - a);

function resetPetal(p, fromTop = true) {
  p.x = rand(0, innerWidth);
  p.y = fromTop ? rand(-innerHeight * 0.2, 0) : rand(0, innerHeight);
  p.size = rand(6, 14);
  p.fall = rand(40, 90);
  p.drift = rand(-15, 15);
  p.rot = rand(0, Math.PI * 2);
  p.rotSpeed = rand(-2.2, 2.2);
  p.wobblePhase = rand(0, Math.PI * 2);
  p.wobbleAmp = rand(4, 16);
  p.wobbleSpeed = rand(0.6, 1.6);
  p.alpha = rand(0.6, 0.95);
}

for (let i = 0; i < PETAL_COUNT; i++) {
  const p = {};
  resetPetal(p, false);
  petals.push(p);
}

function drawPetal(x, y, size, rot, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;

  const g = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 1, 0, 0, size * 1.4);
  g.addColorStop(0, "rgba(255, 210, 230, 0.95)");
  g.addColorStop(1, "rgba(255, 150, 190, 0.85)");
  ctx.fillStyle = g;

  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.9, -size * 0.9, size * 1.2, size * 0.2, 0, size);
  ctx.bezierCurveTo(-size * 1.2, size * 0.2, -size * 0.9, -size * 0.9, 0, -size);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.9);
  ctx.lineTo(0, size * 0.9);
  ctx.stroke();

  ctx.restore();
}

const debugEl = document.getElementById("debug");

let tiltX = 0;
let tiltY = 0;

const smooth = (prev, next, k) => prev + (next - prev) * k;

const ua = navigator.userAgent || navigator.vendor || window.opera;
const isIOS = /iPad|iPhone|iPod/.test(ua);
const isAndroid = /Android/.test(ua);

const osSignX = isAndroid ? -1 : 1;

function getScreenAngle() {
  const a = screen?.orientation?.angle;
  if (typeof a === "number") return a;
  const w = window.orientation;
  if (typeof w === "number") return w;
  return 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeToScreenAxes(ax, ay) {
  const angle = ((getScreenAngle() % 360) + 360) % 360;
  let sx = ax;
  let sy = ay;

  if (angle === 90) {
    sx = ay; sy = -ax;
  } else if (angle === 180) {
    sx = -ax; sy = -ay;
  } else if (angle === 270) {
    sx = -ay; sy = ax;
  }

  return { sx, sy, angle };
}

function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a) return;

  const ax = a.x ?? 0;
  const ay = a.y ?? 0;
  const az = a.z ?? 0;

  const { sx, sy, angle } = normalizeToScreenAxes(ax, ay);

  const nx = clamp(sx / 9.8, -1, 1);
  const ny = clamp(sy / 9.8, -1, 1);

  tiltX = smooth(tiltX, nx * osSignX, 0.12);
  tiltY = smooth(tiltY, ny, 0.12);

  debugEl.textContent =
    `OS:${isIOS ? "iOS" : isAndroid ? "Android" : "Other"} angle:${angle} tiltX:${tiltX.toFixed(2)}`;
}

const btn = document.getElementById("btn");
btn.addEventListener("click", async () => {
  try {
    if (typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function") {
      const res = await DeviceMotionEvent.requestPermission();
      if (res !== "granted") {
        btn.textContent = "許可されませんでした";
        return;
      }
    }
    window.addEventListener("devicemotion", onMotion, { passive: true });
    btn.textContent = "許可OK";
    btn.disabled = true;
  } catch (err) {
    btn.textContent = "失敗しました";
  }
});

let last = performance.now();

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = "rgba(11,16,32,1)";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  const wind = tiltX * 90;
  const gravityBoost = tiltY * -20;

  for (const p of petals) {
    p.wobblePhase += p.wobbleSpeed * dt;

    const wobble = Math.sin(p.wobblePhase) * p.wobbleAmp;
    const vx = p.drift + wind;
    const vy = p.fall + gravityBoost;

    p.x += vx * dt + wobble * dt;
    p.y += vy * dt;
    p.rot += p.rotSpeed * dt;

    if (p.y > innerHeight + 30 || p.x < -60 || p.x > innerWidth + 60) {
      resetPetal(p, true);
      if (wind > 30) p.x = rand(-30, innerWidth * 0.2);
      if (wind < -30) p.x = rand(innerWidth * 0.8, innerWidth + 30);
    }

    drawPetal(p.x, p.y, p.size, p.rot, p.alpha);
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
