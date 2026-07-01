const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  startOverlay: document.querySelector("#startOverlay"),
  pauseOverlay: document.querySelector("#pauseOverlay"),
  gameOverOverlay: document.querySelector("#gameOverOverlay"),
  startButton: document.querySelector("#startButton"),
  resumeButton: document.querySelector("#resumeButton"),
  nextLevelButton: document.querySelector("#nextLevelButton"),
  restartButton: document.querySelector("#restartButton"),
  menuButtons: Array.from(document.querySelectorAll(".menu-button")),
  finalScore: document.querySelector("#finalScore"),
  finalText: document.querySelector("#finalText"),
  levelIntro: document.querySelector("#levelIntro"),
  ruleSummary: document.querySelector("#ruleSummary"),
  rewardList: document.querySelector("#rewardList"),
  rankList: document.querySelector("#rankList"),
  p1Label: document.querySelector("#p1Label"),
  p2Label: document.querySelector("#p2Label"),
  p1Health: document.querySelector("#p1Health"),
  p2Health: document.querySelector("#p2Health"),
  p1Meta: document.querySelector("#p1Meta"),
  p2Meta: document.querySelector("#p2Meta"),
  p1HpBar: document.querySelector("#p1HpBar"),
  p2HpBar: document.querySelector("#p2HpBar"),
  p1EnergyBar: document.querySelector("#p1EnergyBar"),
  p2EnergyBar: document.querySelector("#p2EnergyBar"),
  roundTimer: document.querySelector("#roundTimer"),
  modeLabel: document.querySelector("#modeLabel"),
  p1ClassGrid: document.querySelector("#p1ClassGrid"),
  p2ClassGrid: document.querySelector("#p2ClassGrid"),
  opponentButtons: Array.from(document.querySelectorAll(".opponent-option")),
  ruleButtons: Array.from(document.querySelectorAll(".rule-option")),
};

const SHIPS = {
  striker: {
    name: "疾影",
    type: "突袭型",
    color: "#78d9ff",
    hp: 105,
    radius: 17,
    accel: 2050,
    maxSpeed: 500,
    fireRate: 0.23,
    bulletSpeed: 820,
    bulletDamage: 6,
    bulletRadius: 4,
    skill: "dash",
    summary: "最快，技能是穿刺冲刺",
  },
  warden: {
    name: "堡垒",
    type: "防御型",
    color: "#ffd166",
    hp: 145,
    radius: 22,
    accel: 1500,
    maxSpeed: 390,
    fireRate: 0.36,
    bulletSpeed: 650,
    bulletDamage: 11,
    bulletRadius: 6,
    skill: "shield",
    summary: "最硬，技能是短时护盾",
  },
  pulse: {
    name: "脉冲",
    type: "控场型",
    color: "#d8a2ff",
    hp: 118,
    radius: 19,
    accel: 1780,
    maxSpeed: 440,
    fireRate: 0.3,
    bulletSpeed: 720,
    bulletDamage: 8,
    bulletRadius: 5,
    skill: "pulse",
    summary: "均衡，技能是范围震荡",
  },
};

const RULES = {
  rush: {
    name: "抢晶",
    time: 70,
    target: 7,
    crystals: 7,
    zone: false,
    crystalScore: 1,
    hitSteal: true,
    mines: true,
    crystalInterval: 1,
    mineMin: 5.6,
    mineMax: 7.4,
  },
  blitz: {
    name: "闪斗",
    time: 55,
    target: 9,
    crystals: 6,
    zone: false,
    crystalScore: 1,
    hitSteal: true,
    mines: true,
    respawn: true,
    crystalInterval: 0.75,
    mineMin: 3.6,
    mineMax: 5.2,
  },
  duel: {
    name: "决斗",
    time: 65,
    target: 0,
    crystals: 4,
    zone: false,
    crystalScore: 0,
    hitSteal: false,
    mines: false,
    crystalInterval: 2.2,
  },
  zone: {
    name: "占点",
    time: 75,
    target: 100,
    crystals: 3,
    zone: true,
    crystalScore: 0,
    hitSteal: false,
    mines: true,
    crystalInterval: 2.4,
    mineMin: 6,
    mineMax: 8.5,
  },
};

const LEVELS = [
  {
    name: "边境训练场",
    enemyClass: "warden",
    timeBonus: 6,
    targetBonus: -1,
    crystalBonus: 1,
    aiAggro: 0.78,
  },
  {
    name: "陨石中继站",
    enemyClass: "pulse",
    timeBonus: 0,
    targetBonus: 1,
    crystalBonus: 0,
    aiAggro: 0.92,
  },
  {
    name: "核心裂隙",
    enemyClass: "striker",
    timeBonus: -6,
    targetBonus: 3,
    crystalBonus: -1,
    aiAggro: 1.08,
  },
];

const RULE_GUIDES = {
  rush: ["抢到晶体立刻得分", "命中对手会打落 1 分", "先到目标分或时间结束后分高者获胜"],
  blitz: ["短局快节奏抢分", "被击毁会复活，不会立刻结束", "击毁和抢晶都能扩大领先"],
  duel: ["目标是击毁对手", "晶体只恢复生命和能量", "时间结束时生命更高者获胜"],
  zone: ["站在中央区域持续得分", "晶体提供续航", "更适合用护盾和控场技能"],
};

const RANK_KEY = "starCourierRanks";

const keys = new Set();
const touches = new Set();
const pointer = { active: false, x: 0, y: 0 };

const config = {
  opponent: "ai",
  rule: "rush",
  p1Class: "striker",
  p2Class: "warden",
};

let width = 960;
let height = 540;
let dpr = 1;
let phase = "menu";
let lastTime = performance.now();
let elapsed = 0;
let roundTime = RULES.rush.time;
let activeRule = { ...RULES.rush };
let currentLevel = 0;
let lastWinnerId = null;
let shake = 0;
let crystalTimer = 0;
let mineTimer = 7;

const fighters = [];
const bullets = [];
const crystals = [];
const mines = [];
const particles = [];
const stars = Array.from({ length: 105 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.6 + Math.random() * 1.5,
  s: 0.2 + Math.random() * 0.65,
  a: 0.2 + Math.random() * 0.55,
}));

window.__debugGame = {
  config,
  fighters,
  bullets,
  crystals,
  mines,
  get phase() {
    return phase;
  },
};

buildLobby();
resize();
returnToLobby();
requestAnimationFrame(loop);

function buildLobby() {
  renderShipGrid("p1", ui.p1ClassGrid);
  renderShipGrid("p2", ui.p2ClassGrid);

  ui.opponentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      config.opponent = button.dataset.opponent;
      updateLobby();
    });
  });

  ui.ruleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      config.rule = button.dataset.rule;
      currentLevel = 0;
      updateLobby();
    });
  });

  ui.startButton.addEventListener("click", startMatch);
  ui.resumeButton.addEventListener("click", resumeMatch);
  ui.restartButton.addEventListener("click", startMatch);
  ui.nextLevelButton.addEventListener("click", startNextLevel);
  ui.menuButtons.forEach((button) => button.addEventListener("click", returnToLobby));

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

function renderShipGrid(side, container) {
  container.innerHTML = "";
  Object.entries(SHIPS).forEach(([key, ship]) => {
    const button = document.createElement("button");
    button.className = "class-option";
    button.type = "button";
    button.dataset.side = side;
    button.dataset.classKey = key;
    button.innerHTML = `
      <span class="class-topline">
        <strong class="class-name">${ship.name}</strong>
        <span class="class-type">${ship.type}</span>
      </span>
      <span class="class-stats">${ship.summary}</span>
    `;
    button.querySelector(".class-type").style.background = ship.color;
    button.addEventListener("click", () => {
      if (side === "p1") config.p1Class = key;
      else config.p2Class = key;
      updateLobby();
    });
    container.appendChild(button);
  });
}

function updateLobby() {
  const level = LEVELS[currentLevel];
  const rule = buildLevelRule();
  if (config.opponent === "ai") config.p2Class = level.enemyClass;

  ui.opponentButtons.forEach((button) => {
    const selected = button.dataset.opponent === config.opponent;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  ui.ruleButtons.forEach((button) => {
    const selected = button.dataset.rule === config.rule;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  document.querySelectorAll(".class-option").forEach((button) => {
    const classKey = button.dataset.side === "p1" ? config.p1Class : config.p2Class;
    const selected = button.dataset.classKey === classKey;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const p1Ship = SHIPS[config.p1Class];
  ui.p1Label.textContent = `P1 ${p1Ship.name}`;
  ui.p2Label.textContent = `${config.opponent === "ai" ? "AI" : "P2"} ${SHIPS[config.p2Class].name}`;
  ui.p1Health.textContent = p1Ship.hp;
  ui.p2Health.textContent = SHIPS[config.p2Class].hp;
  ui.p1Meta.textContent = "0 pts";
  ui.p2Meta.textContent = "0 pts";
  ui.roundTimer.textContent = rule.time;
  ui.modeLabel.textContent = getModeText(rule);
  ui.levelIntro.textContent = `第 ${currentLevel + 1} 关：${level.name}`;
  ui.startButton.textContent = currentLevel === 0 ? "开战" : `挑战第 ${currentLevel + 1} 关`;
  updateInfoPanels(rule, level);
  setBar(ui.p1HpBar, 1);
  setBar(ui.p2HpBar, 1);
  setBar(ui.p1EnergyBar, 0.6);
  setBar(ui.p2EnergyBar, 0.6);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(360, Math.floor(rect.width));
  height = Math.max(300, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function buildLevelRule() {
  const base = RULES[config.rule];
  const level = LEVELS[currentLevel];
  return {
    ...base,
    time: Math.max(35, base.time + level.timeBonus),
    target: base.target ? Math.max(3, base.target + level.targetBonus) : 0,
    crystals: Math.max(2, base.crystals + level.crystalBonus),
  };
}

function getModeText(rule = activeRule) {
  return `第 ${currentLevel + 1} 关 / ${rule.name} / ${config.opponent === "ai" ? "AI" : "双人"}`;
}

function updateInfoPanels(rule, level) {
  ui.ruleSummary.innerHTML = RULE_GUIDES[config.rule]
    .map((text) => `<span class="rule-line">${text}</span>`)
    .join("");

  const targetText = rule.target ? `${rule.target} 分` : "击毁对手";
  ui.rewardList.innerHTML = `
    <span class="reward-item"><b class="reward-tag gold">通关</b>${targetText}</span>
    <span class="reward-item"><b class="reward-tag green">奖励</b>胜利 +${120 + currentLevel * 40}，剩余时间加成</span>
    <span class="reward-item"><b class="reward-tag cyan">难度</b>${level.name}：AI 攻击性 ${Math.round(level.aiAggro * 100)}%</span>
  `;

  renderRanks();
}

function startMatch() {
  const rule = buildLevelRule();
  activeRule = rule;
  phase = "playing";
  lastWinnerId = null;
  elapsed = 0;
  roundTime = rule.time;
  shake = 0;
  crystalTimer = 0;
  mineTimer = rule.respawn ? 3 : 8;
  pointer.active = false;
  fighters.length = 0;
  bullets.length = 0;
  crystals.length = 0;
  mines.length = 0;
  particles.length = 0;

  const p2Class = config.opponent === "ai" ? LEVELS[currentLevel].enemyClass : config.p2Class;
  fighters.push(createFighter(1, config.p1Class, width * 0.22, height * 0.5, false));
  fighters.push(createFighter(2, p2Class, width * 0.78, height * 0.5, config.opponent === "ai"));
  if (rule.respawn) {
    fighters.forEach((fighter) => {
      fighter.energy = 88;
      fighter.fireCd = 0.05;
    });
  }

  for (let i = 0; i < rule.crystals; i += 1) spawnCrystal(true);
  hideOverlays();
  updateHud();
  canvas.focus({ preventScroll: true });
  lastTime = performance.now();
}

function startNextLevel() {
  currentLevel = Math.min(currentLevel + 1, LEVELS.length - 1);
  startMatch();
}

function createFighter(id, classKey, x, y, ai) {
  const ship = SHIPS[classKey];
  return {
    id,
    ai,
    classKey,
    ship,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: id === 1 ? 0 : Math.PI,
    hp: ship.hp,
    maxHp: ship.hp,
    score: 0,
    energy: 64,
    radius: ship.radius,
    fireCd: 0.2,
    skillCd: 0,
    shield: 0,
    slow: 0,
    stun: 0,
    invuln: 0.7,
    flash: 0,
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

function returnToLobby() {
  phase = "menu";
  elapsed = 0;
  activeRule = buildLevelRule();
  roundTime = activeRule.time;
  lastWinnerId = null;
  shake = 0;
  pointer.active = false;
  keys.clear();
  touches.clear();
  fighters.length = 0;
  bullets.length = 0;
  crystals.length = 0;
  mines.length = 0;
  particles.length = 0;
  updateLobby();
  hideOverlays();
  ui.startOverlay.classList.add("is-visible");
  canvas.dataset.phase = phase;
  draw();
}

function endMatch(reason = "knockout") {
  if (phase === "over") return;
  phase = "over";
  const [p1, p2] = fighters;
  const rule = activeRule;
  let winner = null;

  if (reason === "score" || reason === "timeout") {
    if (p1.score !== p2.score) winner = p1.score > p2.score ? p1 : p2;
    else if (p1.hp !== p2.hp) winner = p1.hp > p2.hp ? p1 : p2;
  } else {
    winner = p1.hp > 0 ? p1 : p2.hp > 0 ? p2 : null;
  }

  if (!winner) {
    ui.finalScore.textContent = "平局";
    ui.finalText.textContent = "这局谁都没把航线拿稳。";
  } else {
    const label = winner.id === 1 ? "P1" : config.opponent === "ai" ? "AI" : "P2";
    const targetText = rule.target ? ` / ${rule.target}` : "";
    const rewardText = winner.id === 1 ? `奖励评分 ${calculateRankScore(winner, reason)}。` : "本局未进入 P1 排名。";
    ui.finalScore.textContent = `${label} 获胜`;
    ui.finalText.textContent = `${LEVELS[currentLevel].name} 完成：${winner.ship.name} 拿下 ${Math.floor(winner.score)}${targetText} pts，剩余 ${Math.ceil(winner.hp)} HP。${rewardText}`;
  }

  lastWinnerId = winner?.id ?? null;
  recordRank(winner, reason);
  updateHud();
  updateGameOverActions();
  ui.gameOverOverlay.classList.add("is-visible");
}

function recordRank(winner, reason) {
  if (!winner || winner.id !== 1) return;
  const p1 = fighters[0];
  const score = calculateRankScore(p1, reason);
  const entry = {
    score,
    level: currentLevel + 1,
    levelName: LEVELS[currentLevel].name,
    rule: activeRule.name,
    points: Math.floor(p1.score),
    timeLeft: Math.ceil(roundTime),
    date: new Date().toLocaleDateString("zh-CN"),
  };
  const ranks = readRanks();
  ranks.push(entry);
  ranks.sort((a, b) => b.score - a.score);
  writeRanks(ranks.slice(0, 5));
}

function calculateRankScore(fighter, reason) {
  const winBonus = 120 + currentLevel * 40;
  const pointBonus = Math.floor(fighter.score) * 18;
  const timeBonus = Math.ceil(roundTime) * 3;
  const hpBonus = Math.ceil(Math.max(0, fighter.hp));
  const knockoutBonus = reason === "knockout" ? 60 : 0;
  return winBonus + pointBonus + timeBonus + hpBonus + knockoutBonus;
}

function readRanks() {
  try {
    return JSON.parse(localStorage.getItem(RANK_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeRanks(ranks) {
  localStorage.setItem(RANK_KEY, JSON.stringify(ranks));
}

function renderRanks() {
  const ranks = readRanks();
  if (!ranks.length) {
    ui.rankList.innerHTML = `<li class="empty-rank">还没有通关记录</li>`;
    return;
  }
  ui.rankList.innerHTML = ranks
    .map(
      (rank, index) => `
        <li>
          <span class="rank-place">#${index + 1}</span>
          <span>第 ${rank.level} 关 · ${rank.rule}</span>
          <span class="rank-score">${rank.score}</span>
        </li>
      `,
    )
    .join("");
}

function updateGameOverActions() {
  const canAdvance = lastWinnerId === 1 && currentLevel < LEVELS.length - 1;
  ui.nextLevelButton.hidden = !canAdvance;
  ui.nextLevelButton.textContent = canAdvance ? `下一关：${LEVELS[currentLevel + 1].name}` : "下一关";
  ui.restartButton.textContent = "再战本关";
}

function update(dt) {
  if (phase !== "playing") return;
  const rule = activeRule;
  elapsed += dt;
  roundTime = Math.max(0, roundTime - dt);
  shake = Math.max(0, shake - dt * 15);
  crystalTimer -= dt;
  mineTimer -= dt;

  if (roundTime <= 0) {
    endMatch("timeout");
    return;
  }

  if (crystalTimer <= 0) {
    spawnCrystal(false);
    crystalTimer = rule.crystalInterval;
  }

  if (rule.mines && mineTimer <= 0) {
    spawnMine();
    mineTimer = randomRange(rule.mineMin, rule.mineMax);
  }

  for (const fighter of fighters) updateFighter(fighter, dt);
  updateBullets(dt);
  updateCrystals(dt);
  updateMines(dt);
  updateParticles(dt);
  updateZone(dt);

  if (rule.target && fighters.some((fighter) => fighter.score >= rule.target)) {
    endMatch("score");
  }

  updateHud();
}

function updateFighter(fighter, dt) {
  const opponent = getOpponent(fighter);
  const input = fighter.ai ? getAiInput(fighter, opponent, dt) : getHumanInput(fighter);
  const slowFactor = fighter.slow > 0 ? 0.58 : 1;
  const control = fighter.stun > 0 ? 0 : 1;

  fighter.fireCd = Math.max(0, fighter.fireCd - dt);
  fighter.skillCd = Math.max(0, fighter.skillCd - dt);
  fighter.shield = Math.max(0, fighter.shield - dt);
  fighter.slow = Math.max(0, fighter.slow - dt);
  fighter.stun = Math.max(0, fighter.stun - dt);
  fighter.invuln = Math.max(0, fighter.invuln - dt);
  fighter.flash = Math.max(0, fighter.flash - dt);
  fighter.energy = Math.min(100, fighter.energy + dt * 13);

  fighter.vx += input.x * fighter.ship.accel * slowFactor * control * dt;
  fighter.vy += input.y * fighter.ship.accel * slowFactor * control * dt;
  damp(fighter, dt);
  clampVelocity(fighter, fighter.ship.maxSpeed * slowFactor);
  fighter.x += fighter.vx * dt;
  fighter.y += fighter.vy * dt;
  keepInArena(fighter);

  fighter.angle = lerpAngle(
    fighter.angle,
    Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x),
    Math.min(1, dt * 9),
  );

  if (input.fire) fire(fighter);
  if (input.skill) useSkill(fighter, opponent);
}

function getHumanInput(fighter) {
  if (fighter.id === 1) {
    const arrowBackup = config.opponent === "ai";
    let x = 0;
    let y = 0;
    if (hasInput("a") || touches.has("left") || (arrowBackup && hasInput("arrowleft"))) x -= 1;
    if (hasInput("d") || touches.has("right") || (arrowBackup && hasInput("arrowright"))) x += 1;
    if (hasInput("w") || touches.has("up") || (arrowBackup && hasInput("arrowup"))) y -= 1;
    if (hasInput("s") || touches.has("down") || (arrowBackup && hasInput("arrowdown"))) y += 1;

    if (pointer.active) {
      const dx = pointer.x - fighter.x;
      const dy = pointer.y - fighter.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 12) {
        x += dx / distance;
        y += dy / distance;
      }
    }

    return normalize({
      x,
      y,
      fire: config.opponent === "ai" || hasInput("space") || touches.has("fire"),
      skill: hasInput("shift") || touches.has("skill"),
    });
  }

  let x = 0;
  let y = 0;
  if (hasInput("arrowleft")) x -= 1;
  if (hasInput("arrowright")) x += 1;
  if (hasInput("arrowup")) y -= 1;
  if (hasInput("arrowdown")) y += 1;
  return normalize({
    x,
    y,
    fire: hasInput("enter"),
    skill: hasInput("/"),
  });
}

function getAiInput(fighter, opponent, dt) {
  fighter.aiClock += dt;
  const target = chooseAiTarget(fighter, opponent);
  const dx = target.x - fighter.x;
  const dy = target.y - fighter.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  let x = dx / distance;
  let y = dy / distance;

  if (target.kind === "enemy" && distance < 240) {
    x *= -0.7;
    y *= -0.7;
  }

  const strafe = target.kind === "enemy" ? Math.sin(fighter.aiClock * 2.4) * 0.7 : 0;
  x += (-dy / distance) * strafe;
  y += (dx / distance) * strafe;

  const aggro = fighter.ai ? LEVELS[currentLevel].aiAggro : 1;
  return normalize({
    x,
    y,
    fire: Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y) < 720 * aggro,
    skill: fighter.energy > 70 && fighter.skillCd <= 0 && Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y) < 320 * aggro,
  });
}

function chooseAiTarget(fighter, opponent) {
  if (activeRule.crystalScore) {
    const nearest = nearestCrystal(fighter);
    const aiShouldYield = fighter.ai && (elapsed < 1.5 || fighter.score > opponent.score + 1);
    const chaseChance = fighter.ai && fighter.score > opponent.score ? 0.08 : 0.68;
    if (nearest && !aiShouldYield && (fighter.score <= opponent.score || Math.random() < chaseChance)) {
      return { ...nearest, kind: "crystal" };
    }
  }

  if (activeRule.zone) {
    const zone = getZone();
    if (Math.hypot(fighter.x - zone.x, fighter.y - zone.y) > zone.radius * 0.75) {
      return { ...zone, kind: "zone" };
    }
  }

  return { x: opponent.x, y: opponent.y, kind: "enemy" };
}

function fire(fighter) {
  if (fighter.fireCd > 0) return;
  fighter.fireCd = fighter.ship.fireRate;
  const angle = fighter.angle;
  const speed = fighter.ship.bulletSpeed;
  const radius = fighter.ship.bulletRadius;
  bullets.push({
    owner: fighter.id,
    x: fighter.x + Math.cos(angle) * (fighter.radius + radius + 4),
    y: fighter.y + Math.sin(angle) * (fighter.radius + radius + 4),
    vx: Math.cos(angle) * speed + fighter.vx * 0.08,
    vy: Math.sin(angle) * speed + fighter.vy * 0.08,
    radius,
    damage: fighter.ship.bulletDamage,
    color: fighter.ship.color,
    life: 1.2,
  });
  burst(fighter.x + Math.cos(angle) * fighter.radius, fighter.y + Math.sin(angle) * fighter.radius, fighter.ship.color, 4);
}

function useSkill(fighter, opponent) {
  if (fighter.skillCd > 0 || fighter.energy < 38) return;
  fighter.energy -= 38;
  fighter.skillCd = fighter.ship.skill === "shield" ? 5.6 : 4.2;

  if (fighter.ship.skill === "dash") {
    const angle = Math.atan2(opponent.y - fighter.y, opponent.x - fighter.x);
    fighter.vx += Math.cos(angle) * 760;
    fighter.vy += Math.sin(angle) * 760;
    fighter.invuln = Math.max(fighter.invuln, 0.28);
    burst(fighter.x, fighter.y, fighter.ship.color, 22);
    if (Math.hypot(opponent.x - fighter.x, opponent.y - fighter.y) < 92) {
      hit(opponent, 12, fighter.id, { knockbackFrom: fighter, steal: true });
    }
    return;
  }

  if (fighter.ship.skill === "shield") {
    fighter.shield = 2.6;
    fighter.hp = Math.min(fighter.maxHp, fighter.hp + 10);
    burst(fighter.x, fighter.y, fighter.ship.color, 24);
    return;
  }

  for (const other of fighters) {
    if (other.id === fighter.id) continue;
    const distance = Math.hypot(other.x - fighter.x, other.y - fighter.y);
    if (distance < 210) {
      hit(other, 15, fighter.id, { slow: 1.6, knockbackFrom: fighter, steal: true });
    }
  }
  burst(fighter.x, fighter.y, fighter.ship.color, 30);
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.life <= 0 || bullet.x < -50 || bullet.x > width + 50 || bullet.y < -50 || bullet.y > height + 50) {
      bullets.splice(i, 1);
      continue;
    }

    const target = fighters.find((fighter) => fighter.id !== bullet.owner);
    if (target && collides(bullet, target, 0.95)) {
      hit(target, bullet.damage, bullet.owner, {
        knockbackFrom: { x: bullet.x - bullet.vx, y: bullet.y - bullet.vy },
        steal: activeRule.hitSteal,
      });
      burst(bullet.x, bullet.y, bullet.color, 8);
      bullets.splice(i, 1);
    }
  }
}

function hit(target, damage, attackerId, options = {}) {
  if (target.invuln > 0) return;
  const shielded = target.shield > 0;
  const amount = shielded ? damage * 0.35 : damage;
  target.hp = Math.max(0, target.hp - amount);
  target.flash = 0.14;
  target.invuln = 0.12;
  target.slow = Math.max(target.slow, options.slow || 0);
  shake = Math.max(shake, shielded ? 3 : 8);

  if (options.knockbackFrom) {
    const angle = Math.atan2(target.y - options.knockbackFrom.y, target.x - options.knockbackFrom.x);
    target.vx += Math.cos(angle) * (shielded ? 120 : 260);
    target.vy += Math.sin(angle) * (shielded ? 120 : 260);
  }

  if (options.steal && target.score > 0) {
    target.score -= 1;
    spawnCrystal(false, target.x, target.y, true);
  }

  if (target.hp <= 0) {
    const rule = activeRule;
    const attacker = fighters.find((fighter) => fighter.id === attackerId);
    if (attacker && rule.target) attacker.score += rule.respawn ? 1 : 2;
    burst(target.x, target.y, target.ship.color, 28);
    if (rule.respawn) {
      respawnFighter(target);
      return;
    }
    endMatch("knockout");
  }
}

function respawnFighter(fighter) {
  const side = fighter.id === 1 ? 0.22 : 0.78;
  fighter.hp = fighter.maxHp;
  fighter.energy = Math.max(fighter.energy, 76);
  fighter.x = width * side;
  fighter.y = randomRange(height * 0.28, height * 0.72);
  fighter.vx = fighter.id === 1 ? 140 : -140;
  fighter.vy = 0;
  fighter.invuln = 1.35;
  fighter.shield = 0.4;
  fighter.slow = 0;
  fighter.stun = 0;
  fighter.flash = 0.25;
}

function spawnCrystal(initial = false, x = null, y = null, force = false) {
  const maxCrystals = activeRule.crystals + (activeRule.crystalScore ? 2 : 0);
  if (crystals.length >= maxCrystals && !initial && !force) return;
  const xMin = initial ? width * 0.3 : width * 0.14;
  const xMax = initial ? width * 0.7 : width * 0.86;
  crystals.push({
    x: x ?? randomRange(xMin, xMax),
    y: y ?? randomRange(height * 0.16, height * 0.84),
    radius: 12,
    phase: Math.random() * Math.PI * 2,
    born: elapsed,
  });
}

function updateCrystals(dt) {
  for (const crystal of crystals) crystal.phase += dt * 5;

  for (let i = crystals.length - 1; i >= 0; i -= 1) {
    const crystal = crystals[i];
    for (const fighter of fighters) {
      if (!collides(crystal, fighter, 1)) continue;
      const rule = activeRule;
      const opponent = getOpponent(fighter);
      if (fighter.ai && rule.crystalScore && (elapsed < 1.5 || fighter.score > opponent.score + 1)) continue;
      if (rule.crystalScore) fighter.score += rule.crystalScore;
      else {
        fighter.hp = Math.min(fighter.maxHp, fighter.hp + 5);
        fighter.energy = Math.min(100, fighter.energy + 28);
      }
      fighter.energy = Math.min(100, fighter.energy + 18);
      burst(crystal.x, crystal.y, "#7ef2b0", 16);
      crystals.splice(i, 1);
      break;
    }
  }
}

function nearestCrystal(fighter) {
  let best = null;
  let bestDistance = Infinity;
  for (const crystal of crystals) {
    const distance = Math.hypot(crystal.x - fighter.x, crystal.y - fighter.y);
    if (distance < bestDistance) {
      best = crystal;
      bestDistance = distance;
    }
  }
  return best;
}

function spawnMine() {
  const maxMines = activeRule.respawn ? 6 : 4;
  if (mines.length > maxMines) return;
  const angle = Math.random() * Math.PI * 2;
  mines.push({
    x: randomRange(width * 0.18, width * 0.82),
    y: randomRange(height * 0.18, height * 0.82),
    vx: Math.cos(angle) * randomRange(38, 70),
    vy: Math.sin(angle) * randomRange(38, 70),
    radius: randomRange(15, 22),
    spin: randomRange(-2, 2),
    angle,
    cd: 0,
  });
}

function updateMines(dt) {
  for (const mine of mines) {
    mine.x += mine.vx * dt;
    mine.y += mine.vy * dt;
    mine.angle += mine.spin * dt;
    mine.cd = Math.max(0, mine.cd - dt);
    if (mine.x < mine.radius || mine.x > width - mine.radius) mine.vx *= -1;
    if (mine.y < mine.radius || mine.y > height - mine.radius) mine.vy *= -1;
    mine.x = clamp(mine.x, mine.radius, width - mine.radius);
    mine.y = clamp(mine.y, mine.radius, height - mine.radius);

    for (const fighter of fighters) {
      if (mine.cd > 0 || !collides(mine, fighter, 0.9)) continue;
      hit(fighter, 11, 0, { knockbackFrom: mine, steal: true });
      mine.cd = 0.55;
      burst(fighter.x, fighter.y, "#ff6b6b", 12);
    }
  }
}

function updateZone(dt) {
  if (config.rule !== "zone") return;
  const zone = getZone();
  for (const fighter of fighters) {
    const distance = Math.hypot(fighter.x - zone.x, fighter.y - zone.y);
    if (distance < zone.radius) {
      fighter.score += dt * (fighter.shield > 0 ? 1 : 1.75);
      fighter.energy = Math.min(100, fighter.energy + dt * 7);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.08, dt);
    particle.vy *= Math.pow(0.08, dt);
    if (particle.life <= 0) particles.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  ctx.save();
  ctx.translate(sx, sy);
  drawSpace();
  drawGrid();
  drawZone();
  crystals.forEach(drawCrystal);
  mines.forEach(drawMine);
  bullets.forEach(drawBullet);
  particles.forEach(drawParticle);
  fighters.forEach(drawFighter);
  if (phase === "menu") drawMenuPreview();
  ctx.restore();
}

function drawSpace() {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111820");
  gradient.addColorStop(0.55, "#0e1117");
  gradient.addColorStop(1, "#171318");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#fbf7ee";
  for (const star of stars) {
    const x = (star.x * width - elapsed * 14 * star.s) % width;
    ctx.globalAlpha = star.a;
    ctx.beginPath();
    ctx.arc(x < 0 ? x + width : x, star.y * height, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 72; x < width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 72; y < height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawZone() {
  if (!activeRule.zone) return;
  const zone = getZone();
  ctx.save();
  ctx.translate(zone.x, zone.y);
  ctx.fillStyle = "rgba(120, 217, 255, 0.08)";
  ctx.strokeStyle = "#78d9ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCrystal(crystal) {
  const pulse = 1 + Math.sin(crystal.phase) * 0.16;
  ctx.save();
  ctx.translate(crystal.x, crystal.y);
  ctx.rotate(crystal.phase * 0.45);
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#7ef2b0";
  ctx.fillStyle = "#7ef2b0";
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? crystal.radius * pulse : crystal.radius * 0.42;
    const angle = (Math.PI * 2 * i) / 8;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMine(mine) {
  ctx.save();
  ctx.translate(mine.x, mine.y);
  ctx.rotate(mine.angle);
  ctx.fillStyle = "#773c42";
  ctx.strokeStyle = "#ff6b6b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = mine.radius * (i % 2 === 0 ? 1 : 0.55);
    const angle = (Math.PI * 2 * i) / 10;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBullet(bullet) {
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = bullet.color;
  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFighter(fighter) {
  const ship = fighter.ship;
  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  if (fighter.shield > 0) {
    ctx.strokeStyle = "rgba(255, 209, 102, 0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(fighter.angle);
  const flame = 10 + Math.hypot(fighter.vx, fighter.vy) * 0.055 + Math.sin(elapsed * 20) * 2;
  ctx.fillStyle = fighter.id === 1 ? "rgba(126, 242, 176, 0.72)" : "rgba(255, 107, 107, 0.72)";
  ctx.beginPath();
  ctx.moveTo(-fighter.radius - 2, -7);
  ctx.lineTo(-fighter.radius - flame, 0);
  ctx.lineTo(-fighter.radius - 2, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = fighter.flash > 0 ? "#ffffff" : ship.color;
  ctx.strokeStyle = "#0e1117";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(fighter.radius + 10, 0);
  ctx.lineTo(-fighter.radius * 0.78, -fighter.radius * 0.86);
  ctx.lineTo(-fighter.radius * 0.36, 0);
  ctx.lineTo(-fighter.radius * 0.78, fighter.radius * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = fighter.id === 1 ? "#7ef2b0" : "#ff6b6b";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawFighterLabel(fighter);
}

function drawFighterLabel(fighter) {
  const label = fighter.id === 1 ? "P1" : config.opponent === "ai" ? "AI" : "P2";
  const barWidth = 58;
  ctx.save();
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fbf7ee";
  ctx.fillText(label, fighter.x, fighter.y - fighter.radius - 18);
  ctx.fillStyle = "rgba(255, 255, 255, 0.13)";
  ctx.fillRect(fighter.x - barWidth / 2, fighter.y + fighter.radius + 12, barWidth, 5);
  ctx.fillStyle = fighter.id === 1 ? "#7ef2b0" : "#ff6b6b";
  ctx.fillRect(fighter.x - barWidth / 2, fighter.y + fighter.radius + 12, barWidth * clamp(fighter.hp / fighter.maxHp, 0, 1), 5);
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

function drawMenuPreview() {
  const p1 = createFighter(1, config.p1Class, width * 0.24, height * 0.52, false);
  const p2 = createFighter(2, config.p2Class, width * 0.76, height * 0.52, false);
  p1.angle = -0.12;
  p2.angle = Math.PI + 0.12;
  p1.invuln = 0;
  p2.invuln = 0;
  drawFighter(p1);
  drawFighter(p2);
}

function updateHud() {
  if (fighters.length < 2) {
    updateLobby();
    return;
  }

  const [p1, p2] = fighters;
  const rule = activeRule;
  ui.p1Label.textContent = `P1 ${p1.ship.name}`;
  ui.p2Label.textContent = `${config.opponent === "ai" ? "AI" : "P2"} ${p2.ship.name}`;
  ui.p1Health.textContent = Math.ceil(p1.hp);
  ui.p2Health.textContent = Math.ceil(p2.hp);
  ui.p1Meta.textContent = `${Math.floor(p1.score)} pts`;
  ui.p2Meta.textContent = `${Math.floor(p2.score)} pts`;
  ui.roundTimer.textContent = Math.ceil(roundTime);
  ui.modeLabel.textContent = getModeText(rule);
  setBar(ui.p1HpBar, p1.hp / p1.maxHp);
  setBar(ui.p2HpBar, p2.hp / p2.maxHp);
  setBar(ui.p1EnergyBar, p1.energy / 100);
  setBar(ui.p2EnergyBar, p2.energy / 100);
  canvas.dataset.phase = phase;
  canvas.dataset.p1x = String(Math.round(p1.x));
  canvas.dataset.p1y = String(Math.round(p1.y));
}

function hideOverlays() {
  ui.startOverlay.classList.remove("is-visible");
  ui.pauseOverlay.classList.remove("is-visible");
  ui.gameOverOverlay.classList.remove("is-visible");
}

function setBar(element, ratio) {
  element.style.width = `${clamp(ratio, 0, 1) * 100}%`;
}

function burst(x, y, color, amount = 10) {
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.45;
    const speed = randomRange(70, 230);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomRange(2, 4),
      life: randomRange(0.32, 0.74),
      maxLife: 0.74,
      color,
    });
  }
}

function getOpponent(fighter) {
  return fighters.find((other) => other.id !== fighter.id);
}

function getZone() {
  return {
    x: width / 2,
    y: height / 2,
    radius: Math.min(width, height) * 0.18,
  };
}

function keepInArena(fighter) {
  const padding = fighter.radius + 7;
  if (fighter.x < padding || fighter.x > width - padding) fighter.vx *= -0.28;
  if (fighter.y < padding || fighter.y > height - padding) fighter.vy *= -0.28;
  fighter.x = clamp(fighter.x, padding, width - padding);
  fighter.y = clamp(fighter.y, padding, height - padding);
}

function damp(fighter, dt) {
  const value = Math.pow(0.035, dt);
  fighter.vx *= value;
  fighter.vy *= value;
}

function clampVelocity(fighter, maxSpeed) {
  const speed = Math.hypot(fighter.vx, fighter.vy);
  if (speed <= maxSpeed) return;
  fighter.vx = (fighter.vx / speed) * maxSpeed;
  fighter.vy = (fighter.vy / speed) * maxSpeed;
}

function collides(a, b, scale = 1) {
  return Math.hypot(a.x - b.x, a.y - b.y) < (a.radius + b.radius) * scale;
}

function normalize(input) {
  const length = Math.hypot(input.x, input.y);
  if (length > 0) {
    input.x /= length;
    input.y /= length;
  }
  return input;
}

function hasInput(...tokens) {
  return tokens.some((token) => keys.has(token));
}

function inputTokens(event) {
  const tokens = new Set();
  tokens.add(event.key === " " ? "space" : event.key.toLowerCase());
  const codeMap = {
    KeyW: "w",
    KeyA: "a",
    KeyS: "s",
    KeyD: "d",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    Space: "space",
    ShiftLeft: "shift",
    ShiftRight: "shift",
    Enter: "enter",
    NumpadEnter: "enter",
    Slash: "/",
  };
  if (codeMap[event.code]) tokens.add(codeMap[event.code]);
  return Array.from(tokens);
}

function pushTap(tokens) {
  if (phase !== "playing" || fighters.length < 2) return;
  const p1 = fighters[0];
  const p2 = fighters[1];
  const arrowBackup = config.opponent === "ai";
  let p1x = 0;
  let p1y = 0;
  let p2x = 0;
  let p2y = 0;
  if (tokens.includes("a") || (arrowBackup && tokens.includes("arrowleft"))) p1x -= 1;
  if (tokens.includes("d") || (arrowBackup && tokens.includes("arrowright"))) p1x += 1;
  if (tokens.includes("w") || (arrowBackup && tokens.includes("arrowup"))) p1y -= 1;
  if (tokens.includes("s") || (arrowBackup && tokens.includes("arrowdown"))) p1y += 1;
  if (config.opponent === "local") {
    if (tokens.includes("arrowleft")) p2x -= 1;
    if (tokens.includes("arrowright")) p2x += 1;
    if (tokens.includes("arrowup")) p2y -= 1;
    if (tokens.includes("arrowdown")) p2y += 1;
  }
  applyImpulse(p1, p1x, p1y);
  applyImpulse(p2, p2x, p2y);
}

function applyImpulse(fighter, x, y) {
  const length = Math.hypot(x, y);
  if (!fighter || length === 0) return;
  fighter.vx += (x / length) * 230;
  fighter.vy += (y / length) * 230;
}

function lerpAngle(from, to, amount) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
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

canvas.addEventListener("pointerdown", (event) => {
  if (phase !== "playing") return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  pointer.active = true;
  updatePointer(event);
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  event.preventDefault();
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

window.addEventListener("keydown", (event) => {
  const tokens = inputTokens(event);
  const controlled = ["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown", "space", "shift", "enter", "/"];
  if (tokens.some((token) => controlled.includes(token))) event.preventDefault();

  if (tokens.includes("p")) {
    phase === "paused" ? resumeMatch() : pauseMatch();
    return;
  }

  if (tokens.includes("enter") && phase === "menu") {
    startMatch();
    return;
  }

  tokens.forEach((token) => keys.add(token));
  pushTap(tokens);
});

window.addEventListener("keyup", (event) => {
  inputTokens(event).forEach((token) => keys.delete(token));
});

window.addEventListener("blur", () => {
  keys.clear();
  touches.clear();
  pointer.active = false;
});
