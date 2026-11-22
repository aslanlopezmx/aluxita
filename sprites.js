"use strict";

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

// ---------- Ruinas mayas (3 variantes, estructuras de piedra caliza, sin pirámides) ----------
// 0 = muros caídos con greca, 1 = columnas rotas con fuste caído,
// 2 = arco maya de bóveda en saliente (corbel), derruido de un lado
const RUIN_FACE = ["#e2d6b6", "#c9bc9a", "#a89b7c"]; // cara clara, media y oscura
const RUIN_SEAM = "#7d7158";
const RUIN_GRECA = ["11111111", "10000001", "10111101", "10100001", "10111111"];

// sillar suelto
function ruinBlock(c, x, y, w, h) {
  rect(c, x, y, w, h, "#b9ad8f");
  rect(c, x, y, w, 1, "#e0d4b4");
  rect(c, x + w - 1, y, 1, h, "#8f846b");
  rect(c, x, y + h - 1, w, 1, "#7d7158");
}

// parches de musgo y enredadera sobre la piedra
function ruinMoss(c, cx, cy, rx, ry, seed, n) {
  const r = mulberry32(seed);
  for (let k = 0; k < n; k++) {
    const x = Math.round(cx + (r() - 0.5) * 2 * rx);
    const y = Math.round(cy + (r() - 0.5) * 2 * ry);
    px(c, x, y, "#4f7a2e");
    px(c, x + 1, y, "#6f9a40");
    if (r() < 0.5) px(c, x, y + 1, "#3d6024");
  }
}

// Pared vista de lado, en el plano del eje gx (o gy si dir = -1).
// hs(s) = alto en píxeles de la columna s (0 = hueco). skip(s, z) = true si ahí no hay piedra
// (vano). La cara va de (x0, y0) hacia la derecha-abajo (dir 1) o izquierda-abajo (dir -1).
function ruinWall(c, x0, y0, len, dir, hs, opt) {
  opt = opt || {};
  const face = dir === 1 ? RUIN_FACE[1] : RUIN_FACE[2];
  const faceL = dir === 1 ? RUIN_FACE[0] : RUIN_FACE[1];
  for (let s = 0; s < len; s++) {
    const h = hs(s);
    if (h <= 0) continue;
    const x = x0 + dir * s;
    const yb = y0 + (s >> 1);
    // cara superior (grosor del muro)
    rect(c, x, yb - h - 2, 1, 2, "#e8dcbc");
    for (let z = 0; z < h; z++) {
      const y = yb - z;
      if (opt.skip && opt.skip(s, z)) {
        // interior oscuro del vano
        px(c, x, y, z > 14 ? "#3f372a" : z > 7 ? "#322b20" : "#241f16");
        continue;
      }
      const n = hash2(x, z, 7);
      let col = z > h - 3 ? faceL : face;
      if (z % 5 === 4 || (s + Math.floor(z / 5) * 3) % 9 === 0) col = RUIN_SEAM;
      else if (n < 0.1) col = RUIN_FACE[2];
      else if (n > 0.93) col = RUIN_FACE[0];
      px(c, x, y, col);
    }
    if (opt.greca) {
      const gs = s - opt.greca[0];
      if (gs >= 0 && gs < opt.greca[1]) {
        const gz = opt.greca[2];
        for (let r = 0; r < 5; r++)
          if (RUIN_GRECA[r][gs % 8] === "1" && gz + r < h - 2)
            px(c, x, yb - gz - r, dir === 1 ? "#6f634b" : "#5d523e");
      }
    }
  }
}

// columna de fuste con tambores; roto = recorte irregular arriba
function ruinColumn(c, x, yb, h, w, seed, broken) {
  const r = mulberry32(seed);
  const x0 = x - (w >> 1);
  for (let i = 0; i < w; i++) {
    const u = i / (w - 1);
    const col = u < 0.3 ? "#e2d6b6" : u < 0.7 ? "#c9bc9a" : "#9c8f72";
    const jag = broken ? Math.floor(r() * 4) : 0;
    rect(c, x0 + i, yb - h + jag, 1, h - jag, col);
  }
  for (let k = 4; k < h - 1; k += 6) rect(c, x0, yb - k, w, 1, RUIN_SEAM);
  ellipse(c, x, yb, (w >> 1) + 2, 2, "#8f846b"); // base
  ellipse(c, x, yb - 1, (w >> 1) + 1, 1, "#b9ad8f");
  if (!broken) {
    // capitel
    rect(c, x0 - 2, yb - h - 2, w + 4, 3, "#d8cbab");
    rect(c, x0 - 2, yb - h + 1, w + 4, 1, RUIN_SEAM);
  } else {
    rect(c, x0 + 1, yb - h + 1, w - 2, 1, "#8f846b"); // fractura
  }
}

function makeRuin(v) {
  return sprite(84, 80, 42, 62, (c) => {
    const CX = 42;
    const B = 62;
    ellipse(c, CX, B + 3, 36, 12, "rgba(0,0,0,0.25)");
    const hw = v === 2 ? 26 : 28;
    // plataforma baja de piedra
    isoBox(
      c,
      CX,
      B,
      hw,
      4,
      "#bfb391",
      "#847859",
      "#a89c7c",
      "#8e8366",
      "#756a50",
    );
    const cy = B - 4;

    if (v === 0) {
      // ---- Muros caídos: dos muros en L con vano y greca ----
      // muro A (hacia +gx, el más alto): se derrumba en dos puntos
      ruinWall(
        c,
        CX,
        cy - 11,
        26,
        1,
        (s) => {
          if (s >= 11 && s < 15) return 5; // brecha
          if (s >= 15) return 13 - Math.floor((s - 15) / 3);
          return s < 8 ? 24 : 24 - (s - 7) * 2;
        },
        { greca: [2, 8, 7] },
      );
      // muro B (hacia +gy)
      ruinWall(
        c,
        CX,
        cy - 11,
        22,
        -1,
        (s) => (s < 12 ? 20 - Math.floor(s / 2) : s < 16 ? 7 : 5),
        {},
      );
    } else if (v === 1) {
      // ---- Columnas rotas ----
      ruinColumn(c, CX + 1, cy - 8, 28, 7, 1, false); // atrás, entera
      ruinColumn(c, CX - 15, cy - 1, 21, 7, 2, true);
      ruinColumn(c, CX + 17, cy, 14, 7, 3, true);
      ruinColumn(c, CX - 3, cy + 6, 7, 7, 4, true); // tocón al frente
      // fuste caído sobre el piso (a lo largo de gx)
      for (let s = 0; s < 18; s++) {
        const x = CX + 6 + s;
        const y = cy + 6 + (s >> 1);
        const seam = s % 6 === 5;
        rect(c, x, y - 3, 1, 1, "#e2d6b6");
        rect(c, x, y - 2, 1, 2, seam ? RUIN_SEAM : "#c9bc9a");
        rect(c, x, y, 1, 2, seam ? RUIN_SEAM : "#9c8f72");
      }
      ellipse(c, CX + 24, cy + 15, 3, 2, "#b9ad8f"); // extremo del fuste
    } else {
      // ---- Arco maya de bóveda en saliente ----
      const half = (z) => 9 - 2 * Math.floor(z / 4);
      ruinWall(
        c,
        CX - 20,
        cy - 10,
        40,
        1,
        (s) => {
          if (s < 20) return 28;
          if (s < 30) return 28 - Math.floor((s - 20) * 1.6);
          return 8;
        },
        { skip: (s, z) => z < 20 && Math.abs(s - 14) < half(z) },
      );
    }

    // escombros y vegetación
    [
      [CX - 22, cy + 6, 5, 4],
      [CX - 16, cy + 9, 4, 3],
      [CX + 10, cy + 11, 5, 4],
      [CX + 4, cy + 13, 3, 3],
      [CX + 21, cy + 6, 4, 3],
    ].forEach(([x, y, w, h]) => ruinBlock(c, x, y, w, h));
    ruinMoss(c, CX, cy, 20, 8, 31 + v, 16);
    // enredadera colgando
    const r = mulberry32(900 + v);
    for (let k = 0; k < 4; k++) {
      const x = CX - 16 + Math.round(r() * 32);
      const y = cy - 14 + Math.round(r() * 12);
      const L = 3 + Math.round(r() * 5);
      for (let i = 0; i < L; i++)
        px(c, x, y + i, i % 2 ? "#4f7a2e" : "#6f9a40");
    }
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

// Balché (Lonchocarpus punctatus): árbol mediano de tronco delgado gris-pardo con
// lenticelas claras (de ahí "punctatus"), copa abierta de hojas pinnadas finas y
// racimos colgantes de flores lila-violeta. Con su corteza se prepara la bebida
// ceremonial maya llamada balché.
function makeBalche() {
  const W = 104;
  const H = 84;
  const GY = 78; // línea del suelo
  return sprite(W, H, 52, GY, (c) => {
    const wood = ["#2a241e", "#4a4238", "#6e6554", "#968b78"];
    const lf = ["#15361a", "#2a6226", "#4a9238", "#7cc454", "#a8e078"];
    const vi = ["#4a2a7e", "#7646c0", "#a278e0", "#cfb0f6", "#f2e6ff"];
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    // sombra, suelo, pasto y florecitas caídas
    ellipse(c, 52, GY, 30, 4, "rgba(0,0,0,0.26)");
    ellipse(c, 52, GY, 25, 2, "#5a4630");
    const rg = mulberry32(131);
    for (let i = 0; i < 24; i++) {
      const x = 28 + ((rg() * 48) | 0);
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
    for (let i = 0; i < 12; i++) {
      px(
        c,
        26 + ((rg() * 52) | 0),
        GY - 1 + ((rg() * 3) | 0),
        vi[2 + ((rg() * 3) | 0)],
      );
    }

    // raíces superficiales y tronco delgado, ligeramente inclinado
    rootCurve(c, 48, 73, 42, 75, 34, GY + 1, 3, 1, wood);
    rootCurve(c, 56, 73, 62, 75, 70, GY + 1, 3, 1, wood);
    const hwT = (y) => 3 + (y > 68 ? (y - 68) * 0.4 : 0);
    const cxT = (y) => 52 + Math.round(Math.sin(y / 8) * 1.4);
    for (let y = 46; y <= GY; y++) {
      const cx = cxT(y);
      const hw = Math.round(hwT(y));
      const L = cx - hw;
      const R = cx + hw;
      px(c, L - 1, y, wood[0]);
      px(c, R + 1, y, wood[0]);
      for (let x = L; x <= R; x++) {
        const u = (x - L) / (2 * hw);
        let tone = u < 0.3 ? 3 : u < 0.65 ? 2 : 1;
        const h = hash2(Math.round(u * 8), Math.floor((y + x) / 5), 77);
        if (h < 0.25) tone -= 1;
        else if (h > 0.93) tone += 1;
        if (x >= R - 1) tone = Math.min(tone, 1);
        px(c, x, y, wood[Math.max(0, Math.min(3, tone))]);
      }
      // lenticelas: puntitos claros sobre la corteza
      if (hash2(y, 5, 91) > 0.55) {
        const lx = L + 1 + ((hash2(y, 7, 92) * Math.max(1, 2 * hw - 1)) | 0);
        px(c, lx, y, "#d8cdb4");
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

    // ramificación: pocas ramas finas que se abren en abanico
    const q = mulberry32(214);
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
        tips.push([x1, y1, ang]);
        return;
      }
      mids.push([x1, y1, ang]);
      for (let i = 0; i < 2; i++) {
        let a =
          ang + (i === 0 ? -1 : 1) * (0.42 + q() * 0.35) + (q() - 0.5) * 0.25;
        a *= 0.92;
        grow(x1, y1, a, len * (0.7 + q() * 0.1), Math.max(1, t - 1), d - 1);
      }
    };
    [-1.15, -0.7, -0.25, 0.2, 0.65, 1.1].forEach((a, i) =>
      grow(52 + (i - 2.5) * 0.6, 49, a, 12 + q() * 3, 2, 2),
    );
    segs.forEach(([a, b, x, y, t]) =>
      pline(c, a - 1, b, x - 1, y, wood[0], t + 2),
    );
    segs.forEach(([a, b, x, y, t]) => pline(c, a, b, x, y, wood[1], t + 1));
    segs.forEach(([a, b, x, y, t]) => pline(c, a, b, x, y, wood[2], t));
    segs.forEach(
      ([a, b, x, y, t]) => t > 1 && pline(c, a, b, x, y, wood[3], 1),
    );

    // hojas compuestas pinnadas: un raquis con pares de foliolos
    const fronds = [];
    const addFrond = (x, y, ang, len) => fronds.push([x, y, ang, len]);
    tips.forEach(([x, y, ang]) => {
      addFrond(x, y, ang * 0.5 - 0.9, 10 + q() * 3);
      addFrond(x, y, ang * 0.5, 11 + q() * 3);
      addFrond(x, y, ang * 0.5 + 0.9, 10 + q() * 3);
    });
    mids.forEach(([x, y, ang]) => {
      addFrond(x, y, ang * 0.6 + (q() < 0.5 ? -1.1 : 1.1), 9 + q() * 3);
    });
    for (let i = 0; i < 16; i++) {
      const a = q() * Math.PI * 2;
      const d = Math.sqrt(q());
      addFrond(
        Math.round(52 + Math.cos(a) * d * 34),
        Math.round(30 + Math.sin(a) * d * 15),
        (q() - 0.5) * 2.6,
        8 + q() * 4,
      );
    }
    fronds.sort((a, b) => a[1] - b[1]);
    fronds.forEach(([x, y, ang, len]) => {
      const n = 6;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push([
          Math.round(x + Math.sin(ang) * len * t),
          Math.round(y - Math.cos(ang) * len * t + len * 0.28 * t * t),
        ]);
      }
      for (let i = 0; i < n; i++)
        pline(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], lf[1], 1);
      for (let i = 1; i <= n; i++) {
        const [fx, fy] = pts[i];
        const wdt = i >= n - 1 ? 2 : 3;
        if (!inb(fx, fy)) continue;
        const top = fy < 32;
        // foliolo izquierdo (luz) y derecho (sombra), con borde inferior oscuro
        rect(c, fx - wdt - 1, fy, wdt, 1, lf[0]);
        rect(c, fx - wdt - 1, fy - 1, wdt, 1, top ? lf[4] : lf[3]);
        rect(c, fx + 1, fy, wdt, 1, lf[0]);
        rect(c, fx + 1, fy - 1, wdt, 1, top ? lf[3] : lf[2]);
        if (i % 2 === 0) {
          px(c, fx - wdt - 1, fy - 2, lf[3]);
          px(c, fx + wdt, fy - 2, lf[2]);
        }
      }
    });

    // racimos de flores lila-violeta: unos erguidos arriba y otros colgantes
    const flowers = [];
    tips.concat(mids).forEach(([x, y]) => {
      const f = Math.min(1, Math.max(0.25, (50 - y) / 30));
      const n = Math.round(1 + 3 * f);
      for (let i = 0; i < n; i++) {
        flowers.push([
          Math.round(x + (q() - 0.5) * 12),
          Math.round(y + (q() - 0.6) * 7),
        ]);
      }
    });
    flowers.sort((a, b) => a[1] - b[1]);
    flowers.forEach(([x, y]) => {
      if (!inb(x, y) || y > 56) return;
      // hilo del racimo y flores en hilera
      const L = 3 + ((q() * 4) | 0);
      pline(c, x, y, x, y + L, wood[1], 1);
      for (let k = 0; k <= L; k++) {
        const t = 1 + ((q() * 3) | 0);
        const side = k % 2 ? 1 : -1;
        px(c, x + side, y + k, vi[t]);
        if (k % 2 === 0) px(c, x - side, y + k, vi[Math.max(0, t - 1)]);
      }
      px(c, x, y - 1, vi[3]);
      px(c, x, y, vi[4]);
    });
  });
}

// Árbol de Guanacaste / parota (Enterolobium cyclocarpum): árbol enorme de tronco
// corto y muy grueso, con una copa ancha y plana como paraguas de hojas bipinnadas
// finas, y vainas oscuras enroscadas en forma de oreja (de ahí "orejón").
function makeGuanacaste() {
  const W = 128;
  const H = 92;
  const GY = 86; // línea del suelo
  return sprite(W, H, 64, GY, (c) => {
    const bark = ["#231e18", "#43392d", "#685a46", "#8f7f66"];
    const gr = ["#12330f", "#245a1c", "#3f8a2a", "#68b640", "#97d862"];
    const pod = ["#2a160b", "#4f2a14", "#7a4524", "#a86a3a"];
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    // sombra amplia bajo la copa y suelo
    ellipse(c, 64, GY, 48, 5, "rgba(0,0,0,0.30)");
    ellipse(c, 64, GY - 1, 38, 3, "#5a4630");
    const rg = mulberry32(417);
    for (let i = 0; i < 30; i++) {
      const x = 22 + ((rg() * 84) | 0);
      const h = 2 + ((rg() * 4) | 0);
      pline(
        c,
        x,
        GY - 1,
        x + (rg() < 0.5 ? -1 : 1),
        GY - 1 - h,
        gr[1 + ((rg() * 3) | 0)],
        1,
      );
    }

    // raíces anchas que se reparten por el suelo
    rootCurve(c, 54, 78, 42, 81, 28, GY + 1, 5, 1, bark);
    rootCurve(c, 74, 78, 86, 81, 100, GY + 1, 5, 1, bark);
    rootCurve(c, 58, 82, 50, GY + 1, 40, GY + 3, 3, 1, bark);
    rootCurve(c, 70, 82, 78, GY + 1, 88, GY + 3, 3, 1, bark);

    // tronco corto y muy grueso, ensanchado en la base, con surcos verticales
    const hwT = (y) => 9 + (y > 70 ? Math.pow((y - 70) / 16, 1.7) * 5 : 0);
    const cxT = (y) => 64 + Math.round(Math.sin(y / 11) * 1.2);
    for (let y = 38; y <= GY; y++) {
      const cx = cxT(y);
      const hw = Math.round(hwT(y));
      const L = cx - hw;
      const R = cx + hw;
      px(c, L - 1, y, bark[0]);
      px(c, R + 1, y, bark[0]);
      for (let x = L; x <= R; x++) {
        const u = (x - L) / (2 * hw);
        let tone = u < 0.25 ? 3 : u < 0.62 ? 2 : 1;
        const key = Math.round(u * 16);
        const h = hash2(key, Math.floor((y + key * 5) / 6), 23);
        if (h < 0.3) tone -= 1;
        else if (h > 0.9) tone += 1;
        if ((key === 5 || key === 11) && hash2(x, y, 6) > 0.2) tone = 0; // surcos
        if (x >= R - 1) tone = Math.min(tone, 1);
        px(c, x, y, bark[Math.max(0, Math.min(3, tone))]);
      }
    }
    rect(
      c,
      64 - Math.round(hwT(GY)) - 1,
      GY + 1,
      Math.round(hwT(GY)) * 2 + 3,
      1,
      bark[0],
    );

    // ramas gruesas casi horizontales que sostienen la copa
    limb(
      c,
      [
        [64, 42],
        [48, 34],
        [30, 29],
        [10, 27],
      ],
      5,
      1,
      bark,
    );
    limb(
      c,
      [
        [64, 42],
        [80, 34],
        [98, 29],
        [118, 27],
      ],
      5,
      1,
      bark,
    );
    limb(
      c,
      [
        [62, 40],
        [56, 28],
        [48, 18],
      ],
      3,
      1,
      bark,
    );
    limb(
      c,
      [
        [66, 40],
        [72, 28],
        [80, 18],
      ],
      3,
      1,
      bark,
    );
    limb(
      c,
      [
        [60, 44],
        [46, 42],
        [34, 46],
      ],
      3,
      1,
      bark,
    );
    limb(
      c,
      [
        [68, 44],
        [82, 42],
        [94, 46],
      ],
      3,
      1,
      bark,
    );

    // vainas en forma de oreja colgando bajo la copa (detrás del follaje)
    const pods = [];
    for (let i = 0; i < 16; i++) {
      pods.push([Math.round(24 + rg() * 80), Math.round(30 + rg() * 14)]);
    }
    const drawPod = ([x, y]) => {
      pline(c, x, y - 4, x, y - 1, bark[1], 1); // tallito
      // media luna enroscada
      for (let a = -0.4; a <= 3.3; a += 0.18) {
        const px0 = Math.round(x + Math.cos(a) * 3);
        const py0 = Math.round(y + Math.sin(a) * 3);
        disc(c, px0, py0, 1, pod[a < 1 ? 1 : 0]);
      }
      for (let a = 0.2; a <= 2.6; a += 0.3) {
        px(
          c,
          Math.round(x + Math.cos(a) * 3),
          Math.round(y + Math.sin(a) * 3) - 1,
          a < 1.4 ? pod[3] : pod[2],
        );
      }
    };

    // copa: capas anchas y planas de follaje fino con bordes irregulares
    const clusters = [
      // faldón bajo
      [14, 36, 12, 5],
      [114, 36, 12, 5],
      [30, 40, 14, 5],
      [98, 40, 14, 5],
      // banda media
      [22, 29, 20, 6],
      [106, 29, 20, 6],
      [48, 31, 22, 6],
      [80, 31, 22, 6],
      [64, 28, 24, 6],
      // capas altas
      [38, 20, 22, 6],
      [90, 20, 22, 6],
      [64, 16, 30, 7],
      [48, 12, 20, 5],
      [80, 12, 20, 5],
      [64, 8, 22, 5],
    ];
    const rg2 = mulberry32(88);
    for (let i = 0; i < 30; i++) {
      const a = rg2() * Math.PI * 2;
      const rx = 52 + rg2() * 10;
      clusters.push([
        Math.round(64 + Math.cos(a) * rx),
        Math.round(24 + Math.sin(a) * (12 + rg2() * 6)),
        2 + ((rg2() * 4) | 0),
        2,
      ]);
    }
    const buf = new Int8Array(W * H).fill(-1);
    clusters.forEach(([cx, cy, rx, ry], id) => {
      for (let y = cy - ry - 3; y <= cy + ry + 3; y++) {
        for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
          if (!inb(x, y)) continue;
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const d =
            Math.sqrt(dx * dx + dy * dy) +
            (vnoise(x, y, 3, 60 + id) - 0.5) * 0.55;
          if (d > 1) continue;
          // huecos finos entre hojitas (aspecto plumoso)
          if (dy > -0.1 && d > 0.45 && vnoise(x + 31, y, 2, 120) > 0.72)
            continue;
          const v =
            dy * 0.55 + dx * 0.1 + (vnoise(x, y, 2, 9 + id * 3) - 0.5) * 0.9;
          buf[y * W + x] = v < -0.2 ? 3 : v < 0.2 ? 2 : v < 0.5 ? 1 : 0;
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
        if (at(x, y + 1) < 0) t = 0;
        else if (at(x + 1, y) < 0 || at(x - 1, y) < 0) t = Math.min(t, 1);
        else if (at(x, y - 1) < 0 && t >= 2) t = hash2(x, y, 3) < 0.3 ? 4 : 3;
        // trazos finos de foliolos: pequeñas rayitas claras y oscuras
        else if (hash2(x >> 1, y, 14) > 0.9) t = Math.min(4, t + 1);
        else if (hash2(x, y >> 1, 15) < 0.08) t = Math.max(0, t - 1);
        out[y * W + x] = t;
      }
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = out[y * W + x];
        if (t >= 0) px(c, x, y, gr[t]);
      }

    // vainas que asoman por debajo del borde de la copa
    pods.forEach((p) => {
      if (at(p[0], p[1] + 3) < 0 && at(p[0], p[1] - 4) >= 0) drawPod(p);
    });
    [
      [22, 44],
      [40, 47],
      [88, 46],
      [106, 43],
      [64, 49],
    ].forEach(drawPod);
  });
}

// Flamboyán (Delonix regia): copa ancha en paraguas de hojas bipinnadas finas,
// tapizada de racimos de flores rojo-naranja, con vainas largas y leñosas colgando.
function makeFlamboyan() {
  const W = 120;
  const H = 88;
  const GY = 82;
  return sprite(W, H, 60, GY, (c) => {
    const bark = ["#2a221b", "#4d4034", "#76675a", "#9d8c7a"];
    const gr = ["#13361a", "#25601f", "#3f9030", "#66bd44", "#93dc66"];
    const fl = ["#6e0f08", "#b01c0e", "#e23a17", "#ff6b2b", "#ffb347"];
    const pod = ["#241109", "#46260f", "#6a3d1c"];
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

    ellipse(c, 60, GY, 44, 5, "rgba(0,0,0,0.30)");
    ellipse(c, 60, GY - 1, 34, 3, "#5a4630");
    const rg = mulberry32(731);
    for (let i = 0; i < 26; i++) {
      const x = 22 + ((rg() * 76) | 0);
      const h = 2 + ((rg() * 4) | 0);
      pline(
        c,
        x,
        GY - 1,
        x + (rg() < 0.5 ? -1 : 1),
        GY - 1 - h,
        gr[1 + ((rg() * 3) | 0)],
        1,
      );
    }
    // flores caídas en el suelo
    for (let i = 0; i < 26; i++) {
      const x = 20 + ((rg() * 80) | 0);
      const y = GY - 1 + ((rg() * 4) | 0);
      px(c, x, y, fl[1 + ((rg() * 3) | 0)]);
    }

    // contrafuertes de la base
    rootCurve(c, 55, 72, 46, 76, 34, GY + 1, 4, 1, bark);
    rootCurve(c, 65, 72, 74, 76, 86, GY + 1, 4, 1, bark);
    rootCurve(c, 58, 76, 53, GY + 1, 46, GY + 3, 3, 1, bark);
    rootCurve(c, 62, 76, 67, GY + 1, 74, GY + 3, 3, 1, bark);

    // tronco de grosor medio, corteza lisa y grisácea con manchas
    const hwT = (y) => 6 + (y > 66 ? Math.pow((y - 66) / 16, 1.8) * 4 : 0);
    const cxT = (y) => 60 + Math.round(Math.sin(y / 9) * 1.5);
    for (let y = 36; y <= GY; y++) {
      const cx = cxT(y);
      const hw = Math.round(hwT(y));
      const L = cx - hw;
      const R = cx + hw;
      px(c, L - 1, y, bark[0]);
      px(c, R + 1, y, bark[0]);
      for (let x = L; x <= R; x++) {
        const u = (x - L) / (2 * hw);
        let tone = u < 0.3 ? 3 : u < 0.65 ? 2 : 1;
        const h = hash2(x, Math.floor(y / 3), 41);
        if (h < 0.18) tone -= 1;
        else if (h > 0.93) tone += 1;
        if (x >= R - 1) tone = Math.min(tone, 1);
        px(c, x, y, bark[Math.max(0, Math.min(3, tone))]);
      }
    }
    rect(
      c,
      60 - Math.round(hwT(GY)) - 1,
      GY + 1,
      Math.round(hwT(GY)) * 2 + 3,
      1,
      bark[0],
    );

    // ramas que se abren en V y luego se extienden en horizontal
    limb(
      c,
      [
        [60, 44],
        [46, 36],
        [30, 30],
        [12, 30],
      ],
      4,
      1,
      bark,
    );
    limb(
      c,
      [
        [60, 44],
        [74, 36],
        [90, 30],
        [108, 30],
      ],
      4,
      1,
      bark,
    );
    limb(
      c,
      [
        [59, 42],
        [52, 30],
        [42, 20],
      ],
      3,
      1,
      bark,
    );
    limb(
      c,
      [
        [61, 42],
        [68, 30],
        [78, 20],
      ],
      3,
      1,
      bark,
    );
    limb(
      c,
      [
        [58, 48],
        [44, 46],
        [30, 50],
      ],
      2,
      1,
      bark,
    );
    limb(
      c,
      [
        [62, 48],
        [76, 46],
        [90, 50],
      ],
      2,
      1,
      bark,
    );

    // copa: capas anchas y bajas
    const clusters = [
      [14, 36, 12, 5],
      [106, 36, 12, 5],
      [30, 38, 14, 6],
      [90, 38, 14, 6],
      [20, 28, 18, 6],
      [100, 28, 18, 6],
      [44, 30, 20, 6],
      [76, 30, 20, 6],
      [60, 27, 22, 6],
      [34, 19, 20, 6],
      [86, 19, 20, 6],
      [60, 15, 28, 7],
      [44, 10, 16, 5],
      [76, 10, 16, 5],
    ];
    const rg2 = mulberry32(55);
    for (let i = 0; i < 28; i++) {
      const a = rg2() * Math.PI * 2;
      const rx = 48 + rg2() * 10;
      clusters.push([
        Math.round(60 + Math.cos(a) * rx),
        Math.round(24 + Math.sin(a) * (12 + rg2() * 6)),
        2 + ((rg2() * 4) | 0),
        2,
      ]);
    }
    const buf = new Int8Array(W * H).fill(-1);
    clusters.forEach(([cx, cy, rx, ry], id) => {
      for (let y = cy - ry - 3; y <= cy + ry + 3; y++) {
        for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
          if (!inb(x, y)) continue;
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const d =
            Math.sqrt(dx * dx + dy * dy) +
            (vnoise(x, y, 3, 200 + id) - 0.5) * 0.55;
          if (d > 1) continue;
          if (dy > -0.1 && d > 0.45 && vnoise(x + 17, y, 2, 140) > 0.72)
            continue;
          const v =
            dy * 0.55 + dx * 0.1 + (vnoise(x, y, 2, 19 + id * 3) - 0.5) * 0.9;
          buf[y * W + x] = v < -0.2 ? 3 : v < 0.2 ? 2 : v < 0.5 ? 1 : 0;
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
        if (at(x, y + 1) < 0) t = 0;
        else if (at(x + 1, y) < 0 || at(x - 1, y) < 0) t = Math.min(t, 1);
        else if (at(x, y - 1) < 0 && t >= 2) t = hash2(x, y, 3) < 0.3 ? 4 : 3;
        else if (hash2(x >> 1, y, 24) > 0.9) t = Math.min(4, t + 1);
        else if (hash2(x, y >> 1, 25) < 0.08) t = Math.max(0, t - 1);
        out[y * W + x] = t;
      }
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = out[y * W + x];
        if (t >= 0) px(c, x, y, gr[t]);
      }

    // vainas largas y planas colgando bajo la copa
    for (let i = 0; i < 9; i++) {
      const x = 22 + ((rg() * 76) | 0);
      const y0 = 38 + ((rg() * 6) | 0);
      if (at(x, y0 - 1) < 0) continue;
      const len = 10 + ((rg() * 8) | 0);
      pline(c, x, y0, x, y0 + len, pod[1], 2);
      pline(c, x, y0, x, y0 + len, pod[2], 1);
      px(c, x, y0 + len, pod[0]);
    }

    // flores: racimos rojo-naranja sobre la copa, más densos arriba
    const rf = mulberry32(909);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = out[y * W + x];
        if (t < 1) continue;
        const dens = at(x, y - 1) < 0 ? 0.8 : 0.5;
        if (rf() < dens * 0.8) {
          const k = rf();
          const col =
            k < 0.15 ? fl[1] : k < 0.5 ? fl[2] : k < 0.85 ? fl[3] : fl[4];
          px(c, x, y, col);
          if (rf() < 0.45) px(c, x + 1, y, fl[rf() < 0.5 ? 2 : 3]);
          if (rf() < 0.25) px(c, x, y + 1, fl[1]);
        }
      }
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

/* ---------- Huaychivo: hombre-cabra hechicero ---------- */
// Nahual de aspecto siniestro: macho cabrío bípedo de pelaje negro-grisáceo y melena
// desgreñada, cuernos de carnero que se enroscan hacia afuera, ojos rojos incandescentes,
// hocico con colmillos y barba, garras de hueso, pecho musculoso con cadenas y colgante,
// taparrabo negro roto con faja roja y patas de cabra (muslo peludo, caña fina, pezuña hendida).
//
// Se dibuja en código y a su tamaño final con un pequeño sistema de capas: cada parte del
// cuerpo es una máscara que se pinta con una rampa de 5 tonos, con la luz entrando desde
// arriba a la izquierda (borde iluminado arriba-izquierda, sombra abajo-derecha), más un
// contorno oscuro que separa cada parte de las demás.
// leg: 0 = parado, 1 / 2 = pasos (levanta una pata), 3 = erguido entre pasos, 4 = parado
// respirando; atk: 0 = normal, 1 = preparando el golpe (se estira, garras arriba),
// 2 = golpeando (se agacha y zarpea hacia abajo, con destellos en las garras).
const HZ_RAMP = {
  fur: ["#15110d", "#261f18", "#3a3126", "#54473a", "#76654f"],
  skin: ["#241a16", "#3c2c24", "#5a4436", "#7d6350", "#a28a70"],
  horn: ["#1c1710", "#38301f", "#5e4e35", "#867150", "#b9a373"],
  red: ["#2a0505", "#560d0d", "#861616", "#b82620", "#e04a36"],
  bone: ["#4e493d", "#7a7565", "#a9a28b", "#cfc8ae", "#efe9d0"],
  cloth: ["#0a0807", "#15110f", "#231d19", "#342c25", "#473d33"],
  hoof: ["#0e0b08", "#221a12", "#3a2d1d", "#58452d", "#7a6240"],
  ear: ["#2a1414", "#4a2626", "#6e3b3b", "#8f5252", "#b06a6a"],
};
const HZ_HEX = {};
function hzHex(s) {
  if (!HZ_HEX[s]) {
    HZ_HEX[s] = [
      parseInt(s.slice(1, 3), 16),
      parseInt(s.slice(3, 5), 16),
      parseInt(s.slice(5, 7), 16),
    ];
  }
  return HZ_HEX[s];
}
function hzSet(b, x, y, col, a) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= b.W || y >= b.H) return;
  const rgb = typeof col === "string" ? hzHex(col) : col;
  const i = (y * b.W + x) * 4;
  b.d[i] = rgb[0];
  b.d[i + 1] = rgb[1];
  b.d[i + 2] = rgb[2];
  b.d[i + 3] = a === undefined ? 255 : a;
}
function hzLine(b, x0, y0, x1, y1, col, t) {
  t = t || 1;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    for (let u = 0; u < t; u++)
      for (let v = 0; v < t; v++) hzSet(b, x + u, y + v, col);
  }
}
// Máscara binaria: se dibuja con trazos del canvas y se umbraliza para obtener bordes nítidos
function hzMask(W, H, fn) {
  const cv = makeCanvas(W, H);
  const g = cv.getContext("2d");
  g.fillStyle = "#000";
  g.strokeStyle = "#000";
  g.lineCap = "round";
  g.lineJoin = "round";
  fn(g);
  const d = g.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] >= 110 ? 1 : 0;
  return m;
}
function hzPoly(g, pts) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}
function hzEll(g, cx, cy, rx, ry) {
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}
// Tubo con grosor variable a lo largo de una polilínea
function hzTube(g, pts, rs) {
  for (let s = 0; s < pts.length - 1; s++) {
    const [x0, y0] = pts[s];
    const [x1, y1] = pts[s + 1];
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      g.beginPath();
      g.arc(
        x0 + (x1 - x0) * t,
        y0 + (y1 - y0) * t,
        rs[s] + (rs[s + 1] - rs[s]) * t,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
}
// Ejecuta fn para el lado izquierdo y para su reflejo (eje x = W / 2)
function hzBoth(g, W, fn) {
  fn(0);
  g.save();
  g.translate(W, 0);
  g.scale(-1, 1);
  fn(1);
  g.restore();
}
// Pinta una máscara con una rampa de 5 tonos: luz desde arriba-izquierda
function hzPaint(b, m, ramp, o) {
  o = o || {};
  const { W, H } = b;
  const R = ramp.map(hzHex);
  const ins = (x, y) =>
    x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
  const outCol = o.out === undefined ? ramp[0] : o.out;
  if (outCol) {
    const oc = hzHex(outCol);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (
          !m[y * W + x] &&
          (ins(x - 1, y) || ins(x + 1, y) || ins(x, y - 1) || ins(x, y + 1))
        )
          hzSet(b, x, y, oc);
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      let a = 4;
      for (let k = 1; k <= 3; k++)
        if (!ins(x, y - k) || !ins(x - k, y) || !ins(x - k, y - k)) {
          a = k;
          break;
        }
      let d = 4;
      for (let k = 1; k <= 3; k++)
        if (!ins(x, y + k) || !ins(x + k, y) || !ins(x + k, y + k)) {
          d = k;
          break;
        }
      let t = 2 + (o.bias || 0);
      t += a === 1 ? 1.6 : a === 2 ? 0.8 : 0;
      t -= d === 1 ? 1.6 : d === 2 ? 0.8 : 0;
      if (o.noise) {
        const n = hash2(x, y, o.seed || 0);
        if (n < o.noise) t -= 1;
        else if (n > 1 - o.noise * 0.6) t += 1;
      }
      t = Math.max(0, Math.min(4, Math.round(t)));
      hzSet(b, x, y, R[t]);
    }
  }
}
// Contorno exterior final de toda la silueta
function hzSilhouette(b, col) {
  const { W, H, d } = b;
  const solid = (x, y) =>
    x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] >= 200;
  const todo = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (
        !solid(x, y) &&
        (solid(x - 1, y) ||
          solid(x + 1, y) ||
          solid(x, y - 1) ||
          solid(x, y + 1))
      )
        todo.push([x, y]);
  todo.forEach(([x, y]) => hzSet(b, x, y, col));
}

function makeHuaychivo(leg, atk) {
  const W = 60;
  const H = 76;
  const GY = 71; // línea del suelo
  return sprite(W, H, 30, GY, (c) => {
    const b = { W, H, d: new Uint8ClampedArray(W * H * 4) };
    const M = (x) => W - x;
    const FUR = HZ_RAMP.fur;
    const eye = atk > 0 ? "#ff5a3a" : "#ee2f20";

    // ---- Pose ----
    let by = 0; // + = se agacha, - = se estira
    let liftL = 0;
    let liftR = 0;
    // brazos en coordenadas del lado izquierdo (el derecho es el reflejo): codo y mano
    let aL = { e: [7, 38], h: [8, 25] };
    let aR = { e: [6, 36], h: [7, 28] };
    if (leg === 1 || leg === 2) {
      by = 1;
      liftL = leg === 1 ? 3 : 0;
      liftR = leg === 2 ? 3 : 0;
      const up = { e: [6, 35], h: [6, 23] };
      const dn = { e: [7, 38], h: [9, 28] };
      aL = leg === 1 ? dn : up;
      aR = leg === 1 ? up : dn;
    } else if (leg === 3) {
      by = -1;
      aL = { e: [7, 37], h: [8, 24] };
      aR = { e: [7, 37], h: [8, 24] };
    } else if (leg === 4) {
      by = -1;
      aL = { e: [5, 37], h: [7, 22] };
      aR = { e: [5, 37], h: [7, 22] };
    }
    if (atk === 1) {
      by = -2;
      aL = { e: [6, 24], h: [4, 10] };
      aR = { e: [6, 24], h: [4, 10] };
    } else if (atk === 2) {
      by = 2;
      aL = { e: [9, 43], h: [13, 57] };
      aR = { e: [9, 43], h: [13, 57] };
    }
    const U = 4 + by; // desplazamiento vertical del cuerpo superior
    const L0 = 6; // desplazamiento vertical de las patas bajas

    // ---- Sombra en el suelo ----
    for (let y = -3; y <= 3; y++) {
      const w = Math.round(17 * Math.sqrt(1 - (y * y) / 10));
      for (let x = -w; x <= w; x++) hzSet(b, 30 + x, GY - 1 + y, "#000000", 80);
    }

    // ---- Patas de cabra: muslo peludo, rodilla hacia afuera, caña fina y pezuña ----
    const legGeom = (s) => {
      const L = s ? liftR : liftL;
      return {
        hip: [22, 44 + U],
        knee: [L ? 15.5 : 17, 54 + L0 - L],
        ank: [L ? 18 : 19.5, 60 + L0 - L],
        L,
      };
    };
    [0, 1].forEach((s) => {
      const gm = legGeom(s);
      const m = hzMask(W, H, (g) => {
        g.save();
        if (s) {
          g.translate(W, 0);
          g.scale(-1, 1);
        }
        hzTube(g, [gm.hip, gm.knee, gm.ank], [6.2, 4.4, 2.3]);
        // pelaje del muslo y flecos en la rodilla
        hzPoly(g, [
          [gm.knee[0] - 3.5, gm.knee[1] - 3],
          [gm.knee[0] - 6.5, gm.knee[1] + 0.5],
          [gm.knee[0] - 3, gm.knee[1] + 2.5],
        ]);
        hzPoly(g, [
          [gm.knee[0] - 3, gm.knee[1] + 2],
          [gm.knee[0] - 4.5, gm.knee[1] + 6],
          [gm.knee[0] - 1, gm.knee[1] + 4.5],
        ]);
        g.restore();
      });
      hzPaint(b, m, FUR, { noise: 0.1, seed: 31 + s, bias: 0.1 });
      // pezuña hendida
      const ax = s ? M(gm.ank[0]) : gm.ank[0];
      const ay = gm.ank[1];
      const hm = hzMask(W, H, (g) =>
        hzPoly(g, [
          [ax - 3.5, ay + 0.5],
          [ax + 3.5, ay + 0.5],
          [ax + 4.5, ay + 5],
          [ax - 4.5, ay + 5],
        ]),
      );
      hzPaint(b, hm, HZ_RAMP.hoof, {});
      hzSet(b, ax, ay + 3, HZ_RAMP.hoof[0]);
      hzSet(b, ax, ay + 4, HZ_RAMP.hoof[0]);
    });

    // ---- Melena trasera: pelo largo y desgreñado alrededor del cuello y hombros ----
    {
      const rm = mulberry32(4242);
      const pts = [];
      const N = 32;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const rr = (i % 2 ? 8 : 11.5) + rm() * 3;
        pts.push([
          30 + Math.cos(a) * rr * 1.3,
          22 + U - 4 + Math.sin(a) * rr * 0.85,
        ]);
      }
      const m = hzMask(W, H, (g) => hzPoly(g, pts));
      hzPaint(b, m, FUR, { noise: 0.1, seed: 5, bias: -1.3 });
    }

    // ---- Torso musculoso ----
    {
      const m = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzPoly(g, [
          [13, 28],
          [19, 24],
          [41, 24],
          [47, 28],
          [44, 37],
          [40, 45],
          [20, 45],
          [16, 37],
        ]);
        hzEll(g, 30, 25, 14, 4);
      });
      hzPaint(b, m, FUR, { noise: 0.06, seed: 71, bias: 0.15 });
      // pectorales
      const pm = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzEll(g, 23.5, 32, 6.2, 4.2);
        hzEll(g, 36.5, 32, 6.2, 4.2);
      });
      hzPaint(b, pm, FUR, { out: FUR[1], bias: 0.7, noise: 0.04, seed: 72 });
      // abdomen en cuadros
      const am = hzMask(W, H, (g) => {
        g.translate(0, U);
        [37, 40.5, 44].forEach((y) => {
          g.fillRect(25, y, 4, 2);
          g.fillRect(31, y, 4, 2);
        });
      });
      hzPaint(b, am, FUR, { out: FUR[1], bias: 0.3 });
      // costillas
      [29.5, 32.5].forEach((y) => {
        hzSet(b, 17, y + U - 4 + 4, FUR[1]);
      });
    }

    // ---- Taparrabo negro roto con faja y tira roja ----
    {
      const rag = [
        [22, 44],
        [38, 44],
        [39.5, 50],
        [38.5, 53],
        [36, 51.5],
        [34, 55],
        [31.5, 52],
        [29, 56],
        [26.5, 52],
        [24, 55],
        [22, 51],
        [20.5, 53],
        [20.5, 49],
      ];
      const m = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzPoly(g, rag);
      });
      hzPaint(b, m, HZ_RAMP.cloth, { noise: 0.1, seed: 83, bias: 0 });
      // tira roja central con flecos
      const sm = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzPoly(g, [
          [27.5, 45],
          [32.5, 45],
          [32, 54],
          [31, 56.5],
          [30, 55],
          [29, 56.5],
          [28, 54],
        ]);
      });
      hzPaint(b, sm, HZ_RAMP.red, { noise: 0.1, seed: 9 });
      // faja roja en la cintura
      const fm = hzMask(W, H, (g) => {
        g.translate(0, U);
        g.fillRect(20, 43, 20, 4);
      });
      hzPaint(b, fm, HZ_RAMP.red, { noise: 0.06, seed: 10, bias: 0.2 });
      // nudo de la faja
      const km = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzEll(g, 30, 45, 3, 3);
      });
      hzPaint(b, km, HZ_RAMP.red, { bias: 0.3 });
      // amuleto de hueso (calavera chica)
      const tm = hzMask(W, H, (g) => {
        g.translate(0, U);
        g.fillRect(28, 48, 5, 4);
      });
      hzPaint(b, tm, HZ_RAMP.bone, {});
      hzSet(b, 29.5, 50 + U, "#14100c");
      hzSet(b, 31.5, 50 + U, "#14100c");
    }

    // ---- Cadenas y medallón de hueso en el pecho ----
    {
      const chain = (x0, y0, x1, y1, sag) => {
        for (let i = 0; i <= 14; i++) {
          const t = i / 14;
          const x = x0 + (x1 - x0) * t;
          const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
          hzSet(b, x, y + U, i % 2 ? HZ_RAMP.bone[3] : HZ_RAMP.bone[1]);
        }
      };
      chain(17, 27, 30, 40, 3);
      chain(43, 27, 30, 40, 3);
      const mm = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzEll(g, 30, 40.5, 2.2, 2.2);
      });
      hzPaint(b, mm, HZ_RAMP.bone, {});
      hzSet(b, 30, 40 + U, "#14100c");
    }

    // ---- Brazos: hombro -> codo -> mano con brazalete y garras de hueso ----
    const armPts = (a, s) => {
      const sh = [14, 30 + U];
      const e = [a.e[0], a.e[1] + 4 + (atk === 2 ? 0 : by)];
      const h = [a.h[0], a.h[1] + 4 + (atk === 2 ? 0 : by)];
      return { sh, e, h };
    };
    [0, 1].forEach((s) => {
      const a = armPts(s ? aR : aL, s);
      const m = hzMask(W, H, (g) => {
        g.save();
        if (s) {
          g.translate(W, 0);
          g.scale(-1, 1);
        }
        hzTube(g, [a.sh, a.e, a.h], [4.4, 3.5, 2.7]);
        g.restore();
      });
      hzPaint(b, m, FUR, { noise: 0.08, seed: 91 + s, bias: 0.5 });
      // vello en el antebrazo
      const rm = mulberry32(300 + s);
      for (let i = 0; i < 7; i++) {
        const t = rm();
        const x = a.e[0] + (a.h[0] - a.e[0]) * t + (rm() < 0.5 ? -3 : 3);
        const y = a.e[1] + (a.h[1] - a.e[1]) * t;
        hzSet(b, s ? M(x) : x, y, FUR[1]);
      }
      // brazalete
      const t0 = 0.5;
      const t1 = 0.72;
      const bm = hzMask(W, H, (g) => {
        g.save();
        if (s) {
          g.translate(W, 0);
          g.scale(-1, 1);
        }
        hzTube(
          g,
          [
            [a.e[0] + (a.h[0] - a.e[0]) * t0, a.e[1] + (a.h[1] - a.e[1]) * t0],
            [a.e[0] + (a.h[0] - a.e[0]) * t1, a.e[1] + (a.h[1] - a.e[1]) * t1],
          ],
          [3.2, 3.0],
        );
        g.restore();
      });
      hzPaint(b, bm, HZ_RAMP.hoof, { bias: 0.3 });
      {
        const bx = a.e[0] + (a.h[0] - a.e[0]) * 0.6;
        const by2 = a.e[1] + (a.h[1] - a.e[1]) * 0.6;
        hzSet(b, s ? M(bx) : bx, by2, HZ_RAMP.bone[3]);
      }
      // mano y garras
      const dx0 = a.h[0] - a.e[0];
      const dy0 = a.h[1] - a.e[1];
      const th = Math.atan2(dy0, dx0);
      const claws = [-0.85, -0.3, 0.3, 0.85];
      const hmask = hzMask(W, H, (g) => {
        g.save();
        if (s) {
          g.translate(W, 0);
          g.scale(-1, 1);
        }
        hzEll(g, a.h[0], a.h[1], 3, 3);
        g.restore();
      });
      hzPaint(b, hmask, HZ_RAMP.skin, { bias: 0.2 });
      const cmask = hzMask(W, H, (g) => {
        g.save();
        if (s) {
          g.translate(W, 0);
          g.scale(-1, 1);
        }
        claws.forEach((off) => {
          const a0 = th + off * 0.9;
          const a1 = th + off * 1.25;
          hzTube(
            g,
            [
              [a.h[0] + Math.cos(a0) * 2.6, a.h[1] + Math.sin(a0) * 2.6],
              [a.h[0] + Math.cos(a1) * 7.2, a.h[1] + Math.sin(a1) * 7.2],
            ],
            [1.15, 0.55],
          );
        });
        g.restore();
      });
      hzPaint(b, cmask, HZ_RAMP.bone, { bias: 0 });
      if (atk === 2) {
        const hx = s ? M(a.h[0]) : a.h[0];
        const sgn = s ? -1 : 1;
        hzLine(
          b,
          hx + sgn * 2,
          a.h[1] + 8,
          hx + sgn * 9,
          a.h[1] + 14,
          "#ffffff",
          1,
        );
        hzLine(
          b,
          hx - sgn * 1,
          a.h[1] + 9,
          hx + sgn * 5,
          a.h[1] + 15,
          "#ffe9b0",
          1,
        );
        hzLine(
          b,
          hx - sgn * 4,
          a.h[1] + 8,
          hx + sgn * 1,
          a.h[1] + 13,
          "#ffffff",
          1,
        );
      }
    });

    // ---- Cuernos de carnero: salen de la frente, se enroscan hacia afuera y abajo ----
    const hornPath = [
      [25, 10],
      [21, 5.5],
      [15, 3.5],
      [9.5, 5.5],
      [6.5, 10.5],
      [8.5, 14.5],
    ];
    const hornR = [3.5, 3.1, 2.6, 2.1, 1.5, 0.75];
    {
      const m = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzBoth(g, W, () => hzTube(g, hornPath, hornR));
      });
      hzPaint(b, m, HZ_RAMP.horn, {});
      // anillos del cuerno
      for (let s = 0; s < 2; s++) {
        for (let i = 1; i < hornPath.length - 1; i++) {
          const [x0, y0] = hornPath[i];
          const [x1, y1] = hornPath[i + 1];
          [0.15, 0.6].forEach((t) => {
            const x = x0 + (x1 - x0) * t;
            const y = y0 + (y1 - y0) * t;
            const nx = -(y1 - y0);
            const ny = x1 - x0;
            const nl = Math.hypot(nx, ny) || 1;
            const r = hornR[i] * 0.55;
            for (let k = -1; k <= 1; k++)
              hzSet(
                b,
                s ? M(x + (nx / nl) * r * k) : x + (nx / nl) * r * k,
                y + (ny / nl) * r * k + U,
                HZ_RAMP.horn[1],
              );
          });
        }
      }
    }

    // ---- Orejas puntiagudas hacia los lados ----
    {
      const m = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzBoth(g, W, () =>
          hzPoly(g, [
            [23, 13.5],
            [16, 15],
            [9, 24.5],
            [14.5, 22],
            [23, 19.5],
          ]),
        );
      });
      hzPaint(b, m, FUR, { noise: 0.06, seed: 44, bias: 0.2 });
      const im = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzBoth(g, W, () =>
          hzPoly(g, [
            [21.5, 15.5],
            [17, 16.5],
            [11.5, 23],
            [15.5, 20.5],
            [21.5, 18.5],
          ]),
        );
      });
      hzPaint(b, im, HZ_RAMP.ear, { out: null, bias: -0.9 });
    }

    // ---- Cuello ----
    {
      const m = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzEll(g, 30, 25, 5.5, 4);
      });
      hzPaint(b, m, FUR, { bias: -0.6, noise: 0.15, seed: 12 });
    }

    // ---- Cabeza: cráneo, hocico alargado, barba, ojos, colmillos ----
    {
      // barba (detrás del hocico)
      const bm = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzPoly(g, [
          [27, 30],
          [30, 31],
          [27.5, 36],
        ]);
        hzPoly(g, [
          [28.5, 31],
          [31.5, 31],
          [30, 39],
        ]);
        hzPoly(g, [
          [30, 31],
          [33, 30],
          [32.5, 36],
        ]);
      });
      hzPaint(b, bm, FUR, { noise: 0.08, seed: 61, bias: 0.9 });

      const hm = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzEll(g, 30, 15, 8.4, 7.2);
        hzPoly(g, [
          [24.2, 17],
          [35.8, 17],
          [34.6, 24],
          [33.4, 29.5],
          [26.6, 29.5],
          [25.4, 24],
        ]);
      });
      hzPaint(b, hm, FUR, { noise: 0.05, seed: 21, bias: 0.8 });
      // hocico más claro
      const mm = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzEll(g, 30, 26.5, 4.7, 3.6);
      });
      hzPaint(b, mm, HZ_RAMP.skin, { out: FUR[1], bias: 0.6 });
      // mandíbula
      const jm = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzEll(g, 30, 30.3, 3.4, 1.7 + (atk > 0 ? 1.3 : 0));
      });
      hzPaint(b, jm, HZ_RAMP.skin, { bias: -0.2 });

      // frente: ceño fruncido
      hzLine(b, 22.5, 11 + U, 29, 14.2 + U, FUR[0], 2);
      hzLine(b, M(22.5), 11 + U, M(29), 14.2 + U, FUR[0], 2);
      hzLine(b, 23, 10 + U, 28, 12.8 + U, FUR[3], 1);
      hzLine(b, M(23), 10 + U, M(28), 12.8 + U, FUR[3], 1);
      // cuencas oscuras y ojos incandescentes
      [0, 1].forEach((s) => {
        const X = (x) => (s ? M(x) : x);
        [
          [24, 15],
          [25, 15],
          [26, 16],
          [27, 16],
          [25, 16],
          [26, 17],
        ].forEach(([x, y]) => hzSet(b, X(x), y + U, "#1a0b0a"));
        hzSet(b, X(24), 14 + U, "#6e0c0c");
        hzSet(b, X(25), 14 + U, eye);
        hzSet(b, X(26), 15 + U, eye);
        hzSet(b, X(27), 15 + U, "#ffb08a");
        hzSet(b, X(25), 15 + U, "#9c1414");
        hzSet(b, X(26), 14 + U, "#6e0c0c");
      });
      // nariz y fosas
      hzSet(b, 28.5, 27 + U, "#120d0b");
      hzSet(b, 31.5, 27 + U, "#120d0b");
      hzLine(b, 29, 20 + U, 29, 24 + U, FUR[1], 1);
      hzLine(b, 31, 20 + U, 31, 24 + U, FUR[1], 1);
      // boca con colmillos
      if (atk > 0) {
        for (let x = 27; x <= 33; x++)
          for (let y = 29; y <= 32; y++) hzSet(b, x, y + U, "#1a0606");
        hzSet(b, 29, 31 + U, "#c23030");
        hzSet(b, 30, 31 + U, "#e04a36");
        hzSet(b, 31, 31 + U, "#c23030");
        [27, 29, 31, 33].forEach((x) => {
          hzSet(b, x, 29 + U, HZ_RAMP.bone[4]);
          hzSet(b, x, 30 + U, HZ_RAMP.bone[3]);
        });
        [28, 32].forEach((x) => {
          hzSet(b, x, 32 + U, HZ_RAMP.bone[4]);
          hzSet(b, x, 31 + U, HZ_RAMP.bone[3]);
        });
      } else {
        for (let x = 27; x <= 33; x++) hzSet(b, x, 29.5 + U, "#140a09");
        hzSet(b, 27, 30 + U, HZ_RAMP.bone[4]);
        hzSet(b, 27, 31 + U, HZ_RAMP.bone[3]);
        hzSet(b, 33, 30 + U, HZ_RAMP.bone[4]);
        hzSet(b, 33, 31 + U, HZ_RAMP.bone[3]);
        hzSet(b, 29, 30 + U, HZ_RAMP.bone[2]);
        hzSet(b, 31, 30 + U, HZ_RAMP.bone[2]);
      }
    }

    // ---- Mechones de pelo sobre los hombros ----
    {
      const m = hzMask(W, H, (g) => {
        g.translate(0, U);
        hzBoth(g, W, () => {
          hzPoly(g, [
            [14, 27],
            [10, 21],
            [17, 25],
          ]);
          hzPoly(g, [
            [18, 25],
            [15, 18],
            [22, 23],
          ]);
          hzPoly(g, [
            [11, 30],
            [6, 27],
            [12, 27],
          ]);
        });
      });
      hzPaint(b, m, FUR, { noise: 0.06, seed: 15, bias: 0.4 });
    }

    // ---- Contorno exterior y volcado al canvas ----
    hzSilhouette(b, "#0a0807");
    c.putImageData(new ImageData(b.d, W, H), 0, 0);
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
function makeLogSlice(cap, seed, start) {
  const G = 18; // fila del suelo (centro de la casilla)
  const R = 6; // radio visual del tronco
  return sprite(20, 28, 8, G, (c) => {
    // Sombra en el suelo
    for (let X = 0; X < 20; X++) {
      const xr = X - 8 + 0.5;
      if (xr > 9) continue;
      if (start && X < 2) continue;
      rect(c, X, Math.round(G + xr / 2) - 1, 1, 5, "rgba(0,0,0,0.22)");
    }
    // Cuerpo cilíndrico: banda diagonal con pendiente 1/2 (como el borde de una casilla)
    for (let X = 0; X < 16; X++) {
      const xr = X - 8 + 0.5;
      const yc = -R + xr / 2;
      let y0 = Math.round(G + yc - R);
      let y1 = Math.round(G + yc + R);
      // Extremo trasero redondeado (en vez de un corte vertical recto)
      if (start && X < 5) {
        const k = (5 - X) / 5;
        const inset = Math.round(R * (1 - Math.sqrt(1 - k * k)));
        y0 += inset;
        y1 -= inset;
      }
      const f0 = y0;
      for (let Y = y0; Y <= y1; Y++) {
        const f = y1 === y0 ? 0 : (Y - y0) / (y1 - y0);
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
      // Borde oscuro del extremo trasero
      if (start && X < 5) {
        px(c, X, y0, "#38200e");
        px(c, X, y1, "#38200e");
        if (X === 0) for (let Y = y0; Y <= y1; Y++) px(c, X, Y, "#38200e");
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

// Novio: personaje a rescatar. Plataforma baja de piedra con un petate de hojas
// de palma encima; el novio está acostado y amarrado (muñecas, pecho y tobillos),
// con una mordaza de tela. freed = true dibuja la misma escena ya sin las cuerdas
// (cortadas sobre el petate), con los ojos abiertos, sonrisa, mejillas sonrojadas,
// una mano saludando y un corazón flotando (se usa cuando la exploradora lo rescata).
function makeNovio(freed) {
  return sprite(46, 37, 23, 35, (c) => {
    c.translate(0, 9); // 9 filas extra arriba (pelo, mano que saluda, corazón)
    const OL = "#1a1310";
    const STONE_D = "#4a4a44";
    const STONE = "#7d7d70";
    const STONE_L = "#a3a396";
    const MOSS = "#4f7a3a";
    const MOSS_L = "#7aa84e";
    const LEAF_D = "#3f6b2e";
    const LEAF = "#5c8f3d";
    const LEAF_L = "#86b85a";
    const STRAW = "#7a6a3a";
    const STRAW_L = "#9c8a4e";
    const ROPE = "#a07a44";
    const ROPE_L = "#c9a566";
    const ROPE_D = "#573e1e";
    const SKIN = "#e3ad82";
    const SKIN_D = "#c48860";
    const SKIN_L = "#f6d2ab";
    const HAIR = "#2b1a12";
    const HAIR_L = "#5a3a26";
    const SHIRT = "#efe6cc";
    const SHIRT_D = "#cbbf99";
    const SHIRT_DD = "#a99d78";
    const PANTS = "#8a5a33";
    const PANTS_D = "#6b4423";
    const PANTS_L = "#a8744a";
    const SOLE = "#3b2614";
    const STRAP = "#7a4a22";
    const CLOTH = "#d8cfb0";
    const CLOTH_D = "#b3a984";

    // Contorno oscuro + relleno
    const box = (x, y, w, h, fill) => {
      rect(c, x - 1, y - 1, w + 2, h + 2, OL);
      rect(c, x, y, w, h, fill);
    };

    // Sombra en el suelo
    ellipse(c, 23, 26, 21, 3, "rgba(0,0,0,0.30)");

    // Piedrecitas y hierba en el suelo
    px(c, 1, 24, "#6b6b60");
    px(c, 2, 24, "#8f8f82");
    px(c, 44, 23, "#6b6b60");
    px(c, 43, 23, "#8f8f82");
    [
      [2, 22],
      [43, 21],
      [21, 22],
    ].forEach(([gx, gy]) => {
      px(c, gx, gy, MOSS);
      px(c, gx - 1, gy - 1, MOSS_L);
      px(c, gx + 1, gy - 2, MOSS_L);
      px(c, gx, gy - 1, MOSS);
    });

    // ---- Altar de piedra maya con rostros tallados ----
    // Escalones de piedra (abajo)
    rect(c, 0, 22, 46, 5, OL);
    rect(c, 1, 23, 44, 3, STONE);
    rect(c, 1, 23, 44, 1, STONE_L);
    rect(c, 1, 25, 44, 1, STONE_D);
    for (let x = 8; x < 44; x += 11) px(c, x, 24, STONE_D); // juntas
    rect(c, 3, 20, 40, 3, OL);
    rect(c, 4, 21, 38, 2, STONE_L);
    rect(c, 4, 22, 38, 1, STONE);
    // Cuerpo del altar
    rect(c, 2, 11, 42, 10, OL);
    rect(c, 3, 12, 40, 8, STONE);
    rect(c, 3, 19, 40, 1, STONE_D);
    // Pilares entre los rostros
    [3, 15, 29, 41].forEach((px0) => {
      const w = px0 === 3 || px0 === 41 ? 2 : 3;
      rect(c, px0, 12, w, 8, STONE_L);
      rect(c, px0 + w - 1, 12, 1, 8, STONE_D);
      px(c, px0, 14, STONE);
      px(c, px0, 17, STONE);
    });
    // Tres rostros tallados con mueca
    [
      [9, 5, 8],
      [22, 18, 8],
      [36, 32, 8],
    ].forEach(([cx, x0, w]) => {
      rect(c, x0, 12, w + 1, 8, OL);
      rect(c, x0 + 1, 13, w - 1, 6, STONE_D);
      rect(c, cx - 3, 13, 7, 1, STONE); // frente
      rect(c, cx - 3, 14, 2, 1, STONE_L); // cejas
      rect(c, cx + 2, 14, 2, 1, STONE_L);
      rect(c, cx - 3, 15, 2, 1, OL); // ojos
      rect(c, cx + 2, 15, 2, 1, OL);
      px(c, cx, 15, STONE);
      px(c, cx, 16, STONE_L); // nariz
      rect(c, cx - 3, 17, 7, 2, OL); // boca
      for (let t = -2; t <= 2; t += 2) px(c, cx + t, 17, "#d8d8c8"); // dientes
      px(c, cx - 1, 18, "#d8d8c8");
      px(c, cx + 1, 18, "#d8d8c8");
    });
    // Losa superior (plancha plana)
    rect(c, 0, 7, 46, 5, OL);
    rect(c, 1, 8, 44, 3, STONE_L);
    rect(c, 1, 8, 44, 1, "#c4c4b6");
    rect(c, 1, 10, 44, 1, STONE);
    rect(c, 1, 11, 44, 1, STONE_D);
    px(c, 14, 9, STONE);
    px(c, 33, 9, STONE);
    px(c, 34, 10, STONE_D);
    px(c, 20, 10, STONE_D);
    // Musgo y grietas
    px(c, 1, 22, MOSS);
    px(c, 2, 22, MOSS_L);
    px(c, 44, 22, MOSS);
    px(c, 43, 21, MOSS_L);
    px(c, 14, 21, MOSS);
    px(c, 28, 20, STONE_D);
    px(c, 29, 19, STONE_D);

    // ---- El novio, acostado de espaldas sobre el petate (cabeza a la izquierda) ----

    // Piernas (pantalón con pliegues y rodilla)
    box(24, 3, 15, 7, PANTS);
    rect(c, 24, 3, 15, 1, PANTS_L);
    rect(c, 24, 8, 15, 2, PANTS_D);
    px(c, 30, 5, PANTS_D);
    px(c, 31, 6, PANTS_D);
    px(c, 32, 5, PANTS_D);
    rect(c, 31, 3, 3, 1, "#c08a5c"); // rodilla
    px(c, 27, 6, PANTS_D);
    px(c, 28, 7, PANTS_D);
    // Parche en el pantalón
    rect(c, 35, 5, 2, 2, "#b3875a");
    px(c, 35, 5, PANTS_D);

    // Huaraches (con tirantes) y dedos
    box(39, 2, 5, 8, SOLE);
    rect(c, 40, 2, 3, 3, SKIN); // dedos
    px(c, 40, 2, SKIN_L);
    px(c, 42, 2, SKIN_D);
    rect(c, 39, 5, 5, 1, STRAP);
    rect(c, 39, 7, 5, 1, STRAP);
    rect(c, 40, 8, 4, 1, "#5c3a1c");

    // Torso: guayabera clara con cuello, pliegues, bolsillos y botones
    box(11, 0, 14, 10, SHIRT);
    rect(c, 11, 0, 14, 1, "#fffaf0");
    rect(c, 11, 8, 14, 2, SHIRT_D);
    [16, 22].forEach((x) => rect(c, x, 2, 1, 6, SHIRT_D)); // alforzas
    rect(c, 13, 3, 3, 3, SHIRT_D); // bolsillo
    rect(c, 14, 3, 2, 2, SHIRT);
    rect(c, 20, 3, 3, 3, SHIRT_D);
    rect(c, 21, 3, 2, 2, SHIRT);
    px(c, 17, 2, "#8a7a52"); // botones
    px(c, 17, 5, "#8a7a52");
    px(c, 17, 8, "#8a7a52");
    // Cuello en V
    rect(c, 11, 1, 2, 3, SKIN_D);
    px(c, 11, 2, SKIN);
    px(c, 12, 0, "#fffaf0");
    px(c, 12, 4, SHIRT_DD);
    // Cinturón con hebilla
    rect(c, 22, 8, 3, 2, "#4a2d16");
    px(c, 23, 8, "#f2c13d");
    px(c, 23, 9, "#c9971e");
    // Manchas de suciedad
    px(c, 14, 7, SHIRT_DD);

    // Cabeza (hacia arriba): cuello, cara, oreja y nariz. El pelo va a la IZQUIERDA.
    rect(c, 10, 6, 3, 3, SKIN_D); // cuello
    box(1, -1, 11, 10, SKIN);
    rect(c, 1, 7, 11, 2, SKIN_D); // sombra de la mandíbula
    rect(c, 6, 0, 5, 1, SKIN_L); // frente
    rect(c, 10, 3, 2, 3, SKIN_D); // oreja
    px(c, 11, 4, "#a8704c");
    px(c, 8, 5, SKIN_D); // nariz
    px(c, 7, 6, SKIN_D);
    px(c, 9, 6, SKIN_D);
    px(c, 8, 4, SKIN_L);

    // Pelo: solo en el lado izquierdo de la cabeza (dentro del contorno de la cara)
    rect(c, 1, -1, 5, 9, HAIR);
    rect(c, 5, -1, 1, 3, HAIR); // hacia la frente
    rect(c, 5, 6, 1, 2, HAIR); // hacia la nuca
    pline(c, 2, 0, 2, 6, HAIR_L, 1);
    px(c, 4, 1, HAIR_L);
    px(c, 4, 4, HAIR_L);
    px(c, 3, 6, HAIR_L);
    px(c, 3, 7, "#1a0f0a");
    px(c, 4, 3, "#1a0f0a");

    if (freed) {
      // Cejas relajadas y ojos abiertos (con brillo)
      rect(c, 7, 1, 2, 1, HAIR);
      rect(c, 10, 1, 1, 1, HAIR);
      rect(c, 7, 2, 2, 2, "#ffffff");
      rect(c, 10, 2, 1, 2, "#ffffff");
      px(c, 8, 2, "#2a1a10");
      px(c, 8, 3, "#2a1a10");
      px(c, 10, 3, "#2a1a10");
      px(c, 7, 2, "#9a6a40");
      // Mejillas sonrojadas
      px(c, 7, 5, "#ee8f8f");
      px(c, 8, 5, "#ee8f8f");
      // Sonrisa con dientes
      rect(c, 7, 7, 4, 1, "#ffffff");
      px(c, 6, 6, "#8a4a3a");
      px(c, 11, 6, "#8a4a3a");
      rect(c, 7, 8, 4, 1, "#8a4a3a");

      // Una mano libre saluda: antebrazo en alto con manga y mano abierta
      box(16, -1, 3, 5, SHIRT_D);
      rect(c, 16, 3, 3, 1, SHIRT);
      rect(c, 14, -5, 7, 5, OL);
      rect(c, 15, -4, 5, 3, SKIN);
      rect(c, 15, -7, 1, 3, SKIN); // dedos
      rect(c, 17, -8, 1, 4, SKIN);
      rect(c, 19, -7, 1, 3, SKIN);
      rect(c, 14, -3, 1, 2, SKIN); // pulgar
      px(c, 15, -8, OL);
      px(c, 17, -9, OL);
      px(c, 19, -8, OL);
      px(c, 16, -3, SKIN_L);
      px(c, 18, -2, SKIN_D);
      // Cuerdas cortadas sobre el petate
      pline(c, 26, 9, 31, 8, ROPE, 1);
      px(c, 29, 8, ROPE_L);
      pline(c, 36, 10, 44, 10, ROPE, 1);
      px(c, 40, 10, ROPE_D);
      px(c, 6, 9, ROPE);
      px(c, 7, 10, ROPE_D);
      // Corazoncito flotando
      rect(c, 29, -6, 2, 2, "#f72585");
      rect(c, 32, -6, 2, 2, "#f72585");
      rect(c, 29, -5, 5, 2, "#f72585");
      rect(c, 30, -3, 3, 1, "#f72585");
      px(c, 31, -2, "#f72585");
      px(c, 30, -6, "#ff8fc0");
    } else {
      // Cejas fruncidas y ojos cerrados (con pestañas)
      rect(c, 7, 1, 2, 1, HAIR);
      rect(c, 10, 1, 1, 1, HAIR);
      px(c, 9, 2, HAIR);
      rect(c, 7, 3, 2, 1, OL);
      rect(c, 10, 3, 1, 1, OL);
      px(c, 7, 4, SKIN_D);
      // Moretón y rasguño en la cara
      px(c, 7, 5, "#9a6a8a");
      px(c, 8, 5, "#8a5a7a");
      pline(c, 9, 4, 10, 5, "#a8453a", 1);
      // Gota de sudor
      px(c, 7, -2, "#bfe6ff");
      px(c, 7, -1, "#8fd0f5");
      // Mordaza de tela con nudo y cabos
      rect(c, 5, 6, 7, 2, OL);
      rect(c, 6, 6, 5, 2, CLOTH);
      rect(c, 6, 7, 5, 1, CLOTH_D);
      px(c, 7, 6, "#ffffff");
      rect(c, 11, 5, 3, 3, OL);
      rect(c, 11, 6, 2, 2, CLOTH_D); // nudo
      px(c, 12, 5, CLOTH);
      pline(c, 12, 8, 10, 10, CLOTH_D, 1); // cabos colgando
      px(c, 13, 8, CLOTH);

      // Brazos amarrados al frente: manga + antebrazo + muñecas con nudo
      rect(c, 12, 5, 9, 4, SHIRT_D);
      rect(c, 12, 5, 9, 1, SHIRT);
      rect(c, 21, 5, 5, 4, SKIN);
      rect(c, 21, 8, 5, 1, SKIN_D);
      px(c, 22, 5, SKIN_L);
      rect(c, 25, 5, 2, 4, SKIN_D); // manos juntas
      px(c, 25, 5, SKIN);

      // Cuerdas: muñecas, pecho (en X con nudo) y tobillos
      rect(c, 21, 4, 4, 6, ROPE_D);
      rect(c, 22, 4, 2, 6, ROPE);
      px(c, 22, 4, ROPE_L);
      px(c, 22, 6, ROPE_D);
      px(c, 23, 8, ROPE_D);
      pline(c, 13, 1, 24, 8, ROPE_D, 2); // cuerda en diagonal por el pecho
      pline(c, 13, 1, 24, 8, ROPE, 1);
      rect(c, 17, 4, 3, 3, ROPE_D); // nudo central
      px(c, 18, 5, ROPE_L);
      rect(c, 36, 3, 4, 7, ROPE_D); // tobillos amarrados
      rect(c, 37, 3, 2, 7, ROPE);
      px(c, 37, 3, ROPE_L);
      px(c, 37, 6, ROPE_D);
      px(c, 38, 8, ROPE_D);
      // Cabos de la cuerda atados al altar, a los lados
      pline(c, 14, 8, 6, 10, ROPE_D, 1);
      pline(c, 26, 9, 12, 12, ROPE_D, 1);
      pline(c, 37, 9, 43, 11, ROPE_D, 1);
      px(c, 6, 10, ROPE);
      px(c, 43, 11, ROPE);
    }
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

// Sprite de la espada (en vertical, apoyada en el suelo), dibujada con píxeles
function makeSwordSprite() {
  // Macuahuitl: la espada maya, una paleta de madera con filos de obsidiana
  return sprite(24, 36, 12, 34, (c) => {
    const D = "#2a1608"; // contorno
    const W1 = "#d9a05b"; // madera clara
    const W2 = "#b5793a"; // madera
    const W3 = "#7a4a1e"; // madera sombra
    const OB = "#16162b"; // obsidiana
    const OH = "#7b7bc4"; // brillo de la obsidiana
    const JD = "#2ec4b6"; // jade
    const RD = "#c1121f"; // cordón rojo
    // Paleta de madera con la punta redondeada
    rect(c, 10, 1, 4, 1, D);
    rect(c, 9, 2, 6, 1, D);
    rect(c, 8, 3, 8, 21, D);
    rect(c, 10, 2, 4, 1, W1);
    rect(c, 9, 3, 6, 21, W2);
    rect(c, 9, 3, 2, 21, W1); // luz
    rect(c, 14, 3, 1, 21, W3); // sombra
    rect(c, 12, 5, 1, 17, W3); // veta
    // Filos de obsidiana: dientes en ambos bordes
    for (let y = 4; y < 23; y += 3) {
      rect(c, 6, y, 2, 2, D);
      rect(c, 7, y, 1, 2, OB);
      px(c, 7, y, OH);
      rect(c, 16, y, 2, 2, D);
      rect(c, 16, y, 1, 2, OB);
      px(c, 16, y, OH);
    }
    // Empuñadura envuelta con cordón rojo y bandas de jade
    rect(c, 9, 24, 6, 9, D);
    rect(c, 10, 24, 4, 9, W3);
    for (let y = 25; y < 32; y += 2)
      rect(c, 10, y, 4, 1, y % 4 === 1 ? RD : "#ff6b6b");
    rect(c, 9, 23, 6, 1, JD); // banda de jade
    rect(c, 9, 24, 6, 1, D);
    // Pomo de jade con plumas
    rect(c, 8, 33, 8, 3, D);
    rect(c, 9, 33, 6, 2, JD);
    rect(c, 10, 33, 2, 1, "#b8fff2");
    px(c, 7, 34, RD);
    px(c, 16, 34, RD);
  });
}

// Sprite del checkpoint: poste de metal con farol y bandera sobre una base de concreto.
// Apagado = rojo/gris; encendido (ya pisado) = verde brillante
function makeCheckpointSprite(on) {
  return sprite(24, 44, 12, 40, (c) => {
    ellipse(c, 12, 40, 9, 3, "rgba(0,0,0,0.3)");
    // base de concreto
    rect(c, 5, 35, 14, 6, "#3b3b3b");
    rect(c, 6, 36, 12, 4, "#8e8e8b");
    rect(c, 6, 36, 12, 1, "#c0c0bb");
    // poste
    rect(c, 11, 11, 2, 25, "#3b3b3b");
    rect(c, 11, 11, 1, 25, "#9aa0a6");
    // bandera
    rect(c, 13, 15, 9, 6, "#2b2b2b");
    rect(c, 13, 16, 8, 4, on ? "#52b788" : "#c9184a");
    rect(c, 13, 19, 8, 1, on ? "#2d8a5e" : "#8f1236");
    // farol
    rect(c, 6, 2, 12, 2, "#2b2b2b");
    rect(c, 9, 0, 6, 2, "#2b2b2b");
    rect(c, 7, 4, 10, 8, "#2b2b2b");
    rect(c, 8, 5, 8, 6, on ? "#7dffb0" : "#5a5f66");
    if (on) rect(c, 9, 6, 3, 3, "#eafff2");
    rect(c, 6, 12, 12, 1, "#2b2b2b");
  });
}

// Sprite del letrero: poste de madera con un tablón de cartel encima
function makeSignSprite() {
  return sprite(22, 30, 11, 28, (c) => {
    ellipse(c, 11, 28, 8, 3, "rgba(0,0,0,0.3)");
    // poste
    rect(c, 9, 10, 4, 18, "#6b4423");
    rect(c, 9, 10, 1, 18, "#8a5a33");
    rect(c, 12, 10, 1, 18, "#4a2d16");
    // tablón del letrero
    rect(c, 1, 0, 20, 12, "#5c3a1e");
    rect(c, 2, 1, 18, 10, "#a9733f");
    rect(c, 2, 1, 18, 1, "#c08a52");
    // clavos en las esquinas
    rect(c, 3, 2, 2, 2, "#3d2410");
    rect(c, 17, 2, 2, 2, "#3d2410");
    rect(c, 3, 8, 2, 2, "#3d2410");
    rect(c, 17, 8, 2, 2, "#3d2410");
    // líneas grabadas (sugieren texto)
    rect(c, 5, 4, 12, 1, "#5c3a1e");
    rect(c, 5, 6, 9, 1, "#5c3a1e");
  });
}

// Imagen del recuerdo "¡Lo rescataste!" (se dibuja en un canvas, sin depender
// de ninguna foto): el novio ya liberado, sobre un fondo cálido con corazones.
function makeNovioCardImage() {
  const W = 160;
  const H = 120;
  const cv = makeCanvas(W, H);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#5c2a3a");
  g.addColorStop(1, "#c0617a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const heart = (hx, hy, s, color) => {
    c.fillStyle = color;
    c.fillRect(hx - s, hy - s, s, s);
    c.fillRect(hx + 1, hy - s, s, s);
    c.fillRect(hx - s, hy, 2 * s + 1, s);
    c.fillRect(hx - Math.round(s / 2), hy + s, s + 1, Math.round(s / 2));
  };
  [
    [20, 20, 3],
    [138, 26, 2],
    [26, 96, 2],
    [132, 92, 3],
    [80, 14, 2],
  ].forEach(([hx, hy, s]) => heart(hx, hy, s, "rgba(255,214,102,0.55)"));
  const nw = SP.novio[1].cv.width;
  const nh = SP.novio[1].cv.height;
  const k = 3;
  c.drawImage(
    SP.novio[1].cv,
    0,
    0,
    nw,
    nh,
    (W - nw * k) / 2,
    (H - nh * k) / 2,
    nw * k,
    nh * k,
  );
  return cv.toDataURL("image/png");
}

// Sprite del boomerang (en forma de V, de madera con vetas); 16x16
function makeBoomerangSprite() {
  return sprite(16, 16, 8, 14, (c) => {
    const D = "#4a2b12";
    const M = "#e0b070";
    const L = "#f5d596";
    const S = "#a8723a";
    // Brazo izquierdo (sube a la izquierda) y brazo derecho (sube a la derecha)
    const arm = [
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ];
    arm.forEach(([x, y]) => {
      rect(c, x - 1, y - 1, 3, 3, D);
    });
    arm.forEach(([x, y]) => {
      rect(c, x, y, 1, 1, M);
    });
    [
      [8, 8],
      [9, 7],
      [10, 6],
      [11, 5],
      [12, 4],
      [13, 3],
    ].forEach(([x, y]) => {
      rect(c, x - 1, y - 1, 3, 3, D);
    });
    [
      [8, 8],
      [9, 7],
      [10, 6],
      [11, 5],
      [12, 4],
      [13, 3],
    ].forEach(([x, y]) => {
      rect(c, x, y, 1, 1, M);
    });
    // Codo
    rect(c, 6, 8, 4, 3, D);
    rect(c, 7, 8, 2, 2, M);
    // Brillos y vetas
    rect(c, 3, 3, 1, 1, L);
    rect(c, 12, 3, 1, 1, L);
    rect(c, 8, 8, 1, 1, L);
    rect(c, 5, 6, 1, 1, S);
    rect(c, 10, 6, 1, 1, S);
    rect(c, 7, 10, 2, 1, S);
  });
}

/* ---------- Red con pesas (atrapa a los NPC hostiles) ---------- */
// Malla sostenida por sus 4 esquinas (una pesa en cada una): los 4 lados se
// hunden hacia el centro, como una hamaca tensada. rows/cols = cuántos hilos
// lleva la malla (más = más tupida, para cuando ya está bien abierta).
function drawNetMesh(c, cx, cy, hw, hh, sag, rows, cols) {
  const ROPE = "#6b2a1d";
  const EDGE = "#8a3f26";
  const WEIGHT = "#241022";
  const x0 = cx - hw,
    x1 = cx + hw;
  const y0 = cy - hh,
    y1 = cy + hh;
  // Bézier cuadrática: el lado es recto en sus 2 extremos (las esquinas, donde
  // van las pesas) y se arquea "sag" px hacia el centro a la mitad del camino
  const bez = (ax, ay, mx, my, bx, by, t) => {
    const u = 1 - t;
    return [
      u * u * ax + 2 * u * t * mx + t * t * bx,
      u * u * ay + 2 * u * t * my + t * t * by,
    ];
  };
  const topAt = (t) => bez(x0, y0, cx, y0 + sag, x1, y0, t);
  const botAt = (t) => bez(x0, y1, cx, y1 - sag, x1, y1, t);
  const leftAt = (t) => bez(x0, y0, x0 + sag, cy, x0, y1, t);
  const rightAt = (t) => bez(x1, y0, x1 - sag, cy, x1, y1, t);

  // Dibuja cada lado curvo (muestreado en segmentos rectos)
  const curve = (fn) => {
    const N = 10;
    let prev = fn(0);
    for (let s = 1; s <= N; s++) {
      const p = fn(s / N);
      pline(c, prev[0], prev[1], p[0], p[1], EDGE);
      prev = p;
    }
  };
  curve(topAt);
  curve(botAt);
  curve(leftAt);
  curve(rightAt);

  // Hilos interiores: de un punto del lado izquierdo al del lado derecho
  // (horizontales) y de uno de arriba al de abajo (verticales)
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    const [lx, ly] = leftAt(t);
    const [rx, ry] = rightAt(t);
    pline(c, lx, ly, rx, ry, ROPE);
  }
  for (let j = 1; j < cols; j++) {
    const t = j / cols;
    const [tx, ty] = topAt(t);
    const [bx, by] = botAt(t);
    pline(c, tx, ty, bx, by, ROPE);
  }

  // Pesas en las 4 esquinas
  [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ].forEach(([x, y]) => disc(c, x, y, 3, WEIGHT));
}

// Fase 1: comprimida, como un atado cerrado con un cordón (las pesas asoman abajo)
function makeRedBundle() {
  return sprite(18, 20, 9, 18, (c) => {
    ellipse(c, 9, 13, 7, 7, "#8a6a3a");
    ellipse(c, 9, 13, 5, 5, "#6b4a2a");
    rect(c, 6, 4, 6, 3, "#4a3118");
    disc(c, 4, 18, 2, "#241022");
    disc(c, 14, 18, 2, "#241022");
  });
}

// Fase 2: a medio abrir (misma forma que la abierta, pero más chica y menos tupida)
function makeRedMid() {
  return sprite(56, 50, 28, 25, (c) => drawNetMesh(c, 28, 25, 22, 19, 9, 4, 4));
}

// Fase 3: abierta del todo; a propósito un poco más grande (en área) que el
// kaskabal (el hostil más grande, sprite de 64x72), así se ve bien sobre
// cualquier NPC hostil que atrape.
function makeRedOpen() {
  return sprite(92, 80, 46, 40, (c) =>
    drawNetMesh(c, 46, 40, RED_OPEN_HW, RED_OPEN_HH, 16, 6, 6),
  );
}

function buildRedSprites() {
  return { closed: makeRedBundle(), mid: makeRedMid(), open: makeRedOpen() };
}

// Imagen del recuerdo "¡Encontraste la red!" (se dibuja en un canvas)
function makeRedCardImage() {
  const W = 160;
  const H = 120;
  const cv = makeCanvas(W, H);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1b3a2a");
  g.addColorStop(1, "#5a6a2a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const spr = SP.red.open;
  const k = 1.3;
  c.drawImage(
    spr.cv,
    0,
    0,
    spr.cv.width,
    spr.cv.height,
    (W - spr.cv.width * k) / 2,
    (H - spr.cv.height * k) / 2 + 6,
    spr.cv.width * k,
    spr.cv.height * k,
  );
  return cv.toDataURL("image/png");
}

// Imagen del recuerdo "¡Encontraste el boomerang!" (se dibuja en un canvas)
function makeBoomerangCardImage() {
  const W = 160;
  const H = 120;
  const cv = makeCanvas(W, H);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2b1d49");
  g.addColorStop(1, "#8c5a3a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.save();
  c.translate(W / 2, H / 2);
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 6);
    c.fillStyle = "rgba(255,226,138,0.14)";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-12, -110);
    c.lineTo(12, -110);
    c.closePath();
    c.fill();
  }
  c.restore();
  // Estela circular del vuelo
  c.strokeStyle = "rgba(255,246,200,0.5)";
  c.lineWidth = 2;
  c.setLineDash([6, 5]);
  c.beginPath();
  c.arc(W / 2, H / 2, 46, 0.3, Math.PI * 1.6);
  c.stroke();
  c.setLineDash([]);
  const k = 5;
  c.drawImage(
    SP.boomerang.cv,
    0,
    0,
    16,
    16,
    (W - 16 * k) / 2,
    (H - 16 * k) / 2,
    16 * k,
    16 * k,
  );
  return cv.toDataURL("image/png");
}

// Imagen del recuerdo "¡Encontraste la espada!" (se dibuja en un canvas)
function makeSwordCardImage() {
  const W = 160;
  const H = 120;
  const cv = makeCanvas(W, H);
  const c = cv.getContext("2d");
  c.imageSmoothingEnabled = false;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1b2a49");
  g.addColorStop(1, "#3a5a8c");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // Rayos de luz detrás de la espada
  c.save();
  c.translate(W / 2, H / 2);
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 6);
    c.fillStyle = "rgba(255,226,138,0.14)";
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-12, -110);
    c.lineTo(12, -110);
    c.closePath();
    c.fill();
  }
  c.restore();
  // Chispas
  [
    [24, 22],
    [132, 30],
    [40, 92],
    [122, 88],
    [76, 10],
  ].forEach(([x, y]) => {
    c.fillStyle = "#fff6c8";
    c.fillRect(x, y - 3, 2, 7);
    c.fillRect(x - 2, y, 6, 2);
  });
  const k = 3;
  c.drawImage(
    SP.sword.cv,
    0,
    0,
    24,
    36,
    (W - 24 * k) / 2,
    (H - 36 * k) / 2,
    24 * k,
    36 * k,
  );
  return cv.toDataURL("image/png");
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
    const g = ["#0b3012", "#144a20", "#226b2d", "#409644", "#8cc96e"];
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
  // (puntas redondeadas y romas, como un bote de remos, en vez de terminar en
  // punta afilada como una canoa)
  const prof = (x) => {
    const u = (x - CX) / RX;
    if (Math.abs(u) > 1) return null;
    const taper = Math.sqrt(1 - u * u);
    // La borda no baja hasta 0 en los extremos: se queda con una altura
    // mínima para que la punta termine redondeada en vez de afilada.
    const hh = RY * (0.4 + 0.6 * taper) * (u > 0 ? 1 - 0.18 * u : 1);
    return { u, yc: CY - Math.round(1.2 * u * u), hh };
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
    // proa y popa: apenas levantadas (bote de remos, no canoa)
    px(c, CX + RX, CY - 1, woodD);
    px(c, CX + RX - 1, CY - 1, woodL);
    px(c, CX - RX, CY - 1, woodD);
    px(c, CX - RX + 1, CY - 1, woodL);
    // cuerda enrollada en la proa
    rect(c, CX + 12, CY + 2, 3, 2, "#d8c8a0");
    px(c, CX + 13, CY + 2, "#a8946a");
  });

  return { back, front };
}

// Bote visto de punta (de proa o de popa), para cuando navega hacia arriba o
// hacia abajo en pantalla. Clave: en esta proyección isométrica, el eje
// "arriba/abajo" en pantalla está DOS VECES más comprimido que el eje
// "izquierda/derecha" (TILE_H es la mitad de TILE_W), así que el bote visto
// por la punta se ve corto y ancho (el largo se acorta mucho, la manga casi
// no se comprime) — por eso antes salía un palo largo y parado en vez de una
// canoa. bowNear indica si la proa (con la cuerda enrollada) es la punta
// cercana (el bote viene hacia la cámara) o la lejana (se aleja).
function makeBoatEnd(bowNear) {
  const W = 30;
  const H = 24;
  const CX = 15;
  const CY = 12;
  const RY = 9; // mitad del largo, ya acortado por la perspectiva
  const woodD = "#3a2210";
  const woodM = "#8a5a2e";
  const woodL = "#b9824a";
  const woodH = "#e0b070";
  const inner = "#6b4423";
  const innerD = "#4a2c14";

  // Perfil a lo largo: angosto (pero romo, no en punta) en los dos extremos y
  // panzón a la mitad, como el bote de lado pero girado; además un poco más
  // angosto del lado lejano, para dar algo de profundidad.
  const prof = (y) => {
    const u = (y - CY) / RY;
    if (Math.abs(u) > 1) return null;
    const taper = Math.sqrt(1 - u * u); // 0 en las puntas, 1 a la mitad
    const t = bowNear ? (u + 1) / 2 : (1 - u) / 2; // 0 = lejos, 1 = cerca
    const persp = 0.75 + 0.25 * t;
    const hw = Math.max(2, Math.round((4 + 8 * taper) * persp));
    return hw;
  };

  const y0 = Math.round(CY - RY);
  const y1 = Math.round(CY + RY);

  const back = sprite(W, H, CX, CY, (c) => {
    // Sombra: la misma silueta del casco (angosta-ancha-angosta), corrida
    // unos píxeles hacia abajo, en vez de un solo borrón en una punta
    // (eso era lo que hacía parecer que el bote estaba "parado").
    c.fillStyle = "rgba(0,30,70,0.28)";
    for (let y = y0; y <= y1; y++) {
      const hw = prof(y);
      if (hw === null) continue;
      const shw = Math.max(1, Math.round(hw * 0.85));
      c.fillRect(CX - shw, y + 5, shw * 2 + 1, 1);
    }
    for (let y = y0; y <= y1; y++) {
      const hw = prof(y);
      if (hw === null) continue;
      for (let x = -hw; x <= hw; x++) {
        let col = inner;
        if (x === -hw || x === hw) col = woodD;
        else if (x === -hw + 1 || x === hw - 1) col = woodL;
        else if ((x + y) % 5 === 0) col = innerD;
        px(c, CX + x, y, col);
      }
    }
    // una banca de madera cruzada a la mitad
    const hw = Math.max(2, prof(CY) - 2);
    rect(c, CX - hw, CY, hw * 2, 2, woodM);
    rect(c, CX - hw, CY, hw * 2, 1, woodH);
  });

  const front = sprite(W, H, CX, CY, (c) => {
    for (let y = y0; y <= y1; y++) {
      const hw = prof(y);
      if (hw === null) continue;
      px(c, CX + hw, y, woodH);
      px(c, CX + hw + 1, y, woodM);
    }
    // las dos puntas (proa y popa), apenas levantadas; bowY es la que
    // corresponde a la proa (abajo si el bote viene hacia la cámara,
    // arriba si se aleja)
    px(c, CX, y0, woodD);
    px(c, CX, y1, woodD);
    const bowY = bowNear ? y1 : y0;
    px(c, CX - 1, bowY, woodL);
    px(c, CX + 1, bowY, woodL);
    // cuerda enrollada junto a la proa, hacia el centro del bote
    const ropeY = bowNear ? bowY - 4 : bowY + 4;
    rect(c, CX - 2, ropeY, 4, 3, "#d8c8a0");
    px(c, CX - 1, ropeY + 1, "#a8946a");
  });

  return { back, front };
}

function buildSprites() {
  SP.ceiba = makeCeiba();
  SP.mangle = makeMangle();
  SP.despeinada = makeDespeinada();
  SP.makulis = makeMakulis();
  SP.chaka = makeChaka();
  SP.balche = makeBalche();
  SP.guanacaste = makeGuanacaste();
  SP.flamboyan = makeFlamboyan();
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
    start: [0, 1, 2].map((v) => makeLogSlice(false, v, true)),
    single: [0, 1, 2].map((v) => makeLogSlice(true, v, true)),
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
  if (HUAYCHIVO_SCALE !== 1) {
    const k = HUAYCHIVO_SCALE;
    SP.huaychivo.stand = scaleSprite(SP.huaychivo.stand, k);
    SP.huaychivo.idle = scaleSprite(SP.huaychivo.idle, k);
    SP.huaychivo.walk = SP.huaychivo.walk.map((q) => scaleSprite(q, k));
    SP.huaychivo.wind = scaleSprite(SP.huaychivo.wind, k);
    SP.huaychivo.hit = scaleSprite(SP.huaychivo.hit, k);
  }
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
  SP.novio = [makeNovio(false), makeNovio(true)];
  SP.pyramid = makePyramid();
  SP.stoneBlock = makeStoneBlock();
  SP.cathedral = makeCathedral();
  SP.houses = Array.from({ length: HOUSE_VARIANTS }, (_, v) => makeHouse(v));
  SP.mayaHouses = [0, 1, 2].map(makeMayaHouse);
  SP.ruins = [0, 1, 2].map(makeRuin);
  SP.lighthouse = makeLighthouse();
  SP.crop = makeCropPatch();
  SP.boat = makeBoat();
  // Vistas de punta, para cuando el bote navega hacia arriba (popa cerca,
  // se aleja) o hacia abajo (proa cerca, viene hacia la cámara)
  SP.boat.up = makeBoatEnd(false);
  SP.boat.down = makeBoatEnd(true);
  SP.monteGrass = [0, 1, 2, 3].map(makeMonteGrass);
  SP.sword = makeSwordSprite();
  SP.boomerang = makeBoomerangSprite();
  SP.red = buildRedSprites();
  SP.checkpoint = [makeCheckpointSprite(false), makeCheckpointSprite(true)];
  SP.sign = makeSignSprite();
  SP.collect = {};
  COLLECT_DEFS.forEach(
    (d) => (SP.collect[d.type] = makeCollectSprite(d.sprite, d.keyWhite)),
  );
}
