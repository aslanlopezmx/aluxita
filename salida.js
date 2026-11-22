"use strict";

/* ---------- Salida de nivel ---------- */
// Para salir hay que haber encontrado TODOS los cofres y TODOS los objetos del nivel
// (globitos, bevis, quesos, la espada si el nivel tiene una y los perros del nivel).

// Lista de lo que falta, p. ej. ["2 cofres", "3 🎈"]
function levelMissing() {
  const falta = [];
  // Opción secreta (menú de pausa, 3 × Y): la salida no exige nada
  if (typeof secretExitOpen !== "undefined" && secretExitOpen) return falta;
  const c = treasures.length - foundCount;
  if (c > 0) falta.push(c + (c === 1 ? " cofre" : " cofres"));
  collectibles.forEach((g) => {
    const n = g.items.length - g.count;
    if (n > 0) falta.push(n + " " + g.def.emoji);
  });
  if (swordItem && !swordItem.collected) falta.push("la espada ⚔️");
  if (boomerangItem && !boomerangItem.collected) falta.push("el boomerang 🪃");
  if (redItem && !redItem.collected) falta.push("la red 🥅");
  // Los perros que hay en este nivel también son obligatorios (los que ya venían
  // de un nivel anterior llegan con found = true, así que no cuentan)
  dogs.forEach((d) => {
    if (!d.found) falta.push(d.name + " 🐶");
  });
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
        "Aún no puedes salir.\n\nTe falta encontrar:\n" +
          falta.map((f) => "- " + f).join("\n"),
      );
    else beginLevelExit();
  } else if (!inside) ex.inside = false;
}

// Cinemática de fin de nivel → "CARGANDO" → siguiente nivel (o final del juego)
function beginLevelExit() {
  exitBusy = true;
  isPaused = true;
  keys = { up: false, down: false, left: false, right: false };
  const ultimo = NIVEL >= NIVELES_TOTAL;
  if (ultimo && typeof collagePreload === "function") collagePreload(); // fotos listas al terminar la cinemática
  startCutscene(
    "fin" + NIVEL,
    () => {
      // Último nivel: tras la cinemática final se muestra el collage de recuerdos
      // (su botón regresa al menú principal con finDelJuego)
      if (ultimo) {
        showCollage();
        return;
      }
      irANivel(NIVEL + 1);
      return true;
    },
    { sinCarga: ultimo, mantener: ultimo },
  );
}

// Guarda lo que pasa al siguiente nivel (espada y perros encontrados) y recarga la página
function irANivel(n) {
  const carry = {
    sword: !!hasSword,
    boomerang: !!hasBoomerang,
    red: !!hasRed,
    dogs: dogs.filter((d) => d.found).map((d) => d.cfg.key),
    mem: MEM_OFFSET + treasures.length, // recuerdos ya usados: el siguiente nivel sigue desde ahí
  };
  setPendiente({ nivel: n, modo: "carry", carry });
}

// Último nivel superado (se llama desde el botón del collage): vuelve a la pantalla principal
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
  if (ARRANQUE === "nueva") {
    // Se llega aquí tras recargar la página desde otro nivel: la pantalla de carga ya
    // se veía desde el HTML (así no se ve el lienzo azul). Se lanza la cinemática de
    // introducción por debajo y la carga se desvanece para dejarla ver.
    nuevaPartida();
    const load = document.getElementById("loadingScreen");
    load.classList.remove("hidden", "fading");
    // "arranque" se queda: mantiene oculta la pantalla de título hasta que empiece el juego
    document.documentElement.classList.remove("arranque-carga");
    setTimeout(() => {
      if (cutLoading) return; // la cinemática ya se saltó y usa la pantalla de carga
      load.classList.add("fading");
      setTimeout(() => {
        if (!cutLoading) load.classList.add("hidden");
      }, 500);
    }, 500);
    return;
  }
  const t = document.getElementById("titleScreen");
  if (t) t.remove();
  gameStarted = true;
  isPaused = false;
  health = MAX_HEALTH;
  updateHUD();
  // Autoguardado al llegar al nivel nuevo (no en el modo desarrollo: así el selector
  // de nivel no pisa la partida guardada)
  if (ARRANQUE !== "dev") saveGame();
  // Fundido desde la pantalla de carga
  const load = document.getElementById("loadingScreen");
  load.classList.remove("hidden", "fading");
  // La pantalla de carga ya se veía desde el HTML; ahora la controla el JS
  document.documentElement.classList.remove("arranque", "arranque-carga");
  setTimeout(() => {
    load.classList.add("fading");
    setTimeout(() => load.classList.add("hidden"), 500);
  }, 700);
}
