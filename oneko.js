// oneko.js — wanders edges, follows cursor briefly when clicked
// Based on https://github.com/adryd325/oneko.js

(function oneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");

  // Start from a random corner
  const corners = [
    [32, 32],
    [window.innerWidth - 32, 32],
    [32, window.innerHeight - 32],
    [window.innerWidth - 32, window.innerHeight - 32],
  ];
  const startCorner = corners[Math.floor(Math.random() * 4)];

  let nekoPosX = startCorner[0];
  let nekoPosY = startCorner[1];

  let targetX = nekoPosX;
  let targetY = nekoPosY;

  let mousePosX = 0;
  let mousePosY = 0;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;

  // Modes: 'wander' or 'follow'
  let mode = 'wander';
  let followTimer = 0;
  const FOLLOW_DURATION = 70; // ~7 seconds at 10fps

  const nekoSpeed = 10;
  const EDGE_MARGIN = 100;

  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchWallN: [
      [0, 0],
      [0, -1],
    ],
    scratchWallS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchWallE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchWallW: [
      [-4, 0],
      [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  };

  function pickNewTarget() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0:
        targetX = 32 + Math.random() * (w - 64);
        targetY = 16 + Math.random() * EDGE_MARGIN;
        break;
      case 1:
        targetX = w - 16 - Math.random() * EDGE_MARGIN;
        targetY = 32 + Math.random() * (h - 64);
        break;
      case 2:
        targetX = 32 + Math.random() * (w - 64);
        targetY = h - 16 - Math.random() * EDGE_MARGIN;
        break;
      case 3:
        targetX = 16 + Math.random() * EDGE_MARGIN;
        targetY = 32 + Math.random() * (h - 64);
        break;
    }
  }

  function startFollow() {
    mode = 'follow';
    followTimer = FOLLOW_DURATION;
    idleTime = 0;
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function endFollow() {
    mode = 'wander';
    // Run away — pick a target on the opposite side of the screen from cursor
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (mousePosX < w / 2) {
      targetX = w - 16 - Math.random() * EDGE_MARGIN;
    } else {
      targetX = 16 + Math.random() * EDGE_MARGIN;
    }
    if (mousePosY < h / 2) {
      targetY = h - 16 - Math.random() * EDGE_MARGIN;
    } else {
      targetY = 16 + Math.random() * EDGE_MARGIN;
    }
    idleTime = 0;
  }

  function init() {
    let nekoFile = "./oneko.gif";
    const curScript = document.currentScript;
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat;
    }

    nekoEl.id = "oneko";
    nekoEl.ariaHidden = true;
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "fixed";
    nekoEl.style.pointerEvents = "auto";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
    nekoEl.style.zIndex = 2147483647;
    nekoEl.style.cursor = "pointer";
    nekoEl.style.backgroundImage = `url(${nekoFile})`;

    document.body.appendChild(nekoEl);

    document.addEventListener("mousemove", function (event) {
      mousePosX = event.clientX;
      mousePosY = event.clientY;
    });

    nekoEl.addEventListener("click", function () {
      startFollow();
    });

    pickNewTarget();
    window.requestAnimationFrame(onAnimationFrame);
  }

  let lastFrameTimestamp;

  function onAnimationFrame(timestamp) {
    if (!nekoEl.isConnected) return;
    if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name, frame) {
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;

    // In wander mode, pick a new target after idling
    if (mode === 'wander' && idleTime > 30 && Math.floor(Math.random() * 30) === 0) {
      pickNewTarget();
      idleTime = 0;
      resetIdleAnimation();
      return;
    }

    if (
      idleTime > 10 &&
      Math.floor(Math.random() * 200) === 0 &&
      idleAnimation == null
    ) {
      let availableIdleAnimations = ["sleeping", "scratchSelf"];
      if (nekoPosX < 32) availableIdleAnimations.push("scratchWallW");
      if (nekoPosY < 32) availableIdleAnimations.push("scratchWallN");
      if (nekoPosX > window.innerWidth - 32) availableIdleAnimations.push("scratchWallE");
      if (nekoPosY > window.innerHeight - 32) availableIdleAnimations.push("scratchWallS");
      idleAnimation =
        availableIdleAnimations[Math.floor(Math.random() * availableIdleAnimations.length)];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) resetIdleAnimation();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdleAnimation();
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function frame() {
    frameCount += 1;

    // Follow mode: track cursor, count down
    if (mode === 'follow') {
      followTimer -= 1;
      if (followTimer <= 0) {
        endFollow();
        return;
      }
      targetX = mousePosX;
      targetY = mousePosY;
    }

    const diffX = nekoPosX - targetX;
    const diffY = nekoPosY - targetY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < nekoSpeed || distance < 48) {
      idle();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    let direction;
    direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
    nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  init();
})();
