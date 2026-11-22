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
    "assets/intro/escena1.png",
    "assets/intro/escena2.png",
    "assets/intro/escena3.png",
    "assets/intro/escena4.png",
    "assets/intro/escena5.png",
    "assets/intro/escena6.png",
  ],
  // Transiciones entre niveles: una sola escena cada una (se ve al salir del nivel,
  // antes de "CARGANDO"). Pon tus imágenes en estas rutas.
  fin1: ["assets/fin1/escena1.png"], // nivel 1 → nivel 2
  fin2: ["assets/fin2/escena1.png"], // nivel 2 → nivel 3
  fin3: ["assets/fin3/escena1.png"], // nivel 3 → nivel 4

  // "choco" → al encontrar a Choco por primera vez (dentro del nivel, sin pantalla
  // de carga; después sale el recuerdo del nuevo amigo)
  choco: [
    "assets/choco/escena1.png",
    "assets/choco/escena2.png",
    "assets/choco/escena3.png",
    "assets/choco/escena4.png",
    "assets/choco/escena5.png",
  ],

  // "cleo" → misma fórmula que "choco": al encontrar a Cleo por primera vez
  cleo: [
    "assets/cleo/escena1.png",
    "assets/cleo/escena2.png",
    "assets/cleo/escena3.png",
    "assets/cleo/escena4.png",
  ],

  // "chelita" → misma fórmula que "choco" y "cleo": al encontrar a Chelita por
  // primera vez (4 viñetas)
  chelita: [
    "assets/chelita/escena1.png",
    "assets/chelita/escena2.png",
    "assets/chelita/escena3.png",
    "assets/chelita/escena4.png",
  ],

  // fin4 = cinemática FINAL del juego: se dispara al rescatar al novio (que solo
  // debe colocarse en el nivel 4). Cuatro escenas; pon tus imágenes en estas rutas:
  fin4: [
    "assets/fin4/escena1.png",
    "assets/fin4/escena2.png",
    "assets/fin4/escena3.jpg",
    "assets/fin4/escena4.jpg",
  ],
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
