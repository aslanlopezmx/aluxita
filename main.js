"use strict";

/* ---------- HUD ---------- */
function updateHUD() {
  healthDisplay.innerText = Array.from({ length: MAX_HEALTH }, (_, i) =>
    i < health ? "❤️" : "🖤",
  ).join(" ");

  const gl = collectibles
    .filter((g) => g.items.length)
    .map((g) => ` | ${g.def.emoji} ${g.count}/${g.items.length}`)
    .join("");
  const sw = swordItem ? ` | ⚔️ ${hasSword ? 1 : 0}/1` : "";
  const bm = boomerangItem ? ` | 🪃 ${hasBoomerang ? 1 : 0}/1` : "";
  const nv = novio ? ` | 🤗 ${novio.rescued ? 1 : 0}/1` : "";
  itemDisplay.innerText = `🥐 ${foundCount}/${treasures.length}${gl}${sw}${bm}${nv}`;
}

/* ---------- Controles ---------- */
let keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

// START: en la pantalla principal empieza; durante el juego abre/cierra el menú
function pressStart() {
  if (cutActive) return cutNext();
  if (!gameStarted) titleStart();
  else togglePauseMenu();
}

// Pantalla principal: el juego queda pausado hasta presionar START
// load = true: continúa la partida guardada; si no se puede cargar, no empieza
function startGame(load) {
  if (gameStarted) return;
  if (load === true && !loadGame()) {
    refreshTitleList();
    return;
  }
  gameStarted = true;
  isPaused = false;
  const t = document.getElementById("titleScreen");
  t.classList.add("closing");
  setTimeout(() => t.remove(), 400);
}

// SELECT: selector de nivel en el título / zoom en el juego (pressSelect está en menu.js;
// si ese archivo es una versión anterior, cae al zoom de siempre)
function selectPressed() {
  if (typeof pressSelect === "function") pressSelect();
  else cycleZoom();
}

function setupControls() {
  const bindHold = (id, keyName) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      keys[keyName] = true;
      uiNav(keyName);
    });

    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      keys[keyName] = false;
    });
    btn.addEventListener("touchcancel", () => (keys[keyName] = false));
    btn.addEventListener("mousedown", () => {
      keys[keyName] = true;
      uiNav(keyName);
    });
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
  bindPress("btnC", throwBoomerang);
  bindPress("btnSelect", selectPressed);
  bindPress("btnStart", pressStart);
  document
    .getElementById("titleScreen")
    .addEventListener("pointerdown", titleStart);

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
    if (
      e.code === "Escape" &&
      typeof levelPickOpen !== "undefined" &&
      levelPickOpen
    )
      return closeLevelPicker();
    if (e.code === "ArrowUp" || e.code === "KeyW") uiNav("up");
    if (e.code === "ArrowDown" || e.code === "KeyS") uiNav("down");
    if (e.code === "Enter" || e.code === "Escape" || e.code === "KeyP")
      pressStart();
    if (e.code === "Space" || e.code === "KeyE") actionA();
    if (e.code === "KeyX" || e.code === "KeyK") attack();
    if (e.code === "KeyC" || e.code === "KeyJ") throwBoomerang();
    if (e.code === "KeyZ") selectPressed();
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  });
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
      const mem = MEMORIES[MEM_OFFSET + foundCount];
      chest.memIdx = MEM_OFFSET + foundCount; // para poder restaurarlo al cargar partida
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

function actionA() {
  if (cutActive) return cutNext();
  if (!gameStarted) return titleA();
  if (menuOpen) return menuA();
  if (isPaused) return;
  if (tryBoat()) return;
  if (checkChestInteraction()) return;
  if (checkSignInteraction()) return;
  if (checkNovioInteraction()) return;
  if (player.jumpT === 0) player.jumpT = 1;
}

// Letrero cercano: con A se abre el cartel de madera con su mensaje
function checkSignInteraction() {
  if (isPaused) return false;
  let found = false;
  signs.forEach((s) => {
    if (found) return;
    const dist = Math.hypot(player.gx - s.gx, player.gy - s.gy);
    if (dist < SIGN_RANGE) {
      openSignDialog(s.text);
      found = true;
    }
  });
  return found;
}

// Novio atado: con A cerca de él la exploradora lo libera (solo una vez)
function checkNovioInteraction() {
  if (isPaused || !novio || novio.rescued) return false;
  const dist = Math.hypot(player.gx - novio.gx, player.gy - novio.gy);
  if (dist >= NOVIO_RANGE) return false;
  novio.rescued = true;
  updateHUD();
  burst(
    novio.gx,
    novio.gy,
    tileH(Math.round(novio.gx), Math.round(novio.gy)),
    ["#ffd166", "#f72585", "#ffffff", "#8fdcff"],
    20,
  );
  // Encontrar al novio es el final del juego: al cerrar el modal, se reutiliza
  // el mismo mecanismo de "salir de nivel" (cinemática "finN" + pantalla de
  // carga); como solo existe en el último nivel, esto termina el juego.
  openMemoryModal(
    {
      image: makeNovioCardImage(),
      title: "¡Por fin lo encontraste!",
      message:
        "Desatas las cuerdas y lo abrazas fuerte. Juntos, ya nada los puede separar, bombón.",
    },
    "* ¡LO RESCATASTE! *",
    beginLevelExit,
  );
  return true;
}

function openSignDialog(text) {
  isPaused = true;
  keys = { up: false, down: false, left: false, right: false };
  dialogText.innerText = text;
  dialogOverlay.classList.remove("hidden");
}

function closeSignDialog() {
  dialogOverlay.classList.add("hidden");
  isPaused = false;
}

// onClose (opcional): se llama una sola vez, justo después de cerrar este
// modal con el botón CONTINUAR (p. ej. para encadenar la cinemática final).
let memoryModalOnClose = null;
function openMemoryModal(chest, badge, onClose) {
  isPaused = true;
  keys = { up: false, down: false, left: false, right: false };
  memoryModalOnClose = onClose || null;
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
// ¿La exploradora está pisando el concreto de un checkpoint? (zona segura)
function playerSafe() {
  if (!safeTiles.size || player.boat) return false;
  return safeTiles.has(tileKey(Math.round(player.gx), Math.round(player.gy)));
}

// Al pisar un checkpoint se enciende y pasa a ser el punto de reaparición
function updateCheckpoints() {
  checkpoints.forEach((cp) => {
    if (cp.flashT > 0) cp.flashT--;
  });
  if (player.boat) return;
  const k = tileKey(Math.round(player.gx), Math.round(player.gy));
  checkpoints.forEach((cp) => {
    if (!cp.tiles.has(k) || lastCheckpoint === cp) return;
    lastCheckpoint = cp;
    cp.visited = true;
    cp.flashT = 110;
    burst(
      cp.gx,
      cp.gy,
      tileH(Math.round(cp.gx), Math.round(cp.gy)),
      ["#7dffb0", "#ffffff", "#52b788", "#ffd166"],
      16,
    );
  });
}

function checkCollect() {
  // Espada: al recogerla se desbloquea el ataque (botón B) y sale su recuerdo
  if (
    swordItem &&
    !swordItem.collected &&
    !isPaused &&
    Math.hypot(player.gx - swordItem.gx, player.gy - swordItem.gy) <= 0.9
  ) {
    swordItem.collected = true;
    hasSword = true;
    updateHUD();
    burst(
      swordItem.gx,
      swordItem.gy,
      tileH(swordItem.gx, swordItem.gy),
      ["#ffffff", "#8fdcff", "#ffd166", "#f72585"],
      20,
    );
    openMemoryModal(
      {
        image: makeSwordCardImage(),
        title: "¡Encontraste el macuahuitl!",
        message:
          "La espada maya, con filos de obsidiana. ¡Ahora ya tienes la función de ataque! Presiona el botón B (o X / K en el teclado) para atacar a los enemigos que tengas enfrente.",
      },
      "* ¡NUEVA HABILIDAD! *",
    );
  }
  // Boomerang: al recogerlo se desbloquea el ataque a distancia (botón C)
  if (
    boomerangItem &&
    !boomerangItem.collected &&
    !isPaused &&
    Math.hypot(player.gx - boomerangItem.gx, player.gy - boomerangItem.gy) <=
      0.9
  ) {
    boomerangItem.collected = true;
    hasBoomerang = true;
    updateHUD();
    burst(
      boomerangItem.gx,
      boomerangItem.gy,
      tileH(boomerangItem.gx, boomerangItem.gy),
      ["#ffffff", "#e0b070", "#ffd166", "#f72585"],
      20,
    );
    openMemoryModal(
      {
        image: makeBoomerangCardImage(),
        title: "¡Encontraste el boomerang!",
        message:
          "¡Ahora puedes atacar a distancia! Presiona el botón C (o C / J en el teclado) para lanzarlo hacia donde mires: golpea a los enemigos y regresa a ti.",
      },
      "* ¡NUEVA HABILIDAD! *",
    );
  }
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
  if (memoryModalOnClose) {
    const cb = memoryModalOnClose;
    memoryModalOnClose = null;
    cb();
  }
});

// Mueve a la exploradora (dx, dy) sin que se atore: si choca contra un obstáculo
// redondo, resbala por su borde y lo rodea; contra orillas o troncos, resbala por
// el eje libre. Si por algún motivo quedó dentro de un obstáculo, se la empuja afuera.
// ¿El paso (a→b) en diagonal cruza la esquina de una casilla de caja (troncos/rocas)?
function cornerCut(ax, ay, bx, by) {
  const ax0 = Math.round(ax),
    ay0 = Math.round(ay);
  const bx0 = Math.round(bx),
    by0 = Math.round(by);
  if (ax0 === bx0 || ay0 === by0) return false;
  return inBox(bx0, ay0) || inBox(ax0, by0);
}

function movePlayer(dx, dy, canGo) {
  const x0 = player.gx;
  const y0 = player.gy;
  const onFoot = canGo === walkable;

  // 0. Quedó dentro de un obstáculo (p. ej. al reaparecer): salir hacia afuera
  if (onFoot) {
    const inside = blockerAt(x0, y0);
    if (inside) {
      let nx = x0 - inside.gx;
      let ny = y0 - inside.gy;
      const nl = Math.hypot(nx, ny);
      if (nl < 0.001) {
        nx = 1;
        ny = 0;
      } else {
        nx /= nl;
        ny /= nl;
      }
      const ox = x0 + nx * 0.12;
      const oy = y0 + ny * 0.12;
      if (landAt(ox, oy)) {
        player.gx = ox;
        player.gy = oy;
        return;
      }
    }
  }

  // 1. Camino libre (sin colarse por la esquina entre dos casillas bloqueadas)
  if (canGo(x0 + dx, y0 + dy) && !cornerCut(x0, y0, x0 + dx, y0 + dy)) {
    player.gx = x0 + dx;
    player.gy = y0 + dy;
    return;
  }

  // 2. Obstáculo redondo: resbalar por su borde (tangente), hacia el lado al que
  //    empuja el movimiento; si ese lado está tapado, probar el contrario
  if (onFoot) {
    const b = blockerAt(x0 + dx, y0 + dy);
    if (b) {
      let nx = x0 - b.gx;
      let ny = y0 - b.gy;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      const tx = -ny;
      const ty = nx;
      const sp = Math.hypot(dx, dy);
      const along = dx * tx + dy * ty;
      const dir = along >= 0 ? 1 : -1;
      // al menos el 60% de la velocidad: así nunca se queda pegada de frente
      const mag = Math.max(Math.abs(along), sp * 0.6);
      for (const sgn of [dir, -dir]) {
        const sx = tx * sgn * mag;
        const sy = ty * sgn * mag;
        if (canGo(x0 + sx, y0 + sy)) {
          player.gx = x0 + sx;
          player.gy = y0 + sy;
          return;
        }
      }
    }
  }

  // 3. Resbalar por cada eje (orillas del mapa, troncos...)
  if (canGo(x0 + dx, y0)) player.gx = x0 + dx;
  if (canGo(player.gx, y0 + dy)) player.gy = y0 + dy;
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

  // Normaliza la velocidad: en diagonal (dos teclas) va igual de rápido que en línea recta
  const rawLen = Math.hypot(dGx, dGy);
  if (rawLen > 0) {
    const k = (spd * Math.SQRT2) / rawLen;
    dGx *= k;
    dGy *= k;
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
    movePlayer(dGx, dGy, canGo);
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

  // Adelanto de cámara: apunta hacia la dirección de marcha (en pantalla) y vuelve
  // despacio al centro cuando el personaje se detiene
  let lx = 0;
  let ly = 0;
  if (player.moving) {
    const sx = (dGx - dGy) * HW;
    const sy = (dGx + dGy) * HH;
    const sl = Math.hypot(sx, sy) || 1;
    lx = (sx / sl) * VIEW_W * LOOK_AHEAD_X;
    ly = (sy / sl) * VIEW_H * LOOK_AHEAD_Y;
  }
  const lookEase = player.moving ? LOOK_EASE_MOVE : LOOK_EASE_STOP;
  look.x += (lx - look.x) * lookEase;
  look.y += (ly - look.y) * lookEase;

  const tx = WX0 + (player.gx - player.gy) * HW - VIEW_W / 2 + look.x;
  const ty =
    WY0 + (player.gx + player.gy) * HH - player.h * U - VIEW_H / 2 + 8 + look.y;
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
  updateCheckpoints();
  checkDogFound();
  checkExit();

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
  updateBoomerang();
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

function loop(now = 0) {
  updateMenu();
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
tagStatics();
setupControls();
refreshTitleList();
updateHUD();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () =>
  setTimeout(resizeCanvas, 150),
);
if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(canvas);
snapCamera();
autoStart();
requestAnimationFrame(loop);
