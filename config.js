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
const dialogOverlay = document.getElementById("dialogOverlay");
const dialogText = document.getElementById("dialogText");

/* ---------- Constantes de Escala 10x ---------- */
const TILE_W = 32;
const TILE_H = 16;
const HW = TILE_W / 2; // 16
const HH = TILE_H / 2; // 8
const U = 6; // píxeles por nivel de altura

// 64 * 64 = 4,096 tiles (10.24 veces más área que 20 * 20 = 400)
const MAP_W = 128;
const MAP_H = 128;
// Resolución interna del lienzo: se adapta a la forma del área disponible (celular,
// PC...) para que la imagen siempre llene toda la pantalla, sin franjas azules.
let VIEW_W = canvas.width;
let VIEW_H = canvas.height;

// Zoom (botón SELECT): k = cuánto mundo se ve respecto al tamaño base.
// Menos mundo en pantalla = más cerca. El nivel MEDIO es la vista de siempre.
const ZOOMS = [
  { name: "CERCA", k: 0.72 },
  { name: "MEDIO", k: 1 },
  { name: "LEJOS", k: 1.45 },
];
let zoomIdx = 1;
let zoomMsgT = 0; // frames que se muestra el nombre del zoom

function cycleZoom() {
  zoomIdx = (zoomIdx + 1) % ZOOMS.length;
  zoomMsgT = 90;
  resizeCanvas();
}

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

// Letreros: se colocan en el editor de mapas (objetos "letrero" de MAP_OBJECTS,
// con el texto como 4.º valor). Al acercarse muestra una flecha; con A se abre
// un cartel de madera con el mensaje; con B se cierra.
const SIGN_RANGE = 1.3;
const signs = MAP_OBJECTS.filter((o) => o[0] === "letrero").map(
  ([, gx, gy, texto], i) => ({
    id: i,
    gx,
    gy,
    text: texto || "...",
  }),
);

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

/* ---------- Espada (habilidad de ataque) ---------- */
// Se coloca en el editor de mapas (objeto "espada"): solo cuenta la primera. Hasta
// que la exploradora la encuentra, el botón B no hace nada. Si el mapa no trae
// ninguna espada, el ataque está disponible desde el inicio (así nunca se bloquea).
const swordSpot = MAP_OBJECTS.find((o) => o[0] === "espada");
const swordItem = swordSpot
  ? {
      kind: "sword",
      gx: swordSpot[1],
      gy: swordSpot[2],
      h: 0,
      depth: swordSpot[1] + swordSpot[2] + 0.01,
      collected: false,
    }
  : null;
let hasSword = !swordItem;

/* ---------- Checkpoints (zona segura de concreto) ---------- */
// Se colocan en el editor de mapas (objeto "checkpoint"). Alrededor de cada uno hay
// un piso de concreto: dentro de él los hostiles no detectan ni lastiman a la
// exploradora. Al desmayarse, reaparece en el último checkpoint que pisó (si no ha
// pisado ninguno, en el punto de inicio).
const MAX_CHECKPOINTS = 5;
const CHECKPOINT_R = 3.2; // radio de la zona segura, en casillas (igual en el editor)
const checkpoints = MAP_OBJECTS.filter((o) => o[0] === "checkpoint")
  .slice(0, MAX_CHECKPOINTS)
  .map(([, gx, gy], i) => ({
    id: i,
    gx,
    gy,
    visited: false,
    flashT: 0,
    tiles: new Set(),
    obj: null,
  }));
const safeTiles = new Set(); // casillas de concreto de todos los checkpoints
const tileKey = (x, y) => y * 1000 + x;
let lastCheckpoint = null;

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
const HUAYCHIVO_SCALE = 1; // escala del sprite (1 = tamaño nativo 60x76; 0.5 = mitad)
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
const SWORD_COOLDOWN = 20; // frames que dura el mandoble (no se puede repetir antes)
const ENEMY_STUN = 22; // frames que un enemigo queda aturdido al recibir un golpe
const ENEMY_KNOCKBACK = 0.07; // retroceso por frame durante el aturdimiento (casillas)
const ENEMY_DIE_FRAMES = 30; // duración de la animación de muerte

// Choco (guardián): si un NPC hostil se acerca a la exploradora, Choco va hacia él
// y lo aparta a base de ladridos y gruñidos. Es un empujón: aturde igual que la
// espada, pero nunca le quita corazones al hostil.
const CHOCO_HOSTILE_KINDS = [
  "alux",
  "huaychivo",
  "huaypek",
  "kaskabal",
  "xtabay",
];
const CHOCO_DEFEND_R = 5; // radio alrededor de la exploradora en el que Choco reacciona
const CHOCO_ATTACK_R = 1.3; // distancia a la que Choco ya puede empujar al hostil
const CHOCO_PUSH = 0.1; // fuerza del empujón
const CHOCO_ATTACK_COOLDOWN = 45; // frames entre empujones
const CHOCO_GROWL_FRAMES = 36; // frames que se muestra el texto de ladrido/gruñido
const CHOCO_ATTACK_SPEED = 0.145; // velocidad al ir hacia el hostil (más rápido que correr normal)

// Cleo (miedosa): si un hostil se acerca a la exploradora, en vez de atacarlo se
// aparta un poco hacia el lado contrario. No huye lejos: se queda cerca de ella.
const CLEO_FLEE_DIST = 8; // qué tan lejos de la exploradora se aleja al huir

// Chelita (animadora): mientras Choco va al ataque, da vueltas a su alrededor ladrando.
const CHELITA_CIRCLE_R = 4; // radio del círculo que traza alrededor de Choco
const CHELITA_CIRCLE_LEAD = 1.5; // casillas de adelanto sobre el círculo (más = giro más fluido, menos = más pegada al borde)

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
let health = MAX_HEALTH;
let isPaused = true; // el juego inicia pausado, en la pantalla de título
let gameStarted = false;
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

// Cámara adelantada: se desplaza hacia donde camina el personaje (en píxeles de pantalla),
// como fracción del ancho/alto de la vista, para ver mejor lo que viene
const LOOK_AHEAD_X = 0.24;
const LOOK_AHEAD_Y = 0.2;
// Suavidad del adelanto de cámara (fracción que avanza por cuadro hacia su objetivo):
// más bajo = más lento y suave; más alto = más rápido y brusco
const LOOK_EASE_MOVE = 0.02; // al caminar / cambiar de dirección
const LOOK_EASE_STOP = 0.012; // al detenerse (vuelve al centro)
const look = { x: 0, y: 0 };
const camera = {
  x: 0,
  y: 0,
  rx: 0,
  ry: 0,
};
