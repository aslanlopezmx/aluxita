"use strict";

/* ---------- Salida de nivel ---------- */
// Para salir hay que haber encontrado TODOS los cofres y TODOS los objetos del nivel
// (globitos, bevis, quesos y la espada si el nivel tiene una).

// Lista de lo que falta, p. ej. ["2 cofres", "3 🎈"]
function levelMissing() {
  const falta = [];
  const c = treasures.length - foundCount;
  if (c > 0) falta.push(c + (c === 1 ? " cofre" : " cofres"));
  collectibles.forEach((g) => {
    const n = g.items.length - g.count;
    if (n > 0) falta.push(n + " " + g.def.emoji);
  });
  if (swordItem && !swordItem.collected) falta.push("la espada ⚔️");
  return falta;
}
const levelComplete = () => levelMissing().length === 0;

let exitBusy = false;

// Se llama en cada cuadro: al entrar a la zona de salida, avisa qué falta o inicia la salida
function checkExit() {
  if (isPaused || exitBusy || player.boat || !exits.length) return;
  const ex = exits[0];
  const inside = Math.hypot(player.gx - ex.gx, player.gy - ex.gy) < EXIT_R;
  if (inside && !ex.inside) {
    ex.inside = true;
    const falta = levelMissing();
    if (falta.length)
      openSignDialog(
        "Aún no puedes salir.\n\nTe falta encontrar: " + falta.join(", ") + ".",
      );
    else beginLevelExit();
  } else if (!inside) ex.inside = false;
}

// Cinemática de fin de nivel → "CARGANDO" → siguiente nivel (o final del juego)
function beginLevelExit() {
  exitBusy = true;
  isPaused = true;
  keys = { up: false, down: false, left: false, right: false };
  startCutscene("fin" + NIVEL, () => {
    if (NIVEL >= NIVELES_TOTAL) finDelJuego();
    else irANivel(NIVEL + 1);
    return true;
  });
}

// Guarda lo que pasa al siguiente nivel (espada y perros encontrados) y recarga la página
function irANivel(n) {
  const carry = {
    sword: !!hasSword,
    dogs: dogs.filter((d) => d.found).map((d) => d.cfg.key),
    mem: MEM_OFFSET + treasures.length, // recuerdos ya usados: el siguiente nivel sigue desde ahí
  };
  setPendiente({ nivel: n, modo: "carry", carry });
}

// Último nivel superado: vuelve a la pantalla principal
function finDelJuego() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch (e) {}
  location.reload();
}

function setPendiente(p) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch (e) {}
  location.reload();
}

// Partida nueva: siempre empieza en el nivel 1 con la cinemática de introducción
function nuevaPartida() {
  if (NIVEL !== 1) return setPendiente({ nivel: 1, modo: "nueva" });
  startCutscene("intro", () => {
    startGame(false);
  });
}

// Al cargar la página: si venimos de otro nivel, entra directo al juego
function autoStart() {
  if (!ARRANQUE) return;
  if (ARRANQUE === "nueva") return nuevaPartida();
  const t = document.getElementById("titleScreen");
  if (t) t.remove();
  gameStarted = true;
  isPaused = false;
  health = MAX_HEALTH;
  updateHUD();
  saveGame(); // autoguardado al llegar al nivel nuevo
  // Fundido desde la pantalla de carga
  const load = document.getElementById("loadingScreen");
  load.classList.remove("hidden", "fading");
  setTimeout(() => {
    load.classList.add("fading");
    setTimeout(() => load.classList.add("hidden"), 500);
  }, 700);
}
