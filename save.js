"use strict";

/* ---------- Guardado de partida (localStorage) ---------- */
// Se guarda solo lo que cambia durante la partida: posición, vida, cofres,
// coleccionables, checkpoints, perros, botes y enemigos derrotados.
// SAVE_KEY está en levelmaps.js (lo necesita el cargador de niveles)
const SAVE_VERSION = 1;
let staticsTotal = 0;

// Huella del mapa: si cambias MAP_ROWS o MAP_OBJECTS (mapdata.js), la huella cambia
// y las partidas guardadas con el mapa anterior se ignoran (no se borran).
let _mapSig = null;
function mapSignature() {
  if (_mapSig !== null) return _mapSig;
  const txt = JSON.stringify([MAP_ROWS, MAP_OBJECTS]);
  let h = 0x811c9dc5; // FNV-1a de 32 bits
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  _mapSig = (h >>> 0).toString(16) + "-" + txt.length;
  return _mapSig;
}

// Da un id fijo a cada estático al crear el mapa (el orden es siempre el mismo),
// así se puede saber cuáles enemigos ya fueron derrotados
function tagStatics() {
  statics.forEach((o, i) => {
    o._sid = i;
  });
  staticsTotal = statics.length;
}

// Hay partida guardada Y es de este mismo mapa
function hasSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    return (
      !!d &&
      d.v === SAVE_VERSION &&
      (d.nivel || 1) === NIVEL &&
      d.sig === mapSignature()
    );
  } catch (e) {
    return false;
  }
}

function buildSave() {
  const alive = new Set();
  const hp = {};
  statics.forEach((o) => {
    if (o.dead) return;
    alive.add(o._sid);
    if (typeof o.hp === "number") hp[o._sid] = o.hp;
  });
  const deadStatics = [];
  for (let i = 0; i < staticsTotal; i++) if (!alive.has(i)) deadStatics.push(i);

  return {
    v: SAVE_VERSION,
    sig: mapSignature(),
    nivel: NIVEL,
    carry: CARRY, // lo que llegó de niveles anteriores (para recrearlo al cargar)
    time: Date.now(),
    health,
    foundCount,
    hasSword,
    hasBoomerang,
    hasRed,
    player: {
      gx: player.gx,
      gy: player.gy,
      face: player.face,
      boat: player.boat ? boats.indexOf(player.boat) : -1,
    },
    treasures: treasures.map((t) => ({ o: t.opened, m: t.memIdx })),
    collectibles: collectibles.map((g) => ({
      count: g.count,
      got: g.items.map((it) => it.collected),
    })),
    sword: swordItem ? swordItem.collected : false,
    boomerang: boomerangItem ? boomerangItem.collected : false,
    red: redItem ? redItem.collected : false,
    novio: novio ? novio.rescued : false,
    checkpoints: checkpoints.map((c) => c.visited),
    lastCheckpoint: lastCheckpoint ? checkpoints.indexOf(lastCheckpoint) : -1,
    dogs: dogs.map((d) => ({
      found: d.found,
      gx: d.gx,
      gy: d.gy,
      inBoat: !!d.inBoat,
    })),
    boats: boats.map((b) => ({ gx: b.gx, gy: b.gy, occupied: b.occupied })),
    deadStatics,
    hp,
  };
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSave()));
    return true;
  } catch (e) {
    return false;
  }
}

// Carga la partida guardada. Devuelve true si se pudo aplicar.
function loadGame() {
  let d;
  try {
    d = JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch (e) {
    return false;
  }
  if (!d || d.v !== SAVE_VERSION || d.sig !== mapSignature()) return false;
  if ((d.nivel || 1) !== NIVEL) return false;

  try {
    health = Math.max(1, Math.min(MAX_HEALTH, d.health | 0));
    foundCount = d.foundCount | 0;
    hasSword = !!d.hasSword;
    if (swordItem) swordItem.collected = !!d.sword;
    if (boomerangItem) {
      boomerangItem.collected = !!d.boomerang;
      hasBoomerang = boomerangItem.collected;
    } else hasBoomerang = !!d.hasBoomerang || hasBoomerang;
    if (redItem) {
      redItem.collected = !!d.red;
      hasRed = redItem.collected;
    } else hasRed = !!d.hasRed || hasRed;
    if (novio) novio.rescued = !!d.novio;

    treasures.forEach((t, i) => {
      const s = d.treasures && d.treasures[i];
      if (!s || !s.o) return;
      const idx = typeof s.m === "number" ? s.m : MEM_OFFSET + i;
      const mem = MEMORIES[idx] || MEMORIES[MEM_OFFSET + i];
      t.opened = true;
      t.memIdx = idx;
      if (mem) {
        t.image = mem.image;
        t.title = mem.title;
        t.message = mem.message;
      }
    });

    collectibles.forEach((g, i) => {
      const s = d.collectibles && d.collectibles[i];
      if (!s) return;
      g.count = s.count | 0;
      g.items.forEach((it, j) => {
        it.collected = !!(s.got && s.got[j]);
      });
    });

    checkpoints.forEach((c, i) => {
      c.visited = !!(d.checkpoints && d.checkpoints[i]);
      c.flashT = 0;
    });
    lastCheckpoint = checkpoints[d.lastCheckpoint] || null;

    // Enemigos ya derrotados desaparecen; los demás conservan su vida
    const deadSet = new Set(d.deadStatics || []);
    for (let i = statics.length - 1; i >= 0; i--)
      if (deadSet.has(statics[i]._sid)) statics.splice(i, 1);
    statics.forEach((o) => {
      const h = d.hp && d.hp[o._sid];
      if (typeof h === "number") o.hp = Math.min(h, o.maxHp || h);
    });

    boats.forEach((b, i) => {
      const s = d.boats && d.boats[i];
      if (!s) return;
      b.gx = s.gx;
      b.gy = s.gy;
      b.occupied = !!s.occupied;
      b.h = tileH(Math.round(b.gx), Math.round(b.gy));
    });

    player.gx = d.player.gx;
    player.gy = d.player.gy;
    player.face = d.player.face || 1;
    player.boat = boats[d.player.boat] || null;
    if (player.boat) player.boat.occupied = true;
    player.z = 0;
    player.jumpT = 0;
    player.attackT = 0;
    player.invuln = 90;
    player.h = tileH(Math.round(player.gx), Math.round(player.gy));

    dogs.forEach((dog, i) => {
      const s = d.dogs && d.dogs[i];
      if (!s) return;
      dog.found = !!s.found;
      dog.gx = s.gx;
      dog.gy = s.gy;
      dog.inBoat = !!s.inBoat && !!player.boat;
      dog.moving = false;
      dog.running = false;
      dog.h = tileH(Math.round(dog.gx), Math.round(dog.gy));
    });

    fear = 0;
    bloodFear = 0;
    look.x = 0;
    look.y = 0;
    updateHUD();
    snapCamera();
    return true;
  } catch (e) {
    console.error("No se pudo cargar la partida", e);
    return false;
  }
}
