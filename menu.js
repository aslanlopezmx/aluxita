"use strict";

/* ---------- Menú de pausa y mapa ---------- */
// START abre/cierra el menú. Flechas arriba/abajo eligen, A acepta, B vuelve.
// En el mapa las flechas lo desplazan, A cambia el zoom y B vuelve al menú.
let menuOpen = false;
let menuView = "list"; // "list" | "map" | "confirm"
let menuSel = 0;
let mapCx = 0;
let mapCy = 0;
let mapLevel = 1; // 0 = cerca, 1 = medio, 2 = todo el mapa
let mapBase = null; // imagen 1 píxel por casilla, se crea la primera vez

// Casillas que se ven a lo ancho en cada nivel de zoom
const MAP_ACROSS = [24, 48, MAP_W + 6];
const MENU_ITEMS = [
  { act: "resume", label: "CONTINUAR" },
  { act: "save", label: "GUARDAR" },
  { act: "map", label: "VER MAPA" },
  { act: "exit", label: "SALIR AL MENÚ" },
];
const CONFIRM_ITEMS = [
  { act: "exitNo", label: "NO, VOLVER" },
  { act: "exitYes", label: "SÍ, SALIR" },
];
let pauseMsgT = null;
const curItems = () => (menuView === "confirm" ? CONFIRM_ITEMS : MENU_ITEMS);

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
  setPauseMsg("");
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

function setPauseMsg(text, color) {
  const el = document.getElementById("pauseMsg");
  el.textContent = text;
  el.style.color = color || "";
  clearTimeout(pauseMsgT);
  if (text) pauseMsgT = setTimeout(() => (el.textContent = ""), 2200);
}

function menuSelect(act) {
  if (act === "resume") closeMenu();
  else if (act === "map") openMapView();
  else if (act === "save") {
    if (saveGame()) setPauseMsg("¡PARTIDA GUARDADA!");
    else setPauseMsg("NO SE PUDO GUARDAR", "#ff8a8a");
  } else if (act === "exit") {
    menuView = "confirm";
    menuSel = 0; // "NO, VOLVER" queda seleccionado por seguridad
    setPauseMsg("");
    renderMenu();
  } else if (act === "exitNo") {
    menuView = "list";
    menuSel = MENU_ITEMS.findIndex((it) => it.act === "exit");
    renderMenu();
  } else if (act === "exitYes") {
    // Vuelve a la pantalla principal reiniciando el juego (lo no guardado se pierde)
    location.reload();
  }
}

// Flecha arriba/abajo pulsada (teclado, cruceta o joystick): cambia la opción
function menuNav(name) {
  if (menuView === "map") return;
  const dir = name === "down" ? 1 : name === "up" ? -1 : 0;
  if (!dir) return;
  const n = curItems().length;
  menuSel = (menuSel + dir + n) % n;
  renderMenu();
}

// Flecha pulsada en cualquier pantalla (título o menú de pausa)
function uiNav(name) {
  if (levelPickOpen) return levelPickNav(name);
  if (!gameStarted) titleNav(name);
  else if (menuOpen) menuNav(name);
}

// Botón A
function menuA() {
  if (menuView === "map") mapLevel = (mapLevel + 1) % MAP_ACROSS.length;
  else menuSelect(curItems()[menuSel].act);
}

// Botón B
function menuBack() {
  if (menuView === "map" || menuView === "confirm") {
    menuView = "list";
    renderMenu();
  } else closeMenu();
}

function renderMenu() {
  document
    .getElementById("pausePanel")
    .classList.toggle("hidden", menuView === "map");
  const confirming = menuView === "confirm";
  document.getElementById("pauseTitle").textContent = confirming
    ? "¿SALIR?"
    : "PAUSA";
  document.getElementById("pauseHint").innerHTML = confirming
    ? "EL PROGRESO NO GUARDADO<br>SE PERDERÁ"
    : "▲▼ ELEGIR &nbsp; A ACEPTAR &nbsp; START VOLVER";
  document
    .getElementById("mapView")
    .classList.toggle("hidden", menuView !== "map");
  const list = document.getElementById("pauseList");
  list.innerHTML = "";
  curItems().forEach((it, i) => {
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

/* ---------- Pantalla principal: partida nueva o guardada ---------- */
// START (o un toque) en la pantalla de título abre la elección; A o START aceptan.
const TITLE_ITEMS = [
  { act: "new", label: "PARTIDA NUEVA" },
  { act: "load", label: "PARTIDA GUARDADA" },
];
let titleStage = "press"; // "press" | "choose"
let titleSel = 0;

const titleItemOK = (it) => it.act !== "load" || hasSave();

function refreshTitleList() {
  const list = document.getElementById("titleList");
  if (!list) return;
  if (!titleItemOK(TITLE_ITEMS[titleSel]))
    titleSel = TITLE_ITEMS.findIndex(titleItemOK);
  list.innerHTML = "";
  TITLE_ITEMS.forEach((it, i) => {
    const ok = titleItemOK(it);
    const li = document.createElement("li");
    li.textContent = ok ? it.label : it.label + " (VACÍA)";
    li.className = (i === titleSel ? "sel " : "") + (ok ? "" : "off");
    li.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (!ok) return;
      titleSel = i;
      titleAccept();
    });
    list.appendChild(li);
  });
}

// START / toque en el título: la primera vez muestra la elección; después acepta
function titleStart() {
  if (gameStarted) return;
  if (cutActive) return cutNext();
  if (levelPickOpen) return levelPickA();
  if (titleStage === "press") {
    titleStage = "choose";
    titleSel = hasSave() ? 1 : 0; // si hay guardado, se propone continuarlo
    document.getElementById("titleStart").classList.add("hidden");
    document.getElementById("titleList").classList.remove("hidden");
    document.getElementById("titleHint").classList.remove("hidden");
    refreshTitleList();
  } else titleAccept();
}

function titleNav(name) {
  if (cutActive || levelPickOpen || titleStage !== "choose") return;
  const dir = name === "down" ? 1 : name === "up" ? -1 : 0;
  if (!dir) return;
  const n = TITLE_ITEMS.length;
  for (let k = 1; k <= n; k++) {
    const j = (titleSel + dir * k + n * k) % n;
    if (titleItemOK(TITLE_ITEMS[j])) {
      titleSel = j;
      break;
    }
  }
  refreshTitleList();
}

// Botón A en el título: acepta la opción (o abre la elección)
function titleA() {
  if (cutActive) return cutNext();
  if (levelPickOpen) return levelPickA();
  if (titleStage === "choose") titleAccept();
  else titleStart();
}

function titleAccept() {
  const it = TITLE_ITEMS[titleSel];
  if (cutActive || !titleItemOK(it)) return;
  if (it.act === "load") startGame(true);
  else nuevaPartida();
}

/* ---------- Selector de nivel (para desarrollo) ---------- */
// SELECT (o Z) en la pantalla principal abre una ventana con todos los niveles.
// Al elegir uno, la página se recarga y entra directo a ese nivel (sin cinemática,
// sin tocar la partida guardada). Con "ESPADA Y PERROS: SÍ" llega como si ya
// hubiera pasado los niveles anteriores (con la espada y los perros).
let levelPickOpen = false;
let levelPickSel = 0;
let levelPickKit = true;

function openLevelPicker() {
  if (gameStarted || cutActive || levelPickOpen) return;
  levelPickOpen = true;
  levelPickSel = Math.max(0, Math.min(NIVELES_TOTAL - 1, NIVEL - 1)); // el nivel actual
  renderLevelPicker();
  document.getElementById("levelPicker").classList.remove("hidden");
}

function closeLevelPicker() {
  levelPickOpen = false;
  document.getElementById("levelPicker").classList.add("hidden");
}

// SELECT: en el título abre/cierra el selector; durante el juego cambia el zoom
function pressSelect() {
  if (cutActive) return;
  if (!gameStarted)
    return levelPickOpen ? closeLevelPicker() : openLevelPicker();
  cycleZoom();
}

function levelPickNav(name) {
  const dir = name === "down" ? 1 : name === "up" ? -1 : 0;
  if (!dir) return;
  const n = NIVELES_TOTAL + 1; // niveles + la opción de espada y perros
  levelPickSel = (levelPickSel + dir + n) % n;
  renderLevelPicker();
}

function levelPickA() {
  if (levelPickSel < NIVELES_TOTAL) return irANivelDev(levelPickSel + 1);
  levelPickKit = !levelPickKit;
  renderLevelPicker();
}

function irANivelDev(n) {
  const carry =
    n > 1 && levelPickKit
      ? {
          sword: true,
          boomerang: true,
          dogs: DOG_KINDS.map((d) => d.key),
          mem: 0,
        }
      : null;
  setPendiente({ nivel: n, modo: "dev", carry });
}

function renderLevelPicker() {
  const list = document.getElementById("levelList");
  list.innerHTML = "";
  const rows = [];
  for (let i = 1; i <= NIVELES_TOTAL; i++)
    rows.push("NIVEL " + i + (i === NIVEL ? " (ACTUAL)" : ""));
  rows.push("ESPADA Y PERROS: " + (levelPickKit ? "SÍ" : "NO"));
  rows.forEach((label, i) => {
    const li = document.createElement("li");
    li.textContent = label;
    if (i === levelPickSel) li.className = "sel";
    li.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      levelPickSel = i;
      levelPickA();
    });
    list.appendChild(li);
  });
}

// El aviso "SELECT: ELEGIR NIVEL" del título también se puede tocar
(function () {
  const el = document.getElementById("titleSelect");
  if (!el) return;
  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    openLevelPicker();
  });
})();
