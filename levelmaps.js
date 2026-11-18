"use strict";

/* =====================================================================
   NIVELES — registro de niveles, cinemáticas y recuerdos
   Este archivo se carga PRIMERO: decide qué mapa (mapas/nivelN.js) se usa.
   ===================================================================== */

// Cuántos archivos mapas/nivelN.js existen. Sube este número al agregar un nivel.
const NIVELES_TOTAL = 4;

// Cinemáticas (lista de imágenes, una por viñeta):
//   "intro"  → al empezar una partida nueva
//   "finN"   → al salir del nivel N (N = 1, 2, 3…). Si está vacía, solo sale "CARGANDO".
// En el último nivel, "finN" es la cinemática final del juego.
const CINEMATICAS = {
  intro: [
    "assets/intro/escena1.jpg",
    "assets/intro/escena2.jpg",
    "assets/intro/escena3.jpg",
    "assets/intro/escena4.jpg",
    "assets/intro/escena5.jpg",
    "assets/intro/escena6.jpg",
  ],
  fin1: [],

  // "choco" → al encontrar a Choco por primera vez (dentro del nivel, sin pantalla
  // de carga; después sale el recuerdo del nuevo amigo)
  choco: [
    "assets/choco/escena1.jpg",
    "assets/choco/escena2.jpg",
    "assets/choco/escena3.jpg",
    "assets/choco/escena4.jpg",
    "assets/choco/escena5.jpg",
  ],
  // fin2: ["assets/nivel2/escena1.jpg", "assets/nivel2/escena2.jpg"],

  // fin4 = cinemática FINAL del juego: se dispara al rescatar al novio (que solo
  // debe colocarse en el nivel 4). Agrega aquí tus imágenes cuando las tengas:
  // fin4: ["assets/final/escena1.jpg", "assets/final/escena2.jpg", ...],
};

/* ---------- Qué nivel se carga ---------- */
const SAVE_KEY = "zelda-yucatan-save-v1";
const PENDING_KEY = "zelda-yucatan-pendiente";
let NIVEL = 1; // nivel que se está jugando
let CARRY = null; // lo que pasa de un nivel a otro: { sword, dogs: ["choco", …], mem }
let ARRANQUE = null; // "carry" (llega de otro nivel) | "nueva" (partida nueva desde otro nivel)

(function elegirNivel() {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY));
    if (p && p.nivel) {
      // Venimos de una salida de nivel (o de "partida nueva"): se usa una sola vez
      localStorage.removeItem(PENDING_KEY);
      NIVEL = p.nivel;
      CARRY = p.carry || null;
      ARRANQUE = p.modo || null;
    } else {
      // Pantalla de título: se muestra el nivel de la partida guardada (si hay)
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.nivel) {
        NIVEL = s.nivel;
        CARRY = s.carry || null;
      }
    }
  } catch (e) {}
  NIVEL = Math.max(1, Math.min(NIVELES_TOTAL, NIVEL | 0 || 1));
})();

// Carga el mapa del nivel justo antes de config.js
document.write('<script src="mapas/nivel' + NIVEL + '.js"><\/script>');
