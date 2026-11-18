"use strict";

/* ---------- Cinemáticas ---------- */
// Muestra las viñetas de CINEMATICAS[nombre] una por una (A, START o un toque
// avanzan; B salta todo). Después sale la pantalla de carga y se llama a onDone.
const CUT_LOCK_MS = 450; // evita saltarse una viñeta por un doble toque
const LOADING_MS = 3000; // duración de la pantalla de carga
let cutScenes = [];
let cutDone = null;
let cutActive = false;
let cutLoading = false; // mostrando la pantalla de carga
let cutIdx = 0;
let cutLockUntil = 0;
let cutSwapT = null;
let cutNoLoad = false; // true: al terminar no sale "CARGANDO" (cinemática dentro del nivel)

function cutShow(i) {
  const img = document.getElementById("cutImg");
  const count = document.getElementById("cutCount");
  img.classList.remove("show");
  clearTimeout(cutSwapT);
  cutSwapT = setTimeout(
    () => {
      // Si falta la imagen, avisa en la consola con la ruta que no encontró
      img.onerror = () => console.error("No se encontró la imagen:", img.src);
      img.onload = () => {
        img.style.setProperty("--ar", img.naturalWidth / img.naturalHeight);
        requestAnimationFrame(() => img.classList.add("show"));
      };
      img.src = cutScenes[i];
      count.textContent = i + 1 + "/" + cutScenes.length;
      document.getElementById("cutNext").textContent =
        i === cutScenes.length - 1 ? "A CONTINUAR" : "A SIGUIENTE";
    },
    i === 0 ? 0 : 220,
  );
}

// nombre: clave de CINEMATICAS. onDone(): se llama al terminar la pantalla de carga;
// si devuelve true, las pantallas se quedan puestas (porque la página se va a recargar).
// opts.sinCarga: true → sin pantalla de carga: la cinemática se desvanece y llama a
// onDone() (para cinemáticas dentro del nivel, como la de encontrar a Choco).
function startCutscene(nombre, onDone, opts) {
  if (cutActive) return;
  cutNoLoad = !!(opts && opts.sinCarga);
  cutScenes = (CINEMATICAS[nombre] || []).slice();
  cutDone = onDone || null;
  cutActive = true;
  cutLoading = false;
  cutIdx = 0;
  if (!cutScenes.length) return cutFinish(); // sin viñetas: solo "CARGANDO"
  cutLockUntil = performance.now() + CUT_LOCK_MS;
  cutScenes.forEach((src) => (new Image().src = src)); // precarga
  document.getElementById("cutscene").classList.remove("hidden", "fading");
  cutShow(0);
}

function cutNext() {
  if (!cutActive || cutLoading || performance.now() < cutLockUntil) return;
  cutLockUntil = performance.now() + CUT_LOCK_MS;
  if (cutIdx >= cutScenes.length - 1) return cutFinish();
  cutIdx++;
  cutShow(cutIdx);
}

function cutSkip() {
  if (cutActive && !cutLoading) cutFinish();
}

// Después de la última viñeta: pantalla de carga y luego onDone()
function cutFinish() {
  if (cutLoading) return;
  cutLoading = true;
  clearTimeout(cutSwapT);
  const cut = document.getElementById("cutscene");
  if (cutNoLoad) {
    // Sin pantalla de carga: fundido de salida y se continúa con onDone()
    cut.classList.add("fading");
    setTimeout(() => {
      cut.classList.add("hidden");
      const cb = cutDone;
      cutDone = null;
      cutActive = false;
      cutLoading = false;
      cutNoLoad = false;
      if (cb) cb();
    }, 500);
    return;
  }
  const load = document.getElementById("loadingScreen");
  load.classList.remove("hidden", "fading");
  setTimeout(() => {
    const keep = cutDone ? cutDone() === true : false;
    cutDone = null;
    if (keep) return; // se recarga la página: las pantallas se quedan
    cutActive = false;
    cutLoading = false;
    cut.classList.add("fading");
    load.classList.add("fading");
    setTimeout(() => {
      cut.classList.add("hidden");
      load.classList.add("hidden");
    }, 500);
  }, LOADING_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("cutscene");
  if (el) el.addEventListener("pointerdown", cutNext);
});
