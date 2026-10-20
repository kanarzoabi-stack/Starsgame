// STAR CATCHER — responsive vanilla JavaScript game
const stage = document.querySelector('#stage');
const player = document.querySelector('#player');
const scoreEl = document.querySelector('#score');
const timeEl = document.querySelector('#time');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlayTitle');
const overlayText = document.querySelector('#overlayText');
const startBtn = document.querySelector('#start');

const GAME_LENGTH = 30;
let playing = false;
let score = 0;
let seconds = GAME_LENGTH;
let playerX = 0;
let objects = [];
let leftHeld = false;
let rightHeld = false;
let dragging = false;
let lastFrame = 0;
let spawnWait = 0;
let frameId = 0;

function clampPlayer() {
  playerX = Math.max(0, Math.min(Math.max(0, stage.clientWidth - player.offsetWidth), playerX));
  player.style.left = `${playerX}px`;
}
function moveToPointer(event) {
  const bounds = stage.getBoundingClientRect();
  playerX = event.clientX - bounds.left - player.offsetWidth / 2;
  clampPlayer();
}
function spawn() {
  const meteor = Math.random() < .2;
  const el = document.createElement('div');
  el.className = `item${meteor ? ' meteor' : ''}`;
  el.textContent = meteor ? '☄️' : '⭐';
  stage.appendChild(el);
  const itemWidth = el.offsetWidth;
  const x = Math.random() * Math.max(0, stage.clientWidth - itemWidth);
  objects.push({ el, x, y: -itemWidth, size:itemWidth, speed: Math.max(160,stage.clientHeight * (.31 + Math.random() * .20)), meteor });
}
function clearObjects() {
  objects.forEach(obj => obj.el.remove());
  objects = [];
}
function finish() {
  playing = false;
  cancelAnimationFrame(frameId);
  leftHeld = rightHeld = dragging = false;
  player.classList.remove('is-moving');
  overlayTitle.textContent = 'המשחק נגמר!';
  overlayText.textContent = `צברת ${score} נקודות. רוצה לנסות לשבור את השיא שלך?`;
  startBtn.innerHTML = 'שחקי שוב <span aria-hidden="true">←</span>';
  overlay.hidden = false;
}
function frame(now) {
  if (!playing) return;
  const dt = Math.max(0, Math.min((now - lastFrame) / 1000, .05));
  lastFrame = now;
  seconds = Math.max(0, seconds - dt);
  timeEl.textContent = Math.ceil(seconds);
  if (seconds <= 0) { finish(); return; }

  const moveSpeed = Math.min(700, Math.max(290, stage.clientWidth * .60));
  if (leftHeld && !rightHeld) playerX -= moveSpeed * dt;
  if (rightHeld && !leftHeld) playerX += moveSpeed * dt;
  player.classList.toggle('is-moving', leftHeld !== rightHeld || dragging);
  clampPlayer();

  spawnWait += dt;
  if (spawnWait >= .62) { spawnWait -= .62; spawn(); }

  const playerTop = player.offsetTop;
  const playerWidth = player.offsetWidth;
  const playerHeight = player.offsetHeight;
  const paddingX = playerWidth * .17;
  const paddingY = playerHeight * .19;
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    obj.y += obj.speed * dt;
    obj.el.style.transform = `translate3d(${obj.x}px, ${obj.y}px, 0)`;
    const collision = obj.x + obj.size * .8 > playerX + paddingX &&
      obj.x + obj.size * .2 < playerX + playerWidth - paddingX &&
      obj.y + obj.size * .85 > playerTop + paddingY &&
      obj.y + obj.size * .15 < playerTop + playerHeight - paddingY;

    if (collision || obj.y > stage.clientHeight) {
      if (collision) {
        score = Math.max(0, score + (obj.meteor ? -20 : 10));
        scoreEl.textContent = score;
      }
      obj.el.remove();
      objects.splice(i, 1);
    }
  }
  frameId = requestAnimationFrame(frame);
}
function startGame() {
  cancelAnimationFrame(frameId);
  clearObjects();
  score = 0;
  seconds = GAME_LENGTH;
  spawnWait = 0;
  scoreEl.textContent = '0';
  timeEl.textContent = String(GAME_LENGTH);
  playerX = (stage.clientWidth - player.offsetWidth) / 2;
  clampPlayer();
  leftHeld = rightHeld = dragging = false;
  overlay.hidden = true;
  playing = true;
  lastFrame = performance.now();
  stage.focus({ preventScroll:true });
  frameId = requestAnimationFrame(frame);
}
startBtn.addEventListener('click', startGame);

// Hold arrow buttons on phones/tablets; keyboard also works on desktop.
function bindMove(selector, direction) {
  const btn = document.querySelector(selector);
  const set = value => {
    if (direction < 0) leftHeld = value;
    else rightHeld = value;
  };
  btn.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (!playing) return;
    set(true);
    playerX += direction * 24;
    clampPlayer();
    btn.setPointerCapture?.(event.pointerId);
  });
  for (const eventName of ['pointerup','pointercancel','lostpointercapture']) {
    btn.addEventListener(eventName, () => set(false));
  }
  btn.addEventListener('click', event => {
    if (playing && event.detail === 0) { playerX += direction * 35; clampPlayer(); }
  });
}
bindMove('#left', -1);
bindMove('#right', 1);

stage.addEventListener('pointerdown', event => {
  if (!playing || event.target.closest('button')) return;
  dragging = true;
  stage.setPointerCapture?.(event.pointerId);
  moveToPointer(event);
});
stage.addEventListener('pointermove', event => { if (playing && dragging) moveToPointer(event); });
for (const name of ['pointerup','pointercancel','lostpointercapture']) {
  stage.addEventListener(name, () => dragging = false);
}
document.addEventListener('keydown', event => {
  if (!playing || event.target.matches('input,textarea,select')) return;
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') { leftHeld = true; event.preventDefault(); }
  if (key === 'arrowright' || key === 'd') { rightHeld = true; event.preventDefault(); }
});
document.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') leftHeld = false;
  if (key === 'arrowright' || key === 'd') rightHeld = false;
});
window.addEventListener('blur', () => { leftHeld = rightHeld = dragging = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) leftHeld = rightHeld = dragging = false; });
window.addEventListener('resize', () => {
  clampPlayer();
  for (const obj of objects) {
    obj.x = Math.min(obj.x, Math.max(0,stage.clientWidth - obj.size));
  }
});
playerX = (stage.clientWidth - player.offsetWidth) / 2;
clampPlayer();
