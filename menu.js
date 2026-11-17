"use strict";

/* ---------- Menú de pausa y mapa ---------- */
// START abre/cierra el menú. Flechas arriba/abajo eligen, A acepta, B vuelve.
// En el mapa las flechas lo desplazan, A cambia el zoom y B vuelve al menú.
let menuOpen = false;
let menuView = "list"; // "list" | "map"
let menuSel = 0;
let mapCx = 0;
let mapCy = 0;
let mapLevel = 1; // 0 = cerca, 1 = medio, 2 = todo el mapa
let mapBase = null; // imagen 1 píxel por casilla, se crea la primera vez

// Casillas que se ven a lo ancho en cada nivel de zoom
const MAP_ACROSS = [24, 48, MAP_W + 6];
const MENU_ITEMS = [
  { act: "resume", label: "CONTINUAR" },
  { act: "map", label: "VER MAPA" },
];

// Paleta minimalista por tipo de casilla
const MAP_COLORS = {
  [T_WATER]: "#1b4a72",
  [T_SAND]: "#e3d6a2",
  [T_GRASS]: "#74ad5a",
  [T_LAGOON]: "#3a82b4",
  [T_PATH]: "#c4a46c",
  [T_PINK]: "#e48aad",
  [T_MONTE]: "#2f6a3b",
  [T_SHALLOW_SEA]: "#4f9fcf",
  [T_SHALLOW_LAGOON]: "#62b0d6",
  [T_SHALLOW_PINK]: "#eeb0c6",
  [T_PIER]: "#8a5a2e",
};

function buildMapBase() {
  const c = document.createElement("canvas");
  c.width = MAP_W;
  c.height = MAP_H;
  const g = c.getContext("2d");
  const img = g.createImageData(MAP_W, MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const hex = MAP_COLORS[tileAt(x, y)] || "#000000";
      const i = (y * MAP_W + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16);
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  mapBase = c;
}

const menuEl = () => document.getElementById("pauseMenu");

function openMenu() {
  menuOpen = true;
  menuView = "list";
  menuSel = 0;
  isPaused = true;
  menuEl().classList.remove("hidden");
  renderMenu();
}

function closeMenu() {
  menuOpen = false;
  isPaused = false;
  menuEl().classList.add("hidden");
}

// START: abre el menú, o lo cierra si ya está abierto
function togglePauseMenu() {
  if (menuOpen) return closeMenu();
  if (!gameStarted || isPaused) return;
  if (!dialogOverlay.classList.contains("hidden")) return;
  openMenu();
}

function openMapView() {
  menuView = "map";
  mapLevel = 1;
  mapCx = player.gx;
  mapCy = player.gy;
  if (!mapBase) buildMapBase();
  renderMenu();
}

function menuSelect(act) {
  if (act === "resume") closeMenu();
  else if (act === "map") openMapView();
}

// Flecha arriba/abajo pulsada (teclado, cruceta o joystick): cambia la opción
function menuNav(name) {
  if (menuView !== "list") return;
  const dir = name === "down" ? 1 : name === "up" ? -1 : 0;
  if (!dir) return;
  menuSel = (menuSel + dir + MENU_ITEMS.length) % MENU_ITEMS.length;
  renderMenu();
}

// Botón A
function menuA() {
  if (menuView === "list") menuSelect(MENU_ITEMS[menuSel].act);
  else mapLevel = (mapLevel + 1) % MAP_ACROSS.length;
}

// Botón B
function menuBack() {
  if (menuView === "map") {
    menuView = "list";
    renderMenu();
  } else closeMenu();
}

function renderMenu() {
  document
    .getElementById("pausePanel")
    .classList.toggle("hidden", menuView !== "list");
  document
    .getElementById("mapView")
    .classList.toggle("hidden", menuView !== "map");
  const list = document.getElementById("pauseList");
  list.innerHTML = "";
  MENU_ITEMS.forEach((it, i) => {
    const li = document.createElement("li");
    li.textContent = it.label;
    if (i === menuSel) li.className = "sel";
    li.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      menuSel = i;
      menuSelect(it.act);
    });
    list.appendChild(li);
  });
}

// Se llama en cada cuadro (también con el juego en pausa)
function updateMenu() {
  if (!menuOpen) return;
  if (menuView === "map") {
    const across = MAP_ACROSS[mapLevel];
    if (mapLevel === 2) {
      mapCx = MAP_W / 2;
      mapCy = MAP_H / 2;
    } else {
      const sp = across / 160;
      if (keys.left) mapCx -= sp;
      if (keys.right) mapCx += sp;
      if (keys.up) mapCy -= sp;
      if (keys.down) mapCy += sp;
      mapCx = Math.max(0, Math.min(MAP_W - 1, mapCx));
      mapCy = Math.max(0, Math.min(MAP_H - 1, mapCy));
    }
    drawMapView();
  }
}

function drawMapView() {
  const cv = document.getElementById("mapCanvas");
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#0b1620";
  g.fillRect(0, 0, w, h);
  g.imageSmoothingEnabled = false;

  // píxeles por casilla; el nivel "todo el mapa" cabe completo en ancho y alto
  const s =
    mapLevel === 2 ? Math.min(w, h) / MAP_ACROSS[2] : w / MAP_ACROSS[mapLevel];
  g.setTransform(s, 0, 0, s, w / 2 - mapCx * s, h / 2 - mapCy * s);
  g.drawImage(mapBase, -0.5, -0.5);

  // Marcador: sitios visitados y cofres abiertos
  const u = 1 / s;
  checkpoints.forEach((c) => {
    if (!c.visited) return;
    g.fillStyle = "#ffffff";
    g.save();
    g.translate(c.gx, c.gy);
    g.rotate(Math.PI / 4);
    g.fillRect(-3 * u, -3 * u, 6 * u, 6 * u);
    g.restore();
  });
  treasures.forEach((t) => {
    if (!t.opened) return;
    g.fillStyle = "#ffd166";
    g.fillRect(t.gx - 3 * u, t.gy - 3 * u, 6 * u, 6 * u);
  });

  // Exploradora (parpadea)
  if (Math.floor(performance.now() / 350) % 2 === 0) {
    g.fillStyle = "#000000";
    g.fillRect(player.gx - 5 * u, player.gy - 5 * u, 10 * u, 10 * u);
    g.fillStyle = "#ff3b5c";
    g.fillRect(player.gx - 3.5 * u, player.gy - 3.5 * u, 7 * u, 7 * u);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
