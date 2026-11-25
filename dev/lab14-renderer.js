/* Approved PIXEL LAB 14.1 renderer. Uses only SHA-256 verified production layers. */
(() => {
  const data = globalThis.LAB14_DATA;
  if (!data) return;

  const units = ["red", "blue", "yellow", "green"];
  const labels = { red: "ACE", blue: "BRAZE", yellow: "CHASE", green: "DEL-17" };
  const handNumber = { rock: 0, scissors: 1, paper: 2, rainbow: 0 };
  // The source's steps(1,end) holds the last keyframe value until the loop ends.
  const idleHeadChannels = {
    red: [4800, .95, 1.12],
    blue: [3600, .92, 1.18],
    green: [3400, .88, 1.32],
  };
  const imageBySource = new Map();
  const canvases = new WeakMap();
  let ready = false;

  function allSources() {
    const sources = [data.allySprite];
    for (const poses of Object.values(data.rigs)) {
      for (const pose of Object.values(poses)) sources.push(pose.newFrame, ...pose.armor);
    }
    for (const weapons of Object.values(data.weapons)) sources.push(...Object.values(weapons));
    return [...new Set(sources.filter(Boolean))];
  }

  function load(source) {
    const image = new Image();
    image.src = source;
    imageBySource.set(source, image);
    return typeof image.decode === "function" ? image.decode() : new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
  }

  function poseFor(color, pose, hand) {
    const n = handNumber[hand] ?? -1;
    if (pose === "stand") pose = "idle";
    if (color === "red") {
      if (pose === "attack" && n === 2) return "idle";
      if (pose === "attack" && n === 1) return "win";
      return pose;
    }
    if (color === "blue" || color === "yellow") {
      if (pose === "idle") return "stance";
      if (pose === "attack" && n === 1) return "sword";
      if ((pose === "charge" || pose === "attack") && n === 2) return "shoot";
      return pose;
    }
    if (color === "green") {
      if (pose === "idle") return "stance";
      if (pose === "charge" || pose === "attack") return n === 1 ? "sword" : "shoot";
    }
    return pose;
  }

  function lostArmor(hp) {
    return hp >= 4 ? [] : hp === 3 ? [8] : hp === 2 ? [8, 11] : [8, 11, 10, 0];
  }

  function weaponFor(color, pose, hand) {
    if (color === "green" && pose === "shoot" && handNumber[hand] === 2) return data.weapons.green.sniper;
    return data.weapons[color]?.[pose] || null;
  }

  // PIXEL LAB 14.1 CSS keyframes, measured from entry into the idle pose.
  function idleFrame(color, elapsed) {
    const channel = idleHeadChannels[color];
    let headBrightness = 1;
    if (channel) {
      const [period, begin, brightness] = channel;
      const phase = (elapsed % period) / period;
      if (phase >= begin) headBrightness = brightness;
    }
    const servo = color === "yellow" && elapsed % 1300 >= 650 ||
      color === "green" && elapsed % 4800 >= 4176;
    return { headBrightness, servo: servo ? -1 : 0 };
  }

  function drawSource(context, source, offsetY = 0, brightness = 1) {
    const image = imageBySource.get(source);
    if (!image) return;
    if (brightness !== 1) context.filter = `brightness(${brightness})`;
    context.drawImage(image, 0, offsetY);
    if (brightness !== 1) context.filter = "none";
  }

  function renderUnit(canvas, options = {}) {
    const color = options.color || canvas.dataset.color;
    if (!units.includes(color)) return false;
    const hp = Math.max(0, Math.min(5, Number(options.hp ?? canvas.dataset.hp ?? 5)));
    const hand = options.hand ?? canvas.dataset.hand ?? "";
    const requested = options.pose || canvas.dataset.pose || "idle";
    const pose = poseFor(color, requested, hand);
    const rig = data.rigs[color][pose] || data.rigs[color].idle;
    const context = canvas.getContext("2d");
    const side = Number(options.side ?? canvas.dataset.side ?? 0);
    const { servo, headBrightness } = requested === "idle" ? idleFrame(color, options.idleElapsed ?? 0) :
      { servo: 0, headBrightness: 1 };
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, 48, 48);
    context.imageSmoothingEnabled = false;
    if (side) context.setTransform(-1, 0, 0, 1, 48, 0);
    drawSource(context, rig.newFrame);
    const gone = new Set(lostArmor(hp));
    rig.armor.forEach((source, slot) => {
      if (gone.has(slot)) return;
      const servoSlot = requested === "idle" && ((color === "yellow" && (slot === 8 || slot === 11)) || (color === "green" && (slot === 5 || slot === 12)));
      drawSource(context, source, servoSlot ? servo : 0, slot === 9 ? headBrightness : 1);
    });
    const weapon = weaponFor(color, pose, hand);
    if (weapon && hp > 0) drawSource(context, weapon, requested === "idle" && color === "green" ? servo : 0);
    context.setTransform(1, 0, 0, 1, 0, 0);
    return { color, pose, hp, armor: 13 - gone.size, frame: true, weapon: Boolean(weapon) };
  }

  function graphic({ color, hp = 5, side = 0, pose = "idle", hand = "", fallback = "" }) {
    if (!units.includes(color)) return fallback;
    return `<span class="lab14-model" data-unit="${color}">${fallback}<canvas class="mech mech-canvas lab14-canvas" width="48" height="48" data-color="${color}" data-pose="${pose}" data-hand="${hand}" data-hp="${hp}" data-side="${side}" aria-label="${labels[color]} LAB14.1" hidden></canvas></span>`;
  }

  function attackEffect({ color, hand, side = 0 }) {
    if (!units.includes(color)) return "";
    const n = handNumber[hand];
    if (n === undefined) return "";
    const direction = side === 1 ? " side-1" : " side-0";
    if (color === "green") {
      const kind = ["rifle", "missile", "sniper"][n];
      const rounds = n === 1 ? 3 : 1;
      return `<span class="lab14-attack lab14-green-shot ${kind}${direction}"><i></i>${Array.from({ length: rounds }, (_, index) => `<b style="--shot-delay:${index * 50}ms;--shot-arc:${n === 1 ? -18 - index * 9 : 0}px"></b>`).join("")}${n === 2 ? "<em></em>" : ""}</span>`;
    }
    const tone = ` tone-${color}`;
    if (color === "yellow" && n === 0) return `<span class="lab14-attack lab14-dash${tone}${direction}"><i></i><b></b><em></em></span>`;
    if (n === 0) return `<span class="lab14-attack lab14-punch${tone}${direction}"><i></i><b></b><em></em></span>`;
    if (n === 1) return `<span class="lab14-attack lab14-slash${tone}${direction}"><svg viewBox="0 0 120 100" aria-hidden="true"><path d="M20 86 Q105 68 98 7 Q128 63 74 84 Q46 96 20 86Z"/><path d="M35 83 Q105 66 98 7 Q117 67 72 82Z"/></svg></span>`;
    return `<span class="lab14-attack lab14-beam${tone}${direction}"><i></i><b></b><em></em></span>`;
  }

  function allyEffect(side) {
    const dir = side === 0 ? 1 : -1;
    return `<span class="lab14-ally side-${side}" style="--ally-dir:${dir}" aria-hidden="true"><span class="ally-caption">G-17 · 僚機突撃</span><span class="ally-flight"><img src="${data.allySprite}" alt=""><i></i></span><span class="ally-explosion"><i></i><em></em>${Array.from({ length: 18 }, (_, i) => `<b style="--a:${i * 20}deg;--r:${26 + i % 5 * 11}px"></b>`).join("")}</span></span>`;
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!ready || document.hidden) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const canvas of document.querySelectorAll(".lab14-canvas")) {
      const { color, pose, hand, hp, side } = canvas.dataset;
      const previous = canvases.get(canvas);
      const start = previous?.color === color && previous.pose === pose ? previous.start : now;
      const delay = Number(canvas.closest?.(".pilot")?.dataset.hitDelay || 0);
      const displayedPose = !reduced && pose === "hit" && now-start < delay ? "idle" : pose;
      const idleElapsed = !reduced && displayedPose === "idle" ? now - start : 0;
      const { servo, headBrightness } = idleFrame(color, idleElapsed);
      const signature = [color, pose, displayedPose, hand, hp, side, servo, headBrightness].join(":");
      if (previous?.signature === signature) continue;
      renderUnit(canvas, { idleElapsed, pose: displayedPose });
      canvases.set(canvas, { color, pose, start, signature });
      canvas.hidden = false;
      canvas.parentElement?.classList.add("lab14-ready");
    }
  }

  globalThis.LAB14 = Object.freeze({
    graphic,
    attackEffect,
    allyEffect,
    renderUnit,
    idleFrame,
    poseFor,
    lostArmor,
    sourceSha256: data.sourceSha256,
    slots: data.slots.slice(),
  });

  if (typeof document === "undefined" || typeof Image === "undefined" || typeof requestAnimationFrame !== "function") return;
  Promise.all(allSources().map(load)).then(() => {
    ready = true;
    document.documentElement?.classList.add("lab14-loaded");
    requestAnimationFrame(tick);
  }).catch(error => {
    document.documentElement?.classList.add("lab14-load-failed");
    console.warn("LAB14.1 renderer fallback", error);
  });
})();
