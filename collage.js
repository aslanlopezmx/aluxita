"use strict";

/* ---------- Collage final de recuerdos ---------- */
// Después de la cinemática final se abre una pantalla que cubre TODA la ventana
// (no solo la consola) con las fotos de MEMORIES en forma de collage. Se puede
// desplazar sin fin hacia arriba o hacia abajo (la lista se repite) y se mueve sola
// despacito hasta que la persona toca o desplaza. El botón de arriba regresa al
// menú principal.
const COLLAGE_COPIES = 4; // cuántas veces se repite el conjunto de fotos
const COLLAGE_AUTO_SPEED = 0.6; // píxeles por cuadro del desplazamiento automático
const COLLAGE_IDLE_MS = 2500; // tiempo sin tocar antes de que reanude el movimiento solo

let collageOpen = false;
let collageRaf = 0;
let collageUserT = 0;
let collageAcc = 0;

function collageSetH() {
  const sc = document.getElementById("collageScroll");
  const copies = sc.querySelectorAll(".collage-set");
  return copies.length > 1 ? copies[1].offsetTop - copies[0].offsetTop : 0;
}

// Mantiene el scroll siempre dentro de las copias del medio: al salirse, salta
// exactamente una repetición (se ve idéntico, por eso parece infinito)
function collageWrap() {
  const sc = document.getElementById("collageScroll");
  const h = collageSetH();
  if (h < 50) return;
  if (sc.scrollTop >= h * 2) sc.scrollTop -= h;
  else if (sc.scrollTop < h) sc.scrollTop += h;
}

function collageTick() {
  if (!collageOpen) return;
  const sc = document.getElementById("collageScroll");
  if (performance.now() - collageUserT > COLLAGE_IDLE_MS) {
    collageAcc += COLLAGE_AUTO_SPEED;
    const whole = Math.floor(collageAcc);
    if (whole > 0) {
      sc.scrollTop += whole;
      collageAcc -= whole;
    }
  }
  collageWrap();
  collageRaf = requestAnimationFrame(collageTick);
}

// Tamaños reales de las fotos (se llena en collagePreload). Con el tamaño conocido de
// antemano, cada foto reserva su espacio exacto y el collage no se reacomoda al cargar.
const collageSizes = {};
let collagePreloadP = null;

// Descarga y decodifica todas las fotos. Se llama desde que empieza la cinemática final
// para que, al terminar, ya estén listas. Nunca falla: una foto rota simplemente se omite.
function collagePreload() {
  if (collagePreloadP) return collagePreloadP;
  const tareas = MEMORIES.map((m) => m.image)
    .filter(Boolean)
    .map(
      (src) =>
        new Promise((resolve) => {
          const im = new Image();
          im.onload = () => {
            collageSizes[src] = { w: im.naturalWidth, h: im.naturalHeight };
            (im.decode ? im.decode() : Promise.resolve()).then(
              resolve,
              resolve,
            );
          };
          im.onerror = resolve;
          im.src = src;
        }),
    );
  collagePreloadP = Promise.all(tareas);
  return collagePreloadP;
}

function buildCollage() {
  const sc = document.getElementById("collageScroll");
  sc.innerHTML = "";
  // Solo las fotos que cargaron bien
  const fotos = MEMORIES.map((m) => m.image).filter(
    (src) => src && collageSizes[src],
  );
  for (let c = 0; c < COLLAGE_COPIES; c++) {
    const set = document.createElement("div");
    set.className = "collage-set";
    fotos.forEach((src, i) => {
      const fig = document.createElement("figure");
      fig.className = "collage-photo";
      // Inclinación pequeña y fija para cada foto (igual en todas las repeticiones)
      const tilt = ((i * 37) % 7) - 3; // -3 … +3 grados
      fig.style.setProperty("--tilt", tilt * 0.6 + "deg");
      const img = document.createElement("img");
      const sz = collageSizes[src];
      img.style.aspectRatio = sz.w + " / " + sz.h;
      img.src = src;
      img.alt = "Recuerdo " + (i + 1);
      img.decoding = "sync";
      img.draggable = false;
      fig.appendChild(img);
      set.appendChild(fig);
    });
    sc.appendChild(set);
  }
}

async function showCollage() {
  const el = document.getElementById("collage");
  if (!el || collageOpen) return;
  collageOpen = true;
  isPaused = true;
  keys = { up: false, down: false, left: false, right: false };

  // Espera a que las fotos estén listas (máx. 5 s); la cinemática sigue a la vista
  await Promise.race([
    collagePreload(),
    new Promise((r) => setTimeout(r, 5000)),
  ]);
  buildCollage();

  // La cinemática final sigue a la vista debajo: el collage aparece con fundido encima
  // de ella y solo entonces se oculta, así nunca se ve el juego. Si no hay cinemática
  // debajo (no tenía viñetas), el collage entra de golpe para no mostrar el juego.
  const cut = document.getElementById("cutscene");
  const cutVisible = cut && !cut.classList.contains("hidden");
  // Invisible pero ya con su tamaño: se calcula el diseño y se coloca el scroll ANTES
  // de que empiece el fundido
  el.style.transition = "none";
  el.style.opacity = "0";
  el.classList.remove("hidden");
  const sc = document.getElementById("collageScroll");
  void sc.offsetHeight; // fuerza el cálculo del diseño
  sc.scrollTop = collageSetH(); // empieza en la 2.ª copia: se puede subir y bajar sin fin
  collageUserT = 0;
  collageAcc = 0;
  sc.focus({ preventScroll: true });

  requestAnimationFrame(() => {
    el.style.transition = cutVisible ? "" : "none";
    el.style.opacity = "";
    el.classList.add("show");
    if (!cutVisible)
      requestAnimationFrame(() => {
        el.style.transition = "";
      });
  });
  if (cutVisible) setTimeout(() => cut.classList.add("hidden"), 1000);

  cancelAnimationFrame(collageRaf);
  collageRaf = requestAnimationFrame(collageTick);
}

// Regresa al menú principal (recarga la página, igual que antes al terminar el juego)
function exitCollage() {
  if (!collageOpen) return;
  collageOpen = false;
  cancelAnimationFrame(collageRaf);
  finDelJuego();
}

document.addEventListener("DOMContentLoaded", () => {
  const sc = document.getElementById("collageScroll");
  const btn = document.getElementById("collageExit");
  if (!sc || !btn) return;

  const touched = () => (collageUserT = performance.now());
  ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"].forEach((ev) =>
    sc.addEventListener(ev, touched, { passive: true }),
  );
  sc.addEventListener("scroll", collageWrap, { passive: true });
  window.addEventListener("resize", () => collageOpen && collageWrap());

  btn.addEventListener("click", exitCollage);

  // Con el collage abierto, el teclado no debe controlar el juego de abajo
  window.addEventListener(
    "keydown",
    (e) => {
      if (!collageOpen) return;
      e.stopPropagation();
      if (e.code === "Escape") exitCollage();
    },
    true,
  );
  window.addEventListener(
    "keyup",
    (e) => collageOpen && e.stopPropagation(),
    true,
  );
});
