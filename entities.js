"use strict";

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
    // Borde semiabierto: cada casilla [t-0.5, t+0.5) queda cubierta sin huecos
    if (gx >= b.x0 && gx < b.x1 && gy >= b.y0 && gy < b.y1) return true;
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

// Casilla caminable cerca del inicio donde aparece un perro que llega de otro nivel
function dogStartSpot() {
  const cand = [];
  for (let oy = -5; oy <= 5; oy++)
    for (let ox = -5; ox <= 5; ox++) {
      const d = Math.hypot(ox, oy);
      if (d >= 1.5) cand.push([d, ox, oy]);
    }
  cand.sort((a, b) => a[0] - b[0]);
  for (const [, ox, oy] of cand) {
    const x = START_TILE.gx + ox;
    const y = START_TILE.gy + oy;
    if (!walkable(x, y)) continue;
    if (dogs.some((d) => Math.hypot(d.gx - x, d.gy - y) < 1.4)) continue;
    return [x, y];
  }
  return [START_TILE.gx, START_TILE.gy];
}

function spawnEntities() {
  treasures.forEach((t) => reserved.push({ gx: t.gx, gy: t.gy, r: 1.8 }));
  hammocks.forEach((h) => reserved.push({ gx: h.gx, gy: h.gy, r: 1.5 }));
  collectItems.forEach((g) => reserved.push({ gx: g.gx, gy: g.gy, r: 1.2 }));
  if (swordItem) reserved.push({ gx: swordItem.gx, gy: swordItem.gy, r: 1.5 });
  if (boomerangItem)
    reserved.push({ gx: boomerangItem.gx, gy: boomerangItem.gy, r: 1.5 });
  if (redItem) reserved.push({ gx: redItem.gx, gy: redItem.gy, r: 1.5 });
  checkpoints.forEach((cp) =>
    reserved.push({ gx: cp.gx, gy: cp.gy, r: CHECKPOINT_R + 0.8 }),
  );
  signs.forEach((s) => {
    blockers.push({ gx: s.gx, gy: s.gy, r: 0.32 });
    reserved.push({ gx: s.gx, gy: s.gy, r: 1.3 });
  });
  if (novio) {
    blockers.push({ gx: novio.gx, gy: novio.gy, r: 0.9 });
    reserved.push({ gx: novio.gx, gy: novio.gy, r: 1.8 });
  }

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

  // Ruinas mayas (estructuras de piedra): ["ruina", gx, gy, variante 0-2]
  byType("ruina").forEach(([, gx, gy, v], i) => {
    addStatic(SP.ruins[(v | 0) % SP.ruins.length], gx, gy, {
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
  // Los perros ya encontrados en un nivel anterior (CARRY) aparecen junto al inicio,
  // ya como compañeros, y su objeto del mapa (si lo hay) no se vuelve a crear.
  DOG_KINDS.forEach((cfg) =>
    (CARRY && CARRY.dogs && CARRY.dogs.includes(cfg.key)
      ? [["perro", ...dogStartSpot(), true]]
      : byType(cfg.type).slice(0, MAX_DOGS)
    ).forEach(([, gx, gy, carried]) => {
      const o = addStatic(SP.dogs[cfg.key].stand[0], gx, gy);
      o.kind = "dog";
      o.name = cfg.name;
      o.cfg = cfg;
      o.sp = SP.dogs[cfg.key];
      o.phase = gx * 1.9 + gy;
      o.moving = false;
      o.running = false;
      o.found = !!carried; // se queda quieto hasta que la exploradora lo encuentre
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
      o.attackT = 0; // cuenta atrás entre empujones a un hostil (solo Choco)
      o.growlLeft = 0; // frames que muestra el ladrido/gruñido de ataque
      o.atkFlip = null; // hacia qué lado mira mientras gruñe
      o.isAttacking = false; // Choco: si está yendo a empujar a un hostil
      o.circleAngle = null; // Chelita: ángulo actual al girar alrededor de Choco
      dogs.push(o);
      reserved.push({ gx, gy, r: 1.2 });
    }),
  );

  // 6b. Jaguar: deambula por el mapa y huye del jugador; si se le acerca
  // demasiado, ataca y lo persigue unos segundos antes de volver a huir
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

    // Estado de ataque: si el jugador se acerca demasiado, ataca y lo
    // persigue unos segundos en vez de huir
    o.attacking = false;
    o.chaseT = 0;
    o.spotT = 0;
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
    o.knockback = HUAYCHIVO_KNOCKBACK;
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
    o.noBeach = true; // nunca pisa la playa (agua somera) y no detecta al jugador si él está en ella
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
    ["balche", SP.balche, 0.4],
    ["guanacaste", SP.guanacaste, 0.8],
    ["flamboyan", SP.flamboyan, 0.6],
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
    const HW_LOG = 0.5; // medio ancho = casilla completa (colisión absoluta)
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
      const L = SP.logs;
      const set =
        i === 0 && len === 1
          ? L.single
          : i === 0
            ? L.start
            : i === len - 1
              ? L.end
              : L.mid;
      const spr = set[(k + i) % 3];
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

// Botón B: si hay un letrero abierto lo cierra; si no, mandoble de espada
// (golpea a los enemigos que estén al frente y al alcance).
function attack() {
  if (cutActive) return cutSkip();
  // (typeof: así el ataque nunca depende de que menu.js sea la versión con selector de nivel)
  if (typeof levelPickOpen !== "undefined" && levelPickOpen)
    return closeLevelPicker();
  if (menuOpen) return menuBack();
  if (dismissSignDialog()) return;
  if (
    !hasSword ||
    isPaused ||
    player.attackT > 0 ||
    player.faintT > 0 ||
    player.boat
  )
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

// Botón C (tecla C / J): lanza el boomerang hacia donde mira la exploradora.
// Va en línea recta hasta su alcance (sin colisiones: atraviesa todo), golpea a
// los enemigos que cruza y regresa a su mano.
function throwBoomerang() {
  if (dismissSignDialog()) return;
  if (cutActive || menuOpen || isPaused) return;
  if (typeof levelPickOpen !== "undefined" && levelPickOpen) return;
  if (!hasBoomerang || boomerang || player.faintT > 0 || player.boat) return;
  const ax = player.aimGx;
  const ay = player.aimGy;
  const n = Math.hypot(ax, ay) || 1;
  boomerang = {
    gx: player.gx,
    gy: player.gy,
    dx: ax / n,
    dy: ay / n,
    dist: 0,
    back: false,
    spin: 0,
    hit: new Set(),
  };
}

function updateBoomerang() {
  const b = boomerang;
  if (!b) return;
  if (player.boat || player.faintT > 0) {
    boomerang = null; // se "recoge" solo si ella no puede atraparlo
    return;
  }
  b.spin += 0.55;
  if (!b.back) {
    const nx = b.gx + b.dx * BOOMERANG_SPEED;
    const ny = b.gy + b.dy * BOOMERANG_SPEED;
    // Sin colisiones: atraviesa obstáculos y agua; solo importa el alcance
    b.gx = nx;
    b.gy = ny;
    b.dist += BOOMERANG_SPEED;
    if (b.dist >= BOOMERANG_RANGE) {
      b.back = true;
      b.hit.clear(); // en el regreso puede volver a golpear a los mismos enemigos
    }
  } else {
    const dx = player.gx - b.gx;
    const dy = player.gy - b.gy;
    const d = Math.hypot(dx, dy);
    if (d < 0.7) {
      boomerang = null; // atrapado
      return;
    }
    b.gx += (dx / d) * BOOMERANG_BACK_SPEED;
    b.gy += (dy / d) * BOOMERANG_BACK_SPEED;
  }
  // Golpea a cada enemigo una vez a la ida y otra al regreso, sin detenerse
  statics.forEach((o) => {
    if (!o.maxHp || o.dead) return;
    if (b.hit.has(o)) return;
    if (Math.hypot(o.gx - b.gx, o.gy - b.gy) > BOOMERANG_HIT_R) return;
    b.hit.add(o);
    damageEnemy(
      o,
      BOOMERANG_DAMAGE,
      b.back ? -b.dx : b.dx,
      b.back ? -b.dy : b.dy,
    );
  });
}

// ¿El hostil en (ox,oy) queda cubierto por la red ya abierta puesta en (rx,ry)?
// Se compara en pantalla (como se ve dibujada: RED_OPEN_HW/HH), no con un radio
// aparte, así toda el área que ocupa la red es la que inmoviliza.
function redCovers(ox, oy, rx, ry) {
  const dgx = ox - rx;
  const dgy = oy - ry;
  const sx = (dgx - dgy) * HW;
  const sy = (dgx + dgy) * HH;
  return (
    (sx * sx) / (RED_OPEN_HW * RED_OPEN_HW) +
      (sy * sy) / (RED_OPEN_HH * RED_OPEN_HH) <=
    1
  );
}

// Botón Y (btnD): lanza la red con pesas hacia donde mira la exploradora. Viaja en
// línea recta sin colisiones (como el boomerang) hasta su alcance y ahí cae: si hay
// NPC hostiles dentro del área, quedan inmovilizados (todos los que toque); si no
// atrapó a nadie, desaparece casi de inmediato.
function throwRed() {
  if (dismissSignDialog()) return;
  if (menuOpen) return menuSecretTap(); // 3 × Y en el menú de pausa: apartado secreto
  if (cutActive || menuOpen || isPaused) return;
  if (typeof levelPickOpen !== "undefined" && levelPickOpen) return;
  if (!hasRed || redNet || redCooldown > 0 || player.faintT > 0 || player.boat)
    return;
  const ax = player.aimGx;
  const ay = player.aimGy;
  const n = Math.hypot(ax, ay) || 1;
  redNet = {
    gx: player.gx,
    gy: player.gy,
    dx: ax / n,
    dy: ay / n,
    dist: 0,
    landed: false,
    phase: 0, // 0 = comprimida … RED_OPEN_FRAMES = ya abierta del todo
    life: 0, // cuadros transcurridos desde que cayó (parpadeo / desaparición)
    caught: false,
    stunMax: RED_MISS_FRAMES,
  };
  redCooldown = RED_THROW_COOLDOWN;
}

function updateRedNet() {
  if (redCooldown > 0) redCooldown--;
  const r = redNet;
  if (!r) return;
  if (!r.landed) {
    r.phase = Math.min(RED_OPEN_FRAMES, r.phase + 1); // se va abriendo en vuelo
    r.gx += r.dx * RED_SPEED;
    r.gy += r.dy * RED_SPEED;
    r.dist += RED_SPEED;
    // Si su CENTRO pasa cerca de un hostil (antes de llegar a su alcance), ahí se
    // detiene y se abre — no basta con rozarlo con el borde del área grande, así
    // se frena sobre el grupo y, al abrirse, atrapa a todos los que queden dentro.
    const hit = statics.find(
      (o) =>
        !o.dead &&
        RED_STUN[o.kind] &&
        Math.hypot(o.gx - r.gx, o.gy - r.gy) <= RED_CORE_R,
    );
    if (hit || r.dist >= RED_RANGE) {
      r.landed = true;
      // Atrapa a TODOS los hostiles que queden bajo el área de la red al caer
      let minStun = Infinity;
      statics.forEach((o) => {
        if (o.dead || !RED_STUN[o.kind]) return;
        if (!redCovers(o.gx, o.gy, r.gx, r.gy)) return;
        o.netT = RED_STUN[o.kind];
        o.moving = false;
        if (RED_STUN[o.kind] < minStun) minStun = RED_STUN[o.kind];
        burst(o.gx, o.gy, o.h, ["#e8e2d0", "#9a8a68", "#ffffff"], 10);
      });
      r.caught = minStun < Infinity;
      // Si atrapó varios tipos distintos, la red dura lo que el más fuerte (el
      // de menor tiempo); al zafarse éste, la red desaparece
      if (r.caught) r.stunMax = minStun;
    }
    return;
  }
  r.life++;
  if (r.life >= r.stunMax) redNet = null; // ya parpadeó lo suyo: desaparece
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
  knockbackEnemy(o, nx, ny, ENEMY_KNOCKBACK);
}

// Aturde y hace retroceder a un enemigo sin tocarle los corazones (lo usan tanto
// la espada —vía damageEnemy— como el empujón de Choco)
function knockbackEnemy(o, nx, ny, push) {
  o.kbX = nx * push;
  o.kbY = ny * push;
  o.kbT = 8;
  if (o.state === "windup" || o.state === "chase") {
    o.state = "recover";
    o.coolT = ENEMY_STUN;
    o.atkT = 0;
  } else if (o.state === "idle" || o.state === "return") {
    o.state = "chase"; // al ser golpeado, se enfurece
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

  // Choco (guardián): si hay un hostil cerca de la exploradora, se convierte en
  // su objetivo y Choco va derecho hacia él en vez de a su puesto habitual.
  let threat = null;
  if (o.cfg.key === "choco" && o.found) {
    if (o.attackT > 0) o.attackT--;
    let bestD = Infinity;
    statics.forEach((e) => {
      if (!CHOCO_HOSTILE_KINDS.includes(e.kind) || e.dead) return;
      if (Math.hypot(e.gx - player.gx, e.gy - player.gy) > CHOCO_DEFEND_R)
        return;
      const cd = Math.hypot(e.gx - o.gx, e.gy - o.gy);
      if (cd < bestD) {
        bestD = cd;
        threat = e;
      }
    });
  }
  if (o.cfg.key === "choco") o.isAttacking = !!threat;
  if (o.growlLeft > 0) o.growlLeft--;

  // Cleo (miedosa): igual que Choco detecta al hostil más cercano a la exploradora,
  // pero en vez de ir hacia él, se usa para alejarse en dirección contraria.
  let danger = null;
  if (o.cfg.key === "cleo" && o.found) {
    let bestD = Infinity;
    statics.forEach((e) => {
      if (!CHOCO_HOSTILE_KINDS.includes(e.kind) || e.dead) return;
      const ed = Math.hypot(e.gx - player.gx, e.gy - player.gy);
      if (ed > CHOCO_DEFEND_R) return;
      if (ed < bestD) {
        bestD = ed;
        danger = e;
      }
    });
  }

  // Chelita (animadora): si Choco se lanzó a atacar, se queda dando vueltas
  // a su alrededor ladrándole, en vez de ir a su puesto habitual.
  let chocoAttack = null;
  if (o.cfg.key === "chelita" && o.found) {
    const choco = dogs.find((d) => d.cfg.key === "choco");
    if (choco && choco.isAttacking) chocoAttack = choco;
  }

  // Puesto propio: cada perro se coloca detrás de la exploradora y a un lado
  // distinto (Choco a un lado, Cleo al otro). Si ese puesto no es transitable,
  // va hacia ella y se detiene a FOLLOW_R como antes.
  const dirx = player.dirGx;
  const diry = player.dirGy;
  let tx, ty, stopR;
  if (threat) {
    tx = threat.gx;
    ty = threat.gy;
    stopR = CHOCO_ATTACK_R;
  } else if (danger) {
    // Punto justo del otro lado de la exploradora respecto al hostil, sin alejarse demasiado
    const awayX = player.gx - danger.gx;
    const awayY = player.gy - danger.gy;
    const ad = Math.hypot(awayX, awayY) || 0.0001;
    const fx = player.gx + (awayX / ad) * CLEO_FLEE_DIST;
    const fy = player.gy + (awayY / ad) * CLEO_FLEE_DIST;
    if (walkable(fx, fy)) {
      tx = fx;
      ty = fy;
      stopR = 0.4;
    } else {
      tx = player.gx;
      ty = player.gy;
      stopR = FOLLOW_R;
    }
  } else if (chocoAttack) {
    // Órbita real alrededor de Choco: el punto objetivo se calcula a partir de la
    // posición ACTUAL de Chelita (no de un ángulo que avanza solo), así que siempre
    // está sobre el círculo de radio CHELITA_CIRCLE_R centrado en Choco, un poco
    // adelante de ella en el sentido de giro. Ella lo persigue y por eso rodea a Choco.
    if (o.circleDir == null) o.circleDir = Math.random() < 0.5 ? 1 : -1;
    const curA = Math.atan2(o.gy - chocoAttack.gy, o.gx - chocoAttack.gx);
    const lead = CHELITA_CIRCLE_LEAD / CHELITA_CIRCLE_R; // radianes de adelanto
    let cx = 0;
    let cy = 0;
    let ok = false;
    for (let k = 0; k < 2 && !ok; k++) {
      const a = curA + o.circleDir * lead;
      cx = chocoAttack.gx + Math.cos(a) * CHELITA_CIRCLE_R;
      cy = chocoAttack.gy + Math.sin(a) * CHELITA_CIRCLE_R;
      ok = walkable(cx, cy);
      if (!ok) o.circleDir = -o.circleDir; // obstáculo: gira hacia el otro lado
    }
    if (ok) {
      tx = cx;
      ty = cy;
      stopR = 0.3;
    } else {
      tx = chocoAttack.gx;
      ty = chocoAttack.gy;
      stopR = CHELITA_CIRCLE_R;
    }
    if (o.barkLeft <= 0) o.barkLeft = 25; // ladra sin parar mientras da vueltas
  } else {
    tx = player.gx - dirx * o.cfg.slotBack - diry * o.cfg.slotSide;
    ty = player.gy - diry * o.cfg.slotBack + dirx * o.cfg.slotSide;
    stopR = 0.45;
    if (!walkable(tx, ty)) {
      tx = player.gx;
      ty = player.gy;
      stopR = FOLLOW_R;
    }
  }
  const dxt = tx - o.gx;
  const dyt = ty - o.gy;
  const dt = Math.hypot(dxt, dyt) || 0.0001;
  // Con margen para no temblar al llegar: se detiene en stopR y reanuda más lejos
  const chase = o.following ? dt > stopR : dt > stopR + 0.45;
  o.following = o.found && !player.boat && chase;

  // Ya alcanzó al hostil: lo empuja ladrando y gruñendo, sin quitarle corazones
  if (threat && !chase && o.attackT <= 0) {
    const nx = dxt / dt;
    const ny = dyt / dt;
    knockbackEnemy(threat, nx, ny, CHOCO_PUSH);
    burst(threat.gx, threat.gy, threat.h, ["#ffffff", "#fff3b0"], 6);
    o.attackT = CHOCO_ATTACK_COOLDOWN;
    o.growlLeft = CHOCO_GROWL_FRAMES;
    const asd = dxt - dyt;
    if (Math.abs(asd) > 0.05) o.atkFlip = asd < 0;
  }

  if (o.following) {
    if (threat) {
      o.running = true;
      speed = CHOCO_ATTACK_SPEED;
    } else if (danger) {
      o.running = true;
      speed = 0.098;
    } else if (chocoAttack) {
      o.running = true;
      speed = 0.098;
    } else {
      o.running = d > RUN_R;
      speed = o.running ? 0.098 : 0.06;
    }

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
  // Mientras gruñe, se queda mirando hacia el hostil al que le ladró
  if (o.growlLeft > 0 && o.atkFlip !== null) o.flip = o.atkFlip;

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

  // Si el perro tiene cinemática propia (CINEMATICAS[<key>], p. ej. "choco"), primero
  // se ve la cinemática y al terminar (o al saltarla con B) sale el recuerdo
  const cuts = CINEMATICAS[dog.cfg.key];
  if (cuts && cuts.length) {
    isPaused = true;
    keys = { up: false, down: false, left: false, right: false };
    startCutscene(dog.cfg.key, () => showDogMemory(dog), { sinCarga: true });
  } else showDogMemory(dog);
}

// Ventana del recuerdo al encontrar a un perro
function showDogMemory(dog) {
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
// push (opcional): casillas que sale despedida (golpe fuerte, p. ej. el huaychivo).
// Sin push, el retroceso es el pequeño de siempre.
function hurtPlayer(n, fromGx, fromGy, push) {
  if (player.invuln > 0 || isPaused || playerSafe()) return;
  health = Math.max(0, health - n);
  player.invuln = 70;
  updateHUD();
  burst(
    player.gx,
    player.gy,
    player.h,
    ["#ff595e", "#ffffff", "#ffd166"],
    push > 0 ? 12 + Math.round(push * 4) : 12,
  );

  // Retroceso, alejándose de quien lo golpeó
  const dx = player.gx - fromGx;
  const dy = player.gy - fromGy;
  const dl = Math.hypot(dx, dy) || 1;
  if (push > 0) {
    // Golpe fuerte: sale despedida y se va frenando (update() en main.js aplica la
    // velocidad cada cuadro; mientras dura no puede controlar al personaje). La
    // distancia total es v0 / (1 − decay) = push.
    const v0 = push * (1 - PLAYER_KB_DECAY);
    player.kbX = (dx / dl) * v0;
    player.kbY = (dy / dl) * v0;
    player.jumpT = 0;
    if (health <= 0) playerFaint();
    return;
  }
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
  player.kbX = 0;
  player.kbY = 0;
  // Reaparece en el último checkpoint que pisó (o en el inicio si no pisó ninguno)
  player.gx = lastCheckpoint ? lastCheckpoint.gx : START_TILE.gx;
  player.gy = lastCheckpoint ? lastCheckpoint.gy : START_TILE.gy;
  player.z = 0;
  player.jumpT = 0;
  player.invuln = 120;
  player.faintT = 160;
  look.x = 0;
  look.y = 0;
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
    (!o.monteOnly || tileAt(gx, gy) === T_MONTE) &&
    (!o.noBeach || !isShallow(tileAt(gx, gy)))
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
        (o.monteOnly ? monteTileOK(x, y) : dogTileOK(x, y)) &&
        (!o.noBeach || !isShallow(tileAt(x, y))),
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
  // Atrapado bajo la red: inmóvil (no persigue, no ataca) hasta que se zafa; al
  // terminar retoma justo el estado en el que estaba cuando cayó la red.
  if (o.netT > 0) {
    o.netT--;
    o.moving = false;
    o.h += (tileH(Math.round(o.gx), Math.round(o.gy)) - o.h) * 0.2;
    o.depth = o.gx + o.gy;
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
    !playerSafe() &&
    (!o.monteOnly || tileAt(player.gx, player.gy) === T_MONTE) &&
    (!o.noBeach || !isShallow(tileAt(player.gx, player.gy)));

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
        hurtPlayer(o.damage, o.gx, o.gy, o.knockback);
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
  const canTarget = !player.boat && !playerSafe();
  if (o.spotT > 0) o.spotT--;

  let dx = 0;
  let dy = 0;
  let speed = 0;

  // Ataque: si el jugador se acerca demasiado, el jaguar deja de huir,
  // ataca y lo persigue unos segundos; después vuelve a su comportamiento
  // normal (huir). Es hostil (puede dañar al jugador) pero el jugador no
  // puede atacarlo a él.
  const J_ATTACK_R = 1.3; // distancia a la que ataca en vez de huir
  const J_HIT_R = 0.9; // distancia a la que conecta el golpe
  const J_CHASE_SPEED = 0.1;
  const J_CHASE_FRAMES = 360; // tiempo persiguiendo antes de rendirse
  const J_DAMAGE = 1;

  if (canTarget && !o.attacking && distance < J_ATTACK_R) {
    o.attacking = true;
    o.fleeing = false;
    o.chaseT = J_CHASE_FRAMES;
    o.spotT = 30;
  }

  if (o.attacking && (!canTarget || o.chaseT <= 0)) {
    o.attacking = false;
    // Tras atacar se aleja huyendo un momento en vez de quedarse quieto
    o.fleeing = canTarget;
    o.pauseTimer = 0;
  }

  if (o.attacking) {
    o.chaseT--;
    o.pauseTimer = 0;

    const safeDistance = Math.max(distance, 0.001);
    if (distance < J_HIT_R) {
      // A su alcance: muerde (el daño real lo limita la invulnerabilidad
      // temporal del jugador, como con el resto de hostiles)
      hurtPlayer(J_DAMAGE, o.gx, o.gy);
    } else {
      // Avanza hacia el jugador (dirección opuesta a dxPlayer/dyPlayer)
      dx = -dxPlayer / safeDistance;
      dy = -dyPlayer / safeDistance;
      speed = J_CHASE_SPEED;
    }
  } else if (distance < 3.5 || (o.fleeing && distance <= 5.2)) {
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
