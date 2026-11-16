"use strict";

/* =====================================================================
   AVENTURA ISOMÉTRICA EN LA PENÍNSULA DE YUCATÁN (10X ESCALA)
   - Mapa 64x64 (~10.2 veces más grande que el original 20x20)
   - Silueta fiel a la Península de Yucatán (Celestún, Progreso, Mérida,
     Río Lagartos rosa, Caribe, Bacalar y Cozumel)
   - Sin generación de árboles para máxima visibilidad
   ===================================================================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const healthDisplay = document.getElementById("healthDisplay");
const itemDisplay = document.getElementById("itemDisplay");
const memoryModal = document.getElementById("memoryModal");
const memoryImg = document.getElementById("memoryImg");
const memoryTitle = document.getElementById("memoryTitle");
const memoryBadge = document.getElementById("memoryBadge");
const memoryMessage = document.getElementById("memoryMessage");
const closeModalBtn = document.getElementById("closeModalBtn");

/* ---------- Constantes de Escala 10x ---------- */
const TILE_W = 32;
const TILE_H = 16;
const HW = TILE_W / 2; // 16
const HH = TILE_H / 2; // 8
const U = 6; // píxeles por nivel de altura

// 64 * 64 = 4,096 tiles (10.24 veces más área que 20 * 20 = 400)
const MAP_W = 128;
const MAP_H = 128;
const VIEW_W = canvas.width;
const VIEW_H = canvas.height;

// Origen y dimensiones del canvas offscreen para cubrir todo el rombo 64x64
const WX0 = 2150;
const WY0 = 120;
const CACHE_W = 4300;
const CACHE_H = 2300;

const MAX_HEALTH = 5;

// Escala de edificios grandes (pirámide, catedral, casas): 2 = el doble por lado
// (4 veces más área). Solo afecta colisiones; los sprites ya están dibujados al doble.
const BUILD_SCALE = 2;
// El faro también se dibuja al doble de resolución
const LIGHTHOUSE_SCALE = 2;
// Altura de los árboles (excepto la despeinada): 0.5 = la mitad
const TREE_H = 0.5;
// Variantes de casa disponibles en el editor
const HOUSE_VARIANTS = 5;

// Inicio justo a las afueras de la ciudad colonial (Mérida / Izamal)
// Si el mapa trae un objeto "inicio" se usa; si no, junto a la catedral grande
const _inicio = MAP_OBJECTS.find((o) => o[0] === "inicio");
const START_TILE = {
  gx: _inicio ? _inicio[1] : 50,
  gy: _inicio ? _inicio[2] : 83,
};

// Cenotes del mapa y decoración aleatoria (apagada: usa solo tus arbustos)
const CENOTES = MAP_OBJECTS.filter((o) => o[0] === "cenote").map((o) => [
  o[1],
  o[2],
]);
const RANDOM_DECOR = false;
// Tamaño de los cenotes (número entero): 2 = el doble de ancho, 4 veces más área
const CENOTE_SCALE = 2;

const T_WATER = 0;
const T_SAND = 1;
const T_GRASS = 2;
const T_LAGOON = 3;
const T_PATH = 4;
const T_PINK = 5; // Lagunas rosas (Río Lagartos / Las Coloradas)
const T_MONTE = 6; // Monte (selva baja)
const T_SHALLOW_SEA = 7; // Playa de mar (agua somera, se camina)
const T_SHALLOW_LAGOON = 8; // Playa de laguna / lago
const T_SHALLOW_PINK = 9; // Playa de laguna rosa
const T_PIER = 10; // Muelle de madera (se camina por encima del agua)
// La playa de mar (índice 7) está a nivel del mar: sin escalón ni borde
const HEIGHT = [0, 1, 2, 0.5, 2, 0.5, 2, 0, 0.3, 0.3, 0.8];

const isShallow = (t) =>
  t === T_SHALLOW_SEA || t === T_SHALLOW_LAGOON || t === T_SHALLOW_PINK;

/* ---------- Datos del juego ---------- */
// Recuerdos en orden: el 1.er cofre que el jugador abra (esté donde esté) da el
// recuerdo 1, el 2.º da el 2, y así sucesivamente.
const MEMORIES = [
  {
    image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500",
    title: "Marquesita en el Centro Histórico",
    message:
      "Bombón: eres más dulce que una marquesita de bola con mucho queso de vara frente a la catedral. ¡Aquí empezó nuestra bonita historia!",
  },
  {
    image: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=500",
    title: "Atardecer en Las Coloradas",
    message:
      "Entre flamencos y aguas rosas al norte de Yucatán, caminar contigo de la mano es lo más chulo de esta vida, mi amor.",
  },
  {
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500",
    title: "Laguna de los Siete Colores",
    message:
      "El tesoro más grande eres tú. Contigo quiero armar nuestra casa cerca de estas aguas cristalinas del sur.",
  },
  {
    image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=500",
    title: "Secretos de Chichén y el Cenote",
    message:
      "Un buen loch tuyo me cura de cualquier susto. Gracias por ser mi apapacho favorito en cada aventura.",
  },
  {
    image: "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?w=500",
    title: "Promesa en la Costa del Golfo",
    message:
      "Te amo con todo mi corazón, uay. Prometo cuidarte y alcahuetearte hoy, mañana y siempre en esta tierra hermosa.",
  },
];

// Los cofres se colocan en el editor de mapas (objetos "cofre" de MAP_OBJECTS).
// Máximo 5: si hay más, solo se usan los primeros 5.
const MAX_CHESTS = 5;
const treasures = MAP_OBJECTS.filter((o) => o[0] === "cofre")
  .slice(0, Math.min(MAX_CHESTS, MEMORIES.length))
  .map(([, gx, gy], i) => ({
    id: i + 1,
    gx,
    gy,
    opened: false,
    image: "",
    title: "",
    message: "",
  }));

/* ---------- Coleccionables: globito y bevi ---------- */
// Se colocan en el editor de mapas (objetos "globito" y "bevi"), máx. 10 de cada uno.
// Al recoger el 1.º aparece una leyenda, luego solo cambia el contador y al
// recoger el último aparece la leyenda final. Cada tipo usa su imagen de
// leyenda y su sprite en assets/ (textos predeterminados: cámbialos cuando quieras).
const MAX_COLLECT = 10;
const COLLECT_DEFS = [
  {
    type: "globito",
    emoji: "🎈",
    image: "assets/globitos.png",
    // por si la imagen tiene otro nombre
    alts: [
      "assets/globito.png",
      "assets/globitos.jpg",
      "assets/globito.jpg",
      "assets/globitos8bits.jpg",
    ],
    sprite: "assets/globito_sprite.png",
    sparks: ["#2f6fe0", "#ffd166", "#ffffff", "#f72585"],
    first: {
      badge: "* GLOBITO ENCONTRADO *",
      title: "¡Encontraste un globito!",
      message:
        "¡Qué rico! Hay más globitos escondidos por toda la península. ¡Encuéntralos todos, bombón!",
    },
    all: {
      badge: "* ¡MISIÓN CUMPLIDA! *",
      title: "¡Los encontraste todos!",
      message:
        "Juntaste todos los globitos del mapa. ¡Eres la mejor exploradora de Yucatán!",
    },
  },
  {
    type: "bevi",
    emoji: "🥤",
    image: "assets/bevi.png",
    alts: ["assets/bevi.jpg", "assets/bevi.jpeg"],
    sprite: "assets/bevi_sprite.png",
    sparks: ["#ffd166", "#52b788", "#ffffff", "#f72585"],
    first: {
      badge: "* BEVI ENCONTRADO *",
      title: "¡Encontraste un bevi!",
      message:
        "¡Qué chulo! Hay más bevis escondidos por toda la península. ¡Encuéntralos todos, bombón!",
    },
    all: {
      badge: "* ¡MISIÓN CUMPLIDA! *",
      title: "¡Encontraste todos los bevis!",
      message:
        "Juntaste todos los bevis del mapa. ¡Eres la mejor exploradora de Yucatán!",
    },
  },
  {
    type: "queso",
    emoji: "🧀",
    image: "assets/bolitasdequeso_sprite.jpg",
    alts: [
      "assets/bolitasdequeso_sprite.png",
      "assets/bolitasdequeso_sprite.jpeg",
    ],
    // El sprite es JPG (sin transparencia): se le quita el fondo blanco al cargarlo
    sprite: "assets/bolitasdequeso_sprite.jpg",
    keyWhite: true,
    sparks: ["#ffd166", "#ffe28a", "#ffffff", "#f4a261"],
    first: {
      badge: "* BOLITAS DE QUESO ENCONTRADAS *",
      title: "¡Encontraste unas bolitas de queso!",
      message:
        "¡Qué ricas! Hay más bolitas de queso escondidas por toda la península. ¡Encuéntralas todas, bombón!",
    },
    all: {
      badge: "* ¡MISIÓN CUMPLIDA! *",
      title: "¡Encontraste todas las bolitas de queso!",
      message:
        "Juntaste todas las bolitas de queso del mapa. ¡Eres la mejor exploradora de Yucatán!",
    },
  },
];
const collectibles = COLLECT_DEFS.map((def) => ({
  def,
  count: 0,
  items: MAP_OBJECTS.filter((o) => o[0] === def.type)
    .slice(0, MAX_COLLECT)
    .map(([, gx, gy], i) => ({
      kind: "collectible",
      type: def.type,
      id: i,
      gx,
      gy,
      h: 0,
      depth: gx + gy + 0.01,
      collected: false,
    })),
}));
const collectItems = collectibles.flatMap((g) => g.items);

const hammocks = MAP_OBJECTS.filter((o) => o[0] === "hamaca").map((o) => ({
  gx: o[1],
  gy: o[2],
}));

// Alux: espíritu hostil que vive dentro de una zona circular alrededor de su punto
// de origen. Ajusta estos valores para cambiar su comportamiento (en casillas):
const ALUX_VISION = 5; // radio de visión: a esta distancia ve al jugador y lo persigue
const ALUX_ZONE = 8; // radio de desplazamiento: nunca sale de esta zona
const ALUX_REACH = 1.0; // alcance de su golpe
const ALUX_SPEED = 0.062; // velocidad al perseguir (el jugador camina a 0.075)
const ALUX_WINDUP = 4; // frames que tarda en preparar el golpe (se esquiva saltando)
const ALUX_DAMAGE = 1; // corazones que quita cada golpe
const ALUX_SEP = 0.9; // distancia mínima entre aluxes (los perros usan 1.3)
const ALUX_SEP_PUSH = 0.2; // fuerza del empujón al estar muy juntos
// Huaychivo: hombre-bestia hechicero. Por ahora se comporta igual que el alux (vive en una
// zona circular alrededor de su punto, persigue y golpea). Estos valores son independientes
// de los del alux, así que puedes ajustarlos por separado (en casillas):
const HUAYCHIVO_VISION = 10; // radio de visión: a esta distancia ve al jugador y lo persigue
const HUAYCHIVO_ZONE = 20; // radio de desplazamiento: nunca sale de esta zona
const HUAYCHIVO_REACH = 1.0; // alcance de su golpe
const HUAYCHIVO_SPEED = 0.062; // velocidad al perseguir (el jugador camina a 0.075)
const HUAYCHIVO_WINDUP = 4; // frames que tarda en preparar el golpe (se esquiva saltando)
const HUAYCHIVO_DAMAGE = 2; // corazones que quita cada golpe
const HUAYCHIVO_SEP = 0.9; // distancia mínima entre huaychivos
const HUAYCHIVO_SCALE = 0.65; // tamaño respecto a su sprite original (55x51)
// Huaypek: su comportamiento es igual al del alux (vive en una zona circular
// alrededor de su punto, persigue y golpea), pero con apariencia propia: un perro
// fantasma negro de ojos rojos (ver makeHuaypek). Estos valores son independientes
// de los del alux, así que puedes ajustarlos por separado (en casillas):
const HUAYPEK_VISION = 5; // radio de visión: a esta distancia ve al jugador y lo persigue
const HUAYPEK_ZONE = 8; // radio de desplazamiento: nunca sale de esta zona
const HUAYPEK_REACH = 1.0; // alcance de su golpe
const HUAYPEK_SPEED = 0.062; // velocidad al perseguir (el jugador camina a 0.075)
const HUAYPEK_WINDUP = 4; // frames que tarda en preparar el golpe (se esquiva saltando)
const HUAYPEK_DAMAGE = 3; // corazones que quita cada golpe
const HUAYPEK_SEP = 0.9; // distancia mínima entre huaypeks
const HUAYPEK_SCALE = 0.5; // se dibuja a tamaño nativo (sprite 58x50) para conservar el detalle
// Kaskabal: espíritu del monte, casi del tamaño de un árbol. Solo camina sobre monte.
const KASKABAL_VISION = 21; // radio de visión (el triple que antes; solo te ve si estás en monte)
const KASKABAL_ZONE = 21; // ya no se usa: el kaskabal pasea libremente por el monte (su visión se mueve con él)
const KASKABAL_WANDER_SPEED = 0.03; // velocidad de su paseo tranquilo (cuando no ve al jugador)
const KASKABAL_REACH = 1.5; // alcance de su golpe
const KASKABAL_SPEED = 0.1495; // velocidad al perseguir (el jugador camina a 0.075)
const KASKABAL_WINDUP = 4; // frames que tarda en preparar el golpe
const KASKABAL_DAMAGE = 4; // corazones que quita cada golpe
const KASKABAL_SEP = 2.2; // distancia mínima entre kaskabales
const KASKABAL_SCALE = 1; // tamaño respecto a su sprite original (64x72)
// Xtabay: espíritu seductor del tamaño de la exploradora. Vive en una zona alrededor
// de su punto de origen (como el alux): si entras en su visión te persigue y te ataca,
// y nunca sale de su zona. Camina por cualquier terreno firme.
const XTABAY_VISION = 7; // radio de visión
const XTABAY_ZONE = 12; // radio de desplazamiento alrededor de su punto
const XTABAY_REACH = 1.1; // alcance de su golpe
const XTABAY_SPEED = 0.09; // velocidad al perseguir (el jugador camina a 0.075)
const XTABAY_WINDUP = 10; // frames que tarda en preparar el golpe (se esquiva saltando)
const XTABAY_DAMAGE = 3; // corazones que quita cada golpe
const XTABAY_SEP = 1.5; // distancia mínima entre xtabays

// Combate: con B la exploradora agita la espada y lastima a los enemigos de enfrente.
// Cada enemigo tiene una cantidad distinta de corazones (golpes que aguanta).
const ENEMY_HP = {
  alux: 2, // el más frágil
  huaypek: 3,
  huaychivo: 4,
  xtabay: 5,
  kaskabal: 8, // el más resistente
};
const SWORD_REACH = 1.8; // alcance de la espada, en casillas
const SWORD_DAMAGE = 1; // corazones que quita cada golpe
const SWORD_COOLDOWN = 14; // frames que dura el mandoble (no se puede repetir antes)
const ENEMY_STUN = 22; // frames que un enemigo queda aturdido al recibir un golpe
const ENEMY_KNOCKBACK = 0.07; // retroceso por frame durante el aturdimiento (casillas)
const ENEMY_DIE_FRAMES = 30; // duración de la animación de muerte

// Perros compañeros: Choco y Cleo. De cada uno solo puede haber uno en el mapa
const MAX_DOGS = 1; // por raza
const ALUX_SCALE = 0.3; // tamaño del alux respecto a su sprite original
const DOG_SCALE = 0.68; // tamaño de los perros respecto al sprite original (cada uno puede traer su "scale")
const DOG_FIND_R = 1.2; // distancia (en casillas) a la que lo encuentra
const DOG_KINDS = [
  {
    type: "perro", // tipo en MAP_OBJECTS
    key: "choco",
    name: "Choco",
    followR: 2.2, // distancia a la que se detiene si su puesto no está libre
    slotBack: 1.6, // puesto: casillas detrás de la exploradora
    slotSide: 1.3, // puesto: casillas a un lado (+ izquierda / − derecha)
    sparks: ["#e8dcb4", "#c08448", "#ffd166", "#f72585"],
    boatSparks: ["#e8dcb4", "#c08448", "#ffffff"],
    image: "assets/choco.jpg",
    message:
      "Choco estaba esperándote por la península. ¡Ahora será tu amigo y te seguirá en tu aventura, bombón!",
  },
  {
    type: "perrocleo",
    key: "cleo",
    name: "Cleo",
    followR: 3.0,
    slotBack: 2.4, // un poco más atrás y del lado contrario que Choco
    slotSide: -1.3,
    sparks: ["#e0e0e0", "#9a9a9a", "#ffd166", "#f72585"],
    boatSparks: ["#e0e0e0", "#9a9a9a", "#ffffff"],
    image: "assets/cleo.png", // sin foto: se usa el dibujo generado de Cleo
    message:
      "Cleo estaba esperándote por la península. ¡Ahora será tu amiga y te seguirá en tu aventura, bombón!",
  },
  {
    type: "perrochelita",
    key: "chelita",
    name: "Chelita",
    scale: 0.57, // ligeramente más pequeña que Choco y Cleo
    followR: 3.6,
    slotBack: 3.6, // justo detrás de la exploradora, entre los otros dos
    slotSide: 0,
    sparks: ["#f0e2cc", "#c8722e", "#ffd166", "#f72585"],
    boatSparks: ["#f0e2cc", "#c8722e", "#ffffff"],
    image: "assets/chelita.png",
    message:
      "Chelita estaba esperándote por la península. ¡Ahora será tu amiguita y te seguirá en tu aventura, bombón!",
  },
];
const dogSpots = DOG_KINDS.flatMap((k) =>
  MAP_OBJECTS.filter((o) => o[0] === k.type).slice(0, MAX_DOGS),
);
let dogs = [];

let foundCount = 0;
let xixCount = 0;
let health = MAX_HEALTH;
let isPaused = false;
// Oscuridad alrededor del jugador cuando un kaskabal lo detecta (0 = nada, 1 = máxima)
let fear = 0;
// Enrojecimiento de la pantalla cuando una xtabay lo persigue (0 = nada, 1 = máximo)
let bloodFear = 0;

const player = {
  gx: START_TILE.gx,
  gy: START_TILE.gy,
  z: 0,
  h: 2,
  jumpT: 0,
  attackT: 0,
  invuln: 0,
  face: 1,
  aimGx: Math.SQRT1_2, // hacia dónde apunta la espada (última dirección de marcha, sin suavizar)
  aimGy: Math.SQRT1_2,
  dirGx: Math.SQRT1_2, // dirección de marcha suavizada (para los puestos de los perros)
  dirGy: Math.SQRT1_2,
  moving: false,
  step: 0,
  boat: null, // bote en el que va navegando (null = a pie)
  msgT: 0, // frames que se muestra el aviso "solo desde un muelle"
  faintT: 0, // frames que se muestra el aviso "te desmayaste"
};

const camera = {
  x: 0,
  y: 0,
  rx: 0,
  ry: 0,
};

/* ---------- Utilidades ---------- */
function hash2(x, y, s) {
  x |= 0;
  y |= 0;
  s |= 0;
  let h =
    (Math.imul(x, 374761393) +
      Math.imul(y, 668265263) +
      Math.imul(s, 1442695041)) |
    0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return cv;
}

function sprite(w, h, ax, ay, fn) {
  const cv = makeCanvas(w, h);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  fn(c);
  return { cv, ax, ay };
}

// Reduce la altura de un sprite sin suavizado (conserva el ancho y el ancla al suelo)
function squashV(spr, k) {
  const sw = spr.cv.width;
  const sh = spr.cv.height;
  const nh = Math.max(1, Math.round(sh * k));
  const src = spr.cv.getContext("2d").getImageData(0, 0, sw, sh).data;
  const out = makeCanvas(sw, nh);
  const oc = out.getContext("2d");
  const img = oc.createImageData(sw, nh);
  for (let y = 0; y < nh; y++) {
    const y0 = Math.min(sh - 1, Math.floor(y / k));
    const y1 = Math.max(y0, Math.min(sh - 1, Math.ceil((y + 1) / k) - 1));
    for (let x = 0; x < sw; x++) {
      let pick = -1;
      let best = 0;
      for (let sy = y1; sy >= y0; sy--) {
        const a = src[(sy * sw + x) * 4 + 3];
        if (a > best) {
          best = a;
          pick = sy;
        }
      }
      if (pick < 0) continue;
      const si = (pick * sw + x) * 4;
      const di = (y * sw + x) * 4;
      img.data[di] = src[si];
      img.data[di + 1] = src[si + 1];
      img.data[di + 2] = src[si + 2];
      img.data[di + 3] = src[si + 3];
    }
  }
  oc.putImageData(img, 0, 0);
  return { cv: out, ax: spr.ax, ay: Math.round(spr.ay * k) };
}

// Reduce un sprite (ancho y alto) sin suavizado, conservando el ancla al suelo
function scaleSprite(spr, k) {
  const nw = Math.max(1, Math.round(spr.cv.width * k));
  const nh = Math.max(1, Math.round(spr.cv.height * k));
  const out = makeCanvas(nw, nh);
  const oc = out.getContext("2d");
  oc.imageSmoothingEnabled = false;
  oc.drawImage(spr.cv, 0, 0, spr.cv.width, spr.cv.height, 0, 0, nw, nh);
  return { cv: out, ax: Math.round(spr.ax * k), ay: Math.round(spr.ay * k) };
}

function px(c, x, y, color) {
  c.fillStyle = color;
  c.fillRect(x | 0, y | 0, 1, 1);
}

function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

function disc(c, cx, cy, r, color) {
  c.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    c.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

function ellipse(c, cx, cy, rx, ry, color) {
  c.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.0001)));
    c.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

function pline(c, x0, y0, x1, y1, color, t) {
  t = t || 1;
  c.fillStyle = color;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    c.fillRect(
      Math.round(x0 + ((x1 - x0) * i) / n),
      Math.round(y0 + ((y1 - y0) * i) / n),
      t,
      t,
    );
  }
}

function diamond(c, cx, cy, hw, color) {
  c.fillStyle = color;
  const top = cy - (hw >> 1);
  for (let r = 0; r < hw; r++) {
    const w = 4 * (Math.min(r, hw - 1 - r) + 1);
    c.fillRect(cx - (w >> 1), top + r, w, 1);
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1];
    const xj = poly[j][0],
      yj = poly[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* ---------- Mapa de Yucatán ---------- */
let mapGrid = [];

function tileAt(gx, gy) {
  // Los objetos colocados a ½ paso en el editor traen coordenadas como 75.5
  gx = Math.round(gx);
  gy = Math.round(gy);
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return T_WATER;
  return mapGrid[gy][gx];
}

function tileH(gx, gy) {
  return HEIGHT[tileAt(gx, gy)];
}

function wx(gx, gy) {
  return Math.round(WX0 + (gx - gy) * HW);
}

function wy(gx, gy) {
  return Math.round(WY0 + (gx + gy) * HH);
}

function buildMap() {
  const conv = {
    "~": T_WATER,
    ".": T_SAND,
    "#": T_GRASS,
    L: T_LAGOON,
    "=": T_PATH,
    P: T_PINK,
    M: T_MONTE,
    S: T_SHALLOW_SEA,
    G: T_SHALLOW_LAGOON,
    R: T_SHALLOW_PINK,
    W: T_PIER,
  };

  mapGrid = Array.from({ length: MAP_H }, (_, gy) =>
    Array.from({ length: MAP_W }, (_, gx) => {
      const t = conv[(MAP_ROWS[gy] || "")[gx]];
      return t === undefined ? T_WATER : t;
    }),
  );

  // Compatibilidad: los antiguos objetos "muelle" se convierten en un
  // muelle caminable de 3x3 sobre las casillas de agua que rodean el punto
  MAP_OBJECTS.filter((o) => o[0] === "muelle").forEach(([, ox, oy]) => {
    for (let y = Math.round(oy) - 1; y <= Math.round(oy) + 1; y++) {
      for (let x = Math.round(ox) - 1; x <= Math.round(ox) + 1; x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const t = mapGrid[y][x];
        if (t === T_WATER || t === T_LAGOON || t === T_PINK || isShallow(t)) {
          mapGrid[y][x] = T_PIER;
        }
      }
    }
  });

  // Asegurar terreno firme bajo el inicio, los tesoros y las hamacas
  const ensureLand = (gx, gy, rad) => {
    for (let y = Math.round(gy - rad); y <= Math.round(gy + rad); y++) {
      for (let x = Math.round(gx - rad); x <= Math.round(gx + rad); x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
        const t = mapGrid[y][x];
        if (t === T_WATER || t === T_LAGOON || t === T_PINK) {
          mapGrid[y][x] = T_SAND;
        }
      }
    }
  };

  ensureLand(START_TILE.gx, START_TILE.gy, 1);
  treasures.forEach((t) => ensureLand(t.gx, t.gy, 1));
  hammocks.forEach((h) => ensureLand(h.gx, h.gy, 0));
  dogSpots.forEach((d) => ensureLand(d[1], d[2], 0));
  collectItems.forEach((g) => ensureLand(g.gx, g.gy, 0));
  buildStream();
}

/* ---------- Paletas ---------- */
const PAL = {
  foam1: "#63c3f3",
  foam2: "#2f93e2",
  top: {
    [T_SAND]: ["#f0d48b", "#e0bd6c", "#f9e6ad"],
    [T_GRASS]: ["#57b13a", "#46992c", "#74c94c"],
    [T_LAGOON]: ["#2aa8e8", "#1f8fd2", "#86dcf6"],
    [T_PATH]: ["#e6c88a", "#d4b26e", "#f5deb0"],
    [T_PINK]: ["#ff9ebb", "#f47ca3", "#ffc8da"],
    [T_MONTE]: ["#1f6b4a", "#17553a", "#2f8a62"],
    // Casi plano, más claro que la espuma de la orilla (#63c3f3)
    [T_SHALLOW_SEA]: ["#8fdaf9", "#8fdaf9", "#8fdaf9"],
    [T_SHALLOW_LAGOON]: ["#74d8ee", "#58c8e8", "#c4f3fb"],
    [T_SHALLOW_PINK]: ["#ffc3d6", "#ffadc6", "#ffe5ee"],
    [T_PIER]: ["#b88246", "#9c6a34", "#d09a5a"],
  },
};

/* ---------- Terreno (cache) ---------- */
let terrain = null;
const terrainChunks = [];
const CHUNK = 1024;

function sliceTerrain(big) {
  terrainChunks.length = 0;
  for (let y = 0; y < big.height; y += CHUNK) {
    for (let x = 0; x < big.width; x += CHUNK) {
      const w = Math.min(CHUNK, big.width - x);
      const h = Math.min(CHUNK, big.height - y);
      const cv = makeCanvas(w, h);
      cv.getContext("2d").drawImage(big, x, y, w, h, 0, 0, w, h);
      terrainChunks.push({ x, y, cv });
    }
  }
}

let CEN = {
  x: 0,
  y: 0,
};

/* ---------- Arroyo que sale del cenote ---------- */
let STREAM = [];
let FALL = null;

function buildStream() {
  STREAM = [];
  FALL = null;
  // Este mapa no tiene arroyo: STREAM queda vacío.
}

function paintStream(c, cx, cy, last) {
  if (!last) diamond(c, cx, cy, 14, "#2f7d22");
  diamond(c, cx, cy, last ? 15 : 12, "#1f86d6");
  diamond(c, cx, cy, last ? 12 : 9, "#39aef0");

  for (let k = 0; k < 4; k++) {
    const ox = Math.round((hash2(cx, cy, k) - 0.5) * 12);
    const oy = Math.round((hash2(cy, cx, k + 9) - 0.5) * 4);
    px(c, cx + ox, cy + oy, "#bfeaff");
    px(c, cx + ox + 1, cy + oy, "#8fdcf8");
  }
}

function paintTop(c, cx, cy, pal) {
  for (let r = 0; r < 16; r++) {
    const w = 4 * (Math.min(r, 15 - r) + 1);
    const x0 = cx - (w >> 1);
    const y = cy - 8 + r;

    c.fillStyle = pal[0];
    c.fillRect(x0, y, w, 1);

    for (let i = 0; i < w; i++) {
      const n = hash2(x0 + i, y, 5);
      if (n < 0.1) {
        c.fillStyle = pal[1];
        c.fillRect(x0 + i, y, 1, 1);
      } else if (n > 0.92) {
        c.fillStyle = pal[2];
        c.fillRect(x0 + i, y, 1, 1);
      }
    }
  }
}

// Tablones de madera del muelle (vetas paralelas al eje gx)
function paintPierPlanks(c, cx, cy) {
  [-3, 0, 3].forEach((o) => {
    for (let s = -9; s <= 9; s++) {
      const x = cx + 2 * o + 2 * s;
      const y = cy - o + s;
      if (Math.abs(x - cx) / 16 + Math.abs(y - cy) / 8 > 0.92) continue;
      px(c, x, y, "#7a4f24");
      px(c, x + 1, y, "#7a4f24");
    }
  });
  for (let k = 0; k < 6; k++) {
    const ox = Math.round((hash2(cx, cy, k + 3) - 0.5) * 20);
    const oy = Math.round((hash2(cy, cx, k + 5) - 0.5) * 8);
    if (Math.abs(ox) / 16 + Math.abs(oy) / 8 > 0.8) continue;
    px(c, cx + ox, cy + oy, "#e0b070");
  }
  // clavitos en las esquinas del tablón
  px(c, cx - 8, cy, "#4a2e14");
  px(c, cx + 8, cy, "#4a2e14");
}

// Monte: vegetación densa y baja pintada sobre el terreno
function paintMonte(c, cx, cy, gx, gy) {
  const r = mulberry32(gx * 977 + gy * 131 + 6);
  const greens = [
    ["#0f4a31", "#1b6b47", "#35966a"],
    ["#13533a", "#237a52", "#4aa87a"],
    ["#195c3a", "#2b8558", "#63bd8a"],
  ];
  for (let k = 0; k < 11; k++) {
    const ox = Math.round((r() - 0.5) * 24);
    const oy = Math.round((r() - 0.5) * 11);
    if (Math.abs(ox) / 16 + Math.abs(oy) / 8 > 0.78) continue;
    const g = greens[(r() * 3) | 0];
    const x = cx + ox;
    const y = cy + oy;
    const q = r();
    if (q < 0.6) {
      // matorral: mata de hojas
      rect(c, x - 1, y, 4, 2, g[0]);
      rect(c, x, y - 1, 3, 2, g[1]);
      px(c, x + 1, y - 2, g[2]);
      px(c, x - 1, y - 1, g[1]);
    } else if (q < 0.85) {
      // helecho
      px(c, x, y, g[0]);
      px(c, x - 1, y - 1, g[1]);
      px(c, x + 1, y - 1, g[1]);
      px(c, x, y - 2, g[2]);
      px(c, x - 2, y, g[1]);
      px(c, x + 2, y, g[1]);
    } else {
      // florecilla del monte
      px(c, x, y, g[0]);
      px(c, x, y - 1, ["#ffd166", "#ffffff", "#ff7aa8"][(r() * 3) | 0]);
    }
  }
}

function decorateTop(c, cx, cy, type, gx, gy) {
  if (type === T_PIER) {
    paintPierPlanks(c, cx, cy);
    return;
  }
  if (type === T_MONTE) {
    paintMonte(c, cx, cy, gx, gy);
    return;
  }
  if (type === T_SHALLOW_SEA) {
    // Totalmente plana: sin marcas, sin brillos
    return;
  }
  if (isShallow(type)) {
    // Fondo arenoso que se ve a través del agua somera
    const r2 = mulberry32(gx * 313 + gy * 17 + type);
    for (let k = 0; k < 4; k++) {
      const ox = Math.round((r2() - 0.5) * 22);
      const oy = Math.round((r2() - 0.5) * 9);
      if (Math.abs(ox) / 16 + Math.abs(oy) / 8 > 0.75) continue;
      px(c, cx + ox, cy + oy, type === T_SHALLOW_PINK ? "#ffd9e4" : "#e9ddb0");
      px(
        c,
        cx + ox + 1,
        cy + oy,
        type === T_SHALLOW_PINK ? "#ffeef3" : "#f6efcf",
      );
    }
    return;
  }
  if (type === T_LAGOON || type === T_PINK || type === T_PATH) return;
  const r = mulberry32(gx * 1000 + gy * 7 + type);
  const n = type === T_GRASS ? 3 : 2;
  const flowers = ["#ff5fa2", "#ffffff", "#ffd166"];

  for (let k = 0; k < n; k++) {
    const ox = Math.round((r() - 0.5) * 18);
    const oy = Math.round((r() - 0.5) * 8);
    const q = r();
    if (Math.abs(ox) / 16 + Math.abs(oy) / 8 > 0.7) continue;
    const x = cx + ox;
    const y = cy + oy;

    if (type === T_GRASS) {
      if (q < 0.5) {
        px(c, x, y, "#2f7d22");
        px(c, x, y + 1, "#2f7d22");
        px(c, x - 1, y + 1, "#3a8a26");
        px(c, x + 1, y + 1, "#3a8a26");
      } else if (q < 0.72) {
        px(c, x, y, "#9be866");
        px(c, x, y + 1, "#8ee060");
        px(c, x + 1, y + 1, "#8ee060");
      } else if (q < 0.8) {
        const col = flowers[(r() * 3) | 0];
        px(c, x, y - 1, col);
        px(c, x - 1, y, col);
        px(c, x + 1, y, col);
        px(c, x, y + 1, col);
        px(c, x, y, "#fff2a8");
      }
    } else {
      if (q < 0.45) {
        px(c, x, y, "#c8a95f");
        px(c, x + 1, y, "#c8a95f");
      } else if (q < 0.6) {
        px(c, x, y, "#fff6d4");
        px(c, x + 1, y, "#ffe9a8");
      } else if (q < 0.68) {
        px(c, x, y, "#a8a8a0");
        px(c, x + 1, y, "#c8c8c0");
        px(c, x, y + 1, "#787870");
      }
    }
  }
}

function cliff(c, side, cx, cy, d, t, nt) {
  if (d <= 0) return;
  const grass = t === T_GRASS || t === T_PATH || t === T_MONTE;
  const L = side === "L";
  let base = grass ? (L ? "#8a5a2c" : "#6a4222") : L ? "#dbb86c" : "#bb964e";
  let dark = grass ? (L ? "#6e451f" : "#51321a") : L ? "#c09d55" : "#9c7a3a";
  let light = grass ? (L ? "#a56f38" : "#80522a") : L ? "#ebcd86" : "#d0ab62";
  if (t === T_PIER) {
    base = L ? "#8c5d2b" : "#6e4720";
    dark = L ? "#5c3c1b" : "#4a2e14";
    light = L ? "#a8743a" : "#865628";
  } else if (t === T_SHALLOW_SEA) {
    base = L ? "#2f86d4" : "#2873c0";
    dark = L ? "#2873c0" : "#2062a8";
    light = L ? "#3f96e2" : "#3484d0";
  } else if (isShallow(t)) {
    const pink = t === T_SHALLOW_PINK;
    base = pink ? (L ? "#f59ab8" : "#e0839f") : L ? "#4aaee0" : "#3a93c8";
    dark = pink ? (L ? "#e07a9c" : "#c9688a") : L ? "#3a93c8" : "#2c7aae";
    light = pink ? (L ? "#ffbfd3" : "#f5a3bc") : L ? "#7cc9f0" : "#5fb2e0";
  }

  for (let i = 0; i < 16; i++) {
    const xx = L ? cx - 16 + i : cx + i;
    const yt = L ? cy + (i >> 1) + 1 : cy + ((15 - i) >> 1) + 1;

    for (let k = 0; k < d; k++) {
      let col = base;
      if (grass && k === 0) col = L ? "#8fe05a" : "#5fb83a";
      else if (grass && k === 1) col = L ? "#3f9a2a" : "#2f7d22";
      else {
        const n = hash2(xx, yt + k, 9);
        if (k % 6 === 5) col = dark;
        else if (n < 0.1) col = dark;
        else if (n > 0.92) col = light;
        else if ((xx + ((k / 6) | 0) * 5) % 10 === 0) col = dark;
      }

      c.fillStyle = col;
      c.fillRect(xx, yt + k, 1, 1);
    }

    if (nt === T_WATER) {
      c.fillStyle = "#d6f3ff";
      c.fillRect(xx, yt + d, 1, 1);
    }
  }
}

// Cenote cueva: pozo de caliza visto desde arriba, con la pared del fondo
// tallada por una boca de cueva oscura (estalactitas), agua turquesa profunda
// muy por debajo del borde y un haz de luz que cae desde la abertura.
function paintCenote(c) {
  const cx = CEN.x;
  const cy = CEN.y;
  const sc = CENOTE_SCALE;
  const RX = 34 * sc;
  const RY = 17 * sc;
  const FH = 4 * sc; // grosor visible del brocal de roca

  const wob = (a, k) =>
    0.07 * Math.sin(3 * a + k) +
    0.05 * Math.sin(5 * a + k * 2.3) +
    0.035 * Math.sin(8 * a + k * 0.7);
  const rRim = (a) =>
    0.95 + wob(a, 4.1) * 1.2 + (hash2(Math.round(a * 7), 3, 41) - 0.5) * 0.08;
  const rIn = (a, dy) => rRim(a) - (dy < 0 ? 0.12 : 0.07);

  // 0 = fuera, 1 = brocal de roca, 2 = interior del pozo
  const kind = (x, y) => {
    const dx = (x - cx) / RX;
    const dy = (y - cy) / RY;
    const a = Math.atan2(dy, dx);
    const d = Math.hypot(dx, dy);
    if (d > rRim(a)) return 0;
    return d <= rIn(a, dy) ? 2 : 1;
  };

  // Geometría de la cueva (coordenadas normalizadas respecto al cenote)
  const ACX = -0.02; // centro del arco de la cueva
  const archTop = (dx) => -0.66 + 3.2 * (dx - ACX) * (dx - ACX);
  const inArch = (dx, dy) =>
    Math.abs(dx - ACX) < 0.34 && dy > archTop(dx) && dy < 0.02;
  // Distancia normalizada al centro del espejo de agua (1 = orilla)
  const waterN = (dx, dy) => {
    const u = dx / 0.66;
    const v = (dy - 0.22) / 0.5;
    const wa = Math.atan2(v, u);
    return (
      Math.hypot(u, v) /
      (1 + 0.06 * Math.sin(3 * wa + 1.3) + 0.04 * Math.sin(5 * wa + 2))
    );
  };

  const WALL = [
    "#b9b5a6",
    "#a8a496",
    "#8f8b7c",
    "#6f6c60",
    "#4d4b44",
    "#2e3330",
  ];
  const WATER = [
    "#04222a",
    "#0a4a58",
    "#0d6a7c",
    "#16939f",
    "#2cbcbb",
    "#86e0d0",
  ];

  for (let y = cy - RY - 6; y <= cy + RY + 6; y++) {
    for (let x = cx - RX - 4; x <= cx + RX + 4; x++) {
      const dx = (x - cx) / RX;
      const dy = (y - cy) / RY;
      const a = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy);
      if (d > rRim(a)) continue;

      const n = hash2(x, y, 77);
      const rI = rIn(a, dy);
      let col;

      if (d > rI) {
        // Brocal de caliza con grietas y algo de musgo
        col = dy < 0.1 ? "#dedbcd" : "#c4c0b0";
        if (n < 0.08) col = "#8f8b7c";
        else if (n > 0.86) col = "#f4f1e6";
        else if (n > 0.55 && n < 0.58) col = "#6a8f4a";
        if (hash2(x >> 1, y, 13) > 0.94) col = "#6f6c60";
        // sombra del labio interior (atrás) / canto iluminado (adelante)
        if (d - rI < 0.035) col = dy < 0 ? "#9a968a" : "#efece0";
      } else {
        const wn = waterN(dx, dy);
        const arch = inArch(dx, dy);
        const isWater = wn < 1 || (arch && dy > -0.4);

        if (isWater) {
          // Oscuro hacia el fondo de la cueva, claro hacia el frente
          const u = Math.max(0, Math.min(1, (dy + 0.4) / 1.1));
          let lvl =
            u < 0.12
              ? 0
              : u < 0.3
                ? 1
                : u < 0.5
                  ? 2
                  : u < 0.72
                    ? 3
                    : u < 0.9
                      ? 4
                      : 5;
          if (arch) lvl = Math.min(lvl, 1);
          else if (wn > 0.9) lvl = Math.min(5, lvl + 1);
          col = WATER[lvl];
          if (n < 0.06) col = WATER[Math.max(0, lvl - 1)];
          else if (n > 0.97 && lvl >= 2) col = "#e3fff7";
        } else if (arch) {
          // Boca de la cueva: casi negra
          col = dy < archTop(dx) + 0.1 ? "#16292d" : "#07171b";
          if (n < 0.08) col = "#0d2227";
        } else {
          // Pared vertical de roca: clara arriba, oscura al acercarse al agua
          const hh = 1 - Math.max(0, Math.min(1, (wn - 1) / 1.1));
          let lvl =
            hh < 0.15
              ? 0
              : hh < 0.35
                ? 1
                : hh < 0.55
                  ? 2
                  : hh < 0.72
                    ? 3
                    : hh < 0.88
                      ? 4
                      : 5;
          if (n < 0.14) lvl = Math.min(5, lvl + 1);
          else if (n > 0.9) lvl = Math.max(0, lvl - 1);
          if ((x * 5 + (y >> 3) * 3) % 9 === 0) lvl = Math.min(5, lvl + 1);
          col = WALL[lvl];
          if (hh < 0.5 && n > 0.55 && n < 0.6) col = "#4f7f3a"; // musgo
          if (hh > 0.93 && n > 0.5) col = "#1f4a4a"; // roca mojada
        }
      }

      px(c, x, y, col);
    }
  }

  // Estalactitas colgando del techo de la cueva
  for (let i = 0; i < 9; i++) {
    const ax = ACX - 0.3 + i * 0.075;
    const x0 = Math.round(cx + ax * RX);
    const y0 = Math.round(cy + archTop(ax) * RY) - 1;
    const L = Math.round((3 + hash2(i, 7, 5) * 6) * sc * 0.9);
    for (let k = 0; k <= L; k++) {
      const w = Math.max(0, Math.round((1 - k / L) * 1.5 * sc));
      rect(
        c,
        x0 - w,
        y0 + k,
        w * 2 + 1,
        1,
        k > L * 0.6 ? "#8f8b7c" : "#6f6c60",
      );
      px(c, x0 - w, y0 + k, "#cfcbbd");
    }
    if (hash2(i, 3, 9) > 0.5) px(c, x0, y0 + L + 3 * sc, "#bff5ea"); // gota
  }

  // Dientes de roca bajo el labio del pozo (fuera del arco)
  for (let j = 0; j < 11; j++) {
    const ddx = -0.75 + j * 0.15;
    if (Math.abs(ddx - ACX) < 0.42) continue;
    const t = 0.83 * 0.83 - ddx * ddx;
    if (t <= 0) continue;
    const x0 = Math.round(cx + ddx * RX);
    const y0 = Math.round(cy - Math.sqrt(t) * RY) + 1;
    const L = Math.round((2 + hash2(j, 5, 6) * 3) * sc * 0.8);
    for (let k = 0; k <= L; k++) {
      const w = Math.max(0, Math.round((1 - k / L) * sc));
      rect(
        c,
        x0 - w,
        y0 + k,
        w * 2 + 1,
        1,
        k > L * 0.5 ? "#a8a496" : "#8f8b7c",
      );
    }
  }

  // Raíces que cuelgan del borde hacia el pozo
  [-2.25, -1.75, -1.2, -0.7].forEach((a, i) => {
    const rx0 = Math.round(cx + Math.cos(a) * RX * 0.84);
    const ry0 = Math.round(cy + Math.sin(a) * RY * 0.84);
    const len = Math.round((8 + hash2(i, 2, 8) * 8) * sc * 0.6);
    let xx = rx0;
    for (let k = 0; k < len; k++) {
      xx = rx0 + Math.round(Math.sin(k / 3 + i) * 1.5);
      px(c, xx, ry0 + k, k % 5 === 4 ? "#7a4a28" : "#4a2a16");
      px(c, xx + 1, ry0 + k, "#3a2210");
    }
    px(c, xx, ry0 + len, "#4ea832");
    px(c, xx + 1, ry0 + len - 1, "#6fcf55");
  });

  // Haz de luz que cae desde la abertura hasta el agua
  const bx0 = cx + 0.46 * RX;
  const by0 = cy - 0.84 * RY;
  const bx1 = cx - 0.06 * RX;
  const by1 = cy + 0.3 * RY;
  for (let y = Math.round(by0); y <= by1; y++) {
    const t = (y - by0) / (by1 - by0);
    const xc = bx0 + (bx1 - bx0) * t;
    const hw = (3 + 5 * t) * sc;
    for (let x = Math.round(xc - hw); x <= xc + hw; x++) {
      if (kind(x, y) !== 2) continue;
      const e = 1 - Math.abs(x - xc) / hw;
      c.fillStyle = `rgba(255,255,225,${(0.05 + 0.12 * e * (0.5 + t * 0.5)).toFixed(3)})`;
      c.fillRect(x, y, 1, 1);
    }
  }
  // Charco de luz sobre el agua
  ellipse(
    c,
    Math.round(bx1),
    Math.round(by1),
    9 * sc,
    3 * sc,
    "rgba(210,255,240,0.28)",
  );
  ellipse(
    c,
    Math.round(bx1),
    Math.round(by1),
    5 * sc,
    2 * sc,
    "rgba(255,255,255,0.30)",
  );

  // Cara frontal del brocal: da volumen a la roca
  for (let y = cy - RY; y <= cy + RY + FH + 4; y++) {
    for (let x = cx - RX - 4; x <= cx + RX + 4; x++) {
      if (kind(x, y) !== 0) continue;
      for (let k = 1; k <= FH + 1; k++) {
        if (kind(x, y - k) === 1) {
          const f = k / FH;
          px(
            c,
            x,
            y,
            f <= 0.34
              ? "#b9b5a6"
              : f <= 0.67
                ? "#8f8b7c"
                : f <= 1
                  ? "#5d5a50"
                  : "rgba(0,0,0,0.25)",
          );
          break;
        }
      }
    }
  }

  // Helechos y hojas alrededor
  const fern = (x, y, s) => {
    [-1.2, -0.6, 0, 0.6, 1.2].forEach((ang, i) => {
      const L = (5 + s - Math.abs(i - 2)) * sc;
      const x1 = Math.round(x + Math.sin(ang) * L);
      const y1 = Math.round(y - Math.cos(ang) * L);
      pline(c, x, y, x1, y1, "#2f8a43", sc);
      rect(c, x1, y1, sc, sc, "#6fcf55");
    });
    rect(c, x, y, sc, sc * 2, "#1d5d3a");
  };

  const leaf = (x, y, w) => {
    ellipse(c, x, y + sc, w, 3 * sc, "#1d5d3a");
    ellipse(c, x, y, w, 3 * sc, "#2f8a43");
    ellipse(c, x - sc, y - sc, w - 2 * sc, sc, "#6fcf55");
  };

  [
    [-2.7, 1.03],
    [-2.0, 1.0],
    [-0.45, 1.03],
    [0.5, 1.06],
    [2.0, 1.05],
    [2.85, 1.03],
  ].forEach(([a, f], i) => {
    fern(
      Math.round(cx + Math.cos(a) * RX * f),
      Math.round(cy + Math.sin(a) * RY * f),
      2 + (i % 3),
    );
  });

  leaf(cx - 24 * sc, cy + 15 * sc, 6 * sc);
  leaf(cx + 27 * sc, cy + 13 * sc, 5 * sc);

  // Piedras sueltas de caliza
  [
    [cx - 37 * sc, cy + 8 * sc],
    [cx + 36 * sc, cy + 4 * sc],
    [cx + 8 * sc, cy + 21 * sc],
  ].forEach(([x, y]) => {
    ellipse(c, x, y + sc, 4 * sc, 2 * sc, "#8f8b7c");
    ellipse(c, x, y, 4 * sc, 2 * sc, "#cfcbbd");
    rect(c, x - sc, y - sc, sc, sc, "#f4f1e6");
  });
}

function buildTerrain() {
  terrain = makeCanvas(CACHE_W, CACHE_H);
  const c = terrain.getContext("2d");
  c.imageSmoothingEnabled = false;

  // Aguas someras alrededor de toda la península
  for (let gy = -3; gy < MAP_H + 3; gy++) {
    for (let gx = -3; gx < MAP_W + 3; gx++) {
      if (tileAt(gx, gy) !== T_WATER) continue;
      let ring = 0;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (tileAt(gx + dx, gy + dy) !== T_WATER) {
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            if (ring === 0 || d < ring) ring = d;
          }
        }
      }

      if (ring === 0) continue;
      diamond(
        c,
        wx(gx, gy),
        wy(gx, gy),
        16,
        ring === 1 ? PAL.foam1 : PAL.foam2,
      );
    }
  }

  // Tierra firme de atrás hacia adelante
  for (let gy = -1; gy <= MAP_H; gy++) {
    for (let gx = -1; gx <= MAP_W; gx++) {
      const t = tileAt(gx, gy);
      if (t === T_WATER) continue;
      const h = HEIGHT[t];
      const cx = wx(gx, gy);
      const cy = wy(gx, gy) - Math.round(h * U);
      const hl = tileH(gx, gy + 1);
      const hr = tileH(gx + 1, gy);
      if (hl < h)
        cliff(c, "L", cx, cy, Math.round((h - hl) * U), t, tileAt(gx, gy + 1));
      if (hr < h)
        cliff(c, "R", cx, cy, Math.round((h - hr) * U), t, tileAt(gx + 1, gy));
      paintTop(c, cx, cy, PAL.top[t]);
      const sIdx = STREAM.findIndex((s) => s.gx === gx && s.gy === gy);
      if (sIdx >= 0) paintStream(c, cx, cy, false);
      else decorateTop(c, cx, cy, t, gx, gy);
    }
  }

  CENOTES.forEach(([gx, gy]) => {
    CEN = { x: wx(gx, gy), y: wy(gx, gy) - Math.round(tileH(gx, gy) * U) };
    paintCenote(c);
  });

  sliceTerrain(terrain);
  terrain = null;
}

/* ---------- Sprites (Sin árboles, con arquitectura de Yucatán) ---------- */
function isoBox(c, cx, cyb, hw, h, topC, edgeC, leftC, rightC, seam) {
  const cy = cyb - h;
  const face = (base, x, k) =>
    k % 4 === 3 || (x + (k >> 2) * 3) % 7 === 0 ? seam : base;

  for (let i = 0; i < hw; i++) {
    const xl = cx - hw + i;
    const ytl = cy + (i >> 1) + 1;
    const xr = cx + i;
    const ytr = cy + ((hw - 1 - i) >> 1) + 1;

    for (let k = 0; k < h; k++) {
      c.fillStyle = face(leftC, xl, k);
      c.fillRect(xl, ytl + k, 1, 1);
      c.fillStyle = face(rightC, xr, k);
      c.fillRect(xr, ytr + k, 1, 1);
    }
  }

  diamond(c, cx, cy, hw, edgeC);
  diamond(c, cx, cy, hw - 2, topC);
}

// Caja escalonada de piedra: bloques con juntas, cornisa clara, sombra inferior,
// greca (relieve de espiral cuadrada) y musgo. Cara izquierda = escalinata.
function stoneTier(c, cx, cyb, hw, h, i, opt) {
  const cy = cyb - h;
  const GRECA = ["1111111.", "1.....1.", "1.111.1.", "1.1...1.", "1.11111."];
  const faceCol = (side, u, v) => {
    const L = side === 0;
    const n = hash2(u, v, side * 13 + i * 7);
    let col = L ? "#c9bb9a" : "#ab9d7e";
    if (v === 0) col = L ? "#e2d6b4" : "#c9bc9a";
    else if (v === h - 1) col = L ? "#7d7159" : "#6c614b";
    else if (v % 4 === 3 || (u + (v >> 2) * 3) % 7 === 0)
      col = L ? "#a39679" : "#8a7e64";
    else if (n < 0.12) col = L ? "#b8aa89" : "#9b8e70";
    else if (n > 0.92) col = L ? "#d6c9a8" : "#baad8d";
    if (opt.greca && v >= 3 && v <= 7 && u >= 3 && u <= hw - 4) {
      const gu = (u - 3) % 10;
      if (gu < 8 && GRECA[v - 3][gu] === "1") col = L ? "#6f634b" : "#5d523e";
    }
    if (hash2(u, v, i + 50) < (v < 2 ? 0.1 : 0.03))
      col = hash2(u, v, 9) > 0.5 ? "#5f8f3a" : "#7fb04a";
    return col;
  };
  for (let u = 0; u < hw; u++) {
    const xl = cx - hw + u;
    const ytl = cy + (u >> 1) + 1;
    const xr = cx + u;
    const ytr = cy + ((hw - 1 - u) >> 1) + 1;
    for (let v = 0; v < h; v++) {
      c.fillStyle = faceCol(0, u, v);
      c.fillRect(xl, ytl + v, 1, 1);
      c.fillStyle = faceCol(1, u, v);
      c.fillRect(xr, ytr + v, 1, 1);
    }
  }
  diamond(c, cx, cy, hw, "#8a7e64");
  diamond(c, cx, cy, hw - 2, "#d6c9a7");
  // musgo y desgaste sobre la cara superior
  for (let k = 0; k < hw * 2; k++) {
    const x = cx - hw + 3 + ((hash2(k, i, 21) * (hw * 2 - 6)) | 0);
    const y = cy - (hw >> 2) + ((hash2(k, i, 22) * (hw >> 1)) | 0);
    if (Math.abs(x - cx) / hw + Math.abs(y - cy) / (hw / 2) < 0.85)
      px(c, x, y, hash2(k, i, 23) < 0.5 ? "#6fa040" : "#4f8f3a");
  }
}

// Cabeza de serpiente emplumada (de frente-izquierda) en la base de la alfarda
function serpentHead(c, x, y) {
  const K = "#3d3526";
  const S = "#c4b697";
  const Ls = "#e2d6b4";
  const D = "#8a7e64";
  // plumas de la cresta
  [
    [11, 1, 20, -6],
    [12, 3, 22, -2],
    [12, 5, 22, 2],
    [11, 7, 19, 6],
  ].forEach(([a, b, e, f], k) => {
    pline(c, x + a, y + b, x + e, y + f, K, 2);
    pline(c, x + a, y + b, x + e, y + f, k % 2 ? D : Ls, 1);
  });
  // cráneo y hocico con contorno
  rect(c, x + 4, y - 1, 12, 13, K);
  rect(c, x - 1, y + 4, 9, 9, K);
  rect(c, x + 5, y, 10, 11, S);
  rect(c, x, y + 5, 8, 7, S);
  rect(c, x + 5, y, 10, 2, Ls);
  rect(c, x, y + 5, 8, 2, Ls);
  rect(c, x + 12, y + 1, 3, 10, D);
  // ojo
  rect(c, x + 6, y + 3, 3, 3, K);
  px(c, x + 6, y + 3, Ls);
  // fosa nasal y dientes
  rect(c, x + 1, y + 7, 2, 2, K);
  for (let t = 0; t < 4; t++) px(c, x + 1 + t * 2, y + 10, "#f4ecd4");
  rect(c, x, y + 11, 8, 1, D);
}

// Pirámide de Chichén Itzá (El Castillo): escalinata con alfardas y cabezas
// de serpiente, terrazas con grecas, templo con vanos y musgo
function makePyramid() {
  return sprite(170, 196, 85, 150, (c) => {
    const CX = 85;
    const GYC = 150;

    // base de pasto y tierra, con borde irregular
    for (let y = GYC - 42; y <= GYC + 42; y++) {
      for (let x = CX - 84; x <= CX + 84; x++) {
        const d = Math.abs(x - CX) / 82 + Math.abs(y - GYC) / 41;
        const e = d + (hash2(x, y, 3) - 0.5) * 0.08;
        if (e > 1) continue;
        let col = "#6a8f3a";
        const n = hash2(x >> 1, y >> 1, 4);
        if (n < 0.18) col = "#587d2e";
        else if (n > 0.88) col = "#86ad48";
        else if (hash2(x, y, 5) < 0.05) col = "#a5905f";
        if (e > 0.94) col = "#476a26";
        px(c, x, y, col);
      }
    }
    ellipse(c, CX, GYC + 6, 74, 24, "rgba(0,0,0,0.18)");
    // sendero de tierra al pie de la escalinata
    for (let t = 0; t < 14; t++)
      rect(
        c,
        26 - t * 2,
        168 + t,
        8,
        1,
        hash2(t, 1, 6) < 0.3 ? "#b39e6c" : "#9b8758",
      );

    const TIERS = 7;
    const H = 11;
    for (let i = 0; i < TIERS; i++) {
      const hw = 70 - i * 8;
      const cyb = GYC - i * H;
      const cy = cyb - H;
      stoneTier(c, CX, cyb, hw, H, i, { greca: i < 6 });

      // escalinata en la cara izquierda con alfardas
      const lo = (hw >> 1) - 8;
      const hi = (hw >> 1) + 8;
      for (let k = lo; k <= hi; k++) {
        const edge = k <= lo + 2 || k >= hi - 2;
        const xl = CX - hw + k;
        const ytl = cy + (k >> 1) + 1;
        const top = edge ? -2 : 0;
        for (let r = top; r < H; r++) {
          let col;
          if (edge) {
            col =
              k === lo || k === hi ? "#5a4f3b" : r < 0 ? "#e2d6b4" : "#c4b697";
            if (k === lo + 2 || k === hi - 2) col = "#8a7e64";
          } else {
            col = r % 2 ? "#e6dcc0" : "#8c7f66";
          }
          px(c, xl, ytl + r, col);
        }
      }
    }

    // cabezas de serpiente en la base de las alfardas
    serpentHead(c, 27, 154);
    serpentHead(c, 52, 163);

    // templo superior
    const tcy = GYC - TIERS * H;
    const TH = 18;
    const THW = 16;
    const tcT = tcy - TH;
    stoneTier(c, CX, tcy, THW, TH, 9, { greca: true });
    // vanos oscuros con dintel (izquierda: ventana, puerta, ventana)
    const opening = (side, u0, u1, v0, v1) => {
      for (let u = u0; u <= u1; u++) {
        const x = side === 0 ? CX - THW + u : CX + u;
        const yt =
          side === 0 ? tcT + (u >> 1) + 1 : tcT + ((THW - 1 - u) >> 1) + 1;
        for (let v = v0; v <= v1; v++)
          px(c, x, yt + v, v === v0 ? "#6f634b" : "#1f1b14");
      }
    };
    opening(0, 2, 4, 8, 16);
    opening(0, 6, 9, 7, 17);
    opening(0, 11, 13, 8, 16);
    opening(1, 6, 9, 8, 16);
    // cornisa / techo con musgo
    stoneTier(c, CX, tcT, THW + 2, 4, 10, { greca: false });

    // árboles pequeños a los lados
    const g = ["#1c4a16", "#2f7324", "#4f9f30", "#80c548", "#aadd62"];
    [
      [19, 140, 71],
      [152, 137, 72],
    ].forEach(([tx, ty, sd]) => {
      rect(c, tx - 1, ty - 8, 3, 10, "#3d2a18");
      rect(c, tx - 1, ty - 8, 1, 10, "#6b4a2e");
      leafMass(c, tx, ty - 14, 11, 7, sd, g, 9, 3, 5);
    });
    // matas y rocas en la base
    [
      [64, 184],
      [112, 182],
      [150, 160],
      [20, 160],
    ].forEach(([bx, by], k) => {
      for (let a = 0; a < 6; a++) {
        const ang = -Math.PI + (a / 5) * Math.PI;
        pline(
          c,
          bx,
          by,
          Math.round(bx + Math.cos(ang) * 5),
          Math.round(by + Math.sin(ang) * 5),
          g[1 + (a % 3)],
          1,
        );
      }
    });
    rect(c, 90, 188, 4, 3, "#8a7e64");
    rect(c, 90, 188, 4, 1, "#c4b697");
    rect(c, 126, 186, 3, 2, "#8a7e64");
  });
}

// Medio disco (solo la mitad superior): para cúpulas
function halfDisc(c, cx, cy, rad, color) {
  c.fillStyle = color;
  for (let dy = -rad; dy <= 0; dy++) {
    const w = Math.floor(Math.sqrt(rad * rad - dy * dy) + 0.5);
    c.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

// Catedral de San Ildefonso (Mérida): 4 veces más grande y con más detalle:
// dos torres campanario con arcos y remate, portada central con escudo,
// cimborrio con cúpula y linterna, contrafuertes y portal lateral.
function makeCathedral() {
  return sprite(160, 160, 80, 126, (c) => {
    const CX = 80;
    const HW = 52; // semiancho de la nave
    const NH = 34; // alto de los muros
    const NB = 124; // base de la nave
    const cy = NB - NH; // centro de la cara superior
    const STONE_L = "#dcc29c";
    const STONE_R = "#c4a67a";
    const SEAM = "#b49568";
    const EDGE = "#8a6f4c";
    const DARK = "#3a2616";
    const GOLD = "#c9a227";

    // Alturas de la base de cada cara en una columna x (para pegar detalles)
    const fbL = (x) => cy + ((x - (CX - HW)) >> 1) + NH;
    const fbR = (x) => cy + ((HW - 1 - (x - CX)) >> 1) + NH;
    const L = (x0, w, h, yo, col) => {
      c.fillStyle = col;
      for (let u = 0; u < w; u++)
        c.fillRect(x0 + u, fbL(x0 + u) - yo - h, 1, h);
    };
    const R = (x0, w, h, yo, col) => {
      c.fillStyle = col;
      for (let u = 0; u < w; u++)
        c.fillRect(x0 + u, fbR(x0 + u) - yo - h, 1, h);
    };

    ellipse(c, CX, 128, 68, 24, "rgba(0,0,0,0.28)");

    // ---- Nave principal ----
    isoBox(c, CX, NB, HW, NH, "#cdb48a", EDGE, STONE_L, STONE_R, SEAM);
    diamond(c, CX, cy, HW - 8, "#d8c39b"); // azotea
    diamond(c, CX, cy, HW - 14, "#cdb48a");

    // Contrafuertes y ventanas arqueadas en la cara derecha
    [88, 102, 116].forEach((x) => {
      R(x, 2, NH - 2, 0, "#efe0bf");
      R(x + 2, 1, NH - 2, 0, "#a98d62");
    });
    [93, 107].forEach((x) => {
      R(x - 1, 6, 15, 9, "#efe0bf");
      R(x, 4, 13, 9, DARK);
      R(x + 1, 2, 2, 22, DARK); // remate del arco
    });
    // Portal lateral con arco (esquina derecha)
    R(120, 11, 24, 0, "#efe0bf");
    R(121, 9, 21, 0, "#b79c70");
    R(122, 7, 19, 0, DARK);
    R(123, 5, 2, 19, DARK);
    R(124, 3, 1, 21, DARK);

    // ---- Cimborrio (cúpula) detrás de las torres ----
    const DX = CX + 10;
    const DY = cy - 4;
    rect(c, DX - 14, DY - 16, 28, 16, "#e3d0aa");
    rect(c, DX - 14, DY - 16, 8, 16, "#f0e2c3");
    rect(c, DX + 7, DY - 16, 7, 16, "#bfa57b");
    [-9, -2, 5].forEach((dx) => {
      rect(c, DX + dx, DY - 13, 3, 8, DARK);
      rect(c, DX + dx + 1, DY - 14, 1, 1, DARK);
    });
    rect(c, DX - 15, DY - 18, 30, 2, "#f5e8cb");
    halfDisc(c, DX, DY - 18, 14, "#ecdcbc");
    halfDisc(c, DX - 3, DY - 19, 8, "#f8eed6");
    [-9, -4, 4, 9].forEach((dx) =>
      pline(c, DX + (dx >> 1), DY - 31, DX + dx, DY - 19, "#cdb68c", 1),
    );
    rect(c, DX - 3, DY - 39, 6, 8, "#f5e8cb");
    rect(c, DX - 1, DY - 37, 2, 4, DARK);
    halfDisc(c, DX, DY - 39, 3, "#ecdcbc");
    rect(c, DX, DY - 49, 1, 9, GOLD);
    rect(c, DX - 2, DY - 46, 5, 1, GOLD);

    // ---- Torre campanario ----
    const tower = (tx, tb) => {
      const TH = 42;
      isoBox(c, tx, tb, 10, TH, "#d9c39e", EDGE, "#e8d5b0", "#c7aa7e", SEAM);
      // pilastras de esquina
      rect(c, tx - 10, tb - TH + 4, 1, TH - 2, "#f3e6c8");
      rect(c, tx + 9, tb - TH + 6, 1, TH - 2, "#a98d62");
      // ventanita del cuerpo medio
      const wy = tb - TH + 8;
      c.fillStyle = DARK;
      for (let u = 0; u < 3; u++) {
        c.fillRect(tx - 6 + u, wy + (u >> 1) + 3, 1, 6);
        c.fillRect(tx + 4 + u, wy + ((2 - u) >> 1) + 3, 1, 6);
      }
      // cornisa
      isoBox(
        c,
        tx,
        tb - TH,
        11,
        3,
        "#efe0bf",
        EDGE,
        "#f3e6c8",
        "#d6bf94",
        "#c5ad82",
      );
      // campanario con arcos
      const bb = tb - TH - 3;
      const BH = 19;
      isoBox(
        c,
        tx,
        bb,
        8,
        BH,
        "#e0cba5",
        EDGE,
        "#ecdcba",
        "#cdb085",
        "#bfa275",
      );
      const bcy = bb - BH;
      for (let u = 0; u < 5; u++) {
        const edge = u === 0 || u === 4 ? 2 : 0;
        const xL = tx - 7 + u;
        c.fillStyle = DARK;
        c.fillRect(
          xL,
          bcy + (((xL - (tx - 8)) >> 1) + 1) + 4 + edge,
          1,
          11 - edge,
        );
        const xR = tx + 2 + u;
        c.fillRect(
          xR,
          bcy + (((7 - (xR - tx)) >> 1) + 1) + 4 + edge,
          1,
          11 - edge,
        );
      }
      // cornisa superior y remate piramidal con linterna
      isoBox(
        c,
        tx,
        bcy,
        9,
        3,
        "#efe0bf",
        EDGE,
        "#f3e6c8",
        "#d6bf94",
        "#c5ad82",
      );
      const base = bcy - 3;
      for (let r = 0; r < 15; r++) {
        const w = Math.max(0, Math.round(9 * (1 - r / 15)));
        rect(
          c,
          tx - w,
          base - r,
          w + 1,
          1,
          r % 4 === 3 ? "#cdb68c" : "#e7d3ac",
        );
        rect(c, tx + 1, base - r, w, 1, r % 4 === 3 ? "#a98d62" : "#bfa57b");
      }
      rect(c, tx - 1, base - 20, 3, 5, "#efe0bf");
      rect(c, tx, base - 26, 1, 6, GOLD);
      rect(c, tx - 1, base - 24, 3, 1, GOLD);
    };
    tower(40, 125); // torre izquierda (atrás)

    // ---- Portada central (entre torres) ----
    L(49, 14, 34, 0, "#f0e1c0");
    L(49, 1, 34, 0, "#a98d62");
    L(62, 1, 34, 0, "#a98d62");
    L(49, 14, 2, 34, "#f6ead0"); // cornisa
    L(52, 8, 16, 0, DARK); // puerta
    L(53, 6, 2, 16, DARK);
    L(54, 4, 1, 18, DARK);
    L(55, 2, 14, 0, "#5a3a20");
    L(54, 6, 6, 21, "#b88a2a"); // escudo
    L(55, 4, 4, 22, "#e8c54a");
    L(53, 8, 7, 28, "#efe0bf"); // ventana alta
    L(54, 6, 5, 29, DARK);
    c.fillStyle = "#ffd166"; // faroles encendidos
    c.fillRect(48, fbL(48) - 20, 2, 3);
    c.fillRect(63, fbL(63) - 20, 2, 3);

    tower(76, 143); // torre derecha (al frente)
  });
}

/* ---------- Casas coloniales de Mérida: 5 variantes (4x más grandes) ---------- */
function makeHouse(v) {
  return sprite(64, 92, 32, 68, (c) => {
    const CX = 32;
    const HW = 22;
    const WH = 22;
    const CB = 66;
    const cy = CB - WH;
    const fbL = (x) => cy + ((x - (CX - HW)) >> 1) + WH;
    const fbR = (x) => cy + ((HW - 1 - (x - CX)) >> 1) + WH;
    const L = (x0, w, h, yo, col) => {
      c.fillStyle = col;
      for (let u = 0; u < w; u++)
        c.fillRect(x0 + u, fbL(x0 + u) - yo - h, 1, h);
    };
    const R = (x0, w, h, yo, col) => {
      c.fillStyle = col;
      for (let u = 0; u < w; u++)
        c.fillRect(x0 + u, fbR(x0 + u) - yo - h, 1, h);
    };
    const WHITE = "#ffffff";
    const GLASS = "#33495c";

    ellipse(c, CX, 68, 29, 10, "rgba(0,0,0,0.25)");

    // Cornisa + balaustrada blanca (se usa en varias variantes)
    const cornice = (roof, sideL, sideR) =>
      isoBox(c, CX, cy, HW + 1, 3, roof, "#8f8878", sideL, sideR, sideR);
    const balustrade = () => {
      const cyc = cy - 3;
      for (let i = 0; i < HW + 1; i++) {
        const xl = CX - HW - 1 + i;
        const ytl = cyc + (i >> 1) + 1;
        const xr = CX + i;
        const ytr = cyc + ((HW - i) >> 1) + 1;
        c.fillStyle = WHITE;
        c.fillRect(xl, ytl - 3, 1, 1);
        c.fillRect(xr, ytr - 3, 1, 1);
        if (i % 3 === 0) {
          c.fillRect(xl, ytl - 2, 1, 2);
          c.fillRect(xr, ytr - 2, 1, 2);
        }
      }
    };
    // Ventana con marco claro
    const winL = (x, frame) => {
      L(x - 1, 6, 11, 6, frame);
      L(x, 4, 9, 6, GLASS);
    };
    const winR = (x, frame) => {
      R(x - 1, 6, 11, 6, frame);
      R(x, 4, 9, 6, GLASS);
    };

    if (v === 0) {
      // Casona blanca neoclásica con pórtico de columnas
      isoBox(
        c,
        CX,
        CB,
        HW,
        WH,
        "#f4efe4",
        "#a89f8c",
        "#f1e6cf",
        "#e2d9c4",
        "#e8ddc6",
      );
      [12, 17, 22, 27].forEach((x) => {
        L(x, 2, 17, 1, WHITE);
        L(x + 1, 1, 17, 1, "#bfb59f");
      });
      L(11, 21, 3, 18, WHITE);
      L(11, 21, 1, 18, "#bfb59f");
      L(14, 3, 11, 1, "#6b4a2b");
      L(19, 3, 11, 1, "#6b4a2b");
      L(24, 3, 11, 1, "#6b4a2b");
      // frontón triangular
      c.fillStyle = "#fffaf0";
      for (let r = 0; r < 6; r++) {
        const w = 18 - r * 3;
        c.fillRect(21 - (w >> 1), fbL(21) - 22 - r, w, 1);
      }
      winR(36, WHITE);
      winR(44, WHITE);
      cornice("#e6dfd0", "#ddd3be", "#cfc5ae");
      balustrade();
    } else if (v === 1) {
      // Casona azul colonial con marcos blancos y balaustrada
      isoBox(
        c,
        CX,
        CB,
        HW,
        WH,
        "#6fa2e0",
        "#26466f",
        "#4a86d1",
        "#3b6db0",
        "#4179c0",
      );
      L(10, 22, 2, 1, WHITE); // zócalo
      R(32, 22, 2, 1, WHITE);
      winL(12, WHITE);
      winL(26, WHITE);
      L(19, 6, 14, 1, WHITE); // puerta con marco
      L(20, 4, 12, 1, "#3a2414");
      L(20, 4, 1, 13, "#3a2414");
      winR(36, WHITE);
      winR(44, WHITE);
      cornice("#c9d9ec", "#dbe6f2", "#c9d6e6");
      balustrade();
    } else if (v === 2) {
      // Casona salmón con arcada
      isoBox(
        c,
        CX,
        CB,
        HW,
        WH,
        "#f8c9b6",
        "#8a4a3a",
        "#f2b199",
        "#dc967d",
        "#e9a58b",
      );
      [12, 18, 24].forEach((x) => {
        L(x - 1, 6, 14, 1, "#fff1e6");
        L(x, 4, 12, 1, "#4a2c22");
        L(x + 1, 2, 1, 13, "#4a2c22");
      });
      winR(36, "#fff1e6");
      R(44, 6, 15, 1, "#fff1e6"); // puerta lateral arqueada
      R(45, 4, 13, 1, "#4a2c22");
      cornice("#f3d7c8", "#ecd2c4", "#dfbfae");
      balustrade();
      // macetas
      [
        [11, 4],
        [30, 5],
      ].forEach(([x, h]) => {
        rect(c, x, fbL(x) - 1 - h, 3, h, "#b5472f");
        rect(c, x, fbL(x) - 2 - h, 3, 2, "#4ea832");
      });
    } else if (v === 3) {
      // Casona turquesa con torre blanca y techo azul grisáceo
      isoBox(
        c,
        CX,
        CB,
        HW,
        WH,
        "#6adbd3",
        "#1d6360",
        "#44c2bb",
        "#2f9f99",
        "#3bb5ae",
      );
      winL(12, WHITE);
      winL(24, WHITE);
      R(32, 22, 2, 1, WHITE);
      winR(36, WHITE);
      winR(44, WHITE);
      L(18, 5, 12, 1, "#f4fffe");
      L(19, 3, 10, 1, "#2b1a0e");
      cornice("#cfeeeb", "#d7efed", "#c3dfdd");
      // torre
      isoBox(
        c,
        38,
        cy - 3,
        8,
        22,
        "#ffffff",
        "#9aa8a6",
        "#ffffff",
        "#dfe9e8",
        "#cfdad9",
      );
      const ttop = cy - 3 - 22;
      c.fillStyle = GLASS;
      c.fillRect(33, ttop + 8, 2, 6);
      c.fillRect(42, ttop + 8, 2, 6);
      for (let r = 0; r < 14; r++) {
        const w = Math.max(0, Math.round(9 * (1 - r / 14)));
        rect(c, 38 - w, ttop - r + 2, w + 1, 1, "#8aa4b8");
        rect(c, 39, ttop - r + 2, w, 1, "#5f7a90");
      }
      rect(c, 38, ttop - 18, 1, 5, "#d62828");
    } else {
      // Casona crema con techo de teja a cuatro aguas y portal arqueado
      isoBox(
        c,
        CX,
        CB,
        HW,
        WH,
        "#f7e7b8",
        "#8c7a4a",
        "#f7e7b8",
        "#e2cd94",
        "#efdca6",
      );
      L(17, 8, 16, 1, "#fff7dc");
      L(18, 6, 14, 1, "#7b4a24");
      L(19, 4, 2, 14, "#7b4a24");
      winL(11, "#fff7dc");
      winL(28, "#fff7dc");
      winR(36, "#fff7dc");
      winR(44, "#fff7dc");
      cornice("#e4d3a0", "#d8c488", "#c8b478");
      // techo de teja
      const cyc = cy - 3;
      for (let x = CX - 24; x < CX + 24; x++) {
        const t = x < CX ? (x - (CX - 24)) / 24 : (CX + 24 - 1 - x) / 24;
        const top = Math.round(cyc - 18 * t);
        const bot = Math.round(cyc + 12 * t);
        for (let y = top; y <= bot; y++) {
          const stripe = (y + (x >> 2)) % 3 === 0;
          c.fillStyle =
            x < CX
              ? stripe
                ? "#b23a24"
                : "#cf4a30"
              : stripe
                ? "#8f2a18"
                : "#a8361f";
          c.fillRect(x, y, 1, 1);
        }
      }
      rect(c, CX - 1, cyc - 21, 3, 4, "#7a2316");
    }
  });
}

/* ---------- Casa maya de palma (planta oval, techo de huano) ---------- */
// Techo de palma: anillos elípticos apilados (cúpula) con hileras y hebras de paja
// pal = [oscuro, medio-oscuro, medio, claro]
function thatchRoof(c, CX, y0, R, RYK, H, pal, seed) {
  for (let k = 0; k <= H; k++) {
    const t = k / H;
    const rad = Math.round(R * (1 - Math.pow(t, 1.7)));
    if (rad < 1) continue;
    const ryk = rad * RYK;
    const y = y0 - k;
    for (let x = -rad; x <= rad; x++) {
      const u = x / R;
      const e = Math.round(ryk * Math.sqrt(1 - (x / rad) * (x / rad)));
      let lvl = u < -0.45 ? 3 : u < 0.05 ? 2 : u < 0.5 ? 1 : 0;
      if (t > 0.7) lvl = Math.min(3, lvl + 1);
      const n = hash2(CX + x, k, seed);
      if (k % 4 === 0)
        lvl = Math.max(0, lvl - 1); // sombra de cada hilera
      else if ((x * 5 + ((k / 4) | 0) * 3) % 7 === 0)
        lvl = Math.max(0, lvl - 1); // hebras
      else if (n < 0.1) lvl = Math.max(0, lvl - 1);
      else if (n > 0.9) lvl = Math.min(3, lvl + 1);
      c.fillStyle = pal[lvl];
      c.fillRect(CX + x, y - e, 1, 2 * e + 1);
    }
  }
  // flecos de paja en el borde del alero
  for (let x = -R + 2; x <= R - 2; x += 2) {
    const e = Math.round(R * RYK * Math.sqrt(1 - (x / R) * (x / R)));
    const yy = y0 + e;
    const L = 2 + (hash2(x, seed, 4) > 0.5 ? 1 : 0);
    rect(c, CX + x, yy + 1, 1, L, pal[0]);
    px(c, CX + x, yy, pal[1]);
  }
  // penacho de palma en la punta
  const ya = y0 - H;
  [
    [-4, -4],
    [-2, -6],
    [0, -7],
    [2, -6],
    [4, -4],
  ].forEach(([dx, dy], i) =>
    pline(c, CX, ya + 1, CX + dx, ya + dy, pal[i % 2 ? 3 : 2], 1),
  );
}

// Pared cilíndrica de planta oval. colorFn(u, d, x, y): u = -1..1 de izq. a der.,
// d = píxeles sobre el suelo
function ovalWall(c, CX, B, rx, ry, h, colorFn) {
  for (let x = -rx; x <= rx; x++) {
    const u = x / rx;
    const e = Math.round(ry * Math.sqrt(1 - u * u));
    for (let y = B - h + e; y <= B + e; y++) {
      c.fillStyle = colorFn(u, B + e - y, CX + x, y);
      c.fillRect(CX + x, y, 1, 1);
    }
  }
}

// 3 variantes: 0 = blanqueada con cal y base de piedra, 1 = bajareque (palos y
// lodo) con leña y maíz secándose, 2 = ramada abierta con hamaca y fogón
function makeMayaHouse(v) {
  return sprite(84, 80, 42, 62, (c) => {
    const CX = 42;
    const B = 62;
    ellipse(c, CX, B + 3, 35, 12, "rgba(0,0,0,0.25)");

    if (v === 2) {
      // ---- Ramada abierta ----
      ellipse(c, CX, B + 2, 26, 11, "#7a6240");
      ellipse(c, CX, B + 1, 25, 10, "#a78a5c");
      ellipse(c, CX - 3, B, 17, 6, "#b99c6a");
      for (let k = 0; k < 26; k++) {
        const a = hash2(k, 1, 2) * 6.28;
        const d = Math.sqrt(hash2(k, 2, 2));
        px(
          c,
          CX + Math.cos(a) * d * 21,
          B + 1 + Math.sin(a) * d * 8,
          hash2(k, 3, 2) > 0.5 ? "#8c7248" : "#c9ad7a",
        );
      }
      // fogón de piedras con brasas
      ellipse(c, CX + 6, B + 5, 5, 2, "#5a564d");
      ellipse(c, CX + 6, B + 5, 3, 1, "#2b1a10");
      px(c, CX + 5, B + 5, "#ff7a1a");
      px(c, CX + 7, B + 5, "#ffcf3a");
      px(c, CX + 6, B + 4, "#ff9a2a");
      const post = (a) => {
        const x = Math.round(CX + Math.cos(a) * 22);
        const y = Math.round(B + 1 + Math.sin(a) * 9);
        rect(c, x - 1, y - 20, 3, 20, "#4a2c14");
        rect(c, x - 1, y - 20, 1, 20, "#8c5e34");
        rect(c, x, y - 20, 1, 20, "#6b4423");
        px(c, x, y - 8, "#4a2c14");
      };
      [-2.6, -1.9, -1.2, -0.5].forEach(post); // postes de atrás
      thatchRoof(
        c,
        CX,
        B - 20,
        31,
        0.4,
        28,
        ["#6e5a22", "#a8933a", "#d2bb55", "#f0e08a"],
        31,
      );
      [0.6, 1.4, 2.0, 2.55].forEach(post); // postes de enfrente (sobre el alero)
      // hamaca colgada entre los dos postes del frente
      const x0 = CX - 18,
        x1 = CX + 18,
        ya = B - 6;
      for (let x = x0; x <= x1; x++) {
        const t = (x - x0) / (x1 - x0);
        const y = Math.round(ya + 8 * Math.sin(Math.PI * t));
        const band = Math.floor((x - x0) / 3) % 2;
        rect(c, x, y, 1, 3, band ? "#ffe0ef" : "#f72585");
        px(c, x, y + 3, "#9d1457");
      }
      pline(c, x0, ya - 2, x0 + 3, ya, "#d8c8a0", 1);
      pline(c, x1, ya - 2, x1 - 3, ya, "#d8c8a0", 1);
      return;
    }

    const WH = 16;
    const RX = 22;
    const RY = 9;
    if (v === 0) {
      // pared de cal con base de piedra
      ovalWall(c, CX, B, RX, RY, WH, (u, d, x, y) => {
        const n = hash2(x, y, 3);
        if (d < 3)
          return n < 0.4 ? "#8f897a" : n < 0.75 ? "#a9a393" : "#767062";
        let col =
          u < -0.5
            ? "#fbf6ea"
            : u < 0.2
              ? "#f3ecdc"
              : u < 0.6
                ? "#e0d6c0"
                : "#c9bea6";
        if (n < 0.06) col = "#d8cdb4";
        return col;
      });
    } else {
      // bajareque: palos verticales amarrados con bejuco
      ovalWall(c, CX, B, RX, RY, WH, (u, d, x, y) => {
        const n = hash2(x, y, 5);
        let col =
          u < -0.5
            ? "#c58f58"
            : u < 0.2
              ? "#a8794a"
              : u < 0.6
                ? "#855b35"
                : "#654425";
        if (x % 3 === 0) col = u < 0.2 ? "#7a5230" : "#4a2e16";
        if (d % 6 === 5)
          col = "#4a2e16"; // amarre horizontal
        else if (n < 0.07) col = "#d9a56b";
        return col;
      });
    }
    // puerta
    const dy = B + RY;
    rect(c, CX - 5, dy - 13, 10, 13, v === 0 ? "#6b4a2b" : "#3a2410");
    rect(c, CX - 4, dy - 12, 8, 12, "#1c110a");
    if (v === 0) {
      rect(c, CX - 3, dy - 3, 5, 2, "#ffe0ef"); // hamaca recogida adentro
      px(c, CX - 2, dy - 3, "#f72585");
      px(c, CX, dy - 3, "#f72585");
      ellipse(c, CX, dy + 1, 7, 2, "#a8a090"); // escalón de piedra
      ellipse(c, CX, dy, 6, 1, "#c9c3b2");
      // olla de barro junto a la puerta
      ellipse(c, CX + 14, dy - 2, 3, 3, "#8e4a2a");
      ellipse(c, CX + 13, dy - 3, 2, 2, "#b5653a");
      rect(c, CX + 12, dy - 6, 5, 1, "#6e3820");
    } else {
      // petate (tejido de palma) enrollado a un lado de la puerta
      rect(c, CX - 4, dy - 12, 3, 12, "#b8923c");
      for (let y = dy - 12; y < dy; y += 2) rect(c, CX - 4, y, 3, 1, "#8a6a28");
      // leña apilada
      [
        [0, 0],
        [4, 0],
        [2, -2],
      ].forEach(([ox, oy]) => {
        ellipse(c, CX + 16 + ox, dy - 1 + oy, 2, 2, "#4a2c14");
        px(c, CX + 16 + ox, dy - 1 + oy, "#d9a56b");
      });
      // mazorcas de maíz colgando del alero
      [-14, -11, -8].forEach((ox) => {
        rect(c, CX + ox, B - 3, 2, 5, "#f2c230");
        px(c, CX + ox, B + 2, "#4ea832");
      });
    }
    const pal =
      v === 0
        ? ["#6e5220", "#a37e33", "#c9a24a", "#e8d080"]
        : ["#4e3a1a", "#745a2a", "#9a7e40", "#b8a060"];
    thatchRoof(c, CX, B - WH, 29, 0.4, 28, pal, 11 + v * 7);
  });
}

// Faro costero con muralla almenada: torre cónica con franjas rojas, galería
// con barandal, linterna de cristal con luz encendida y cúpula roja.
// (Dibujado al doble de resolución que antes para poder darle detalle.)
function makeLighthouse() {
  return sprite(88, 132, 44, 110, (c) => {
    const CX = 44;
    const HW = 28; // semiancho de la base amurallada
    const BH = 12; // alto de la muralla
    const BB = 110; // base de la muralla
    const cy = BB - BH; // centro de la plataforma (96)
    const DARK = "#3a2616";
    ellipse(c, CX, 112, 38, 14, "rgba(0,0,0,0.28)");

    // ---- Base amurallada de piedra ----
    isoBox(
      c,
      CX,
      BB,
      HW,
      BH,
      "#c9bba6",
      "#7d7264",
      "#e6dac8",
      "#c2b4a0",
      "#a69884",
    );
    diamond(c, CX, cy, HW - 5, "#b3a58f"); // patio interior
    diamond(c, CX, cy, HW - 7, "#bdae98");

    const fbL = (x) => cy + ((x - (CX - HW)) >> 1) + BH;
    const fbR = (x) => cy + ((HW - 1 - (x - CX)) >> 1) + BH;
    // puerta arqueada y troneras en la muralla
    for (let u = 0; u < 7; u++) {
      const x = 30 + u;
      const edge = u === 0 || u === 6 ? 2 : 0;
      c.fillStyle = "#f0e6d4";
      c.fillRect(x, fbL(x) - 10, 1, 10);
      c.fillStyle = DARK;
      c.fillRect(x, fbL(x) - 8 + edge, 1, 8 - edge);
    }
    [52, 62, 72].forEach((x) => {
      c.fillStyle = DARK;
      c.fillRect(x, fbR(x) - 8, 1, 4);
      c.fillRect(x + 1, fbR(x + 1) - 8, 1, 4);
    });

    // almenas (merlones) en los bordes de la muralla
    const merlon = (x, y) => {
      c.fillStyle = "#e6dac8";
      c.fillRect(x, y - 4, 3, 4);
      c.fillStyle = "#f6eee0";
      c.fillRect(x, y - 4, 3, 1);
      c.fillStyle = "#a69884";
      c.fillRect(x + 2, y - 3, 1, 3);
    };
    for (let i = 2; i < HW - 1; i += 5) {
      merlon(CX - HW + i, cy - (i >> 1)); // borde trasero izquierdo
      merlon(CX + i, cy - (HW >> 1) + (i >> 1)); // borde trasero derecho
    }

    // ---- Torre cónica ----
    const TOP = 46; // y de la galería
    const TB = cy; // base de la torre
    // zócalo de piedra
    ellipse(c, CX, TB + 2, 15, 6, "#8c7f6e");
    ellipse(c, CX, TB + 1, 14, 5, "#b3a58f");
    const bands = [
      [TB, 76, "w"],
      [76, 68, "r"],
      [68, 60, "w"],
      [60, 52, "r"],
      [52, TOP, "w"],
    ];
    const pal = {
      w: ["#ffffff", "#f1ede4", "#d8d2c4", "#b9b2a2"],
      r: ["#f0584a", "#d93a2b", "#b02a1f", "#8a2018"],
    };
    for (let y = TB; y >= TOP; y--) {
      const t = (TB - y) / (TB - TOP);
      const w = Math.round(12 - 5 * t);
      const band = bands.find(([a, b]) => y <= a && y > b) || bands[4];
      const p = pal[band[2]];
      for (let x = CX - w; x <= CX + w; x++) {
        const d = (x - CX) / w;
        c.fillStyle = d < -0.55 ? p[0] : d < 0.1 ? p[1] : d < 0.7 ? p[2] : p[3];
        c.fillRect(x, y, 1, 1);
      }
    }
    // curvatura de la base de la torre
    for (let x = CX - 12; x <= CX + 12; x++) {
      const dy = Math.round(3 * Math.sqrt(1 - ((x - CX) / 12.5) ** 2));
      c.fillStyle = "rgba(0,0,0,0.12)";
      c.fillRect(x, TB - 1 + dy, 1, 1);
    }
    // puerta de la torre
    rect(c, CX - 4, TB - 9, 6, 9, "#f6efe0");
    rect(c, CX - 3, TB - 8, 4, 8, DARK);
    rect(c, CX - 2, TB - 9, 2, 1, DARK);
    // ventanitas con marco
    [
      [82, -1],
      [72, 3],
      [64, -2],
      [56, 2],
    ].forEach(([y, dx]) => {
      rect(c, CX + dx - 1, y - 1, 4, 6, "#f6efe0");
      rect(c, CX + dx, y, 2, 4, DARK);
      px(c, CX + dx, y, "#7a8fa3");
    });

    // ---- Galería con barandal ----
    ellipse(c, CX, TOP + 3, 15, 5, "#3d3d44");
    ellipse(c, CX, TOP + 1, 14, 4, "#6c6c76");
    ellipse(c, CX, TOP, 12, 3, "#8b8b95");
    for (let a = 0; a <= Math.PI; a += 0.22) {
      const x = Math.round(CX + Math.cos(a) * 13);
      const y = Math.round(TOP + 1 + Math.sin(a) * 3.5);
      rect(c, x, y - 5, 1, 5, "#c0392b");
    }
    for (let a = 0; a <= Math.PI; a += 0.08) {
      px(c, CX + Math.cos(a) * 13, TOP - 4 + Math.sin(a) * 3.5, "#f2f2f2");
    }

    // ---- Linterna con luz ----
    const LT = TOP - 14; // techo de la linterna
    ellipse(c, CX, LT + 8, 20, 14, "rgba(255,225,120,0.18)"); // resplandor
    ellipse(c, CX, LT + 8, 14, 10, "rgba(255,225,120,0.20)");
    for (let y = TOP - 1; y >= LT; y--) {
      for (let x = CX - 7; x <= CX + 7; x++) {
        const mull = (x - CX + 7) % 5 === 0;
        c.fillStyle = mull
          ? "#a82020"
          : Math.abs(x - CX) < 3
            ? "#fff6c8"
            : x < CX
              ? "#ffe08a"
              : "#f0b83a";
        c.fillRect(x, y, 1, 1);
      }
    }
    rect(c, CX - 8, TOP - 1, 17, 2, "#8f1d1d"); // base de la linterna
    rect(c, CX - 8, LT - 1, 17, 2, "#8f1d1d"); // aro superior
    // cúpula roja
    halfDisc(c, CX, LT - 1, 9, "#c0392b");
    halfDisc(c, CX - 2, LT - 2, 6, "#e8584a");
    for (let y = LT - 10; y < LT - 1; y++)
      px(c, CX + 5 + ((y - LT) >> 2), y, "#8a2018");
    // pararrayos y bola dorada
    rect(c, CX, LT - 18, 1, 8, "#40404a");
    disc(c, CX, LT - 12, 1, "#f2c230");

    // ---- Almenas del frente (delante de la torre) ----
    for (let i = 2; i < HW - 1; i += 5) {
      merlon(CX - HW + i, cy + (i >> 1) + 1); // borde delantero izquierdo
      merlon(CX + i, cy + (HW >> 1) - (i >> 1) - 1); // borde delantero derecho
    }

    // ---- Vegetación y rocas en la base ----
    const r = mulberry32(17);
    for (let k = 0; k < 40; k++) {
      const x = 8 + ((r() * 72) | 0);
      const y = 106 + ((r() * 14) | 0);
      px(c, x, y, r() > 0.5 ? "#4f8f3a" : "#6fb04a");
    }
    [
      [10, 111],
      [78, 111],
    ].forEach(([x, y]) => {
      ellipse(c, x, y, 4, 2, "#8c8478");
      ellipse(c, x - 1, y - 1, 2, 1, "#b0a898");
    });
  });
}

// Parcela de cultivo / milpa (cuadritos de cultivo de la imagen)
function makeCropPatch() {
  return sprite(32, 20, 16, 16, (c) => {
    diamond(c, 16, 12, 13, "#6e4720");
    diamond(c, 16, 12, 11, "#8c5d2b");
    for (let dx = -6; dx <= 6; dx += 4) {
      for (let dy = -2; dy <= 2; dy += 2) {
        rect(c, 16 + dx, 11 + dy, 2, 2, "#4ea832");
        px(c, 16 + dx, 10 + dy, "#8ce05a");
      }
    }
  });
}

function makeStoneBlock() {
  return sprite(40, 48, 20, 38, (c) => {
    ellipse(c, 20, 38, 15, 5, "rgba(0,0,0,0.28)");
    isoBox(
      c,
      20,
      38,
      12,
      12,
      "#b8b8aa",
      "#7d7d70",
      "#9a9a8c",
      "#76766a",
      "#6f6f62",
    );
    isoBox(
      c,
      20,
      26,
      8,
      10,
      "#c4c4b4",
      "#86867a",
      "#a2a294",
      "#7c7c70",
      "#6f6f62",
    );
  });
}

// Masa de follaje hecha de círculos: sombra, color medio y destellos
function foliage(c, cx, cy, rx, ry, seed, cols, count, rmin, rmax) {
  const r = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    pts.push([
      Math.round(cx + Math.cos(a) * d * rx),
      Math.round(cy + Math.sin(a) * d * ry),
      Math.round(rmin + r() * (rmax - rmin)),
    ]);
  }
  pts.forEach(([x, y, rad]) => disc(c, x, y + 1, rad, cols[0]));
  pts.forEach(([x, y, rad]) =>
    disc(c, x - 1, y - 1, Math.max(1, rad - 1), cols[1]),
  );
  pts.forEach(([x, y, rad], i) => {
    if (i % 2 === 0) {
      disc(
        c,
        x - Math.round(rad * 0.3),
        y - Math.round(rad * 0.4),
        Math.max(1, Math.round(rad * 0.4)),
        cols[2],
      );
    }
  });
}

/* ---------- Árboles de la península (pixel art detallado) ---------- */
/* Todos se dibujan directamente al tamaño final (ya no se usa squashV),
   con contorno oscuro, 4 tonos de luz (arriba-izquierda) y texturas. */

// Masa de follaje: contorno, sombra, tono medio, luz y destellos + hojitas sueltas
// pal = [contorno, sombra, medio, luz, destello]
function leafMass(c, cx, cy, rx, ry, seed, pal, count, rmin, rmax) {
  const r = mulberry32(seed);
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    pts.push([
      Math.round(cx + Math.cos(a) * d * rx),
      Math.round(cy + Math.sin(a) * d * ry),
      Math.round(rmin + r() * (rmax - rmin)),
    ]);
  }
  // los de abajo primero para que los de arriba queden por encima
  pts.sort((a, b) => a[1] - b[1]);
  pts.forEach(([x, y, rad]) => disc(c, x, y + 1, rad + 1, pal[0]));
  pts.forEach(([x, y, rad]) => disc(c, x, y + 1, rad, pal[1]));
  pts.forEach(([x, y, rad]) => disc(c, x - 1, y, Math.max(1, rad - 1), pal[2]));
  pts.forEach(([x, y, rad]) =>
    disc(c, x - 1, y - 1, Math.max(1, rad - 2), pal[3]),
  );
  pts.forEach(([x, y], i) => {
    if (i % 2 === 0) {
      px(c, x - 2, y - 2, pal[4]);
      px(c, x - 1, y - 3, pal[4]);
      px(c, x - 3, y - 1, pal[4]);
    }
  });
  // textura de hojas: trazos oscuros abajo, trazos claros arriba
  for (let k = 0; k < count * 3; k++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const x = Math.round(cx + Math.cos(a) * d * rx);
    const y = Math.round(cy + Math.sin(a) * d * ry);
    if (y > cy) {
      px(c, x, y, pal[1]);
      px(c, x + 1, y + 1, pal[1]);
    } else {
      px(c, x, y, pal[3]);
      px(c, x - 1, y + 1, pal[3]);
    }
  }
}

// Tronco con contorno, luz a la izquierda, sombra a la derecha y corteza
// col = [contorno, sombra, medio, luz]
function trunk(c, x, yTop, yBot, w, col, seed, wob) {
  const r = mulberry32(seed);
  for (let y = yTop; y <= yBot; y++) {
    const off = wob ? Math.round(Math.sin(y / 7) * wob) : 0;
    const x0 = x + off;
    const flare = y > yBot - 4 ? yBot - y - 4 : 0; // ensancha la base
    rect(c, x0 - 1 + flare, y, w + 2 - flare * 2, 1, col[0]);
    rect(c, x0 + flare, y, w - flare * 2, 1, col[2]);
    px(c, x0 + flare, y, col[3]);
    if (w > 5) px(c, x0 + flare + 1, y, col[3]);
    px(c, x0 + w - 1 - flare, y, col[1]);
    if (w > 5) px(c, x0 + w - 2 - flare, y, col[1]);
    if (r() < 0.22) px(c, x0 + 1 + ((r() * (w - 2)) | 0), y, col[1]);
    if (r() < 0.12) px(c, x0 + 1 + ((r() * (w - 2)) | 0), y, col[3]);
  }
}

// Rama con contorno, cuerpo y luz
function branch(c, x0, y0, x1, y1, col, t) {
  pline(c, x0, y0 + 1, x1, y1 + 1, col[0], t + 2);
  pline(c, x0 + 1, y0 + 1, x1 + 1, y1 + 1, col[1], t + 1);
  pline(c, x0, y0, x1, y1, col[2], t);
  pline(c, x0, y0, x1, y1, col[3], 1);
}

// Raíz curva con grosor que se afina (curva de Bézier), contorno y luz
// col = [contorno, sombra, medio, luz]
function rootCurve(c, x0, y0, cx, cy, x1, y1, w0, w1, col) {
  const n = 48;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      Math.round(u * u * x0 + 2 * u * t * cx + t * t * x1),
      Math.round(u * u * y0 + 2 * u * t * cy + t * t * y1),
      Math.max(1, Math.round(w0 + (w1 - w0) * t)),
    ]);
  }
  pts.forEach(([x, y, w]) => {
    const h = w >> 1;
    rect(c, x - h - 1, y - h - 1, w + 2, w + 2, col[0]);
  });
  pts.forEach(([x, y, w]) => {
    const h = w >> 1;
    rect(c, x - h, y - h, w, w, col[1]);
  });
  pts.forEach(([x, y, w]) => {
    const h = w >> 1;
    rect(c, x - h, y - h, Math.max(1, w - 1), Math.max(1, w - 1), col[2]);
  });
  pts.forEach(([x, y, w], i) => {
    const h = w >> 1;
    if (w >= 2 && i % 3 !== 2) px(c, x - h, y - h, col[3]);
  });
}

// Raíces superficiales pequeñas en la base de un tronco
function rootFlare(c, cx, gy, col) {
  [-1, 1].forEach((d) => {
    rootCurve(
      c,
      cx + d * 2,
      gy - 5,
      cx + d * 8,
      gy - 6,
      cx + d * 13,
      gy,
      3,
      1,
      col,
    );
    rootCurve(
      c,
      cx + d * 3,
      gy - 3,
      cx + d * 7,
      gy - 2,
      cx + d * 10,
      gy + 1,
      2,
      1,
      col,
    );
  });
}

// Contrafuerte tabular de la ceiba: aleta que se abre en curva cóncava hacia el suelo
// dir: -1 izquierda, +1 derecha; tx: borde del tronco
function buttress(c, tx, dir, yTop, yBot, maxExt, col, seed) {
  const r = mulberry32(seed);
  for (let y = yTop; y <= yBot; y++) {
    const t = (y - yTop) / (yBot - yTop);
    const e = Math.max(1, Math.round(maxExt * Math.pow(t, 2.2)));
    const x0 = dir < 0 ? tx - e : tx;
    // contorno exterior y relleno
    px(c, dir < 0 ? x0 - 1 : x0 + e, y, col[0]);
    rect(c, x0, y, e, 1, col[2]);
    // pliegue oscuro junto al tronco
    const inner = dir < 0 ? x0 + e - 2 : x0;
    rect(c, Math.max(x0, inner), y, Math.min(2, e), 1, col[1]);
    // borde exterior: luz a la izquierda, sombra a la derecha
    px(c, dir < 0 ? x0 : x0 + e - 1, y, dir < 0 ? col[3] : col[1]);
    if (e > 5 && dir < 0) px(c, x0 + 1, y, col[3]);
    // vetas verticales de la madera
    if (e > 3 && r() < 0.35) px(c, x0 + 1 + ((r() * (e - 2)) | 0), y, col[1]);
    if (e > 3 && r() < 0.15) px(c, x0 + 1 + ((r() * (e - 2)) | 0), y, col[3]);
  }
  // borde inferior apoyado en el suelo
  const eb = maxExt;
  rect(c, dir < 0 ? tx - eb - 1 : tx, yBot + 1, eb + 2, 1, col[0]);
}

// Ruido de valor suave (bordes irregulares del follaje de la ceiba)
function vnoise(x, y, sc, s) {
  const fx = x / sc;
  const fy = y / sc;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, s);
  const b = hash2(x0 + 1, y0, s);
  const c2 = hash2(x0, y0 + 1, s);
  const d = hash2(x0 + 1, y0 + 1, s);
  return a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy;
}

// Rama gruesa que se afina: contorno, sombra, cuerpo y luz por capas
// pts = [[x,y],...]; col = [contorno, sombra, medio, luz]
function limb(c, pts, t0, t1, col) {
  const n = pts.length - 1;
  const tw = (i) =>
    Math.max(1, Math.round(t0 + (t1 - t0) * (i / Math.max(1, n - 1))));
  for (let i = 0; i < n; i++)
    pline(
      c,
      pts[i][0] - 1,
      pts[i][1],
      pts[i + 1][0] - 1,
      pts[i + 1][1],
      col[0],
      tw(i) + 2,
    );
  for (let i = 0; i < n; i++)
    pline(
      c,
      pts[i][0],
      pts[i][1] + 1,
      pts[i + 1][0],
      pts[i + 1][1] + 1,
      col[1],
      tw(i) + 1,
    );
  for (let i = 0; i < n; i++)
    pline(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col[2], tw(i));
  for (let i = 0; i < n; i++)
    if (tw(i) > 1)
      pline(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col[3], 1);
}

// Ceiba (yaxché): tronco grueso gris-oliva con base acampanada y nudos,
// ramas gruesas y una copa ancha y plana de follaje irregular en capas
function makeCeiba() {
  const W = 112;
  const H = 84;
  const GY = 76; // línea del suelo
  return sprite(W, H, 56, GY, (c) => {
    const bark = ["#25231d", "#443f34", "#675f4e", "#8d846f"];
    const br = ["#1f1d19", "#37332b", "#524c40", "#756d5b"];
    const gr = ["#16340c", "#27561a", "#4a7d22", "#6c9b30", "#98c050"];

    ellipse(c, 56, GY + 1, 40, 5, "rgba(0,0,0,0.30)");

    // raíces superficiales que se reparten por el suelo
    rootCurve(c, 38, 71, 26, 73, 10, GY + 1, 4, 1, bark);
    rootCurve(c, 74, 71, 86, 73, 102, GY + 1, 4, 1, bark);
    rootCurve(c, 42, 74, 34, GY + 1, 22, GY + 3, 2, 1, bark);
    rootCurve(c, 70, 74, 78, GY + 1, 90, GY + 3, 2, 1, bark);

    // tronco: se ensancha en curva cóncava hacia la base (contrafuertes)
    const cxT = (y) => 56 + Math.round(Math.sin(y / 9) * 0.9);
    const hwT = (y) => {
      if (y < 40) return 5;
      const t = Math.max(0, (y - 46) / (GY - 46));
      return 6 + Math.round(15 * Math.pow(t, 2.2));
    };
    for (let y = 33; y <= GY; y++) {
      const cx = cxT(y);
      const hw = hwT(y);
      const L = cx - hw;
      const R = cx + hw;
      px(c, L - 1, y, bark[0]);
      px(c, R + 1, y, bark[0]);
      for (let x = L; x <= R; x++) {
        const u = (x - L) / (2 * hw);
        const key = Math.round(u * 20);
        let tone = u < 0.2 ? 3 : u < 0.58 ? 2 : 1;
        const h = hash2(key, Math.floor((y + key * 3) / 5), 11);
        if (h < 0.28) tone -= 1;
        else if (h > 0.9) tone += 1;
        if (y > 55 && (key === 7 || key === 14) && hash2(x, y, 5) > 0.15)
          tone = 0;
        else if (y > 58 && (key === 6 || key === 13) && hash2(x, y, 6) > 0.4)
          tone = 3;
        if (x >= R - 1) tone = Math.min(tone, 1);
        px(c, x, y, bark[Math.max(0, Math.min(3, tone))]);
      }
    }
    rect(c, 56 - hwT(GY) - 1, GY + 1, hwT(GY) * 2 + 3, 1, bark[0]);

    // nudos en el tronco
    [
      [51, 47],
      [62, 57],
    ].forEach(([x, y]) => {
      disc(c, x, y, 2, bark[0]);
      disc(c, x, y + 1, 1, bark[1]);
      px(c, x - 1, y - 2, bark[3]);
      px(c, x, y - 2, bark[3]);
    });

    // ramas gruesas que salen de la horquilla del tronco
    limb(
      c,
      [
        [56, 39],
        [46, 31],
        [34, 26],
        [16, 23],
      ],
      3,
      1,
      br,
    );
    limb(
      c,
      [
        [56, 39],
        [67, 31],
        [81, 27],
        [99, 23],
      ],
      3,
      1,
      br,
    );
    limb(
      c,
      [
        [55, 37],
        [51, 26],
        [44, 15],
      ],
      2,
      1,
      br,
    );
    limb(
      c,
      [
        [57, 37],
        [62, 25],
        [71, 14],
      ],
      2,
      1,
      br,
    );
    limb(
      c,
      [
        [54, 41],
        [44, 38],
        [34, 41],
        [27, 46],
      ],
      2,
      1,
      br,
    );
    limb(
      c,
      [
        [58, 41],
        [70, 38],
        [83, 35],
        [95, 33],
      ],
      2,
      1,
      br,
    );
    // ramitas cruzadas en la horquilla
    pline(c, 50, 36, 62, 33, br[0], 1);
    pline(c, 52, 37, 63, 36, br[1], 1);
    pline(c, 36, 28, 31, 35, br[0], 1);
    pline(c, 78, 29, 84, 36, br[0], 1);

    // copa: capas planas de follaje con bordes irregulares y huecos
    const clusters = [
      // colgantes bajos (primero, quedan atrás)
      [30, 45, 9, 5],
      [20, 39, 8, 4],
      [71, 42, 7, 4],
      [99, 30, 8, 4],
      // banda media
      [56, 24, 26, 5],
      [24, 28, 15, 5],
      [90, 25, 17, 5],
      [10, 29, 8, 4],
      // capas altas
      [38, 17, 18, 5],
      [76, 15, 18, 5],
      [56, 10, 24, 6],
      [30, 21, 12, 4],
      [86, 20, 12, 4],
    ];
    // motas sueltas en el borde de la copa
    const rg = mulberry32(77);
    for (let i = 0; i < 26; i++) {
      const a = rg() * Math.PI * 2;
      const px0 = Math.round(56 + Math.cos(a) * (38 + rg() * 12));
      const py0 = Math.round(22 + Math.sin(a) * (11 + rg() * 8));
      if (py0 > 29 && Math.abs(px0 - 56) < 18) continue;
      clusters.push([px0, py0, 2 + ((rg() * 3) | 0), 2]);
    }
    const buf = new Int8Array(W * H).fill(-1);
    clusters.forEach(([cx, cy, rx, ry], id) => {
      for (let y = cy - ry - 3; y <= cy + ry + 3; y++) {
        for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const d =
            Math.sqrt(dx * dx + dy * dy) +
            (vnoise(x, y, 3, 40 + id) - 0.5) * 0.6;
          if (d > 1) continue;
          if (dy > -0.2 && d > 0.3 && vnoise(x + 50, y, 2.5, 90) > 0.7)
            continue;
          const v =
            dy * 0.55 + dx * 0.12 + (vnoise(x, y, 2, 7 + id * 3) - 0.5) * 0.9;
          buf[y * W + x] = v < -0.18 ? 3 : v < 0.2 ? 2 : v < 0.5 ? 1 : 0;
        }
      }
    });
    const at = (x, y) =>
      x < 0 || y < 0 || x >= W || y >= H ? -1 : buf[y * W + x];
    const out = new Int8Array(buf);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let t = buf[y * W + x];
        if (t < 0) continue;
        if (at(x, y + 1) < 0)
          t = 0; // borde inferior oscuro
        else if (at(x + 1, y) < 0 || at(x - 1, y) < 0) t = Math.min(t, 1);
        else if (at(x, y - 1) < 0 && t >= 2) t = hash2(x, y, 3) < 0.3 ? 4 : 3;
        out[y * W + x] = t;
      }
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = out[y * W + x];
        if (t >= 0) px(c, x, y, gr[t]);
      }
  });
}

// Mangle rojo: copa densa de hojas brillantes en racimos, ramas que se cruzan
// y una maraña de raíces zancudas arqueadas que bajan hasta el lodo
function makeMangle() {
  const W = 88;
  const H = 70;
  const GY = 64; // línea del suelo
  return sprite(W, H, 44, GY, (c) => {
    const wood = ["#2a160a", "#5a3519", "#8a5a2e", "#b9824a"];
    const gr = ["#0f3a12", "#1d6a1c", "#3f9a26", "#6cc83a", "#a6e65a"];

    // sombra, charco y lodo
    ellipse(c, 44, GY, 36, 4, "rgba(0,0,0,0.28)");
    ellipse(c, 44, GY, 34, 3, "rgba(70,110,120,0.30)");
    [12, 20, 28, 36, 44, 52, 60, 68, 76].forEach((x) =>
      ellipse(c, x, GY, 3, 1, "#2a1d14"),
    );
    [
      [16, GY + 2, 5],
      [72, GY + 2, 5],
      [44, GY + 3, 8],
    ].forEach(([x, y, w]) =>
      rect(c, x - w, y, w * 2, 1, "rgba(190,230,245,0.40)"),
    );

    // raíces zancudas: arcos que salen de la base y bajan al suelo
    // (primero las laterales, luego las centrales, que quedan delante)
    rootCurve(c, 38, 42, 12, 32, 9, GY, 3, 1, wood);
    rootCurve(c, 51, 42, 76, 33, 80, GY, 3, 1, wood);
    rootCurve(c, 38, 44, 22, 40, 17, GY - 1, 2, 1, wood);
    rootCurve(c, 51, 44, 66, 41, 71, GY, 2, 1, wood);
    rootCurve(c, 39, 46, 30, 46, 25, GY, 2, 1, wood);
    rootCurve(c, 50, 46, 60, 47, 62, GY - 1, 2, 1, wood);
    rootCurve(c, 41, 46, 33, 54, 34, GY, 2, 1, wood);
    rootCurve(c, 48, 46, 55, 55, 54, GY, 2, 1, wood);
    rootCurve(c, 43, 46, 39, 56, 41, GY, 2, 1, wood);
    rootCurve(c, 46, 46, 49, 57, 47, GY, 2, 1, wood);
    rootCurve(c, 42, 47, 24, 52, 27, GY, 1, 1, wood);
    rootCurve(c, 47, 47, 66, 52, 64, GY, 1, 1, wood);
    rootCurve(c, 44, 46, 44, 55, 44, GY, 3, 2, wood);

    // tronco corto que se bifurca en X
    rect(c, 40, 38, 8, 9, wood[0]);
    rect(c, 41, 38, 6, 9, wood[2]);
    rect(c, 41, 38, 1, 9, wood[3]);
    rect(c, 46, 38, 1, 9, wood[1]);

    // masa oscura de fondo dentro de la copa
    const rb = mulberry32(5);
    for (let y = 4; y <= 38; y++) {
      for (let x = 4; x <= 84; x++) {
        const dx = (x - 44) / 38;
        const dy = (y - 19) / 17;
        if (dx * dx + dy * dy + (rb() - 0.5) * 0.15 > 1) continue;
        px(c, x, y, rb() < 0.18 ? gr[1] : gr[0]);
      }
    }

    // ramas que se cruzan entre el follaje
    const limb2 = (pts, t0, t1) => {
      const n = pts.length - 1;
      const tw = (i) =>
        Math.max(1, Math.round(t0 + (t1 - t0) * (i / Math.max(1, n - 1))));
      for (let i = 0; i < n; i++)
        pline(
          c,
          pts[i][0] - 1,
          pts[i][1],
          pts[i + 1][0] - 1,
          pts[i + 1][1],
          wood[0],
          tw(i) + 2,
        );
      for (let i = 0; i < n; i++)
        pline(
          c,
          pts[i][0],
          pts[i][1],
          pts[i + 1][0],
          pts[i + 1][1],
          wood[2],
          tw(i),
        );
      for (let i = 0; i < n; i++)
        pline(
          c,
          pts[i][0],
          pts[i][1],
          pts[i + 1][0],
          pts[i + 1][1],
          wood[3],
          1,
        );
    };
    limb2(
      [
        [43, 41],
        [37, 33],
        [27, 29],
        [15, 26],
      ],
      3,
      1,
    );
    limb2(
      [
        [45, 41],
        [51, 33],
        [58, 26],
      ],
      3,
      1,
    );
    limb2(
      [
        [44, 40],
        [47, 29],
        [43, 19],
      ],
      3,
      1,
    );
    limb2(
      [
        [46, 42],
        [57, 41],
        [67, 36],
        [80, 32],
      ],
      3,
      1,
    );
    limb2(
      [
        [60, 38],
        [66, 30],
        [72, 24],
      ],
      2,
      1,
    );
    limb2(
      [
        [36, 33],
        [32, 25],
        [28, 19],
      ],
      2,
      1,
    );
    limb2(
      [
        [47, 29],
        [53, 24],
        [58, 19],
      ],
      2,
      1,
    );

    // racimos de hojas brillantes con borde dentado
    const clusters = [
      [45, 5, 8, 4],
      [31, 9, 7, 4],
      [59, 9, 8, 4],
      [20, 15, 8, 4],
      [36, 15, 8, 4],
      [53, 15, 8, 4],
      [69, 15, 8, 4],
      [80, 21, 6, 4],
      [11, 23, 7, 4],
      [26, 23, 8, 4],
      [43, 22, 8, 4],
      [59, 22, 8, 4],
      [73, 25, 9, 4],
      [14, 31, 7, 4],
      [26, 32, 7, 3],
      [64, 32, 8, 3],
      [77, 31, 7, 4],
    ];
    const buf = new Int8Array(W * H).fill(-1);
    clusters.forEach(([cx, cy, rx, ry], id) => {
      for (let y = cy - ry - 3; y <= cy + ry + 3; y++) {
        for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const a = Math.atan2(dy, dx);
          const d =
            Math.sqrt(dx * dx + dy * dy) *
              (1 + 0.2 * Math.sin(a * 7 + id * 1.7)) +
            (vnoise(x, y, 2, 60 + id) - 0.5) * 0.35;
          if (d > 0.92) continue;
          const v = dy * 0.5 + (vnoise(x, y, 2, 11 + id * 3) - 0.5) * 0.75;
          buf[y * W + x] = v < -0.32 ? 4 : v < 0.05 ? 3 : v < 0.4 ? 2 : 1;
        }
      }
    });
    const at = (x, y) =>
      x < 0 || y < 0 || x >= W || y >= H ? -1 : buf[y * W + x];
    const out = new Int8Array(buf);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let t = buf[y * W + x];
        if (t < 0) continue;
        if (at(x, y + 1) < 0) t = Math.min(t, 1);
        else if (at(x + 1, y) < 0) t = Math.min(t, 2);
        else if (hash2(x, y, 8) < 0.07) t = Math.max(1, t - 1); // nervaduras
        out[y * W + x] = t;
      }
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = out[y * W + x];
        if (t >= 0) px(c, x, y, gr[t]);
      }
  });
}

// Despeinada (Beaucarnea pliabilis): base bulbosa de corteza agrietada, tronco que se
// bifurca en tres ramas y melenas de hojas largas y finas que caen en arco
function makeDespeinada() {
  const W = 88;
  const H = 88;
  const GY = 80; // línea del suelo
  return sprite(W, H, 44, GY, (c) => {
    const bark = ["#4a3220", "#7a5232", "#a67a4a", "#caa070"];
    ellipse(c, 44, GY, 24, 4, "rgba(0,0,0,0.28)");

    // raicitas en el suelo
    rootCurve(c, 32, 77, 24, 78, 15, GY + 1, 3, 1, bark);
    rootCurve(c, 56, 77, 64, 78, 73, GY + 1, 3, 1, bark);

    // base bulbosa: ancha abajo, se angosta en el cuello
    const hwT = (y) => {
      const t = Math.min(1, Math.max(0, (y - 50) / 17));
      let w = 6 + 9.5 * t * t * (3 - 2 * t);
      if (y > 74) w -= Math.pow((y - 74) / 6, 2) * 2.5;
      return w;
    };
    const cxT = () => 44;
    for (let y = 44; y <= GY - 1; y++) {
      const cx = cxT(y);
      const hw = Math.round(hwT(y));
      const L = cx - hw;
      const R = cx + hw;
      px(c, L - 1, y, bark[0]);
      px(c, R + 1, y, bark[0]);
      for (let x = L; x <= R; x++) {
        const u = (x - L) / (2 * hw);
        let tone = u < 0.28 ? 3 : u < 0.62 ? 2 : 1;
        const n = vnoise(x, y, 4, 21);
        if (Math.abs(n - 0.5) < 0.035)
          tone = 0; // red de grietas
        else if (vnoise(x, y, 2, 22) > 0.78) tone = Math.min(3, tone + 1);
        else if (vnoise(x, y, 2, 23) < 0.2) tone = Math.max(1, tone - 1);
        if (x >= R - 1) tone = Math.min(tone, 1);
        px(c, x, y, bark[tone]);
      }
    }
    rect(c, 44 - 14, GY, 29, 1, bark[0]);
    // piedrita y pasto en la base
    ellipse(c, 33, GY - 1, 3, 2, "#2e2a26");
    ellipse(c, 33, GY - 2, 2, 1, "#7a756c");

    // ramas que salen del cuello
    limb(
      c,
      [
        [43, 52],
        [37, 45],
        [29, 38],
        [21, 32],
      ],
      5,
      3,
      bark,
    );
    limb(
      c,
      [
        [45, 52],
        [53, 46],
        [61, 40],
        [67, 35],
      ],
      5,
      3,
      bark,
    );
    limb(
      c,
      [
        [44, 54],
        [44, 44],
        [44, 32],
        [45, 21],
      ],
      5,
      3,
      bark,
    );

    // hojas largas y finas en arco: de atrás hacia adelante
    const greens = ["#1a4416", "#2f6a2a", "#4f9a3c", "#8cc65a"];
    const strand = (x0, y0, cx, cy, x1, y1, col, t) => {
      c.fillStyle = col;
      const n = 46;
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const u = 1 - k;
        c.fillRect(
          Math.round(u * u * x0 + 2 * u * k * cx + k * k * x1),
          Math.round(u * u * y0 + 2 * u * k * cy + k * k * y1),
          t,
          t,
        );
      }
    };
    const tuft = (hx, hy, n, reach, rise, droop, seed, amin, amax) => {
      const q = mulberry32(seed);
      const S = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI + (amin + q() * (amax - amin)) * Math.PI;
        const f = 0.45 + q() * 0.6;
        const dxs = Math.cos(a);
        S.push({
          x1: hx + dxs * reach * f,
          y1: hy + 4 + q() * droop * (0.25 + Math.abs(dxs) * 0.9),
          cx: hx + dxs * reach * f * 0.85,
          cy: hy - rise * (0.5 + q() * 0.9) * (1 - Math.abs(dxs) * 0.3),
          k: (q() * 4) | 0,
        });
      }
      disc(c, hx, hy, 3, greens[0]);
      // sombra oscura, cuerpo y luz por capas
      S.forEach((s) =>
        strand(hx, hy, s.cx, s.cy, s.x1, s.y1 + 1, greens[0], 1),
      );
      S.forEach((s) =>
        strand(hx, hy, s.cx, s.cy, s.x1, s.y1, greens[s.k === 0 ? 1 : s.k], 1),
      );
      S.forEach((s) => {
        if (s.k >= 2)
          strand(hx, hy, s.cx - 1, s.cy, s.x1 - 1, s.y1, greens[3], 1);
      });
      S.forEach((s) => {
        if (s.k === 3) px(c, s.x1, s.y1, "#d2f08a");
      });
    };
    tuft(45, 19, 54, 30, 22, 22, 53, 0.05, 0.95);
    tuft(21, 31, 38, 19, 14, 26, 51, 0.0, 0.7);
    tuft(67, 34, 38, 19, 14, 24, 52, 0.3, 1.0);

    // pastito en la base
    [
      [12, GY - 1],
      [20, GY],
      [66, GY - 1],
      [73, GY],
    ].forEach(([x, y]) => {
      pline(c, x, y, x - 2, y - 4, greens[2], 1);
      pline(c, x, y, x + 1, y - 5, greens[3], 1);
      pline(c, x, y, x + 3, y - 3, greens[1], 1);
    });
  });
}

// Makulís (Tabebuia rosea): tronco retorcido que se ramifica en una copa ancha y
// aireada, con hojas verdes y racimos de flores rosas concentrados arriba
function makeMakulis() {
  const W = 104;
  const H = 82;
  const GY = 76; // línea del suelo
  return sprite(W, H, 52, GY, (c) => {
    const wood = ["#3a2616", "#5e3d22", "#835a34", "#a87a4a"];
    const lf = ["#24501a", "#3a7326", "#5b9a37", "#86bd57"];
    const pk = ["#a63068", "#d9477f", "#f26ba3", "#ff9ec7", "#ffe0ee"];
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    // sombra y suelo con pasto y florecitas caídas
    ellipse(c, 52, GY, 34, 4, "rgba(0,0,0,0.26)");
    ellipse(c, 52, GY, 28, 2, "#5a4630");
    const rg = mulberry32(61);
    for (let i = 0; i < 26; i++) {
      const x = 26 + ((rg() * 52) | 0);
      const h = 2 + ((rg() * 4) | 0);
      pline(
        c,
        x,
        GY,
        x + (rg() < 0.5 ? -1 : 1),
        GY - h,
        lf[1 + ((rg() * 3) | 0)],
        1,
      );
    }
    for (let i = 0; i < 9; i++) {
      const x = 24 + ((rg() * 56) | 0);
      px(c, x, GY - 1 + ((rg() * 3) | 0), pk[2 + ((rg() * 3) | 0)]);
    }

    // tronco retorcido con raíces
    rootCurve(c, 44, 72, 36, 74, 28, GY, 3, 1, wood);
    rootCurve(c, 60, 72, 68, 74, 76, GY, 3, 1, wood);
    const hwT = (y) => 5 + (y > 64 ? (y - 64) * 0.45 : 0);
    const cxT = (y) => 52 + Math.round(Math.sin(y / 6) * 1.6);
    for (let y = 48; y <= GY; y++) {
      const cx = cxT(y);
      const hw = Math.round(hwT(y));
      const L = cx - hw;
      const R = cx + hw;
      px(c, L - 1, y, wood[0]);
      px(c, R + 1, y, wood[0]);
      for (let x = L; x <= R; x++) {
        const u = (x - L) / (2 * hw);
        let tone = u < 0.3 ? 3 : u < 0.65 ? 2 : 1;
        const h = hash2(Math.round(u * 12), Math.floor((y + x) / 4), 71);
        if (h < 0.25) tone -= 1;
        else if (h > 0.92) tone += 1;
        if (x >= R - 1) tone = Math.min(tone, 1);
        px(c, x, y, wood[Math.max(0, Math.min(3, tone))]);
      }
    }
    rect(
      c,
      52 - Math.round(hwT(GY)) - 1,
      GY + 1,
      Math.round(hwT(GY)) * 2 + 3,
      1,
      wood[0],
    );

    // ramificación recursiva: ramas que se abren y se afinan
    const q = mulberry32(88);
    const segs = [];
    const tips = [];
    const mids = [];
    const grow = (x, y, ang, len, t, d) => {
      const x1 = x + Math.sin(ang) * len;
      const y1 = y - Math.cos(ang) * len;
      segs.push([
        Math.round(x),
        Math.round(y),
        Math.round(x1),
        Math.round(y1),
        t,
      ]);
      if (d === 0) {
        tips.push([x1, y1]);
        return;
      }
      mids.push([x1, y1]);
      const n = d === 3 && q() < 0.4 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const side = n === 2 ? (i === 0 ? -1 : 1) : i - 1;
        let a = ang + side * (0.45 + q() * 0.35) + (q() - 0.5) * 0.3;
        a *= 0.92; // tiende a subir
        grow(x1, y1, a, len * (0.68 + q() * 0.12), Math.max(1, t - 1), d - 1);
      }
    };
    [-1.22, -0.84, -0.44, -0.08, 0.3, 0.7, 1.12].forEach((a, i) =>
      grow(52 + (i - 3) * 0.6, 51, a, 13.5 + q() * 3, 3, 3),
    );
    // contorno, sombra, cuerpo y luz por capas
    segs.forEach(
      ([a, b, x, y, t]) =>
        t > 1 && pline(c, a - 1, b, x - 1, y, wood[0], t + 2),
    );
    segs.forEach(([a, b, x, y, t]) =>
      pline(c, a, b, x, y, t > 1 ? wood[1] : wood[2], t),
    );
    segs.forEach(
      ([a, b, x, y, t]) => t > 1 && pline(c, a, b, x, y, wood[2], t - 1),
    );
    segs.forEach(
      ([a, b, x, y, t]) => t > 2 && pline(c, a, b, x, y, wood[3], 1),
    );

    // hojas verdes y flores a lo largo de las ramas finas
    const pts = [];
    tips.forEach(([x, y]) => pts.push([x, y, 9]));
    mids.forEach(([x, y]) => pts.push([x, y, 5]));
    const leaves = [];
    const flowers = [];
    pts.forEach(([x, y, n]) => {
      const f = Math.min(1, Math.max(0, (56 - y) / 44));
      for (let i = 0; i < n; i++) {
        const ex = Math.round(x + (q() - 0.5) * 13);
        const ey = Math.round(y + (q() - 0.5) * 8);
        if (!inb(ex, ey) || ey > 60) continue;
        if (q() < 0.12 + 0.85 * f) flowers.push([ex, ey]);
        else leaves.push([ex, ey]);
      }
      // hojitas de relleno bajo las flores
      for (let i = 0; i < 4; i++)
        leaves.push([
          Math.round(x + (q() - 0.5) * 12),
          Math.round(y + (q() - 0.3) * 8),
        ]);
    });
    leaves.forEach(([x, y]) => {
      if (!inb(x, y)) return;
      const t = 1 + ((q() * 3) | 0);
      rect(c, x, y, 2, 2, lf[t]);
      px(c, x + 1, y + 1, lf[0]);
      if (t === 3) px(c, x, y, lf[3]);
    });
    flowers.sort((a, b) => a[1] - b[1]);
    flowers.forEach(([x, y]) => {
      const t = 1 + ((q() * 3) | 0);
      px(c, x, y + 1, pk[0]);
      px(c, x - 1, y, pk[t]);
      px(c, x + 1, y, pk[t]);
      px(c, x, y - 1, pk[Math.min(4, t + 1)]);
      px(c, x, y, pk[4]);
    });
  });
}

// Chaká: tronco café retorcido con base acampanada que se ramifica en una copa
// ancha de hojas en forma de mano y frutos dorados colgando
function makeChaka() {
  const W = 112;
  const H = 78;
  const GY = 72; // línea del suelo
  return sprite(W, H, 56, GY, (c) => {
    const wood = ["#3d1a12", "#6e2f1f", "#9b4a2c", "#c46f48"];
    const lf = ["#1c4a16", "#2f7324", "#4f9f30", "#80c548", "#aadd62"];
    const fr = ["#5e4c0c", "#a58a18", "#d6bc2e", "#f4e66a"];
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    // sombra, suelo y pasto
    ellipse(c, 56, GY, 38, 4, "rgba(0,0,0,0.26)");
    ellipse(c, 56, GY, 32, 2, "#5a4630");
    const rg = mulberry32(91);
    for (let i = 0; i < 34; i++) {
      const x = 22 + ((rg() * 68) | 0);
      const h = 2 + ((rg() * 5) | 0);
      pline(
        c,
        x,
        GY,
        x + (rg() < 0.5 ? -2 : 2),
        GY - h,
        lf[1 + ((rg() * 3) | 0)],
        1,
      );
    }

    // raíces y tronco con giro y base acampanada
    rootCurve(c, 46, 66, 36, 69, 26, GY + 1, 4, 1, wood);
    rootCurve(c, 66, 66, 76, 69, 88, GY + 1, 4, 1, wood);
    rootCurve(c, 50, 69, 44, 71, 38, GY + 2, 2, 1, wood);
    rootCurve(c, 62, 69, 68, 71, 74, GY + 2, 2, 1, wood);
    const hwT = (y) => 6 + (y > 56 ? Math.pow((y - 56) / 16, 1.8) * 6 : 0);
    const cxT = (y) => 56 + Math.round(Math.sin(y / 8) * 2.2);
    for (let y = 44; y <= GY; y++) {
      const cx = cxT(y);
      const hw = Math.round(hwT(y));
      const L = cx - hw;
      const R = cx + hw;
      px(c, L - 1, y, wood[0]);
      px(c, R + 1, y, wood[0]);
      for (let x = L; x <= R; x++) {
        const u = (x - L) / (2 * hw);
        let tone = u < 0.3 ? 3 : u < 0.65 ? 2 : 1;
        const h = hash2(Math.round(u * 14), Math.floor((y + x) / 4), 17);
        if (h < 0.26) tone -= 1;
        else if (h > 0.92) tone += 1;
        if (x >= R - 1) tone = Math.min(tone, 1);
        px(c, x, y, wood[Math.max(0, Math.min(3, tone))]);
      }
    }
    rect(
      c,
      56 - Math.round(hwT(GY)) - 1,
      GY + 1,
      Math.round(hwT(GY)) * 2 + 3,
      1,
      wood[0],
    );

    // ramas recursivas, gruesas y abiertas
    const q = mulberry32(44);
    const segs = [];
    const tips = [];
    const mids = [];
    const grow = (x, y, ang, len, t, d) => {
      const x1 = x + Math.sin(ang) * len;
      const y1 = y - Math.cos(ang) * len;
      segs.push([
        Math.round(x),
        Math.round(y),
        Math.round(x1),
        Math.round(y1),
        t,
      ]);
      if (d === 0) {
        tips.push([x1, y1]);
        return;
      }
      mids.push([x1, y1]);
      for (let i = 0; i < 2; i++) {
        let a =
          ang + (i === 0 ? -1 : 1) * (0.4 + q() * 0.4) + (q() - 0.5) * 0.3;
        a *= 0.93;
        grow(x1, y1, a, len * (0.7 + q() * 0.1), Math.max(1, t - 1), d - 1);
      }
    };
    [-1.25, -0.85, -0.4, 0.05, 0.5, 0.92, 1.28].forEach((a, i) =>
      grow(56 + (i - 3) * 0.7, 48, a, 11.5 + q() * 2.5, 3, 3),
    );
    segs.forEach(
      ([a, b, x, y, t]) =>
        t > 1 && pline(c, a - 1, b, x - 1, y, wood[0], t + 2),
    );
    segs.forEach(([a, b, x, y, t]) =>
      pline(c, a, b, x, y, t > 1 ? wood[1] : wood[2], t),
    );
    segs.forEach(
      ([a, b, x, y, t]) => t > 1 && pline(c, a, b, x, y, wood[2], t - 1),
    );
    segs.forEach(
      ([a, b, x, y, t]) => t > 2 && pline(c, a, b, x, y, wood[3], 1),
    );

    // fondo oscuro del follaje detrás de las manos de hojas
    const pts = [];
    tips.forEach(([x, y]) => pts.push([x, y, 1]));
    mids.forEach(([x, y]) => q() < 0.55 && pts.push([x, y, 0.6]));
    pts.forEach(([x, y, k]) => {
      const rx = Math.round(5 * k + 1);
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -rx; dx <= rx; dx++) {
          if ((dx * dx) / (rx * rx) + (dy * dy) / 12 > 1 + (q() - 0.5) * 0.4)
            continue;
          const X = Math.round(x + dx);
          const Y = Math.round(y + dy);
          if (inb(X, Y) && Y < 62) px(c, X, Y, q() < 0.2 ? lf[1] : lf[0]);
        }
    });

    // hojas en forma de mano: varios foliolos que salen de un punto
    const hands = [];
    pts.forEach(([x, y, k]) => {
      const n = k === 1 ? 2 : 1;
      for (let i = 0; i < n; i++)
        hands.push([
          Math.round(x + (q() - 0.5) * 9),
          Math.round(y + (q() - 0.5) * 4 - 1),
          k === 1 ? 8 + ((q() * 3) | 0) : 6 + ((q() * 2) | 0),
        ]);
    });
    hands.sort((a, b) => a[1] - b[1]);
    hands.forEach(([x, y, s]) => {
      if (!inb(x, y) || y > 60) return;
      const base = 2 + ((q() * 2) | 0);
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI + 0.1 + (i / 7) * (Math.PI - 0.2);
        const L = s * (0.7 + 0.4 * Math.sin((i / 7) * Math.PI));
        const ex = Math.round(x + Math.cos(a) * L);
        const ey = Math.round(y + Math.sin(a) * L * 0.75 + 2);
        pline(c, x, y, ex, ey, lf[1], 2);
        pline(c, x, y, ex, ey, lf[Math.min(4, base + (i < 3 ? 1 : 0))], 1);
        px(c, ex, ey, lf[0]);
      }
      px(c, x, y, lf[0]);
    });

    // frutos dorados colgando de tallitos
    const cand = pts.filter(([x, y]) => y > 14 && y < 56);
    for (let i = 0; i < 24 && cand.length; i++) {
      const [x, y] = cand[(q() * cand.length) | 0];
      const fx = Math.round(x + (q() - 0.5) * 12);
      const fy = Math.round(y + 5 + q() * 5);
      if (!inb(fx, fy) || fy > 54) continue;
      const rad = q() < 0.4 ? 3 : 2;
      pline(c, fx, fy - rad - 3, fx, fy - rad, fr[1], 1);
      disc(c, fx, fy, rad, fr[0]);
      disc(c, fx, fy, rad - 1, fr[2]);
      px(c, fx - 1, fy - 1, fr[3]);
      if (rad === 3) px(c, fx, fy - 2, fr[3]);
      px(c, fx + 1, fy + 1, fr[1]);
    }
  });
}

/* ---------- Fauna: tolok y mono aullador ---------- */

// Tolok (iguana espinosa de cola larga); "up" = cabeza levantada
function makeTolok(up) {
  return sprite(44, 22, 22, 18, (c) => {
    ellipse(c, 24, 18, 14, 3, "rgba(0,0,0,0.22)");
    const body = "#858b63";
    const dark = "#3b3f2a";
    // cola larga con bandas oscuras
    for (let i = 0; i <= 17; i++) {
      const x = 17 - i;
      const y = 13 + Math.round(Math.sin(i / 3) * 1.5);
      rect(c, x, y, 1, 2, i % 4 < 2 ? "#6e7552" : dark);
    }
    // patas
    rect(c, 20, 15, 1, 3, "#6e7552");
    rect(c, 22, 16, 1, 2, "#6e7552");
    rect(c, 27, 15, 1, up ? 4 : 3, "#6e7552");
    rect(c, 29, 16, 1, 2, "#6e7552");
    // cuerpo, vientre y cresta de espinas
    ellipse(c, 24, 13, 8, 3, body);
    ellipse(c, 24, 15, 6, 1, "#b5b58a");
    for (let x = 18; x <= 29; x += 2) px(c, x, 9, "#5a6040");
    for (let k = 0; k < 5; k++) px(c, 20 + k * 2, 12, dark);
    // cabeza
    const hy = up ? -3 : 0;
    if (up) rect(c, 31, 10, 3, 4, body);
    rect(c, 32, 10 + hy, 5, 4, body);
    rect(c, 37, 11 + hy, 1, 2, body);
    px(c, 35, 11 + hy, "#111111");
    px(c, 34, 14 + hy, "#b8b58a");
    px(c, 33, 10 + hy, "#a2a87c");
  });
}

// Mono aullador negro (Alouatta pigra); "howl" = cabeza atrás y boca abierta
function makeHowler(howl) {
  return sprite(34, 36, 17, 33, (c) => {
    ellipse(c, 17, 33, 9, 2, "rgba(0,0,0,0.25)");
    const fur = "#1b1b1b";
    const hi = "#363636";
    // cola prensil enroscada
    pline(c, 23, 28, 29, 24, fur, 2);
    pline(c, 29, 24, 30, 16, fur, 2);
    pline(c, 30, 16, 27, 12, fur, 2);
    px(c, 26, 12, hi);
    // cuerpo sentado
    ellipse(c, 16, 24, 6, 7, fur);
    ellipse(c, 14, 22, 3, 4, hi);
    ellipse(c, 12, 31, 3, 2, "#111111");
    ellipse(c, 20, 31, 3, 2, "#111111");
    // brazos
    pline(c, 11, 21, 10, 28, fur, 2);
    pline(c, 21, 21, 22, 28, fur, 2);
    // cabeza con barba
    const hy = howl ? -1 : 0;
    disc(c, 16, 12 + hy, 5, fur);
    ellipse(c, 16, 17 + hy, 4, 3, "#111111");
    rect(c, 14, 11 + hy, 5, 3, "#2e2e2e");
    px(c, 14, 11 + hy, "#e6d9a8");
    px(c, 18, 11 + hy, "#e6d9a8");
    if (howl) rect(c, 15, 14 + hy, 3, 3, "#6b1f1f");
    px(c, 13, 8 + hy, hi);
  });
}

/* ---------- Huaychivo: hombre-bestia hechicero ---------- */
// Sprite tomado de la imagen de referencia (55x51 px). Cada letra es un color de la
// paleta y "." es transparente. Se dibuja al tamaño final con HUAYCHIVO_SCALE.
const HUAYCHIVO_PAL = {
  0: "#ccc9c7",
  1: "#b4b3b1",
  2: "#e8806e",
  3: "#aaaaaa",
  4: "#a2a2a2",
  5: "#ad9d8f",
  6: "#999999",
  7: "#b8605a",
  8: "#919191",
  9: "#b0584c",
  a: "#a85a5a",
  b: "#888888",
  c: "#c4474a",
  d: "#808080",
};
const HUAYCHIVO_ROWS = [
  "......................188401d.....d81d.................",
  ".....................d186b381.....6441.................",
  ".............d......db88dd6611....ad81.................",
  "..............dd..d188.....d6b8.0..da186d..............",
  "................d88dd.....dd616dd0d614.................",
  ".................dd......dddd818ddd614.................",
  "........................d8dbb86168d83d.................",
  "......................dd68dddb8d866ba..........dd......",
  "......4dd6d0.......b088d8bbdb688386386.......d8880.....",
  "......11.8d.........ddd6bddb368444b384........dd80.....",
  ".....d8ddd.........d86dd31dddbdd16414dd61d....8d3d.....",
  ".....b668...1....338b88dbab7d6bcb466cabd0..d.48d31.....",
  ".....66db...d...ddd8d6888dd8d846db4b8d.6...d..b4d0.....",
  ".....ddd8d..d...ddd6886dd4d86d88bb11ddd2....6d8d1......",
  ".....b388b861...db3848888d6db8b88431d8d.1...d8d8b......",
  ".....bb68484....d463618688ddd8b831d68bd......863d......",
  "......6566d.....88666b888dd4d4d6da00d8d......846.......",
  "......d848.....48868688b8dd1d4bb7b5dd8dd....d8b8.......",
  ".......d88d.....dddddddd84dd88d6d002dd99....d08d.......",
  "........bd6d...646d8dddd84d60dd88ddddbd4d.d64d4d.......",
  "........6488d.d46b6dddd8d8bb8d6d663dad8886468db........",
  "........dd86dd83866dd8dd8dddd6dd684.dd88d448ddd........",
  "........dd8b84bd4bdddddb8868b6add68.dd88b4bd8.4d.......",
  "........d.db643dbd..d8d8db6b6d1..dd.dddd8888d.d........",
  "........d.8b864ddd..d88dd88b8d..ddd.d..dddd8d.0d.......",
  "........d.ddd88bd..bad86d8dd68d..b......88.d..d........",
  ".............d8d..dd6d99ddddd9dd.......................",
  "..............d0..b8bdddd999bdbddb.....................",
  "..............8..dddddda4ddd4ddddd.....................",
  "................d88dbddddaaa9ddd8b888..................",
  "...............dd888bddd949a6addb8888d.................",
  "..............ddd88888dd99dd1cddd8dd66d................",
  "..............d8d888b8dd9918dcdd8bdd338d...............",
  ".............b8d8b8ddbdd9c16d9dddb866336...............",
  "............dd8688bddddadcd1d9ddddb8438bd..............",
  ".............d8d88d8ddaadcc9aadddd86b6333..............",
  "............dd6b88bddbaad9d9cabd.1dd88648..............",
  "..........dd88336d8dddaad9.dca0..088b88bd..............",
  "..........88644468dba..b.9ddca..db8d8ddd...............",
  "..........8bd868bdaaa....dd.9a.ddbbd...................",
  "..........8bdd66ddaaa....dd.97..bddd...................",
  ".........d8bdddd.aa8d.......9d...db8...................",
  ".........8d8.....d.8........dd...0866..................",
  "........648d................d.....db36.................",
  "........848d................d.....dd63d................",
  ".......d668d......................d8b688d..............",
  "......8db6dd........................dd611..............",
  "......d884db.........................863db.............",
  "......68d2dd.........................88512.............",
  "......63dadd...........................................",
  "......bd.d.............................................",
];
// Casillas de los ojos (se encienden en rojo al preparar el golpe)
const HUAYCHIVO_EYES = [
  [26, 11],
  [27, 11],
  [31, 11],
  [32, 11],
];

// Colorea cada casilla: el pelaje usa la luminosidad de la imagen original como
// sombreado sobre una rampa marrón; el taparrabo rojo se conserva y se aviva; y hay
// acentos (garras de hueso, brazaletes dorados, collar de jade, cinturón).
const HUAYCHIVO_FUR = [
  "#5a382a",
  "#7a4c33",
  "#9a6840",
  "#b98450",
  "#d4a468",
  "#ecc88e",
];
const HUAYCHIVO_RED = ["#9c1f1f", "#c9302c", "#e8463a", "#ff7160"];
function huaychivoColor(x, y, ch) {
  const base = HUAYCHIVO_PAL[ch];
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const reddish = r - b > 18;
  const t = Math.max(0, Math.min(1, (g - 0x7c) / (0xd0 - 0x7c)));
  const ramp = (arr) =>
    arr[Math.min(arr.length - 1, Math.floor(t * arr.length))];

  // Taparrabo (región roja del centro/bajo)
  if (reddish || (y >= 25 && y <= 41 && x >= 21 && x <= 35 && t < 0.55)) {
    if (y >= 25) return ramp(HUAYCHIVO_RED);
  }
  // Garras: puntas de las manos en alto
  if (y <= 17 && (x <= 9 || x >= 45)) return t > 0.35 ? "#f1e6c8" : "#bfae86";
  // Brazaletes dorados en los antebrazos
  if ((y === 18 || y === 19) && ((x >= 6 && x <= 12) || (x >= 42 && x <= 48)))
    return t > 0.5 ? "#ffd75e" : "#d9a521";
  // Collar de jade sobre el pecho
  if (y >= 19 && y <= 21 && x >= 22 && x <= 36)
    return t > 0.5 ? "#5fe0b0" : "#1f9c78";
  // Cinturón dorado sobre el taparrabo
  if (y === 25 || y === 26)
    if (x >= 19 && x <= 38) return t > 0.5 ? "#ffd75e" : "#c98f1a";
  // Hocico y cara: un poco más claros para que se lea el rostro
  if (y >= 5 && y <= 13 && x >= 21 && x <= 37)
    return HUAYCHIVO_FUR[Math.min(5, Math.floor(t * 5) + 1)];
  // Pelaje
  return ramp(HUAYCHIVO_FUR);
}

// Huaychivo con animación: leg 0 = parado, 1 / 2 = pasos (levanta una pata y
// cruza los brazos), 3 = erguido entre pasos, 4 = parado respirando;
// atk 0 = normal, 1 = preparando el golpe (se estira hacia arriba, ojos encendidos),
// 2 = golpeando (se agacha sobre ti, con destellos en las garras).
// Es casi simétrico (mira al frente), así que flip casi no cambia su aspecto.
function makeHuaychivo(leg, atk) {
  const SW = 55;
  const SH = 51;
  const PX = 4; // margen izquierdo en el lienzo
  const PY = 8; // margen superior (el cuerpo se estira hacia arriba al preparar el golpe)
  const SPLIT = 40; // fila de la cadera: de aquí hacia abajo son las patas
  const MID = 27; // columna central que separa pata izquierda y derecha
  const CW = 64;
  const CH = 62;
  return sprite(CW, CH, 32, PY + SH, (c) => {
    const OUT = "#1c1c22";
    const buf = Array.from({ length: CH }, () => Array(CW).fill(null));
    const eyes = new Set(HUAYCHIVO_EYES.map(([x, y]) => x + "," + y));
    const colorAt = (x, y) => {
      const ch = HUAYCHIVO_ROWS[y][x];
      if (ch === ".") return null;
      if (eyes.has(x + "," + y)) return atk > 0 ? "#ff1a1a" : "#e8362f";
      return huaychivoColor(x, y, ch);
    };

    // ---- Pose según el cuadro de animación ----
    // leg: 0 = parado, 1 / 2 = paso (levanta pata izquierda / derecha),
    // 3 = cuerpo erguido entre pasos, 4 = parado (respiración, brazos algo abiertos)
    // Ángulos de los brazos: negativo en el izquierdo / positivo en el derecho = abrir
    let aL = 0;
    let aR = 0;
    let liftL = 0;
    let liftR = 0;
    let bodyY = 0; // positivo = se agacha, negativo = se estira
    let lean = 0; // balanceo lateral del torso
    if (leg === 1 || leg === 2) {
      const s = leg === 1 ? 1 : -1;
      liftL = leg === 1 ? 7 : 0;
      liftR = leg === 2 ? 7 : 0;
      aL = -0.42 * s; // brazos que se cruzan al caminar
      aR = -0.42 * s;
      bodyY = 2;
      lean = -s * 2;
    } else if (leg === 3) {
      bodyY = -2;
    } else if (leg === 4) {
      aL = -0.14;
      aR = 0.14;
      bodyY = -1;
    }
    if (atk === 1) {
      aL = -0.6;
      aR = 0.6;
    } else if (atk === 2) {
      aL = 0.95;
      aR = -0.95;
    }

    // Patas: la que da el paso se levanta bastante y se abre un poco
    for (let y = SPLIT; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const col = colorAt(x, y);
        if (!col) continue;
        const left = x < MID;
        const lift = left ? liftL : liftR;
        const k = lift ? (y - SPLIT) / (SH - SPLIT) : 0; // más desplazada la punta
        const dx = Math.round(k * 2 * (left ? -1 : 1) * (lift ? 1 : 0));
        const yy = PY + y - Math.round(lift * (0.4 + 0.6 * k));
        if (yy >= 0) buf[yy][PX + x + dx] = col;
      }
    }

    // Torso y cabeza: al preparar el golpe se estiran hacia arriba y al golpear se
    // agachan; el desplazamiento baja hasta 0 en la cadera para no abrir huecos
    const top = (atk === 1 ? -3 : atk === 2 ? 3 : 0) + bodyY;
    const dyOf = (y) => Math.round(top * Math.max(0, 1 - y / SPLIT));
    const dxOf = (y) => Math.round(lean * Math.max(0, 1 - y / SPLIT));
    const ARM_Y = 26;
    const isArm = (x, y) => y <= ARM_Y && (x <= 13 || x >= 42);
    for (let y = 0; y < SPLIT; y++) {
      const y0 = PY + y + dyOf(y);
      const y1 = PY + y + 1 + dyOf(y + 1);
      for (let yy = y0; yy <= Math.max(y0, y1 - 1); yy++) {
        for (let x = 0; x < SW; x++) {
          if (isArm(x, y)) continue; // los brazos se dibujan aparte (rotados)
          const col = colorAt(x, y);
          if (col) buf[yy][PX + x + dxOf(y)] = col;
        }
      }
    }

    // Brazos: se giran alrededor del hombro (mapeo inverso para no dejar huecos)
    const armDy = dyOf(22);
    const armDx = dxOf(22);
    const drawArm = (x0, x1, pvx, pvy, ang) => {
      const cs = Math.cos(ang);
      const sn = Math.sin(ang);
      for (let dy = -6; dy < SH; dy++) {
        for (let dx = x0 - 14; dx <= x1 + 14; dx++) {
          // destino (dx, dy) -> origen girando -ang alrededor del hombro
          const rx = dx - pvx;
          const ry = dy - pvy;
          const sx = Math.round(pvx + rx * cs + ry * sn);
          const sy = Math.round(pvy - rx * sn + ry * cs);
          if (sx < x0 || sx > x1 || sy < 0 || sy > ARM_Y) continue;
          if (!isArm(sx, sy)) continue;
          const col = colorAt(sx, sy);
          if (!col) continue;
          const X = PX + dx + armDx;
          const Y = PY + dy + armDy;
          if (X >= 0 && X < CW && Y >= 0 && Y < CH) buf[Y][X] = col;
        }
      }
    };
    drawArm(0, 13, 13, 22, aL);
    drawArm(42, SW - 1, 42, 22, aR);

    // Destellos en las garras al golpear
    if (atk === 2) {
      const spark = (x, y, pvx, ang) => {
        const rx = x - pvx;
        const ry = y - 22;
        const X = Math.round(pvx + rx * Math.cos(ang) - ry * Math.sin(ang));
        const Y = Math.round(22 + rx * Math.sin(ang) + ry * Math.cos(ang));
        const bx = PX + X + armDx;
        const by = PY + Y + armDy;
        if (bx >= 0 && bx < CW && by >= 0 && by < CH) buf[by][bx] = "#ffffff";
      };
      [
        [4, 14],
        [2, 16],
        [8, 12],
      ].forEach(([x, y]) => spark(x, y, 13, aL));
      [
        [52, 13],
        [53, 15],
        [48, 11],
      ].forEach(([x, y]) => spark(x, y, 42, aR));
    }

    // Contorno oscuro de 1 px (como el resto de los sprites)
    const filled = (x, y) =>
      y >= 0 && y < CH && x >= 0 && x < CW && buf[y][x] !== null;
    const edge = [];
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        if (filled(x, y)) continue;
        if (
          filled(x + 1, y) ||
          filled(x - 1, y) ||
          filled(x, y + 1) ||
          filled(x, y - 1)
        )
          edge.push([x, y]);
      }
    }

    ellipse(c, 32, PY + SH - 1, 22, 3, "rgba(0,0,0,0.30)");
    edge.forEach(([x, y]) => px(c, x, y, OUT));
    for (let y = 0; y < CH; y++)
      for (let x = 0; x < CW; x++) if (buf[y][x]) px(c, x, y, buf[y][x]);
  });
}

function makeBush(seed, dry) {
  const r = mulberry32(seed);
  const cols = dry
    ? ["#4d6a1f", "#6b8f2a", "#9bbc4a"]
    : ["#1d6a30", "#2f9a3c", "#62c64c"];

  return sprite(28, 18, 14, 15, (c) => {
    ellipse(c, 14, 15, 9, 3, "rgba(0,0,0,0.22)");
    const pts = [
      [9, 10, 6],
      [18, 10, 6],
      [14, 7, 7],
    ];
    pts.forEach(([x, y, rr]) =>
      disc(c, x + Math.round((r() - 0.5) * 2), y, rr, cols[0]),
    );
    pts.forEach(([x, y, rr]) => disc(c, x - 1, y - 1, rr - 2, cols[1]));
    disc(c, 12, 5, 2, cols[2]);
    px(c, 18, 7, cols[2]);
  });
}

function makeRock() {
  return sprite(24, 17, 12, 15, (c) => {
    // Sombra en el suelo
    ellipse(c, 12, 15, 10, 2, "rgba(0,0,0,0.28)");

    // Silueta irregular de la roca
    const rows = [
      [9, 6, 6, "#555852"],
      [6, 7, 12, "#666960"],
      [4, 8, 16, "#777a70"],
      [3, 9, 19, "#85877c"],
      [2, 10, 20, "#77796f"],
      [2, 11, 21, "#686b62"],
      [3, 12, 19, "#5d6058"],
      [4, 13, 17, "#50534c"],
      [6, 14, 13, "#454941"],
    ];

    rows.forEach(([x, y, w, color]) => {
      rect(c, x, y, w, 1, color);
    });

    // Superficie superior iluminada
    pline(c, 7, 6, 10, 3, "#b8b9aa", 2);
    pline(c, 10, 3, 14, 2, "#c8c8b8", 2);
    pline(c, 14, 2, 17, 4, "#aeb0a1", 2);

    px(c, 6, 7, "#a5a79a");
    px(c, 9, 4, "#d0d0c1");
    px(c, 13, 3, "#d4d2c2");
    px(c, 16, 5, "#a5a79a");

    // Facetas de la superficie
    pline(c, 5, 8, 8, 7, "#929589", 2);
    pline(c, 8, 7, 10, 10, "#a5a697", 2);
    pline(c, 10, 10, 8, 13, "#696d63", 2);

    pline(c, 14, 5, 17, 7, "#777a70", 2);
    pline(c, 17, 7, 16, 11, "#555950", 2);
    pline(c, 12, 8, 14, 11, "#62665d", 2);

    // Grietas y pequeñas fracturas
    pline(c, 10, 5, 9, 8, "#666a61", 1);
    pline(c, 14, 6, 13, 9, "#4d514a", 1);

    px(c, 7, 10, "#c0c0b1");
    px(c, 11, 12, "#777b70");
    px(c, 18, 9, "#41463f");
    px(c, 5, 12, "#555950");
    px(c, 15, 13, "#3f443d");
    px(c, 19, 11, "#4a4e46");
  });
}

// Tronco caído. Se dibuja por rebanadas de una casilla (así el orden de
// profundidad con el jugador funciona bien en toda su longitud).
// La rebanada corre hacia +gx (abajo-derecha en pantalla); el tronco que corre
// hacia +gy usa el mismo sprite espejado. cap = tapa visible en el extremo final.
function makeLogSlice(cap, seed) {
  const G = 18; // fila del suelo (centro de la casilla)
  const R = 6; // radio visual del tronco
  return sprite(20, 28, 8, G, (c) => {
    // Sombra en el suelo
    for (let X = 0; X < 20; X++) {
      const xr = X - 8 + 0.5;
      if (xr > 9) continue;
      rect(c, X, Math.round(G + xr / 2) - 1, 1, 5, "rgba(0,0,0,0.22)");
    }
    // Cuerpo cilíndrico: banda diagonal con pendiente 1/2 (como el borde de una casilla)
    for (let X = 0; X < 16; X++) {
      const xr = X - 8 + 0.5;
      const yc = -R + xr / 2;
      const y0 = Math.round(G + yc - R);
      const y1 = Math.round(G + yc + R);
      for (let Y = y0; Y <= y1; Y++) {
        const f = (Y - y0) / (y1 - y0);
        // luz desde arriba: brillo arriba, sombra abajo (da volumen redondo)
        const col =
          f < 0.1
            ? "#8a5a30"
            : f < 0.28
              ? "#c9915a"
              : f < 0.45
                ? "#ad7440"
                : f < 0.65
                  ? "#8f5c30"
                  : f < 0.85
                    ? "#6f4423"
                    : f < 0.95
                      ? "#52301a"
                      : "#38200e";
        px(c, X, Y, col);
      }
      // Vetas de la corteza (siguen la dirección del tronco)
      const h = (X * 7 + seed * 5) % 9;
      if (h === 0 || h === 4) {
        px(c, X, y0 + 4, "#5a3418");
        px(c, X, y0 + 5, "#5a3418");
      }
      if (h === 2) px(c, X, y0 + 7, "#c9915a");
      if (h === 6) px(c, X, y0 + 9, "#4a2b12");
      // Un nudo en una de las variantes
      if (seed === 2 && (X === 6 || X === 7)) {
        px(c, X, y0 + 5, "#3b2410");
        px(c, X, y0 + 6, "#5a3418");
      }
    }
    // Tapa cortada (anillos de la madera) en el extremo que mira al jugador.
    // Es un círculo visto en perspectiva: eje vertical + eje inclinado hacia +gy.
    if (cap) {
      const cx = 15;
      const cy = G - R + 4;
      for (let Y = cy - R - 1; Y <= cy + R + 1; Y++)
        for (let X = cx - 4; X <= cx + 4; X++) {
          const dx = X - cx;
          const dy = Y - cy;
          const al = -dx / 3; // componente a lo largo del eje inclinado (-3, +1.5)
          const be = -(dy - al * 1.5) / R;
          const r = Math.hypot(al, be);
          if (r > 1) continue;
          px(
            c,
            X,
            Y,
            r > 0.82
              ? "#5a3418"
              : r > 0.62
                ? "#c9915a"
                : r > 0.5
                  ? "#9c6a3a"
                  : r > 0.28
                    ? "#dcae72"
                    : "#a8743a",
          );
        }
    }
  });
}

function makeFlamingo(down) {
  return sprite(20, 26, 8, 24, (c) => {
    ellipse(c, 8, 24, 6, 2, "rgba(255,255,255,0.35)");
    pline(c, 7, 17, 7, 24, "#e8567f", 1);
    pline(c, 10, 16, 10, 23, "#e8567f", 1);
    px(c, 6, 24, "#e8567f");
    ellipse(c, 9, 14, 5, 3, "#ff7aa8");
    ellipse(c, 8, 15, 3, 1, "#ffb4cf");
    ellipse(c, 7, 13, 3, 2, "#e84a7f");
    px(c, 3, 14, "#e84a7f");
    px(c, 4, 15, "#e84a7f");

    if (!down) {
      pline(c, 12, 12, 14, 8, "#ff7aa8", 2);
      pline(c, 14, 8, 13, 5, "#ff7aa8", 2);
      rect(c, 12, 3, 3, 3, "#ff7aa8");
      px(c, 15, 4, "#f6e7c8");
      px(c, 16, 5, "#222222");
      px(c, 13, 4, "#222222");
    } else {
      pline(c, 12, 12, 15, 15, "#ff7aa8", 2);
      pline(c, 15, 15, 14, 19, "#ff7aa8", 2);
      rect(c, 13, 19, 3, 3, "#ff7aa8");
      px(c, 16, 21, "#f6e7c8");
      px(c, 17, 22, "#222222");
      px(c, 14, 20, "#222222");
    }
  });
}

// Flamenco en vuelo: cuello estirado, patas hacia atrás y alas que aletean
// frame 0 = alas arriba, 1 = alas a medio camino, 2 = alas abajo
function makeFlamingoFly(frame) {
  return sprite(36, 30, 18, 14, (c) => {
    const PINK = "#ff7aa8";
    const DARK = "#e84a7f";
    const TIP = "#2a1b1b";

    // Ala lejana (más oscura) y ala cercana
    const wing = (ox, oy, main, edge) => {
      if (frame === 0) {
        pline(c, 16 + ox, 12 + oy, 12 + ox, 2 + oy, main, 4);
        pline(c, 19 + ox, 12 + oy, 16 + ox, 2 + oy, edge, 2);
        pline(c, 13 + ox, 5 + oy, 12 + ox, 1 + oy, TIP, 2);
      } else if (frame === 1) {
        pline(c, 17 + ox, 12 + oy, 8 + ox, 8 + oy, main, 4);
        pline(c, 18 + ox, 13 + oy, 10 + ox, 10 + oy, edge, 2);
        pline(c, 9 + ox, 8 + oy, 5 + ox, 7 + oy, TIP, 2);
      } else {
        pline(c, 16 + ox, 15 + oy, 12 + ox, 25 + oy, main, 4);
        pline(c, 19 + ox, 15 + oy, 15 + ox, 25 + oy, edge, 2);
        pline(c, 13 + ox, 22 + oy, 12 + ox, 27 + oy, TIP, 2);
      }
    };
    wing(3, -1, "#d93d73", "#b8325f");
    wing(0, 0, PINK, DARK);

    // Patas largas estiradas hacia atrás
    pline(c, 10, 15, 0, 16, "#e8567f", 1);
    pline(c, 11, 16, 2, 18, "#e8567f", 1);

    // Cuerpo, cuello estirado y cabeza
    ellipse(c, 17, 14, 7, 3, PINK);
    ellipse(c, 16, 15, 4, 1, "#ffb4cf");
    px(c, 9, 13, DARK);
    px(c, 8, 14, DARK);
    pline(c, 22, 13, 30, 11, PINK, 2);
    rect(c, 30, 9, 3, 3, PINK);
    px(c, 33, 11, "#f6e7c8");
    px(c, 34, 12, "#222222");
    px(c, 31, 10, "#222222");
  });
}

// Alux: duendecillo maya de piel morena, diadema verde con hoja, orejas puntiagudas,
// taparrabos crema y un garrote. Mira a la derecha (se voltea con flip).
// leg: 0 = parado, 1 / 2 = pasos de baile; atk: 0 = normal, 1 = preparando el golpe
// (garrote arriba), 2 = golpeando (garrote abajo)
function makeAlux(leg, atk) {
  return sprite(28, 32, 14, 30, (c) => {
    const OUT = "#1a0c10";
    const SK = "#c0703c";
    const SK_D = "#8f4b27";
    const SK_L = "#e39a5c";
    const HAIR = "#2b1a12";
    const BAND = "#2f7a45";
    const BAND_D = "#1d5230";
    const LEAF = "#5cc06a";
    const LEAF_L = "#9be8a0";
    const CLOTH = "#efe3c6";
    const CLOTH_D = "#c4b18a";
    const TRIM = "#7a4a2a";
    const STRIPE = "#b5472f";
    const WOOD = "#5a3a20";
    const WOOD_L = "#8a5a2e";

    ellipse(c, 14, 30, 8, 2, "rgba(0,0,0,0.28)");

    // Brazo trasero (doblado hacia arriba, como en pose de baile)
    const hy = leg === 1 ? 11 : leg === 2 ? 16 : 14;
    pline(c, 9, 18, 4, hy + 2, OUT, 4);
    pline(c, 9, 18, 4, hy + 2, SK_D, 2);
    rect(c, 2, hy - 2, 5, 4, OUT);
    rect(c, 3, hy - 1, 3, 2, SK_L);

    // Piernas cortas y sandalias (una se levanta al caminar)
    const lift = [leg === 1 ? 2 : 0, leg === 2 ? 2 : 0];
    [9, 15].forEach((x, i) => {
      const L = lift[i];
      rect(c, x, 26, 5, 4 - L, OUT);
      rect(c, x + 1, 26, 3, 3 - L, SK);
      rect(c, x + 3, 26, 1, 3 - L, SK_D);
      rect(c, x, 29 - L, 6, 1, OUT);
      rect(c, x + 1, 28 - L, 4, 1, TRIM);
    });

    // Torso desnudo
    rect(c, 8, 15, 12, 8, OUT);
    rect(c, 9, 15, 10, 7, SK);
    rect(c, 9, 16, 2, 4, SK_L);
    rect(c, 17, 16, 2, 5, SK_D);
    pline(c, 11, 19, 13, 19, SK_D, 1);
    pline(c, 15, 19, 17, 19, SK_D, 1);
    px(c, 14, 21, SK_D);

    // Cinturón y taparrabos crema con greca
    rect(c, 9, 21, 10, 1, TRIM);
    rect(c, 8, 22, 12, 5, OUT);
    rect(c, 9, 22, 10, 4, CLOTH);
    rect(c, 16, 22, 3, 4, CLOTH_D);
    for (let x = 10; x <= 17; x += 2) px(c, x, 23, STRIPE);
    rect(c, 9, 24, 10, 1, TRIM);

    // Brazo delantero con el garrote
    const club = (x, y, w, h) => {
      rect(c, x - 1, y - 1, w + 2, h + 2, OUT);
      rect(c, x, y, w, h, WOOD);
      rect(c, x, y, 1, h, WOOD_L);
      px(c, x + w - 1, y + 1, OUT);
      px(c, x + w - 2, y + 3, OUT);
    };
    if (atk === 1) {
      pline(c, 19, 17, 23, 10, OUT, 4);
      pline(c, 20, 17, 24, 10, SK, 2);
      club(23, 0, 4, 9);
    } else if (atk === 2) {
      pline(c, 19, 17, 24, 23, OUT, 4);
      pline(c, 20, 17, 25, 23, SK, 2);
      club(22, 22, 6, 4);
      px(c, 27, 21, "#ffffff");
      px(c, 26, 27, "#ffffff");
    } else {
      rect(c, 19, 16, 3, 7, OUT);
      rect(c, 20, 16, 2, 5, SK);
      rect(c, 20, 20, 2, 2, SK_L);
      club(22, 14, 3, 9);
    }

    // Orejas puntiagudas
    pline(c, 9, 11, 2, 6, OUT, 4);
    pline(c, 9, 11, 3, 7, SK, 2);
    px(c, 2, 5, OUT);
    pline(c, 20, 11, 24, 8, OUT, 2);
    pline(c, 20, 11, 23, 9, SK_D, 1);

    // Cabeza grande
    ellipse(c, 14, 9, 7, 6, OUT);
    ellipse(c, 14, 9, 6, 5, SK);
    ellipse(c, 12, 7, 3, 1, SK_L);

    // Pelo oscuro y diadema verde con hoja
    ellipse(c, 14, 5, 5, 1, HAIR);
    px(c, 13, 3, HAIR);
    px(c, 16, 3, HAIR);
    rect(c, 8, 7, 13, 2, BAND);
    rect(c, 8, 8, 13, 1, BAND_D);
    rect(c, 9, 7, 3, 1, "#46a05e");
    pline(c, 9, 7, 7, 3, OUT, 3);
    pline(c, 9, 7, 7, 3, LEAF, 2);
    pline(c, 9, 6, 8, 4, LEAF_L, 1);
    pline(c, 8, 9, 7, 12, BAND, 1);
    px(c, 7, 13, LEAF);

    // Cara: ojos amarillos, cejas pícaras, nariz grande y sonrisa con colmillo
    rect(c, 11, 9, 2, 2, "#ffd23a");
    px(c, 12, 10, OUT);
    rect(c, 17, 9, 2, 2, "#ffd23a");
    px(c, 18, 10, OUT);
    pline(c, 10, 8, 13, 9, OUT, 1);
    pline(c, 20, 8, 16, 9, OUT, 1);
    rect(c, 20, 10, 3, 3, OUT);
    rect(c, 20, 10, 2, 2, SK_L);
    if (atk > 0) {
      rect(c, 13, 13, 5, 2, OUT);
      px(c, 13, 13, "#ffffff");
      px(c, 17, 13, "#ffffff");
    } else {
      pline(c, 13, 13, 17, 13, OUT, 1);
      px(c, 18, 12, OUT);
      px(c, 16, 14, "#ffffff");
    }
  });
}

// Kaskabal: espíritu del monte, casi tan alto como un árbol. Cuerpo de corteza y
// raíces con seis brazos, penacho de hojas, joyas de oro y jade y ojos rojos.
// Es simétrico (mira al frente), así que flip no cambia su aspecto.
// leg: 0 = parado, 1 / 2 = pasos; atk: 0 = normal, 1 = preparando el golpe
// (brazos arriba), 2 = golpeando (brazos al suelo)
function makeKaskabal(leg, atk) {
  return sprite(64, 72, 32, 68, (c) => {
    const OUT = "#1a0c10";
    const B0 = "#4a1f14";
    const B1 = "#7a2f1c";
    const B2 = "#a8442a";
    const B3 = "#c9663f";
    const B4 = "#e08a55";
    const G0 = "#7a5a12";
    const G1 = "#d9a62a";
    const G2 = "#f5d26a";
    const T0 = "#0f5a4a";
    const T1 = "#1f9a7a";
    const T2 = "#3fd0a0";
    const L0 = "#14602f";
    const L1 = "#2a9a4c";
    const L2 = "#5fe08a";

    // Pseudoaleatorio fijo: las hebras de pelo son iguales en todos los cuadros
    let seed = 20261115;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const M = (x) => 63 - x;
    const both = (fn) => {
      fn(false);
      fn(true);
    };
    // Línea gruesa centrada en los puntos
    const line = (a, b, col, t) =>
      pline(
        c,
        a[0] - (t >> 1),
        a[1] - (t >> 1),
        b[0] - (t >> 1),
        b[1] - (t >> 1),
        col,
        t,
      );
    const band = (x, y) => {
      rect(c, x - 3, y - 2, 6, 5, OUT);
      rect(c, x - 2, y - 1, 4, 3, G1);
      px(c, x - 2, y - 1, G2);
      px(c, x - 1, y, T1);
      px(c, x, y, T1);
    };

    ellipse(c, 32, 68, 24, 3, "rgba(0,0,0,0.30)");

    // ---------- Piernas ----------
    both((m) => {
      const X = (x) => (m ? M(x) : x);
      const lifted = (!m && leg === 1) || (m && leg === 2);
      const L = lifted ? 4 : 0;
      const hip = [X(26), 44];
      const knee = [X(19 - (lifted ? 2 : 0)), 53 - (lifted ? 2 : 0)];
      const foot = [X(16 - (lifted ? 1 : 0)), 62 - L];
      line(hip, knee, OUT, 7);
      line(knee, foot, OUT, 7);
      line(hip, knee, B1, 5);
      line(knee, foot, B1, 5);
      line([hip[0] + 1, hip[1]], [knee[0] + 1, knee[1]], B2, 1);
      line([knee[0] + 1, knee[1]], [foot[0] + 1, foot[1]], B2, 1);
      // Pie con tres dedos largos
      ellipse(c, foot[0], foot[1] + 3, 6, 3, OUT);
      ellipse(c, foot[0], foot[1] + 3, 5, 2, B3);
      [-1, 0, 1].forEach((k) => {
        const tx = foot[0] + k * 5 * (m ? -1 : 1) + (m ? 2 : -2);
        line([foot[0], foot[1] + 3], [tx, foot[1] + 6], OUT, 3);
        line([foot[0], foot[1] + 3], [tx, foot[1] + 6], B4, 1);
      });
      band(
        Math.round((knee[0] + foot[0]) / 2),
        Math.round((knee[1] + foot[1]) / 2) + 1,
      );
    });

    // ---------- Seis brazos ----------
    const sw = leg === 1 ? 1 : leg === 2 ? -1 : 0;
    let arms;
    if (atk === 1) {
      arms = [
        [
          [22, 27],
          [13, 18],
          [8, 6],
        ],
        [
          [21, 32],
          [11, 27],
          [6, 20],
        ],
        [
          [22, 37],
          [12, 38],
          [6, 33],
        ],
      ];
    } else if (atk === 2) {
      arms = [
        [
          [22, 27],
          [19, 38],
          [20, 52],
        ],
        [
          [21, 32],
          [14, 42],
          [11, 54],
        ],
        [
          [22, 37],
          [13, 48],
          [6, 58],
        ],
      ];
    } else {
      arms = [
        [
          [22, 27],
          [14, 22],
          [10, 12],
        ],
        [
          [21, 32],
          [12, 32],
          [6, 30],
        ],
        [
          [22, 37],
          [14, 42],
          [9, 50],
        ],
      ];
      // Al caminar los brazos se mecen
      arms = arms.map((p, i) => {
        const s = i === 1 ? -sw : sw;
        return [p[0], [p[1][0], p[1][1] - s], [p[2][0], p[2][1] - 3 * s]];
      });
    }
    both((m) => {
      arms.forEach((pts) => {
        const P = pts.map(([x, y]) => [m ? M(x) : x, y]);
        line(P[0], P[1], OUT, 5);
        line(P[1], P[2], OUT, 5);
        line(P[0], P[1], B2, 3);
        line(P[1], P[2], B2, 3);
        line([P[0][0], P[0][1] - 1], [P[1][0], P[1][1] - 1], B3, 1);
        line([P[1][0], P[1][1] - 1], [P[2][0], P[2][1] - 1], B3, 1);
        // Brazalete a mitad del antebrazo
        band(
          Math.round((P[1][0] + P[2][0] * 2) / 3),
          Math.round((P[1][1] + P[2][1] * 2) / 3),
        );
        // Mano con garras
        const dx = P[2][0] - P[1][0];
        const dy = P[2][1] - P[1][1];
        const base = Math.atan2(dy, dx);
        const hx = P[2][0];
        const hy = P[2][1];
        [-0.8, 0, 0.8].forEach((da) => {
          const tip = [
            Math.round(hx + Math.cos(base + da) * 7),
            Math.round(hy + Math.sin(base + da) * 7),
          ];
          line([hx, hy], tip, OUT, 3);
        });
        disc(c, hx, hy, 3, OUT);
        [-0.8, 0, 0.8].forEach((da) => {
          const tip = [
            Math.round(hx + Math.cos(base + da) * 7),
            Math.round(hy + Math.sin(base + da) * 7),
          ];
          line([hx, hy], tip, B4, 1);
          px(c, tip[0], tip[1], B0);
        });
        disc(c, hx, hy, 2, B4);
      });
    });

    // ---------- Torso peludo ----------
    ellipse(c, 32, 36, 13, 14, OUT);
    ellipse(c, 32, 36, 12, 13, B1);
    for (let i = 0; i < 120; i++) {
      const x = 21 + Math.floor(rnd() * 22);
      const y = 24 + Math.floor(rnd() * 24);
      if (((x - 32) / 12) ** 2 + ((y - 36) / 13) ** 2 > 0.95) continue;
      const col = [B0, B2, B2, B3][Math.floor(rnd() * 4)];
      pline(
        c,
        x,
        y,
        x + (rnd() < 0.5 ? 0 : 1),
        y + 3 + Math.floor(rnd() * 3),
        col,
        1,
      );
    }

    // ---------- Falda de hojas, cinturón y taparrabos ----------
    [
      [24, 56],
      [28, 60],
      [32, 62],
      [36, 60],
      [40, 56],
    ].forEach(([tx, ty]) => {
      line([32, 48], [tx, ty], OUT, 4);
    });
    [
      [24, 56],
      [28, 60],
      [32, 62],
      [36, 60],
      [40, 56],
    ].forEach(([tx, ty]) => {
      line([32, 48], [tx, ty], L1, 2);
      px(c, tx, ty, L2);
    });
    // Pelaje que cuelga de la cadera
    for (let i = 0; i < 40; i++) {
      const x = 22 + Math.floor(rnd() * 20);
      pline(
        c,
        x,
        46,
        x + (rnd() < 0.5 ? -1 : 0),
        49 + Math.floor(rnd() * 5),
        [B0, B2, B1][i % 3],
        1,
      );
    }
    rect(c, 21, 42, 22, 4, OUT);
    rect(c, 22, 43, 20, 2, G1);
    for (let x = 23; x < 42; x += 3) px(c, x, 43, T1);
    rect(c, 22, 43, 20, 1, G2);
    px(c, 22, 44, G0);
    // Placa dorada con rostro
    rect(c, 27, 44, 10, 14, OUT);
    rect(c, 28, 45, 8, 12, G1);
    rect(c, 28, 45, 8, 1, G2);
    rect(c, 29, 52, 6, 4, T1);
    px(c, 30, 48, G0);
    px(c, 33, 48, G0);
    rect(c, 30, 51, 4, 1, G0);
    px(c, 31, 50, G0);
    px(c, 32, 50, G0);

    // ---------- Collar con máscara ----------
    for (let i = 0; i <= 8; i++) {
      const x = 22 + i * 2.5;
      const y = 29 + Math.round(4 * Math.sin((i / 8) * Math.PI));
      rect(c, Math.round(x) - 1, y - 1, 4, 4, OUT);
      rect(c, Math.round(x), y, 2, 2, i % 2 ? G1 : T1);
    }
    rect(c, 28, 33, 8, 9, OUT);
    rect(c, 29, 34, 6, 7, G1);
    rect(c, 29, 34, 6, 1, G2);
    px(c, 30, 36, G0);
    px(c, 33, 36, G0);
    rect(c, 30, 38, 4, 1, G0);
    rect(c, 30, 39, 1, 1, G0);
    rect(c, 33, 39, 1, 1, G0);

    // ---------- Penacho de hojas ----------
    const leaves = [
      [8, 9],
      [11, 3],
      [18, 0],
      [25, 0],
    ];
    both((m) => {
      leaves.forEach(([tx, ty]) => {
        const T = [m ? M(tx) : tx, ty];
        line([m ? 37 : 26, 13], T, OUT, 4);
      });
    });
    line([32, 12], [32, 1], OUT, 4);
    both((m) => {
      leaves.forEach(([tx, ty], i) => {
        const T = [m ? M(tx) : tx, ty];
        line([m ? 37 : 26, 13], T, i % 2 ? L1 : L0, 2);
        px(c, T[0], T[1], L2);
      });
    });
    line([32, 12], [32, 2], L1, 2);
    px(c, 32, 1, L2);

    // ---------- Melena y cara ----------
    ellipse(c, 32, 20, 14, 11, OUT);
    ellipse(c, 32, 20, 13, 10, B1);
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 5 + rnd() * 8;
      const x = Math.round(32 + Math.cos(a) * r);
      const y = Math.round(20 + Math.sin(a) * r * 0.8);
      pline(
        c,
        x,
        y,
        x + (Math.cos(a) > 0 ? 1 : -1),
        y + 3,
        [B0, B2, B3][i % 3],
        1,
      );
    }
    // Mechones que sobresalen del contorno
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const x0 = Math.round(32 + Math.cos(a) * 12);
      const y0 = Math.round(20 + Math.sin(a) * 9.5);
      const x1 = Math.round(32 + Math.cos(a) * 15);
      const y1 = Math.round(20 + Math.sin(a) * 12);
      line([x0, y0], [x1, y1], OUT, 2);
      line([x0, y0], [x1, y1], k % 2 ? B2 : B0, 1);
    }
    // Cara oscura
    // Cara con la misma textura de corteza y pelo que el cuerpo
    ellipse(c, 32, 22, 8, 7, B0);
    ellipse(c, 32, 22, 7, 6, B1);
    for (let i = 0; i < 46; i++) {
      const x = 25 + Math.floor(rnd() * 15);
      const y = 16 + Math.floor(rnd() * 12);
      const y2 = y + 2 + Math.floor(rnd() * 2);
      const col = [B0, B2, B2, B3][Math.floor(rnd() * 4)];
      if (((x - 32) / 7) ** 2 + ((y - 22) / 6) ** 2 > 0.9) continue;
      if (((x - 32) / 7) ** 2 + ((y2 - 22) / 6) ** 2 > 0.9) continue;
      pline(c, x, y, x, y2, col, 1);
    }
    // Ojos rojos furiosos
    both((m) => {
      const X = (x) => (m ? M(x) : x);
      const x0 = m ? 34 : 26;
      rect(c, x0, 18, 4, 3, "#ff1a1a");
      px(c, x0 + (m ? 0 : 3), 17, "#ff1a1a");
      px(c, x0 + (m ? 1 : 2), 18, "#ffb0b0");
      line([X(25), 16], [X(30), 18], OUT, 2);
    });
    // Boca con dientes
    if (atk > 0) {
      rect(c, 26, 23, 12, 6, OUT);
      for (let x = 27; x < 37; x += 2) {
        rect(c, x, 23, 1, 2, "#f2e3b0");
        rect(c, x + 1, 27, 1, 2, "#f2e3b0");
      }
      rect(c, 29, 26, 6, 1, "#a8261f");
    } else {
      rect(c, 27, 24, 10, 4, OUT);
      for (let x = 28; x < 37; x += 2) {
        px(c, x, 24, "#f2e3b0");
        px(c, x, 25, "#f2e3b0");
        px(c, x + 1, 27, "#f2e3b0");
      }
    }
    // Aretes de oro y jade
    both((m) => {
      const x = m ? 46 : 17;
      disc(c, x, 24, 3, OUT);
      disc(c, x, 24, 2, G1);
      px(c, x, 24, T1);
      px(c, x, 23, T2);
    });

    // ---------- Máscara dorada del tocado ----------
    both((m) => {
      const x = m ? 38 : 22;
      rect(c, x, 9, 4, 8, OUT);
      rect(c, x + 1, 10, 2, 6, G1);
      px(c, x + 1, 12, T1);
    });
    rect(c, 26, 5, 12, 12, OUT);
    rect(c, 27, 6, 10, 10, G1);
    rect(c, 27, 6, 10, 1, G2);
    rect(c, 27, 6, 1, 10, G2);
    rect(c, 31, 2, 2, 4, OUT);
    rect(c, 31, 3, 2, 3, G1);
    px(c, 29, 9, G0);
    px(c, 30, 9, G0);
    px(c, 33, 9, G0);
    px(c, 34, 9, G0);
    rect(c, 29, 12, 6, 1, G0);
    px(c, 30, 13, G0);
    px(c, 33, 13, G0);
    px(c, 29, 8, T1);
    px(c, 34, 8, T1);
  });
}

// Xtabay: espíritu seductor de la ceiba, del tamaño de la exploradora (~26 px).
// Mujer de cabello largo y ondulado, flor de hibisco, aretes de aro y vestido
// bordado estilo huipil cuyo dobladillo se disuelve en una niebla tenue; flota
// sobre una sombra suave en el suelo, sin piernas ni raíces visibles. Al
// detectar a la jugadora se revela: piel grisácea, ojos que brillan en
// naranja, boca abierta con colmillos y el cabello se eriza hacia afuera.
// leg: 0 = quieta, 1 / 2 = vaivén al "caminar"; atk: 0 = normal (cabello liso),
// 1 = preparando el golpe (brazos arriba), 2 = golpeando (brazos al frente y
// abajo), 3 = persiguiendo (atk > 0 también activa el cabello erizado)
function makeXtabay(leg, atk) {
  return sprite(36, 36, 18, 32, (c) => {
    const OUT = "#14101a";
    const CX = 18;
    const SK = atk > 0 ? "#c4cfc8" : "#f0dccb";
    const SK_D = atk > 0 ? "#8fa098" : "#c9a98f";
    const SK_L = atk > 0 ? "#dde6e0" : "#fff1e4";
    // En calma: cabello castaño cálido y vestido luminoso; revelada: oscuro y violáceo
    const HAIR = atk > 0 ? "#1a1326" : "#4b2a1a";
    const HAIR_M = atk > 0 ? "#35234a" : "#74421f";
    const HAIR_L = atk > 0 ? "#5b3b7a" : "#b9743a";
    const DR = "#f7f4ee";
    const DR_M = atk > 0 ? "#e7c7d4" : "#f6cfdc";
    const DR_D = "#b4ad9c";
    const EDGE = "#8d8676";
    const RED = "#c1272d";
    const PINK = "#ff6f91";
    const PETAL_L = "#ffd1dc";
    const LEAF = "#3f7f4a";
    const GOLD = "#e8b84b";
    const CLAW = "#ece9e0";
    const sway = leg === 1 ? 1 : leg === 2 ? -1 : 0;

    const hexToRgba = (hex, a) => {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    };

    // Sombra suave en el suelo (con un hueco respecto al vestido: está flotando)
    [
      [8, 0.16],
      [6, 0.24],
      [4, 0.32],
    ].forEach(([rr, a]) => ellipse(c, CX, 33, rr, 1, `rgba(0,0,0,${a})`));

    // ---- Masa base del cabello detrás de la cabeza (compartida por ambos
    //      estilos) ----
    for (let x = CX - 6; x <= CX + 6; x++) {
      const e = Math.abs(x - CX);
      const bottom = 16 - ((e / 3) | 0);
      for (let y = 8; y <= bottom; y++) {
        const n = hash2(x, y, 5);
        px(c, x, y, n < 0.1 ? HAIR_L : n < 0.4 ? HAIR_M : HAIR);
      }
    }

    if (atk > 0) {
      // ---- Erizado: al detectar a la jugadora, puntas rígidas que estallan
      //      hacia afuera en varias direcciones ----
      const hairspike = (x0, y0, length, angDeg, w0) => {
        const a = (angDeg * Math.PI) / 180;
        const dx = Math.sin(a);
        const dy = -Math.cos(a);
        for (let i = 0; i < length; i++) {
          const t = i / length;
          const x = x0 + dx * i;
          const y = y0 + dy * i;
          const wd = Math.max(1, Math.round(w0 * (1 - t)));
          for (let k = -wd; k <= wd; k++) {
            px(
              c,
              Math.round(x + k * Math.cos(a)),
              Math.round(y + k * Math.sin(a)),
              (i + k) % 3 ? HAIR : HAIR_M,
            );
          }
        }
        px(
          c,
          Math.round(x0 + dx * length),
          Math.round(y0 + dy * length),
          HAIR_L,
        );
      };
      [
        [CX - 5, 10, 7, -55, 2],
        [CX - 3, 8, 8, -25, 2],
        [CX, 7, 7, -2, 2],
        [CX + 3, 8, 8, 20, 2],
        [CX + 5, 10, 7, 50, 2],
        [CX - 7, 13, 6, -85, 2],
        [CX + 7, 13, 6, 85, 2],
        [CX - 6, 16, 7, -115, 1],
        [CX + 6, 16, 7, 115, 1],
        [CX - 4, 17, 6, -150, 1],
        [CX + 4, 17, 6, 150, 1],
      ].forEach(([x0, y0, length, angDeg, w0]) =>
        hairspike(x0, y0, length, angDeg, w0),
      );
    } else {
      // ---- Normal: en calma, cabello largo y ondulado que cae sobre los
      //      hombros, con puntas de largo ligeramente irregular ----
      for (let x = CX - 8; x <= CX + 8; x++) {
        const e = Math.abs(x - CX);
        const top = e < 7 ? 7 : 9;
        const jitter = Math.floor(hash2(x, 99, 3) * 3);
        const bottom = 23 - ((e / 2) | 0) - jitter;
        for (let y = top; y <= bottom; y++) {
          if (y < 11 && e > 5) continue;
          const xx = x + (y > 16 ? sway : 0);
          const n = hash2(xx, y, 5);
          px(c, xx, y, n < 0.12 ? HAIR_L : n < 0.4 ? HAIR_M : HAIR);
        }
      }
    }

    // ---- Vestido: corpiño y falda que se ensancha, con el dobladillo
    //      disolviéndose en una niebla tenue (nada de raíces ni piernas) ----
    for (let y = 16; y <= 26; y++) {
      const hw = y <= 20 ? 3 : Math.round(3 + (y - 20) * 0.45);
      const shift = y >= 24 ? sway : 0;
      const fadeband = y >= 24;
      for (let x = -hw; x <= hw; x++) {
        if (fadeband && hash2(x + 20, y, 8) < 0.35) continue;
        let col = x > hw * 0.45 ? DR_M : DR;
        if (y > 21 && (x + hw) % 4 === 0) col = DR_M; // pliegues
        if (x >= hw) col = DR_D;
        if (fadeband) {
          const a = y === 24 ? 0.85 : y === 25 ? 0.55 : 0.3;
          col = hexToRgba(col, a);
        }
        px(c, CX + x + shift, y, col);
      }
      if (!fadeband) {
        px(c, CX - hw - 1 + shift, y, EDGE);
        px(c, CX + hw + 1 + shift, y, EDGE);
      }
    }
    // Escote
    rect(c, CX - 1, 15, 3, 1, SK);
    // Greca bordada con flores cerca del pecho (estilo huipil)
    for (let x = -5; x <= 5; x++) {
      let col = x % 2 === 0 ? PINK : LEAF;
      if (x % 4 === 0) col = PETAL_L;
      px(c, CX + x, 18, col);
    }
    // Hombros descubiertos
    px(c, CX - 6, 15, SK);
    px(c, CX - 7, 16, SK);
    px(c, CX + 6, 15, SK);
    px(c, CX + 7, 16, SK);

    // Brazos (con contorno): colgando, en alto o al frente según el ataque
    const arm = (sx, sy, ex, ey) => {
      pline(c, sx - 1, sy - 1, ex - 1, ey - 1, OUT, 2);
      pline(c, sx, sy, ex, ey, SK, 1);
      px(c, ex, ey, SK_L);
    };
    const claws = (ex, ey, dx, dy) => {
      [-1, 0, 1].forEach((k) => {
        pline(c, ex + k, ey, ex + k + dx, ey + dy, CLAW, 1);
        px(c, ex + k + dx, ey + dy, OUT);
      });
    };
    if (atk === 1) {
      arm(CX - 6, 16, CX - 9, 10);
      arm(CX + 6, 16, CX + 9, 10);
      claws(CX - 9, 10, -2, -2);
      claws(CX + 9, 10, 2, -2);
    } else if (atk === 3) {
      arm(CX - 6, 16, CX - 9, 22 + sway);
      arm(CX + 6, 16, CX + 9, 22 - sway);
      claws(CX - 9, 22 + sway, -1, 3);
      claws(CX + 9, 22 - sway, 1, 3);
    } else if (atk === 2) {
      arm(CX - 6, 16, CX - 10, 25);
      arm(CX + 6, 16, CX + 10, 25);
      claws(CX - 10, 25, -1, 3);
      claws(CX + 10, 25, 1, 3);
    } else {
      arm(CX - 6, 16, CX - 8, 23 + sway);
      arm(CX + 6, 16, CX + 8, 23 - sway);
    }

    // Cuello y cabeza
    rect(c, CX - 1, 14, 3, 2, SK_D);
    ellipse(c, CX, 10, 4, 4, OUT);
    ellipse(c, CX, 10, 3, 3, SK);
    px(c, CX - 2, 9, SK_L);
    px(c, CX - 2, 8, SK_L);

    // Cabello enmarcando el rostro
    rect(c, CX - 3, 7, 7, 2, HAIR);
    rect(c, CX - 4, 8, 1, 6, HAIR);
    rect(c, CX + 4, 8, 1, 6, HAIR);
    px(c, CX - 3, 9, HAIR);
    px(c, CX + 3, 9, HAIR);
    px(c, CX - 2, 7, HAIR_L);
    px(c, CX + 1, 7, HAIR_L);

    // Aretes de aro dorados
    px(c, CX - 5, 11, GOLD);
    px(c, CX - 5, 12, GOLD);
    px(c, CX + 5, 11, GOLD);
    px(c, CX + 5, 12, GOLD);

    // Rostro
    if (atk > 0) {
      // Revelada: ojos que brillan en naranja, ceño hundido, boca abierta con colmillos
      rect(c, CX - 3, 10, 2, 2, "#ff7a1a");
      rect(c, CX + 2, 10, 2, 2, "#ff7a1a");
      px(c, CX - 3, 10, "#ffd08a");
      px(c, CX + 2, 10, "#ffd08a");
      pline(c, CX - 3, 9, CX - 1, 10, OUT, 1);
      pline(c, CX + 3, 9, CX + 1, 10, OUT, 1);
      rect(c, CX - 2, 12, 5, 2, OUT);
      px(c, CX - 2, 12, "#ffffff");
      px(c, CX + 2, 12, "#ffffff");
      px(c, CX - 1, 13, "#ffffff");
      px(c, CX + 1, 13, "#ffffff");
      px(c, CX - 3, 12, SK_D);
      px(c, CX + 3, 12, SK_D);
    } else {
      // Amable y hermosa: ojos grandes y brillantes con pestañas, mejillas
      // sonrosadas y una sonrisa dulce
      px(c, CX - 2, 9, "#fffaf2");
      px(c, CX + 2, 9, "#fffaf2");
      px(c, CX - 2, 10, "#4a2c1a");
      px(c, CX + 2, 10, "#4a2c1a");
      px(c, CX - 3, 9, OUT);
      px(c, CX + 3, 9, OUT);
      px(c, CX - 1, 8, HAIR_M);
      px(c, CX + 1, 8, HAIR_M);
      px(c, CX, 11, SK_D);
      px(c, CX - 3, 11, "#f4a3a8");
      px(c, CX + 3, 11, "#f4a3a8");
      px(c, CX - 1, 12, "#d9485a");
      px(c, CX + 1, 12, "#d9485a");
      px(c, CX, 13, "#d9485a");
    }

    // Florecitas y destellos amables (solo en calma)
    if (atk === 0) {
      px(c, CX - 6, 9, PINK);
      px(c, CX - 7, 9, PETAL_L);
      px(c, CX - 6, 8, PETAL_L);
      px(c, CX - 6, 10, PETAL_L);
      px(c, CX - 5, 9, GOLD);
      px(c, CX + 6, 14, "#ffb3c8");
      px(c, CX + 7, 14, PETAL_L);
      px(c, CX + 6, 13, PETAL_L);
      px(c, CX + 6, 15, PETAL_L);
      px(c, CX + 5, 14, GOLD);
      // Brillos suaves que titilan junto con el vaivén
      const sp = leg === 1 ? 1 : 0;
      px(c, CX - 11, 12 + sp, GOLD);
      px(c, CX + 11, 8 + (1 - sp), GOLD);
      px(c, CX - 10, 20 - sp, PETAL_L);
      px(c, CX + 10, 17 + sp, PETAL_L);
    }

    // Corona de flor de hibisco
    px(c, CX - 2, 5, PETAL_L);
    px(c, CX - 1, 4, PINK);
    px(c, CX, 4, "#ffb3c8");
    px(c, CX + 1, 4, PINK);
    px(c, CX + 2, 5, PETAL_L);
    px(c, CX, 5, "#c1272d");
    px(c, CX - 3, 6, LEAF);
    px(c, CX + 3, 6, LEAF);
  });
}

function makeJaguar(frame) {
  return sprite(28, 18, 13, 16, (c) => {
    const o = frame ? 1 : 0;

    // Sombra
    ellipse(c, 13, 16, 11, 2, "rgba(0,0,0,0.25)");

    // Cola gruesa y curvada
    pline(c, 5, 9, 2, 7, "#d99a32", 2);
    pline(c, 2, 7, 0, 4, "#d99a32", 2);
    px(c, 0, 3, "#29251e");
    px(c, 1, 4, "#29251e");

    // Patas traseras y delanteras: cortas y musculosas
    rect(c, 5 + o, 11, 3, 5, "#c98929");
    rect(c, 9 - o, 11, 3, 5, "#e5a638");
    rect(c, 16 + o, 11, 3, 5, "#d3942e");
    rect(c, 20 - o, 11, 3, 5, "#c98929");

    // Patas y pequeñas garras
    rect(c, 5 + o, 15, 3, 2, "#a96c25");
    rect(c, 9 - o, 15, 3, 2, "#b97825");
    rect(c, 16 + o, 15, 3, 2, "#a96c25");
    rect(c, 20 - o, 15, 3, 2, "#a96c25");

    px(c, 6 + o, 17, "#49301b");
    px(c, 10 - o, 17, "#49301b");
    px(c, 17 + o, 17, "#49301b");
    px(c, 21 - o, 17, "#49301b");

    // Cuerpo robusto, ancho y compacto
    ellipse(c, 12, 9, 10, 5, "#d99a32");
    ellipse(c, 12, 8, 9, 4, "#edb448");

    // Pecho y vientre
    ellipse(c, 13, 11, 8, 2, "#f5d99b");
    rect(c, 7, 10, 11, 2, "#f5d99b");

    // Hombros musculosos
    ellipse(c, 18, 9, 4, 4, "#e5a638");

    // Cabeza grande y ancha
    disc(c, 22, 6, 4, "#e8ad43");

    // Orejas redondeadas
    disc(c, 19, 2, 2, "#d18c2a");
    disc(c, 24, 2, 2, "#d18c2a");
    px(c, 19, 2, "#49301b");
    px(c, 24, 2, "#49301b");

    // Mejillas y hocico
    ellipse(c, 24, 8, 3, 2, "#f5d99b");
    rect(c, 23, 7, 4, 2, "#f5d99b");
    px(c, 27, 7, "#33251a");
    px(c, 25, 5, "#252019");

    // Ojo
    px(c, 23, 5, "#241b12");
    px(c, 24, 5, "#241b12");

    // Bigotes
    px(c, 26, 9, "#49301b");
    px(c, 27, 10, "#49301b");

    // Rosetas características del jaguar
    // Cada una tiene un centro dorado y bordes oscuros fragmentados
    const rosettes = [
      [5, 8],
      [9, 6],
      [13, 8],
      [16, 6],
      [8, 11],
      [13, 10],
      [18, 10],
    ];

    rosettes.forEach(([x, y]) => {
      px(c, x - 1, y, "#49301b");
      px(c, x + 1, y, "#49301b");
      px(c, x, y - 1, "#49301b");
      px(c, x, y + 1, "#49301b");
      px(c, x, y, "#e5a638");
    });

    // Manchas pequeñas en cabeza y patas
    px(c, 20, 4, "#49301b");
    px(c, 22, 3, "#49301b");
    px(c, 4, 12, "#49301b");
    px(c, 17, 13, "#49301b");
  });
}

// Choco: perro café chocolate con pecho crema, patas y cejas canela.
// Mira a la derecha (se voltea con flip). Paleta tomada de la imagen de referencia.
// leg: 0 = parado, 1 = paso A, 2 = paso B; tail: 0/1 = cola en dos posiciones;
// open: boca abierta con la lengua de fuera
function makeDog(leg, tail, open) {
  return sprite(34, 28, 16, 26, (c) => {
    const OUT = "#1a0c10";
    const BR = "#783c24";
    const BR_D = "#5a2c1c";
    const BR_L = "#8f4c2e";
    const EAR = "#4a2418";
    const CREAM = "#e8dcb4";
    const TAN = "#c08448";
    const TAN_L = "#d9a066";

    ellipse(c, 16, 26, 13, 2, "rgba(0,0,0,0.25)");

    // Cola: sube y se mueve de lado a lado
    const tx = tail ? 1 : 5;
    const ty = tail ? 3 : 1;
    pline(c, 7, 14, tx, ty, OUT, 4);
    pline(c, 7, 14, tx, ty, BR, 2);
    px(c, tx, ty, BR_D);

    // Patas (de atrás hacia adelante): atrás-lejana, delantera-lejana, atrás-cercana, delantera-cercana
    const lift = (p) =>
      (leg === 1 && p % 2 === 0) || (leg === 2 && p % 2 === 1) ? 2 : 0;
    const dx = (p) =>
      leg === 1
        ? p % 2 === 0
          ? 1
          : -1
        : leg === 2
          ? p % 2 === 0
            ? -1
            : 1
          : 0;
    const paw = (x, p, far) => {
      const l = lift(p);
      const xx = x + dx(p);
      const top = 16;
      const bot = 24 - l;
      rect(c, xx - 1, top, 5, bot - top + 1, OUT);
      rect(c, xx, top, 3, bot - top, far ? BR_D : BR);
      rect(c, xx, bot - 4, 3, 3, far ? "#a8703c" : TAN);
      rect(c, xx - 1, bot - 1, 5, 2, OUT);
      rect(c, xx, bot - 1, 3, 1, far ? "#d8cca4" : CREAM);
      px(c, xx, top + 1, far ? BR : BR_L);
    };
    paw(9, 0, true); // trasera lejana
    paw(21, 1, true); // delantera lejana
    paw(6, 2, false); // trasera cercana
    paw(18, 3, false); // delantera cercana

    // Cuerpo con contorno
    ellipse(c, 15, 13, 11, 5, OUT);
    ellipse(c, 15, 13, 10, 4, BR);
    ellipse(c, 14, 11, 7, 1, BR_L); // luz en el lomo
    ellipse(c, 15, 16, 8, 1, BR_D); // sombra del vientre
    // Pecho crema (como en la referencia)
    ellipse(c, 21, 15, 3, 2, CREAM);
    ellipse(c, 21, 16, 2, 1, TAN);
    // Manchita de pelo en el lomo
    px(c, 10, 10, BR_D);
    px(c, 12, 9, BR_D);
    px(c, 16, 10, BR_D);

    // Cuello y cabeza
    rect(c, 22, 6, 6, 9, OUT);
    rect(c, 23, 7, 4, 7, BR);
    disc(c, 26, 8, 6, OUT);
    disc(c, 26, 8, 5, BR);
    disc(c, 25, 6, 2, BR_L);

    // Hocico crema con nariz
    rect(c, 28, 8, 6, 5, OUT);
    rect(c, 28, 9, 5, 3, CREAM);
    rect(c, 28, 8, 5, 1, TAN);
    rect(c, 32, 7, 2, 3, OUT); // nariz
    px(c, 32, 7, "#5a3a3a");

    // Boca
    if (open) {
      rect(c, 28, 12, 5, 2, OUT);
      rect(c, 29, 12, 3, 1, "#c4506a");
      rect(c, 30, 13, 2, 2, "#e07a90");
      px(c, 30, 13, "#f0a0b0");
    } else {
      rect(c, 28, 12, 5, 1, OUT);
    }

    // Ojo y ceja canela
    rect(c, 26, 6, 2, 2, OUT);
    px(c, 26, 6, "#e8d8b0");
    rect(c, 25, 4, 3, 1, TAN_L);
    px(c, 28, 4, TAN);

    // Oreja caída
    ellipse(c, 22, 9, 2, 3, OUT);
    ellipse(c, 22, 9, 1, 2, EAR);
    px(c, 21, 8, BR_D);
    px(c, 23, 10, BR_D);
  });
}

/* ---------- Huaypek: perro-esqueleto espectral (nahual hechicero) ---------- */
// Pelaje gris-violáceo desgreñado (con hebras, costillas marcadas y lomo de púas),
// cabeza de CRÁNEO de hueso con cuencas oscuras de brillo rojo y colmillos expuestos.
// Su comportamiento (updateAlux) es el del alux; solo cambia su apariencia.
//  - Patrulla / quieto: a cuatro patas (makeHuaypek).
//  - Persiguiendo, preparando el golpe y golpeando: se alza y corre en DOS patas
//    (makeHuaypekBiped): "run0"/"run1" = zancadas, "wind" = se yergue con las garras
//    en alto, "hit" = se lanza con las fauces abiertas.
const HP = {
  OUT: "#08060d",
  F: ["#120f1b", "#241f35", "#3a3454", "#554d78", "#7d74a6"],
  BONE_D: "#7d725a",
  BONE_M: "#b5aa8d",
  BONE: "#d9cfb2",
  BONE_L: "#f4ecd6",
  MOUTH: "#3d0810",
  SOCK: "#07040a",
};
const HP_RIB = "#6f6853";
const HP_FIRE = "#ff3b1f";

// Mancha de pelaje con hebras: luz arriba, sombra abajo, mechones hacia atrás
function hpFur(c, cx, cy, rx, ry, seed, lit) {
  const P = HP.F;
  ellipse(c, cx, cy, rx + 1, ry + 1, HP.OUT);
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      let t = dy < -0.35 ? 2 : dy < 0.35 ? 1 : 0;
      if (dx < -0.4 && dy < 0.2) t = Math.min(3, t + 1);
      if (lit && dy < -0.6) t = 3;
      const n = hash2(x, y, seed);
      if (n < 0.14) t = Math.max(0, t - 1);
      else if (n > 0.9) t = Math.min(4, t + 1);
      px(c, x, y, P[t]);
    }
  }
  const cnt = Math.round((rx * ry) / 4);
  for (let k = 0; k < cnt; k++) {
    const x = cx + Math.round((hash2(k, seed, 1) - 0.5) * 2 * rx * 0.85);
    const y = cy + Math.round((hash2(k, seed, 2) - 0.5) * 2 * ry * 0.85);
    const L = 2 + ((hash2(k, seed, 3) * 3) | 0);
    const col =
      hash2(k, seed, 4) < 0.35 ? P[0] : hash2(k, seed, 5) < 0.55 ? P[3] : P[4];
    for (let i = 0; i < L; i++) px(c, x - i, y + (i >> 1), col);
  }
}

// Mechón de pelo en punta (contorno + cuerpo)
function hpTuft(c, x0, y0, x1, y1, w) {
  pline(c, x0, y0, x1, y1, HP.OUT, w + 2);
  pline(c, x0, y0, x1, y1, HP.F[1], w);
  pline(c, x0, y0, x1, y1, HP.F[3], 1);
  px(c, x1, y1, HP.F[4]);
}

// Pata/brazo delgado de varias articulaciones con pelaje, garras de hueso
function hpLimb(c, pts, w, far, claw) {
  const body = far ? HP.F[1] : HP.F[2];
  const hi = far ? HP.F[2] : HP.F[4];
  for (let i = 0; i < pts.length - 1; i++)
    pline(
      c,
      pts[i][0] - 1,
      pts[i][1] - 1,
      pts[i + 1][0] - 1,
      pts[i + 1][1] - 1,
      HP.OUT,
      w + 2,
    );
  for (let i = 0; i < pts.length - 1; i++)
    pline(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], body, w);
  for (let i = 0; i < pts.length - 1; i++)
    pline(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], hi, 1);
  // pelaje desgreñado en las articulaciones
  for (let i = 1; i < pts.length - 1; i++) {
    px(c, pts[i][0] - 2, pts[i][1] + 1, HP.F[3]);
    px(c, pts[i][0] - 2, pts[i][1] + 2, HP.F[0]);
    px(c, pts[i][0] - 3, pts[i][1], HP.F[2]);
  }
  // garras de hueso en la punta (tres uñas divergentes)
  const [fx, fy] = pts[pts.length - 1];
  const dir = claw || 1;
  [-1, 0, 1].forEach((k) => {
    const tx = fx + k * 3 + dir;
    pline(c, fx + k, fy, tx, fy + 3, HP.BONE, 1);
    px(c, tx, fy + 3, HP.BONE_L);
    px(c, tx + 1, fy + 3, HP.OUT);
  });
}

// Costillas marcadas bajo el pelaje (aspecto famélico)
function hpRibs(c, x0, y0, n, h) {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 3;
    px(c, x, y0 - 1, HP.F[0]);
    for (let k = 0; k < h; k++) {
      px(c, x + (k > h / 2 ? 1 : 0), y0 + k, k % 3 === 2 ? HP.BONE_D : HP_RIB);
    }
    px(c, x + 1, y0, HP.F[0]);
  }
}

// Cráneo de bestia mirando a la derecha. (hx,hy) = centro del cráneo;
// open = cuánto cuelga la mandíbula; fire = brillo de los ojos (0, 1)
function hpSkull(c, hx, hy, open, fire) {
  const B = HP;
  // orejas rasgadas de pelaje, detrás del cráneo
  hpTuft(c, hx - 4, hy - 4, hx - 8, hy - 11, 2);
  hpTuft(c, hx - 1, hy - 5, hx - 3, hy - 13, 2);
  // melena desgreñada alrededor de la nuca
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.55 + i * 0.18);
    hpTuft(
      c,
      hx - 3 + Math.round(Math.cos(a) * 2),
      hy + Math.round(Math.sin(a) * 2),
      hx - 6 + Math.round(Math.cos(a) * 7),
      hy + 1 + Math.round(Math.sin(a) * 6),
      2,
    );
  }
  // contorno del cráneo y hocico
  ellipse(c, hx, hy, 7, 6, B.OUT);
  rect(c, hx + 3, hy - 2, 12, 7, B.OUT);
  // mandíbula inferior (cuelga de la bisagra)
  const jx0 = hx + 1;
  const jy0 = hy + 4;
  pline(c, jx0, jy0 + 1, hx + 13, jy0 + 1 + open, B.OUT, 4);
  pline(c, jx0, jy0 + 1, hx + 13, jy0 + 1 + open, B.BONE_M, 2);
  pline(c, jx0, jy0, hx + 13, jy0 + open, B.BONE_D, 1);
  // interior de la boca
  if (open > 1) {
    for (let x = hx + 3; x <= hx + 12; x++) {
      const yb = jy0 + Math.round(((x - jx0) / 12) * open);
      for (let y = hy + 4; y < yb; y++)
        px(c, x, y, y === yb - 1 ? "#7a1520" : B.MOUTH);
    }
  }
  // dientes inferiores (hacia arriba) y superiores (hacia abajo)
  for (let x = hx + 4; x <= hx + 12; x += 2) {
    const yb = jy0 + Math.round(((x - jx0) / 12) * open);
    px(c, x, yb - 1, B.BONE_L);
    px(c, x, yb - 2, B.BONE);
    if (x === hx + 12) px(c, x, yb - 3, B.BONE_L);
  }
  // cráneo y hocico (hueso)
  ellipse(c, hx, hy, 6, 5, B.BONE);
  rect(c, hx + 3, hy - 1, 11, 5, B.BONE);
  px(c, hx + 14, hy - 1, B.BONE_M);
  // sombreado: arriba claro, abajo y atrás oscuro
  ellipse(c, hx - 2, hy - 3, 3, 1, B.BONE_L);
  for (let x = hx - 5; x <= hx + 3; x++) px(c, x, hy + 4, B.BONE_M);
  for (let x = hx + 4; x <= hx + 13; x++) px(c, x, hy + 3, B.BONE_M);
  px(c, hx - 5, hy, B.BONE_M);
  px(c, hx - 5, hy + 1, B.BONE_D);
  px(c, hx - 4, hy + 3, B.BONE_D);
  rect(c, hx + 5, hy - 1, 7, 1, B.BONE_L); // lomo del hocico
  // grietas
  [
    [-1, -4],
    [0, -3],
    [0, -2],
    [-1, -1],
    [1, -4],
  ].forEach(([dx, dy]) => px(c, hx + dx + 1, hy + dy, B.BONE_D));
  px(c, hx - 3, hy - 2, B.BONE_D);
  px(c, hx - 4, hy - 1, B.BONE_D);
  px(c, hx + 8, hy + 1, B.BONE_D);
  // pómulo y quijada
  pline(c, hx + 1, hy + 3, hx + 5, hy + 3, B.BONE_D, 1);
  // cavidad nasal
  rect(c, hx + 13, hy, 2, 3, B.SOCK);
  px(c, hx + 13, hy, "#3a1010");
  // cuenca del ojo: hueco oscuro con ceja pesada y un brillo rojo adentro
  const ex = hx + 2;
  const ey = hy - 1;
  c.fillStyle = fire ? "rgba(255,50,20,0.30)" : "rgba(255,80,40,0.20)";
  ellipse(c, ex, ey, 4, 4, c.fillStyle);
  ellipse(c, ex, ey, 3, 3, B.SOCK);
  px(c, ex - 3, ey, B.SOCK);
  pline(c, ex - 3, ey - 4, ex + 3, ey - 2, B.BONE_D, 1);
  pline(c, ex - 3, ey - 5, ex + 3, ey - 3, B.BONE_L, 1);
  rect(c, ex - 1, ey - 1, 3, 3, fire ? HP_FIRE : "#d8341c");
  px(c, ex, ey, "#ffe2b0");
  px(c, ex - 1, ey - 1, "#ff8a50");
  // colmillos superiores
  for (let x = hx + 5; x <= hx + 13; x += 2) {
    px(c, x, hy + 4, B.BONE_L);
    px(c, x, hy + 5, B.BONE);
  }
  [hx + 5, hx + 12].forEach((x) => {
    px(c, x, hy + 6, B.BONE_L);
    px(c, x, hy + 5, B.BONE_L);
  });
  px(c, hx + 12, hy + 7, B.BONE);
  // colmillo inferior (canino)
  const yb = jy0 + Math.round(((hx + 11 - jx0) / 12) * open);
  px(c, hx + 11, yb - 3, B.BONE_L);
  // saliva espectral
  if (open > 3) {
    px(
      c,
      hx + 8,
      jy0 + Math.round(((hx + 8 - jx0) / 12) * open) + 2,
      "#8fb8ff",
    );
    px(
      c,
      hx + 8,
      jy0 + Math.round(((hx + 8 - jx0) / 12) * open) + 3,
      "#5b7fc0",
    );
  }
}

// Cuadrúpedo: patrulla (leg 0 = quieto, 1/2 = pasos). atk lo deja erizado.
function makeHuaypek(leg, atk) {
  return sprite(58, 50, 29, 46, (c) => {
    const G = 46;
    ellipse(c, 27, G, 24, 3, "rgba(60,30,100,0.30)");

    // cola: huesuda y desgreñada
    pline(c, 7, 26, 1, 18, HP.OUT, 4);
    pline(c, 7, 26, 1, 18, HP.F[1], 2);
    pline(c, 1, 18, 0, 11, HP.OUT, 3);
    pline(c, 1, 18, 0, 11, HP.F[2], 1);
    [
      [2, 22],
      [3, 20],
      [1, 15],
    ].forEach(([x, y]) => px(c, x, y, HP.F[4]));
    for (let i = 0; i < 4; i++)
      hpTuft(c, 2 + (i & 1), 12 + i * 2, -1, 9 + i * 2, 1);

    // patas lejanas (más oscuras)
    const sw = leg === 1 ? 3 : leg === 2 ? -3 : 0;
    const lf = (p) =>
      (leg === 1 && p % 2 === 0) || (leg === 2 && p % 2 === 1) ? 3 : 0;
    hpLimb(
      c,
      [
        [16, 31],
        [13 + sw, 38],
        [14 + sw, G - lf(0)],
      ],
      3,
      true,
      1,
    );
    hpLimb(
      c,
      [
        [35, 31],
        [34 - sw, 38],
        [36 - sw, G - lf(1)],
      ],
      3,
      true,
      1,
    );

    // cuerpo: anca, torso, pecho y cuello
    hpFur(c, 14, 28, 7, 7, 11, false);
    hpFur(c, 25, 27, 11, 6, 12, true);
    hpFur(c, 34, 27, 7, 8, 13, true);
    hpFur(c, 39, 23, 5, 5, 14, true);
    // costillas y columna marcadas
    hpRibs(c, 22, 26, 4, 5);
    for (let x = 14; x <= 36; x += 3) px(c, x, 21 + ((x * 3) % 2), HP.BONE_D);
    // lomo de púas / pelo erizado (irregular)
    for (let x = 9, i = 0; x <= 38; x += 2 + ((hash2(i, 4, 8) * 2) | 0), i++) {
      const h =
        2 + ((hash2(i, 3, 7) * 5) | 0) + (i % 5 === 2 ? 4 : 0) + (atk ? 3 : 0);
      hpTuft(c, x, 21 + (x < 16 ? 1 : 0), x - 2 - (i % 3), 21 - h, 1);
    }
    // vientre hundido
    ellipse(c, 24, 33, 9, 1, HP.F[0]);
    // patas cercanas
    hpLimb(
      c,
      [
        [12, 32],
        [9 - sw, 39],
        [10 - sw, G - lf(2)],
      ],
      3,
      false,
      1,
    );
    hpLimb(
      c,
      [
        [38, 32],
        [38 + sw, 39],
        [41 + sw, G - lf(3)],
      ],
      3,
      false,
      1,
    );

    // cráneo, algo agachado al patrullar
    hpSkull(c, 44, 22, atk ? 4 : 2, atk);
  });
}

// Bípedo: persecución y ataque. pose: "run0" | "run1" | "wind" | "hit"
function makeHuaypekBiped(pose) {
  return sprite(58, 50, 29, 46, (c) => {
    const G = 46;
    const run = pose === "run0" || pose === "run1";
    const A = pose === "run1";
    ellipse(c, 27, G, run ? 20 : 15, 3, "rgba(60,30,100,0.30)");

    // coordenadas según la pose: cadera, hombro, cabeza
    let hip,
      sh,
      hd,
      open,
      fire = 1;
    if (pose === "wind") {
      hip = [24, 32];
      sh = [28, 20];
      hd = [34, 12];
      open = 4;
    } else if (pose === "hit") {
      hip = [20, 31];
      sh = [31, 23];
      hd = [40, 21];
      open = 8;
    } else {
      hip = [21, 31];
      sh = [30, 21];
      hd = [38, 16];
      open = A ? 6 : 5;
    }

    const tw = run ? (A ? -3 : 3) : 0;
    // cola: látigo huesudo que se alza hacia atrás
    const ty0 = hip[1] - 1;
    pline(c, hip[0] - 5, ty0, 6, ty0 - 6 + tw, HP.OUT, 3);
    pline(c, hip[0] - 5, ty0, 6, ty0 - 6 + tw, HP.F[1], 1);
    pline(c, 6, ty0 - 6 + tw, 1, ty0 - 12 + tw, HP.OUT, 3);
    pline(c, 6, ty0 - 6 + tw, 1, ty0 - 12 + tw, HP.F[2], 1);
    for (let i = 0; i < 3; i++)
      hpTuft(c, 3 - i, ty0 - 8 + tw - i * 2, -1, ty0 - 11 + tw - i * 2, 1);

    // patas traseras digitígradas (la lejana más oscura)
    if (pose === "wind") {
      hpLimb(
        c,
        [
          [hip[0] - 2, hip[1]],
          [hip[0] - 8, 38],
          [hip[0] - 12, G],
        ],
        3,
        true,
        1,
      );
      hpLimb(
        c,
        [
          [hip[0] + 1, hip[1]],
          [hip[0] + 6, 38],
          [hip[0] + 9, G],
        ],
        3,
        false,
        1,
      );
    } else if (pose === "hit") {
      hpLimb(
        c,
        [
          [hip[0] - 2, hip[1]],
          [hip[0] - 9, 37],
          [hip[0] - 15, 40],
        ],
        3,
        true,
        1,
      );
      hpLimb(
        c,
        [
          [hip[0] + 1, hip[1]],
          [hip[0] + 7, 38],
          [hip[0] + 11, G],
        ],
        3,
        false,
        1,
      );
    } else {
      const f1 = A
        ? [hip[0] + 11, 40, hip[0] + 14, 44]
        : [hip[0] + 5, 38, hip[0] + 11, G];
      const f2 = A
        ? [hip[0] - 6, 38, hip[0] - 10, 43]
        : [hip[0] - 4, 39, hip[0] - 13, 42];
      hpLimb(
        c,
        [
          [hip[0] - 2, hip[1]],
          [f2[0], f2[1]],
          [f2[2], f2[3]],
        ],
        3,
        true,
        1,
      );
      hpLimb(
        c,
        [
          [hip[0] + 1, hip[1]],
          [f1[0], f1[1]],
          [f1[2], f1[3]],
        ],
        3,
        false,
        1,
      );
    }

    // brazo lejano (detrás del torso)
    let armFar, armNear;
    if (pose === "wind") {
      armFar = [
        [sh[0] - 2, sh[1] + 2],
        [sh[0] + 3, sh[1] - 5],
        [sh[0] + 8, sh[1] - 12],
      ];
      armNear = [
        [sh[0] + 1, sh[1] + 3],
        [sh[0] + 8, sh[1] - 3],
        [sh[0] + 14, sh[1] - 9],
      ];
    } else if (pose === "hit") {
      armFar = [
        [sh[0] - 1, sh[1] + 2],
        [sh[0] + 8, sh[1] + 4],
        [sh[0] + 17, sh[1] + 8],
      ];
      armNear = [
        [sh[0] + 1, sh[1] + 3],
        [sh[0] + 9, sh[1] + 1],
        [sh[0] + 17, sh[1] - 2],
      ];
    } else {
      armFar = A
        ? [
            [sh[0] - 2, sh[1] + 2],
            [sh[0] - 6, sh[1] + 8],
            [sh[0] - 10, sh[1] + 5],
          ]
        : [
            [sh[0] - 2, sh[1] + 2],
            [sh[0] + 5, sh[1] + 8],
            [sh[0] + 11, sh[1] + 5],
          ];
      armNear = A
        ? [
            [sh[0] + 1, sh[1] + 3],
            [sh[0] + 8, sh[1] + 9],
            [sh[0] + 14, sh[1] + 6],
          ]
        : [
            [sh[0] + 1, sh[1] + 3],
            [sh[0] - 4, sh[1] + 9],
            [sh[0] - 8, sh[1] + 6],
          ];
    }
    hpLimb(c, armFar, 3, true, 1);

    // torso inclinado: se arma con manchas de pelaje desde la cadera al hombro
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(hip[0] + (sh[0] - hip[0]) * t);
      const y = Math.round(hip[1] + (sh[1] - hip[1]) * t);
      hpFur(c, x, y, 7 - (i > 3 ? 1 : 0), 6, 20 + i, true);
    }
    // costillas y columna
    const mx = Math.round((hip[0] + sh[0]) / 2) + 1;
    const my = Math.round((hip[1] + sh[1]) / 2);
    hpRibs(c, mx - 3, my - 2, 3, 5);
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      px(
        c,
        Math.round(hip[0] + (sh[0] - hip[0]) * t) - 5,
        Math.round(hip[1] + (sh[1] - hip[1]) * t) - 4,
        HP.BONE_D,
      );
    }
    // cuello hacia la cabeza
    hpFur(
      c,
      Math.round((sh[0] + hd[0]) / 2),
      Math.round((sh[1] + hd[1]) / 2) + 1,
      5,
      4,
      30,
      true,
    );
    // púas erizadas a lo largo de la espalda hasta la nuca (irregular)
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const x = Math.round(hip[0] - 4 + (sh[0] - hip[0] + 4) * t);
      const y = Math.round(hip[1] - 6 + (sh[1] - hip[1] + 4) * t);
      hpTuft(
        c,
        x,
        y,
        x - 3 - (i % 2),
        y - 3 - ((hash2(i, 9, 3) * 5) | 0) - (i % 3 === 1 ? 3 : 0),
        1,
      );
    }

    // brazo cercano delante del torso
    hpLimb(c, armNear, 3, false, 1);
    if (pose === "hit") {
      [
        [sh[0] + 20, sh[1] + 8],
        [sh[0] + 20, sh[1] - 3],
      ].forEach(([x, y]) => {
        px(c, x, y, "#ffffff");
        px(c, x + 1, y + 1, HP.BONE_L);
      });
    }

    // cráneo
    hpSkull(c, hd[0], hd[1], open, fire);
  });
}

// Cleo: perrita gris clara con manchas gris oscuro, hocico oscuro, orejas caídas,
// patas oscuras con patitas grises y mancha blanca en el pecho (imagen de referencia).
// Mira a la derecha (se voltea con flip). Mismos parámetros que makeDog.
function makeCleo(leg, tail, open) {
  return sprite(34, 28, 16, 26, (c) => {
    const OUT = "#222226";
    const GR = "#9a9a9a";
    const GR_L = "#b0b0b0";
    const GR_M = "#777777";
    const SPOT = "#4a4a4a";
    const LEG = "#4f4f4f";
    const LEG_D = "#3a3a3a";
    const PAW = "#8c8c8c";
    const WHITE = "#e2e2e2";
    const NOSE = "#3b2f3b";

    ellipse(c, 16, 26, 13, 2, "rgba(0,0,0,0.25)");

    // Cola erguida y curvada hacia atrás, con la punta más clara
    const tx = tail ? 2 : 5;
    const ty = tail ? 5 : 2;
    pline(c, 7, 14, 3, 9, OUT, 4);
    pline(c, 3, 9, tx, ty, OUT, 4);
    pline(c, 7, 14, 3, 9, GR, 2);
    pline(c, 3, 9, tx, ty, GR_L, 2);
    px(c, 4, 11, SPOT);
    px(c, 5, 12, SPOT);
    px(c, tx, ty, GR_M);

    // Patas (de atrás hacia adelante): atrás-lejana, delantera-lejana, atrás-cercana, delantera-cercana
    const lift = (p) =>
      (leg === 1 && p % 2 === 0) || (leg === 2 && p % 2 === 1) ? 2 : 0;
    const dx = (p) =>
      leg === 1
        ? p % 2 === 0
          ? 1
          : -1
        : leg === 2
          ? p % 2 === 0
            ? -1
            : 1
          : 0;
    const paw = (x, p, far) => {
      const l = lift(p);
      const xx = x + dx(p);
      const top = 16;
      const bot = 24 - l;
      rect(c, xx - 1, top, 5, bot - top + 1, OUT);
      rect(c, xx, top, 3, bot - top, far ? LEG_D : LEG);
      rect(c, xx, bot - 3, 3, 2, far ? GR_M : PAW);
      rect(c, xx - 1, bot - 1, 5, 2, OUT);
      rect(c, xx, bot - 1, 3, 1, far ? GR_M : PAW);
    };
    paw(9, 0, true); // trasera lejana
    paw(21, 1, true); // delantera lejana
    paw(6, 2, false); // trasera cercana
    paw(18, 3, false); // delantera cercana

    // Cuerpo con contorno
    ellipse(c, 15, 13, 11, 6, OUT);
    ellipse(c, 15, 13, 10, 5, GR);
    ellipse(c, 14, 10, 7, 1, GR_L); // luz en el lomo
    ellipse(c, 15, 17, 8, 1, GR_M); // sombra del vientre
    // Manchas gris oscuro repartidas por el lomo y los costados
    rect(c, 8, 9, 3, 2, SPOT);
    rect(c, 9, 11, 2, 2, SPOT);
    rect(c, 13, 8, 4, 2, SPOT);
    rect(c, 14, 10, 2, 2, SPOT);
    rect(c, 18, 11, 2, 2, SPOT);
    rect(c, 6, 13, 2, 3, SPOT);
    rect(c, 12, 14, 3, 2, SPOT);
    px(c, 11, 8, SPOT);
    px(c, 17, 14, SPOT);
    px(c, 4, 11, SPOT);
    // Pecho blanco
    ellipse(c, 21, 15, 3, 2, WHITE);
    px(c, 20, 17, WHITE);
    px(c, 21, 17, WHITE);

    // Cuello y cabeza
    rect(c, 22, 6, 6, 9, OUT);
    rect(c, 23, 7, 4, 7, GR);
    disc(c, 26, 8, 6, OUT);
    disc(c, 26, 8, 5, GR);
    disc(c, 25, 6, 2, GR_L);
    px(c, 24, 5, SPOT);
    px(c, 27, 4, SPOT);

    // Hocico gris claro con nariz grande y oscura
    rect(c, 28, 8, 6, 5, OUT);
    rect(c, 28, 9, 5, 3, GR_L);
    rect(c, 30, 7, 4, 5, OUT); // morro oscuro
    rect(c, 31, 8, 3, 3, NOSE);

    // Boca con lengua rosa
    if (open) {
      rect(c, 28, 12, 5, 2, OUT);
      rect(c, 29, 12, 3, 1, NOSE);
      rect(c, 30, 13, 2, 3, "#d9506a");
      px(c, 30, 13, "#f08aa0");
    } else {
      rect(c, 28, 12, 5, 1, OUT);
    }

    // Ojo negro grande
    rect(c, 26, 5, 2, 2, "#0a0a0a");

    // Oreja caída gris oscuro
    ellipse(c, 22, 9, 3, 4, OUT);
    ellipse(c, 22, 9, 2, 3, SPOT);
    px(c, 21, 8, GR_M);
  });
}

// Chelita: perrita pequeña color naranja/canela con cara, pecho y patitas blancas,
// orejita oscura, cola delgada levantada y lengua rosa (imagen de referencia).
// Mira a la derecha (se voltea con flip). Mismos parámetros que makeDog.
function makeChelita(leg, tail, open) {
  return sprite(34, 28, 16, 26, (c) => {
    const OUT = "#1a0c10";
    const OR = "#c8722e";
    const OR_L = "#e08a3c";
    const OR_D = "#a45a24";
    const CREAM = "#f0e2cc";
    const WHITE = "#fbf6ea";
    const NOSE = "#b04868";
    const TONGUE = "#e8607a";

    ellipse(c, 16, 26, 12, 2, "rgba(0,0,0,0.25)");

    // Cola delgada que sube y se curva; se mueve de lado a lado
    const tx = tail ? 2 : 4;
    const ty = tail ? 6 : 4;
    pline(c, 6, 14, 3, 9, OUT, 4);
    pline(c, 3, 9, tx, ty, OUT, 4);
    pline(c, 6, 14, 3, 9, OR, 2);
    pline(c, 3, 9, tx, ty, OR, 2);
    px(c, tx, ty, OR_D);

    // Patas (de atrás hacia adelante): atrás-lejana, delantera-lejana, atrás-cercana, delantera-cercana
    const lift = (p) =>
      (leg === 1 && p % 2 === 0) || (leg === 2 && p % 2 === 1) ? 2 : 0;
    const dx = (p) =>
      leg === 1
        ? p % 2 === 0
          ? 1
          : -1
        : leg === 2
          ? p % 2 === 0
            ? -1
            : 1
          : 0;
    const paw = (x, p, far) => {
      const l = lift(p);
      const xx = x + dx(p);
      const top = 16;
      const bot = 24 - l;
      rect(c, xx - 1, top, 5, bot - top + 1, OUT);
      rect(c, xx, top, 3, bot - top, far ? OR_D : OR);
      rect(c, xx, bot - 3, 3, 3, far ? CREAM : WHITE); // calcetín blanco
      rect(c, xx - 1, bot - 1, 5, 2, OUT);
      rect(c, xx, bot - 1, 3, 1, far ? CREAM : WHITE);
    };
    paw(9, 0, true); // trasera lejana
    paw(21, 1, true); // delantera lejana
    paw(6, 2, false); // trasera cercana
    paw(18, 3, false); // delantera cercana

    // Cuerpo con contorno
    ellipse(c, 15, 13, 11, 5, OUT);
    ellipse(c, 15, 13, 10, 4, OR);
    ellipse(c, 14, 10, 7, 1, OR_L); // luz en el lomo
    ellipse(c, 15, 16, 8, 1, OR_D); // sombra del vientre
    // Mancha más oscura en el lomo
    rect(c, 9, 9, 6, 2, OR_D);
    rect(c, 7, 11, 4, 2, OR_D);
    // Pecho blanco que baja por la pata delantera
    ellipse(c, 21, 15, 3, 3, WHITE);
    rect(c, 20, 17, 3, 2, WHITE);

    // Cuello y cabeza
    rect(c, 22, 6, 6, 9, OUT);
    rect(c, 23, 7, 4, 7, OR);
    disc(c, 26, 8, 6, OUT);
    disc(c, 26, 8, 5, OR);
    disc(c, 25, 6, 2, OR_L);
    // Franja blanca en la frente
    rect(c, 28, 4, 2, 3, WHITE);
    px(c, 29, 3, WHITE);

    // Hocico blanco con nariz oscura
    rect(c, 28, 8, 6, 5, OUT);
    rect(c, 28, 9, 5, 3, WHITE);
    rect(c, 32, 7, 2, 3, OUT);
    px(c, 32, 8, NOSE);
    px(c, 33, 8, NOSE);

    // Boca con lengua rosa
    if (open) {
      rect(c, 28, 12, 5, 2, OUT);
      rect(c, 29, 12, 3, 1, TONGUE);
      rect(c, 30, 13, 2, 3, TONGUE);
      px(c, 30, 13, "#f59ab0");
    } else {
      rect(c, 28, 12, 5, 1, OUT);
    }

    // Ojo negro
    rect(c, 26, 6, 2, 2, "#0a0a0a");

    // Orejita oscura levantada hacia atrás
    rect(c, 21, 1, 4, 5, OUT);
    rect(c, 22, 2, 2, 3, OR_D);
    px(c, 22, 2, OR);
  });
}

function makeDeer(graze) {
  return sprite(24, 28, 11, 26, (c) => {
    ellipse(c, 11, 26, 8, 2, "rgba(0,0,0,0.25)");
    [
      [5, 19],
      [8, 19],
      [14, 19],
      [17, 19],
    ].forEach(([x, y]) => rect(c, x, y, 1, 7, "#7a4a22"));
    ellipse(c, 11, 16, 8, 4, "#b6733a");
    ellipse(c, 11, 18, 7, 2, "#ecd3a4");
    px(c, 3, 13, "#ffffff");
    px(c, 2, 14, "#ffffff");
    if (graze) {
      // Cabeza baja, comiendo
      pline(c, 17, 14, 20, 21, "#b6733a", 3);
      disc(c, 20, 23, 3, "#b6733a");
      rect(c, 21, 24, 3, 2, "#d9a06a");
      px(c, 21, 22, "#1a1a1a");
      rect(c, 17, 20, 2, 2, "#b6733a");
      pline(c, 20, 20, 22, 15, "#eadcb4", 1);
      pline(c, 22, 20, 23, 17, "#eadcb4", 1);
    } else {
      pline(c, 17, 13, 19, 8, "#b6733a", 3);
      disc(c, 20, 7, 3, "#b6733a");
      rect(c, 21, 8, 3, 2, "#d9a06a");
      px(c, 23, 9, "#1a1a1a");
      px(c, 20, 6, "#1a1a1a");
      rect(c, 17, 4, 2, 2, "#b6733a");
      pline(c, 19, 4, 17, 0, "#eadcb4", 1);
      pline(c, 21, 4, 23, 0, "#eadcb4", 1);
      pline(c, 18, 2, 15, 2, "#eadcb4", 1);
      pline(c, 22, 2, 24, 3, "#eadcb4", 1);
    }
    [
      [8, 14],
      [11, 13],
      [14, 15],
      [6, 17],
      [12, 17],
    ].forEach(([x, y]) => px(c, x, y, "#f6e8c8"));
  });
}

function makeChest(open) {
  return sprite(20, 18, 10, 16, (c) => {
    ellipse(c, 10, 16, 9, 2, "rgba(0,0,0,0.3)");
    rect(c, 2, 7, 16, 9, "#3a1f0c");
    rect(c, 3, 8, 14, 7, "#a8662a");
    rect(c, 3, 13, 14, 2, "#7a4519");

    if (!open) {
      rect(c, 2, 3, 16, 5, "#3a1f0c");
      rect(c, 3, 4, 14, 4, "#c07b36");
      rect(c, 4, 3, 12, 1, "#3a1f0c");
      rect(c, 4, 4, 12, 1, "#d99a52");
    } else {
      rect(c, 2, 0, 16, 5, "#3a1f0c");
      rect(c, 3, 1, 14, 3, "#c07b36");
      rect(c, 3, 5, 14, 3, "#ffe28a");
      rect(c, 5, 5, 4, 2, "#fff6c8");
    }

    rect(c, 5, open ? 1 : 4, 2, open ? 14 : 11, "#f2c13d");
    rect(c, 13, open ? 1 : 4, 2, open ? 14 : 11, "#f2c13d");

    if (!open) {
      rect(c, 9, 7, 3, 4, "#f2c13d");
      px(c, 10, 8, "#f72585");
      px(c, 10, 9, "#ffd6e8");
    }
  });
}

function makeHammock() {
  return sprite(38, 22, 19, 20, (c) => {
    ellipse(c, 19, 20, 14, 2, "rgba(0,0,0,0.25)");
    rect(c, 3, 4, 3, 16, "#7a4a1f");
    rect(c, 3, 4, 1, 16, "#9c6330");
    rect(c, 32, 4, 3, 16, "#7a4a1f");
    rect(c, 32, 4, 1, 16, "#9c6330");

    for (let x = 6; x <= 32; x++) {
      const y = 7 + Math.round(5 * Math.sin((Math.PI * (x - 6)) / 26));
      const band = Math.floor((x - 6) / 3) % 2;
      rect(c, x, y, 1, 3, band ? "#ffe0ef" : "#f72585");
      px(c, x, y + 3, "#9d1457");
    }

    pline(c, 4, 4, 6, 7, "#d8c8a0", 1);
    pline(c, 33, 4, 31, 7, "#d8c8a0", 1);
  });
}

const SP = {};

// Sprite de coleccionable: se carga desde su imagen (con fondo transparente) y se
// escala sin suavizado para caber en 20x30 px, apoyado en el suelo
function makeCollectSprite(src, keyWhite) {
  const spr = sprite(24, 36, 12, 34, () => {});
  const img = new Image();
  img.onload = () => {
    const c = spr.cv.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 24, 36);
    const k = Math.min(20 / img.naturalWidth, 30 / img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    c.drawImage(img, Math.round((24 - w) / 2), 34 - h, w, h);
    if (keyWhite) clearWhiteBackground(c, 24, 36);
  };
  img.src = src;
  return spr;
}

// Quita el fondo blanco de un sprite JPG: borra solo el blanco conectado con los
// bordes (así no se pierden los brillos blancos del interior del dibujo)
function clearWhiteBackground(c, w, h) {
  let data;
  try {
    data = c.getImageData(0, 0, w, h);
  } catch (e) {
    return; // canvas "tainted" (abierto como file://): se deja el sprite tal cual
  }
  const d = data.data;
  const isBg = (x, y) => {
    const i = (y * w + x) * 4;
    // el pixel vacío (fuera de la imagen) también cuenta como fondo
    if (d[i + 3] === 0) return true;
    return d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p] || !isBg(x, y)) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p / w) | 0;
    d[p * 4 + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  c.putImageData(data, 0, 0);
}

// Hierba alta de jungla para las casillas de monte: mata densa y elevada con
// hojas largas y anchas. Es solo decoración (no se registra ningún bloqueo).
function makeMonteGrass(v) {
  return sprite(40, 32, 20, 24, (c) => {
    const r = mulberry32(900 + v * 37);
    const g = ["#08301f", "#0f4a31", "#1b6b47", "#35966a", "#7fc9a0"];
    ellipse(c, 20, 23, 15, 5, "rgba(10,40,10,0.35)");
    // masa baja y densa
    leafMass(c, 20, 16, 13, 5, 100 + v, g, 14, 4, 7);
    // hojas largas que sobresalen (de oscuro en la base a claro en la punta)
    for (let i = 0; i < 18; i++) {
      const bx = 20 + (r() - 0.5) * 28;
      const by = 19 + (r() - 0.5) * 8;
      if (Math.abs(bx - 20) / 15 + Math.abs(by - 19) / 7.5 > 1) continue;
      const h = 8 + r() * 10;
      const lean = (r() - 0.5) * 9;
      const mx = bx + lean * 0.4;
      const my = by - h * 0.55;
      const tx = bx + lean;
      const ty = by - h;
      pline(c, bx, by, mx, my, g[1], 2);
      pline(c, mx, my, tx, ty, g[2], 1);
      px(c, tx, ty, g[4]);
      px(c, mx, my - 1, g[3]);
    }
    // hojas anchas de selva
    for (let k = 0; k < 4; k++) {
      const lx = 20 + (r() - 0.5) * 22;
      const ly = 12 + r() * 6;
      ellipse(c, Math.round(lx), Math.round(ly) + 1, 5, 2, g[1]);
      ellipse(c, Math.round(lx), Math.round(ly), 5, 2, g[2]);
      ellipse(c, Math.round(lx) - 1, Math.round(ly) - 1, 3, 1, g[3]);
    }
    // frente: cubre la base de las hojas
    leafMass(c, 20, 20, 11, 3, 120 + v, g, 8, 3, 5);
    // alguna florecilla
    if (v % 2 === 1) {
      const fx = 14 + ((r() * 12) | 0);
      px(c, fx, 8, "#ff7aa8");
      px(c, fx + 1, 8, "#ffd166");
    }
  });
}

// Bote de madera sencillo (mira a la derecha; se voltea con flip). Se dibuja en dos
// capas: "back" (interior y borda trasera) y "front" (borda delantera y casco), para
// que el personaje quede metido dentro del bote. Ancla = centro de la borda.
function makeBoat() {
  const W = 46;
  const H = 30;
  const CX = 23;
  const CY = 13;
  const RX = 19;
  const RY = 6;
  const woodD = "#3a2210";
  const woodM = "#8a5a2e";
  const woodL = "#b9824a";
  const woodH = "#e0b070";
  const hullD = "#5e3a1a";
  const inner = "#6b4423";
  const innerD = "#4a2c14";

  // Perfil del bote en la columna x: centro vertical y media altura de la borda
  // (proa más angosta y puntas levantadas)
  const prof = (x) => {
    const u = (x - CX) / RX;
    if (Math.abs(u) > 1) return null;
    const hh = RY * Math.sqrt(1 - u * u) * (u > 0 ? 1 - 0.35 * u : 1);
    return { u, yc: CY - Math.round(3 * u * u), hh };
  };

  const back = sprite(W, H, CX, CY, (c) => {
    // sombra sobre el agua
    ellipse(c, CX, CY + 9, 20, 4, "rgba(0,30,70,0.28)");
    for (let x = 0; x < W; x++) {
      const p = prof(x);
      if (!p) continue;
      const top = Math.round(p.yc - p.hh);
      const bot = Math.round(p.yc + p.hh);
      for (let y = top; y <= bot; y++) {
        let col = inner;
        if (y === top) col = woodD;
        else if (y === top + 1) col = woodL;
        else if (x % 4 === 0)
          col = innerD; // tablones del fondo
        else if (hash2(x, y, 3) < 0.1) col = innerD;
        px(c, x, y, col);
      }
    }
    // dos bancas de madera atravesadas
    [-9, 7].forEach((dx) => {
      const p = prof(CX + dx);
      const hh = Math.floor(p.hh);
      rect(c, CX + dx, p.yc - hh + 2, 2, hh * 2 - 3, woodM);
      rect(c, CX + dx, p.yc - hh + 2, 2, 1, woodH);
    });
  });

  const front = sprite(W, H, CX, CY, (c) => {
    for (let x = 0; x < W; x++) {
      const p = prof(x);
      if (!p) continue;
      const fy = Math.round(p.yc + p.hh);
      const t = Math.max(1, Math.round(5 * (1 - Math.abs(p.u) ** 2)) + 1);
      px(c, x, fy, woodH); // borda delantera iluminada
      for (let k = 1; k <= t; k++) {
        let col = k === 1 ? woodL : k === t ? woodD : woodM;
        if (k > 1 && k < t) {
          if ((x + k * 3) % 11 === 0)
            col = hullD; // vetas
          else if (k >= t - 1) col = hullD;
        }
        px(c, x, fy + k, col);
      }
      // espuma en la línea de flotación
      if (hash2(x, 5, 9) < 0.4) px(c, x, fy + t + 1, "rgba(255,255,255,0.55)");
    }
    // proa y popa levantadas
    px(c, CX + RX, CY - 4, woodD);
    px(c, CX + RX - 1, CY - 4, woodL);
    px(c, CX - RX, CY - 4, woodD);
    px(c, CX - RX + 1, CY - 4, woodL);
    // cuerda enrollada en la proa
    rect(c, CX + 12, CY + 2, 3, 2, "#d8c8a0");
    px(c, CX + 13, CY + 2, "#a8946a");
  });

  return { back, front };
}

function buildSprites() {
  SP.ceiba = makeCeiba();
  SP.mangle = makeMangle();
  SP.despeinada = makeDespeinada();
  SP.makulis = makeMakulis();
  SP.chaka = makeChaka();
  SP.tolok = [makeTolok(false), makeTolok(true)];
  // El mono se dibuja a la mitad de su tamaño original
  SP.howler = [makeHowler(false), makeHowler(true)].map((s) =>
    scaleSprite(s, 0.5),
  );
  SP.bushes = [makeBush(1, false), makeBush(2, false), makeBush(3, false)];
  SP.dryBushes = [makeBush(4, true), makeBush(5, true)];
  SP.rocks = [makeRock(), makeRock()];
  SP.logs = {
    mid: [0, 1, 2].map((v) => makeLogSlice(false, v)),
    end: [0, 1, 2].map((v) => makeLogSlice(true, v)),
  };
  SP.flamingo = [makeFlamingo(false), makeFlamingo(true)];
  SP.flamingoFly = [makeFlamingoFly(0), makeFlamingoFly(1), makeFlamingoFly(2)];
  SP.jaguar = [makeJaguar(0), makeJaguar(1)];
  SP.alux = {
    stand: makeAlux(0, 0),
    walk: [makeAlux(1, 0), makeAlux(2, 0)],
    wind: makeAlux(0, 1),
    hit: makeAlux(0, 2),
  };
  // Se reduce (ALUX_SCALE) respecto al sprite original
  SP.alux.stand = scaleSprite(SP.alux.stand, ALUX_SCALE);
  SP.alux.walk = SP.alux.walk.map((s) => scaleSprite(s, ALUX_SCALE));
  SP.alux.wind = scaleSprite(SP.alux.wind, ALUX_SCALE);
  SP.alux.hit = scaleSprite(SP.alux.hit, ALUX_SCALE);
  // Huaypek: perro fantasma negro, apariencia propia (su comportamiento sigue
  // siendo el del alux: solo cambia cómo se ve)
  SP.huaypek = {
    stand: makeHuaypek(0, 0),
    walk: [makeHuaypek(1, 0), makeHuaypek(2, 0)],
    // aggro: corre en dos patas
    run: [makeHuaypekBiped("run0"), makeHuaypekBiped("run1")],
    wind: makeHuaypekBiped("wind"),
    hit: makeHuaypekBiped("hit"),
  };
  if (HUAYPEK_SCALE !== 1) {
    const k = HUAYPEK_SCALE;
    SP.huaypek.stand = scaleSprite(SP.huaypek.stand, k);
    SP.huaypek.walk = SP.huaypek.walk.map((q) => scaleSprite(q, k));
    SP.huaypek.run = SP.huaypek.run.map((q) => scaleSprite(q, k));
    SP.huaypek.wind = scaleSprite(SP.huaypek.wind, k);
    SP.huaypek.hit = scaleSprite(SP.huaypek.hit, k);
  }
  SP.huaychivo = {
    stand: makeHuaychivo(0, 0),
    idle: makeHuaychivo(4, 0),
    // Ciclo de 4 cuadros: paso izquierdo, erguido, paso derecho, erguido
    walk: [
      makeHuaychivo(1, 0),
      makeHuaychivo(3, 0),
      makeHuaychivo(2, 0),
      makeHuaychivo(3, 0),
    ],
    wind: makeHuaychivo(0, 1),
    hit: makeHuaychivo(0, 2),
  };
  // Se reduce (HUAYCHIVO_SCALE) respecto al sprite original
  SP.huaychivo.stand = scaleSprite(SP.huaychivo.stand, HUAYCHIVO_SCALE);
  SP.huaychivo.idle = scaleSprite(SP.huaychivo.idle, HUAYCHIVO_SCALE);
  SP.huaychivo.walk = SP.huaychivo.walk.map((s) =>
    scaleSprite(s, HUAYCHIVO_SCALE),
  );
  SP.huaychivo.wind = scaleSprite(SP.huaychivo.wind, HUAYCHIVO_SCALE);
  SP.huaychivo.hit = scaleSprite(SP.huaychivo.hit, HUAYCHIVO_SCALE);
  SP.kaskabal = {
    stand: makeKaskabal(0, 0),
    walk: [makeKaskabal(1, 0), makeKaskabal(2, 0)],
    wind: makeKaskabal(0, 1),
    hit: makeKaskabal(0, 2),
  };
  if (KASKABAL_SCALE !== 1) {
    SP.kaskabal.stand = scaleSprite(SP.kaskabal.stand, KASKABAL_SCALE);
    SP.kaskabal.walk = SP.kaskabal.walk.map((q) =>
      scaleSprite(q, KASKABAL_SCALE),
    );
    SP.kaskabal.wind = scaleSprite(SP.kaskabal.wind, KASKABAL_SCALE);
    SP.kaskabal.hit = scaleSprite(SP.kaskabal.hit, KASKABAL_SCALE);
  }
  SP.xtabay = {
    stand: makeXtabay(0, 0),
    walk: [makeXtabay(1, 0), makeXtabay(2, 0)],
    wind: makeXtabay(0, 1),
    hit: makeXtabay(0, 2),
    // Persiguiendo: aspecto revelado (como al atacar) con los brazos al frente
    chase: makeXtabay(0, 3),
    chaseWalk: [makeXtabay(1, 3), makeXtabay(2, 3)],
  };
  // Choco: parado (cola en 2 posiciones), contento (boca abierta) y caminando
  // Se reduce (DOG_SCALE) para que quede proporcionado con la exploradora
  const dogSet = (make, scale = DOG_SCALE) => {
    const small = (s) => scaleSprite(s, scale);
    return {
      stand: [make(0, 0, false), make(0, 1, false)].map(small),
      happy: [make(0, 0, true), make(0, 1, true)].map(small),
      walk: [make(1, 0, true), make(2, 1, true)].map(small),
      // tamaño para el recuerdo (conserva la proporción entre perros)
      big: scaleSprite(make(0, 0, true), scale / DOG_SCALE),
    };
  };
  SP.dogs = {
    choco: dogSet(makeDog),
    cleo: dogSet(makeCleo),
    chelita: dogSet(makeChelita, 0.57),
  };
  SP.deer = makeDeer(false);
  SP.deerGraze = makeDeer(true);
  SP.chest = [makeChest(false), makeChest(true)];
  SP.hammock = makeHammock();
  SP.pyramid = makePyramid();
  SP.stoneBlock = makeStoneBlock();
  SP.cathedral = makeCathedral();
  SP.houses = Array.from({ length: HOUSE_VARIANTS }, (_, v) => makeHouse(v));
  SP.mayaHouses = [0, 1, 2].map(makeMayaHouse);
  SP.lighthouse = makeLighthouse();
  SP.crop = makeCropPatch();
  SP.boat = makeBoat();
  SP.monteGrass = [0, 1, 2, 3].map(makeMonteGrass);
  SP.collect = {};
  COLLECT_DEFS.forEach(
    (d) => (SP.collect[d.type] = makeCollectSprite(d.sprite, d.keyWhite)),
  );
}

/* ---------- Mundo: objetos estáticos ---------- */
const statics = [];
const blockers = [];
// Obstáculos rectangulares alineados con la cuadrícula (troncos): { x0, y0, x1, y1 }.
// Como los bordes de la playa, tienen paredes rectas: el personaje se desliza
// a lo largo de ellos y no se atora (los círculos pegados dejan muescas).
const boxes = [];
function inBox(gx, gy) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (gx >= b.x0 && gx <= b.x1 && gy >= b.y0 && gy <= b.y1) return true;
  }
  return false;
}
const flamingos = [];
const flamingoGroups = []; // { members, gx, gy, fly } (gx, gy = hogar de la bandada)
let flamingoFrame = 0;
const sparks = [];
const particles = [];
const trees = []; // { gx, gy, r }: árboles a los que el mono puede trepar
const boats = []; // botes de madera (se colocan junto a un muelle en el editor)

const reserved = [{ gx: START_TILE.gx, gy: START_TILE.gy, r: 2.2 }];

function isReserved(gx, gy) {
  return reserved.some((r) => Math.hypot(gx - r.gx, gy - r.gy) < r.r);
}

function addStatic(spr, gx, gy, opts) {
  opts = opts || {};
  const t = tileAt(Math.round(gx), Math.round(gy));
  const o = {
    kind: "sprite",
    spr,
    gx,
    gy,
    depth: gx + gy,
    h: HEIGHT[t] ?? 2,
    canopy: !!opts.canopy,
    flip: !!opts.flip,
  };
  statics.push(o);
  if (opts.r) blockers.push({ gx, gy, r: opts.r });
  return o;
}

function spawnEntities() {
  treasures.forEach((t) => reserved.push({ gx: t.gx, gy: t.gy, r: 1.8 }));
  hammocks.forEach((h) => reserved.push({ gx: h.gx, gy: h.gy, r: 1.5 }));
  collectItems.forEach((g) => reserved.push({ gx: g.gx, gy: g.gy, r: 1.2 }));

  const byType = (type) => MAP_OBJECTS.filter((o) => o[0] === type);

  // 1. Catedrales y casas coloniales
  byType("catedral").forEach(([, gx, gy]) => {
    addStatic(SP.cathedral, gx, gy, { canopy: true, r: 1.4 * BUILD_SCALE });
    reserved.push({ gx, gy, r: 3.0 * BUILD_SCALE });
  });
  // ["casa", gx, gy, variante]: variante 0-4 (si falta, usa la 0)
  byType("casa").forEach(([, gx, gy, v], i) => {
    const spr = SP.houses[(v | 0) % HOUSE_VARIANTS];
    addStatic(spr, gx, gy, {
      canopy: true,
      r: 0.75 * BUILD_SCALE,
      flip: i % 2 === 1,
    });
    reserved.push({ gx, gy, r: 1.4 * BUILD_SCALE });
  });

  // Casas mayas de palma: ["casamaya", gx, gy, variante 0-2]
  byType("casamaya").forEach(([, gx, gy, v], i) => {
    addStatic(SP.mayaHouses[(v | 0) % SP.mayaHouses.length], gx, gy, {
      canopy: true,
      r: 0.6 * BUILD_SCALE,
      flip: i % 2 === 1,
    });
    reserved.push({ gx, gy, r: 1.3 * BUILD_SCALE });
  });

  // 2. Faros (el muelle ahora es terreno caminable, ver T_PIER)
  byType("faro").forEach(([, gx, gy]) => {
    addStatic(SP.lighthouse, gx, gy, {
      canopy: true,
      r: 1.1 * LIGHTHOUSE_SCALE,
    });
    reserved.push({ gx, gy, r: 2.0 * LIGHTHOUSE_SCALE });
  });

  // 3. Pirámides y cenotes
  byType("piramide").forEach(([, gx, gy]) => {
    addStatic(SP.pyramid, gx, gy, { canopy: true, r: 1.6 * BUILD_SCALE });
    reserved.push({ gx, gy, r: 3.0 * BUILD_SCALE });
  });
  CENOTES.forEach(([gx, gy]) => {
    blockers.push({ gx, gy, r: 1.45 * CENOTE_SCALE });
    reserved.push({ gx, gy, r: 2.5 * CENOTE_SCALE });
  });

  // 4. Milpas y hamacas
  byType("milpa").forEach(([, gx, gy]) => {
    addStatic(SP.crop, gx, gy);
    reserved.push({ gx, gy, r: 1.1 });
  });
  hammocks.forEach((h) => addStatic(SP.hammock, h.gx, h.gy));

  // Botes: ["bote", gx, gy], en agua profunda junto a un muelle
  byType("bote").forEach(([, gx, gy], i) => {
    boats.push({
      kind: "boat",
      gx,
      gy,
      h: tileH(gx, gy),
      depth: gx + gy,
      flip: i % 2 === 1,
      phase: gx * 1.7 + gy,
      occupied: false,
    });
    reserved.push({ gx, gy, r: 1.5 });
  });

  // 5. Flamencos
  byType("flamenco").forEach(([, gx, gy], i) => {
    flamingos.push({
      kind: "flamingo",
      gx,
      gy,
      depth: gx + gy,
      h: tileH(Math.round(gx), Math.round(gy)),
      phase: i * 1.4,
      flip: i % 2 === 0,

      // Comportamiento: bandada que come, se alerta en cadena y huye corto
      group: -1,
      state: "feed", // feed | alert | flee
      headDown: Math.random() < 0.5,
      headT: 30 + Math.random() * 120,
      moving: false,
      dirGx: 0,
      dirGy: 0,
      moveTimer: 0,
      pauseTimer: Math.random() * 120,
      alertT: 0,
      direct: false, // true si detectó el peligro él mismo (no por la bandada)
      reactT: 0,
      jitter: Math.random() * 12,
      calmTimer: 0,
      fleeDx: 0,
      fleeDy: 0,
      fleeStartGx: gx,
      fleeStartGy: gy,
      fleeLen: 5,
      fleeSide: 1,
    });
  });

  // Agrupar los flamencos cercanos en bandadas y calcular el centro de cada una
  flamingoGroups.length = 0;
  flamingos.forEach((f) => {
    let gi = flamingoGroups.findIndex((g) =>
      g.members.some((m) => Math.hypot(m.gx - f.gx, m.gy - f.gy) < 8),
    );
    if (gi < 0) {
      flamingoGroups.push({ members: [], gx: 0, gy: 0 });
      gi = flamingoGroups.length - 1;
    }
    f.group = gi;
    flamingoGroups[gi].members.push(f);
  });
  flamingoGroups.forEach((g) => {
    g.gx = g.members.reduce((a, m) => a + m.gx, 0) / g.members.length;
    g.gy = g.members.reduce((a, m) => a + m.gy, 0) / g.members.length;
  });

  // 6. Venados
  byType("venado").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.deer, gx, gy, { flip: i % 2 === 1 });
    o.kind = "deer";
    o.phase = gx;

    // Comportamiento: pasta cerca de su "hogar", se alerta y huye
    o.homeGx = gx;
    o.homeGy = gy;
    o.state = "graze"; // graze | alert | flee | look
    o.eating = false;
    o.walking = false;
    o.dirGx = 0;
    o.dirGy = 0;
    o.moveTimer = 0;
    o.pauseTimer = 30 + Math.random() * 120;
    o.alertT = 0;
    o.calmTimer = 0;
    o.lookTimer = 0;
    o.fleeSide = 1;
    o.hopT = 0;
    o.hop = 0;
  });

  // 6a. Perros (Choco y Cleo): de cada raza solo existe uno (aunque el mapa traiga
  // más objetos de ese tipo, se usa el primero). Siguen a la exploradora a todas partes.
  DOG_KINDS.forEach((cfg) =>
    byType(cfg.type)
      .slice(0, MAX_DOGS)
      .forEach(([, gx, gy]) => {
        const o = addStatic(SP.dogs[cfg.key].stand[0], gx, gy);
        o.kind = "dog";
        o.name = cfg.name;
        o.cfg = cfg;
        o.sp = SP.dogs[cfg.key];
        o.phase = gx * 1.9 + gy;
        o.moving = false;
        o.running = false;
        o.found = false; // se queda quieto hasta que la exploradora lo encuentre
        o.escT = 0; // frames que lleva rodeando un obstáculo
        o.escDx = 0;
        o.escDy = 0;
        o.stuck = 0;
        o.barkT = 240 + Math.random() * 300; // cuenta atrás para ladrar
        o.barkLeft = 0; // frames que muestra el "¡GUAU!"
        o.idleT = 0;
        o.fleeSide = 1;
        o.dirGx = 0;
        o.dirGy = 0;
        dogs.push(o);
        reserved.push({ gx, gy, r: 1.2 });
      }),
  );

  // 6b. Jaguar: deambula por el mapa y huye del jugador
  byType("jaguar").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.jaguar[0], gx, gy, {
      flip: i % 2 === 1,
    });

    o.kind = "jaguar";
    o.phase = gx * 1.7 + gy;

    // Dirección y tiempos de movimiento
    o.dirGx = 0;
    o.dirGy = 0;
    o.moveTimer = 50 + Math.random() * 90;
    o.pauseTimer = 20 + Math.random() * 50;

    // Estado de huida
    o.fleeing = false;
  });

  // 6b2. Alux (hostil): vive en una zona circular (ALUX_ZONE) alrededor de su punto de
  // origen. Si el jugador entra en su zona y a menos de ALUX_VISION casillas, lo
  // persigue y lo ataca; nunca sale de su zona.
  byType("alux").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.alux.stand, gx, gy, { flip: i % 2 === 1 });
    o.kind = "alux";
    o.phase = gx * 1.5 + gy;
    o.homeGx = gx;
    o.homeGy = gy;
    o.state = "idle"; // idle | chase | windup | recover | return
    o.moving = false;
    o.dirGx = 0;
    o.dirGy = 0;
    o.moveTimer = 0;
    o.pauseTimer = 30 + Math.random() * 90;
    o.atkT = 0; // cuenta atrás del golpe
    o.coolT = 0; // pausa tras golpear
    o.hitT = 0; // frames que muestra la pose de golpe
    o.spotT = 0; // frames que muestra el aviso "¡!"
    o.fleeSide = 1; // lado preferido para rodear obstáculos
    // Parámetros de comportamiento (los comparte con el kaskabal)
    o.vision = ALUX_VISION;
    o.zone = ALUX_ZONE;
    o.reach = ALUX_REACH;
    o.speed = ALUX_SPEED;
    o.windup = ALUX_WINDUP;
    o.damage = ALUX_DAMAGE;
    o.sep = ALUX_SEP;
    o.monteOnly = false;
    reserved.push({ gx, gy, r: 1.5 });
  });

  // 6b2b. Huaychivo (hostil): por ahora igual que el alux: vive en una zona circular
  // (HUAYCHIVO_ZONE) alrededor de su punto de origen; si el jugador entra en su zona y a
  // menos de HUAYCHIVO_VISION casillas, lo persigue y lo ataca; nunca sale de su zona.
  byType("huaychivo").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.huaychivo.stand, gx, gy, { flip: i % 2 === 1 });
    o.kind = "huaychivo";
    o.phase = gx * 1.5 + gy;
    o.homeGx = gx;
    o.homeGy = gy;
    o.state = "idle"; // idle | chase | windup | recover | return
    o.moving = false;
    o.dirGx = 0;
    o.dirGy = 0;
    o.moveTimer = 0;
    o.pauseTimer = 30 + Math.random() * 90;
    o.atkT = 0; // cuenta atrás del golpe
    o.coolT = 0; // pausa tras golpear
    o.hitT = 0; // frames que muestra la pose de golpe
    o.spotT = 0; // frames que muestra el aviso "¡!"
    o.fleeSide = 1; // lado preferido para rodear obstáculos
    o.vision = HUAYCHIVO_VISION;
    o.zone = HUAYCHIVO_ZONE;
    o.reach = HUAYCHIVO_REACH;
    o.speed = HUAYCHIVO_SPEED;
    o.windup = HUAYCHIVO_WINDUP;
    o.damage = HUAYCHIVO_DAMAGE;
    o.sep = HUAYCHIVO_SEP;
    o.monteOnly = false;
    o.usePath = true; // como los perros: calcula una ruta (A*) y rodea troncos, rocas y agua
    reserved.push({ gx, gy, r: 1.5 });
  });

  // 6b2c. Huaypek (hostil): por ahora igual que el alux: vive en una zona circular
  // (HUAYPEK_ZONE) alrededor de su punto de origen; si el jugador entra en su zona y a
  // menos de HUAYPEK_VISION casillas, lo persigue y lo ataca; nunca sale de su zona.
  byType("huaypek").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.huaypek.stand, gx, gy, { flip: i % 2 === 1 });
    o.kind = "huaypek";
    o.phase = gx * 1.5 + gy;
    o.homeGx = gx;
    o.homeGy = gy;
    o.state = "idle"; // idle | chase | windup | recover | return
    o.moving = false;
    o.dirGx = 0;
    o.dirGy = 0;
    o.moveTimer = 0;
    o.pauseTimer = 30 + Math.random() * 90;
    o.atkT = 0; // cuenta atrás del golpe
    o.coolT = 0; // pausa tras golpear
    o.hitT = 0; // frames que muestra la pose de golpe
    o.spotT = 0; // frames que muestra el aviso "¡!"
    o.fleeSide = 1; // lado preferido para rodear obstáculos
    o.vision = HUAYPEK_VISION;
    o.zone = HUAYPEK_ZONE;
    o.reach = HUAYPEK_REACH;
    o.speed = HUAYPEK_SPEED;
    o.windup = HUAYPEK_WINDUP;
    o.damage = HUAYPEK_DAMAGE;
    o.sep = HUAYPEK_SEP;
    o.monteOnly = false;
    reserved.push({ gx, gy, r: 1.5 });
  });

  // 6b3. Kaskabal (hostil): igual que el alux pero más grande, con mayor radio de
  // visión, y solo se desplaza sobre casillas de monte (nunca pisa otro terreno).
  byType("kaskabal").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.kaskabal.stand, gx, gy, { flip: i % 2 === 1 });
    o.kind = "kaskabal";
    o.phase = gx * 1.5 + gy;
    o.homeGx = gx;
    o.homeGy = gy;
    o.state = "idle"; // idle | chase | windup | recover | return
    o.moving = false;
    o.dirGx = 0;
    o.dirGy = 0;
    o.moveTimer = 0;
    o.pauseTimer = 30 + Math.random() * 90;
    o.atkT = 0;
    o.coolT = 0;
    o.hitT = 0;
    o.spotT = 0;
    o.fleeSide = 1;
    o.vision = KASKABAL_VISION;
    o.zone = KASKABAL_ZONE;
    o.reach = KASKABAL_REACH;
    o.speed = KASKABAL_SPEED;
    o.windup = KASKABAL_WINDUP;
    o.damage = KASKABAL_DAMAGE;
    o.sep = KASKABAL_SEP;
    o.monteOnly = true; // solo camina sobre monte
    o.usePath = true; // sigue una ruta por casillas (A*) en vez de ir en línea recta
    o.free = true; // sin zona ni punto de regreso: pasea por el monte y su visión lo acompaña
    reserved.push({ gx, gy, r: 2.5 });
  });

  // 6b4. Xtabay (hostil): igual que el kaskabal, pasea libremente (su visión se
  // mueve con ella, nunca vuelve a su punto de aparición) y el único terreno que
  // tiene vedado es el agua (lo impone ya walkable()/landAt() con cualquier otra
  // casilla transitable).
  byType("xtabay").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.xtabay.stand, gx, gy, { flip: i % 2 === 1 });
    o.kind = "xtabay";
    o.phase = gx * 1.5 + gy;
    o.homeGx = gx;
    o.homeGy = gy;
    o.state = "idle"; // idle | chase | windup | recover | return
    o.moving = false;
    o.dirGx = 0;
    o.dirGy = 0;
    o.moveTimer = 0;
    o.pauseTimer = 30 + Math.random() * 90;
    o.atkT = 0;
    o.coolT = 0;
    o.hitT = 0;
    o.spotT = 0;
    o.fleeSide = 1;
    o.vision = XTABAY_VISION;
    o.zone = XTABAY_ZONE;
    o.reach = XTABAY_REACH;
    o.speed = XTABAY_SPEED;
    o.windup = XTABAY_WINDUP;
    o.damage = XTABAY_DAMAGE;
    o.sep = XTABAY_SEP;
    o.monteOnly = false;
    o.usePath = true; // como los perros: calcula una ruta (A*) y rodea el agua/obstáculos
    o.free = true; // sin zona ni punto de regreso: su visión la acompaña a donde vaya
    reserved.push({ gx, gy, r: 1.5 });
  });

  // 6c. Tolok: toma el sol casi siempre, se congela si te acercas y huye a ráfagas cortas
  byType("tolok").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.tolok[0], gx, gy, { flip: i % 2 === 0 });
    o.kind = "tolok";
    o.phase = gx * 1.3 + gy;

    o.homeGx = gx;
    o.homeGy = gy;
    o.state = "bask"; // bask | freeze | dash | flee
    o.moving = false;
    o.idleTimer = 80 + Math.random() * 300;
    o.dashDx = 0;
    o.dashDy = 0;
    o.dashLeft = 0;
    o.alertT = 0;
    o.calmTimer = 0;
    o.burstT = 0;
    o.pauseT = 0;
    o.fleeSide = 1;
  });

  // 6d. Mono aullador: descansa, aúlla, vigila, regaña y trepa al árbol si te pegas mucho
  byType("mono").forEach(([, gx, gy], i) => {
    const o = addStatic(SP.howler[0], gx, gy, { flip: i % 2 === 1 });
    o.kind = "howler";
    o.phase = gx * 1.1 + gy;

    o.state = "rest"; // rest | watch | scold | climb | up | hidden | down
    o.howlT = 150 + Math.random() * 900; // cuenta atrás para el próximo aullido
    o.howlLeft = 0; // frames que le quedan aullando
    o.answerT = 0; // retraso para contestar el aullido de otro mono
    o.turnT = 150 + Math.random() * 300;
    o.scoldT = 0; // cuánto lleva regañando con el jugador pegado
    o.climbCool = 0; // enfriamiento antes de volver a trepar
    o.tree = null;
    o.stuck = 0;
    o.z = 0; // altura sobre el suelo al trepar
    o.hiddenT = 0;
    o.hop = 0;
  });

  // 7. Vegetación puesta a mano en el editor
  byType("arbusto").forEach(([, gx, gy], i) =>
    addStatic(SP.bushes[i % 3], gx, gy),
  );
  // Árboles de la península (el tronco bloquea; la copa se vuelve translúcida)
  [
    ["ceiba", SP.ceiba, 0.7],
    ["mangle", SP.mangle, 0.5],
    ["despeinada", SP.despeinada, 0.4],
    ["makulis", SP.makulis, 0.4],
    ["chaka", SP.chaka, 0.4],
  ].forEach(([type, spr, rad]) =>
    byType(type).forEach(([, gx, gy], i) => {
      addStatic(spr, gx, gy, { canopy: true, r: rad, flip: i % 2 === 1 });
      trees.push({ gx, gy, r: rad });
    }),
  );
  // Las rocas del editor bloquean su casilla completa (caja de paredes rectas),
  // así varias seguidas forman una barrera continua y el personaje se desliza
  byType("roca").forEach(([, gx, gy], i) => {
    addStatic(SP.rocks[i % 2], gx, gy);
    boxes.push({ x0: gx - 0.5, x1: gx + 0.5, y0: gy - 0.5, y1: gy + 0.5 });
  });
  // Troncos: ["tronco", gx, gy, largo 1-4, dir]  (dir 0 = hacia +gx, 1 = hacia +gy)
  // Una rebanada por casilla para dibujar; el paso lo bloquea una sola caja
  // rectangular (paredes rectas: el personaje se desliza sin atorarse).
  byType("tronco").forEach(([, gx, gy, n, d], k) => {
    const len = Math.max(1, Math.min(4, n | 0 || 1));
    const dir = d === 1 ? 1 : 0;
    const HW_LOG = 0.45; // medio ancho de la caja (un poco menos que la casilla)
    boxes.push(
      dir
        ? { x0: gx - HW_LOG, x1: gx + HW_LOG, y0: gy - 0.5, y1: gy + len - 0.5 }
        : {
            x0: gx - 0.5,
            x1: gx + len - 0.5,
            y0: gy - HW_LOG,
            y1: gy + HW_LOG,
          },
    );
    for (let i = 0; i < len; i++) {
      const tx = gx + (dir ? 0 : i);
      const ty = gy + (dir ? i : 0);
      const spr = (i === len - 1 ? SP.logs.end : SP.logs.mid)[(k + i) % 3];
      addStatic(spr, tx, ty, { flip: dir === 1 });
      reserved.push({ gx: tx, gy: ty, r: 0.8 });
    }
  });

  // 8. Decoración aleatoria opcional (RANDOM_DECOR = true para activarla)
  if (RANDOM_DECOR) {
    const rng = mulberry32(20261113);

    for (let gy = 0; gy < MAP_H; gy++) {
      for (let gx = 0; gx < MAP_W; gx++) {
        const t = mapGrid[gy][gx];
        if (t !== T_GRASS && t !== T_SAND) continue;
        if (isReserved(gx, gy)) continue;

        const jx = (rng() - 0.5) * 0.5;
        const jy = (rng() - 0.5) * 0.5;
        const rr = rng();
        const pick = rng();
        const x = gx + jx;
        const y = gy + jy;

        if (t === T_GRASS) {
          if (rr < 0.095) {
            addStatic(SP.bushes[(pick * 3) | 0], x, y);
          } else if (rr < 0.115) {
            addStatic(SP.rocks[(pick * 2) | 0], x, y, { r: 0.25 });
          }
        } else if (t === T_SAND) {
          if (rr < 0.04) {
            addStatic(SP.dryBushes[(pick * 2) | 0], x, y);
          } else if (rr < 0.06) {
            addStatic(SP.rocks[(pick * 2) | 0], x, y, { r: 0.25 });
          }
        }
      }
    }
  }

  // 9. (Sin guardianes: los cofres ya no generan enemigos)

  // 9b. Monte: hierba alta decorativa (sin colisión: no se agregan blockers)
  for (let gy = 0; gy < MAP_H; gy++) {
    for (let gx = 0; gx < MAP_W; gx++) {
      if (mapGrid[gy][gx] !== T_MONTE) continue;
      if (isReserved(gx, gy)) continue;
      addStatic(SP.monteGrass[(hash2(gx, gy, 31) * 4) | 0], gx, gy, {
        flip: hash2(gx, gy, 32) > 0.5,
      });
    }
  }

  // 10. Destellos en lagunas, playas y cenotes
  const sr = mulberry32(77);
  for (let gy = 0; gy < MAP_H; gy++) {
    for (let gx = 0; gx < MAP_W; gx++) {
      const t = mapGrid[gy][gx];
      if (t === T_SHALLOW_SEA) continue; // el mar no lleva destellos
      if (t !== T_LAGOON && t !== T_PINK && !isShallow(t)) continue;
      for (let k = 0; k < 2; k++) {
        sparks.push({
          x: wx(gx, gy) + Math.round((sr() - 0.5) * 16),
          y: wy(gx, gy) - Math.round(0.5 * U) + Math.round((sr() - 0.5) * 6),
          p: sr() * 6.28,
        });
      }
    }
  }

  CENOTES.forEach(([cgx, cgy]) => {
    const cx = wx(cgx, cgy);
    const cy = wy(cgx, cgy) - Math.round(tileH(cgx, cgy) * U);
    for (let k = 0; k < 9; k++) {
      const a = sr() * 6.28;
      const rad = sr() * 0.8;
      sparks.push({
        x: cx + Math.round(Math.cos(a) * rad * 0.55 * 34 * CENOTE_SCALE),
        y:
          cy +
          Math.round((0.22 + Math.sin(a) * rad * 0.38) * 17 * CENOTE_SCALE),
        p: sr() * 6.28,
      });
    }
  });
}

/* ---------- HUD ---------- */
function updateHUD() {
  healthDisplay.innerText = Array.from({ length: MAX_HEALTH }, (_, i) =>
    i < health ? "❤️" : "🖤",
  ).join(" ");

  const gl = collectibles
    .filter((g) => g.items.length)
    .map((g) => ` | ${g.def.emoji} ${g.count}/${g.items.length}`)
    .join("");
  itemDisplay.innerText = `🥐 ${foundCount}/${treasures.length}${gl} | ✨ Xix:${xixCount}`;
}

/* ---------- Controles ---------- */
let keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

function setupControls() {
  const bindHold = (id, keyName) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      keys[keyName] = true;
    });

    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      keys[keyName] = false;
    });
    btn.addEventListener("touchcancel", () => (keys[keyName] = false));
    btn.addEventListener("mousedown", () => (keys[keyName] = true));
    btn.addEventListener("mouseup", () => (keys[keyName] = false));
    btn.addEventListener("mouseleave", () => (keys[keyName] = false));
  };

  const bindPress = (id, fn) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      fn();
    });
    btn.addEventListener("mousedown", fn);
  };

  bindHold("btnUp", "up");
  bindHold("btnDown", "down");
  bindHold("btnLeft", "left");
  bindHold("btnRight", "right");

  bindPress("btnA", actionA);
  bindPress("btnB", attack);

  window.addEventListener("keydown", (e) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }

    if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "KeyE") actionA();
    if (e.code === "KeyX" || e.code === "KeyK") attack();
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  });
}

/* ---------- Partículas ---------- */
function burst(gx, gy, h, colors, n) {
  const x = WX0 + (gx - gy) * HW;
  const y = WY0 + (gx + gy) * HH - h * U - 12;

  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.5 + Math.random() * 1.6;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1.2,
      life: 28 + Math.random() * 14,
      col: colors[(Math.random() * colors.length) | 0],
    });
  }
}

/* ---------- Interacción ---------- */
function checkChestInteraction() {
  if (isPaused) return false;
  let opened = false;

  treasures.forEach((chest) => {
    const dist = Math.hypot(player.gx - chest.gx, player.gy - chest.gy);

    if (dist < 1.3 && !chest.opened && !opened) {
      chest.opened = true;
      // El recuerdo depende del orden en que se abren los cofres, no de su posición
      const mem = MEMORIES[foundCount];
      chest.image = mem.image;
      chest.title = mem.title;
      chest.message = mem.message;
      foundCount++;
      updateHUD();
      burst(
        chest.gx,
        chest.gy,
        tileH(chest.gx, chest.gy),
        ["#ffd166", "#f72585", "#ffffff", "#ffe28a"],
        18,
      );
      openMemoryModal(chest);
      opened = true;
    }
  });
  return opened;
}

// Casilla de muelle más cercana (dentro de maxD) a un punto, o null
function nearestPierTile(gx, gy, maxD) {
  let best = null;
  let bd = maxD;
  const r = Math.ceil(maxD);
  for (let y = Math.round(gy) - r; y <= Math.round(gy) + r; y++) {
    for (let x = Math.round(gx) - r; x <= Math.round(gx) + r; x++) {
      if (tileAt(x, y) !== T_PIER) continue;
      const d = Math.hypot(x - gx, y - gy);
      if (d < bd) {
        bd = d;
        best = { gx: x, gy: y };
      }
    }
  }
  return best;
}

// Bote al que se puede subir: solo si el jugador está parado en un muelle y el
// bote está pegado a él
function boatToBoard() {
  if (player.boat) return null;
  if (tileAt(Math.round(player.gx), Math.round(player.gy)) !== T_PIER)
    return null;
  let best = null;
  let bd = 2.2;
  boats.forEach((b) => {
    if (b.occupied) return;
    const d = Math.hypot(b.gx - player.gx, b.gy - player.gy);
    if (d < bd) {
      bd = d;
      best = b;
    }
  });
  return best;
}

// Con A: subir al bote desde un muelle, o bajar de él pasando a un muelle.
// Devuelve true si la acción fue del bote (así no salta ni abre cofres).
function tryBoat() {
  if (player.boat) {
    const b = player.boat;
    const pier = nearestPierTile(b.gx, b.gy, 2.2);
    if (pier) {
      player.gx = pier.gx;
      player.gy = pier.gy;
      b.occupied = false;
      player.boat = null;
      // Los perros bajan del bote junto a la exploradora (cada uno en su casilla)
      const taken = [];
      dogs.forEach((dog) => {
        if (!dog.inBoat) return;
        dog.inBoat = false;
        let best = { gx: pier.gx, gy: pier.gy };
        let bd = Infinity;
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            const cx = pier.gx + ox;
            const cy = pier.gy + oy;
            const dd = Math.hypot(ox, oy);
            if (dd < 0.9 || dd >= bd || !walkable(cx, cy)) continue;
            if (taken.some((t) => t.gx === cx && t.gy === cy)) continue;
            bd = dd;
            best = { gx: cx, gy: cy };
          }
        }
        taken.push(best);
        dog.gx = best.gx;
        dog.gy = best.gy;
        dog.moving = false;
        burst(dog.gx, dog.gy, tileH(dog.gx, dog.gy), dog.cfg.boatSparks, 8);
      });
    } else {
      player.msgT = 110; // solo se puede bajar en un muelle
    }
    return true;
  }
  const b = boatToBoard();
  if (!b) return false;
  b.occupied = true;
  player.boat = b;
  player.gx = b.gx;
  player.gy = b.gy;
  // Si ya encontró a Choco y/o a Cleo, suben al bote con ella
  dogs.forEach((dog) => {
    if (!dog.found) return;
    dog.inBoat = true;
    dog.moving = false;
    dog.running = false;
    dog.escT = 0;
    burst(b.gx, b.gy, tileH(b.gx, b.gy), dog.cfg.boatSparks, 8);
  });
  player.jumpT = 0;
  player.z = 0;
  return true;
}

// Agua por donde navega el bote: mar, laguna y laguna rosa (no playa), dentro del mapa
function sailable(gx, gy) {
  const rx = Math.round(gx);
  const ry = Math.round(gy);
  if (rx < 0 || ry < 0 || rx >= MAP_W || ry >= MAP_H) return false;
  const t = mapGrid[ry][rx];
  if (t !== T_WATER && t !== T_LAGOON && t !== T_PINK) return false;
  for (let i = 0; i < blockers.length; i++) {
    const b = blockers[i];
    if (Math.hypot(gx - b.gx, gy - b.gy) < b.r) return false;
  }
  if (inBox(gx, gy)) return false;
  return true;
}

function actionA() {
  if (isPaused) return;
  if (tryBoat()) return;
  if (!checkChestInteraction()) {
    if (player.jumpT === 0) player.jumpT = 1;
  }
}

// Terreno transitable: tierra, monte, playas (agua somera) y muelle
function landAt(gx, gy) {
  const t = tileAt(Math.round(gx), Math.round(gy));
  return (
    t === T_SAND ||
    t === T_GRASS ||
    t === T_PATH ||
    t === T_MONTE ||
    t === T_PIER ||
    isShallow(t)
  );
}

// Botón B: mandoble de espada. Golpea a los enemigos que estén al frente y al alcance.
function attack() {
  if (isPaused || player.attackT > 0 || player.faintT > 0 || player.boat)
    return;
  player.attackT = SWORD_COOLDOWN;
  const ax = player.aimGx;
  const ay = player.aimGy;
  statics.forEach((o) => {
    if (!o.maxHp || o.dead) return;
    const dx = o.gx - player.gx;
    const dy = o.gy - player.gy;
    const d = Math.hypot(dx, dy);
    if (d > SWORD_REACH) return;
    // Al frente (semicírculo); si está pegado a ella, también lo alcanza
    if (d > 0.7 && (dx * ax + dy * ay) / d < 0) return;
    damageEnemy(
      o,
      SWORD_DAMAGE,
      d > 0.001 ? dx / d : ax,
      d > 0.001 ? dy / d : ay,
    );
  });
}

// Un enemigo recibe daño: se aturde y retrocede; con 0 corazones muere
function damageEnemy(o, dmg, nx, ny) {
  o.hp -= dmg;
  o.hurtT = 18;
  burst(o.gx, o.gy, o.h, ["#ffffff", "#ffd166", "#ff595e"], 7);
  if (o.hp <= 0) {
    o.hp = 0;
    o.dead = true;
    o.dieT = ENEMY_DIE_FRAMES;
    o.state = "dead";
    o.moving = false;
    burst(o.gx, o.gy, o.h, ["#ffffff", "#c8b6ff", "#74c69d", "#ffd166"], 22);
    return;
  }
  // Retroceso y aturdimiento: se interrumpe el golpe que preparaba
  o.kbX = nx * ENEMY_KNOCKBACK;
  o.kbY = ny * ENEMY_KNOCKBACK;
  o.kbT = 8;
  if (o.state === "windup" || o.state === "chase") {
    o.state = "recover";
    o.coolT = ENEMY_STUN;
    o.atkT = 0;
  } else if (o.state === "idle" || o.state === "return") {
    o.state = "chase"; // al ser atacado, se enfurece
    o.spotT = 40;
  }
}

// Da corazones a cada enemigo según su tipo (ver ENEMY_HP)
function initEnemyHp() {
  statics.forEach((o) => {
    const hp = ENEMY_HP[o.kind];
    if (!hp) return;
    o.maxHp = hp;
    o.hp = hp;
    o.hurtT = 0;
    o.dead = false;
  });
}

function openMemoryModal(chest, badge) {
  isPaused = true;
  keys = { up: false, down: false, left: false, right: false };
  memoryBadge.innerText = badge || "* TESORO ENCONTRADO *";
  const alts = chest.alts || [];
  let altI = 0;
  memoryImg.onerror = () => {
    if (altI < alts.length) memoryImg.src = alts[altI++];
    else memoryImg.onerror = null;
  };
  memoryImg.src = chest.image;
  // La imagen del globito es vertical: se muestra completa sobre fondo blanco
  memoryImg.style.objectFit = chest.contain ? "contain" : "cover";
  memoryImg.parentElement.style.background = chest.contain ? "#fff" : "";
  memoryTitle.innerText = chest.title;
  memoryMessage.innerText = chest.message;
  memoryModal.classList.remove("hidden");
}

// Recoger coleccionables al acercarse: el 1.º y el último abren la leyenda;
// los demás solo actualizan el contador
function checkCollect() {
  collectibles.forEach((grp) => {
    grp.items.forEach((g) => {
      if (g.collected) return;
      if (Math.hypot(player.gx - g.gx, player.gy - g.gy) > 0.9) return;
      g.collected = true;
      grp.count++;
      updateHUD();
      burst(g.gx, g.gy, tileH(g.gx, g.gy), grp.def.sparks, 14);
      const all = grp.count === grp.items.length;
      if ((all || grp.count === 1) && !isPaused) {
        const t = all ? grp.def.all : grp.def.first;
        openMemoryModal(
          {
            image: grp.def.image,
            alts: grp.def.alts,
            title: t.title,
            message: t.message,
            contain: true,
          },
          t.badge,
        );
      }
    });
  });
}

closeModalBtn.addEventListener("click", () => {
  memoryModal.classList.add("hidden");
  isPaused = false;
});

/* ---------- Lógica ---------- */
function walkable(gx, gy) {
  if (!landAt(gx, gy)) return false;

  for (let i = 0; i < blockers.length; i++) {
    const b = blockers[i];
    if (Math.hypot(gx - b.gx, gy - b.gy) < b.r) return false;
  }
  if (inBox(gx, gy)) return false;
  return true;
}

// ---------- Ruta de los perros (A* sobre casillas) ----------
// Los perros ya no avanzan "a ciegas" hacia la exploradora: calculan una ruta por
// casillas transitables, así retroceden y rodean el agua o los obstáculos en vez
// de atorarse contra ellos. Los obstáculos son fijos, así que se guarda en caché
// si cada casilla es transitable.
const dogTileCache = new Map();
function dogTileOK(x, y) {
  const k = (x + 512) * 2048 + (y + 512);
  let v = dogTileCache.get(k);
  if (v === undefined) {
    v = walkable(x, y);
    dogTileCache.set(k, v);
  }
  return v;
}

// ¿Se puede ir en línea recta de A a B sin salir del camino?
function dogLineClear(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.3);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!walkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// Devuelve la lista de casillas (sin la inicial) hasta la meta. okFn (opcional) dice
// qué casillas son transitables; por defecto, las de los perros. Si la meta no se
// puede alcanzar (p. ej. está al otro lado del agua), devuelve la ruta hasta la
// casilla alcanzable más cercana a ella.
function findDogPath(sx, sy, tx, ty, okFn) {
  const ok = okFn || dogTileOK;
  const S = { x: Math.round(sx), y: Math.round(sy) };
  const G = { x: Math.round(tx), y: Math.round(ty) };
  if (S.x === G.x && S.y === G.y) return [];
  const MAX_EXPAND = 2500;
  const key = (x, y) => (x + 512) * 2048 + (y + 512);
  const hOf = (x, y) => {
    const ddx = Math.abs(x - G.x);
    const ddy = Math.abs(y - G.y);
    return Math.max(ddx, ddy) + 0.414 * Math.min(ddx, ddy);
  };
  const goalOK = ok(G.x, G.y);

  const nodes = new Map();
  const start = { x: S.x, y: S.y, g: 0, f: hOf(S.x, S.y), parent: null };
  nodes.set(key(S.x, S.y), start);
  const heap = [start];
  const up = (i) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].f <= heap[i].f) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const down = (i) => {
    for (;;) {
      let m = i;
      const l = 2 * i + 1;
      const r = l + 1;
      if (l < heap.length && heap[l].f < heap[m].f) m = l;
      if (r < heap.length && heap[r].f < heap[m].f) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  };

  let best = start;
  let bestH = hOf(S.x, S.y);
  let end = null;
  let expanded = 0;
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  while (heap.length && expanded < MAX_EXPAND) {
    const cur = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      down(0);
    }
    if (cur.closed) continue;
    cur.closed = true;
    expanded++;
    const h = hOf(cur.x, cur.y);
    if (h < bestH - 1e-6 || (Math.abs(h - bestH) < 1e-6 && cur.g < best.g)) {
      best = cur;
      bestH = h;
    }
    if (
      (cur.x === G.x && cur.y === G.y) ||
      (!goalOK && Math.abs(cur.x - G.x) <= 1 && Math.abs(cur.y - G.y) <= 1)
    ) {
      end = cur;
      break;
    }
    for (let i = 0; i < 8; i++) {
      const nx = cur.x + DIRS[i][0];
      const ny = cur.y + DIRS[i][1];
      if (!ok(nx, ny)) continue;
      const diag = i >= 4;
      if (
        diag &&
        (!ok(cur.x + DIRS[i][0], cur.y) || !ok(cur.x, cur.y + DIRS[i][1]))
      )
        continue;
      const g = cur.g + (diag ? 1.414 : 1);
      const k = key(nx, ny);
      const old = nodes.get(k);
      if (old && old.g <= g) continue;
      const nd = { x: nx, y: ny, g, f: g + hOf(nx, ny), parent: cur };
      nodes.set(k, nd);
      heap.push(nd);
      up(heap.length - 1);
    }
  }

  let n = end || best;
  const path = [];
  while (n && n.parent) {
    path.push({ gx: n.x, gy: n.y });
    n = n.parent;
  }
  return path.reverse();
}

// Perros (Choco y Cleo): se quedan quietos donde los colocaste hasta que la exploradora lo encuentra
// (checkDogFound). Desde entonces la sigue por todo el mapa: se detiene a ~2
// casillas, corre si ella se aleja y rodea los obstáculos. Nunca reaparece a su
// lado; si ella navega en bote, espera en la orilla.
function updateDog(o) {
  const FOLLOW_R = o.cfg.followR; // distancia a la que se detiene junto a ella
  const RUN_R = 6; // más lejos que esto, corre
  const dxp = player.gx - o.gx;
  const dyp = player.gy - o.gy;
  const d = Math.hypot(dxp, dyp);

  if (o.barkLeft > 0) o.barkLeft--;

  // Va dentro del bote: viaja con la exploradora (lo dibuja drawBoatedPlayer)
  if (o.inBoat) {
    o.gx = player.gx;
    o.gy = player.gy;
    o.moving = false;
    o.running = false;
    o.flip = player.face < 0;
    o.h = tileH(Math.round(o.gx), Math.round(o.gy));
    o.depth = o.gx + o.gy;
    return;
  }

  let dx = 0;
  let dy = 0;
  let speed = 0;

  // Puesto propio: cada perro se coloca detrás de la exploradora y a un lado
  // distinto (Choco a un lado, Cleo al otro). Si ese puesto no es transitable,
  // va hacia ella y se detiene a FOLLOW_R como antes.
  const dirx = player.dirGx;
  const diry = player.dirGy;
  let tx = player.gx - dirx * o.cfg.slotBack - diry * o.cfg.slotSide;
  let ty = player.gy - diry * o.cfg.slotBack + dirx * o.cfg.slotSide;
  let stopR = 0.45;
  if (!walkable(tx, ty)) {
    tx = player.gx;
    ty = player.gy;
    stopR = FOLLOW_R;
  }
  const dxt = tx - o.gx;
  const dyt = ty - o.gy;
  const dt = Math.hypot(dxt, dyt) || 0.0001;
  // Con margen para no temblar al llegar: se detiene en stopR y reanuda más lejos
  const chase = o.following ? dt > stopR : dt > stopR + 0.45;
  o.following = o.found && !player.boat && chase;

  if (o.following) {
    o.running = d > RUN_R;
    speed = o.running ? 0.098 : 0.06;

    let ux = dxt / dt;
    let uy = dyt / dt;

    // Ruta por casillas: se recalcula cada medio segundo o si la meta se mueve.
    // Así, si hay agua u obstáculos de por medio, retrocede, rodea y retoma el camino.
    const gtx = Math.round(tx);
    const gty = Math.round(ty);
    if (
      !o.path ||
      --o.pathT <= 0 ||
      Math.abs(gtx - o.pathGx) + Math.abs(gty - o.pathGy) > 1
    ) {
      o.path = findDogPath(o.gx, o.gy, tx, ty);
      o.pathIdx = 0;
      o.pathGx = gtx;
      o.pathGy = gty;
      o.pathT = 30 + ((Math.random() * 10) | 0);
    }
    while (
      o.pathIdx < o.path.length &&
      Math.hypot(o.path[o.pathIdx].gx - o.gx, o.path[o.pathIdx].gy - o.gy) <
        0.35
    ) {
      o.pathIdx++;
    }
    let wait = false;
    if (o.pathIdx < o.path.length) {
      // Atajo: va al punto más lejano de la ruta al que llega en línea recta
      let wp = o.path[o.pathIdx];
      for (
        let k = Math.min(o.path.length - 1, o.pathIdx + 6);
        k > o.pathIdx;
        k--
      ) {
        if (dogLineClear(o.gx, o.gy, o.path[k].gx, o.path[k].gy)) {
          wp = o.path[k];
          break;
        }
      }
      const wd = Math.hypot(wp.gx - o.gx, wp.gy - o.gy) || 1;
      ux = (wp.gx - o.gx) / wd;
      uy = (wp.gy - o.gy) / wd;
    } else if (dt > 1.5 || !dogTileOK(gtx, gty)) {
      // Ya llegó al punto más cercano posible (la meta está al otro lado del agua)
      wait = true;
    }

    // Atorado contra un obstáculo: avanza un rato hacia un lado para rodearlo
    if (o.escT > 0) {
      o.escT--;
      ux = o.escDx;
      uy = o.escDy;
      wait = false;
    }
    if (wait) {
      speed = 0;
      o.running = false;
    }

    // Mejor dirección libre: directo y luego desviándose hacia los lados
    const side = o.fleeSide;
    const angles = [
      0,
      0.5 * side,
      -0.5 * side,
      1.0 * side,
      -1.0 * side,
      1.5 * side,
      -1.5 * side,
    ];
    const LOOK = 0.3;
    for (let i = 0; i < angles.length && !wait; i++) {
      const cos = Math.cos(angles[i]);
      const sin = Math.sin(angles[i]);
      const cx = ux * cos - uy * sin;
      const cy = ux * sin + uy * cos;
      if (
        walkable(o.gx + cx * LOOK, o.gy + cy * LOOK) ||
        walkable(o.gx + cx * LOOK, o.gy) ||
        walkable(o.gx, o.gy + cy * LOOK)
      ) {
        dx = cx;
        dy = cy;
        if (angles[i] !== 0) o.fleeSide = angles[i] > 0 ? 1 : -1;
        break;
      }
    }
  } else {
    o.running = false;
    o.escT = 0;
    o.path = null; // al volver a seguirla, calcula una ruta nueva
  }

  const stepX = dx * speed;
  const stepY = dy * speed;
  let moved = false;
  if (Math.abs(stepX) > 0.0001 && walkable(o.gx + stepX, o.gy)) {
    o.gx += stepX;
    moved = true;
  }
  if (Math.abs(stepY) > 0.0001 && walkable(o.gx, o.gy + stepY)) {
    o.gy += stepY;
    moved = true;
  }
  o.moving = moved;

  // Separación suave: si otro perro amigo está demasiado cerca, se apartan un poco
  // (empujón leve; nunca atraviesa obstáculos ni los hace temblar)
  if (o.found) {
    const SEP = 1.3;
    dogs.forEach((q) => {
      if (q === o || !q.found || q.inBoat) return;
      let sx = o.gx - q.gx;
      let sy = o.gy - q.gy;
      let sd = Math.hypot(sx, sy);
      if (sd >= SEP) return;
      if (sd < 0.01) {
        // justo encima: se separan hacia el lado de su puesto
        sx = -diry * o.cfg.slotSide;
        sy = dirx * o.cfg.slotSide;
        sd = Math.hypot(sx, sy) || 1;
      }
      const push = (SEP - Math.min(sd, SEP)) * 0.05;
      const px2 = (sx / sd) * push;
      const py2 = (sy / sd) * push;
      if (walkable(o.gx + px2, o.gy)) o.gx += px2;
      if (walkable(o.gx, o.gy + py2)) o.gy += py2;
    });
  }

  // Si no avanza, tras un momento prueba a rodear el obstáculo (sin teletransportarse)
  if (speed > 0 && !moved) o.stuck++;
  else o.stuck = Math.max(0, o.stuck - 2);
  if (o.stuck > 40 && o.escT <= 0) {
    const a =
      Math.atan2(dyt, dxt) +
      (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8);
    o.escDx = Math.cos(a);
    o.escDy = Math.sin(a);
    o.escT = 45 + Math.random() * 40;
    o.stuck = 0;
  }

  // Ya es su amigo: ladra de vez en cuando si la exploradora está cerca
  if (o.found && d < 6) {
    o.barkT--;
    if (o.barkT <= 0) {
      o.barkLeft = 70;
      o.barkT = 900 + Math.random() * 1500;
    }
  }

  // Orientación: hacia donde camina, o hacia la exploradora cuando está parado
  const fx = moved ? dx : o.found ? dxp : 0;
  const fy = moved ? dy : o.found ? dyp : 0;
  const sd = fx - fy;
  if (Math.abs(sd) > 0.05) o.flip = sd < 0;

  o.h += (tileH(Math.round(o.gx), Math.round(o.gy)) - o.h) * 0.2;
  o.depth = o.gx + o.gy;
}

// Al acercarse a un perro (Choco o Cleo) por primera vez se abre el recuerdo y se une al equipo
function checkDogFound() {
  if (isPaused || player.boat) return;
  const dog = dogs.find(
    (d) =>
      !d.found && Math.hypot(player.gx - d.gx, player.gy - d.gy) <= DOG_FIND_R,
  );
  if (!dog) return;
  dog.found = true;
  dog.barkLeft = 0;
  burst(dog.gx, dog.gy, tileH(dog.gx, dog.gy), dog.cfg.sparks, 18);

  // Imagen del recuerdo: el perro en grande sobre un fondo de pasto
  // (Choco usa su foto; si no hay foto, se usa este dibujo)
  const W = 200;
  const H = 150;
  const cv = makeCanvas(W, H);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#9fe0f5");
  sky.addColorStop(0.55, "#d8f3c4");
  sky.addColorStop(0.55, "#6fbf4a");
  sky.addColorStop(1, "#4a9a2e");
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  const k = 5;
  const bw = dog.sp.big.cv.width * k;
  const bh = dog.sp.big.cv.height * k;
  c.drawImage(dog.sp.big.cv, (W - bw) / 2, H - bh - 4, bw, bh);

  openMemoryModal(
    {
      image: dog.cfg.image || cv.toDataURL("image/png"),
      title: "¡Encontraste a " + dog.name + "!",
      message: dog.cfg.message,
    },
    "* NUEVO AMIGO *",
  );
}

/* ---------- Daño al jugador ---------- */
function hurtPlayer(n, fromGx, fromGy) {
  if (player.invuln > 0 || isPaused) return;
  health = Math.max(0, health - n);
  player.invuln = 70;
  updateHUD();
  burst(player.gx, player.gy, player.h, ["#ff595e", "#ffffff", "#ffd166"], 12);

  // Pequeño retroceso, alejándose de quien lo golpeó
  const dx = player.gx - fromGx;
  const dy = player.gy - fromGy;
  const dl = Math.hypot(dx, dy) || 1;
  const kx = (dx / dl) * 0.7;
  const ky = (dy / dl) * 0.7;
  if (walkable(player.gx + kx, player.gy + ky)) {
    player.gx += kx;
    player.gy += ky;
  } else if (walkable(player.gx + kx, player.gy)) {
    player.gx += kx;
  } else if (walkable(player.gx, player.gy + ky)) {
    player.gy += ky;
  }

  if (health <= 0) playerFaint();
}

// Sin corazones: la exploradora se desmaya y despierta en el punto de inicio
function playerFaint() {
  health = MAX_HEALTH;
  player.gx = START_TILE.gx;
  player.gy = START_TILE.gy;
  player.z = 0;
  player.jumpT = 0;
  player.invuln = 120;
  player.faintT = 160;
  burst(player.gx, player.gy, player.h, ["#ffffff", "#ffd166", "#74c69d"], 18);
  // Los aluxes se calman y vuelven a su sitio
  statics.forEach((o) => {
    if (
      o.kind === "alux" ||
      o.kind === "huaychivo" ||
      o.kind === "huaypek" ||
      o.kind === "kaskabal" ||
      o.kind === "xtabay"
    ) {
      o.state = "return";
      o.atkT = 0;
    }
  });
  updateHUD();
  snapCamera();
}

/* ---------- Alux (hostil, atado a su zona) ---------- */
// Caminable Y dentro de la zona del alux: así nunca puede salir de ella
function aluxWalkable(o, gx, gy) {
  return (
    walkable(gx, gy) &&
    (o.free || Math.hypot(gx - o.homeGx, gy - o.homeGy) <= o.zone) &&
    (!o.monteOnly || tileAt(gx, gy) === T_MONTE)
  );
}

// ---------- Ruta del kaskabal (A* sobre casillas de monte) ----------
// Igual que los perros: en vez de ir en línea recta hacia el objetivo, calcula una
// ruta por casillas de monte dentro de su zona y la sigue, así rodea árboles,
// rocas y bordes del monte en lugar de atorarse. Se guarda en caché qué casillas
// son monte transitable (los obstáculos son fijos).
const monteTileCache = new Map();
function monteTileOK(x, y) {
  const k = (x + 512) * 2048 + (y + 512);
  let v = monteTileCache.get(k);
  if (v === undefined) {
    v = walkable(x, y) && tileAt(x, y) === T_MONTE;
    monteTileCache.set(k, v);
  }
  return v;
}

// ¿Puede ir en línea recta de A a B sin salir del monte ni de su zona?
function aluxLineClear(o, ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.3);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!aluxWalkable(o, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// Avanza un paso por la ruta hacia (tx, ty). Devuelve la dirección en que se movió,
// o null si no puede avanzar (ya llegó a la casilla más cercana posible, o está
// bloqueado: en ese caso la ruta se recalcula en unos instantes).
function aluxPathStep(o, tx, ty, speed) {
  const gtx = Math.round(tx);
  const gty = Math.round(ty);
  if (
    !o.path ||
    --o.pathT <= 0 ||
    Math.abs(gtx - o.pathGx) + Math.abs(gty - o.pathGy) > 1
  ) {
    o.path = findDogPath(
      o.gx,
      o.gy,
      tx,
      ty,
      (x, y) =>
        (o.free || Math.hypot(x - o.homeGx, y - o.homeGy) <= o.zone) &&
        (o.monteOnly ? monteTileOK(x, y) : dogTileOK(x, y)),
    );
    o.pathIdx = 0;
    o.pathGx = gtx;
    o.pathGy = gty;
    o.pathT = 30 + ((Math.random() * 10) | 0);
  }
  while (
    o.pathIdx < o.path.length &&
    Math.hypot(o.path[o.pathIdx].gx - o.gx, o.path[o.pathIdx].gy - o.gy) < 0.35
  ) {
    o.pathIdx++;
  }
  if (o.pathIdx >= o.path.length) return null;
  // Atajo: va al punto más lejano de la ruta al que llega en línea recta
  let wp = o.path[o.pathIdx];
  for (let k = Math.min(o.path.length - 1, o.pathIdx + 6); k > o.pathIdx; k--) {
    if (aluxLineClear(o, o.gx, o.gy, o.path[k].gx, o.path[k].gy)) {
      wp = o.path[k];
      break;
    }
  }
  const wd = Math.hypot(wp.gx - o.gx, wp.gy - o.gy) || 1;
  return aluxStep(o, (wp.gx - o.gx) / wd, (wp.gy - o.gy) / wd, speed);
}

// Avanza hacia (ux, uy); si está bloqueado, prueba desviándose para rodear
// obstáculos. Devuelve la dirección en que se movió, o null si no pudo.
function aluxStep(o, ux, uy, speed) {
  const side = o.fleeSide;
  const angles = [0, 0.6 * side, -0.6 * side, 1.2 * side, -1.2 * side];
  for (let i = 0; i < angles.length; i++) {
    const cos = Math.cos(angles[i]);
    const sin = Math.sin(angles[i]);
    const cx = ux * cos - uy * sin;
    const cy = ux * sin + uy * cos;
    const nx = o.gx + cx * speed;
    const ny = o.gy + cy * speed;
    if (
      aluxWalkable(o, nx, ny) &&
      aluxWalkable(o, o.gx + cx * 0.3, o.gy + cy * 0.3)
    ) {
      o.gx = nx;
      o.gy = ny;
      if (angles[i] !== 0) o.fleeSide = angles[i] > 0 ? 1 : -1;
      return [cx, cy];
    }
  }
  return null;
}

function updateAlux(o) {
  if (o.hurtT > 0) o.hurtT--;
  // Derrotado: solo espera a que termine su animación de muerte
  if (o.dead) {
    o.dieT--;
    o.moving = false;
    return;
  }
  // Golpeado: retrocede unos pasos sin poder actuar (sin salir de su zona ni atravesar nada)
  if (o.kbT > 0) {
    o.kbT--;
    if (aluxWalkable(o, o.gx + o.kbX, o.gy)) o.gx += o.kbX;
    if (aluxWalkable(o, o.gx, o.gy + o.kbY)) o.gy += o.kbY;
    o.moving = false;
    o.h += (tileH(Math.round(o.gx), Math.round(o.gy)) - o.h) * 0.2;
    o.depth = o.gx + o.gy;
    return;
  }
  const dxp = player.gx - o.gx;
  const dyp = player.gy - o.gy;
  const d = Math.hypot(dxp, dyp);
  const hx = o.homeGx - o.gx;
  const hy = o.homeGy - o.gy;
  const hd = Math.hypot(hx, hy);

  // El jugador solo es objetivo si está dentro de la zona y a pie
  const inZone =
    o.free || Math.hypot(player.gx - o.homeGx, player.gy - o.homeGy) <= o.zone;

  // Los enemigos "libres" (kaskabal) no tienen punto al que volver: se quedan
  // donde están y retoman su paseo tranquilo
  if (o.free && o.state === "return") {
    o.state = "idle";
    o.pauseTimer = 30 + Math.random() * 60;
    o.moveTimer = 0;
  }
  // Los enemigos que solo caminan por monte (kaskabal) únicamente detectan al jugador
  // si él también está sobre monte.
  const targetable =
    inZone &&
    !player.boat &&
    (!o.monteOnly || tileAt(player.gx, player.gy) === T_MONTE);

  if (o.hitT > 0) o.hitT--;
  if (o.spotT > 0) o.spotT--;

  let face = null; // hacia dónde mira
  let moveDir = null; // en qué dirección se movió

  if (o.state === "idle") {
    if (targetable && d < o.vision) {
      o.state = "chase";
      o.spotT = 50;
    } else if (o.pauseTimer > 0) {
      o.pauseTimer--;
    } else {
      if (o.moveTimer <= 0) {
        if (Math.random() < (o.free ? 0.12 : 0.45)) {
          o.pauseTimer = o.free
            ? 40 + Math.random() * 80
            : 60 + Math.random() * 140;
        } else {
          let a = Math.random() * Math.PI * 2;
          if (o.free) {
            // Camina en una dirección sostenida: gira poco entre tramos, y si
            // chocó con el borde del monte se da la vuelta hacia otro lado
            if (o.heading === undefined) o.heading = a;
            a = o.blocked
              ? o.heading + Math.PI + (Math.random() - 0.5) * 1.8
              : o.heading + (Math.random() - 0.5) * 1.2;
            o.heading = a;
            o.blocked = false;
          }
          let ux = Math.cos(a);
          let uy = Math.sin(a);
          // Si se alejó mucho del centro, vuelve hacia él
          if (!o.free && hd > o.zone * 0.5) {
            ux = hx / hd;
            uy = hy / hd;
          }
          o.dirGx = ux;
          o.dirGy = uy;
          o.moveTimer = o.free
            ? 160 + Math.random() * 200
            : 30 + Math.random() * 40;
        }
      }
      if (o.moveTimer > 0) {
        moveDir = aluxStep(
          o,
          o.dirGx,
          o.dirGy,
          o.free ? KASKABAL_WANDER_SPEED : 0.012,
        );
        if (!moveDir) {
          o.moveTimer = 0;
          o.blocked = true;
        } else o.moveTimer--;
      }
    }
  } else if (o.state === "chase") {
    if (!targetable || d > o.vision * 1.5) {
      // El jugador salió de su zona o se alejó: se rinde y vuelve
      o.state = "return";
    } else if (d < o.reach * 0.85) {
      o.state = "windup";
      o.atkT = o.windup;
      face = [dxp, dyp];
    } else {
      moveDir = o.usePath
        ? aluxPathStep(o, player.gx, player.gy, o.speed)
        : aluxStep(o, dxp / d, dyp / d, o.speed);
      face = [dxp, dyp];
    }
  } else if (o.state === "windup") {
    face = [dxp, dyp];
    o.atkT--;
    if (o.atkT <= 0) {
      // Golpe: acierta si el jugador sigue a su alcance, en su zona y sin saltar
      o.hitT = 14;
      if (targetable && d < o.reach + 0.4 && player.z < 5) {
        hurtPlayer(o.damage, o.gx, o.gy);
      }
      o.state = "recover";
      o.coolT = 40;
    }
  } else if (o.state === "recover") {
    face = [dxp, dyp];
    o.coolT--;
    if (o.coolT <= 0)
      o.state = targetable && d < o.vision * 1.5 ? "chase" : "return";
  } else if (o.state === "return") {
    if (targetable && d < o.vision) {
      o.state = "chase";
      o.spotT = 50;
    } else if (hd < 0.6) {
      o.state = "idle";
      o.pauseTimer = 60 + Math.random() * 100;
      o.moveTimer = 0;
    } else {
      moveDir = o.usePath
        ? aluxPathStep(o, o.homeGx, o.homeGy, 0.04)
        : aluxStep(o, hx / hd, hy / hd, 0.04);
    }
  }

  // Separación: si otro alux está demasiado cerca, se apartan (sin salir de la zona
  // ni atravesar obstáculos). El rango es menor que el de los perros.
  statics.forEach((q) => {
    if (q === o || q.kind !== o.kind || q.dead) return;
    let sx = o.gx - q.gx;
    let sy = o.gy - q.gy;
    let sd = Math.hypot(sx, sy);
    if (sd >= o.sep) return;
    if (sd < 0.01) {
      // justo encima: cada uno sale hacia un lado distinto
      const a = (o.phase || 0) * 7.3 + (o.homeGx + o.homeGy);
      sx = Math.cos(a);
      sy = Math.sin(a);
      sd = 1;
    }
    const push = (o.sep - sd) * ALUX_SEP_PUSH;
    const ex = (sx / sd) * push;
    const ey = (sy / sd) * push;
    if (aluxWalkable(o, o.gx + ex, o.gy)) o.gx += ex;
    if (aluxWalkable(o, o.gx, o.gy + ey)) o.gy += ey;
  });

  o.moving = !!moveDir;
  if (!face && moveDir) face = moveDir;
  if (face) {
    const sd = face[0] - face[1];
    if (Math.abs(sd) > 0.01) o.flip = sd < 0;
  }

  o.h += (tileH(Math.round(o.gx), Math.round(o.gy)) - o.h) * 0.2;
  o.depth = o.gx + o.gy;
}

function updateJaguar(o) {
  const dxPlayer = o.gx - player.gx;
  const dyPlayer = o.gy - player.gy;
  const distance = Math.hypot(dxPlayer, dyPlayer);

  let dx = 0;
  let dy = 0;
  let speed = 0;

  // Si el jugador se acerca, el jaguar huye
  if (distance < 3.5 || (o.fleeing && distance <= 5.2)) {
    o.fleeing = true;
    o.pauseTimer = 0;

    const safeDistance = Math.max(distance, 0.001);

    if (distance < 0.001) {
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    } else {
      dx = dxPlayer / safeDistance;
      dy = dyPlayer / safeDistance;
    }

    speed = 0.045;
  } else {
    // Cuando alcanza una distancia segura, vuelve a deambular
    if (o.fleeing && distance > 5.2) {
      o.fleeing = false;
      o.moveTimer = 0;
      o.pauseTimer = 25;
    }

    // Pausa ocasional
    if (o.pauseTimer > 0) {
      o.pauseTimer--;
      return;
    }

    // Elegir una nueva dirección
    if (o.moveTimer <= 0) {
      // Algunas veces se detiene a descansar
      if (Math.random() < 0.32) {
        o.pauseTimer = 35 + Math.random() * 65;
        return;
      }

      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-0.707, -0.707],
        [-0.707, 0.707],
        [0.707, -0.707],
        [0.707, 0.707],
      ];

      const direction = directions[(Math.random() * directions.length) | 0];

      o.dirGx = direction[0];
      o.dirGy = direction[1];

      o.moveTimer = 55 + Math.random() * 100;
    }

    dx = o.dirGx;
    dy = o.dirGy;
    speed = 0.012;

    o.moveTimer--;
  }

  const stepX = dx * speed;
  const stepY = dy * speed;

  let moved = false;

  // Comprobar obstáculos y terreno
  if (Math.abs(stepX) > 0.0001 && walkable(o.gx + stepX, o.gy)) {
    o.gx += stepX;
    moved = true;
  }

  if (Math.abs(stepY) > 0.0001 && walkable(o.gx, o.gy + stepY)) {
    o.gy += stepY;
    moved = true;
  }

  // Si encuentra un obstáculo, cambia de dirección
  if (!moved && !o.fleeing) {
    o.moveTimer = 0;
  }

  // Orientación según el movimiento
  const screenDirection = dx - dy;

  if (Math.abs(screenDirection) > 0.01) {
    o.flip = screenDirection < 0;
  }

  // Adaptarse a la altura del terreno
  const targetH = tileH(Math.round(o.gx), Math.round(o.gy));

  o.h += (targetH - o.h) * 0.2;
  o.depth = o.gx + o.gy;
}

function updateDeer(o, jaguars) {
  const ALERT_R = 6.5; // se pone en alerta
  const FLEE_R = 4.2; // sale corriendo
  const SAFE_R = 9; // distancia a la que deja de huir
  const J_ALERT_R = 5; // el jaguar le inquieta un poco menos
  const J_FLEE_R = 3.5;

  // 1. Evaluar amenazas (jugador y jaguares)
  let danger = 0; // 0 = nada, 1 = alerta, 2 = huir
  let fx = 0;
  let fy = 0;
  let lookX = 0; // hacia dónde mira cuando está alerta
  let lookY = 0;
  let nearest = Infinity;

  const checkThreat = (tx, ty, alertR, fleeR) => {
    const ddx = o.gx - tx;
    const ddy = o.gy - ty;
    const d = Math.max(Math.hypot(ddx, ddy), 0.001);

    if (d < nearest) {
      nearest = d;
      lookX = -ddx;
      lookY = -ddy;
    }

    const fleeing = o.state === "flee";
    if (d < fleeR || (fleeing && d < SAFE_R)) {
      danger = 2;
      fx += (ddx / d) * (1 / d);
      fy += (ddy / d) * (1 / d);
    } else if (o.calmTimer <= 0) {
      const aR = o.state === "alert" ? alertR + 0.7 : alertR;
      if (d < aR) danger = Math.max(danger, 1);
    }
  };

  checkThreat(player.gx, player.gy, ALERT_R, FLEE_R);
  jaguars.forEach((j) => checkThreat(j.gx, j.gy, J_ALERT_R, J_FLEE_R));

  if (o.calmTimer > 0) o.calmTimer--;

  // 2. Cambios de estado
  if (danger === 2) {
    if (o.state !== "flee") {
      o.state = "flee";
      o.hopT = 0;
    }
  } else if (o.state === "flee") {
    // Ya está lejos: se detiene y mira hacia atrás
    o.state = "look";
    o.lookTimer = 60 + Math.random() * 50;
  } else if (danger === 1) {
    if (o.state !== "alert") {
      o.state = "alert";
      o.alertT = 0;
    }
  } else if (o.state === "alert") {
    o.state = "graze";
    o.pauseTimer = 40 + Math.random() * 60;
    o.moveTimer = 0;
  }

  let dx = 0;
  let dy = 0;
  let speed = 0;
  o.eating = false;

  if (o.state === "flee") {
    // Huye a saltos, más rápido que el jaguar
    let ux = fx;
    let uy = fy;
    let len = Math.hypot(ux, uy);

    // Amenazas en lados opuestos (vectores que se cancelan): se aleja del más cercano
    if (len < 0.05) {
      ux = -lookX;
      uy = -lookY;
      len = Math.max(Math.hypot(ux, uy), 0.001);
    }
    ux /= len;
    uy /= len;

    // Elige la mejor dirección libre: primero directo, luego desviándose,
    // pero NUNCA hacia el peligro (dot con la dirección de huida >= 0)
    const LOOK = 0.35;
    const side = o.fleeSide || 1;
    const angles = [
      0,
      0.6 * side,
      -0.6 * side,
      1.2 * side,
      -1.2 * side,
      1.5 * side,
      -1.5 * side,
    ];
    let found = false;

    for (let i = 0; i < angles.length; i++) {
      const cos = Math.cos(angles[i]);
      const sin = Math.sin(angles[i]);
      const cx = ux * cos - uy * sin;
      const cy = ux * sin + uy * cos;

      if (
        walkable(o.gx + cx * LOOK, o.gy + cy * LOOK) ||
        walkable(o.gx + cx * LOOK, o.gy) ||
        walkable(o.gx, o.gy + cy * LOOK)
      ) {
        dx = cx;
        dy = cy;
        if (angles[i] !== 0) o.fleeSide = angles[i] > 0 ? 1 : -1;
        found = true;
        break;
      }
    }

    if (found) {
      o.hopT++;
      const bound = Math.max(0, Math.sin(o.hopT * 0.32));
      speed = 0.06 + 0.05 * bound;
      o.hop = bound * 4;
    } else {
      // Acorralado: se queda quieto en vez de moverse sin control
      o.hop = 0;
    }
  } else if (o.state === "alert") {
    // Se queda quieto, mirando al peligro
    o.alertT++;
    o.hop = 0;

    // Si el peligro no se acerca, se relaja y vuelve a pastar
    if (o.alertT > 260) {
      o.state = "graze";
      o.calmTimer = 240;
      o.pauseTimer = 60;
      o.moveTimer = 0;
    }
  } else if (o.state === "look") {
    o.hop = 0;
    o.lookTimer--;
    if (o.lookTimer <= 0) {
      o.state = "graze";
      o.pauseTimer = 40 + Math.random() * 60;
      o.moveTimer = 0;
      o.calmTimer = 90;
    }
  } else {
    // graze: pastar con pausas largas y pasos cortos, cerca de su hogar
    o.hop = 0;

    if (o.pauseTimer > 0) {
      o.pauseTimer--;
      o.eating = true;
    } else {
      if (o.moveTimer <= 0) {
        const hx = o.homeGx - o.gx;
        const hy = o.homeGy - o.gy;
        const hd = Math.hypot(hx, hy);

        if (hd > 5) {
          // Muy lejos de su hogar: regresa caminando
          o.dirGx = hx / hd;
          o.dirGy = hy / hd;
          o.moveTimer = 50 + Math.random() * 60;
        } else if (Math.random() < 0.65) {
          // Se queda comiendo un buen rato
          o.pauseTimer = 70 + Math.random() * 150;
          o.eating = true;
        } else {
          const a = Math.random() * Math.PI * 2;
          o.dirGx = Math.cos(a);
          o.dirGy = Math.sin(a);
          o.moveTimer = 20 + Math.random() * 40;
        }
      }

      if (o.moveTimer > 0) {
        dx = o.dirGx;
        dy = o.dirGy;
        const returning = Math.hypot(o.homeGx - o.gx, o.homeGy - o.gy) > 5;
        speed = returning ? 0.02 : 0.009;
        o.moveTimer--;
      }
    }
  }

  // 3. Movimiento con colisiones
  const stepX = dx * speed;
  const stepY = dy * speed;
  let moved = false;

  if (Math.abs(stepX) > 0.0001 && walkable(o.gx + stepX, o.gy)) {
    o.gx += stepX;
    moved = true;
  }
  if (Math.abs(stepY) > 0.0001 && walkable(o.gx, o.gy + stepY)) {
    o.gy += stepY;
    moved = true;
  }

  o.walking = moved && o.state === "graze";

  if (!moved && speed > 0) {
    if (o.state === "flee") {
      o.fleeSide = -(o.fleeSide || 1);
      o.hop = 0;
    } else {
      o.moveTimer = 0;
    }
  }

  // 4. Orientación: mira hacia donde camina, o hacia el peligro si está alerta/mirando
  let faceX = dx;
  let faceY = dy;
  if (o.state === "alert" || o.state === "look") {
    faceX = lookX;
    faceY = lookY;
  }
  const screenDirection = faceX - faceY;
  if (Math.abs(screenDirection) > 0.01) {
    o.flip = screenDirection < 0;
  }

  // 5. Altura del terreno y profundidad de dibujo
  const targetH = tileH(Math.round(o.gx), Math.round(o.gy));
  o.h += (targetH - o.h) * 0.2;
  o.depth = o.gx + o.gy;
}

// Los flamencos solo caminan por agua somera (y esquivan obstáculos)
function flamingoWalkable(gx, gy) {
  return walkable(gx, gy) && isShallow(tileAt(Math.round(gx), Math.round(gy)));
}

// Busca otro lugar de agua somera, lejos del jugador, con espacio para toda la bandada
function pickFlamingoLanding(fromGx, fromGy) {
  for (let i = 0; i < 250; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 14 + Math.random() * 22;
    const gx = fromGx + Math.cos(a) * r;
    const gy = fromGy + Math.sin(a) * r;

    if (!flamingoWalkable(gx, gy)) continue;
    if (Math.hypot(gx - player.gx, gy - player.gy) < 10) continue;

    let ok = 0;
    for (const ox of [-2, 0, 2]) {
      for (const oy of [-2, 0, 2]) {
        if (flamingoWalkable(gx + ox, gy + oy)) ok++;
      }
    }
    if (ok >= 6) return { gx, gy };
  }
  return null;
}

// Despega hacia otra ubicación (toda la bandada comparte destino). Devuelve false si no hay a dónde ir.
function startFlamingoFlight(o, group, destOpt) {
  let dest = destOpt;

  if (!dest) {
    if (!group.fly || group.fly.until < flamingoFrame) {
      const d = pickFlamingoLanding(o.gx, o.gy);
      if (!d) return false;
      group.fly = { gx: d.gx, gy: d.gy, until: flamingoFrame + 360 };
    }
    dest = group.fly;
  }

  // Cada flamenco aterriza en un punto distinto cerca del destino
  let tx = dest.gx;
  let ty = dest.gy;
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 2.5;
    const cx = dest.gx + Math.cos(a) * r;
    const cy = dest.gy + Math.sin(a) * r;
    if (flamingoWalkable(cx, cy)) {
      tx = cx;
      ty = cy;
      break;
    }
  }

  o.state = "fly";
  o.flyAge = 0;
  o.tgtGx = tx;
  o.tgtGy = ty;
  o.destGx = dest.gx;
  o.destGy = dest.gy;
  o.z = 0;
  o.headDown = false;
  o.reactT = 0;
  o.moving = true;
  return true;
}

function updateFlamingoFlight(o, group) {
  o.flyAge++;

  const ddx = o.tgtGx - o.gx;
  const ddy = o.tgtGy - o.gy;
  const dist = Math.hypot(ddx, ddy);

  if (dist < 0.2) {
    // Aterriza y se pone a comer en el nuevo lugar
    o.gx = o.tgtGx;
    o.gy = o.tgtGy;
    o.z = 0;
    o.state = "feed";
    o.moving = false;
    o.calmTimer = 240;
    o.pauseTimer = 60 + Math.random() * 80;
    o.moveTimer = 0;
    o.headDown = true;
    o.headT = 90 + Math.random() * 120;
    group.gx = o.destGx;
    group.gy = o.destGy;
  } else {
    const ux = ddx / dist;
    const uy = ddy / dist;

    // Acelera al despegar y frena al acercarse al destino
    let speed = 0.04 + 0.1 * Math.min(1, o.flyAge / 45);
    speed = Math.min(speed, 0.03 + dist * 0.06);
    o.gx += ux * speed;
    o.gy += uy * speed;

    // Altura: sube al despegar, baja al llegar
    const asc = Math.min(1, o.flyAge / 40);
    const desc = Math.min(1, dist / 5);
    const k = Math.min(asc, desc);
    o.z = 26 * (k * k * (3 - 2 * k));

    const screenDirection = ux - uy;
    if (Math.abs(screenDirection) > 0.01) o.flip = screenDirection < 0;
  }

  o.h += (tileH(Math.round(o.gx), Math.round(o.gy)) - o.h) * 0.2;
  o.depth = o.gx + o.gy;
}

function updateFlamingo(o, jaguars) {
  const ALERT_R = 5.25; // se alerta
  const FLEE_R = 3.15; // huye
  const J_ALERT_R = 4.2;
  const J_FLEE_R = 2.45;
  const SAFE_R = 8.5; // amenazas que cuentan para elegir hacia dónde huir
  const MATE_R = 6; // distancia a la que reacciona a sus compañeros
  const group = flamingoGroups[o.group];
  const TAKEOFF_R = 1.6; // si te acercas "demasiado", vuela
  const J_TAKEOFF_R = 1.0;

  if (o.state === "fly") {
    updateFlamingoFlight(o, group);
    return;
  }

  // 1. Amenazas directas (jugador y jaguares)
  let danger = 0; // 0 = nada, 1 = alerta, 2 = huir
  let fx = 0;
  let fy = 0;
  let lookX = 0;
  let lookY = 0;
  let nearest = Infinity;
  let takeoff = false;

  const checkThreat = (tx, ty, alertR, fleeR, takeoffR) => {
    const ddx = o.gx - tx;
    const ddy = o.gy - ty;
    const d = Math.max(Math.hypot(ddx, ddy), 0.001);

    if (d < nearest) {
      nearest = d;
      lookX = -ddx;
      lookY = -ddy;
    }
    if (d < SAFE_R) {
      fx += (ddx / d) * (1 / d);
      fy += (ddy / d) * (1 / d);
    }
    if (d < takeoffR) takeoff = true;
    if (d < fleeR) danger = 2;
    else if (d < alertR && o.calmTimer <= 0) danger = Math.max(danger, 1);
  };

  checkThreat(player.gx, player.gy, ALERT_R, FLEE_R, TAKEOFF_R);
  jaguars.forEach((j) =>
    checkThreat(j.gx, j.gy, J_ALERT_R, J_FLEE_R, J_TAKEOFF_R),
  );

  if (o.calmTimer > 0) o.calmTimer--;

  // 2. Compañeros de la bandada
  let mateAlertDist = Infinity;
  let mateFleeDist = Infinity;
  let mateFleeDx = 0;
  let mateFleeDy = 0;
  let mateFlyDist = Infinity;
  let sepX = 0;
  let sepY = 0;
  let avgDx = 0;
  let avgDy = 0;
  let walkers = 0;

  group.members.forEach((m) => {
    if (m === o) return;
    const d = Math.hypot(m.gx - o.gx, m.gy - o.gy);

    // Un compañero que acaba de despegar arrastra al resto de la bandada
    if (m.state === "fly") {
      if (d < MATE_R && m.flyAge < 90 && d < mateFlyDist) mateFlyDist = d;
      return;
    }

    if (d < MATE_R) {
      if (m.state === "alert" && d < mateAlertDist) mateAlertDist = d;
      if (m.state === "flee" && d < mateFleeDist) {
        mateFleeDist = d;
        mateFleeDx = m.fleeDx;
        mateFleeDy = m.fleeDy;
      }
    }
    if (d < 0.9 && d > 0.001) {
      sepX += (o.gx - m.gx) / d;
      sepY += (o.gy - m.gy) / d;
    }
    if (m.state === "feed" && m.moving) {
      avgDx += m.dirGx;
      avgDy += m.dirGy;
      walkers++;
    }
  });

  const mateAlert = o.calmTimer <= 0 && mateAlertDist < Infinity;
  const mateFlee = mateFleeDist < Infinity;

  const startFlee = (ux, uy) => {
    const len = Math.max(Math.hypot(ux, uy), 0.001);
    o.state = "flee";
    o.fleeDx = ux / len;
    o.fleeDy = uy / len;
    o.fleeStartGx = o.gx;
    o.fleeStartGy = o.gy;
    o.fleeLen = 4.5 + Math.random() * 2; // huida corta
    o.headDown = false;
    o.reactT = 0;
  };

  const startAlert = (direct) => {
    o.state = "alert";
    o.alertT = 0;
    o.direct = direct;
    o.headDown = false;
    o.reactT = 0;
  };

  // La reacción en cadena: cuanto más lejos está el compañero, más tarde reacciona
  const chainReady = (mateDist) => {
    o.reactT++;
    return o.reactT >= 6 + mateDist * 5 + o.jitter;
  };

  // Vuelo: si te acercas demasiado, o si un compañero despega, vuela a otra ubicación
  if (takeoff && startFlamingoFlight(o, group)) return;
  if (mateFlyDist < Infinity) {
    if (chainReady(mateFlyDist) && startFlamingoFlight(o, group)) return;
  }

  // 3. Cambios de estado
  if (o.state === "feed") {
    if (danger === 2) {
      startFlee(fx, fy);
    } else if (danger === 1) {
      startAlert(true);
    } else if (mateFlee) {
      if (chainReady(mateFleeDist)) startFlee(mateFleeDx, mateFleeDy);
    } else if (mateAlert) {
      if (chainReady(mateAlertDist)) startAlert(false);
    } else {
      o.reactT = 0;
    }
  } else if (o.state === "alert") {
    o.alertT++;
    const alarmed = danger === 1 || mateAlert;

    if (danger === 2) {
      startFlee(fx, fy);
    } else if (mateFlee) {
      if (chainReady(mateFleeDist)) startFlee(mateFleeDx, mateFleeDy);
    } else if (o.alertT > 300) {
      // El peligro no se acerca: se relaja
      o.state = "feed";
      o.calmTimer = 240;
      o.pauseTimer = 40;
      o.moveTimer = 0;
    } else if (!alarmed && o.alertT > 50) {
      o.state = "feed";
      o.pauseTimer = 30 + Math.random() * 60;
      o.moveTimer = 0;
    }
  }

  // 4. Movimiento según el estado
  let dx = 0;
  let dy = 0;
  let speed = 0;

  if (o.state === "flee") {
    // Si hay amenaza cerca, huye directo de ella; si no, sigue la dirección de la bandada
    if (Math.hypot(fx, fy) > 0.05) {
      const len = Math.hypot(fx, fy);
      o.fleeDx = fx / len;
      o.fleeDy = fy / len;
    }

    const LOOK = 0.35;
    const side = o.fleeSide;
    const angles = [
      0,
      0.6 * side,
      -0.6 * side,
      1.2 * side,
      -1.2 * side,
      1.5 * side,
      -1.5 * side,
    ];
    let found = false;

    for (let i = 0; i < angles.length; i++) {
      const cos = Math.cos(angles[i]);
      const sin = Math.sin(angles[i]);
      const cx = o.fleeDx * cos - o.fleeDy * sin;
      const cy = o.fleeDx * sin + o.fleeDy * cos;

      if (
        flamingoWalkable(o.gx + cx * LOOK, o.gy + cy * LOOK) ||
        flamingoWalkable(o.gx + cx * LOOK, o.gy) ||
        flamingoWalkable(o.gx, o.gy + cy * LOOK)
      ) {
        dx = cx;
        dy = cy;
        if (angles[i] !== 0) o.fleeSide = angles[i] > 0 ? 1 : -1;
        found = true;
        break;
      }
    }

    const travelled = Math.hypot(o.gx - o.fleeStartGx, o.gy - o.fleeStartGy);

    if (!found || travelled >= o.fleeLen) {
      // Terminó la huida corta: se detiene y mira hacia atrás
      dx = 0;
      dy = 0;
      startAlert(false);
    } else {
      speed = 0.05;
    }
  } else if (o.state === "alert") {
    // Cuello arriba, quieto, mirando hacia el peligro
  } else {
    // feed: camina muy despacio comiendo, con la cabeza baja la mayor parte del tiempo
    o.headT--;
    if (o.headT <= 0) {
      o.headDown = !o.headDown;
      o.headT = o.headDown ? 90 + Math.random() * 150 : 30 + Math.random() * 70;
    }

    if (o.pauseTimer > 0) {
      o.pauseTimer--;
    } else {
      if (o.moveTimer <= 0) {
        const hx = group.gx - o.gx;
        const hy = group.gy - o.gy;
        const hd = Math.hypot(hx, hy);

        if (
          hd > 12 &&
          startFlamingoFlight(o, group, { gx: group.gx, gy: group.gy })
        ) {
          return;
        } else if (hd > 6) {
          // Muy lejos del hogar de la bandada: regresa
          o.dirGx = hx / hd;
          o.dirGy = hy / hd;
          o.moveTimer = 60 + Math.random() * 60;
        } else if (Math.random() < 0.35) {
          o.pauseTimer = 40 + Math.random() * 100;
        } else {
          let a = Math.random() * Math.PI * 2;
          let ux = Math.cos(a);
          let uy = Math.sin(a);

          // Tiende a ir hacia donde van sus vecinos (mismo rumbo)
          if (walkers > 0 && Math.random() < 0.5) {
            const wl = Math.max(Math.hypot(avgDx, avgDy), 0.001);
            ux = ux * 0.4 + (avgDx / wl) * 0.6;
            uy = uy * 0.4 + (avgDy / wl) * 0.6;
          }

          // Cohesión: si se separó del grupo, se inclina hacia el centro
          const grounded = group.members.filter((m) => m.state !== "fly");
          const live = grounded.reduce(
            (acc, m) => ({ x: acc.x + m.gx, y: acc.y + m.gy }),
            { x: 0, y: 0 },
          );
          const cxm = live.x / grounded.length - o.gx;
          const cym = live.y / grounded.length - o.gy;
          const cd = Math.hypot(cxm, cym);
          if (cd > 3.5) {
            ux = ux * 0.3 + (cxm / cd) * 0.7;
            uy = uy * 0.3 + (cym / cd) * 0.7;
          }

          const ul = Math.max(Math.hypot(ux, uy), 0.001);
          o.dirGx = ux / ul;
          o.dirGy = uy / ul;
          o.moveTimer = 40 + Math.random() * 50;
        }
      }

      if (o.moveTimer > 0) {
        dx = o.dirGx + sepX * 0.4;
        dy = o.dirGy + sepY * 0.4;
        const dl = Math.max(Math.hypot(dx, dy), 0.001);
        dx /= dl;
        dy /= dl;
        const returning = Math.hypot(group.gx - o.gx, group.gy - o.gy) > 6;
        speed = returning ? 0.014 : 0.004;
        o.moveTimer--;
      }
    }
  }

  // 5. Mover (solo por agua somera)
  const stepX = dx * speed;
  const stepY = dy * speed;
  let moved = false;

  if (Math.abs(stepX) > 0.0001 && flamingoWalkable(o.gx + stepX, o.gy)) {
    o.gx += stepX;
    moved = true;
  }
  if (Math.abs(stepY) > 0.0001 && flamingoWalkable(o.gx, o.gy + stepY)) {
    o.gy += stepY;
    moved = true;
  }

  o.moving = moved;
  if (!moved && speed > 0 && o.state === "feed") o.moveTimer = 0;

  // 6. Orientación
  let faceX = dx;
  let faceY = dy;
  if (o.state === "alert" && nearest < 14) {
    faceX = lookX;
    faceY = lookY;
  }
  const screenDirection = faceX - faceY;
  if (Math.abs(screenDirection) > 0.01) {
    o.flip = screenDirection < 0;
  }

  // 7. Altura del terreno y profundidad de dibujo
  const targetH = tileH(Math.round(o.gx), Math.round(o.gy));
  o.h += (targetH - o.h) * 0.2;
  o.depth = o.gx + o.gy;
}

function updateTolok(o, jaguars) {
  const FREEZE_R = 4; // se congela con la cabeza en alto
  const FLEE_R = 1.6; // solo huye si te acercas mucho
  const J_FREEZE_R = 3;
  const J_FLEE_R = 1.5;
  const SAFE_R = 4.5; // distancia a la que deja de huir

  // 1. Amenazas
  let danger = 0; // 0 = nada, 1 = congelarse, 2 = huir
  let fx = 0;
  let fy = 0;
  let lookX = 0;
  let lookY = 0;
  let nearest = Infinity;

  const checkThreat = (tx, ty, freezeR, fleeR) => {
    const ddx = o.gx - tx;
    const ddy = o.gy - ty;
    const d = Math.max(Math.hypot(ddx, ddy), 0.001);

    if (d < nearest) {
      nearest = d;
      lookX = -ddx;
      lookY = -ddy;
    }

    if (d < fleeR || (o.state === "flee" && d < SAFE_R)) {
      danger = 2;
      fx += (ddx / d) * (1 / d);
      fy += (ddy / d) * (1 / d);
    } else if (d < freezeR && o.calmTimer <= 0) {
      danger = Math.max(danger, 1);
    }
  };

  checkThreat(player.gx, player.gy, FREEZE_R, FLEE_R);
  jaguars.forEach((j) => checkThreat(j.gx, j.gy, J_FREEZE_R, J_FLEE_R));

  if (o.calmTimer > 0) o.calmTimer--;

  // 2. Cambios de estado
  if (danger === 2) {
    if (o.state !== "flee") {
      o.state = "flee";
      o.burstT = 12 + Math.random() * 10;
      o.pauseT = 0;
    }
  } else if (o.state === "flee") {
    // Ya está a salvo: se congela un momento y luego regresa a su lugar
    o.state = "freeze";
    o.alertT = 0;
  } else if (danger === 1) {
    if (o.state !== "freeze") {
      o.state = "freeze";
      o.alertT = 0;
    }
  } else if (o.state === "freeze") {
    // El peligro pasó: vuelve a tomar el sol (o regresa a su lugar con una carrerita)
    if (o.alertT > 50) {
      o.state = "bask";
      o.idleTimer = 20 + Math.random() * 40;
    }
  }

  let dx = 0;
  let dy = 0;
  let speed = 0;

  if (o.state === "flee") {
    // Huye a ráfagas: corre un tramo corto, se detiene un instante y vuelve a correr
    let ux = fx;
    let uy = fy;
    let len = Math.hypot(ux, uy);
    if (len < 0.05) {
      ux = -lookX;
      uy = -lookY;
      len = Math.max(Math.hypot(ux, uy), 0.001);
    }
    ux /= len;
    uy /= len;

    if (o.pauseT > 0) {
      o.pauseT--;
    } else {
      // Dirección libre (nunca hacia el peligro); si no hay, se queda quieto
      const LOOK = 0.4;
      const side = o.fleeSide;
      const angles = [
        0,
        0.6 * side,
        -0.6 * side,
        1.2 * side,
        -1.2 * side,
        1.5 * side,
        -1.5 * side,
      ];

      for (let i = 0; i < angles.length; i++) {
        const cos = Math.cos(angles[i]);
        const sin = Math.sin(angles[i]);
        const cx = ux * cos - uy * sin;
        const cy = ux * sin + uy * cos;

        if (
          walkable(o.gx + cx * LOOK, o.gy + cy * LOOK) ||
          walkable(o.gx + cx * LOOK, o.gy) ||
          walkable(o.gx, o.gy + cy * LOOK)
        ) {
          dx = cx;
          dy = cy;
          if (angles[i] !== 0) o.fleeSide = angles[i] > 0 ? 1 : -1;
          speed = 0.11;
          break;
        }
      }

      o.burstT--;
      if (o.burstT <= 0) {
        o.pauseT = 8 + Math.random() * 18;
        o.burstT = 12 + Math.random() * 14;
      }
    }
  } else if (o.state === "freeze") {
    // Quieto, con la cabeza en alto, mirando al peligro
    o.alertT++;
    if (o.alertT > 300) {
      // El peligro no se acerca: se relaja
      o.state = "bask";
      o.calmTimer = 240;
      o.idleTimer = 120;
    }
  } else if (o.state === "dash") {
    // Carrerita corta y rápida
    dx = o.dashDx;
    dy = o.dashDy;
    speed = 0.1;
  } else {
    // bask: tomando el sol casi todo el tiempo; de repente corre un tramo corto
    o.idleTimer--;
    if (o.idleTimer <= 0) {
      const hx = o.homeGx - o.gx;
      const hy = o.homeGy - o.gy;
      const hd = Math.hypot(hx, hy);
      let ux = 0;
      let uy = 0;
      let dist = 0;

      if (hd > 0.6 && (hd > 2 || Math.random() < 0.7)) {
        // Regresa a su lugar favorito
        ux = hx / hd;
        uy = hy / hd;
        dist = Math.min(hd, 3);
      } else {
        const a = Math.random() * Math.PI * 2;
        ux = Math.cos(a);
        uy = Math.sin(a);
        dist = 1.5 + Math.random() * 1.5;
      }

      if (walkable(o.gx + ux * 0.5, o.gy + uy * 0.5)) {
        o.state = "dash";
        o.dashDx = ux;
        o.dashDy = uy;
        o.dashLeft = dist;
        dx = ux;
        dy = uy;
        speed = 0.1;
      } else {
        o.idleTimer = 60 + Math.random() * 120;
      }
    }
  }

  // 3. Movimiento con colisiones
  const stepX = dx * speed;
  const stepY = dy * speed;
  let moved = false;

  if (Math.abs(stepX) > 0.0001 && walkable(o.gx + stepX, o.gy)) {
    o.gx += stepX;
    moved = true;
  }
  if (Math.abs(stepY) > 0.0001 && walkable(o.gx, o.gy + stepY)) {
    o.gy += stepY;
    moved = true;
  }

  o.moving = moved;

  if (o.state === "dash") {
    o.dashLeft -= Math.hypot(stepX, stepY);
    if (!moved || o.dashLeft <= 0) {
      o.state = "bask";
      o.moving = false;
      o.idleTimer = 150 + Math.random() * 350;
    }
  }

  // 4. Orientación: hacia donde corre, o hacia el peligro si está congelado
  let faceX = dx;
  let faceY = dy;
  if (o.state === "freeze" && nearest < 14) {
    faceX = lookX;
    faceY = lookY;
  }
  const screenDirection = faceX - faceY;
  if (Math.abs(screenDirection) > 0.01) {
    o.flip = screenDirection < 0;
  }

  // 5. Altura del terreno y profundidad de dibujo
  o.h += (tileH(Math.round(o.gx), Math.round(o.gy)) - o.h) * 0.2;
  o.depth = o.gx + o.gy;
}

// Mono aullador: territorial, no asustadizo. Se queda en su sitio, te vigila y te
// regaña; solo si te pegas mucho trepa al árbol más cercano y se esconde un rato.
function startHowl(o, howlers, chain) {
  o.howlLeft = 100 + Math.random() * 40;

  // Los demás monos cercanos contestan con retraso (según la distancia)
  if (!chain) return;
  howlers.forEach((m) => {
    if (m === o || m.state !== "rest" || m.howlLeft > 0 || m.answerT > 0)
      return;
    const d = Math.hypot(m.gx - o.gx, m.gy - o.gy);
    if (d < 28) m.answerT = 30 + d * 4 + Math.random() * 30;
  });
}

function updateHowler(o, howlers) {
  const WATCH_R = 7; // empieza a vigilar
  const WATCH_OUT_R = 8.5; // deja de vigilar
  const SCOLD_R = 4.2; // empieza a regañar
  const SCOLD_OUT_R = 5.2;
  const CLIMB_R = 1.9; // te pegaste demasiado

  const d = Math.hypot(player.gx - o.gx, player.gy - o.gy);
  if (o.climbCool > 0) o.climbCool--;
  if (o.howlLeft > 0) o.howlLeft--;
  o.hop = 0;

  const faceTo = (tx, ty) => {
    const sd = tx - o.gx - (ty - o.gy);
    if (Math.abs(sd) > 0.01) o.flip = sd < 0;
  };

  // Posición del árbol: depth por debajo para que tronco y copa lo cubran
  const treeDepth = () => o.tree.gx + o.tree.gy - 0.01;

  if (o.state === "climb") {
    // Camina hasta el pie del árbol
    const tdx = o.tree.gx - o.gx;
    const tdy = o.tree.gy - o.gy;
    const td = Math.hypot(tdx, tdy);

    if (td <= o.tree.r + 0.45) {
      o.state = "up";
      o.howlLeft = 0;
    } else {
      const sp = 0.055;
      const sx = (tdx / td) * sp;
      const sy = (tdy / td) * sp;
      let moved = false;
      if (walkable(o.gx + sx, o.gy)) {
        o.gx += sx;
        moved = true;
      }
      if (walkable(o.gx, o.gy + sy)) {
        o.gy += sy;
        moved = true;
      }
      o.stuck = moved ? Math.max(0, o.stuck - 1) : o.stuck + 1;
      faceTo(o.tree.gx, o.tree.gy);
      if (o.stuck > 100) {
        // No puede llegar: se queda regañando
        o.state = "scold";
        o.climbCool = 300;
        o.scoldT = 0;
      }
    }
  } else if (o.state === "up") {
    o.z += 0.9;
    o.depth = treeDepth();
    if (o.z >= 34) {
      o.z = 34;
      o.state = "hidden";
      o.hiddenT = 420 + Math.random() * 360;
    }
  } else if (o.state === "hidden") {
    o.depth = treeDepth();
    if (o.hiddenT > 0) o.hiddenT--;
    // Baja solo cuando pasó el tiempo y el jugador ya no está encima
    if (o.hiddenT <= 0 && d > SCOLD_R + 1) o.state = "down";
  } else if (o.state === "down") {
    o.z -= 0.9;
    o.depth = treeDepth();
    if (o.z <= 0) {
      o.z = 0;
      o.state = "rest";
      o.climbCool = 360;
      o.scoldT = 0;
      o.howlT = 200 + Math.random() * 600;
      o.depth = o.gx + o.gy;
    }
  } else {
    // 1. Elegir estado según la distancia al jugador
    if (d < SCOLD_R || (o.state === "scold" && d < SCOLD_OUT_R)) {
      if (o.state !== "scold") o.scoldT = 0;
      o.state = "scold";
    } else if (d < WATCH_R || (o.state === "watch" && d < WATCH_OUT_R)) {
      o.state = "watch";
    } else {
      o.state = "rest";
    }

    // 2. Trepar: solo si sigue pegado al mono después de un rato de regaño
    if (o.state === "scold") {
      o.scoldT = d < CLIMB_R + 1.2 ? o.scoldT + 1 : Math.max(0, o.scoldT - 1);

      if (d < CLIMB_R && o.climbCool <= 0 && o.scoldT > 90) {
        let best = null;
        let bd = 14;
        trees.forEach((t) => {
          const td = Math.hypot(t.gx - o.gx, t.gy - o.gy);
          if (td < bd) {
            bd = td;
            best = t;
          }
        });
        if (best) {
          o.tree = best;
          o.state = "climb";
          o.stuck = 0;
          o.howlLeft = 0;
        }
      }
    }

    // 3. Comportamiento de cada estado
    if (o.state === "rest") {
      o.scoldT = 0;

      // Aullido espontáneo a intervalos largos (los vecinos contestan)
      o.howlT--;
      if (o.howlT <= 0) {
        startHowl(o, howlers, true);
        o.howlT = 900 + Math.random() * 1500;
      }

      // Responde al aullido de otro mono
      if (o.answerT > 0) {
        o.answerT--;
        if (o.answerT <= 0) startHowl(o, howlers, false);
      }

      // De vez en cuando voltea la cabeza hacia el otro lado
      o.turnT--;
      if (o.turnT <= 0) {
        o.flip = !o.flip;
        o.turnT = 200 + Math.random() * 400;
      }
    } else if (o.state === "watch") {
      o.answerT = 0;
      faceTo(player.gx, player.gy);
    } else if (o.state === "scold") {
      o.answerT = 0;
      faceTo(player.gx, player.gy);
      // Aúlla con insistencia y da pequeños brincos, sin moverse de su sitio
      o.howlLeft = Math.max(o.howlLeft, 20);
      o.hop = Math.abs(Math.sin(o.scoldT * 0.18)) * 3;
    }
  }

  // Altura del terreno y profundidad de dibujo
  o.h += (tileH(Math.round(o.gx), Math.round(o.gy)) - o.h) * 0.2;
  if (o.z <= 0 && o.state !== "up" && o.state !== "down") {
    o.depth = o.gx + o.gy;
  }
}

function snapCamera() {
  camera.x = WX0 + (player.gx - player.gy) * HW - VIEW_W / 2;
  camera.y = WY0 + (player.gx + player.gy) * HH - player.h * U - VIEW_H / 2 + 8;
}

function update() {
  if (isPaused) return;

  // Velocidad ligeramente mayor (0.075) para explorar cómodamente el mapa 10x
  const spd = player.boat ? 0.09 : 0.075;
  let dGx = 0;
  let dGy = 0;

  if (keys.up) {
    dGx -= spd;
    dGy -= spd;
  }
  if (keys.down) {
    dGx += spd;
    dGy += spd;
  }
  if (keys.left) {
    dGx -= spd;
    dGy += spd;
  }
  if (keys.right) {
    dGx += spd;
    dGy -= spd;
  }

  player.moving = dGx !== 0 || dGy !== 0;

  if (player.moving) {
    player.step++;
    const sdx = dGx - dGy;
    if (sdx > 0) player.face = 1;
    else if (sdx < 0) player.face = -1;
    // Dirección de marcha suavizada: así los puestos de los perros no saltan al girar
    const dm = Math.hypot(dGx, dGy);
    player.aimGx = dGx / dm;
    player.aimGy = dGy / dm;
    player.dirGx += (dGx / dm - player.dirGx) * 0.05;
    player.dirGy += (dGy / dm - player.dirGy) * 0.05;
    const dn = Math.hypot(player.dirGx, player.dirGy);
    if (dn < 0.2) {
      player.dirGx = dGx / dm;
      player.dirGy = dGy / dm;
    } else {
      player.dirGx /= dn;
      player.dirGy /= dn;
    }
    // En bote solo se avanza por agua que no es playa; a pie, por tierra y playa
    const canGo = player.boat ? sailable : walkable;
    if (canGo(player.gx + dGx, player.gy)) player.gx += dGx;
    if (canGo(player.gx, player.gy + dGy)) player.gy += dGy;
  } else {
    player.step = 0;
  }

  //COMPORTAMIENTO DEL JAGUAR
  const jaguars = statics.filter((o) => o.kind === "jaguar");
  const howlers = statics.filter((o) => o.kind === "howler");
  statics.forEach((o) => {
    if (o.kind === "jaguar") {
      updateJaguar(o);
    } else if (o.kind === "deer") {
      updateDeer(o, jaguars);
    } else if (o.kind === "tolok") {
      updateTolok(o, jaguars);
    } else if (o.kind === "howler") {
      updateHowler(o, howlers);
    } else if (o.kind === "dog") {
      updateDog(o);
    } else if (
      o.kind === "alux" ||
      o.kind === "huaychivo" ||
      o.kind === "huaypek" ||
      o.kind === "kaskabal" ||
      o.kind === "xtabay"
    ) {
      updateAlux(o);
    }
  });
  // Los enemigos derrotados desaparecen cuando termina su animación
  for (let i = statics.length - 1; i >= 0; i--)
    if (statics[i].dead && statics[i].dieT <= 0) statics.splice(i, 1);
  flamingoFrame++;
  flamingos.forEach((f) => updateFlamingo(f, jaguars));

  // El bote acompaña al jugador mientras navega
  if (player.boat) {
    player.boat.gx = player.gx;
    player.boat.gy = player.gy;
    player.boat.flip = player.face < 0;
    player.z = 0;
    player.jumpT = 0;
  }
  boats.forEach((b) => (b.h = tileH(Math.round(b.gx), Math.round(b.gy))));
  if (player.msgT > 0) player.msgT--;
  if (player.faintT > 0) player.faintT--;

  const targetH = tileH(Math.round(player.gx), Math.round(player.gy));
  player.h += (targetH - player.h) * 0.25;

  const tx = WX0 + (player.gx - player.gy) * HW - VIEW_W / 2;
  const ty = WY0 + (player.gx + player.gy) * HH - player.h * U - VIEW_H / 2 + 8;
  camera.x += (tx - camera.x) * 0.14;
  camera.y += (ty - camera.y) * 0.14;

  if (player.jumpT > 0) {
    player.jumpT++;
    if (player.jumpT >= 26) {
      player.jumpT = 0;
      player.z = 0;
    } else {
      player.z = Math.sin((Math.PI * player.jumpT) / 26) * 14;
    }
  }

  checkCollect();
  checkDogFound();

  // Si algún kaskabal detectó al jugador, la oscuridad se cierra poco a poco;
  // cuando lo pierde, se disipa más despacio
  const hunted = statics.some(
    (o) =>
      o.kind === "kaskabal" &&
      (o.state === "chase" || o.state === "windup" || o.state === "recover"),
  );
  fear += ((hunted ? 1 : 0) - fear) * (hunted ? 0.05 : 0.025);
  if (fear < 0.003) fear = 0;

  // Xtabay: mientras te persigue, la pantalla se tiñe de rojo (más rápido al
  // empezar y se disipa lentamente al perderte)
  const stalked = statics.some(
    (o) =>
      o.kind === "xtabay" &&
      (o.state === "chase" || o.state === "windup" || o.state === "recover"),
  );
  bloodFear += ((stalked ? 1 : 0) - bloodFear) * (stalked ? 0.06 : 0.03);
  if (bloodFear < 0.003) bloodFear = 0;

  if (player.attackT > 0) player.attackT--;
  if (player.invuln > 0) player.invuln--;

  hammocks.forEach((h) => {
    if (Math.hypot(player.gx - h.gx, player.gy - h.gy) < 0.9) {
      if (health < MAX_HEALTH) {
        health = MAX_HEALTH;
        updateHUD();
      }
    }
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/* ---------- Render ---------- */
function toScreen(gx, gy, h) {
  return {
    x: Math.round(WX0 + (gx - gy) * HW - camera.rx),
    y: Math.round(WY0 + (gx + gy) * HH - h * U - camera.ry),
  };
}

function blit(s, x, y, flip) {
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(s.cv, -s.ax, -s.ay);
    ctx.restore();
  } else {
    ctx.drawImage(s.cv, x - s.ax, y - s.ay);
  }
}

function drawOcean(now) {
  ctx.fillStyle = "#1b78cf";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cw = 28;
  const ch = 14;
  const t = now / 1000;
  const i0 = Math.floor(camera.rx / cw) - 1;
  const j0 = Math.floor(camera.ry / ch) - 1;
  const iN = i0 + Math.ceil(VIEW_W / cw) + 3;
  const jN = j0 + Math.ceil(VIEW_H / ch) + 3;

  for (let j = j0; j <= jN; j++) {
    for (let i = i0; i <= iN; i++) {
      const h = hash2(i, j, 11);
      if (h > 0.55) continue;
      const phase = Math.sin(t * 1.6 + h * 40);
      const sx =
        i * cw + (j & 1 ? cw >> 1 : 0) + Math.round(phase * 2) - camera.rx;
      const sy = j * ch + Math.round(h * 6) - camera.ry;
      ctx.fillStyle = phase > 0.35 ? "#55b0f2" : "#3f9bea";
      ctx.fillRect(sx, sy + 1, 3, 1);
      ctx.fillRect(sx + 3, sy, 3, 1);
      ctx.fillRect(sx + 6, sy + 1, 3, 1);
    }
  }
}

function drawSparks(now) {
  ctx.fillStyle = "#eafcff";
  for (let i = 0; i < sparks.length; i++) {
    const s = sparks[i];
    const x = s.x - camera.rx;
    const y = s.y - camera.ry;
    if (x < -4 || x > VIEW_W + 4 || y < -4 || y > VIEW_H + 4) continue;
    if (Math.sin(now / 450 + s.p) > 0.82) {
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
  }
}

// Ondas en el agua cuando el personaje camina por una playa (agua somera)
// Ondas en el agua cuando un personaje camina por agua somera
function drawRipple(x, y, now, moving = player.moving) {
  const speed = moving ? 380 : 900;

  for (let k = 0; k < 2; k++) {
    const t = (now / speed + k * 0.5) % 1;
    const rx = 4 + t * 8;
    const ry = rx / 2;

    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.fillStyle = "#ffffff";

    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      ctx.fillRect(
        Math.round(x + Math.cos(a) * rx),
        Math.round(y + Math.sin(a) * ry),
        1,
        1,
      );
    }
  }

  ctx.globalAlpha = 1;
}

// Exploradora maya (inspirada en la ilustración de referencia): corona de flores,
// trenzas con plumas, huipil bordado, collar de jade, falda con flecos y sandalias.
// Se dibuja con rectángulos/píxeles, sin imágenes.
function drawPlayer(x, y, now, onBoat) {
  const f = player.face;
  if (onBoat) {
    // la sombra y las ondas las pone el bote
  } else if (isShallow(tileAt(Math.round(player.gx), Math.round(player.gy)))) {
    drawRipple(x, y, now || 0);
  } else {
    ellipse(ctx, x, y, 6, 2, "rgba(0,0,0,0.3)");
  }
  if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) return;
  const py = y - Math.round(player.z);
  const air = player.z > 0.5;
  // En el bote el personaje va quieto: la animación la pone el bote
  const walk = player.moving && !onBoat ? (player.step >> 3) & 1 : 0;
  const bob = player.moving && !onBoat ? (player.step >> 2) & 1 : 0;
  const legL = air ? 4 : walk ? 4 : 5;
  const legR = air ? 4 : walk ? 5 : 4;
  const H = py - bob; // referencia del cuerpo (sube y baja al caminar)

  const SKIN = "#c68a5e";
  const SKIN_D = "#a96d45";
  const CREAM = "#f6efdc";
  const CREAM_D = "#d8ccb0";
  const RED = "#c1272d";
  const GREEN = "#2e8b57";
  const JADE = "#2fbf71";
  const JADE_D = "#1d6b48";
  const HAIR = "#3b2315";
  const HAIR_L = "#5a3820";
  const BROWN = "#8a5a2e";
  const BROWN_D = "#5e3a1a";

  // piernas y sandalias
  rect(ctx, x - 3, py - legL, 2, legL, SKIN);
  rect(ctx, x + 1, py - legR, 2, legR, SKIN);
  px(ctx, x - 2, py - legL, SKIN_D);
  px(ctx, x + 1, py - legR, SKIN_D);
  rect(ctx, x - 3, py - 3, 2, 1, "#d9a066"); // tiras de la sandalia
  rect(ctx, x + 1, py - 3, 2, 1, "#d9a066");
  rect(ctx, x - 3, py - 1, 2, 1, "#6b3f1e");
  rect(ctx, x + 1, py - 1, 2, 1, "#6b3f1e");

  // falda bordada con flecos (6 filas)
  for (let i = 0; i < 6; i++) {
    const hw = i < 2 ? 4 : 5;
    const yy = H - 10 + i;
    for (let xx = -hw; xx < hw; xx++) {
      let col = xx >= hw - 2 ? CREAM_D : CREAM;
      if (i === 0)
        col = xx >= hw - 2 ? BROWN_D : BROWN; // cinturón
      else if (i === 4)
        col = xx % 2 === 0 ? RED : GREEN; // greca del dobladillo
      else if (i === 5) col = xx % 2 === 0 ? BROWN : BROWN_D; // flecos
      px(ctx, x + xx, yy, col);
    }
  }
  px(ctx, x - 1, H - 10, JADE); // adorno del cinturón
  // pájaro bordado
  px(ctx, x - 1, H - 9, GREEN);
  px(ctx, x, H - 9, RED);
  rect(ctx, x - 2, H - 8, 3, 1, GREEN);
  px(ctx, x + 1, H - 8, RED);
  px(ctx, x - 1, H - 7, GREEN);
  px(ctx, x, H - 7, GREEN);

  // huipil (blusa) con cuello, collar de jade y banda bordada
  for (let j = 0; j < 6; j++) {
    for (let xx = -4; xx < 4; xx++) {
      px(ctx, x + xx, H - 16 + j, xx >= 2 ? CREAM_D : CREAM);
    }
  }
  rect(ctx, x - 1, H - 16, 2, 1, SKIN); // escote
  rect(ctx, x - 2, H - 15, 4, 1, JADE); // collar
  px(ctx, x - 1, H - 14, JADE); // dije
  px(ctx, x, H - 14, JADE_D);
  for (let xx = -4; xx < 4; xx++) {
    px(ctx, x + xx, H - 13, xx % 2 === 0 ? RED : GREEN); // banda bordada
  }

  // brazos: manga corta, antebrazo y pulseras de jade
  [-1, 1].forEach((d) => {
    const ax = d < 0 ? x - 6 : x + 4;
    rect(ctx, ax, H - 15, 2, 2, d < 0 ? CREAM : CREAM_D);
    rect(ctx, ax, H - 13, 2, 4, SKIN);
    px(ctx, d < 0 ? ax : ax + 1, H - 13, SKIN_D);
    rect(ctx, ax, H - 11, 2, 1, JADE);
  });

  // trenzas con cuentas de jade y plumas
  [-4, 3].forEach((bx) => {
    for (let k = 0; k < 11; k++) {
      px(ctx, x + bx, H - 22 + k, k % 2 ? HAIR : HAIR_L);
    }
    px(ctx, x + bx, H - 11, JADE);
  });
  [-5, 4].forEach((fx) => {
    px(ctx, x + fx, H - 22, "#f4ead2");
    px(ctx, x + fx, H - 21, "#f4ead2");
    px(ctx, x + fx, H - 20, "#7a5a3a");
  });

  // cabeza
  rect(ctx, x - 3, H - 22, 6, 5, SKIN);
  px(ctx, x - 3, H - 18, SKIN_D);
  px(ctx, x + 2, H - 18, SKIN_D);
  rect(ctx, x - 3, H - 23, 6, 1, HAIR); // cabello
  rect(ctx, x - 3, H - 22, 2, 1, HAIR);
  rect(ctx, x + 1, H - 22, 2, 1, HAIR);
  px(ctx, x - 3, H - 21, HAIR);
  px(ctx, x + 2, H - 21, HAIR);
  px(ctx, x - 2 + f, H - 20, "#2a1b12"); // ojos
  px(ctx, x + 1 + f, H - 20, "#2a1b12");
  px(ctx, x - 2, H - 19, "#d9805f"); // mejillas
  px(ctx, x + 1, H - 19, "#d9805f");
  px(ctx, f > 0 ? x : x - 1, H - 18, "#9c4a3a"); // boca

  // corona de flores
  const crown = [
    "#2f8a38",
    "#e63946",
    "#e63946",
    "#2f8a38",
    "#2f8a38",
    "#ffd166",
    "#e63946",
    "#2f8a38",
  ];
  crown.forEach((col, k) => px(ctx, x - 4 + k, H - 24, col));
  px(ctx, x - 3, H - 25, "#e63946");
  px(ctx, x - 2, H - 25, "#ffd166");
  px(ctx, x + 1, H - 25, "#e63946");
  px(ctx, x + 2, H - 25, "#ffd166");
}

// Corazones sobre un enemigo (aparecen al pelear o al estar herido)
const HEART_ROWS = [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."];
function drawEnemyHearts(o) {
  const combat =
    o.state === "chase" || o.state === "windup" || o.state === "recover";
  if (o.hp >= o.maxHp && !combat) return;
  const per = 5;
  const rows = Math.ceil(o.maxHp / per);
  const top = (o.spr ? o.spr.ay : 30) + 14;
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(per, o.maxHp - r * per);
    const w = inRow * 6 - 1;
    const x0 = Math.round(o.sx - w / 2);
    const y0 = Math.round(o.sy - top - r * 7);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x0 - 1, y0 - 1, w + 2, 7);
    for (let k = 0; k < inRow; k++) {
      const full = r * per + k < o.hp;
      HEART_ROWS.forEach((row, yy) => {
        for (let xx = 0; xx < 5; xx++)
          if (row[xx] === "X")
            px(
              ctx,
              x0 + k * 6 + xx,
              y0 + yy,
              full ? (xx === 1 && yy === 1 ? "#ffc2c9" : "#ff4d5e") : "#4a2328",
            );
      });
    }
  }
}

// Mandoble de espada: la hoja barre un arco al frente y deja una estela
function drawSword(x, y) {
  const p = 1 - player.attackT / SWORD_COOLDOWN; // 0 → 1 durante el golpe
  let ux = player.aimGx - player.aimGy; // dirección en pantalla (isométrica)
  let uy = (player.aimGx + player.aimGy) / 2;
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  const base = Math.atan2(uy, ux);
  const SWEEP = 1.4; // barre ±80°
  const cx = x;
  const cy = y - Math.round(player.z) - 11;
  // Estela del arco ya recorrido
  for (let i = 0; i <= 12; i++) {
    const t = (p * i) / 12;
    const a = base - SWEEP + 2 * SWEEP * t;
    ctx.globalAlpha = 0.25 + 0.55 * (i / 12);
    px(
      ctx,
      Math.round(cx + Math.cos(a) * 14),
      Math.round(cy + Math.sin(a) * 10.5),
      "#e8f6ff",
    );
    px(
      ctx,
      Math.round(cx + Math.cos(a) * 12),
      Math.round(cy + Math.sin(a) * 9),
      "#bfe3f5",
    );
  }
  ctx.globalAlpha = 1;
  // Hoja, guarda y empuñadura
  const a = base - SWEEP + 2 * SWEEP * p;
  const ca = Math.cos(a);
  const sa = Math.sin(a) * 0.75;
  pline(
    ctx,
    cx + ca * 4,
    cy + sa * 4,
    cx + ca * 13,
    cy + sa * 13,
    "#eef4f8",
    1,
  );
  pline(
    ctx,
    cx + ca * 4 + 1,
    cy + sa * 4,
    cx + ca * 12 + 1,
    cy + sa * 12,
    "#9fb0bd",
    1,
  );
  px(ctx, Math.round(cx + ca * 13), Math.round(cy + sa * 13), "#ffffff");
  const gx = cx + ca * 4;
  const gy = cy + sa * 4;
  pline(
    ctx,
    gx - sa * 1.6,
    gy + ca * 1.2,
    gx + sa * 1.6,
    gy - ca * 1.2,
    "#ffd166",
    1,
  );
  pline(ctx, cx + ca * 1, cy + sa * 1, cx + ca * 3, cy + sa * 3, "#8a5a2e", 1);
}

// Texto corto con contorno oscuro (aullidos y avisos)
function drawTag(txt, x, y, col) {
  ctx.font = "6px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000000";
  ctx.fillText(txt, x + 1, y + 1);
  ctx.fillText(txt, x - 1, y + 1);
  ctx.fillStyle = col;
  ctx.fillText(txt, x, y);
}

// Flecha que rebota sobre algo con lo que se puede interactuar con A
function drawHintArrow(x, y, now) {
  const bob = Math.round(Math.sin(now / 160) * 1.5);
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - 3, y + bob, 7, 3);
  ctx.fillRect(x - 2, y + 3 + bob, 5, 2);
  ctx.fillRect(x - 1, y + 5 + bob, 3, 2);
  ctx.fillStyle = "#f72585";
  ctx.fillRect(x - 2, y + 1 + bob, 5, 1);
  ctx.fillRect(x - 1, y + 2 + bob, 3, 1);
  ctx.fillRect(x, y + 3 + bob, 1, 1);
}

// Jugador navegando: capa trasera del bote, personaje dentro y borda delantera encima
function drawBoatedPlayer(x, y, now) {
  const moving = player.moving;
  const flip = player.face < 0;
  // Animación del bote: al avanzar cabecea y se balancea; quieto, flota suave.
  // El personaje no se anima: se mueve junto con el bote.
  const bob = moving
    ? Math.round(Math.sin(now / 150) * 1.6)
    : Math.round(Math.sin(now / 600));
  const sway = moving ? Math.round(Math.sin(now / 320)) : 0;
  const bx = x + sway;

  drawRipple(x, y + 5, now, moving);

  // Estela de espuma detrás de la popa mientras navega
  if (moving) {
    const dir = flip ? 1 : -1;
    for (let k = 0; k < 4; k++) {
      const t = (now / 260 + k * 0.25) % 1;
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.fillStyle = "#ffffff";
      const fx = Math.round(x + dir * (18 + t * 14));
      const fy = Math.round(y + 7 + (k % 2 ? 1 : -1) * t * 2);
      ctx.fillRect(fx, fy, 3 - Math.floor(t * 2), 1);
    }
    ctx.globalAlpha = 1;
  }

  blit(SP.boat.back, bx, y + bob, flip);
  drawPlayer(bx, y + bob + 4, now, true);
  // Los perros van delante de la exploradora (se dibujan después de ella) moviendo la
  // cola, mirando hacia donde avanza el bote. El 1.º y el 2.º van a los lados;
  // el 3.º va en medio, un poco más abajo, para que se distingan los tres.
  // La borda delantera del bote se dibuja encima y los "mete" en el bote.
  dogs
    .filter((d) => d.inBoat)
    .forEach((d, i) => {
      const fr = Math.floor(now / 150 + i) % 2;
      const side = [-13, 13, 0][i] || 0;
      const feet = i === 2 ? 7 : 3;
      blit(d.sp.happy[fr], bx + (flip ? -side : side), y + bob + feet, flip);
    });
  blit(SP.boat.front, bx, y + bob, flip);

  if (player.msgT > 0) {
    drawTag("¡SOLO EN UN MUELLE!", x, y - 44, "#ffd166");
  } else if (nearestPierTile(player.boat.gx, player.boat.gy, 2.2)) {
    drawHintArrow(x, y - 40 + bob, now);
  }
}

function drawObj(o, x, y, now) {
  switch (o.kind) {
    case "sprite":
      blit(o.spr, x, y, o.flip);
      break;

    case "deer": {
      // Si está en agua somera, genera ondas a su alrededor (igual que el jaguar)
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.state === "flee" || o.walking);
      }

      if (o.state === "flee") {
        // Corre a saltos
        blit(SP.deer, x, y - Math.round(o.hop), o.flip);
      } else if (o.state === "graze" && o.eating) {
        // Pastando con la cabeza baja
        blit(SP.deerGraze, x, y, o.flip);
      } else if (o.state === "graze" && o.walking) {
        // Camina despacio, con un pequeño vaivén
        const step = Math.sin(now / 160 + o.phase) > 0.5 ? 1 : 0;
        blit(SP.deer, x, y - step, o.flip);
      } else {
        const b = Math.sin(now / 700 + o.phase) > 0.85 ? 1 : 0;
        blit(SP.deer, x, y - b, o.flip);

        // Alerta: aparece un signo de exclamación sobre la cabeza
        if (o.state === "alert" && o.alertT < 70) {
          const ex = x + (o.flip ? -9 : 9);
          rect(ctx, ex - 1, y - 38, 2, 5, "#ffb703");
          rect(ctx, ex - 1, y - 31, 2, 2, "#ffb703");
        }
      }
      break;
    }

    case "flamingo": {
      if (o.state === "fly") {
        const k = o.z / 26;

        // Ondas al despegar/aterrizar y sombra que se achica con la altura
        if (o.z < 8 && isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
          drawRipple(x, y, now, true);
        }
        ellipse(
          ctx,
          x,
          y,
          Math.round(6 - 3 * k),
          2,
          "rgba(0,0,0," + (0.28 - 0.15 * k).toFixed(2) + ")",
        );

        // Aleteo: arriba, medio, abajo, medio (más rápido cerca del suelo)
        const seq = [0, 1, 2, 1];
        const f = seq[Math.floor(now / (o.z < 8 ? 90 : 120) + o.phase) % 4];
        blit(SP.flamingoFly[f], x, y - 10 - o.z, o.flip);
        break;
      }

      const down = o.headDown ? 1 : 0;

      // Ondas en el agua somera (más rápidas si camina o huye)
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.moving);
      } else {
        ellipse(ctx, x, y + 1, 7, 2, "rgba(255,255,255,0.25)");
      }

      // Al huir da pasitos rápidos (pequeño vaivén)
      const bob =
        o.state === "flee" && Math.floor(now / 110 + o.phase) % 2 ? 1 : 0;
      blit(SP.flamingo[down], x, y - bob, o.flip);

      // Signo de exclamación solo en quien detectó el peligro (inicia la cadena)
      if (o.state === "alert" && o.direct && o.alertT < 70) {
        const ex = x + (o.flip ? -7 : 7);
        rect(ctx, ex - 1, y - 33, 2, 5, "#ffb703");
        rect(ctx, ex - 1, y - 26, 2, 2, "#ffb703");
      }
      break;
    }

    case "chest": {
      const t = o.t;
      if (t.opened) {
        blit(SP.chest[1], x, y);
      } else {
        blit(SP.chest[0], x, y);
        const tw = Math.sin(now / 260 + t.id * 2);

        if (tw > 0.3) {
          const sx = x + (t.id % 2 ? -7 : 7);
          const sy = y - 20 + Math.round(tw * 2);
          ctx.fillStyle = "#fff6c8";
          ctx.fillRect(sx, sy - 1, 1, 3);
          ctx.fillRect(sx - 1, sy, 3, 1);
        }

        const d = Math.hypot(player.gx - t.gx, player.gy - t.gy);

        if (d < 2.6) {
          const bob = Math.round(Math.sin(now / 160) * 1.5);
          ctx.fillStyle = "#000000";
          ctx.fillRect(x - 3, y - 27 + bob, 7, 3);
          ctx.fillRect(x - 2, y - 24 + bob, 5, 2);
          ctx.fillRect(x - 1, y - 22 + bob, 3, 2);
          ctx.fillStyle = "#f72585";
          ctx.fillRect(x - 2, y - 26 + bob, 5, 1);
          ctx.fillRect(x - 1, y - 25 + bob, 3, 1);
          ctx.fillRect(x, y - 24 + bob, 1, 1);
        }
      }
      break;
    }

    case "dog": {
      if (o.inBoat) break; // va dentro del bote: lo dibuja drawBoatedPlayer
      const d = Math.hypot(player.gx - o.gx, player.gy - o.gy);
      // "Cerca" depende de su puesto: Chelita va más atrás, así que su radio es mayor
      const nearR = Math.max(
        3.2,
        Math.hypot(o.cfg.slotBack, o.cfg.slotSide) + 1.2,
      );
      const near = o.found && d < nearR;

      // Ondas si va por agua somera
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.moving);
      }

      let spr;
      let bob = 0;
      if (o.moving) {
        // Al correr alterna las patas más rápido y da pequeños brincos
        const fr = Math.floor(now / (o.running ? 80 : 130) + o.phase) % 2;
        spr = o.sp.walk[fr];
        bob = o.running && fr ? 1 : 0;
      } else {
        // Parado: mueve la cola; si la exploradora está cerca, más contento
        const fr = Math.floor(now / (near ? 150 : 520) + o.phase) % 2;
        spr = (near ? o.sp.happy : o.sp.stand)[fr];
      }
      blit(spr, x, y - bob, o.flip);

      if (o.barkLeft > 0) {
        drawTag("¡GUAU!", x, y - 26, "#ffffff");
      } else if (near) {
        drawTag(o.name.toUpperCase(), x, y - 26, "#ffd166");
      }
      break;
    }

    case "alux": {
      // Ondas si va por agua somera, sombra ya viene en el sprite
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.moving);
      }

      let spr = SP.alux.stand;
      let bob = 0;
      if (o.hitT > 0) {
        spr = SP.alux.hit;
      } else if (o.state === "windup") {
        spr = SP.alux.wind;
        // Tiembla antes de golpear
        bob = Math.floor(now / 60) % 2;
      } else if (o.moving) {
        const fr =
          Math.floor(now / (o.state === "chase" ? 110 : 220) + o.phase) % 2;
        spr = SP.alux.walk[fr];
        bob = o.state === "chase" && fr ? 1 : 0;
      } else {
        // Quieto: respira un poco
        bob = Math.sin(now / 500 + o.phase) > 0.8 ? 1 : 0;
      }
      blit(spr, x, y - bob, o.flip);

      if (o.spotT > 0) drawTag("¡!", x, y - 16, "#ff595e");
      else if (o.state === "windup")
        drawTag("!", x + (o.flip ? -8 : 8), y - 14, "#ffb703");
      break;
    }

    case "huaypek": {
      // Ondas si va por agua somera, sombra ya viene en el sprite
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.moving);
      }

      let spr = SP.huaypek.stand;
      let bob = 0;
      const aggro =
        o.state === "chase" || o.state === "windup" || o.state === "recover";
      if (o.hitT > 0) spr = SP.huaypek.hit;
      else if (o.state === "windup") {
        spr = SP.huaypek.wind;
        bob = Math.floor(now / 60) % 2;
      } else if (o.state === "chase" && o.moving) {
        // corre en dos patas
        const fr = Math.floor(now / 110 + o.phase) % 2;
        spr = SP.huaypek.run[fr];
        bob = fr ? 1 : 0;
      } else if (aggro) {
        spr = SP.huaypek.run[0]; // alerta, erguido
        bob = Math.sin(now / 200 + o.phase) > 0.6 ? 1 : 0;
      } else if (o.moving) {
        const fr = Math.floor(now / 220 + o.phase) % 2;
        spr = SP.huaypek.walk[fr];
      } else bob = Math.sin(now / 500 + o.phase) > 0.8 ? 1 : 0;
      blit(spr, x, y - bob, o.flip);

      const topPek = SP.huaypek.run[0].ay - 2;
      if (o.spotT > 0) drawTag("¡!", x, y - topPek, "#ff595e");
      else if (o.state === "windup")
        drawTag("!", x + (o.flip ? -10 : 10), y - topPek + 6, "#ffb703");
      break;
    }

    case "huaychivo": {
      // Ondas si va por agua somera (la sombra ya viene en el sprite)
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.moving);
      }

      let spr = SP.huaychivo.stand;
      let bob = 0;
      if (o.hitT > 0) {
        spr = SP.huaychivo.hit;
      } else if (o.state === "windup") {
        spr = SP.huaychivo.wind;
        // Tiembla antes de golpear
        bob = Math.floor(now / 60) % 2;
      } else if (o.moving) {
        // Ciclo de 4 cuadros (más rápido al perseguir)
        const fr =
          Math.floor(now / (o.state === "chase" ? 90 : 170) + o.phase * 2) % 4;
        spr = SP.huaychivo.walk[fr];
      } else {
        // Quieto: respira (alterna dos poses)
        if (Math.floor(now / 550 + o.phase * 3) % 2) spr = SP.huaychivo.idle;
      }
      blit(spr, x, y - bob, o.flip);

      const top = SP.huaychivo.stand.ay + 4;
      if (o.spotT > 0) drawTag("¡!", x, y - top, "#ff595e");
      else if (o.state === "windup")
        drawTag("!", x + (o.flip ? -12 : 12), y - top + 8, "#ffb703");
      break;
    }

    case "kaskabal": {
      let spr = SP.kaskabal.stand;
      let bob = 0;
      if (o.hitT > 0) {
        spr = SP.kaskabal.hit;
      } else if (o.state === "windup") {
        spr = SP.kaskabal.wind;
        // Tiembla antes de golpear
        bob = Math.floor(now / 60) % 2;
      } else if (o.moving) {
        const fr =
          Math.floor(now / (o.state === "chase" ? 74 : 320) + o.phase) % 2;
        spr = SP.kaskabal.walk[fr];
        bob = o.state === "chase" && fr ? 1 : 0;
      } else {
        // Quieto: respira un poco
        bob = Math.sin(now / 700 + o.phase) > 0.8 ? 1 : 0;
      }
      blit(spr, x, y - bob, o.flip);

      const top = SP.kaskabal.stand.ay + 6;
      if (o.spotT > 0) drawTag("¡!", x, y - top, "#ff595e");
      else if (o.state === "windup") drawTag("!", x + 12, y - top, "#ffb703");
      break;
    }

    case "xtabay": {
      // Ondas si va por agua somera (la sombra ya viene en el sprite)
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.moving);
      }

      let spr = SP.xtabay.stand;
      let bob = 0;
      if (o.hitT > 0) {
        spr = SP.xtabay.hit;
      } else if (o.state === "windup") {
        spr = SP.xtabay.wind;
        // Tiembla antes de atacar
        bob = Math.floor(now / 60) % 2;
      } else if (o.moving) {
        const chasing = o.state === "chase";
        const fr = Math.floor(now / (chasing ? 130 : 260) + o.phase) % 2;
        spr = (chasing ? SP.xtabay.chaseWalk : SP.xtabay.walk)[fr];
        bob = chasing && fr ? 1 : 0;
      } else if (o.state === "chase" || o.state === "recover") {
        spr = SP.xtabay.chase;
      } else {
        // Quieta: flota suavemente
        bob = Math.sin(now / 600 + o.phase) > 0.3 ? 1 : 0;
      }
      blit(spr, x, y - bob, o.flip);

      const top = SP.xtabay.stand.ay + 4;
      if (o.spotT > 0) drawTag("¡!", x, y - top, "#ff595e");
      else if (o.state === "windup")
        drawTag("!", x + (o.flip ? -10 : 10), y - top + 6, "#ffb703");
      break;
    }

    case "jaguar": {
      // Alterna las patas al caminar; cuando se detiene, cambia de postura.
      const moving = o.fleeing || (o.pauseTimer <= 0 && o.moveTimer > 0);

      const f = moving
        ? Math.floor(now / (o.fleeing ? 130 : 210) + o.phase) % 2
        : Math.sin(now / 900 + o.phase) > 0.7
          ? 1
          : 0;

      // Si está en agua somera, genera ondas a su alrededor.
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, moving);
      } else {
        ellipse(ctx, x, y, 6, 2, "rgba(0,0,0,0.3)");
      }

      blit(SP.jaguar[f], x, y, o.flip);
      break;
    }

    case "tolok": {
      if (isShallow(tileAt(Math.round(o.gx), Math.round(o.gy)))) {
        drawRipple(x, y, now, o.moving);
      }

      let up;
      if (o.state === "freeze") {
        up = 1; // congelado, cabeza en alto
      } else if (o.moving) {
        up = 0;
      } else {
        // Tomando el sol: hace "lagartijas" de vez en cuando
        up = Math.sin(now / 800 + o.phase) > 0.55 ? 1 : 0;
      }

      // Al correr, pequeño vaivén de patas
      const bob = o.moving && Math.floor(now / 70 + o.phase) % 2 ? 1 : 0;
      blit(SP.tolok[up], x, y - bob, o.flip);
      break;
    }

    case "howler": {
      // Escondido en la copa: no se dibuja
      if (o.state === "hidden") break;

      const scolding = o.state === "scold";
      const howling = o.howlLeft > 0;
      // Al regañar alterna rápido la cabeza; al aullar la mantiene atrás
      const howl = howling ? (scolding ? Math.floor(now / 140) % 2 : 1) : 0;
      const climbing = o.state === "up" || o.state === "down";

      if (o.z > 0) ellipse(ctx, x, y, 4, 2, "rgba(0,0,0,0.2)");

      // Al caminar al árbol, pequeño vaivén
      const bob =
        o.state === "climb" && Math.floor(now / 110 + o.phase) % 2 ? 1 : 0;

      if (climbing) {
        // Se desvanece al subir tras la copa
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, o.z - 18) / 16);
        blit(SP.howler[0], x + (Math.floor(now / 120) % 2), y - o.z, o.flip);
        ctx.globalAlpha = 1;
        break;
      }

      blit(SP.howler[howl], x, y - Math.round(o.hop) - bob, o.flip);

      if (howling) {
        // Ondas de sonido sobre la cabeza
        for (let k = 0; k < 2; k++) {
          const t = (now / 480 + k * 0.5) % 1;
          const r = 5 + t * 9;
          ctx.globalAlpha = (1 - t) * 0.85;
          ctx.fillStyle = "#ffffff";
          for (let a = -2.5; a <= -0.64; a += 0.16) {
            ctx.fillRect(
              Math.round(x + Math.cos(a) * r),
              Math.round(y - 13 - Math.round(o.hop) + Math.sin(a) * r * 0.7),
              1,
              1,
            );
          }
        }
        ctx.globalAlpha = 1;
        drawTag(
          scolding ? "¡UAH!" : "¡UUAAH!",
          x,
          y - 30,
          scolding ? "#ff595e" : "#ffffff",
        );
      } else if (o.state === "watch") {
        // Vigilando: signo de interrogación (distinto al "!" de los demás)
        drawTag("?", x + (o.flip ? -8 : 8), y - 22, "#4cc9f0");
      }
      break;
    }

    case "collectible": {
      // Flota suavemente y brilla
      const bob = Math.round(Math.sin(now / 350 + o.id) * 2);
      ellipse(ctx, x, y, 6, 2, "rgba(0,0,0,0.25)");
      blit(SP.collect[o.type], x, y - 4 + bob);
      const tw = Math.sin(now / 260 + o.id * 2);
      if (tw > 0.3) {
        const sx = x + (o.id % 2 ? -8 : 8);
        const sy = y - 26 + Math.round(tw * 2);
        ctx.fillStyle = "#fff6c8";
        ctx.fillRect(sx, sy - 1, 1, 3);
        ctx.fillRect(sx - 1, sy, 3, 1);
      }
      break;
    }

    case "boat": {
      // Si va ocupado, lo dibuja el jugador (para meterlo dentro del bote)
      if (o.occupied) break;
      const bob = Math.round(Math.sin(now / 600 + o.phase));
      drawRipple(x, y + 5, now, false);
      blit(SP.boat.back, x, y + bob, o.flip);
      blit(SP.boat.front, x, y + bob, o.flip);
      if (boatToBoard() === o) drawHintArrow(x, y - 20 + bob, now);
      break;
    }

    case "player":
      if (player.boat) drawBoatedPlayer(x, y, now);
      else drawPlayer(x, y, now);
      if (player.attackT > 0 && !player.boat) drawSword(x, y);
      if (player.faintT > 0) drawTag("¡TE DESMAYASTE!", x, y - 44, "#ff595e");
      break;
  }
}

function draw(now) {
  camera.rx = Math.round(camera.x);
  camera.ry = Math.round(camera.y);

  drawOcean(now);
  for (let i = 0; i < terrainChunks.length; i++) {
    const k = terrainChunks[i];
    const dx = k.x - camera.rx;
    const dy = k.y - camera.ry;
    if (
      dx > VIEW_W ||
      dy > VIEW_H ||
      dx + k.cv.width < 0 ||
      dy + k.cv.height < 0
    )
      continue;
    ctx.drawImage(k.cv, dx, dy);
  }
  drawSparks(now);

  const ps = toScreen(player.gx, player.gy, player.h);
  const pDepth = player.gx + player.gy;

  const list = [];

  const pushObj = (o) => {
    const s = toScreen(o.gx, o.gy, o.h);
    if (s.x < -70 || s.x > VIEW_W + 70 || s.y < -30 || s.y > VIEW_H + 110)
      return;
    o.sx = s.x;
    o.sy = s.y;
    list.push(o);
  };

  statics.forEach(pushObj);
  flamingos.forEach(pushObj);
  boats.forEach((b) => {
    b.depth = b.gx + b.gy;
    pushObj(b);
  });
  collectItems.forEach((g) => {
    if (g.collected) return;
    g.h = tileH(Math.round(g.gx), Math.round(g.gy));
    pushObj(g);
  });

  treasures.forEach((t) => {
    if (!t.obj)
      t.obj = {
        kind: "chest",
        t,
        gx: t.gx,
        gy: t.gy,
        h: tileH(t.gx, t.gy),
        depth: t.gx + t.gy + 0.01,
      };
    pushObj(t.obj);
  });

  if (!draw.playerObj) draw.playerObj = { kind: "player" };
  const po = draw.playerObj;
  po.gx = player.gx;
  po.gy = player.gy;
  po.h = player.h;
  po.depth = pDepth + 0.02;
  pushObj(po);

  list.sort((a, b) => a.depth - b.depth);

  for (let i = 0; i < list.length; i++) {
    const o = list[i];

    // Las edificaciones/pirámides se vuelven translúcidas si pasas por detrás
    if (
      o.canopy &&
      o.depth > pDepth + 0.02 &&
      Math.abs(ps.x - o.sx) < o.spr.cv.width * 0.42 &&
      ps.y < o.sy &&
      ps.y > o.sy - o.spr.ay
    ) {
      ctx.globalAlpha = 0.55;
      drawObj(o, o.sx, o.sy, now);
      ctx.globalAlpha = 1;
    } else {
      if (o.dead)
        ctx.globalAlpha =
          Math.max(0, o.dieT / ENEMY_DIE_FRAMES) *
          (Math.floor(o.dieT / 3) % 2 ? 0.5 : 1);
      else if (o.hurtT > 0 && Math.floor(o.hurtT / 3) % 2)
        ctx.globalAlpha = 0.45;
      drawObj(o, o.sx, o.sy, now);
      ctx.globalAlpha = 1;
    }
  }
  // Corazones de los enemigos (siempre encima de todo lo demás)
  for (let i = 0; i < list.length; i++)
    if (list[i].maxHp && !list[i].dead) drawEnemyHearts(list[i]);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.globalAlpha = Math.min(1, p.life / 16);
    ctx.fillStyle = p.col;
    ctx.fillRect(
      Math.round(p.x - camera.rx),
      Math.round(p.y - camera.ry),
      2,
      2,
    );
  }

  ctx.globalAlpha = 1;

  // Degradado negro alrededor de la exploradora (oscuridad aterradora)
  if (fear > 0) {
    const cx = ps.x;
    const cy = ps.y - 12;
    const pulse = 1 + Math.sin(now / 260) * 0.05; // late como un corazón
    // El círculo empieza mucho más grande que la pantalla, así que desde el
    // principio el borde es redondo (nunca queda recortado en forma cuadrada)
    const inner = 0;
    const outer = (270 - 194 * fear) * pulse; // el círculo de luz se cierra (radio final 76)
    const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    // Transición amplia: mezcla de curva lineal y suave, así el paso de la luz
    // a la oscuridad total ocupa casi todo el radio, sin borde marcado
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const s = 0.5 * t + 0.5 * (t * t * (3 - 2 * t));
      g.addColorStop(t, `rgba(0,0,0,${(0.8 * fear * s).toFixed(3)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Xtabay: velo rojo sangre que se cierra desde los bordes y late
  if (bloodFear > 0) {
    const cx = ps.x;
    const cy = ps.y - 12;
    const pulse = 1 + Math.sin(now / 180) * 0.06;
    const outer = (300 - 170 * bloodFear) * pulse;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const s = 0.5 * t + 0.5 * (t * t * (3 - 2 * t));
      g.addColorStop(t, `rgba(150,0,10,${(0.62 * bloodFear * s).toFixed(3)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Tinte rojo leve en toda la pantalla
    ctx.fillStyle = `rgba(190,10,20,${(0.1 * bloodFear * pulse).toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function loop(now = 0) {
  update();
  draw(now);
  requestAnimationFrame(loop);
}

/* ---------- Inicio ---------- */
buildMap();
buildSprites();
buildTerrain();
spawnEntities();
initEnemyHp();
setupControls();
updateHUD();
snapCamera();
requestAnimationFrame(loop);
