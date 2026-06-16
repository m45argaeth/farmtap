const CROPS = {
  bayam: { name: "Bayam", emoji: "🥬", seedCost: 10, sell: 20, growMs: 60_000, level: 1 },
  sawi: { name: "Sawi", emoji: "🥗", seedCost: 25, sell: 50, growMs: 180_000, level: 2 },
  kangkung: { name: "Kangkung", emoji: "🌿", seedCost: 60, sell: 120, growMs: 480_000, level: 3 },
  wortel: { name: "Wortel", emoji: "🥕", seedCost: 150, sell: 300, growMs: 1_200_000, level: 4 },
  cabai: { name: "Cabai", emoji: "🌶️", seedCost: 400, sell: 800, growMs: 2_700_000, level: 5 },
};

const WATERING_CANS = {
  dasar: { name: "Dasar", reduce: 0.02, price: 0 },
  tembaga: { name: "Tembaga", reduce: 0.05, price: 300 },
  perak: { name: "Perak", reduce: 0.08, price: 1200 },
  emas: { name: "Emas", reduce: 0.10, price: 4000 },
};

const FERTILIZERS = {
  kandang: { name: "Kandang", emoji: "🧺", reduce: 0.06, quality: 10, price: 5 },
  kompos: { name: "Kompos", emoji: "🍂", reduce: 0.12, quality: 10, price: 12 },
  npk: { name: "NPK", emoji: "🧪", reduce: 0.18, quality: 10, price: 30 },
  premium: { name: "Premium", emoji: "✨", reduce: 0.24, quality: 10, price: 75 },
  super: { name: "Super", emoji: "🚀", reduce: 0.30, quality: 10, price: 175 },
};

const LAND_PRICES = [0, 0, 0, 0, 200, 220, 242, 266];
const PREPARE_MS = 5_000;
const SAVE_KEY = "tani-tap-save-v1";

const els = {
  coins: document.querySelector("#coinsText"),
  rep: document.querySelector("#repText"),
  harvest: document.querySelector("#harvestText"),
  plots: document.querySelector("#plotsText"),
  farm: document.querySelector("#farmGrid"),
  inventory: document.querySelector("#inventoryList"),
  shop: document.querySelector("#shopList"),
  logs: document.querySelector("#logList"),
  tipTitle: document.querySelector("#tipTitle"),
  tipText: document.querySelector("#tipText"),
  template: document.querySelector("#plotTemplate"),
};

let activeShop = "seeds";
let state = loadState();
let selectedSeed = "bayam";
let selectedFertilizer = null;

function freshState() {
  return {
    coins: 0,
    rep: 0,
    harvestCount: 0,
    unlockedPlots: 4,
    wateringCan: "dasar",
    seeds: { bayam: 10 },
    inventory: {},
    fertilizers: {},
    logs: ["🌱 Starter pack diterima: 10 Bibit Bayam, Cangkul, Penyiram Dasar."],
    plots: Array.from({ length: 8 }, (_, index) => ({
      id: index,
      unlocked: index < 4,
      status: "raw",
      crop: null,
      startedAt: null,
      readyAt: null,
      wateredWindows: [],
      missedWindows: [],
      quality: 100,
      fertilizer: null,
    })),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.plots) || parsed.plots.length !== 8) return freshState();
    return parsed;
  } catch {
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
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

function addLog(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 18);
}

function cropLevelUnlocked(crop) {
  const level = Math.floor(state.rep / 12) + 1;
  return crop.level <= level;
}

function getQualityTier(score) {
  if (score >= 80) return { label: "Premium", stars: "⭐⭐⭐", multiplier: 1.5 };
  if (score >= 50) return { label: "Segar", stars: "⭐⭐", multiplier: 1 };
  return { label: "Layu", stars: "⭐", multiplier: 0.6 };
}

function getPlotProgress(plot) {
  const now = Date.now();
  if (plot.status === "preparing") return clamp((now - plot.startedAt) / PREPARE_MS, 0, 1);
  if (plot.status === "growing") return clamp((now - plot.startedAt) / (plot.readyAt - plot.startedAt), 0, 1);
  if (plot.status === "ready") return 1;
  return 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function tickPlots() {
  const now = Date.now();
  for (const plot of state.plots) {
    if (!plot.unlocked) continue;
    if (plot.status === "preparing" && now >= plot.startedAt + PREPARE_MS) {
      plot.status = "empty";
      plot.startedAt = null;
      addLog(`🟫 Kotak ${plot.id + 1} siap ditanami.`);
    }
    if (plot.status === "growing") {
      updateMissedWatering(plot, now);
      if (now >= plot.readyAt) {
        plot.status = "ready";
        addLog(`${CROPS[plot.crop].emoji} ${CROPS[plot.crop].name} di kotak ${plot.id + 1} siap panen!`);
      }
    }
  }
}

function updateMissedWatering(plot, now) {
  const total = plot.readyAt - plot.startedAt;
  [0.25, 0.5, 0.75].forEach((windowPoint) => {
    if (plot.wateredWindows.includes(windowPoint) || plot.missedWindows.includes(windowPoint)) return;
    const windowTime = plot.startedAt + total * windowPoint;
    const graceMs = Math.min(20_000, total * 0.12);
    if (now > windowTime + graceMs) {
      plot.missedWindows.push(windowPoint);
      plot.quality = clamp(plot.quality - 20, 0, 100);
      addLog(`💧 Kotak ${plot.id + 1} kelewat siram: kualitas -20.`);
    }
  });
}

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
  addLog(`⛏️ Kotak ${plot.id + 1} sedang digarap (5 detik).`);
  render();
}

function plantCrop(plot) {
  const crop = CROPS[selectedSeed];
  if (!cropLevelUnlocked(crop)) return addLog(`🔒 ${crop.name} belum kebuka. Naikkan reputasi dulu.`);
  if ((state.seeds[selectedSeed] || 0) <= 0) return addLog(`🌱 Bibit ${crop.name} habis. Beli di toko dulu.`);

  state.seeds[selectedSeed] -= 1;
  const fertilizer = selectedFertilizer && (state.fertilizers[selectedFertilizer] || 0) > 0 ? FERTILIZERS[selectedFertilizer] : null;
  if (fertilizer) state.fertilizers[selectedFertilizer] -= 1;

  const fertilizerReduce = fertilizer?.reduce || 0;
  const duration = crop.growMs * (1 - Math.min(0.5, fertilizerReduce));
  plot.status = "growing";
  plot.crop = selectedSeed;
  plot.startedAt = Date.now();
  plot.readyAt = Date.now() + duration;
  plot.wateredWindows = [];
  plot.missedWindows = [];
  plot.quality = clamp(100 + (fertilizer?.quality || 0), 0, 100);
  plot.fertilizer = selectedFertilizer;
  addLog(`${crop.emoji} Menanam ${crop.name}${fertilizer ? ` + Pupuk ${fertilizer.name}` : ""}.`);
  render();
}

function waterPlot(plot) {
  const total = plot.readyAt - plot.startedAt;
  const now = Date.now();
  const nextWindow = [0.25, 0.5, 0.75].find((windowPoint) => {
    if (plot.wateredWindows.includes(windowPoint) || plot.missedWindows.includes(windowPoint)) return false;
    const windowTime = plot.startedAt + total * windowPoint;
    const earlyMs = Math.min(20_000, total * 0.16);
    const lateMs = Math.min(20_000, total * 0.12);
    return now >= windowTime - earlyMs && now <= windowTime + lateMs;
  });

  if (!nextWindow) {
    addLog("💧 Belum waktunya siram. Tunggu jendela 25% / 50% / 75%.");
    return;
  }

  plot.wateredWindows.push(nextWindow);
  const reduce = WATERING_CANS[state.wateringCan].reduce;
  const newReady = plot.readyAt - CROPS[plot.crop].growMs * reduce;
  const maxReduction = CROPS[plot.crop].growMs * 0.3;
  const minReadyFromWater = plot.startedAt + CROPS[plot.crop].growMs - maxReduction;
  const minReadyTotal = plot.startedAt + CROPS[plot.crop].growMs * 0.5;
  plot.readyAt = Math.max(now + 1_000, minReadyTotal, Math.max(newReady, minReadyFromWater));
  addLog(`💧 Kotak ${plot.id + 1} disiram (${WATERING_CANS[state.wateringCan].name}).`);
  render();
}

function harvestPlot(plot) {
  const crop = CROPS[plot.crop];
  const tier = getQualityTier(plot.quality);
  const itemKey = `${plot.crop}:${tier.label}`;
  state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
  state.rep += crop.level;
  state.harvestCount += 1;
  addLog(`${crop.emoji} Panen ${crop.name} ${tier.stars} ${tier.label}. Masuk gudang.`);
  Object.assign(plot, {
    status: "empty",
    crop: null,
    startedAt: null,
    readyAt: null,
    wateredWindows: [],
    missedWindows: [],
    quality: 100,
    fertilizer: null,
  });
  render();
}

function sellAll() {
  let gained = 0;
  for (const [key, amount] of Object.entries(state.inventory)) {
    const [cropKey, tierLabel] = key.split(":");
    const crop = CROPS[cropKey];
    const tier = [100, 70, 30].map(getQualityTier).find((item) => item.label === tierLabel) || getQualityTier(70);
    gained += crop.sell * tier.multiplier * amount;
  }
  if (gained <= 0) return addLog("📦 Gudang masih kosong.");
  state.coins += Math.floor(gained);
  state.inventory = {};
  addLog(`🪙 Jual semua hasil panen: +${money(gained)} koin.`);
  render();
}

function buySeeds(key) {
  const crop = CROPS[key];
  if (!cropLevelUnlocked(crop)) return addLog(`🔒 ${crop.name} belum kebuka.`);
  if (state.coins < crop.seedCost) return addLog("🪙 Koin belum cukup buat beli bibit.");
  state.coins -= crop.seedCost;
  state.seeds[key] = (state.seeds[key] || 0) + 1;
  selectedSeed = key;
  addLog(`🌱 Beli 1 Bibit ${crop.name}.`);
  render();
}

function buyWateringCan(key) {
  const can = WATERING_CANS[key];
  if (state.wateringCan === key) return;
  if (state.coins < can.price) return addLog("🪙 Koin belum cukup buat upgrade penyiram.");
  state.coins -= can.price;
  state.wateringCan = key;
  addLog(`💧 Penyiram upgrade ke ${can.name}.`);
  render();
}

function buyFertilizer(key) {
  const fertilizer = FERTILIZERS[key];
  if (state.coins < fertilizer.price) return addLog("🪙 Koin belum cukup buat beli pupuk.");
  state.coins -= fertilizer.price;
  state.fertilizers[key] = (state.fertilizers[key] || 0) + 1;
  selectedFertilizer = key;
  addLog(`${fertilizer.emoji} Beli Pupuk ${fertilizer.name}.`);
  render();
}

function buyLand(index) {
  const price = LAND_PRICES[index];
  if (state.coins < price) return addLog(`🔒 Kotak ${index + 1} butuh ${money(price)} koin.`);
  state.coins -= price;
  state.unlockedPlots += 1;
  state.plots[index].unlocked = true;
  state.plots[index].status = "raw";
  addLog(`🟫 Kotak ${index + 1} kebuka! Garap dulu sebelum tanam.`);
  render();
}

function render() {
  tickPlots();
  saveState();
  renderStats();
  renderFarm();
  renderInventory();
  renderShop();
  renderLogs();
  renderTip();
}

function renderStats() {
  els.coins.textContent = money(state.coins);
  els.rep.textContent = money(state.rep);
  els.harvest.textContent = money(state.harvestCount);
  els.plots.textContent = `${state.unlockedPlots} / 8 aktif`;
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
    els.farm.appendChild(node);
  });
}

function getPlotEmoji(plot, index) {
  if (!plot.unlocked) return "🔒";
  if (plot.status === "raw") return "🟫";
  if (plot.status === "preparing") return "⛏️";
  if (plot.status === "empty") return "🕳️";
  if (plot.status === "ready") return CROPS[plot.crop].emoji;
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
  if (!plot.unlocked) return `${money(LAND_PRICES[index])} 🪙 untuk buka`;
  if (plot.status === "raw") return "Klik untuk garap";
  if (plot.status === "preparing") return fmtTime(plot.startedAt + PREPARE_MS - Date.now());
  if (plot.status === "empty") return `Tanam: ${CROPS[selectedSeed].name}`;
  if (plot.status === "ready") return `Panen • Kualitas ${plot.quality}`;
  return `${fmtTime(plot.readyAt - Date.now())} • Q${plot.quality}`;
}

function renderInventory() {
  const rows = [];
  Object.entries(state.seeds).forEach(([key, amount]) => amount > 0 && rows.push([CROPS[key].emoji, `Bibit ${CROPS[key].name}`, `${amount} pcs`]));
  Object.entries(state.fertilizers).forEach(([key, amount]) => amount > 0 && rows.push([FERTILIZERS[key].emoji, `Pupuk ${FERTILIZERS[key].name}`, `${amount} pcs`]));
  Object.entries(state.inventory).forEach(([key, amount]) => {
    const [cropKey, tier] = key.split(":");
    rows.push([CROPS[cropKey].emoji, `${CROPS[cropKey].name} ${tier}`, `${amount} hasil`]);
  });

  els.inventory.innerHTML = rows.length ? rows.map(([emoji, title, note]) => `
    <div class="inventory-row"><span>${emoji}</span><div><strong>${title}</strong><small>${note}</small></div></div>
  `).join("") : `<p class="empty">Inventory kosong.</p>`;
}

function renderShop() {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.shop === activeShop));
  if (activeShop === "seeds") {
    els.shop.innerHTML = Object.entries(CROPS).map(([key, crop]) => shopRow({
      icon: crop.emoji,
      title: `Bibit ${crop.name}`,
      note: `${money(crop.seedCost)} 🪙 • jual ${money(crop.sell)} 🪙 • Lv ${crop.level}`,
      button: selectedSeed === key ? "Dipilih" : "Beli",
      disabled: !cropLevelUnlocked(crop),
      onclick: `buySeeds('${key}')`,
    })).join("");
  }
  if (activeShop === "tools") {
    els.shop.innerHTML = Object.entries(WATERING_CANS).map(([key, can]) => shopRow({
      icon: "💧",
      title: `Penyiram ${can.name}`,
      note: `${money(can.price)} 🪙 • -${Math.round(can.reduce * 100)}% / siram`,
      button: state.wateringCan === key ? "Dipakai" : "Beli",
      disabled: can.price === 0 || state.wateringCan === key,
      onclick: `buyWateringCan('${key}')`,
    })).join("");
  }
  if (activeShop === "fertilizers") {
    els.shop.innerHTML = Object.entries(FERTILIZERS).map(([key, item]) => shopRow({
      icon: item.emoji,
      title: `Pupuk ${item.name}`,
      note: `${money(item.price)} 🪙 • -${Math.round(item.reduce * 100)}% waktu • +${item.quality} kualitas`,
      button: selectedFertilizer === key ? "Beli+Pilih" : "Beli",
      disabled: false,
      onclick: `buyFertilizer('${key}')`,
    })).join("");
  }
  if (activeShop === "land") {
    els.shop.innerHTML = LAND_PRICES.map((price, index) => index < 4 ? "" : shopRow({
      icon: state.plots[index].unlocked ? "✅" : "🟫",
      title: `Kotak ${index + 1}`,
      note: `${money(price)} 🪙 • kapasitas kebun +1`,
      button: state.plots[index].unlocked ? "Terbuka" : "Buka",
      disabled: state.plots[index].unlocked,
      onclick: `buyLand(${index})`,
    })).join("");
  }
}

function shopRow({ icon, title, note, button, disabled, onclick }) {
  return `<div class="shop-row"><span>${icon}</span><div><strong>${title}</strong><small>${note}</small></div><button ${disabled ? "disabled" : ""} onclick="${onclick}">${button}</button></div>`;
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
    els.tipText.textContent = "Siram di jendela 25%, 50%, 75% agar kualitas tetap tinggi.";
  }
}

window.buySeeds = buySeeds;
window.buyWateringCan = buyWateringCan;
window.buyFertilizer = buyFertilizer;
window.buyLand = buyLand;

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeShop = tab.dataset.shop;
    renderShop();
  });
});

document.querySelector("#sellAllBtn").addEventListener("click", sellAll);
document.querySelector("#saveBtn").addEventListener("click", () => {
  saveState();
  addLog("💾 Progress tersimpan di browser.");
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
