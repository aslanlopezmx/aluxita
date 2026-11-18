"use strict";

function resizeCanvas() {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return;
  const aspect = cw / ch;
  const k = ZOOMS[zoomIdx].k;
  let w;
  let h;
  if (aspect >= 280 / 240) {
    h = 240 * k; // pantallas anchas: misma altura de siempre, más mundo a los lados
    w = h * aspect;
  } else {
    w = 280 * k; // pantallas altas (celular vertical): ancho mínimo, más mundo arriba y abajo
    h = w / aspect;
  }
  // Tope de tamaño conservando la proporción (así la imagen nunca se deforma)
  const MAXD = 600;
  const cap = Math.min(1, MAXD / Math.max(w, h));
  w = Math.round(w * cap);
  h = Math.round(h * cap);
  if (w === VIEW_W && h === VIEW_H) return;
  VIEW_W = w;
  VIEW_H = h;
  canvas.width = w; // al cambiar el tamaño se reinicia el contexto
  canvas.height = h;
  ctx.imageSmoothingEnabled = false;
  if (typeof snapCamera === "function") snapCamera();
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

function snapCamera() {
  camera.x = WX0 + (player.gx - player.gy) * HW - VIEW_W / 2 + look.x;
  camera.y =
    WY0 + (player.gx + player.gy) * HH - player.h * U - VIEW_H / 2 + 8 + look.y;
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
function drawPlayerFront(x, y, now, onBoat) {
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

  // Aspecto inspirado en la foto de referencia: cabello largo, ondulado y brillante
  // en tonos castaños con luces caramelo, raya al lado con un mechón sobre la cara,
  // lentes ovalados de carey (naranja con manchas oscuras) y cristal café, ojos verde
  // miel y labios color durazno. Vestimenta: blusa verde, pantalón caqui y botas cafés.
  const SKIN = "#f1c8a8";
  const SKIN_D = "#d6a07c";
  const SKIN_L = "#fbe0c8";
  const TOP = "#f7f1e4";
  const TOP_D = "#d9cfba";
  const CREAM = "#f6efdc";
  const CREAM_D = "#d8ccb0";
  const RED = "#c1272d";
  const GREEN = "#2e8b57";
  const JADE = "#2fbf71";
  const BROWN = "#8a5a2e";
  const BROWN_D = "#5e3a1a";
  const HR = ["#22130c", "#3d2416", "#5e3a22", "#8a5a34", "#b98652"]; // oscuro → luz caramelo
  const FR = "#b4501e"; // armazón de carey
  const FR_D = "#5a2410"; // manchas del carey
  const LENS = "#6e2a1a"; // cristal café rojizo
  const LENS_L = "#c0704a"; // reflejo
  const EYE = "#86a04e"; // verde miel
  const LIP = "#d98c7a";
  const LIP_L = "#eeaa98";

  // Ondas del cabello: se mecen al caminar
  const sway = player.moving && !onBoat ? (player.step >> 3) & 1 : 0;
  const WV = [0, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1];
  const wv = (r) => WV[(r + (sway ? 2 : 0)) % WV.length];
  const hairTone = (xx, yy, eL, eR) => {
    const u = (xx - eL) / (eR - eL + 1);
    let t = u < 0.22 ? 3 : u < 0.62 ? 2 : 1; // luz a la izquierda
    const k = (xx + yy + wv(yy)) % 5; // mechones ondulados y brillantes
    if (k === 0 && u < 0.8) t = Math.min(4, t + 1);
    else if (k === 3) t = Math.max(0, t - 1);
    return HR[t];
  };

  // pantalón caqui (piernas) y botas cafés
  const KH = "#c8b88a";
  const KH_D = "#a89868";
  const KH_L = "#dccfa2";
  const BT = "#7a4a26";
  const BT_D = "#42240f";
  const BT_L = "#a06a38";
  const stepping = player.moving && !onBoat;
  const liftL = air ? 1 : stepping ? 5 - legL : 0; // la pierna que se levanta al caminar
  const liftR = air ? 1 : stepping ? 5 - legR : 0;
  [
    [x - 4, liftL],
    [x + 1, liftR],
  ].forEach(([lx, lift]) => {
    const top = H - 5;
    const bootY = py - 3 - lift;
    const h = Math.max(0, bootY - top);
    rect(ctx, lx, top, 3, h, KH);
    rect(ctx, lx + 2, top, 1, h, KH_D);
    px(ctx, lx, top, KH_L);
    rect(ctx, lx, bootY, 3, 2, BT); // caña de la bota
    px(ctx, lx, bootY, BT_L);
    rect(ctx, lx - 1, bootY + 2, 5, 1, BT_D); // suela
    px(ctx, lx, bootY + 1, BT_L);
  });

  // cabello largo detrás del cuerpo (masa ondulada hasta el pecho)
  for (let r = 0; r < 16; r++) {
    const yy = H - 24 + r;
    const hw = r < 2 ? 4 : r < 4 ? 5 : 6;
    const w1 = r > 4 ? wv(r) : 0;
    const w2 = r > 4 ? -wv(r + 4) : 0;
    const eL = x - hw + w1;
    const eR = x + hw - 1 + w2;
    for (let xx = eL; xx <= eR; xx++) {
      if (r >= 14 && hash2(xx, r, 17) < 0.5) continue; // puntas
      px(ctx, xx, yy, hairTone(xx, yy, eL, eR));
    }
  }

  // cadera del pantalón caqui con cinturón café
  for (let i = 0; i < 5; i++) {
    const yy = H - 10 + i;
    for (let xx = -4; xx < 4; xx++) {
      let col = xx >= 2 ? KH_D : xx === -4 ? KH_L : KH;
      if (i === 0) col = xx >= 2 ? BROWN_D : BROWN; // cinturón
      px(ctx, x + xx, yy, col);
    }
  }
  px(ctx, x - 1, H - 10, "#d9b44a"); // hebilla del cinturón
  px(ctx, x, H - 8, KH_D); // bragueta
  px(ctx, x, H - 7, KH_D);
  px(ctx, x - 3, H - 8, KH_D); // bolsillos
  px(ctx, x + 2, H - 8, KH);

  // blusa verde con escote en V y mangas cortas
  const BL = "#3a8a3c";
  const BL_D = "#276a2c";
  const BL_L = "#5cab57";
  for (let j = 0; j < 6; j++) {
    for (let xx = -4; xx < 4; xx++) {
      px(ctx, x + xx, H - 16 + j, xx >= 2 ? BL_D : xx === -4 ? BL_L : BL);
    }
  }
  px(ctx, x - 1, H - 11, BL_D); // pliegue de la blusa
  px(ctx, x + 1, H - 12, BL_D);
  rect(ctx, x - 2, H - 16, 4, 1, SKIN); // cuello y escote en V
  rect(ctx, x - 1, H - 15, 2, 1, SKIN);
  px(ctx, x - 1, H - 15, SKIN_L);
  px(ctx, x - 2, H - 15, BL_L); // cuello de la blusa
  px(ctx, x + 1, H - 15, BL_D);

  // brazos: manga corta verde y pulsera de jade
  [-1, 1].forEach((d) => {
    const ax = d < 0 ? x - 6 : x + 4;
    rect(ctx, ax, H - 16, 2, 3, d < 0 ? BL : BL_D); // manga
    px(ctx, ax, H - 16, BL_L);
    rect(ctx, ax, H - 13, 2, 3, SKIN);
    px(ctx, d < 0 ? ax : ax + 1, H - 12, SKIN_D);
    rect(ctx, ax, H - 10, 2, 1, JADE);
  });

  // cuello y cabeza
  rect(ctx, x - 1, H - 17, 2, 2, SKIN_D);
  rect(ctx, x - 3, H - 23, 6, 6, SKIN);
  rect(ctx, x - 2, H - 17, 4, 1, SKIN);
  px(ctx, x + 2, H - 21, SKIN_D); // sombra del lado derecho
  px(ctx, x + 2, H - 20, SKIN_D);
  px(ctx, x - 2, H - 22, SKIN_L); // luz en la frente
  px(ctx, x - 3, H - 20, SKIN_L);

  // cabello sobre la frente: raya al lado y mechón sobre la cara
  rect(ctx, x - 4, H - 24, 8, 1, HR[1]);
  rect(ctx, x - 4, H - 23, 8, 1, HR[2]);
  px(ctx, x, H - 23, SKIN_L); // la raya
  px(ctx, x - 1, H - 23, HR[3]);
  px(ctx, x - 3, H - 24, HR[3]);
  px(ctx, x - 2, H - 24, HR[4]);
  px(ctx, x - 3, H - 22, HR[2]);
  px(ctx, x + 2, H - 22, HR[1]);
  px(ctx, x - 1, H - 22, HR[2]); // mechón que cae de la raya

  // ojos verde miel con pestañas
  px(ctx, x - 2, H - 22, EYE);
  px(ctx, x + 1, H - 22, EYE);
  px(ctx, x - 2, H - 23, HR[0]);
  px(ctx, x + 1, H - 23, HR[0]);

  // lentes ovalados de carey, un poco caídos sobre la nariz
  rect(ctx, x - 3, H - 21, 2, 1, FR); // marco superior
  rect(ctx, x + 1, H - 21, 2, 1, FR);
  px(ctx, x - 4, H - 20, FR); // aros laterales
  px(ctx, x + 3, H - 20, FR_D);
  rect(ctx, x - 3, H - 20, 2, 1, LENS);
  rect(ctx, x + 1, H - 20, 2, 1, LENS);
  px(ctx, f > 0 ? x - 3 : x + 2, H - 20, LENS_L); // reflejo
  px(ctx, x - 1, H - 20, FR_D); // puente
  px(ctx, x, H - 20, FR);
  rect(ctx, x - 3, H - 19, 2, 1, FR_D); // marco inferior
  rect(ctx, x + 1, H - 19, 2, 1, FR);
  px(ctx, x - 1, H - 19, SKIN_D); // nariz
  px(ctx, x, H - 19, SKIN_D);

  // labios color durazno
  px(ctx, x - 1, H - 18, LIP_L);
  px(ctx, x, H - 18, LIP);
  px(ctx, f > 0 ? x + 1 : x - 2, H - 18, SKIN_D); // mejilla

  // mechones largos al frente, sobre los hombros (enmarcan la cara y el escote)
  for (let r = 0; r < 15; r++) {
    const yy = H - 23 + r;
    const wl = r > 5 ? wv(r + 1) : 0;
    const wr = r > 5 ? -wv(r + 4) : 0;
    const tipL = r >= 13 && hash2(r, 5, 9) < 0.5;
    const tipR = r >= 13 && hash2(r, 6, 9) < 0.5;
    const below = r >= 6; // por debajo de la barbilla cubre parte de los hombros
    if (!tipL) {
      px(ctx, x - 4, yy, hairTone(x - 4, yy, x - 5, x - 3));
      if (below) {
        px(ctx, x - 5 + wl, yy, hairTone(x - 5, yy, x - 5, x - 3));
        px(ctx, x - 3, yy, hairTone(x - 3, yy, x - 5, x - 3));
      }
    }
    if (!tipR) {
      px(ctx, x + 3, yy, hairTone(x + 3, yy, x + 3, x + 5));
      if (below) {
        px(ctx, x + 4 + wr, yy, hairTone(x + 4, yy, x + 3, x + 5));
        px(ctx, x + 2, yy, hairTone(x + 2, yy, x + 3, x + 5));
      }
    }
  }
  // aros de los lentes por encima del cabello lateral
  px(ctx, x - 4, H - 20, FR);
  px(ctx, x + 3, H - 20, FR_D);
}

// Vista según la dirección en que camina (la última, si está parada):
// de frente (hacia abajo en pantalla), de espalda (hacia arriba) o de perfil.
function drawPlayer(x, y, now, onBoat) {
  const sx = player.aimGx - player.aimGy; // dirección en pantalla (isométrica)
  const sy = (player.aimGx + player.aimGy) / 2;
  if (Math.abs(sx) > Math.abs(sy) + 0.05)
    return drawPlayerSide(x, y, now, onBoat);
  if (sy < 0) return drawPlayerBack(x, y, now, onBoat);
  return drawPlayerFront(x, y, now, onBoat);
}

// Sombra, ondas en aguas bajas y parpadeo al ser herida (común a las vistas nuevas)
function playerViewBase(x, y, now, onBoat) {
  if (onBoat) {
    // la sombra y las ondas las pone el bote
  } else if (isShallow(tileAt(Math.round(player.gx), Math.round(player.gy)))) {
    drawRipple(x, y, now || 0);
  } else {
    ellipse(ctx, x, y, 6, 2, "rgba(0,0,0,0.3)");
  }
  if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) return null;
  const py = y - Math.round(player.z);
  const air = player.z > 0.5;
  const stepping = player.moving && !onBoat;
  const walk = stepping ? (player.step >> 3) & 1 : 0;
  const bob = stepping ? (player.step >> 2) & 1 : 0;
  return { py, air, stepping, walk, bob, H: py - bob };
}

const PV = {
  SKIN: "#f1c8a8",
  SKIN_D: "#d6a07c",
  SKIN_L: "#fbe0c8",
  JADE: "#2fbf71",
  BROWN: "#8a5a2e",
  BROWN_D: "#5e3a1a",
  HR: ["#22130c", "#3d2416", "#5e3a22", "#8a5a34", "#b98652"],
  FR: "#b4501e",
  FR_D: "#5a2410",
  LENS: "#6e2a1a",
  LENS_L: "#c0704a",
  EYE: "#86a04e",
  LIP: "#d98c7a",
  KH: "#c8b88a",
  KH_D: "#a89868",
  KH_L: "#dccfa2",
  BT: "#7a4a26",
  BT_D: "#42240f",
  BT_L: "#a06a38",
  BL: "#3a8a3c",
  BL_D: "#276a2c",
  BL_L: "#5cab57",
};

// De espalda: cabello largo cubriendo la cabeza y la espalda, sin cara
function drawPlayerBack(x, y, now, onBoat) {
  const b = playerViewBase(x, y, now, onBoat);
  if (!b) return;
  const { py, air, stepping, walk, H } = b;
  const {
    SKIN,
    SKIN_D,
    JADE,
    BROWN,
    BROWN_D,
    HR,
    KH,
    KH_D,
    KH_L,
    BT,
    BT_D,
    BT_L,
    BL,
    BL_D,
    BL_L,
  } = PV;
  const sway = stepping ? (player.step >> 3) & 1 : 0;
  const WV = [0, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1];
  const wv = (r) => WV[(r + (sway ? 2 : 0)) % WV.length];
  const hairTone = (xx, yy, eL, eR) => {
    const u = (xx - eL) / (eR - eL + 1);
    let t = u < 0.22 ? 3 : u < 0.62 ? 2 : 1;
    const k = (xx + yy + wv(yy)) % 5;
    if (k === 0 && u < 0.8) t = Math.min(4, t + 1);
    else if (k === 3) t = Math.max(0, t - 1);
    return HR[t];
  };
  const legL = air ? 4 : walk ? 4 : 5;
  const legR = air ? 4 : walk ? 5 : 4;
  const liftL = air ? 1 : stepping ? 5 - legL : 0;
  const liftR = air ? 1 : stepping ? 5 - legR : 0;
  [
    [x - 4, liftL],
    [x + 1, liftR],
  ].forEach(([lx, lift]) => {
    const top = H - 5;
    const bootY = py - 3 - lift;
    const h = Math.max(0, bootY - top);
    rect(ctx, lx, top, 3, h, KH);
    rect(ctx, lx + 2, top, 1, h, KH_D);
    px(ctx, lx, top, KH_L);
    rect(ctx, lx, bootY, 3, 2, BT);
    px(ctx, lx, bootY, BT_L);
    rect(ctx, lx - 1, bootY + 2, 5, 1, BT_D);
  });
  // cadera y cinturón
  for (let i = 0; i < 5; i++) {
    for (let xx = -4; xx < 4; xx++) {
      let col = xx >= 2 ? KH_D : xx === -4 ? KH_L : KH;
      if (i === 0) col = xx >= 2 ? BROWN_D : BROWN;
      px(ctx, x + xx, H - 10 + i, col);
    }
  }
  px(ctx, x - 3, H - 8, KH_D); // bolsillos traseros
  px(ctx, x + 2, H - 8, KH_D);
  // blusa
  for (let j = 0; j < 6; j++)
    for (let xx = -4; xx < 4; xx++)
      px(ctx, x + xx, H - 16 + j, xx >= 2 ? BL_D : xx === -4 ? BL_L : BL);
  // brazos
  [-1, 1].forEach((d) => {
    const ax = d < 0 ? x - 6 : x + 4;
    rect(ctx, ax, H - 16, 2, 3, d < 0 ? BL : BL_D);
    px(ctx, ax, H - 16, BL_L);
    rect(ctx, ax, H - 13, 2, 3, SKIN);
    px(ctx, d < 0 ? ax : ax + 1, H - 12, SKIN_D);
    rect(ctx, ax, H - 10, 2, 1, JADE);
  });
  // cuello
  rect(ctx, x - 1, H - 17, 2, 2, SKIN_D);
  // cabeza (toda de cabello) y cabellera larga que cae por la espalda
  for (let r = 0; r < 17; r++) {
    const yy = H - 24 + r;
    const hw = r < 2 ? 4 : r < 6 ? 5 : 6;
    const w1 = r > 5 ? wv(r) : 0;
    const w2 = r > 5 ? -wv(r + 4) : 0;
    const eL = x - hw + w1;
    const eR = x + hw - 1 + w2;
    for (let xx = eL; xx <= eR; xx++) {
      if (r >= 15 && hash2(xx, r, 17) < 0.5) continue;
      px(ctx, xx, yy, hairTone(xx, yy, eL, eR));
    }
  }
  px(ctx, x, H - 24, HR[4]); // brillo en la coronilla
  px(ctx, x - 1, H - 23, HR[3]);
}

// De perfil (mira a la derecha; si va a la izquierda se refleja)
function drawPlayerSide(x, y, now, onBoat) {
  const b = playerViewBase(x, y, now, onBoat);
  if (!b) return;
  const { py, air, stepping, walk, H } = b;
  const {
    SKIN,
    SKIN_D,
    SKIN_L,
    JADE,
    BROWN,
    BROWN_D,
    HR,
    FR,
    FR_D,
    LENS,
    LENS_L,
    EYE,
    LIP,
    KH,
    KH_D,
    KH_L,
    BT,
    BT_D,
    BT_L,
    BL,
    BL_D,
    BL_L,
  } = PV;
  const f = player.sideFace || (player.aimGx - player.aimGy >= 0 ? 1 : -1);
  // dx = desplazamiento hacia donde mira; el sprite se refleja si f < 0
  const sr = (dx, yy, w, h, col) =>
    rect(ctx, f > 0 ? x + dx : x - dx - w + 1, yy, w, h, col);
  const sp = (dx, yy, col) => sr(dx, yy, 1, 1, col);
  const sway = stepping ? (player.step >> 3) & 1 : 0;
  const WV = [0, 0, -1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, -1];
  const wv = (r) => WV[(r + (sway ? 2 : 0)) % WV.length];

  // piernas: una adelante y otra atrás, alternando
  const sw = air ? 0 : stepping ? (walk ? 2 : -2) : 0;
  const legs = [
    { dx: -1 + sw, lift: air ? 1 : stepping ? (walk ? 0 : 2) : 0, far: true },
    { dx: -1 - sw, lift: air ? 1 : stepping ? (walk ? 2 : 0) : 0, far: false },
  ];
  legs.forEach((l) => {
    const top = H - 5;
    const bootY = py - 3 - l.lift;
    const h = Math.max(0, bootY - top);
    const kh = l.far ? KH_D : KH;
    sr(l.dx, top, 3, h, kh);
    sp(l.dx, top, KH_L);
    sr(l.dx, bootY, 3, 2, l.far ? BT_D : BT);
    sp(l.dx, bootY, BT_L);
    sr(l.dx, bootY + 2, 4, 1, BT_D); // suela con punta hacia delante
  });

  // cabellera larga que cae por detrás
  for (let r = 0; r < 16; r++) {
    const yy = H - 24 + r;
    const back = r < 2 ? 4 : r < 5 ? 6 : 6 + (r > 6 ? wv(r) : 0);
    const front = r < 4 ? 2 : -1;
    for (let dx = -back; dx <= front; dx++) {
      if (r >= 14 && hash2(dx + 20, r, 17) < 0.5) continue;
      const k = (dx + yy + wv(yy) + 40) % 5;
      let t = dx > -2 ? 3 : dx > -4 ? 2 : 1;
      if (k === 0 && dx > -5) t = Math.min(4, t + 1);
      else if (k === 3) t = Math.max(0, t - 1);
      sp(dx, yy, HR[t]);
    }
  }

  // cadera con cinturón
  for (let i = 0; i < 5; i++) {
    for (let dx = -3; dx <= 2; dx++) {
      let col = dx >= 1 ? KH_L : dx <= -3 ? KH_D : KH;
      if (i === 0) col = dx <= -3 ? BROWN_D : BROWN;
      sp(dx, H - 10 + i, col);
    }
  }
  sp(1, H - 10, "#d9b44a"); // hebilla
  sp(1, H - 7, KH_D); // bolsillo

  // blusa
  for (let j = 0; j < 6; j++)
    for (let dx = -3; dx <= 2; dx++)
      sp(dx, H - 16 + j, dx <= -3 ? BL_D : dx >= 1 ? BL_L : BL);
  sp(2, H - 16, BL_D); // cuello de la blusa

  // cuello y cabeza de perfil
  sr(-1, H - 17, 2, 2, SKIN_D);
  sr(-3, H - 23, 6, 6, SKIN);
  sr(-2, H - 17, 3, 1, SKIN);
  sp(3, H - 20, SKIN_D); // nariz
  sp(2, H - 18, LIP); // labios
  sp(1, H - 18, SKIN_D);
  sp(0, H - 19, SKIN_D); // mejilla
  sp(2, H - 22, SKIN_L); // luz en la frente

  // cabello sobre la cabeza y la nuca, con flequillo
  sr(-5, H - 24, 8, 1, HR[1]);
  sr(-4, H - 23, 7, 1, HR[2]);
  sr(-4, H - 22, 3, 4, HR[2]);
  sr(-5, H - 21, 2, 3, HR[1]);
  sp(2, H - 23, HR[2]); // flequillo
  sp(1, H - 24, HR[4]);
  sp(-1, H - 24, HR[3]);
  sp(-2, H - 23, HR[3]);

  // ojo y lentes de perfil
  sp(1, H - 22, HR[0]); // pestaña
  sp(1, H - 21, EYE);
  sr(0, H - 22, 3, 1, FR); // marco superior
  sr(0, H - 20, 3, 1, FR_D); // marco inferior
  sp(0, H - 21, LENS);
  sp(2, H - 21, LENS_L);
  sp(3, H - 21, FR);
  sr(-3, H - 21, 3, 1, FR); // patilla hacia la oreja

  // mechón al frente sobre el hombro
  for (let r = 0; r < 9; r++) {
    const dx = -1 + (r > 3 ? wv(r + 1) : 0);
    sp(dx, H - 17 + r, HR[r % 2 ? 2 : 3]);
    sp(dx + 1, H - 17 + r, HR[3]);
  }

  // brazo: se balancea al caminar
  const as = air ? 0 : stepping ? (walk ? -2 : 2) : 0;
  const ax = -1 + as;
  sr(ax, H - 16, 2, 3, BL); // manga
  sp(ax, H - 16, BL_L);
  sr(ax, H - 13, 2, 3, SKIN);
  sp(ax + 1, H - 12, SKIN_D);
  sr(ax, H - 10, 2, 1, JADE);
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

// Mandoble de espada: preparación (se echa hacia atrás), tajo veloz con estela en
// medialuna, destello al final y chispas. Todo se dibuja con píxeles.
function drawSword(x, y) {
  const p = 1 - player.attackT / SWORD_COOLDOWN; // 0 → 1 durante el golpe
  let ux = player.aimGx - player.aimGy; // dirección en pantalla (isométrica)
  let uy = (player.aimGx + player.aimGy) / 2;
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  const base = Math.atan2(uy, ux);
  const SWEEP = 1.6; // barre ±92°
  const WIND = 0.2; // fracción del golpe dedicada a la preparación
  const HIT = 0.72; // fracción en la que termina el tajo
  const cx = x;
  const cy = y - Math.round(player.z) - 11;
  const YS = 0.75; // aplastado vertical (perspectiva isométrica)
  const BL = 22; // largo visual de la hoja, en píxeles (solo estético: el alcance real es SWORD_REACH)

  // Ángulo de la hoja: se echa un poco hacia atrás y luego corta con aceleración
  const startA = base - SWEEP;
  let a;
  let swing; // 0 → 1 progreso del tajo
  if (p < WIND) {
    const w = p / WIND;
    a = startA - 0.35 * Math.sin(w * Math.PI * 0.5);
    swing = 0;
  } else if (p < HIT) {
    const s = (p - WIND) / (HIT - WIND);
    swing = 1 - Math.pow(1 - s, 3); // arranca muy rápido y frena
    a = startA - 0.35 + (2 * SWEEP + 0.35) * swing; // continúa desde la preparación y termina en base + SWEEP
  } else {
    swing = 1;
    a = base + SWEEP;
  }
  const fade = p < HIT ? 1 : Math.max(0, 1 - (p - HIT) / (1 - HIT));

  // ---- Estela en medialuna ----
  if (swing > 0) {
    const TRAIL = 1.9; // radianes de cola detrás de la hoja
    const aTail = Math.max(startA, a - TRAIL);
    const n = Math.max(2, Math.ceil((a - aTail) / 0.035));
    for (let i = 0; i <= n; i++) {
      const t = i / n; // 0 = cola, 1 = cabeza
      const ang = aTail + (a - aTail) * t;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang) * YS;
      const inner = 7 + 3 * (1 - t); // la cola se ensancha hacia dentro
      const outer = BL + 2 - 2 * (1 - t);
      for (let r = inner; r <= outer; r++) {
        const k = (r - inner) / (outer - inner); // 0 = borde interno, 1 = externo
        // borde externo cian brillante, centro blanco, interior azulado tenue
        let col = "#4fe0c8";
        if (k > 0.72) col = "#ffffff";
        else if (k > 0.45) col = "#c8fff3";
        else if (k < 0.2) col = "#1f9e8f";
        ctx.globalAlpha = Math.min(1, (0.15 + 0.85 * t * t) * fade);
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(cx + ca * r), Math.round(cy + sa * r), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- Chispas que saltan de la punta ----
  if (swing > 0.1) {
    for (let k = 0; k < 6; k++) {
      const life = (p * 14 + k * 1.7) % 4; // 0..4 frames de vida cíclicos
      const spread = (k - 2.5) * 0.35;
      const d = BL + 2 + life * 2.2;
      const sx = cx + Math.cos(a + spread) * d;
      const sy = cy + Math.sin(a + spread) * d * YS - life * 0.8;
      ctx.globalAlpha = Math.max(0, (1 - life / 4) * fade);
      px(ctx, Math.round(sx), Math.round(sy), k % 2 ? "#fff6c8" : "#ffffff");
      if (k % 3 === 0) px(ctx, Math.round(sx) + 1, Math.round(sy), "#ffd166");
    }
    ctx.globalAlpha = 1;
  }

  // ---- Hoja, guarda y empuñadura (visibles durante preparación y tajo) ----
  const bladeFade = p < HIT + 0.1 ? 1 : Math.max(0, 1 - (p - HIT - 0.1) / 0.18);
  if (bladeFade > 0) {
    ctx.globalAlpha = bladeFade;
    const ca = Math.cos(a);
    const sa = Math.sin(a) * YS;
    const nx = -sa; // perpendicular, para dar grosor
    const ny = ca;
    // paleta de madera de 5 px: contorno, cuerpo y luz
    pline(
      ctx,
      cx + ca * 4,
      cy + sa * 4,
      cx + ca * BL,
      cy + sa * BL,
      "#2a1608",
      5,
    );
    pline(
      ctx,
      cx + ca * 4,
      cy + sa * 4,
      cx + ca * (BL - 1),
      cy + sa * (BL - 1),
      "#b5793a",
      3,
    );
    pline(
      ctx,
      cx + ca * 5 + nx * 0.8,
      cy + sa * 5 + ny * 0.8,
      cx + ca * (BL - 1) + nx * 0.8,
      cy + sa * (BL - 1) + ny * 0.8,
      "#d9a05b",
      1,
    );
    // filos de obsidiana a ambos lados
    for (let rr = 6; rr <= BL - 1; rr += 3) {
      const bx = cx + ca * rr;
      const by = cy + sa * rr;
      px(ctx, Math.round(bx + nx * 3), Math.round(by + ny * 3), "#16162b");
      px(ctx, Math.round(bx - nx * 3), Math.round(by - ny * 3), "#16162b");
      px(ctx, Math.round(bx + nx * 2.6), Math.round(by + ny * 2.6), "#7b7bc4");
    }
    // destello en la punta (más fuerte justo al impactar)
    const flash = swing > 0.85 && p < HIT + 0.12 ? 1 : 0;
    const tx = Math.round(cx + ca * BL);
    const ty = Math.round(cy + sa * BL);
    px(ctx, tx, ty, "#ffffff");
    if (flash) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(tx - 3, ty, 7, 1);
      ctx.fillRect(tx, ty - 3, 1, 7);
      ctx.fillStyle = "#fff3a8";
      ctx.fillRect(tx - 1, ty - 1, 3, 3);
      px(ctx, tx - 2, ty - 2, "#ffd166");
      px(ctx, tx + 2, ty - 2, "#ffd166");
      px(ctx, tx - 2, ty + 2, "#ffd166");
      px(ctx, tx + 2, ty + 2, "#ffd166");
    }
    // guarda dorada
    const gx = cx + ca * 4;
    const gy = cy + sa * 4;
    pline(
      ctx,
      gx - nx * 2.2,
      gy - ny * 2.2,
      gx + nx * 2.2,
      gy + ny * 2.2,
      "#0f6b61",
      2,
    );
    pline(
      ctx,
      gx - nx * 2,
      gy - ny * 2,
      gx + nx * 2,
      gy + ny * 2,
      "#2ec4b6",
      1,
    );
    // empuñadura y pomo
    pline(
      ctx,
      cx + ca * 1,
      cy + sa * 1,
      cx + ca * 3,
      cy + sa * 3,
      "#c1121f",
      2,
    );
    px(ctx, Math.round(cx), Math.round(cy), "#2ec4b6");
    ctx.globalAlpha = 1;
  }
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

// Texto "(A)" en píxeles (siempre nítido), con contorno negro; (x, y) = centro superior
function drawButtonHintA(x, y) {
  const G = [".X..X..X.", "X..X.X..X", "X..XXX..X", "X..X.X..X", ".X.X.X.X."];
  const x0 = Math.round(x - 4);
  ctx.fillStyle = "#000000";
  G.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "X") continue;
      [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ].forEach(([dx, dy]) => ctx.fillRect(x0 + c + dx, y + r + dy, 1, 1));
    }
  });
  ctx.fillStyle = "#ffffff";
  G.forEach((row, r) => {
    for (let c = 0; c < row.length; c++)
      if (row[c] === "X") ctx.fillRect(x0 + c, y + r, 1, 1);
  });
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
    drawTag("¡SOLO PUEDES DESEMBARCAR UN MUELLE!", x, y - 44, "#ffd166");
  } else if (nearestPierTile(player.boat.gx, player.boat.gy, 2.2)) {
    drawHintArrow(x, y - 40 + bob, now);
    const hb = Math.round(Math.sin(now / 160) * 1.5);
    drawButtonHintA(x, y - 51 + bob + hb);
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
          drawHintArrow(x, y - 27, now);
          const hb = Math.round(Math.sin(now / 160) * 1.5);
          drawButtonHintA(x, y - 38 + hb);
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

      if (o.growlLeft > 0) {
        // Alterna gruñido y ladrido mientras aparta al hostil a empujones
        const growlTxt =
          Math.floor(now / 90 + o.phase) % 2 === 0 ? "¡GRRR!" : "¡GUAU!";
        drawTag(growlTxt, x, y - 26, "#ff6b6b");
      } else if (o.barkLeft > 0) {
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
      const moving =
        o.attacking || o.fleeing || (o.pauseTimer <= 0 && o.moveTimer > 0);

      const f = moving
        ? Math.floor(
            now / (o.attacking ? 90 : o.fleeing ? 130 : 210) + o.phase,
          ) % 2
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
      if (o.spotT > 0) drawTag("¡!", x, y - (SP.jaguar[0].ay + 6), "#ff595e");
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

    case "checkpoint": {
      const cp = o.cp;
      if (cp.visited) {
        // Halo verde pulsante mientras está encendido
        ctx.globalAlpha = 0.16 + 0.08 * Math.sin(now / 400);
        ellipse(ctx, x, y - 30, 11, 13, "#7dffb0");
        ctx.globalAlpha = 1;
      }
      blit(SP.checkpoint[cp.visited ? 1 : 0], x, y);
      if (cp.flashT > 0) drawTag("¡CHECKPOINT!", x, y - 56, "#52b788");
      break;
    }

    case "exit": {
      // Portal en el suelo: gris si aún faltan cosas, dorado con un rayo de luz si ya se puede salir
      const ok = levelComplete();
      const pulse = 0.5 + 0.5 * Math.sin(now / 300);
      ctx.globalAlpha = ok ? 0.5 + 0.25 * pulse : 0.4;
      ellipse(ctx, x, y, 27, 13, ok ? "#ffd166" : "#6b6f8a");
      ctx.globalAlpha = 1;
      ellipse(ctx, x, y, 19, 9, ok ? "#fff3b0" : "#2f3245");
      ellipse(ctx, x, y, 10, 5, ok ? "#ffffff" : "#454a63");
      if (ok) {
        ctx.globalAlpha = 0.16 + 0.1 * pulse;
        ctx.fillStyle = "#ffe28a";
        ctx.fillRect(x - 9, y - 54, 18, 54);
        ctx.globalAlpha = 1;
        drawTag("SALIDA", x, y - 58, "#ffd166");
      }
      break;
    }

    case "sign": {
      blit(SP.sign, x, y);
      const near =
        !isPaused &&
        Math.hypot(player.gx - o.s.gx, player.gy - o.s.gy) < SIGN_RANGE;
      if (near) {
        // La flecha va sobre el letrero (sin tapar su cartel) y un "(A)" encima
        // avisa que se lee presionando A
        drawHintArrow(x, y - 40, now);
        const hb = Math.round(Math.sin(now / 160) * 1.5);
        drawButtonHintA(x, y - 51 + hb);
      }
      break;
    }

    case "novio": {
      blit(SP.novio[o.o.rescued ? 1 : 0], x, y);
      if (!o.o.rescued) {
        const near =
          !isPaused &&
          Math.hypot(player.gx - o.o.gx, player.gy - o.o.gy) < NOVIO_RANGE;
        if (near) {
          drawHintArrow(x, y - 41, now);
          const hb = Math.round(Math.sin(now / 160) * 1.5);
          drawButtonHintA(x, y - 52 + hb);
        }
      }
      break;
    }

    case "boomerang": {
      const bob = Math.round(Math.sin(now / 350) * 2);
      ellipse(ctx, x, y, 6, 2, "rgba(0,0,0,0.25)");
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(now / 300);
      ellipse(ctx, x, y - 10 + bob, 10, 10, "#ffe28a");
      ctx.globalAlpha = 1;
      blit(SP.boomerang, x, y - 4 + bob);
      const tw = Math.sin(now / 240);
      if (tw > 0.2) {
        const sx = x + (tw > 0.6 ? -9 : 9);
        const sy = y - 20 + Math.round(tw * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx, sy - 1, 1, 3);
        ctx.fillRect(sx - 1, sy, 3, 1);
      }
      break;
    }

    case "boomerangFly": {
      // Proyectil girando, con sombra en el suelo
      ellipse(ctx, x, y, 5, 2, "rgba(0,0,0,0.3)");
      const a = boomerang ? boomerang.spin : 0;
      ctx.save();
      ctx.translate(x, y - 10);
      ctx.rotate(a);
      ctx.drawImage(SP.boomerang.cv, -8, -8);
      ctx.restore();
      break;
    }

    case "sword": {
      // Flota, brilla con un halo y suelta destellos
      const bob = Math.round(Math.sin(now / 350) * 2);
      ellipse(ctx, x, y, 6, 2, "rgba(0,0,0,0.25)");
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(now / 300);
      ellipse(ctx, x, y - 18 + bob, 11, 14, "#ffe28a");
      ctx.globalAlpha = 1;
      blit(SP.sword, x, y - 4 + bob);
      const tw = Math.sin(now / 240);
      if (tw > 0.2) {
        const sx = x + (tw > 0.6 ? -9 : 9);
        const sy = y - 28 + Math.round(tw * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx, sy - 1, 1, 3);
        ctx.fillRect(sx - 1, sy, 3, 1);
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
      if (boatToBoard() === o) {
        drawHintArrow(x, y - 20 + bob, now);
        const hb = Math.round(Math.sin(now / 160) * 1.5);
        drawButtonHintA(x, y - 31 + bob + hb);
      }
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
  if (swordItem && !swordItem.collected) {
    swordItem.h = tileH(Math.round(swordItem.gx), Math.round(swordItem.gy));
    pushObj(swordItem);
  }
  if (boomerangItem && !boomerangItem.collected) {
    boomerangItem.h = tileH(
      Math.round(boomerangItem.gx),
      Math.round(boomerangItem.gy),
    );
    pushObj(boomerangItem);
  }
  if (boomerang) {
    boomerang.kind = "boomerangFly";
    boomerang.h = tileH(Math.round(boomerang.gx), Math.round(boomerang.gy));
    boomerang.depth = boomerang.gx + boomerang.gy + 0.5;
    pushObj(boomerang);
  }
  checkpoints.forEach((cp) => {
    if (!cp.obj)
      cp.obj = {
        kind: "checkpoint",
        cp,
        gx: cp.gx,
        gy: cp.gy,
        h: 0,
        depth: cp.gx + cp.gy + 0.01,
      };
    cp.obj.h = tileH(Math.round(cp.gx), Math.round(cp.gy));
    pushObj(cp.obj);
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

  exits.forEach((ex) => {
    if (!ex.obj)
      ex.obj = {
        kind: "exit",
        ex,
        gx: ex.gx,
        gy: ex.gy,
        h: 0,
        depth: ex.gx + ex.gy - 1.2, // plano en el suelo: se dibuja antes que lo que lo pisa
      };
    ex.obj.h = tileH(Math.round(ex.gx), Math.round(ex.gy));
    pushObj(ex.obj);
  });

  signs.forEach((s) => {
    if (!s.obj)
      s.obj = {
        kind: "sign",
        s,
        gx: s.gx,
        gy: s.gy,
        h: tileH(s.gx, s.gy),
        depth: s.gx + s.gy + 0.01,
      };
    pushObj(s.obj);
  });

  if (novio) {
    if (!novio.obj)
      novio.obj = {
        kind: "novio",
        o: novio,
        gx: novio.gx,
        gy: novio.gy,
        h: tileH(novio.gx, novio.gy),
        depth: novio.gx + novio.gy + 0.01,
      };
    novio.obj.h = tileH(Math.round(novio.gx), Math.round(novio.gy));
    pushObj(novio.obj);
  }

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

  // Aviso del nivel de zoom (botón SELECT): aparece un momento y se desvanece
  if (zoomMsgT > 0) {
    zoomMsgT--;
    ctx.globalAlpha = Math.min(1, zoomMsgT / 25);
    drawTag("ZOOM: " + ZOOMS[zoomIdx].name, VIEW_W / 2, 22, "#ffffff");
    ctx.globalAlpha = 1;
  }
}
