// The composition. render(t) sets every animated property from the time
// alone, so any frame can be drawn in any order (scrubbing, frame export).
(() => {
  const TM = window.TIMING;
  const FPS = TM.fps;
  const FRAMES = Math.round(TM.duration * FPS);
  const W = 1080;
  const H = 1920;

  const params = new URLSearchParams(location.search);
  const RENDER = params.has("render");
  const LANG = params.get("lang") || "en";

  const copy = resolveCopy(window.COPY, LANG);

  function resolveCopy(all, lang) {
    const base = all.en;
    const loc = all[lang] || base;
    const pick = (key) => loc[key] ?? base[key];
    const marks = {};
    for (const kind of Object.keys(base.marks)) {
      marks[kind] = { ...base.marks[kind], ...((loc.marks || {})[kind] || {}) };
    }
    return {
      dir: loc.dir || "ltr",
      intro: pick("intro"),
      card: pick("card"),
      headline: pick("headline"),
      subline: pick("subline"),
      groups: { ...base.groups, ...(loc.groups || {}) },
      marks,
      cabinet: pick("cabinet"),
      outro: pick("outro"),
      end: pick("end"),
    };
  }

  const fill = (template, n) => template.replace("{n}", String(n));

  // ---- Easing and physics -------------------------------------------------

  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, p) => a + (b - a) * p;
  const outExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
  const inExpo = (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10));
  const outCubic = (p) => 1 - Math.pow(1 - p, 3);
  const outQuint = (p) => 1 - Math.pow(1 - p, 5);
  const inQuad = (p) => p * p;

  // Damped spring from 0 to 1 (underdamped when damping < 1).
  function spring(t, freq, damping) {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * freq;
    const wd = w * Math.sqrt(1 - damping * damping);
    const decay = Math.exp(-damping * w * t);
    return (
      1 - decay * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t))
    );
  }

  // A coin settling after impact: decaying oscillation.
  const wobble = (t, amp, freq, decay) =>
    t <= 0 ? 0 : amp * Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t);

  // Free fall from height h onto a floor with restitution e.
  // Returns the height above the floor and the time since first impact.
  function fall(t, h, g, e) {
    const t0 = Math.sqrt((2 * h) / g);
    if (t < t0) return { height: h - 0.5 * g * t * t, since: -1, t0 };
    let v = g * t0 * e;
    let tt = t - t0;
    const since = tt;
    while (v > 40) {
      const flight = (2 * v) / g;
      if (tt < flight) return { height: v * tt - 0.5 * g * tt * tt, since, t0 };
      tt -= flight;
      v *= e;
    }
    return { height: 0, since, t0 };
  }

  // ---- DOM helpers --------------------------------------------------------

  const $ = (sel) => document.querySelector(sel);
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  const show = (node, on) => {
    node.style.visibility = on ? "inherit" : "hidden";
  };

  // Centre of an element in the coordinates of a positioned ancestor,
  // ignoring transforms (so it works while the preview is scaled).
  function centreIn(node, ancestor) {
    let x = node.offsetWidth / 2;
    let y = node.offsetHeight / 2;
    let n = node;
    while (n && n !== ancestor) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return { x, y };
  }

  // ---- Coins --------------------------------------------------------------
  // Disc and shade tones of each coin, as in packages/design-tokens/marks.

  const COIN_TONES = {
    mvp: ["#FFC233", "#C98F0A"],
    clutch: ["#FF4D3D", "#A8261A"],
    mr_ice: ["#8EDBFF", "#3A9BD0"],
    let_him_cook: ["#FF8A2A", "#C45E0E"],
    great_wall: ["#22C3B5", "#137F75"],
    comeback_king: ["#8B5CFF", "#5A33C2"],
    sayed_malek: ["#B9A3FF", "#7F65D6"],
    dynamo: ["#B6F23A", "#7FB51A"],
    smash_machine: ["#FF4FD8", "#B81F99"],
    underdog: ["#3B6CFF", "#1F42B8"],
    good_game: ["#FF6B5A", "#C23D2E"],
    mr_fumble: ["#FF8FB8", "#D1527F"],
  };

  const ARC_ON_DISC = "M0,50 C13.6,11.4 86.4,11.4 100,50";

  // A coin with thickness: a stack of shade discs between two faces, plus two
  // edge bands so it reads solid when seen edge-on. The back carries the
  // Temba arc. Build at the largest size it will be shown and scale down.
  function makeCoin(kind, size) {
    const [disc, shade] = COIN_TONES[kind];
    const thick = Math.max(4, Math.round(size * 0.075));
    const root = el("div", "coin");
    root.style.width = root.style.height = `${size}px`;
    const body = el("div", "coin-body");
    root.append(body);

    const slices = 18;
    for (let i = 0; i < slices; i++) {
      const z = -thick / 2 + (thick * (i + 0.5)) / slices;
      const slice = el("div", "coin-slice");
      slice.style.background = shade;
      slice.style.transform = `translateZ(${z.toFixed(2)}px)`;
      body.append(slice);
    }
    const bandY = el("div", "coin-band");
    Object.assign(bandY.style, {
      background: shade,
      width: `${thick}px`,
      height: `${size}px`,
      left: `${(size - thick) / 2}px`,
      top: "0px",
      transform: "rotateY(90deg)",
    });
    const bandX = el("div", "coin-band");
    Object.assign(bandX.style, {
      background: shade,
      width: `${size}px`,
      height: `${thick}px`,
      left: "0px",
      top: `${(size - thick) / 2}px`,
      transform: "rotateX(90deg)",
    });
    body.append(bandY, bandX);

    const front = el("div", "coin-face");
    front.style.transform = `translateZ(${thick / 2}px)`;
    const img = new Image();
    img.src = `coins/${kind.replace(/_/g, "-")}.svg`;
    const imgSize = (size * 120) / 108;
    Object.assign(img.style, {
      width: `${imgSize}px`,
      height: `${imgSize}px`,
      left: `${-(size * 6) / 108}px`,
      top: `${-(size * 6) / 108}px`,
    });
    front.append(img);

    const back = el("div", "coin-face");
    back.style.transform = `rotateY(180deg) translateZ(${thick / 2}px)`;
    back.innerHTML = `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="50" r="50" fill="${disc}"/><path d="${ARC_ON_DISC}" fill="none" stroke="${shade}" stroke-width="7"/></svg>`;

    body.append(front, back);
    return { root, body, size, img };
  }

  function poseCoin(
    coin,
    { x, y, s = 1, rx = 0, ry = 0, rz = 0, visible = true },
  ) {
    coin.root.style.visibility = visible ? "inherit" : "hidden";
    coin.root.style.transform = `translate(${(x - coin.size / 2).toFixed(2)}px, ${(y - coin.size / 2).toFixed(2)}px) scale(${s.toFixed(4)})`;
    coin.body.style.transform = `rotateZ(${rz.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }

  function resultMark(won) {
    return won
      ? `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="#000"/><path d="M6,50 C18,16 82,16 94,50" fill="none" stroke="#fff" stroke-width="5"/></svg>`
      : `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43" fill="none" stroke="#000" stroke-width="3"/><path d="M6,50 C18,16 82,16 94,50" fill="none" stroke="#000" stroke-width="3"/></svg>`;
  }

  // ---- Build --------------------------------------------------------------

  const stage = $("#stage");
  stage.setAttribute("dir", copy.dir);
  stage.setAttribute("lang", LANG);
  document.documentElement.lang = LANG;

  const S = {
    s1: $("#s1"),
    s2: $("#s2"),
    s3: $("#s3"),
    s4: $("#s4"),
    s5: $("#s5"),
    s6: $("#s6"),
  };

  // Scene 1: the intro line, one word per eighth note. Its full stop becomes
  // the circle that opens onto the result card.
  const introP = $("#intro p");
  const introWords = [];
  let introDot = null;
  copy.intro.split(" ").forEach((word, i, all) => {
    if (i > 0) introP.append(document.createTextNode(" "));
    const span = el("span", "word");
    const last = i === all.length - 1;
    const stop = last ? word.match(/[.。؟?!]$/) : null;
    if (stop) {
      span.append(document.createTextNode(word.slice(0, -1)));
      introDot = el("span", "dot");
      introDot.setAttribute("aria-label", stop[0]);
      span.append(introDot);
    } else {
      span.textContent = word;
    }
    introP.append(span);
    introWords.push(span);
  });

  // Scene 2: the result card.
  const card = copy.card;
  const headline = $("#headline");
  const headlineLines = copy.headline.split("\n").map((line) => {
    const wrap = el("span", "line");
    const inner = el("span", null, line);
    wrap.append(inner);
    headline.append(wrap);
    return inner;
  });
  const subline = $("#subline");
  subline.textContent = copy.subline;
  $("#card-played").textContent = card.played;
  $("#card-format").textContent = card.format;
  $("#card-sets").textContent = card.sets;
  $("#card-venue").textContent = card.venue;

  const sides = $("#card-sides");
  const seats = [];
  [0, 1].forEach((side) => {
    const col = el("div", "side");
    const head = el("div", "side-head");
    head.innerHTML = resultMark(side === 0);
    head.append(el("span", null, side === 0 ? card.won : card.lost));
    col.append(head);
    card.players.slice(side * 2, side * 2 + 2).forEach((p) => {
      const seat = el("div", "seat");
      const avatar = el("div", "avatar", p.initials);
      const text = el("div");
      const role = el("div", "seat-role muted", p.role);
      text.append(el("div", "seat-name", p.name), role);
      seat.append(avatar, text);
      col.append(seat);
      seats.push({ avatar, role, player: p });
    });
    sides.append(col);
  });

  const cardEl = $("#card");
  const cardParts = [...cardEl.querySelectorAll(".card-part")];
  const cardRule = cardEl.querySelector(".card-rule");
  const cardBorder = $("#card-border rect");
  const stampRing = $("#stamp-ring");
  const stampCircle = stampRing.querySelector("circle");
  const s2Inner = $("#s2-inner");
  const mvpCoin = makeCoin("mvp", 600);
  s2Inner.append(mvpCoin.root);

  // Scene 3: the montage, one mark per beat, alternating black and white.
  const MONTAGE = [
    "clutch",
    "mr_ice",
    "let_him_cook",
    "great_wall",
    "comeback_king",
    "sayed_malek",
  ];
  const GROUP = {
    clutch: "anyone",
    mr_ice: "anyone",
    let_him_cook: "teammate",
    great_wall: "opponent",
    comeback_king: "opponent",
    sayed_malek: "teammate",
  };
  const montage = MONTAGE.map((kind, i) => {
    const seg = el("div", `mark ${i % 2 === 0 ? "on-black" : "on-white"}`);
    const coin = makeCoin(kind, 560);
    const text = el("div", "mark-text");
    const group = el("div", "mark-group muted", copy.groups[GROUP[kind]]);
    const name = el("div", "mark-name display", copy.marks[kind].name);
    const desc = el("div", "mark-desc muted", copy.marks[kind].description);
    text.append(group, name, desc);
    seg.append(coin.root, text);
    S.s3.append(seg);
    return { kind, seg, coin, text, group, name, desc };
  });

  // Scene 4: the cabinet. Counts add up to the 11 Marks received; MVPs are
  // counted apart, as in the app.
  const CABINET = [
    ["mvp", 2],
    ["clutch", 3],
    ["mr_ice", 2],
    ["let_him_cook", 1],
    ["great_wall", 1],
    ["comeback_king", 1],
    ["sayed_malek", 1],
    ["dynamo", 2],
    ["smash_machine", 0],
    ["underdog", 0],
    ["good_game", 0],
    ["mr_fumble", 0],
  ];
  const cab = copy.cabinet;
  $("#cab-avatar").textContent = cab.initials;
  $("#cab-player-name").textContent = cab.player;
  $("#cab-player-sport").textContent = cab.sport;
  $("#cab-title").textContent = cab.title;
  const cabReceived = $("#cab-received");
  const cabGrid = $("#cab-grid");
  const cabCoinLayer = $("#cab-coins");
  const cells = CABINET.map(([kind, count], i) => {
    const cell = el("div", "cell");
    const slot = el("div", "slot");
    slot.innerHTML = `<svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true"><circle cx="80" cy="80" r="79" fill="url(#hatch)" stroke="#E6E6E6" stroke-width="2"/></svg>`;
    const name = el("div", "cell-name", copy.marks[kind].name);
    const countEl = el("div", "cell-count muted", cab.notYet);
    cell.append(slot, name, countEl);
    cabGrid.append(cell);
    return {
      kind,
      count,
      cell,
      slot,
      countEl,
      row: Math.floor(i / 3),
      col: i % 3,
    };
  });
  const drops = cells
    .filter((c) => c.count > 0)
    .map((c, k) => {
      const coin = makeCoin(c.kind, 160);
      cabCoinLayer.append(coin.root);
      return { ...c, coin, land: TM.dropFirst + k * TM.dropStep };
    });

  // Scene 5
  const outro = $("#outro");
  const outroLines = copy.outro.map((line) => {
    const node = el("div", "line display", line);
    outro.append(node);
    return node;
  });

  // Scene 6
  const endLogo = $("#end-logo");
  const endDisc = endLogo.querySelector("circle");
  const endArc = endLogo.querySelector("path");
  const endWordmark = $("#end-wordmark");
  const endTagline = $("#end-tagline");
  const endDownload = $("#end-download");
  endWordmark.textContent = copy.end.wordmark;
  endTagline.textContent = copy.end.tagline;
  endDownload.textContent = copy.end.download;
  const arcLength = endArc.getTotalLength();
  endArc.style.strokeDasharray = `${arcLength}`;

  // Measurements, taken once fonts have loaded.
  const M = {};
  function measure() {
    show(S.s1, true);
    show(S.s2, true);
    show(S.s4, true);
    M.dot = introDot ? centreIn(introDot, stage) : { x: W / 2, y: H / 2 };
    M.dotRadius = introDot ? introDot.offsetWidth / 2 : 0;
    M.seat = centreIn(seats[0].avatar, s2Inner);
    M.cardW = cardEl.offsetWidth;
    M.cardH = cardEl.offsetHeight;
    const r = 28;
    cardBorder.setAttribute("x", "1");
    cardBorder.setAttribute("y", "1");
    cardBorder.setAttribute("width", String(M.cardW - 2));
    cardBorder.setAttribute("height", String(M.cardH - 2));
    cardBorder.setAttribute("rx", String(r));
    cardBorder.setAttribute("fill", "none");
    cardBorder.setAttribute("stroke", "#E6E6E6");
    cardBorder.setAttribute("stroke-width", "2");
    M.cardPerimeter = 2 * (M.cardW + M.cardH - 4) - (8 - 2 * Math.PI) * r;
    cardBorder.style.strokeDasharray = `${M.cardPerimeter}`;
    stampRing.setAttribute("width", String(W));
    stampRing.setAttribute("height", String(H));
    stampCircle.setAttribute("cx", String(M.seat.x));
    stampCircle.setAttribute("cy", String(M.seat.y));
    for (const d of drops) d.at = centreIn(d.slot, S.s4);
  }

  // ---- Render -------------------------------------------------------------

  function render(t) {
    show(S.s1, t < TM.irisEnd);
    show(S.s2, t >= TM.irisStart && t < TM.montageStart);
    show(S.s3, t >= TM.pushOut && t < TM.cabinetStart);
    show(S.s4, t >= TM.cabinetStart && t < TM.outroStart);
    show(S.s5, t >= TM.outroStart && t < TM.endStart);
    show(S.s6, t >= TM.endStart);

    if (t < TM.irisEnd) renderIntro(t);
    if (t >= TM.irisStart && t < TM.montageStart) renderCard(t);
    if (t >= TM.pushOut && t < TM.cabinetStart) renderMontage(t);
    if (t >= TM.cabinetStart && t < TM.outroStart) renderCabinet(t);
    if (t >= TM.outroStart && t < TM.endStart) renderOutro(t);
    if (t >= TM.endStart) renderEnd(t);
  }

  function renderIntro(t) {
    introWords.forEach((w, i) => {
      show(w, t >= TM.introFirstWord + i * TM.introWordStep);
    });
  }

  function renderCard(t) {
    // The full stop opens into the card.
    const ip = prog(t, TM.irisStart, TM.irisEnd - TM.irisStart);
    const radius = lerp(M.dotRadius, 2300, inExpo(ip));
    S.s2.style.clipPath =
      t < TM.irisEnd
        ? `circle(${radius.toFixed(1)}px at ${M.dot.x}px ${M.dot.y}px)`
        : "none";

    // Push out to the montage.
    const pp = inExpo(prog(t, TM.pushOut, TM.montageStart - TM.pushOut));
    const land = TM.coinLand;
    const since = t - land;
    const shake = since > 0 ? wobble(since, 12, 11, 13) : 0;
    s2Inner.style.transform = `translateY(${(-H * pp + shake).toFixed(2)}px)`;

    // Card build: the hairline draws, content cuts on by eighth notes.
    const b = TM.cardBuild;
    const border = outCubic(prog(t, b, 0.6));
    cardBorder.style.strokeDashoffset = `${(M.cardPerimeter * (1 - border)).toFixed(1)}`;
    const partOn = [b, b + 0.25, b + 0.25, b + 0.5];
    cardParts.forEach((part, i) => show(part, t >= partOn[i]));
    cardRule.style.transform = `scaleX(${outExpo(prog(t, b + 0.5, 0.4)).toFixed(4)})`;

    // The card starts centred and settles down as the headline arrives.
    const shift = -200 * (1 - outExpo(prog(t, TM.headline - 0.05, 0.55)));
    cardEl.style.transform = `translateY(${shift.toFixed(2)}px)`;
    const seat = { x: M.seat.x, y: M.seat.y + shift };

    // The MVP coin falls away from the camera onto the first seat.
    const target = 132 / mvpCoin.size;
    const start = { x: 980, y: -420 };
    if (t < TM.coinEnter) {
      poseCoin(mvpCoin, { x: 0, y: 0, visible: false });
    } else if (t < land) {
      const p = prog(t, TM.coinEnter, land - TM.coinEnter);
      const g = p * p;
      const depth = lerp(target, 1, g); // 1 = resting on the card
      const s = target / depth;
      const approach = (1 - g) * Math.sqrt(target / depth);
      poseCoin(mvpCoin, {
        x: seat.x + (start.x - seat.x) * approach,
        y: seat.y + (start.y - seat.y) * approach,
        s,
        ry: 1080 * Math.pow(1 - p, 2),
        rx: 28 * (1 - p),
        rz: -20 * (1 - p),
      });
    } else {
      const press =
        1 - 0.12 * Math.exp(-since * 16) * Math.cos(2 * Math.PI * 5 * since);
      poseCoin(mvpCoin, {
        x: seat.x,
        y: seat.y,
        s: target * press,
        rx: wobble(since, 18, 4.2, 6),
        ry: wobble(since + 0.06, 9, 4.2, 6),
      });
    }

    show(seats[0].avatar, t < land);
    const mvpOn = t >= land + 0.1;
    seats[0].role.textContent = mvpOn ? card.mvp : seats[0].player.role;
    seats[0].role.classList.toggle("is-mvp", mvpOn);
    seats[0].role.classList.toggle("muted", !mvpOn);

    // The stamp ring: one hairline circle out from the impact.
    if (since > 0 && since < 0.55) {
      const rp = since / 0.55;
      stampRing.style.visibility = "inherit";
      stampCircle.setAttribute("cy", seat.y.toFixed(1));
      stampCircle.setAttribute("r", (72 + 210 * outExpo(rp)).toFixed(1));
      stampCircle.setAttribute("stroke-width", lerp(4, 1, rp).toFixed(2));
      stampCircle.style.opacity = (1 - rp).toFixed(3);
    } else {
      stampRing.style.visibility = "hidden";
    }

    // Headline and subline after the stamp.
    headlineLines.forEach((line, i) => {
      const hp = outExpo(prog(t, TM.headline + i * 0.08, 0.5));
      line.style.transform = `translateY(${((1 - hp) * 115).toFixed(2)}%)`;
    });
    show(subline, t >= TM.subline);
  }

  function renderMontage(t) {
    const x0 = W / 2;
    const y0 = 820;
    montage.forEach((m, i) => {
      const start = TM.montageStart + i * TM.montageStep;
      const visible =
        t >= (i === 0 ? TM.pushOut : start) && t < start + TM.montageStep;
      show(m.seg, visible);
      if (!visible) return;
      const u = t - start;
      const L = TM.montageLand[i];
      const pose = montagePose(m.kind, u, L, x0, y0);
      const shake = pose.shake || 0;
      const push = 1 + 0.045 * prog(u, L, TM.montageStep - L);
      poseCoin(m.coin, {
        ...pose,
        y: pose.y + shake,
        s: (pose.s ?? 1) * push,
        visible: u >= 0,
      });
      m.text.style.transform = `translateY(${shake.toFixed(2)}px)`;

      const on = u >= L;
      show(m.group, on);
      show(m.name, on);
      show(m.desc, u >= L + 2 / FPS);
      const np = outExpo(prog(u, L, 0.3));
      m.name.style.transform = `scale(${lerp(1.07, 1, np).toFixed(4)})`;
    });
  }

  function montagePose(kind, u, L, x0, y0) {
    const after = u - L;
    switch (kind) {
      case "clutch": {
        // Tossed up from below, flipping end over end.
        const p = outCubic(prog(u, 0, L));
        return {
          x: x0,
          y: lerp(H + 420, y0, p),
          s: lerp(0.75, 1, p),
          rx: 720 * (1 - p) + wobble(after, 12, 3.6, 7),
        };
      }
      case "mr_ice": {
        // Glides in on ice and stops dead, no wobble.
        const p = outQuint(prog(u, 0, L));
        return { x: lerp(W + 420, x0, p), y: y0, ry: lerp(-70, 0, p) };
      }
      case "let_him_cook": {
        // Spun up like a top, slowing to face front.
        const p = prog(u, 0, L);
        return {
          x: x0,
          y: y0,
          s: lerp(0.25, 1, outExpo(p)),
          ry: 1440 * (1 - outCubic(p)),
          rx: wobble(after, 10, 3.2, 6),
        };
      }
      case "great_wall": {
        // Dropped from above, lands heavy, shakes the frame, no bounce.
        const p = inQuad(prog(u, 0, L));
        return {
          x: x0,
          y: lerp(-420, y0, p),
          rx: wobble(after, 6, 5, 9),
          shake: wobble(after, 22, 10, 11),
        };
      }
      case "comeback_king": {
        // Overshoots, turns around, comes back.
        const sp = spring(u, 1.7, 0.4);
        return {
          x: lerp(-420, x0, sp),
          y: y0,
          ry: 180 * (1 - sp),
          rz: 10 * (1 - sp),
        };
      }
      case "sayed_malek": {
        // Late, slow, rolls in and nods off.
        const p = outCubic(prog(u, 0, L));
        const x = lerp(W + 420, x0, p);
        const roll = ((x - x0) / 280) * (180 / Math.PI);
        return { x, y: y0, rz: roll + wobble(after, 7, 0.9, 1.6) };
      }
      default:
        return { x: x0, y: y0 };
    }
  }

  function renderCabinet(t) {
    const start = TM.cabinetStart;
    cells.forEach((c) => {
      show(c.cell, t >= start + (c.row + c.col) * (1 / FPS));
    });
    let received = 0;
    for (const d of drops) {
      const g = 11000;
      const h = d.at.y + 240;
      const t0 = Math.sqrt((2 * h) / g);
      const local = t - (d.land - t0);
      if (local < 0) {
        poseCoin(d.coin, { x: 0, y: 0, visible: false });
        d.countEl.textContent = cab.notYet;
        d.countEl.classList.add("muted");
        show(d.slot, true);
        continue;
      }
      const f = fall(local, h, g, 0.22);
      const p = clamp(local / t0);
      const landed = f.since >= 0;
      poseCoin(d.coin, {
        x: d.at.x,
        y: d.at.y - f.height,
        s: landed ? 1 : 1 + 0.3 * (1 - p),
        rx: landed ? wobble(f.since, 14, 4, 7) : 540 * (1 - p),
        ry: landed ? wobble(f.since + 0.05, 6, 4, 7) : 0,
      });
      show(d.slot, !landed);
      d.countEl.textContent = landed ? fill(cab.count, d.count) : cab.notYet;
      d.countEl.classList.toggle("muted", !landed);
      if (landed && d.kind !== "mvp") received += d.count;
    }
    cabReceived.textContent = fill(cab.received, received);
  }

  function renderOutro(t) {
    const rtl = copy.dir === "rtl";
    outroLines.forEach((line, i) => {
      const on = TM.outroStart + i * TM.outroStep;
      const p = outExpo(prog(t, on, 0.22));
      const hidden = ((1 - p) * 100).toFixed(2);
      line.style.clipPath = rtl
        ? `inset(0 0 0 ${hidden}%)`
        : `inset(0 ${hidden}% 0 0)`;
      show(line, t >= on);
      const next = TM.outroStart + (i + 1) * TM.outroStep;
      const dimmed = i < outroLines.length - 1 && t >= next;
      line.style.color = dimmed ? "var(--grey)" : "var(--white)";
    });
  }

  function renderEnd(t) {
    const e = TM.endStart;
    const s = spring(t - e, 2.1, 0.5);
    endDisc.setAttribute("r", (44 * s).toFixed(2));
    const draw = outCubic(prog(t, e + 0.12, 0.45));
    endArc.style.strokeDashoffset = `${(arcLength * (1 - draw)).toFixed(2)}`;
    endArc.style.visibility = t >= e + 0.12 ? "inherit" : "hidden";
    const wp = outExpo(prog(t, e + 0.2, 0.6));
    const track = lerp(0.5, 0.18, wp);
    endWordmark.style.opacity = wp.toFixed(3);
    endWordmark.style.letterSpacing = `${track.toFixed(4)}em`;
    endWordmark.style.textIndent = `${track.toFixed(4)}em`;
    show(endTagline, t >= e + 0.5);
    show(endDownload, t >= e + 0.75);
  }

  // ---- Playback -----------------------------------------------------------

  function renderFrame(f) {
    render(f / FPS);
  }

  const ready = (async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .concat([mvpCoin.img])
        .map((img) =>
          img.complete
            ? null
            : new Promise((r) =>
                img.addEventListener("load", r, { once: true }),
              ),
        ),
    );
    measure();
    render(0);
  })();

  window.renderFrame = renderFrame;
  window.__ready = ready;
  window.__frames = FRAMES;

  if (RENDER) {
    document.body.classList.add("render");
    return;
  }

  // Preview: fit the stage to the window, play in sync with the music.
  const frame = $("#frame");
  function fit() {
    const scale = Math.min(
      window.innerWidth / W,
      (window.innerHeight - 56) / H,
    );
    stage.style.transform = `scale(${scale})`;
    frame.style.width = `${W * scale}px`;
    frame.style.height = `${H * scale}px`;
    frame.style.margin = "0 auto";
  }
  window.addEventListener("resize", fit);
  fit();

  const audio = $("#music");
  const playBtn = $("#play");
  const scrub = $("#scrub");
  const clock = $("#clock");
  const langBtn = $("#lang");
  scrub.max = String(FRAMES - 1);
  langBtn.textContent = LANG === "en" ? "عربي" : "English";
  langBtn.addEventListener("click", () => {
    params.set("lang", LANG === "en" ? "ar" : "en");
    location.search = params.toString();
  });

  let playing = false;
  let clockStart = 0;
  let timeAtStart = 0;
  const now = () =>
    audio.readyState > 0 && !audio.paused
      ? audio.currentTime
      : timeAtStart + (performance.now() - clockStart) / 1000;

  function draw(t) {
    const f = Math.min(FRAMES - 1, Math.floor(t * FPS));
    render(f / FPS);
    scrub.value = String(f);
    clock.textContent = `${(f / FPS).toFixed(2)}s · f${f}`;
  }
  function tick() {
    if (!playing) return;
    let t = now();
    if (t >= TM.duration) {
      t = 0;
      audio.currentTime = 0;
      timeAtStart = 0;
      clockStart = performance.now();
    }
    draw(t);
    requestAnimationFrame(tick);
  }
  function play() {
    playing = true;
    playBtn.textContent = "Pause";
    timeAtStart = Number(scrub.value) / FPS;
    clockStart = performance.now();
    audio.currentTime = timeAtStart;
    audio.play().catch(() => {});
    requestAnimationFrame(tick);
  }
  function pause() {
    playing = false;
    playBtn.textContent = "Play";
    audio.pause();
  }
  playBtn.addEventListener("click", () => (playing ? pause() : play()));
  scrub.addEventListener("input", () => {
    pause();
    draw(Number(scrub.value) / FPS);
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      playing ? pause() : play();
    }
  });
  const startFrame = Number(params.get("frame"));
  ready.then(() => {
    if (startFrame) {
      scrub.value = String(startFrame);
      draw(startFrame / FPS);
    }
  });
})();
