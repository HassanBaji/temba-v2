"use strict";

// Every frame is a pure function of t (seconds): renderAt(t) rebuilds the
// stage from the timeline, so a frame renders the same whatever came before.

if (!window.TL) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "timeline.json", false);
  xhr.send();
  window.TL = JSON.parse(xhr.responseText);
}
const TL = window.TL;
const BEAT = 60 / TL.bpm;
const at = (beat) => beat * BEAT;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, start, dur) => clamp((t - start) / dur);
const eo = (x) => 1 - Math.pow(1 - x, 3);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const inScene = (t, name) => t >= at(TL.scenes[name][0]) && t < at(TL.scenes[name][1]);

// RTL wipe: the solid layer arrives from the right edge.
const wipe = (p) => `clip-path:inset(0 0 0 ${((1 - p) * 100).toFixed(3)}%);`;
const caretOn = (t) => Math.floor(t / (BEAT / 2)) % 2 === 0;
const caret = (t, show) => (show && caretOn(t) ? `<span class="caret"></span>` : "");
const chars = (text) => Array.from(text);
const typed = (text, t, start, every) =>
  chars(text)
    .slice(0, Math.floor(clamp((t - start) / every, 0, chars(text).length)))
    .join("");

const icon = {
  plus: (c, s = 40) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="${c}" stroke-width="2.6" stroke-linecap="square" fill="none"/></svg>`,
  share: (c, s = 40) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/></svg>`,
  check: (c, s = 40) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.8"><path d="M4 12.5l5 5L20 6.5"/></svg>`,
  phone: (c, s = 38) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18h3"/></svg>`,
  ball: (disc, arc, s, draw = 1) => {
    const len = 104;
    return `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="${disc}"/><path d="M6,50 C18,16 82,16 94,50" fill="none" stroke="${arc}" stroke-width="9" stroke-dasharray="${len}" stroke-dashoffset="${(len * (1 - draw)).toFixed(2)}"/></svg>`;
  },
};

// Mark coins in black and white: the brief allows no colour.
const coin = {
  goal: (s) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="#000"/><rect x="28" y="42" width="64" height="42" fill="#fff"/><path d="M36 42 V84 M44 42 V84 M52 42 V84 M60 42 V84 M68 42 V84 M76 42 V84 M84 42 V84 M28 50 H92 M28 58 H92 M28 66 H92 M28 74 H92" stroke="#6e6e6e" stroke-width="1.6"/><path d="M26 86 V40 H94 V86" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M18 88 H102" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="74" cy="72" r="15" fill="#000" stroke="#fff" stroke-width="3"/><polygon points="74.0,66.0 79.7,70.1 77.5,76.9 70.5,76.9 68.3,70.1" fill="#fff"/></svg>`,
  mvp: (s) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="#000"/><path d="M30 80 L26 44 L45 58 L60 32 L75 58 L94 44 L90 80 Z" fill="#fff"/><rect x="29" y="82" width="62" height="10" rx="2" fill="#fff"/><circle cx="26" cy="43" r="5" fill="#fff"/><circle cx="60" cy="31" r="6" fill="#fff"/><circle cx="94" cy="43" r="5" fill="#fff"/><polygon points="60.0,54.0 62.3,60.0 68.7,60.4 63.7,64.5 65.4,70.7 60.0,67.2 54.6,70.7 56.3,64.5 51.3,60.4 57.7,60.0" fill="#000"/></svg>`,
};

function ring(t, start, size = 150) {
  const p = prog(t, start, 0.42);
  if (t < start || p >= 1) return "";
  const d = 50 + eo(p) * size;
  return `<div class="ring" style="width:${d}px;height:${d}px;left:50%;top:50%;margin:${-d / 2}px 0 0 ${-d / 2}px;opacity:${(1 - p) * 0.9}"></div>`;
}

function press(t, start) {
  const p = prog(t, start, 0.2);
  if (t < start || p >= 1) return 1;
  return 1 - 0.04 * Math.sin(p * Math.PI);
}

// A screen pushed in RTL navigation enters from the left.
function enter(t, start) {
  const p = eo(prog(t, start, 0.28));
  return `opacity:${p};transform:translateX(${(-70 * (1 - p)).toFixed(1)}px);`;
}

/* ---------- Fields: hatched, then active, then solid ---------- */

function segments(options, selected, t, selAt, solid) {
  const on = t >= selAt;
  return options
    .map(
      (o, i) =>
        `<div class="seg-opt ${on && i === selected ? "on" : ""}">${o}${
          !solid && i === selected ? ring(t, selAt, 130) : ""
        }</div>`,
    )
    .join("");
}

function field(t, f, activeBeat, doneAfter) {
  const a = at(activeBeat);
  const d = at(activeBeat + doneAfter);
  const lt = t - a;
  const tight = f.tight ? "tight" : "";
  let base;
  if (t < a) {
    base = `<div class="layer idle hatch ${tight}"></div>`;
  } else {
    const hatchOut = 1 - prog(t, a, 0.16);
    base =
      `<div class="layer active ${tight}">${f.content(t, lt, false, t < d)}</div>` +
      (hatchOut > 0
        ? `<div class="layer idle hatch" style="opacity:${hatchOut}"></div>`
        : "");
  }
  const wp = eio(prog(t, d, 0.3));
  const solid =
    wp > 0
      ? `<div class="layer solid ${tight}" style="${wipe(wp)}">${f.content(t, lt, true, false)}</div>`
      : "";
  const label = f.label ? `<div class="flabel">${f.label}</div>` : "";
  return `<div class="field">${label}<div class="fbox">${base}${solid}</div></div>`;
}

const signupFields = [
  {
    label: "رقم الجوال",
    content: (t, lt, solid, editing) =>
      `<span class="ltr num" style="font-size:42px"><span class="muted">+973&nbsp;</span>${typed(
        "3912 4471",
        lt,
        0.2,
        0.1,
      )}${caret(t, editing)}</span>`,
  },
  {
    label: "رمز التحقق",
    tight: true,
    content: (t, lt) =>
      chars("481903")
        .map((digit, i) => {
          const on = lt >= 0.45 + i * 0.07;
          return `<div class="slot" style="${on ? "border-color:currentColor" : ""}">${on ? digit : ""}</div>`;
        })
        .join(""),
  },
  {
    label: "الاسم والصورة",
    content: (t, lt, solid, editing) => {
      const photo = eio(prog(lt, 0.15, 0.22));
      const disc = solid ? "var(--paper)" : "var(--ink)";
      const ink = solid ? "var(--ink)" : "var(--paper)";
      return `<div class="avatar hatch" style="width:66px;height:66px;border:2px solid var(--rule)"><div class="avatar abs" style="inset:-2px;width:66px;height:66px;background:${disc};color:${ink};font-size:32px;${wipe(photo)}">خ</div></div><span>${typed("خالد", lt, 0.55, 0.13)}</span>${caret(t, editing && lt > 0.4)}`;
    },
  },
  {
    label: "الرياضة",
    tight: true,
    content: (t, lt, solid) => segments(["كرة قدم", "بادل"], 0, lt, 0.6, solid),
  },
  {
    label: "المركز المفضّل",
    tight: true,
    content: (t, lt, solid) => segments(["حارس", "دفاع", "وسط", "هجوم"], 2, lt, 0.7, solid),
  },
  {
    label: "المستوى",
    tight: true,
    content: (t, lt, solid) => segments(["مبتدئ", "هاوٍ", "تنافسي", "محترف"], 2, lt, 0.7, solid),
  },
];

function signupScreen(t) {
  const fields = signupFields
    .map((f, i) => field(t, f, TL.signup.fields[i], TL.signup.doneAfter))
    .join("");
  return `<div class="screen" style="${enter(t, at(TL.scenes.signup[0]))}">${fields}</div>`;
}

/* ---------- Group ---------- */

const members = [
  ["خالد", "وسط"],
  ["أحمد", "حارس"],
  ["علي", "دفاع"],
  ["يوسف", "وسط"],
  ["محمد", "هجوم"],
  ["حسين", "دفاع"],
  ["عبدالله", "وسط"],
  ["سلمان", "هجوم"],
  ["جاسم", "دفاع"],
  ["فهد", "وسط"],
];
const initial = (name) => chars(name)[0];

function emptyList(t, label, tapAt) {
  const s = press(t, at(tapAt));
  return `<div class="btn primary" style="transform:scale(${s})">${icon.plus("#fff")}<span>${label}</span>${ring(t, at(tapAt), 220)}</div>
    <div class="placeholder hatch"></div><div class="placeholder hatch"></div><div class="placeholder hatch"></div>`;
}

function groupImage(size, solidP) {
  return `<div class="avatar hatch" style="width:${size}px;height:${size}px;border-radius:28px;border:2px solid var(--rule)"><div class="abs" style="inset:-2px;background:var(--ink);display:flex;align-items:center;justify-content:center;border-radius:28px;color:var(--paper);font-weight:700;font-size:${size * 0.42}px;${wipe(solidP)}">ك</div></div>`;
}

function groupScreen(t) {
  const g = TL.group;
  if (t < at(g.create)) {
    return `<div class="screen" style="${enter(t, at(TL.scenes.group[0]))}">${emptyList(t, "مجموعة جديدة", g.tapNew)}</div>`;
  }
  if (t < at(g.page)) {
    const lt = t - at(g.create);
    const done = at(g.nameDone);
    const wp = eio(prog(t, done, 0.3));
    const name = (solid) =>
      `<span class="b" style="font-size:52px">${typed("كورة الجمعة", lt, 0.35, 0.13)}</span>${caret(t, !solid && t < done)}`;
    return `<div class="screen" style="${enter(t, at(g.create))}">
      <div class="eyebrow" style="margin-bottom:34px">مجموعة جديدة</div>
      <div style="margin-bottom:34px">${groupImage(200, wp)}</div>
      <div class="fbox" style="height:120px"><div class="layer active">${name(false)}</div>${
        wp > 0 ? `<div class="layer solid" style="${wipe(wp)}">${name(true)}</div>` : ""
      }</div></div>`;
  }

  const joinAt = [-1e9, ...g.joins.map(at)];
  const count = joinAt.filter((j) => t >= j).length;
  let y = 0;
  const rows = [];
  for (let i = members.length - 1; i >= 0; i--) {
    if (t < joinAt[i]) continue;
    const h = 108 * eo(prog(t, joinAt[i], 0.24));
    const fill = eio(prog(t, joinAt[i] + 0.12, 0.2));
    rows.push(`<div class="row" style="top:${y.toFixed(1)}px;height:${h.toFixed(1)}px;opacity:${clamp(h / 60)}">
      <div class="avatar hatch" style="width:74px;height:74px;border:2px solid var(--rule)"><div class="avatar abs" style="inset:-2px;width:74px;height:74px;background:var(--ink);color:var(--paper);font-size:34px;${wipe(fill)}">${initial(members[i][0])}</div></div>
      <span style="font-size:38px">${members[i][0]}</span>
      <span class="muted" style="font-size:30px;margin-right:auto">${members[i][1]}</span></div>`);
    y += h;
  }
  const shared = t >= at(g.tapShare) + 0.22;
  return `<div class="screen" style="${enter(t, at(g.page))}">
    <div style="display:flex;align-items:center;gap:30px">
      ${groupImage(140, 1)}
      <div><div class="b" style="font-size:54px;line-height:1.25">كورة الجمعة</div>
      <div class="muted" style="font-size:30px;margin-top:6px">الأعضاء <span class="num" style="color:var(--ink);margin-right:8px">${count}</span></div></div>
    </div>
    <div style="display:flex;gap:18px;margin-top:40px">
      <div class="btn outline" style="flex:1;font-size:32px;transform:scale(${press(t, at(g.tapPhone))})">${icon.phone("#000")}<span>أضف برقم الجوال</span>${ring(t, at(g.tapPhone), 220)}</div>
      <div class="btn primary" style="flex:1;font-size:32px;transform:scale(${press(t, at(g.tapShare))})">${shared ? icon.check("#fff") : icon.share("#fff")}<span>شارك الرابط</span>${ring(t, at(g.tapShare), 220)}</div>
    </div>
    <div style="position:relative;margin-top:30px;height:650px;overflow:hidden;border-top:2px solid var(--rule)">${rows.join("")}</div>
  </div>`;
}

/* ---------- Game ---------- */

const gameFields = [
  {
    label: "التاريخ والوقت",
    content: (t, lt, solid, editing) => `<span>${typed("الجمعة، 8:00 م", lt, 0.2, 0.08)}</span>${caret(t, editing)}`,
  },
  {
    label: "الملعب",
    content: (t, lt, solid, editing) => `<span>${typed("ملعب النخيل", lt, 0.2, 0.09)}</span>${caret(t, editing)}`,
  },
  {
    label: "",
    tight: true,
    content: (t, lt, solid) =>
      solid
        ? `<span style="padding:0 14px">خماسي، 10 مقاعد</span>`
        : segments(["خماسي", "سباعي"], 0, lt, 0.6, false),
  },
];

// Seats fill alternately, black bibs then white bibs.
const seatOrder = members.map((m, k) => ({ name: m[0], team: k % 2, slot: Math.floor(k / 2) }));

function teamRows(t, back) {
  const seats = TL.game.seats.map(at);
  return [0, 1]
    .map((team) => {
      const cells = [0, 1, 2, 3, 4]
        .map((slot) => {
          const k = seatOrder.findIndex((s) => s.team === team && s.slot === slot);
          const s = seatOrder[k];
          const f = t >= seats[k] ? eio(prog(t, seats[k], 0.14)) : 0;
          const pop = t >= seats[k] ? 1 + 0.07 * Math.sin(Math.PI * prog(t, seats[k], 0.22)) : 1;
          const disc = back ? "var(--paper)" : "var(--ink)";
          const ink = back ? "var(--ink)" : "var(--paper)";
          const hatchClass = back ? "hatch-ink" : "hatch";
          return `<div><div class="seat ${hatchClass}" style="transform:scale(${pop})"><div class="abs" style="inset:0;background:${disc};color:${ink};display:flex;align-items:center;justify-content:center;${wipe(f)}">${initial(s.name)}</div></div>
            <div class="seatname" style="opacity:${f}">${s.name}</div></div>`;
        })
        .join("");
      return `<div style="margin-top:30px"><div style="font-size:30px;margin-bottom:14px;${back ? "" : "color:var(--muted)"}">${team === 0 ? "أسود" : "أبيض"}</div>
        <div style="display:flex;justify-content:space-between">${cells}</div></div>`;
    })
    .join("");
}

function cardFace(t, back) {
  const filled = TL.game.seats.map(at).filter((s) => t >= s).length;
  const eyebrow = back
    ? `<span class="b" style="display:inline-flex;align-items:center;gap:14px"><span style="width:18px;height:18px;background:#fff;display:inline-block"></span>قادمة</span>`
    : `<span class="muted">خماسي، 10 مقاعد</span>`;
  return `<div class="face ${back ? "back" : "front"}">
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:30px;height:44px">${eyebrow}
      <span class="ltr num" style="font-size:46px">${filled}/10</span></div>
    <div class="b" style="font-size:56px;line-height:1.3;margin-top:22px">كورة الجمعة</div>
    <div style="font-size:31px;margin-top:6px;${back ? "color:#9a9a9a" : "color:var(--muted)"}">الجمعة، 8:00 م، ملعب النخيل</div>
    ${teamRows(t, back)}
  </div>`;
}

function gameScreen(t) {
  const g = TL.game;
  if (t < at(g.form)) {
    return `<div class="screen" style="${enter(t, at(TL.scenes.game[0]))}">${emptyList(t, "مباراة جديدة", g.tapNew)}</div>`;
  }
  if (t < at(g.card)) {
    const fields = gameFields.map((f, i) => field(t, f, g.fields[i], g.doneAfter)).join("");
    return `<div class="screen" style="${enter(t, at(g.form))}"><div class="eyebrow" style="margin-bottom:30px">مباراة جديدة</div>${fields}</div>`;
  }
  const flip = 180 * eio(prog(t, at(g.flip), 0.5));
  const lift = Math.sin((flip / 180) * Math.PI);
  const shared = t >= at(g.tapShare) + 0.22;
  const btnOut = 1 - prog(t, at(g.flip), 0.3);
  return `<div class="screen" style="${enter(t, at(g.card))}">
    <div class="card3d" style="left:48px;right:48px;top:52px;height:760px">
      <div class="card-inner" style="transform:rotateY(${flip.toFixed(2)}deg) scale(${1 - 0.05 * lift})">${cardFace(t, false)}${cardFace(t, true)}</div>
    </div>
    <div class="btn primary" style="position:absolute;left:48px;right:48px;top:850px;opacity:${btnOut};transform:scale(${press(t, at(g.tapShare))})">${shared ? icon.check("#fff") : icon.share("#fff")}<span>شارك الرابط</span>${ring(t, at(g.tapShare), 240)}</div>
  </div>`;
}

/* ---------- Play ---------- */

const formBefore = ["none", "won", "lost", "won", "won", "lost", "won", "lost", "won", "won"];

function formSlot(kind, fillP) {
  if (kind === "won") return `<div class="formslot" style="background:var(--ink)"></div>`;
  if (kind === "lost") return `<div class="formslot" style="border:4px solid var(--ink)"></div>`;
  return `<div class="formslot hatch" style="border:2px solid var(--rule)"><div class="abs" style="inset:-2px;background:var(--ink);${wipe(fillP)}"></div></div>`;
}

function markRow(t, start, coinSvg, name, player) {
  if (t < at(start)) return `<div style="height:132px"></div>`;
  const p = eo(prog(t, at(start), 0.35));
  const w = eio(prog(t, at(start) + 0.12, 0.3));
  return `<div style="height:132px;display:flex;align-items:center;gap:30px;border-bottom:2px solid var(--rule)">
    <div style="transform:scale(${p});flex:none">${coinSvg}</div>
    <div style="${wipe(w)}"><div class="b" style="font-size:40px;line-height:1.3">${name}</div><div class="muted" style="font-size:30px">${player}</div></div>
  </div>`;
}

function playScreen(t) {
  const p = TL.play;
  const sp = eo(prog(t, at(p.score[0]), at(p.score[1]) - at(p.score[0])));
  const black = Math.floor(sp * 7 + 1e-6);
  const white = Math.floor(clamp(sp * 1.15) * 5 + 1e-6);
  const formP = eio(prog(t, at(p.formUpdate), 0.3));
  const won = t >= at(p.formUpdate) + 0.15 ? 7 : 6;
  const formIn = eo(prog(t, at(p.form), 0.3));
  const scoreCol = (label, value) =>
    `<div style="flex:1;text-align:center"><div class="muted" style="font-size:32px">${label}</div><div class="num" style="font-size:230px;line-height:1.05">${value}</div></div>`;
  return `<div class="screen" style="${enter(t, at(TL.scenes.play[0]))}">
    <div style="display:flex;align-items:center;padding-bottom:26px;border-bottom:2px solid var(--rule)">
      ${scoreCol("أسود", black)}<div class="num muted" style="font-size:110px;padding-top:40px">–</div>${scoreCol("أبيض", white)}
    </div>
    ${markRow(t, p.goalMachine, coin.goal(104), "ماكينة أهداف", "محمد")}
    ${markRow(t, p.mvp, coin.mvp(104), "أفضل لاعب", "عبدالله")}
    <div style="margin-top:44px;opacity:${formIn};transform:translateY(${(1 - formIn) * 24}px)">
      <div style="display:flex;justify-content:space-between;font-size:32px;margin-bottom:22px"><span>آخر 10</span><span class="muted">${won} فوز، 3 خسارة</span></div>
      <div style="display:flex;justify-content:space-between">${formBefore.map((k) => formSlot(k, formP)).join("")}</div>
    </div>
  </div>`;
}

/* ---------- Chrome ---------- */

function stopwatch(t) {
  const w = TL.stopwatch;
  const run = at(w.stop) - at(w.start);
  const elapsed = clamp(t - at(w.start), 0, run);
  const value = Math.floor((elapsed / run) * w.stopValue + 1e-6);
  const mm = String(Math.floor(value / 60)).padStart(2, "0");
  const ss = String(value % 60).padStart(2, "0");
  const stopP = eio(prog(t, at(w.stop), 0.3));
  const pop = t >= at(w.stop) ? 1 + 0.05 * Math.sin(Math.PI * prog(t, at(w.stop), 0.25)) : 1;
  return `<div id="watch" class="abs" style="transform:scale(${pop});transform-origin:left top">${mm}:${ss}</div>
    <div class="abs hatch" style="left:66px;top:300px;width:600px;height:12px;border-radius:3px;border:1.5px solid var(--rule)"><div class="solidfill" style="inset:-1.5px;${wipe(stopP)}"></div></div>`;
}

const headlines = {
  signup: "سجّل حسابك.",
  group: "جمّع ربعك.",
  game: "حدّد المباراة.",
};

function headline(t) {
  for (const name of Object.keys(headlines)) {
    if (inScene(t, name)) {
      const p = eio(prog(t, at(TL.scenes[name][0]), 0.3));
      return `<div id="headline" class="abs" style="${wipe(p)}">${headlines[name]}</div>`;
    }
  }
  if (inScene(t, "play")) {
    const words = ["العب.", "تابع.", "كرّر."];
    return `<div id="headline" class="abs">${words
      .map((w, i) => `<span style="visibility:${t >= at(TL.play.words[i]) ? "visible" : "hidden"}">${w}</span>`)
      .join(" ")}</div>`;
  }
  return "";
}

function progress(t) {
  const marks = [TL.signup.progress, TL.group.progress, TL.game.progress, TL.play.progress];
  return `<div id="progress" class="abs">${marks
    .map((m) => `<div class="seg hatch"><div class="solidfill" style="inset:-1.5px;${wipe(eio(prog(t, at(m), 0.35)))}"></div></div>`)
    .join("")}</div>`;
}

/* ---------- Hook and end card ---------- */

function hook(t) {
  if (t < at(TL.hook.cut)) {
    const words = ["40", "رسالة", "عشان", "تجمع", "10", "لاعبين؟"];
    const html = words
      .map((w, i) => {
        const s = at(TL.hook.words[i]);
        const on = t >= s;
        const y = on ? (1 - eo(prog(t, s, 0.16))) * 18 : 0;
        return `<span style="display:inline-block;visibility:${on ? "visible" : "hidden"};transform:translateY(${y.toFixed(1)}px)">${w}</span>`;
      });
    const lines = `${html.slice(0, 3).join(" ")}<br>${html.slice(3).join(" ")}`;
    return `<div class="abs" style="inset:0;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:center;padding:0 40px">
      <div class="b" style="font-size:118px;line-height:1.4;text-align:center;white-space:nowrap">${lines}</div></div>`;
  }
  return `${stopwatch(t)}<div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center">
    <div class="b" style="font-size:150px;line-height:1.3;text-align:center">خلّها 40 ثانية.</div></div>`;
}

function badge(iconSvg, small, big) {
  return `<div class="badge">${iconSvg}<div><div style="font-size:24px;line-height:1.3">${small}</div><div class="b" style="font-size:40px;line-height:1.2">${big}</div></div></div>`;
}

function endCard(t) {
  const e = TL.end;
  const disc = eo(prog(t, at(e.disc), 0.4));
  const arc = eio(prog(t, at(e.arc), 0.55));
  const logo = eio(prog(t, at(e.logo), 0.4));
  const tag = eo(prog(t, at(e.tagline), 0.35));
  const badges = eo(prog(t, at(e.badges), 0.4));
  const apple = `<svg width="54" height="54" viewBox="0 0 24 24" fill="#fff"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8zM14.1 5.8c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"/></svg>`;
  const play = `<svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"><path d="M4.5 2.8 L19.5 12 L4.5 21.2 Z"/><path d="M4.5 2.8 L13.6 15.6 M4.5 21.2 L13.6 8.4"/></svg>`;
  return `<div class="abs" style="inset:0;background:var(--paper)">
    <div class="abs" style="left:0;right:0;top:470px;display:flex;justify-content:center">
      <div style="transform:scale(${disc})">${icon.ball("#000", "#fff", 270, arc)}</div></div>
    <div class="abs" style="left:0;right:0;top:800px;text-align:center;direction:ltr;font-family:Sora;font-weight:700;font-size:164px;letter-spacing:0.05em;line-height:1;${wipe(logo)}">TEMBA</div>
    <div class="abs b" style="left:0;right:0;top:1010px;text-align:center;font-size:78px;opacity:${tag};transform:translateY(${(1 - tag) * 20}px)">عِش اللعبة</div>
    <div class="abs" style="left:0;right:0;top:1250px;text-align:center;opacity:${badges};transform:translateY(${(1 - badges) * 24}px)">
      <div class="muted" style="font-size:32px;margin-bottom:26px">حمّل التطبيق</div>
      <div style="display:flex;justify-content:center;gap:24px">${badge(apple, "حمّله من", "آب ستور")}${badge(play, "احصل عليه من", "جوجل بلاي")}</div>
    </div>
  </div>`;
}

/* ---------- Frame ---------- */

function frame(t) {
  if (inScene(t, "hook")) return hook(t);
  if (t >= at(TL.scenes.end[0])) return endCard(t);
  let screen = "";
  if (inScene(t, "signup")) screen = signupScreen(t);
  else if (inScene(t, "group")) screen = groupScreen(t);
  else if (inScene(t, "game")) screen = gameScreen(t);
  else if (inScene(t, "play")) screen = playScreen(t);
  const panelIn = eo(prog(t, at(TL.scenes.signup[0]), 0.35));
  return `${stopwatch(t)}${headline(t)}
    <div id="panel" class="abs" style="opacity:${panelIn};transform:translateY(${(1 - panelIn) * 60}px)">${screen}</div>
    ${progress(t)}`;
}

const stage = document.getElementById("stage");
window.renderAt = (t) => {
  stage.innerHTML = frame(t);
};

// Opened directly in a browser, the page gets a scrubber for review.
if (!window.__RENDER__) {
  const input = document.createElement("input");
  input.type = "range";
  input.id = "scrub";
  input.min = 0;
  input.max = TL.duration;
  input.step = 1 / TL.fps;
  input.value = 0;
  input.oninput = () => window.renderAt(Number(input.value));
  document.body.appendChild(input);
}
document.fonts.ready.then(() => window.renderAt(0));
