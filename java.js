/* ===== 1. السماء: نجوم ومطر ونجوم متساقطة وشرارات ===== */
const sky = document.getElementById("sky");
const ctx = sky.getContext("2d");
let W, H;
function resize() { W = sky.width = innerWidth; H = sky.height = innerHeight; }
resize();
addEventListener("resize", resize);

const stars = Array.from({ length: 140 }, () => ({
  x: Math.random(), y: Math.random() * 0.75,
  r: Math.random() * 1.6 + 0.4,
  p: Math.random() * 6.28, s: Math.random() * 2 + 1
}));

const drops = Array.from({ length: 110 }, () => ({
  x: Math.random(), y: Math.random(),
  l: Math.random() * 12 + 8, v: Math.random() * 0.012 + 0.012
}));

let shooters = [];
function addShooter() {
  shooters.push({
    x: Math.random() * W * 0.8 + W * 0.2, y: Math.random() * H * 0.25,
    vx: -9 - Math.random() * 4, vy: 4 + Math.random() * 2, life: 1
  });
}
setInterval(addShooter, 3500);
setTimeout(addShooter, 600);

let sparks = [];
function burst(x, y) {
  for (let i = 0; i < 6; i++) {
    sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.8) * 2,
      life: 1, size: Math.random() * 2.5 + 1,
      color: Math.random() < 0.5 ? "255,215,120" : "230,235,255"
    });
  }
}

function frame(t) {
  ctx.clearRect(0, 0, W, H);

  for (const s of stars) {
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t / 1000 * s.s + s.p));
    ctx.fillStyle = `rgba(255,255,240,${a})`;
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283);
    ctx.fill();
  }

  for (const m of shooters) {
    const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 6, m.y - m.vy * 6);
    g.addColorStop(0, `rgba(255,255,255,${m.life})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6);
    ctx.stroke();
    m.x += m.vx; m.y += m.vy; m.life -= 0.02;
  }
  shooters = shooters.filter(m => m.life > 0);

  ctx.strokeStyle = "rgba(170,190,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of drops) {
    ctx.moveTo(d.x * W, d.y * H);
    ctx.lineTo(d.x * W - 2, d.y * H + d.l);
    d.y += d.v;
    if (d.y > 1) { d.y = -0.05; d.x = Math.random(); }
  }
  ctx.stroke();

  for (const p of sparks) {
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(${p.color},1)`;
    ctx.fillStyle = `rgba(${p.color},${p.life})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, 6.283);
    ctx.fill();
    p.x += p.vx; p.y += p.vy; p.life -= 0.02;
  }
  ctx.shadowBlur = 0;
  sparks = sparks.filter(p => p.life > 0);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ===== 2. الشمعة: إطفاء + رسالة ===== */
const scene = document.getElementById("scene");
const candle = document.getElementById("candle");
const title = document.getElementById("title");
const hint = document.getElementById("hint");
const box = document.getElementById("message");
const textEl = document.getElementById("text");
const startBtn = document.getElementById("start");
const level = document.getElementById("level");
const MESSAGE = "في يوم ميلادكِ، لا أتمنى لكِ لحظة واحدة، بل عمراً كاملاً من السعادة التي تشبه دهشة الليالي البيضاء، وهدوء ليالي المطر التي تحبينها. كل عام وأنتِ بخير  ";
let blown = false;
let micStream = null;

function blowOut() {
  if (blown) return;
  blown = true;
  scene.classList.add("out");
  title.classList.add("gone");
  hint.textContent = " طارت أمنيتكِ إلى السماء مع دخان الشمعة✨";
  startBtn.style.display = "none";
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  setTimeout(typeMessage, 1500);
}

candle.addEventListener("click", blowOut);

function typeMessage() {
  box.classList.remove("hidden");
  const node = document.createTextNode("");
  textEl.appendChild(node);
  let i = 0;
  const timer = setInterval(() => {
    i++;
    node.data = MESSAGE.slice(0, i);
    const r = document.createRange();
    r.setStart(node, i - 1);
    r.setEnd(node, i);
    const b = r.getBoundingClientRect();
    burst(b.left + b.width / 2, b.top + b.height / 2);
    if (i >= MESSAGE.length) clearInterval(timer);
  }, 80);
}

/* ===== 3. المايك: كشف النفخ ===== */
const THRESHOLD = 0.08;
const FRAMES_NEEDED = 8;

startBtn.onclick = async () => {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    await ac.resume();
    const analyser = ac.createAnalyser();
    ac.createMediaStreamSource(micStream).connect(analyser);
    startBtn.disabled = true;
    hint.textContent = " .. انفخي بقوة على الشاشة 💨";
    listen(analyser);
  } catch (e) {
    hint.textContent = "  نفختك رقيقه اضغطي على الشمعة مباشرة 🕯️";
  }
};

function listen(analyser) {
  const data = new Uint8Array(analyser.fftSize);
  let loud = 0;
  function check() {
    if (blown) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += ((v - 128) / 128) ** 2;
    const volume = Math.sqrt(sum / data.length);
    level.style.width = Math.min(100, volume * 500) + "%";
    loud = volume > THRESHOLD ? loud + 1 : Math.max(0, loud - 1);
    if (loud >= FRAMES_NEEDED) { blowOut(); return; }
    requestAnimationFrame(check);
  }
  check();
}
const fullBtn = document.getElementById("full");
fullBtn.onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
};
if (!document.documentElement.requestFullscreen) fullBtn.style.display = "none";