// ===== Tani Tap — main.js =====
// Clicker/idle kebun WAP-style. Versi ini memperbaiki bug balancing GDD
// dan menambah fitur: misi harian, login streak, koleksi/Pokedex, otomatisasi
// (springkler + robot panen), gudang, dekorasi, permata, skip waktu,
// serta visit kebun teman + leaderboard (simulasi lokal).

const CROPS = {
  bayam: { name: "Bayam", emoji: "\uD83E\uDD6C", seedCost: 10, sell: 20, growMs: 60_000, level: 1 },
  sawi: { name: "Sawi", emoji: "\uD83E\uDD57", seedCost: 25, sell: 50, growMs: 180_000, level: 2 },
  kangkung: { name: "Kangkung", emoji: "\uD83C\uDF3F", seedCost: 60, sell: 120, growMs: 480_000, level: 3 },
  wortel: { name: "Wortel", emoji: "\uD83E\uDD55", seedCost: 150, sell: 300, growMs: 1_200_000, level: 4 },
  cabai: { name: "Cabai", emoji: "\uD83C\uDF36\uFE0F", seedCost: 400, sell: 800, growMs: 2_700_000, level: 5 },
};

const WATERING_CANS = {
  dasar: { name: "Dasar", reduce: 0.02, price: 0 },
  tembaga: { name: "Tembaga", reduce: 0.05, price: 300 },
  perak: { name: "Perak", reduce: 0.08, price: 1200 },
  emas: { name: "Emas", reduce: 0.10, price: 4000 },
};

const FERTILIZERS = {
  kandang: { name: "Kandang", emoji: "\uD83E\uDDFA", reduce: 0.06, quality: 10, price: 5 },
  kompos: { name: "Kompos", emoji: "\uD83C\uDF42", reduce: 0.12, quality: 10, price: 12 },
  npk: { name: "NPK", emoji: "\uD83E\uDDEA", reduce: 0.18, quality: 10, price: 30 },
  premium: { name: "Premium", emoji: "\u2728", reduce: 0.24, quality: 10, price: 75 },
  super: { name: "Super", emoji: "\uD83D\uDE80", reduce: 0.30, quality: 10, price: 175 },
};

const AUTOMATION = {
  sprinkler: { name: "Springkler", emoji: "\uD83C\uDF27\uFE0F", price: 6000, desc: "Auto-siram tiap jendela, jaga kualitas walau lagi pergi." },
  robot: { name: "Robot Panen", emoji: "\uD83E\uDD16", price: 9000, desc: "Auto-panen tiap tanaman matang masuk gudang." },
};

const DECORATIONS = {
  pagar: { name: "Pagar Kayu", emoji: "\uD83E\uDEB5", price: 150, gems: 0 },
  jalan: { name: "Jalan Setapak", emoji: "\uD83E\uDEA8", price: 280, gems: 0 },
  pohon: { name: "Pohon Hias", emoji: "\uD83C\uDF33", price: 500, gems: 0 },
  bunga: { name: "Taman Bunga", emoji: "\uD83C\uDF37", price: 0, gems: 4 },
  kolam: { name: "Kolam Ikan", emoji: "\u26F2", price: 0, gems: 8 },
};

// kapasitas gudang per tier; harga buat naik ke tier itu.
const WAREHOUSE_TIERS = [40, 90, 200, 450];
const WAREHOUSE_PRICES = [0, 600, 1800, 5000];

const LAND_PRICES = [0, 0, 0, 0, 200, 220, 242, 266];
const PREPARE_MS = 5_000;
const SAVE_KEY = "tani-tap-save-v2";

// reputasi yang dibutuhkan per kenaikan level pemain.
const REP_PER_LEVEL = 12;

const FRIENDS = [
  { id: "sari", name: "Bu Sari", emoji: "\uD83D\uDC69\u200D\uD83C\uDF3E", worth: 3800 },
  { id: "budi", name: "Pak Budi", emoji: "\uD83E\uDDD1\u200D\uD83C\uDF3E", worth: 9200 },
  { id: "rani", name: "Mbak Rani", emoji: "\uD83D\uDC69\u200D\uD83C\uDF73", worth: 16500 },
  { id: "tanibot", name: "Tani Bot", emoji: "\uD83E\uDD16", worth: 26000 },
];

const MISSION_POOL = [
  { id: "harvest", metric: "harvest", base: 15, range: 10, reward: { coins: 300 }, text: (n) => `Panen ${n} tanaman` },
  { id: "water", metric: "water", base: 25, range: 20, reward: { coins: 250 }, text: (n) => `Siram ${n} kali` },
  { id: "plant", metric: "plant", base: 12, range: 8, reward: { coins: 200 }, text: (n) => `Tanam ${n} benih` },
  { id: "sell", metric: "sellCoins", base: 500, range: 500, reward: { gems: 2 }, text: (n) => `Jual hasil senilai ${money(n)} \uD83E\uDE99` },
  { id: "visit", metric: "visit", base: 2, range: 2, reward: { gems: 1, coins: 150 }, text: (n) => `Kunjungi ${n} kebun teman` },
];

const els = {
  coins: document.querySelector("#coinsText"),
  gems: document.querySelector("#gemsText"),
  rep: document.querySelector("#repText"),
  harvest: document.querySelector("#harvestText"),
  plots: document.querySelector("#plotsText"),
  level: document.querySelector("#levelText"),
  streak: document.querySelector("#streakBadge"),
  farm: document.querySelector("#farmGrid"),
  decorStrip: document.querySelector("#decorStrip"),
  inventory: document.querySelector("#inventoryList"),
  warehouse: document.querySelector("#warehouseText"),
  shop: document.querySelector("#shopList"),
  missions: document.querySelector("#missionList"),
  collection: document.querySelector("#collectionList"),
  friends: document.querySelector("#friendList"),
  leaderboard: document.querySelector("#leaderboardList"),
  logs: document.querySelector("#logList"),
  tipTitle: document.querySelector("#tipTitle"),
  tipText: document.querySelector("#tipText"),
  template: document.querySelector("#plotTemplate"),
};

let activeShop = "seeds";
let selectedSeed = "bayam";
let selectedFertilizer = null;
let state = loadState();

// ---------- util ----------
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function money(value) {
  return Math.floor(value).toLocaleString("id-ID");
}

function fmtTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${seconds}d`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}d`;
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function addLog(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 20);
}

function playerLevel() {
  return Math.floor(state.rep / REP_PER_LEVEL) + 1;
}

function cropLevelUnlocked(crop) {
  return crop.level <= playerLevel();
}

function warehouseCap() {
  return WAREHOUSE_TIERS[state.warehouseTier] ?? WAREHOUSE_TIERS[WAREHOUSE_TIERS.length - 1];
}

function inventoryCount() {
  return Object.values(state.inventory).reduce((sum, n) => sum + n, 0);
}

function collectionBonus() {
  const discovered = Object.keys(state.collection).length;
  const all = discovered >= Object.keys(CROPS).length;
  return discovered * 0.01 + (all ? 0.1 : 0);
}

// ---------- state ----------
function freshPlot(index) {
  return {
    id: index,
    unlocked: index < 4,
    status: "raw",
    crop: null,
    startedAt: null,
    readyAt: null,
    baseGrow: 0,
    plannedDuration: 0,
    fertReduce: 0,
    waterReduce: 0,
    wateredWindows: [],
    missedWindows: [],
    quality: 100,
    qualityBuffer: 0,
    fertilizer: null,
  };
}

function freshState() {
  return {
    coins: 0,
    gems: 0,
    rep: 0,
    harvestCount: 0,
    unlockedPlots: 4,
    wateringCan: "dasar",
    seeds: { bayam: 10 },
    inventory: {},
    fertilizers: {},
    automation: { sprinkler: false, robot: false },
    warehouseTier: 0,
    decorations: [],
    collection: {},
    collectionDone: false,
    streak: { last: null, count: 0 },
    missions: { date: null, list: [] },
    counters: { plant: 0, water: 0, harvest: 0, sellCoins: 0, visit: 0 },
    friendsHelpedDate: null,
    friendsHelped: [],
    logs: ["\uD83C\uDF31 Starter pack diterima: 10 Bibit Bayam, Cangkul, Penyiram Dasar."],
    plots: Array.from({ length: 8 }, (_, index) => freshPlot(index)),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.plots) || parsed.plots.length !== 8) return freshState();
    return migrate(parsed);
  } catch {
    return freshState();
  }
}

// merge save lama biar field baru gak undefined.
function migrate(save) {
  const base = freshState();
  const merged = { ...base, ...save };
  merged.automation = { ...base.automation, ...(save.automation || {}) };
  merged.streak = { ...base.streak, ...(save.streak || {}) };
  merged.missions = save.missions && Array.isArray(save.missions.list) ? save.missions : base.missions;
  merged.counters = { ...base.counters, ...(save.counters || {}) };
  merged.collection = save.collection || {};
  merged.decorations = Array.isArray(save.decorations) ? save.decorations : [];
  merged.friendsHelped = Array.isArray(save.friendsHelped) ? save.friendsHelped : [];
  merged.plots = save.plots.map((p, i) => ({ ...freshPlot(i), ...p }));
  return merged;
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

// ---------- harian: streak + misi ----------
function streakReward(count) {
  const coins = 50 * count;
  const gems = count % 5 === 0 ? Math.floor(count / 5) + 1 : 0;
  return { coins, gems };
}

function generateMissions(dateKey) {
  const pool = MISSION_POOL.slice();
  const chosen = [];
  let h = hashStr(dateKey);
  while (chosen.length < 3 && pool.length) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const idx = h % pool.length;
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen.map((t) => {
    const target = t.base + (hashStr(dateKey + t.id) % (t.range + 1));
    return { id: t.id, text: t.text(target), target, metric: t.metric, reward: t.reward, claimed: false };
  });
}

function ensureDaily() {
  const today = todayKey();
  if (state.missions.date === today) return;

  if (state.streak.last === yesterdayKey()) state.streak.count += 1;
  else if (state.streak.last !== today) state.streak.count = 1;

  const reward = streakReward(state.streak.count);
  state.coins += reward.coins;
  if (reward.gems) state.gems += reward.gems;
  state.streak.last = today;
  addLog(`\uD83D\uDCC5 Login hari ke-${state.streak.count}: +${money(reward.coins)} \uD83E\uDE99${reward.gems ? ` +${reward.gems} \uD83D\uDC8E` : ""}.`);

  state.counters = { plant: 0, water: 0, harvest: 0, sellCoins: 0, visit: 0 };
  state.missions = { date: today, list: generateMissions(today) };
  state.friendsHelpedDate = today;
  state.friendsHelped = [];
}

function bumpCounter(metric, amount = 1) {
  state.counters[metric] = (state.counters[metric] || 0) + amount;
}

function claimMission(index) {
  const mission = state.missions.list[index];
  if (!mission || mission.claimed) return;
  if ((state.counters[mission.metric] || 0) < mission.target) return;
  mission.claimed = true;
  if (mission.reward.coins) state.coins += mission.reward.coins;
  if (mission.reward.gems) state.gems += mission.reward.gems;
  const bits = [];
  if (mission.reward.coins) bits.push(`+${money(mission.reward.coins)} \uD83E\uDE99`);
  if (mission.reward.gems) bits.push(`+${mission.reward.gems} \uD83D\uDC8E`);
  addLog(`\u2705 Misi selesai: ${mission.text} (${bits.join(" ")}).`);
  render();
}

// ---------- grow timing ----------
function recomputeReady(plot) {
  const total = Math.min(0.5, plot.fertReduce + plot.waterReduce);
  plot.readyAt = plot.startedAt + plot.baseGrow * (1 - total);
}

function windowTime(plot, point) {
  return plot.startedAt + plot.plannedDuration * point;
}

function getPlotProgress(plot) {
  const now = Date.now();
  if (plot.status === "preparing") return clamp((now - plot.startedAt) / PREPARE_MS, 0, 1);
  if (plot.status === "growing") return clamp((now - plot.startedAt) / (plot.readyAt - plot.startedAt), 0, 1);
  if (plot.status === "ready") return 1;
  return 0;
}

function applyWater(plot, point, viaSprinkler) {
  plot.wateredWindows.push(point);
  const reduce = WATERING_CANS[state.wateringCan].reduce;
  plot.waterReduce = Math.min(0.3, plot.waterReduce + reduce);
  recomputeReady(plot);
  if (!viaSprinkler) {
    addLog(`\uD83D\uDCA7 Kotak ${plot.id + 1} disiram (${WATERING_CANS[state.wateringCan].name}).`);
  }
}

function missWindow(plot, point) {
  plot.missedWindows.push(point);
  let penalty = 20;
  const absorbed = Math.min(plot.qualityBuffer, penalty);
  plot.qualityBuffer -= absorbed;
  penalty -= absorbed;
  if (penalty > 0) {
    plot.quality = clamp(plot.quality - penalty, 0, 100);
    addLog(`\uD83D\uDCA7 Kotak ${plot.id + 1} kelewat siram: kualitas -${penalty}.`);
  } else {
    addLog(`\uD83E\uDDEA Pupuk nahan kualitas kotak ${plot.id + 1} dari telat siram.`);
  }
}

function resolveWindows(plot, now) {
  const sprinkler = state.automation.sprinkler;
  [0.25, 0.5, 0.75].forEach((point) => {
    if (plot.wateredWindows.includes(point) || plot.missedWindows.includes(point)) return;
    const wt = windowTime(plot, point);
    if (now < wt) return;
    if (sprinkler) {
      applyWater(plot, point, true);
    } else {
      const grace = Math.min(20_000, plot.plannedDuration * 0.12);
      if (now > wt + grace) missWindow(plot, point);
    }
  });
}

function tickPlots() {
  ensureDaily();
  const now = Date.now();
  for (const plot of state.plots) {
    if (!plot.unlocked) continue;
    if (plot.status === "preparing" && now >= plot.startedAt + PREPARE_MS) {
      plot.status = "empty";
      plot.startedAt = null;
      addLog(`\uD83D\uDFEB Kotak ${plot.id + 1} siap ditanami.`);
    }
    if (plot.status === "growing") {
      resolveWindows(plot, now);
      if (now >= plot.readyAt) {
        plot.status = "ready";
        addLog(`${CROPS[plot.crop].emoji} ${CROPS[plot.crop].name} di kotak ${plot.id + 1} siap panen!`);
      }
    }
    if (plot.status === "ready" && state.automation.robot) {
      doHarvest(plot, true);
    }
  }
}

// ---------- aksi kotak ----------
function handlePlotClick(index) {
  const plot = state.plots[index];
  if (!plot.unlocked) return buyLand(index);
  if (plot.status === "raw") return preparePlot(plot);
  if (plot.status === "empty") return plantCrop(plot);
  if (plot.status === "growing") return waterPlot(plot);
  if (plot.status === "ready") return harvestPlot(plot);
}

function preparePlot(plot) {
  plot.status = "preparing";
  plot.startedAt = Date.now();
  addLog(`\u26CF\uFE0F Kotak ${plot.id + 1} sedang digarap (5 detik).`);
  render();
}

function plantCrop(plot) {
  const crop = CROPS[selectedSeed];
  if (!cropLevelUnlocked(crop)) return toast(`\uD83D\uDD12 ${crop.name} kebuka di Lv ${crop.level}. Level kamu ${playerLevel()}.`);
  if ((state.seeds[selectedSeed] || 0) <= 0) return toast(`\uD83C\uDF31 Bibit ${crop.name} habis. Beli di toko dulu.`);

  state.seeds[selectedSeed] -= 1;
  const hasFert = selectedFertilizer && (state.fertilizers[selectedFertilizer] || 0) > 0;
  const fertilizer = hasFert ? FERTILIZERS[selectedFertilizer] : null;
  if (fertilizer) state.fertilizers[selectedFertilizer] -= 1;

  const now = Date.now();
  plot.status = "growing";
  plot.crop = selectedSeed;
  plot.baseGrow = crop.growMs;
  plot.fertReduce = fertilizer ? Math.min(0.3, fertilizer.reduce) : 0;
  plot.waterReduce = 0;
  plot.plannedDuration = plot.baseGrow * (1 - plot.fertReduce);
  plot.startedAt = now;
  plot.readyAt = now + plot.plannedDuration;
  plot.wateredWindows = [];
  plot.missedWindows = [];
  plot.quality = 100;
  plot.qualityBuffer = fertilizer ? fertilizer.quality : 0;
  plot.fertilizer = hasFert ? selectedFertilizer : null;
  bumpCounter("plant");
  addLog(`${crop.emoji} Menanam ${crop.name}${fertilizer ? ` + Pupuk ${fertilizer.name}` : ""}.`);
  render();
}

function waterPlot(plot) {
  const now = Date.now();
  const point = [0.25, 0.5, 0.75].find((p) => {
    if (plot.wateredWindows.includes(p) || plot.missedWindows.includes(p)) return false;
    const wt = windowTime(plot, p);
    const early = Math.min(20_000, plot.plannedDuration * 0.16);
    const late = Math.min(20_000, plot.plannedDuration * 0.12);
    return now >= wt - early && now <= wt + late;
  });
  if (point === undefined) {
    return toast("\uD83D\uDCA7 Belum waktunya siram. Tunggu jendela 25% / 50% / 75%.");
  }
  applyWater(plot, point, false);
  bumpCounter("water");
  render();
}

function harvestPlot(plot) {
  doHarvest(plot, false);
  render();
}

function doHarvest(plot, viaRobot) {
  if (inventoryCount() >= warehouseCap()) {
    if (!viaRobot) toast("\uD83D\uDCE6 Gudang penuh! Jual dulu atau upgrade gudang.");
    return;
  }
  const crop = CROPS[plot.crop];
  const tier = getQualityTier(plot.quality);
  const itemKey = `${plot.crop}:${tier.label}`;
  state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
  state.rep += crop.level;
  state.harvestCount += 1;
  bumpCounter("harvest");
  discover(plot.crop);
  addLog(`${crop.emoji} ${viaRobot ? "Robot panen" : "Panen"} ${crop.name} ${tier.stars} ${tier.label}. Masuk gudang.`);
  Object.assign(plot, freshPlot(plot.id), { unlocked: true, status: "empty" });
}

function getQualityTier(score) {
  if (score >= 80) return { label: "Premium", stars: "\u2B50\u2B50\u2B50", multiplier: 1.5 };
  if (score >= 50) return { label: "Segar", stars: "\u2B50\u2B50", multiplier: 1 };
  return { label: "Layu", stars: "\u2B50", multiplier: 0.6 };
}

function discover(cropKey) {
  if (state.collection[cropKey]) return;
  state.collection[cropKey] = true;
  addLog(`\uD83D\uDCD6 Koleksi baru: ${CROPS[cropKey].name} masuk Pokedex kebun!`);
  if (!state.collectionDone && Object.keys(state.collection).length >= Object.keys(CROPS).length) {
    state.collectionDone = true;
    state.gems += 10;
    addLog("\uD83C\uDFC6 Koleksi lengkap! Bonus +10 \uD83D\uDC8E & harga jual permanen +10%.");
  }
}

function sellAll() {
  let gained = 0;
  const bonus = 1 + collectionBonus();
  for (const [key, amount] of Object.entries(state.inventory)) {
    const [cropKey, tierLabel] = key.split(":");
    const crop = CROPS[cropKey];
    const tier = [100, 70, 30].map(getQualityTier).find((item) => item.label === tierLabel) || getQualityTier(70);
    gained += crop.sell * tier.multiplier * amount;
  }
  gained = Math.floor(gained * bonus);
  if (gained <= 0) return toast("\uD83D\uDCE6 Gudang masih kosong.");
  state.coins += gained;
  state.inventory = {};
  bumpCounter("sellCoins", gained);
  addLog(`\uD83E\uDE99 Jual semua hasil panen: +${money(gained)} koin.`);
  render();
}

function skipPlot(index) {
  const plot = state.plots[index];
  if (!plot.unlocked || plot.status !== "growing") return;
  const remMin = Math.ceil((plot.readyAt - Date.now()) / 60_000);
  const cost = Math.max(1, remMin);
  if (state.gems < cost) return toast(`\uD83D\uDC8E Butuh ${cost} permata buat skip kotak ${index + 1}.`);
  state.gems -= cost;
  [0.25, 0.5, 0.75].forEach((p) => {
    if (!plot.wateredWindows.includes(p) && !plot.missedWindows.includes(p)) plot.wateredWindows.push(p);
  });
  plot.readyAt = Date.now();
  plot.status = "ready";
  addLog(`\u26A1 Skip waktu kotak ${index + 1} (-${cost} \uD83D\uDC8E).`);
  render();
}

// ---------- toko ----------
function buySeeds(key) {
  const crop = CROPS[key];
  if (!cropLevelUnlocked(crop)) return toast(`\uD83D\uDD12 ${crop.name} kebuka di Lv ${crop.level}.`);
  if (state.coins < crop.seedCost) return toast("\uD83E\uDE99 Koin belum cukup buat beli bibit.");
  state.coins -= crop.seedCost;
  state.seeds[key] = (state.seeds[key] || 0) + 1;
  selectedSeed = key;
  addLog(`\uD83C\uDF31 Beli 1 Bibit ${crop.name}.`);
  render();
}

function buyWateringCan(key) {
  const can = WATERING_CANS[key];
  if (state.wateringCan === key) return;
  if (state.coins < can.price) return toast("\uD83E\uDE99 Koin belum cukup buat upgrade penyiram.");
  state.coins -= can.price;
  state.wateringCan = key;
  addLog(`\uD83D\uDCA7 Penyiram upgrade ke ${can.name}.`);
  render();
}

function buyFertilizer(key) {
  const fertilizer = FERTILIZERS[key];
  if (state.coins < fertilizer.price) return toast("\uD83E\uDE99 Koin belum cukup buat beli pupuk.");
  state.coins -= fertilizer.price;
  state.fertilizers[key] = (state.fertilizers[key] || 0) + 1;
  selectedFertilizer = key;
  addLog(`${fertilizer.emoji} Beli Pupuk ${fertilizer.name}. (aktif buat tanam berikutnya)`);
  render();
}

function buyLand(index) {
  const price = LAND_PRICES[index];
  if (state.coins < price) return toast(`\uD83D\uDD12 Kotak ${index + 1} butuh ${money(price)} koin.`);
  state.coins -= price;
  state.unlockedPlots += 1;
  state.plots[index].unlocked = true;
  state.plots[index].status = "raw";
  addLog(`\uD83D\uDFEB Kotak ${index + 1} kebuka! Garap dulu sebelum tanam.`);
  render();
}

function buyAutomation(key) {
  const item = AUTOMATION[key];
  if (state.automation[key]) return;
  if (state.coins < item.price) return toast(`\uD83E\uDE99 Koin belum cukup buat ${item.name}.`);
  state.coins -= item.price;
  state.automation[key] = true;
  addLog(`${item.emoji} ${item.name} aktif! ${item.desc}`);
  render();
}

function upgradeWarehouse() {
  const next = state.warehouseTier + 1;
  if (next >= WAREHOUSE_TIERS.length) return toast("\uD83D\uDCE6 Gudang sudah maksimal.");
  const price = WAREHOUSE_PRICES[next];
  if (state.coins < price) return toast(`\uD83E\uDE99 Butuh ${money(price)} koin buat upgrade gudang.`);
  state.coins -= price;
  state.warehouseTier = next;
  addLog(`\uD83D\uDCE6 Gudang upgrade ke kapasitas ${WAREHOUSE_TIERS[next]}.`);
  render();
}

function buyDecoration(key) {
  const item = DECORATIONS[key];
  if (state.decorations.includes(key)) return;
  if (item.gems > 0) {
    if (state.gems < item.gems) return toast(`\uD83D\uDC8E Butuh ${item.gems} permata buat ${item.name}.`);
    state.gems -= item.gems;
  } else {
    if (state.coins < item.price) return toast(`\uD83E\uDE99 Koin belum cukup buat ${item.name}.`);
    state.coins -= item.price;
  }
  state.decorations.push(key);
  state.rep += 3;
  addLog(`${item.emoji} Pasang ${item.name}. Kebun makin estetik (+3 \u2B50).`);
  render();
}

// ---------- sosial (simulasi lokal) ----------
function visitFriend(id) {
  if (state.friendsHelpedDate !== todayKey()) {
    state.friendsHelpedDate = todayKey();
    state.friendsHelped = [];
  }
  if (state.friendsHelped.includes(id)) return toast("\uD83C\uDF3E Hari ini udah bantu kebun ini. Balik lagi besok.");
  const friend = FRIENDS.find((f) => f.id === id);
  if (!friend) return;
  state.friendsHelped.push(id);
  const coins = Math.floor(friend.worth * 0.01) + 50;
  state.rep += 2;
  state.coins += coins;
  bumpCounter("visit");
  addLog(`\uD83C\uDF3E Bantu siram kebun ${friend.name}: +${money(coins)} \uD83E\uDE99 +2 \u2B50.`);
  render();
}

function playerNetWorth() {
  return state.coins + state.rep * 10 + state.unlockedPlots * 220 + state.decorations.length * 200 + state.gems * 50;
}

// ---------- render ----------
function render() {
  tickPlots();
  saveState();
  renderStats();
  renderFarm();
  renderInventory();
  renderShop();
  renderMissions();
  renderCollection();
  renderSocial();
  renderLogs();
  renderTip();
}

function renderStats() {
  els.coins.textContent = money(state.coins);
  els.gems.textContent = money(state.gems);
  els.rep.textContent = money(state.rep);
  els.harvest.textContent = money(state.harvestCount);
  els.plots.textContent = `${state.unlockedPlots} / 8 aktif`;
  if (els.level) els.level.textContent = `Lv ${playerLevel()}`;
  if (els.streak) els.streak.textContent = `\uD83D\uDD25 ${state.streak.count} hari`;
}

function renderFarm() {
  els.farm.innerHTML = "";
  state.plots.forEach((plot, index) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.classList.add(plot.unlocked ? plot.status : "locked");
    node.style.setProperty("--p", `${getPlotProgress(plot) * 100}%`);
    node.querySelector(".plot-emoji").textContent = getPlotEmoji(plot, index);
    node.querySelector(".plot-title").textContent = getPlotTitle(plot, index);
    node.querySelector(".plot-status").textContent = getPlotStatus(plot, index);
    node.addEventListener("click", () => handlePlotClick(index));
    const skip = node.querySelector(".skip-btn");
    if (plot.status === "growing") {
      const cost = Math.max(1, Math.ceil((plot.readyAt - Date.now()) / 60_000));
      skip.hidden = false;
      skip.textContent = `\u26A1${cost}`;
      skip.title = `Skip waktu (-${cost} permata)`;
      skip.addEventListener("click", (e) => {
        e.stopPropagation();
        skipPlot(index);
      });
    } else {
      skip.hidden = true;
    }
    els.farm.appendChild(node);
  });
  if (els.decorStrip) {
    els.decorStrip.innerHTML = state.decorations.length
      ? state.decorations.map((k) => `<span title="${DECORATIONS[k].name}">${DECORATIONS[k].emoji}</span>`).join("")
      : `<span class="muted-mini">Belum ada dekorasi</span>`;
  }
}

function getPlotEmoji(plot, index) {
  if (!plot.unlocked) return "\uD83D\uDD12";
  if (plot.status === "raw") return "\uD83D\uDFEB";
  if (plot.status === "preparing") return "\u26CF\uFE0F";
  if (plot.status === "empty") return "\uD83D\uDD73\uFE0F";
  return CROPS[plot.crop].emoji;
}

function getPlotTitle(plot, index) {
  if (!plot.unlocked) return `Kotak ${index + 1}`;
  if (plot.status === "raw") return "Tanah mentah";
  if (plot.status === "preparing") return "Menggarap";
  if (plot.status === "empty") return "Siap tanam";
  if (plot.status === "ready") return `${CROPS[plot.crop].name} matang`;
  return CROPS[plot.crop].name;
}

function getPlotStatus(plot, index) {
  if (!plot.unlocked) return `${money(LAND_PRICES[index])} \uD83E\uDE99 untuk buka`;
  if (plot.status === "raw") return "Klik untuk garap";
  if (plot.status === "preparing") return fmtTime(plot.startedAt + PREPARE_MS - Date.now());
  if (plot.status === "empty") return `Tanam: ${CROPS[selectedSeed].name}`;
  if (plot.status === "ready") return `Panen \u2022 Kualitas ${plot.quality}`;
  return `${fmtTime(plot.readyAt - Date.now())} \u2022 Q${plot.quality}`;
}

function renderInventory() {
  const rows = [];
  Object.entries(state.seeds).forEach(([key, amount]) => amount > 0 && rows.push([CROPS[key].emoji, `Bibit ${CROPS[key].name}`, `${amount} pcs`]));
  Object.entries(state.fertilizers).forEach(([key, amount]) => amount > 0 && rows.push([FERTILIZERS[key].emoji, `Pupuk ${FERTILIZERS[key].name}`, `${amount} pcs`]));
  Object.entries(state.inventory).forEach(([key, amount]) => {
    const [cropKey, tier] = key.split(":");
    rows.push([CROPS[cropKey].emoji, `${CROPS[cropKey].name} ${tier}`, `${amount} hasil`]);
  });
  if (els.warehouse) els.warehouse.textContent = `${inventoryCount()} / ${warehouseCap()}`;
  els.inventory.innerHTML = rows.length
    ? rows.map(([emoji, title, note]) => `<div class="inventory-row"><span>${emoji}</span><div><strong>${title}</strong><small>${note}</small></div></div>`).join("")
    : `<p class="empty">Inventory kosong.</p>`;
}

function shopRow({ icon, title, note, button, disabled, onclick }) {
  return `<div class="shop-row"><span>${icon}</span><div><strong>${title}</strong><small>${note}</small></div><button ${disabled ? "disabled" : ""} onclick="${onclick}">${button}</button></div>`;
}

function renderShop() {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.shop === activeShop));
  if (activeShop === "seeds") {
    els.shop.innerHTML = Object.entries(CROPS).map(([key, crop]) => shopRow({
      icon: crop.emoji,
      title: `Bibit ${crop.name}`,
      note: cropLevelUnlocked(crop) ? `${money(crop.seedCost)} \uD83E\uDE99 \u2022 jual ${money(crop.sell)} \uD83E\uDE99` : `\uD83D\uDD12 buka di Lv ${crop.level}`,
      button: selectedSeed === key ? "Dipilih" : "Beli",
      disabled: !cropLevelUnlocked(crop),
      onclick: `buySeeds('${key}')`,
    })).join("");
  } else if (activeShop === "tools") {
    els.shop.innerHTML = Object.entries(WATERING_CANS).map(([key, can]) => shopRow({
      icon: "\uD83D\uDCA7",
      title: `Penyiram ${can.name}`,
      note: `${money(can.price)} \uD83E\uDE99 \u2022 -${Math.round(can.reduce * 100)}% / siram`,
      button: state.wateringCan === key ? "Dipakai" : "Beli",
      disabled: can.price === 0 || state.wateringCan === key,
      onclick: `buyWateringCan('${key}')`,
    })).join("");
  } else if (activeShop === "fertilizers") {
    els.shop.innerHTML = Object.entries(FERTILIZERS).map(([key, item]) => shopRow({
      icon: item.emoji,
      title: `Pupuk ${item.name}`,
      note: `${money(item.price)} \uD83E\uDE99 \u2022 -${Math.round(item.reduce * 100)}% waktu \u2022 +${item.quality} kualitas`,
      button: selectedFertilizer === key ? "Beli+Pilih" : "Beli",
      disabled: false,
      onclick: `buyFertilizer('${key}')`,
    })).join("");
  } else if (activeShop === "land") {
    els.shop.innerHTML = LAND_PRICES.map((price, index) => index < 4 ? "" : shopRow({
      icon: state.plots[index].unlocked ? "\u2705" : "\uD83D\uDFEB",
      title: `Kotak ${index + 1}`,
      note: `${money(price)} \uD83E\uDE99 \u2022 kapasitas kebun +1`,
      button: state.plots[index].unlocked ? "Terbuka" : "Buka",
      disabled: state.plots[index].unlocked,
      onclick: `buyLand(${index})`,
    })).join("");
  } else if (activeShop === "auto") {
    const autoRows = Object.entries(AUTOMATION).map(([key, item]) => shopRow({
      icon: item.emoji,
      title: item.name,
      note: `${money(item.price)} \uD83E\uDE99 \u2022 ${item.desc}`,
      button: state.automation[key] ? "Aktif" : "Beli",
      disabled: state.automation[key],
      onclick: `buyAutomation('${key}')`,
    }));
    const nextTier = state.warehouseTier + 1;
    const whNote = nextTier < WAREHOUSE_TIERS.length
      ? `${money(WAREHOUSE_PRICES[nextTier])} \uD83E\uDE99 \u2022 kapasitas ${WAREHOUSE_TIERS[state.warehouseTier]} \u2192 ${WAREHOUSE_TIERS[nextTier]}`
      : `Maksimal (${WAREHOUSE_TIERS[state.warehouseTier]})`;
    autoRows.push(shopRow({
      icon: "\uD83D\uDCE6",
      title: "Upgrade Gudang",
      note: whNote,
      button: nextTier < WAREHOUSE_TIERS.length ? "Upgrade" : "Max",
      disabled: nextTier >= WAREHOUSE_TIERS.length,
      onclick: `upgradeWarehouse()`,
    }));
    els.shop.innerHTML = autoRows.join("");
  } else if (activeShop === "decor") {
    els.shop.innerHTML = Object.entries(DECORATIONS).map(([key, item]) => {
      const owned = state.decorations.includes(key);
      const cost = item.gems > 0 ? `${item.gems} \uD83D\uDC8E` : `${money(item.price)} \uD83E\uDE99`;
      return shopRow({
        icon: item.emoji,
        title: item.name,
        note: `${cost} \u2022 +3 \u2B50 reputasi`,
        button: owned ? "Terpasang" : "Beli",
        disabled: owned,
        onclick: `buyDecoration('${key}')`,
      });
    }).join("");
  }
}

function renderMissions() {
  if (!els.missions) return;
  const list = state.missions.list || [];
  els.missions.innerHTML = list.map((m, i) => {
    const prog = Math.min(state.counters[m.metric] || 0, m.target);
    const pct = Math.round((prog / m.target) * 100);
    const done = prog >= m.target;
    const rewardBits = [];
    if (m.reward.coins) rewardBits.push(`${money(m.reward.coins)} \uD83E\uDE99`);
    if (m.reward.gems) rewardBits.push(`${m.reward.gems} \uD83D\uDC8E`);
    const btn = m.claimed
      ? `<button class="mini-btn" disabled>Diklaim</button>`
      : `<button class="mini-btn" ${done ? "" : "disabled"} onclick="claimMission(${i})">Klaim</button>`;
    return `<div class="mission-row">
      <div class="mission-head"><strong>${m.text}</strong>${btn}</div>
      <div class="mission-meta"><small>${prog}/${m.target} \u2022 hadiah ${rewardBits.join(" + ")}</small></div>
      <span class="progress"><i style="width:${pct}%"></i></span>
    </div>`;
  }).join("");
}

function renderCollection() {
  if (!els.collection) return;
  const total = Object.keys(CROPS).length;
  const got = Object.keys(state.collection).length;
  const bonus = Math.round(collectionBonus() * 100);
  els.collection.innerHTML = `
    <div class="collection-summary"><strong>${got}/${total} jenis</strong><small>Bonus harga jual +${bonus}%</small></div>
    <div class="collection-chips">${Object.entries(CROPS).map(([key, crop]) =>
      `<span class="chip ${state.collection[key] ? "got" : ""}" title="${crop.name}">${state.collection[key] ? crop.emoji : "\u2753"}</span>`
    ).join("")}</div>`;
}

function renderSocial() {
  if (els.friends) {
    const helpedToday = state.friendsHelpedDate === todayKey() ? state.friendsHelped : [];
    els.friends.innerHTML = FRIENDS.map((f) => {
      const helped = helpedToday.includes(f.id);
      return `<div class="friend-row"><span>${f.emoji}</span><div><strong>${f.name}</strong><small>Kekayaan ~${money(f.worth)} \uD83E\uDE99</small></div>
        <button class="mini-btn" ${helped ? "disabled" : ""} onclick="visitFriend('${f.id}')">${helped ? "\u2713 Dibantu" : "Bantu siram"}</button></div>`;
    }).join("");
  }
  if (els.leaderboard) {
    const board = [
      { name: "Kamu", worth: playerNetWorth(), me: true },
      ...FRIENDS.map((f) => ({ name: f.name, worth: f.worth, me: false })),
    ].sort((a, b) => b.worth - a.worth);
    els.leaderboard.innerHTML = board.map((row, i) =>
      `<div class="board-row ${row.me ? "me" : ""}"><span class="rank">#${i + 1}</span><strong>${row.name}</strong><small>${money(row.worth)} \uD83E\uDE99</small></div>`
    ).join("");
  }
}

function renderLogs() {
  els.logs.innerHTML = state.logs.map((item) => `<div class="log-item">${item}</div>`).join("");
}

function renderTip() {
  const raw = state.plots.find((plot) => plot.unlocked && plot.status === "raw");
  const empty = state.plots.find((plot) => plot.unlocked && plot.status === "empty");
  const ready = state.plots.find((plot) => plot.unlocked && plot.status === "ready");
  if (ready) {
    els.tipTitle.textContent = "Panen sudah siap";
    els.tipText.textContent = `Klik kotak ${ready.id + 1} untuk panen, lalu jual hasil di gudang.`;
  } else if (raw) {
    els.tipTitle.textContent = "Garap tanah";
    els.tipText.textContent = `Klik kotak ${raw.id + 1} pakai cangkul. Butuh 5 detik.`;
  } else if (empty) {
    els.tipTitle.textContent = "Tanam benih";
    els.tipText.textContent = `Bibit aktif: ${CROPS[selectedSeed].name}. Klik kotak kosong untuk menanam.`;
  } else {
    els.tipTitle.textContent = "Rawat tanaman";
    els.tipText.textContent = "Siram di jendela 25%, 50%, 75% biar kualitas tetap tinggi.";
  }
}

// toast ringan = log + (opsional) bisa dikembangkan jadi popup.
function toast(message) {
  addLog(message);
  renderLogs();
}

// ---------- bind ----------
window.buySeeds = buySeeds;
window.buyWateringCan = buyWateringCan;
window.buyFertilizer = buyFertilizer;
window.buyLand = buyLand;
window.buyAutomation = buyAutomation;
window.upgradeWarehouse = upgradeWarehouse;
window.buyDecoration = buyDecoration;
window.claimMission = claimMission;
window.visitFriend = visitFriend;

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeShop = tab.dataset.shop;
    renderShop();
  });
});

document.querySelector("#sellAllBtn").addEventListener("click", sellAll);
document.querySelector("#saveBtn").addEventListener("click", () => {
  saveState();
  addLog("\uD83D\uDCBE Progress tersimpan di browser.");
  render();
});
document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset progress Tani Tap?")) return;
  localStorage.removeItem(SAVE_KEY);
  state = freshState();
  render();
});

setInterval(render, 1000);
render();
