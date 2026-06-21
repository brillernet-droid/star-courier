const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const bestEl = document.querySelector("#best");
const startOverlay = document.querySelector("#startOverlay");
const pauseOverlay = document.querySelector("#pauseOverlay");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const finalScoreEl = document.querySelector("#finalScore");
const finalTextEl = document.querySelector("#finalText");

const startButton = document.querySelector("#startButton");
const resumeButton = document.querySelector("#resumeButton");
const restartButton = document.querySelector("#restartButton");

const storageKey = "star-courier-best-score";
const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };

let width = 960;
let height = 540;
let dpr = 1;
let lastTime = performance.now();
let mode = "ready";
let spawnTimer = 0;
let hazardTimer = 0;
let score = 0;
let combo = 1;
let best = Number(localStorage.getItem(storageKey) || 0);
let elapsed = 0;
let shake = 0;

const ship = {
  x: 160,
  y: 270,
  radius: 17,
  vx: 0,
  vy: 0,
  boost: 1,
  invincible: 0,
};

const sparks = [];
const hazards = [];
const particles = [];
const stars = Array.from({ length: 90 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.6 + Math.random() * 1.6,
  s: 0.1 + Math.random() * 0.7,
  a: 0.25 + Math.random() * 0.65,
}));

bestEl.textContent = best;

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(320, Math.floor(rect.width));
  height = Math.max(280, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetGame() {
  score = 0;
  combo = 1;
  elapsed = 0;
  spawnTimer = 0;
  hazardTimer = 0;
  shake = 0;
  ship.x = width * 0.22;
  ship.y = height * 0.5;
  ship.vx = 0;
  ship.vy = 0;
  ship.boost = 1;
  ship.invincible = 1.4;
  sparks.length = 0;
  hazards.length = 0;
  particles.length = 0;
  updateHud();
  for (let i = 0; i < 6; i += 1) {
    spawnSpark();
  }
}

function startGame() {
  resetGame();
  mode = "playing";
  hideAllOverlays();
}

function pauseGame() {
  if (mode !== "playing") return;
  mode = "paused";
  pauseOverlay.classList.add("is-visible");
}

function resumeGame() {
  if (mode !== "paused") return;
  mode = "playing";
  pauseOverlay.classList.remove("is-visible");
  lastTime = performance.now();
}

function endGame() {
  mode = "over";
  if (score > best) {
    best = score;
    localStorage.setItem(storageKey, String(best));
  }
  finalScoreEl.textContent = `得分 ${score}`;
  finalTextEl.textContent =
    score === best ? "新纪录已写入航线。" : `当前最佳成绩是 ${best}。`;
  updateHud();
  gameOverOverlay.classList.add("is-visible");
}

function hideAllOverlays() {
  startOverlay.classList.remove("is-visible");
  pauseOverlay.classList.remove("is-visible");
  gameOverOverlay.classList.remove("is-visible");
}

function updateHud() {
  scoreEl.textContent = score;
  comboEl.textContent = `x${combo}`;
  bestEl.textContent = best;
}

function spawnSpark() {
  sparks.push({
    x: width + 40 + Math.random() * 180,
    y: 40 + Math.random() * Math.max(40, height - 80),
    radius: 10 + Math.random() * 7,
    speed: 95 + Math.random() * 80 + elapsed * 3,
    phase: Math.random() * Math.PI * 2,
  });
}

function spawnHazard() {
  const size = 18 + Math.random() * 24 + Math.min(elapsed * 0.25, 18);
  hazards.push({
    x: width + size + Math.random() * 80,
    y: size + Math.random() * Math.max(40, height - size * 2),
    radius: size,
    speed: 130 + Math.random() * 100 + elapsed * 4,
    spin: (Math.random() - 0.5) * 3,
    angle: Math.random() * Math.PI * 2,
    points: Array.from({ length: 10 }, (_, index) =>
      index % 2 === 0 ? 1 : 0.54 + Math.random() * 0.08,
    ),
  });
}

function addBurst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.4;
    const speed = 80 + Math.random() * 180;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      radius: 2 + Math.random() * 3,
      color,
    });
  }
}

function getInputVector() {
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;

  if (pointer.active) {
    const deltaX = pointer.x - ship.x;
    const deltaY = pointer.y - ship.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > 8) {
      dx += deltaX / distance;
      dy += deltaY / distance;
    }
  }

  const length = Math.hypot(dx, dy);
  if (length > 0) {
    dx /= length;
    dy /= length;
  }

  return { dx, dy, boosting: keys.has(" ") || keys.has("boost") };
}

function update(dt) {
  if (mode !== "playing") return;

  elapsed += dt;
  spawnTimer -= dt;
  hazardTimer -= dt;
  shake = Math.max(0, shake - dt * 12);
  ship.invincible = Math.max(0, ship.invincible - dt);

  if (spawnTimer <= 0) {
    spawnSpark();
    spawnTimer = Math.max(0.34, 0.78 - elapsed * 0.012);
  }

  if (hazardTimer <= 0) {
    spawnHazard();
    hazardTimer = Math.max(0.42, 1.05 - elapsed * 0.018);
  }

  const input = getInputVector();
  const boostTarget = input.boosting ? 1.75 : 1;
  ship.boost += (boostTarget - ship.boost) * Math.min(1, dt * 8);

  const acceleration = 820 * ship.boost;
  ship.vx += input.dx * acceleration * dt;
  ship.vy += input.dy * acceleration * dt;
  ship.vx *= Math.pow(0.025, dt);
  ship.vy *= Math.pow(0.025, dt);
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  ship.x = clamp(ship.x, ship.radius + 8, width - ship.radius - 8);
  ship.y = clamp(ship.y, ship.radius + 8, height - ship.radius - 8);

  for (const spark of sparks) {
    spark.x -= spark.speed * dt;
    spark.phase += dt * 5;
  }

  for (const hazard of hazards) {
    hazard.x -= hazard.speed * dt;
    hazard.angle += hazard.spin * dt;
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.05, dt);
    particle.vy *= Math.pow(0.05, dt);
    if (particle.life <= 0) particles.splice(i, 1);
  }

  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    if (spark.x < -40) {
      sparks.splice(i, 1);
      combo = Math.max(1, combo - 1);
      updateHud();
      continue;
    }

    if (collides(ship, spark)) {
      sparks.splice(i, 1);
      const gained = 10 * combo;
      score += gained;
      combo = Math.min(9, combo + 1);
      addBurst(spark.x, spark.y, "#7ef2b0", 16);
      updateHud();
    }
  }

  for (let i = hazards.length - 1; i >= 0; i -= 1) {
    const hazard = hazards[i];
    if (hazard.x < -hazard.radius - 40) {
      hazards.splice(i, 1);
      score += combo;
      updateHud();
      continue;
    }

    if (ship.invincible <= 0 && collides(ship, hazard, 0.75)) {
      addBurst(ship.x, ship.y, "#ff6b6b", 28);
      shake = 10;
      endGame();
      return;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;

  ctx.save();
  ctx.translate(sx, sy);
  drawSpace();
  drawRouteLines();

  for (const spark of sparks) {
    drawSpark(spark);
  }

  for (const hazard of hazards) {
    drawHazard(hazard);
  }

  for (const particle of particles) {
    drawParticle(particle);
  }

  drawShip();
  ctx.restore();
}

function drawSpace() {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111821");
  gradient.addColorStop(0.48, "#101218");
  gradient.addColorStop(1, "#171116");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    const x = (star.x * width - elapsed * 18 * star.s) % width;
    const y = star.y * height;
    ctx.globalAlpha = star.a;
    ctx.fillStyle = "#f8f5ea";
    ctx.beginPath();
    ctx.arc(x < 0 ? x + width : x, y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRouteLines() {
  ctx.save();
  ctx.strokeStyle = "rgba(120, 217, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let y = 80; y < height; y += 82) {
    ctx.beginPath();
    for (let x = -40; x < width + 40; x += 24) {
      const wave = Math.sin(x * 0.018 + elapsed * 1.4 + y) * 8;
      if (x === -40) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  const angle = Math.atan2(ship.vy, Math.max(90, ship.vx + 120)) * 0.55;
  ctx.rotate(angle);

  const flame = 14 + Math.sin(elapsed * 24) * 4 + (ship.boost - 1) * 16;
  ctx.fillStyle = "rgba(255, 209, 102, 0.78)";
  ctx.beginPath();
  ctx.moveTo(-19, -8);
  ctx.lineTo(-19 - flame, 0);
  ctx.lineTo(-19, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = ship.invincible > 0 ? "#ffffff" : "#78d9ff";
  ctx.strokeStyle = "#101218";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-14, -17);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7ef2b0";
  ctx.beginPath();
  ctx.arc(1, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSpark(spark) {
  const pulse = Math.sin(spark.phase) * 0.18 + 1;
  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.phase * 0.55);
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#7ef2b0";
  ctx.fillStyle = "#7ef2b0";
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? spark.radius * pulse : spark.radius * 0.46;
    const angle = (Math.PI * 2 * i) / 8;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHazard(hazard) {
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  ctx.rotate(hazard.angle);
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(255, 107, 107, 0.7)";
  ctx.fillStyle = "#ff6b6b";
  ctx.strokeStyle = "#3b1517";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = hazard.radius * hazard.points[i];
    const angle = (Math.PI * 2 * i) / 10;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticle(particle) {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function collides(a, b, scale = 1) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) < (a.radius + b.radius) * scale;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)) {
    event.preventDefault();
  }
  if (key === "p") {
    mode === "paused" ? resumeGame() : pauseGame();
    return;
  }
  if (key === "enter" && (mode === "ready" || mode === "over")) {
    startGame();
    return;
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  if (mode === "ready" || mode === "over") {
    startGame();
  }
  pointer.active = true;
  updatePointer(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  updatePointer(event);
});

canvas.addEventListener("pointerup", () => {
  pointer.active = false;
});

canvas.addEventListener("pointercancel", () => {
  pointer.active = false;
});

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
}

document.querySelectorAll(".touch-btn").forEach((button) => {
  const dir = button.dataset.dir;
  const press = (event) => {
    event.preventDefault();
    if (dir === "up") keys.add("w");
    if (dir === "down") keys.add("s");
    if (dir === "left") keys.add("a");
    if (dir === "right") keys.add("d");
    if (dir === "boost") keys.add("boost");
  };
  const release = () => {
    if (dir === "up") keys.delete("w");
    if (dir === "down") keys.delete("s");
    if (dir === "left") keys.delete("a");
    if (dir === "right") keys.delete("d");
    if (dir === "boost") keys.delete("boost");
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
});

startButton.addEventListener("click", startGame);
resumeButton.addEventListener("click", resumeGame);
restartButton.addEventListener("click", startGame);

resize();
draw();
requestAnimationFrame(loop);
