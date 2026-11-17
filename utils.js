"use strict";

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
