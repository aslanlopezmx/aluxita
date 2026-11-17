"use strict";

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
  if (swordItem) ensureLand(swordItem.gx, swordItem.gy, 0);
  // Checkpoints: terreno firme en el centro y piso de concreto en la zona segura
  checkpoints.forEach((cp) => {
    ensureLand(cp.gx, cp.gy, 1);
    const cx0 = Math.round(cp.gx);
    const cy0 = Math.round(cp.gy);
    const rr = Math.ceil(CHECKPOINT_R);
    for (let y = cy0 - rr; y <= cy0 + rr; y++) {
      for (let x = cx0 - rr; x <= cx0 + rr; x++) {
        if (Math.hypot(x - cx0, y - cy0) > CHECKPOINT_R) continue;
        const t = tileAt(x, y);
        if (t !== T_SAND && t !== T_GRASS && t !== T_PATH && t !== T_MONTE)
          continue;
        cp.tiles.add(tileKey(x, y));
        safeTiles.add(tileKey(x, y));
      }
    }
  });
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
    [T_MONTE]: ["#266b30", "#1e5522", "#388a40"],
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

// Piso de concreto de la zona segura de un checkpoint: losa gris con juntas, grietas
// y, en el borde de la zona, una franja de precaución amarilla y negra
const CONCRETE_PAL = ["#a6a6a2", "#919190", "#c0c0bb"];
function paintConcrete(c, cx, cy, gx, gy) {
  paintTop(c, cx, cy, CONCRETE_PAL);
  const inZone = (x, y) => safeTiles.has(tileKey(x, y));
  // Borde de cada lado de la losa (2 px por fila). Si el vecino no es concreto,
  // franja de precaución; si lo es, una junta fina más oscura.
  const sides = [
    // [vecino gx, vecino gy, filas, lado]
    [gx - 1, gy, 0, 8, "L"], // NO
    [gx, gy - 1, 0, 8, "R"], // NE
    [gx, gy + 1, 8, 16, "L"], // SO
    [gx + 1, gy, 8, 16, "R"], // SE
  ];
  sides.forEach(([nx, ny, r0, r1, side]) => {
    const edge = !inZone(nx, ny);
    for (let r = r0; r < r1; r++) {
      const w = 4 * (Math.min(r, 15 - r) + 1);
      const x0 = cx - (w >> 1);
      const y = cy - 8 + r;
      const xs = side === "L" ? [x0, x0 + 1] : [x0 + w - 2, x0 + w - 1];
      if (edge) {
        c.fillStyle = (r >> 1) % 2 ? "#2e2e2e" : "#f2c13d";
      } else {
        c.fillStyle = "#7c7c79";
      }
      xs.forEach((x) => c.fillRect(x, y, 1, 1));
    }
  });
  // Grietas y manchas sueltas
  const rnd = mulberry32(gx * 811 + gy * 29 + 77);
  for (let k = 0; k < 3; k++) {
    const ox = Math.round((rnd() - 0.5) * 16);
    const oy = Math.round((rnd() - 0.5) * 6);
    if (Math.abs(ox) / 16 + Math.abs(oy) / 8 > 0.6) continue;
    if (rnd() < 0.5) {
      px(c, cx + ox, cy + oy, "#6f6f6c");
      px(c, cx + ox + 1, cy + oy + 1, "#6f6f6c");
      px(c, cx + ox + 2, cy + oy + 1, "#6f6f6c");
    } else {
      px(c, cx + ox, cy + oy, "#d6d6d1");
      px(c, cx + ox + 1, cy + oy, "#d6d6d1");
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
    ["#144a20", "#226b2d", "#409644"],
    ["#195324", "#2c7a32", "#58a84a"],
    ["#205c22", "#358534", "#74bd54"],
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
      if (safeTiles.has(tileKey(gx, gy))) {
        paintConcrete(c, cx, cy, gx, gy);
        continue;
      }
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

// Obstáculo redondo (edificio, roca, cenote...) que contiene el punto, el más
// "hundido" si hay varios; null si no hay ninguno
function blockerAt(gx, gy) {
  let best = null;
  let bd = 0;
  for (let i = 0; i < blockers.length; i++) {
    const b = blockers[i];
    const pen = b.r - Math.hypot(gx - b.gx, gy - b.gy);
    if (pen > bd) {
      bd = pen;
      best = b;
    }
  }
  return best;
}
