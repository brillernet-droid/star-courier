const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  startOverlay: document.querySelector("#startOverlay"),
  pauseOverlay: document.querySelector("#pauseOverlay"),
  gameOverOverlay: document.querySelector("#gameOverOverlay"),
  startButton: document.querySelector("#startButton"),
  resumeButton: document.querySelector("#resumeButton"),
  restartButton: document.querySelector("#restartButton"),
  finalScore: document.querySelector("#finalScore"),
  finalText: document.querySelector("#finalText"),
  p1Label: document.querySelector("#p1Label"),
  p2Label: document.querySelector("#p2Label"),
  p1Health: document.querySelector("#p1Health"),
  p2Health: document.querySelector("#p2Health"),
  p1HpBar: document.querySelector("#p1HpBar"),
  p2HpBar: document.querySelector("#p2HpBar"),
  p1EnergyBar: document.querySelector("#p1EnergyBar"),
  p2EnergyBar: document.querySelector("#p2EnergyBar"),
  roundTimer: document.querySelector("#roundTimer"),
  modeLabel: document.querySelector("#modeLabel"),
  p1ClassGrid: document.querySelector("#p1ClassGrid"),
  p2ClassGrid: document.querySelector("#p2ClassGrid"),
  modeButtons: Array.from(document.querySelectorAll(".mode-option")),
};

const CLASSES = {
  striker: {
    name: "疾影",
    type: "突袭型",
    color: "#78d9ff",
    hp: 118,
    speed: 285,
    accel: 920,
    radius: 17,
    fireRate: 0.18,
    bulletSpeed: 620,
    bulletDamage: 6,
    bulletRadius: 4,
    shots: 2,
    spread: 0.14,
    skillName: "裂隙突进",
    skillCost: 36,
    skillCooldown: 5.2,
    summary: "高速、多弹道、突进爆发",
  },
  warden: {
    name: "堡垒",
    type: "防御型",
    color: "#ffd166",
    hp: 156,
    speed: 205,
    accel: 740,
    radius: 22,
    fireRate: 0.33,
    bulletSpeed: 440,
    bulletDamage: 13,
    bulletRadius: 6,
    shots: 1,
    spread: 0,
    skillName: "护盾矩阵",
    skillCost: 42,
    skillCooldown: 7.4,
    summary: "高血量、重炮、短时护盾",
  },
  pulse: {
    name: "脉冲",
    type: "控场型",
    color: "#d8a2ff",
    hp: 128,
    speed: 242,
    accel: 820,
    radius: 19,
    fireRate: 0.25,
    bulletSpeed: 520,
    bulletDamage: 8,
    bulletRadius: 5,
    shots: 1,
    spread: 0,
    skillName: "静滞脉冲",
    skillCost: 40,
    skillCooldown: 6.4,
    summary: "均衡、减速、压制走位",
  },
};

const keys = new Set();
const touches = new Set();
const config = {
  mode: "ai",
  p1Class: "striker",
  p2Class: "warden",
};

let width = 960;
let height = 540;
let dpr = 1;
let lastTime = performance.now();
let phase = "menu";
let elapsed = 0;
let roundTime = 90;
let shake = 0;
let orbTimer = 0;
let hazardTimer = 0;

const fighters = [];
const projectiles = [];
const orbs = [];
const hazards = [];
const particles = [];
const stars = Array.from({ length: 110 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.55 + Math.random() * 1.55,
  s: 0.15 + Math.random() * 0.75,
  a: 0.18 + Math.random() * 0.62,
}));

buildLobby();
resize();
updateLobby();
draw();
requestAnimationFrame(loop);

function buildLobby() {
  renderClassGrid("p1", ui.p1ClassGrid);
  renderClassGrid("p2", ui.p2ClassGrid);

  ui.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      config.mode = button.dataset.mode;
      updateLobby();
    });
  });

  ui.startButton.addEventListener("click", startMatch);
  ui.resumeButton.addEventListener("click", resumeMatch);
  ui.restartButton.addEventListener("click", startMatch);

  document.querySelectorAll(".touch-btn").forEach((button) => {
    const action = button.dataset.action;
    const press = (event) => {
      event.preventDefault();
      touches.add(action);
    };
    const release = () => touches.delete(action);
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
  });
}

function renderClassGrid(side, container) {
  container.innerHTML = "";
  Object.entries(CLASSES).forEach(([key, data]) => {
    const button = document.createElement("button");
    button.className = "class-option";
    button.type = "button";
    button.dataset.side = side;
    button.dataset.classKey = key;
    button.innerHTML = `
      <span class="class-topline">
        <strong class="class-name">${data.name}</strong>
        <span class="class-type">${data.type}</span>
      </span>
      <span class="class-stats">${data.summary}</span>
    `;
    button.querySelector(".class-type").style.background = data.color;
    button.addEventListener("click", () => {
      if (side === "p1") config.p1Class = key;
      else config.p2Class = key;
      updateLobby();
    });
    container.appendChild(button);
  });
}

function updateLobby() {
  ui.modeButtons.forEach((button) => {
    const selected = button.dataset.mode === config.mode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  document.querySelectorAll(".class-option").forEach((button) => {
    const side = button.dataset.side;
    const selectedClass = side === "p1" ? config.p1Class : config.p2Class;
    const selected = button.dataset.classKey === selectedClass;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const p1Class = CLASSES[config.p1Class];
  const p2Class = CLASSES[config.p2Class];
  ui.p1Label.textContent = `P1 ${p1Class.name}`;
  ui.p2Label.textContent = `${config.mode === "ai" ? "AI" : "P2"} ${p2Class.name}`;
  ui.p1Health.textContent = p1Class.hp;
  ui.p2Health.textContent = p2Class.hp;
  ui.modeLabel.textContent = config.mode === "ai" ? "单人对战" : "双人同屏";
  setBar(ui.p1HpBar, 1);
  setBar(ui.p2HpBar, 1);
  setBar(ui.p1EnergyBar, 0.55);
  setBar(ui.p2EnergyBar, 0.55);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(340, Math.floor(rect.width));
  height = Math.max(300, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function startMatch() {
  phase = "playing";
  elapsed = 0;
  roundTime = 90;
  shake = 0;
  orbTimer = 0.7;
  hazardTimer = 2.4;
  fighters.length = 0;
  projectiles.length = 0;
  orbs.length = 0;
  hazards.length = 0;
  particles.length = 0;

  fighters.push(createFighter(1, config.p1Class, width * 0.2, height * 0.5, false));
  fighters.push(
    createFighter(2, config.p2Class, width * 0.8, height * 0.5, config.mode === "ai"),
  );

  for (let i = 0; i < 4; i += 1) spawnOrb();
  hideOverlays();
  updateHud();
  lastTime = performance.now();
}

function createFighter(id, classKey, x, y, ai) {
  const data = CLASSES[classKey];
  return {
    id,
    ai,
    classKey,
    data,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: id === 1 ? 0 : Math.PI,
    radius: data.radius,
    hp: data.hp,
    maxHp: data.hp,
    energy: 58,
    maxEnergy: 100,
    fireCooldown: 0,
    skillCooldown: 0,
    shieldTimer: 0,
    slowTimer: 0,
    invulnerable: 0.9,
    hitFlash: 0,
    aiClock: Math.random() * 10,
  };
}

function pauseMatch() {
  if (phase !== "playing") return;
  phase = "paused";
  ui.pauseOverlay.classList.add("is-visible");
}

function resumeMatch() {
  if (phase !== "paused") return;
  phase = "playing";
  ui.pauseOverlay.classList.remove("is-visible");
  lastTime = performance.now();
}

function endMatch(reason = "knockout") {
  if (phase === "over") return;
  phase = "over";

  const [p1, p2] = fighters;
  let winner = null;
  if (reason === "timeout") {
    if (p1.hp > p2.hp) winner = p1;
    if (p2.hp > p1.hp) winner = p2;
  } else {
    winner = p1.hp > 0 ? p1 : p2.hp > 0 ? p2 : null;
  }

  if (!winner) {
    ui.finalScore.textContent = "平局";
    ui.finalText.textContent = "双方都把航线打到极限。";
  } else {
    const label = winner.id === 1 ? "P1" : config.mode === "ai" ? "AI" : "P2";
    ui.finalScore.textContent = `${label} 获胜`;
    ui.finalText.textContent = `${winner.data.name} 完成压制，剩余 ${Math.ceil(winner.hp)} HP。`;
  }

  ui.gameOverOverlay.classList.add("is-visible");
  updateHud();
}

function hideOverlays() {
  ui.startOverlay.classList.remove("is-visible");
  ui.pauseOverlay.classList.remove("is-visible");
  ui.gameOverOverlay.classList.remove("is-visible");
}

function updateHud() {
  if (fighters.length < 2) {
    updateLobby();
    return;
  }

  const [p1, p2] = fighters;
  ui.p1Label.textContent = `P1 ${p1.data.name}`;
  ui.p2Label.textContent = `${config.mode === "ai" ? "AI" : "P2"} ${p2.data.name}`;
  ui.p1Health.textContent = Math.max(0, Math.ceil(p1.hp));
  ui.p2Health.textContent = Math.max(0, Math.ceil(p2.hp));
  ui.roundTimer.textContent = Math.ceil(roundTime);
  ui.modeLabel.textContent = config.mode === "ai" ? "单人对战" : "双人同屏";
  setBar(ui.p1HpBar, p1.hp / p1.maxHp);
  setBar(ui.p2HpBar, p2.hp / p2.maxHp);
  setBar(ui.p1EnergyBar, p1.energy / p1.maxEnergy);
  setBar(ui.p2EnergyBar, p2.energy / p2.maxEnergy);
}

function setBar(element, ratio) {
  element.style.width = `${clamp(ratio, 0, 1) * 100}%`;
}

function update(dt) {
  if (phase !== "playing") return;

  elapsed += dt;
  roundTime = Math.max(0, roundTime - dt);
  shake = Math.max(0, shake - dt * 18);
  orbTimer -= dt;
  hazardTimer -= dt;

  if (roundTime <= 0) {
    endMatch("timeout");
    return;
  }

  if (orbTimer <= 0) {
    spawnOrb();
    orbTimer = 2.4 + Math.random() * 1.2;
  }

  if (hazardTimer <= 0) {
    spawnHazard();
    hazardTimer = 4.2 + Math.random() * 1.8;
  }

  for (const fighter of fighters) {
    updateFighter(fighter, dt);
  }

  updateProjectiles(dt);
  updateOrbs(dt);
  updateHazards(dt);
  updateParticles(dt);
  updateHud();
}

function updateFighter(fighter, dt) {
  const target = getOpponent(fighter);
  const input = fighter.ai ? getAiInput(fighter, target, dt) : getHumanInput(fighter);
  const slowFactor = fighter.slowTimer > 0 ? 0.58 : 1;
  const speedLimit = fighter.data.speed * slowFactor;

  fighter.fireCooldown = Math.max(0, fighter.fireCooldown - dt);
  fighter.skillCooldown = Math.max(0, fighter.skillCooldown - dt);
  fighter.shieldTimer = Math.max(0, fighter.shieldTimer - dt);
  fighter.slowTimer = Math.max(0, fighter.slowTimer - dt);
  fighter.invulnerable = Math.max(0, fighter.invulnerable - dt);
  fighter.hitFlash = Math.max(0, fighter.hitFlash - dt);
  fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + dt * 9.5);

  const targetAngle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
  fighter.angle = lerpAngle(fighter.angle, targetAngle, Math.min(1, dt * 8));

  fighter.vx += input.x * fighter.data.accel * slowFactor * dt;
  fighter.vy += input.y * fighter.data.accel * slowFactor * dt;
  dampVelocity(fighter, dt);
  limitVelocity(fighter, speedLimit);

  fighter.x += fighter.vx * dt;
  fighter.y += fighter.vy * dt;
  keepInArena(fighter);

  if (input.fire) fireWeapon(fighter);
  if (input.skill) useSkill(fighter, target);
}

function getHumanInput(fighter) {
  if (fighter.id === 1) {
    let x = 0;
    let y = 0;
    if (keys.has("a") || touches.has("left")) x -= 1;
    if (keys.has("d") || touches.has("right")) x += 1;
    if (keys.has("w") || touches.has("up")) y -= 1;
    if (keys.has("s") || touches.has("down")) y += 1;
    return normalizeInput({
      x,
      y,
      fire: keys.has("space") || touches.has("fire"),
      skill: keys.has("shift") || touches.has("skill"),
    });
  }

  let x = 0;
  let y = 0;
  if (keys.has("arrowleft")) x -= 1;
  if (keys.has("arrowright")) x += 1;
  if (keys.has("arrowup")) y -= 1;
  if (keys.has("arrowdown")) y += 1;
  return normalizeInput({
    x,
    y,
    fire: keys.has("enter"),
    skill: keys.has("/"),
  });
}

function getAiInput(fighter, target, dt) {
  fighter.aiClock += dt;
  const dx = target.x - fighter.x;
  const dy = target.y - fighter.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / distance;
  const ny = dy / distance;
  const preferred = fighter.classKey === "warden" ? 380 : fighter.classKey === "pulse" ? 330 : 265;
  let x = 0;
  let y = 0;

  if (distance > preferred + 45) {
    x += nx;
    y += ny;
  } else if (distance < preferred - 65) {
    x -= nx;
    y -= ny;
  }

  const strafe = Math.sin(fighter.aiClock * 1.9 + fighter.id) * 0.8;
  x += -ny * strafe;
  y += nx * strafe;

  for (const projectile of projectiles) {
    if (projectile.ownerId === fighter.id) continue;
    const danger = Math.hypot(projectile.x - fighter.x, projectile.y - fighter.y);
    if (danger < 135) {
      x += (fighter.x - projectile.x) / Math.max(1, danger);
      y += (fighter.y - projectile.y) / Math.max(1, danger);
    }
  }

  const shouldFire = distance < 720 && fighter.fireCooldown <= 0;
  let shouldSkill = false;
  if (fighter.energy >= fighter.data.skillCost && fighter.skillCooldown <= 0) {
    if (fighter.classKey === "striker") shouldSkill = distance < 380;
    if (fighter.classKey === "warden") shouldSkill = fighter.hp / fighter.maxHp < 0.58 || distance < 230;
    if (fighter.classKey === "pulse") shouldSkill = distance < 500 && target.slowTimer <= 0;
  }

  return normalizeInput({ x, y, fire: shouldFire, skill: shouldSkill });
}

function normalizeInput(input) {
  const length = Math.hypot(input.x, input.y);
  if (length > 0) {
    input.x /= length;
    input.y /= length;
  }
  return input;
}

function fireWeapon(fighter) {
  if (fighter.fireCooldown > 0) return;

  const data = fighter.data;
  const count = data.shots;
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * data.spread;
    spawnProjectile(fighter, {
      angle: fighter.angle + offset,
      speed: data.bulletSpeed,
      damage: data.bulletDamage,
      radius: data.bulletRadius,
      life: 1.45,
      color: data.color,
    });
  }

  fighter.fireCooldown = data.fireRate;
  fighter.vx -= Math.cos(fighter.angle) * 18;
  fighter.vy -= Math.sin(fighter.angle) * 18;
  addBurst(
    fighter.x + Math.cos(fighter.angle) * fighter.radius,
    fighter.y + Math.sin(fighter.angle) * fighter.radius,
    data.color,
    4,
  );
}

function useSkill(fighter, target) {
  const data = fighter.data;
  if (fighter.skillCooldown > 0 || fighter.energy < data.skillCost) return;

  fighter.energy -= data.skillCost;
  fighter.skillCooldown = data.skillCooldown;

  if (fighter.classKey === "striker") {
    const angle = Math.atan2(target.y - fighter.y, target.x - fighter.x);
    fighter.vx += Math.cos(angle) * 720;
    fighter.vy += Math.sin(angle) * 720;
    fighter.invulnerable = Math.max(fighter.invulnerable, 0.22);
    for (let i = 0; i < 5; i += 1) {
      spawnProjectile(fighter, {
        angle: angle + (i - 2) * 0.16,
        speed: 650,
        damage: 5,
        radius: 4,
        life: 0.78,
        color: data.color,
      });
    }
    addBurst(fighter.x, fighter.y, data.color, 18);
    return;
  }

  if (fighter.classKey === "warden") {
    fighter.shieldTimer = 2.55;
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + 8);
    addBurst(fighter.x, fighter.y, data.color, 24);
    return;
  }

  spawnProjectile(fighter, {
    angle: fighter.angle,
    speed: 430,
    damage: 20,
    radius: 18,
    life: 1.18,
    color: data.color,
    slow: 1.9,
    pulse: true,
  });
  addBurst(fighter.x, fighter.y, data.color, 14);
}

function spawnProjectile(fighter, options) {
  const cos = Math.cos(options.angle);
  const sin = Math.sin(options.angle);
  projectiles.push({
    ownerId: fighter.id,
    x: fighter.x + cos * (fighter.radius + options.radius + 3),
    y: fighter.y + sin * (fighter.radius + options.radius + 3),
    vx: cos * options.speed + fighter.vx * 0.12,
    vy: sin * options.speed + fighter.vy * 0.12,
    damage: options.damage,
    radius: options.radius,
    color: options.color,
    life: options.life,
    slow: options.slow || 0,
    pulse: Boolean(options.pulse),
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.life -= dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    if (
      projectile.life <= 0 ||
      projectile.x < -40 ||
      projectile.x > width + 40 ||
      projectile.y < -40 ||
      projectile.y > height + 40
    ) {
      projectiles.splice(i, 1);
      continue;
    }

    const target = fighters.find((fighter) => fighter.id !== projectile.ownerId);
    if (target && collides(projectile, target, 0.98)) {
      applyDamage(target, projectile.damage, projectile.ownerId, {
        slow: projectile.slow,
        forceInvuln: projectile.pulse ? 0.16 : 0.05,
      });
      addBurst(projectile.x, projectile.y, projectile.color, projectile.pulse ? 18 : 8);
      projectiles.splice(i, 1);
    }
  }
}

function spawnOrb() {
  if (orbs.length > 6) return;
  orbs.push({
    x: width * (0.18 + Math.random() * 0.64),
    y: height * (0.18 + Math.random() * 0.64),
    radius: 11 + Math.random() * 4,
    phase: Math.random() * Math.PI * 2,
  });
}

function updateOrbs(dt) {
  for (const orb of orbs) {
    orb.phase += dt * 4.2;
  }

  for (let i = orbs.length - 1; i >= 0; i -= 1) {
    const orb = orbs[i];
    for (const fighter of fighters) {
      if (!collides(orb, fighter, 1)) continue;
      fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + 34);
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + 3);
      addBurst(orb.x, orb.y, "#7ef2b0", 14);
      orbs.splice(i, 1);
      break;
    }
  }
}

function spawnHazard() {
  if (hazards.length > 4) return;
  const angle = Math.random() * Math.PI * 2;
  const radius = 18 + Math.random() * 16;
  hazards.push({
    x: width * (0.24 + Math.random() * 0.52),
    y: height * (0.2 + Math.random() * 0.6),
    vx: Math.cos(angle) * (45 + Math.random() * 40),
    vy: Math.sin(angle) * (45 + Math.random() * 40),
    radius,
    angle,
    spin: (Math.random() - 0.5) * 2,
    hitClock: 0,
    points: Array.from({ length: 12 }, (_, index) =>
      index % 2 === 0 ? 1 : 0.6 + Math.random() * 0.16,
    ),
  });
}

function updateHazards(dt) {
  for (const hazard of hazards) {
    hazard.x += hazard.vx * dt;
    hazard.y += hazard.vy * dt;
    hazard.angle += hazard.spin * dt;
    hazard.hitClock = Math.max(0, hazard.hitClock - dt);

    if (hazard.x < hazard.radius || hazard.x > width - hazard.radius) hazard.vx *= -1;
    if (hazard.y < hazard.radius || hazard.y > height - hazard.radius) hazard.vy *= -1;
    hazard.x = clamp(hazard.x, hazard.radius, width - hazard.radius);
    hazard.y = clamp(hazard.y, hazard.radius, height - hazard.radius);

    for (const fighter of fighters) {
      if (hazard.hitClock > 0 || !collides(hazard, fighter, 0.86)) continue;
      applyDamage(fighter, 12, 0, { forceInvuln: 0.32 });
      const angle = Math.atan2(fighter.y - hazard.y, fighter.x - hazard.x);
      fighter.vx += Math.cos(angle) * 260;
      fighter.vy += Math.sin(angle) * 260;
      hazard.vx -= Math.cos(angle) * 110;
      hazard.vy -= Math.sin(angle) * 110;
      hazard.hitClock = 0.35;
      shake = Math.max(shake, 5);
      addBurst(fighter.x, fighter.y, "#ff6b6b", 12);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.06, dt);
    particle.vy *= Math.pow(0.06, dt);
    if (particle.life <= 0) particles.splice(i, 1);
  }
}

function applyDamage(target, amount, sourceId, options = {}) {
  if (target.invulnerable > 0 && !options.ignoreInvuln) return;

  let finalAmount = amount;
  if (target.shieldTimer > 0) {
    finalAmount *= 0.34;
    target.energy = Math.min(target.maxEnergy, target.energy + 5);
  }

  target.hp = Math.max(0, target.hp - finalAmount);
  target.hitFlash = 0.14;
  target.invulnerable = options.forceInvuln ?? 0.06;
  if (options.slow) target.slowTimer = Math.max(target.slowTimer, options.slow);
  shake = Math.max(shake, target.shieldTimer > 0 ? 3 : 7);

  if (target.hp <= 0) {
    const attacker = fighters.find((fighter) => fighter.id === sourceId);
    if (attacker) attacker.energy = attacker.maxEnergy;
    endMatch("knockout");
  }
}

function addBurst(x, y, color, amount = 10) {
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.45;
    const speed = 70 + Math.random() * 210;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.34 + Math.random() * 0.38,
      maxLife: 0.72,
      radius: 2 + Math.random() * 3.6,
      color,
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;

  ctx.save();
  ctx.translate(sx, sy);
  drawSpace();
  drawArena();

  for (const orb of orbs) drawOrb(orb);
  for (const hazard of hazards) drawHazard(hazard);
  for (const projectile of projectiles) drawProjectile(projectile);
  for (const particle of particles) drawParticle(particle);
  for (const fighter of fighters) drawFighter(fighter);

  if (phase === "menu" && fighters.length === 0) drawMenuShips();
  ctx.restore();
}

function drawSpace() {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111820");
  gradient.addColorStop(0.52, "#0e1117");
  gradient.addColorStop(1, "#171318");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    const x = (star.x * width - elapsed * 12 * star.s) % width;
    const y = star.y * height;
    ctx.globalAlpha = star.a;
    ctx.fillStyle = "#fbf7ee";
    ctx.beginPath();
    ctx.arc(x < 0 ? x + width : x, y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawArena() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 80; x < width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 80; y < height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(126, 242, 176, 0.18)";
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawMenuShips() {
  const p1Preview = {
    ...createFighter(1, config.p1Class, width * 0.24, height * 0.52, false),
    angle: -0.12,
    invulnerable: 0,
  };
  const p2Preview = {
    ...createFighter(2, config.p2Class, width * 0.76, height * 0.52, false),
    angle: Math.PI + 0.12,
    invulnerable: 0,
  };
  drawFighter(p1Preview);
  drawFighter(p2Preview);
}

function drawFighter(fighter) {
  const data = fighter.data;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  if (fighter.shieldTimer > 0) {
    ctx.strokeStyle = "rgba(255, 209, 102, 0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 11 + Math.sin(elapsed * 16) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (fighter.slowTimer > 0) {
    ctx.strokeStyle = "rgba(216, 162, 255, 0.56)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 16, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(fighter.angle);
  const flame = 10 + Math.hypot(fighter.vx, fighter.vy) * 0.05 + Math.sin(elapsed * 20) * 2;
  ctx.fillStyle = fighter.id === 1 ? "rgba(126, 242, 176, 0.72)" : "rgba(255, 107, 107, 0.72)";
  ctx.beginPath();
  ctx.moveTo(-fighter.radius - 2, -7);
  ctx.lineTo(-fighter.radius - flame, 0);
  ctx.lineTo(-fighter.radius - 2, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = fighter.hitFlash > 0 ? "#ffffff" : data.color;
  ctx.strokeStyle = "#0e1117";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fighter.radius + 10, 0);
  ctx.lineTo(-fighter.radius * 0.75, -fighter.radius * 0.85);
  ctx.lineTo(-fighter.radius * 0.34, 0);
  ctx.lineTo(-fighter.radius * 0.75, fighter.radius * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = fighter.id === 1 ? "#7ef2b0" : "#ff6b6b";
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(4, fighter.radius * 0.28), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawFighterLabel(fighter);
}

function drawFighterLabel(fighter) {
  ctx.save();
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(251, 247, 238, 0.9)";
  const label = fighter.id === 1 ? "P1" : config.mode === "ai" ? "AI" : "P2";
  ctx.fillText(label, fighter.x, fighter.y - fighter.radius - 18);

  const barWidth = 54;
  const x = fighter.x - barWidth / 2;
  const y = fighter.y + fighter.radius + 12;
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(x, y, barWidth, 5);
  ctx.fillStyle = fighter.id === 1 ? "#7ef2b0" : "#ff6b6b";
  ctx.fillRect(x, y, barWidth * clamp(fighter.hp / fighter.maxHp, 0, 1), 5);
  ctx.restore();
}

function drawProjectile(projectile) {
  ctx.save();
  ctx.shadowBlur = projectile.pulse ? 22 : 14;
  ctx.shadowColor = projectile.color;
  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
  if (projectile.pulse) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrb(orb) {
  const pulse = 1 + Math.sin(orb.phase) * 0.16;
  ctx.save();
  ctx.translate(orb.x, orb.y);
  ctx.rotate(orb.phase * 0.5);
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#7ef2b0";
  ctx.fillStyle = "#7ef2b0";
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? orb.radius * pulse : orb.radius * 0.44;
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
  ctx.shadowBlur = 16;
  ctx.shadowColor = "rgba(255, 107, 107, 0.62)";
  ctx.fillStyle = "#783d43";
  ctx.strokeStyle = "#ff6b6b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < hazard.points.length; i += 1) {
    const radius = hazard.radius * hazard.points[i];
    const angle = (Math.PI * 2 * i) / hazard.points.length;
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

function getOpponent(fighter) {
  return fighters.find((other) => other.id !== fighter.id);
}

function keepInArena(fighter) {
  const padding = fighter.radius + 8;
  if (fighter.x < padding || fighter.x > width - padding) fighter.vx *= -0.25;
  if (fighter.y < padding || fighter.y > height - padding) fighter.vy *= -0.25;
  fighter.x = clamp(fighter.x, padding, width - padding);
  fighter.y = clamp(fighter.y, padding, height - padding);
}

function dampVelocity(fighter, dt) {
  const damping = Math.pow(0.035, dt);
  fighter.vx *= damping;
  fighter.vy *= damping;
}

function limitVelocity(fighter, maxSpeed) {
  const speed = Math.hypot(fighter.vx, fighter.vy);
  if (speed <= maxSpeed) return;
  fighter.vx = (fighter.vx / speed) * maxSpeed;
  fighter.vy = (fighter.vy / speed) * maxSpeed;
}

function collides(a, b, scale = 1) {
  return Math.hypot(a.x - b.x, a.y - b.y) < (a.radius + b.radius) * scale;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerpAngle(from, to, amount) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}

function normalKey(event) {
  if (event.key === " ") return "space";
  if (event.key === "Shift") return "shift";
  return event.key.toLowerCase();
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
  const key = normalKey(event);
  const controlledKeys = [
    "arrowleft",
    "arrowright",
    "arrowup",
    "arrowdown",
    "space",
    "shift",
    "enter",
    "/",
  ];
  if (controlledKeys.includes(key)) event.preventDefault();

  if (key === "p") {
    phase === "paused" ? resumeMatch() : pauseMatch();
    return;
  }

  if (key === "enter" && (phase === "menu" || phase === "over")) {
    startMatch();
    return;
  }

  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(normalKey(event));
});
