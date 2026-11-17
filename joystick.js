"use strict";

/* Joystick virtual táctil */
document.addEventListener("DOMContentLoaded", () => {
  const zone = document.getElementById("joystickZone");
  if (!zone) return;

  let activeTouchId = null;
  let activeButtons = new Set();

  const btnIds = {
    up: "btnUp",
    down: "btnDown",
    left: "btnLeft",
    right: "btnRight",
  };

  const setButtonState = (btnId, shouldBeActive) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    if (shouldBeActive && !activeButtons.has(btnId)) {
      btn.classList.add("active");
      btn.dispatchEvent(new Event("mousedown", { bubbles: true }));
      activeButtons.add(btnId);
    } else if (!shouldBeActive && activeButtons.has(btnId)) {
      btn.classList.remove("active");
      btn.dispatchEvent(new Event("mouseup", { bubbles: true }));
      activeButtons.delete(btnId);
    }
  };

  const releaseAll = () => {
    activeButtons.forEach((btnId) => setButtonState(btnId, false));
  };

  const handleMove = (touch) => {
    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;

    const deadZone = 15;
    if (Math.hypot(dx, dy) < deadZone) {
      releaseAll();
      return;
    }

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    let wantUp = false,
      wantDown = false,
      wantLeft = false,
      wantRight = false;

    if (angle >= 337.5 || angle < 22.5) {
      wantRight = true;
    } else if (angle >= 22.5 && angle < 67.5) {
      wantDown = true;
      wantRight = true;
    } else if (angle >= 67.5 && angle < 112.5) {
      wantDown = true;
    } else if (angle >= 112.5 && angle < 157.5) {
      wantDown = true;
      wantLeft = true;
    } else if (angle >= 157.5 && angle < 202.5) {
      wantLeft = true;
    } else if (angle >= 202.5 && angle < 247.5) {
      wantUp = true;
      wantLeft = true;
    } else if (angle >= 247.5 && angle < 292.5) {
      wantUp = true;
    } else if (angle >= 292.5 && angle < 337.5) {
      wantUp = true;
      wantRight = true;
    }

    setButtonState(btnIds.up, wantUp);
    setButtonState(btnIds.down, wantDown);
    setButtonState(btnIds.left, wantLeft);
    setButtonState(btnIds.right, wantRight);
  };

  zone.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      if (activeTouchId === null) {
        const touch = e.changedTouches[0];
        activeTouchId = touch.identifier;
        handleMove(touch);
      }
    },
    { passive: false },
  );

  zone.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          handleMove(e.changedTouches[i]);
          break;
        }
      }
    },
    { passive: false },
  );

  zone.addEventListener("touchend", (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        activeTouchId = null;
        releaseAll();
        break;
      }
    }
  });

  zone.addEventListener("touchcancel", () => {
    activeTouchId = null;
    releaseAll();
  });
});
