/* Morrow — charts and page behavior. No dependencies. */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var C = {
    ink: "#121211",
    ink2: "#3a3a37",
    muted: "#6b6b65",
    faint: "#9b9a93",
    line: "#e7e6e0",
    line2: "#d8d7cf",
    accent: "#c4532e",
  };

  // ---------- helpers ----------

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function text(parent, x, y, str, attrs) {
    var t = el("text", Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rng) {
    var u = 1 - rng(), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function scale(d0, d1, r0, r1) {
    return function (v) { return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0); };
  }

  function linePath(pts) {
    var d = "";
    for (var i = 0; i < pts.length; i++) d += (i ? "L" : "M") + pts[i][0].toFixed(1) + "," + pts[i][1].toFixed(1);
    return d;
  }

  function areaPath(top, bottom) {
    var d = linePath(top);
    for (var i = bottom.length - 1; i >= 0; i--) d += "L" + bottom[i][0].toFixed(1) + "," + bottom[i][1].toFixed(1);
    return d + "Z";
  }

  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  function svgFor(container, w, h) {
    container.innerHTML = "";
    return el("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img", "aria-label": container.getAttribute("data-label") || "" }, container);
  }

  function drawIn(path, delay) {
    if (reduceMotion) return;
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 2.4s cubic-bezier(0.45, 0.05, 0.2, 1) " + (delay || 0) + "s";
    path.style.strokeDashoffset = 0;
  }

  function fadeIn(node, delay) {
    if (reduceMotion) return;
    node.style.opacity = 0;
    node.style.transition = "opacity 0.9s ease " + (delay || 0) + "s";
    node.getBoundingClientRect();
    node.style.opacity = 1;
  }

  // ---------- hero: longitudinal trajectory ----------

  var HERO = (function () {
    var rng = mulberry32(7);
    var T = 24, CP = 17.2, DETECT = 18.3, WARM = 3, SIGMA = 0.78;

    function truth(t) {
      return 0.34 * Math.sin(t * 0.92 + 0.4) + 0.18 * Math.sin(t * 2.4 + 1.1) + 0.08 * Math.sin(t * 5.1) - 1.85 * sigmoid((t - (CP + 0.9)) * 1.5);
    }

    // sessions: engagement grows over time
    var sessions = [];
    for (var w = 0; w < T; w++) {
      var rate = 2 + (w / T) * 3.6;
      var n = Math.round(rate + gauss(rng) * 0.6);
      for (var j = 0; j < n; j++) {
        var t = w + rng();
        sessions.push({ t: t, z: truth(t) + gauss(rng) * 0.26 });
      }
    }
    sessions.sort(function (a, b) { return a.t - b.t; });

    var grid = [];
    for (var g = 0; g <= T * 10; g++) {
      var tt = g / 10, count = 0;
      for (var s = 0; s < sessions.length; s++) if (sessions[s].t <= tt) count++;
      grid.push({ t: tt, z: truth(tt), ci: 0.14 + 0.95 / Math.sqrt(1 + count) });
    }

    return { T: T, CP: CP, DETECT: DETECT, WARM: WARM, SIGMA: SIGMA, sessions: sessions, grid: grid, truth: truth };
  })();

  // Scroll-driven: the story controller calls container.__setT(t) to reveal weeks 0..t.
  function renderHero(container) {
    var W = Math.max(300, container.clientWidth);
    var narrow = W < 560;
    var H = Math.round(Math.min(440, Math.max(250, W * 0.58)));
    var m = { l: narrow ? 30 : 44, r: narrow ? 8 : 18, t: 34, b: 30 };
    var svg = svgFor(container, W, H);
    var d = HERO;
    var x = scale(0, d.T, m.l, W - m.r);
    var y = scale(-2.9, 1.7, H - m.b, m.t);
    var uid = "h" + Math.random().toString(36).slice(2, 7);

    var defs = el("defs", {}, svg);
    var pat = el("pattern", { id: uid + "hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: C.line, "stroke-width": 1.2 }, pat);
    var clip = el("clipPath", { id: uid + "clip" }, defs);
    var clipRect = el("rect", { x: 0, y: 0, width: 0, height: H }, clip);

    // grid
    for (var wk = 0; wk <= d.T; wk += 4) {
      el("line", { x1: x(wk), x2: x(wk), y1: m.t, y2: H - m.b, stroke: C.line, "stroke-width": 1 }, svg);
      text(svg, x(wk), H - m.b + 18, (narrow ? "" : "wk ") + wk, { "text-anchor": "middle" });
    }
    [-2, -1, 0, 1].forEach(function (v) {
      text(svg, m.l - 8, y(v) + 3.5, (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + "σ", { "text-anchor": "end" });
    });

    // warm-up region
    el("rect", { x: x(0), y: m.t, width: x(d.WARM) - x(0), height: H - m.b - m.t, fill: "url(#" + uid + "hatch)" }, svg);
    if (!narrow) text(svg, x(0) + 8, m.t + 14, "baseline warm-up", {});

    // personalized baseline band, estimated after warm-up
    var bandTop = [], bandBot = [];
    for (var i = 0; i <= 100; i++) {
      var t = d.WARM + (i / 100) * (d.T - d.WARM);
      var widen = t < d.WARM + 3 ? 1 + (d.WARM + 3 - t) * 0.12 : 1;
      bandTop.push([x(t), y(d.SIGMA * widen)]);
      bandBot.push([x(t), y(-d.SIGMA * widen)]);
    }
    var band = el("g", { opacity: 0 }, svg);
    el("path", { d: areaPath(bandTop, bandBot), fill: "rgba(18,18,17,0.045)" }, band);
    el("path", { d: linePath(bandTop), fill: "none", stroke: C.line2, "stroke-dasharray": "3 3" }, band);
    el("path", { d: linePath(bandBot), fill: "none", stroke: C.line2, "stroke-dasharray": "3 3" }, band);
    el("line", { x1: x(d.WARM), x2: x(d.T), y1: y(0), y2: y(0), stroke: C.line2 }, band);
    if (!narrow) text(band, x(d.WARM) + 8, y(d.SIGMA) - 7, "personalized baseline  μᵤ ± σᵤ", {});

    // everything below is revealed left-to-right by the clip
    var live = el("g", { "clip-path": "url(#" + uid + "clip)" }, svg);

    var devTop = [], devBot = [];
    d.grid.forEach(function (p) {
      if (p.t >= d.CP && p.z < -d.SIGMA) { devTop.push([x(p.t), y(-d.SIGMA)]); devBot.push([x(p.t), y(p.z)]); }
    });
    if (devTop.length) el("path", { d: areaPath(devTop, devBot), fill: "rgba(196,83,46,0.09)" }, live);

    el("path", {
      d: areaPath(d.grid.map(function (p) { return [x(p.t), y(p.z + p.ci)]; }), d.grid.map(function (p) { return [x(p.t), y(p.z - p.ci)]; })),
      fill: "rgba(18,18,17,0.07)",
    }, live);

    d.sessions.forEach(function (s) {
      el("circle", { cx: x(s.t), cy: y(s.z), r: narrow ? 1.4 : 1.8, fill: C.faint, opacity: 0.75 }, live);
      el("line", { x1: x(s.t), x2: x(s.t), y1: H - m.b, y2: H - m.b - 5, stroke: C.faint, "stroke-width": 1 }, live);
    });

    el("path", {
      d: linePath(d.grid.map(function (p) { return [x(p.t), y(p.z)]; })),
      fill: "none", stroke: C.ink, "stroke-width": 1.6, "stroke-linejoin": "round", "stroke-linecap": "round",
    }, live);

    // change point, shown once detected
    var gCp = el("g", { opacity: 0, style: "transition: opacity .5s ease" }, svg);
    el("line", { x1: x(d.CP), x2: x(d.CP), y1: m.t - 6, y2: H - m.b, stroke: C.accent, "stroke-width": 1.2, "stroke-dasharray": "4 3" }, gCp);
    el("circle", { cx: x(d.DETECT), cy: y(d.truth(d.DETECT)), r: 4, fill: "#fff", stroke: C.accent, "stroke-width": 1.5 }, gCp);
    text(gCp, x(d.CP) - 8, m.t - 12, narrow ? "τ̂ = wk 17" : "τ̂ = wk 17 · sustained change", { "text-anchor": "end", class: "t-accent" });

    // referral marker, revealed by .is-connect on the figure
    var ref = el("g", { class: "ref-note" }, svg);
    var rx = x(d.DETECT), ry = y(d.truth(d.DETECT));
    el("path", { d: "M" + rx + "," + (ry + 6) + " V" + (H - m.b - 14), stroke: C.accent, "stroke-width": 1 }, ref);
    el("circle", { cx: rx, cy: H - m.b - 14, r: 2.5, fill: C.accent }, ref);
    text(ref, rx + 7, H - m.b - 10, narrow ? "referral" : "referral offered", { class: "t-accent" });

    // playhead
    var head = el("g", {}, svg);
    var headLine = el("line", { y1: m.t, y2: H - m.b, stroke: C.ink, "stroke-width": 1, opacity: 0.18 }, head);
    var headDot = el("circle", { r: 3.6, fill: C.ink }, head);

    var readout = document.querySelector("[data-readout='hero']");

    container.__setT = function (tNow) {
      tNow = Math.max(0, Math.min(d.T, tNow));
      clipRect.setAttribute("width", x(tNow) + 1);
      band.setAttribute("opacity", Math.max(0, Math.min(1, (tNow - 1) / (d.WARM + 1))));
      gCp.setAttribute("opacity", tNow >= d.DETECT ? 1 : 0);
      var p = d.grid[Math.round(tNow * 10)];
      headLine.setAttribute("x1", x(p.t)); headLine.setAttribute("x2", x(p.t));
      headDot.setAttribute("cx", x(p.t)); headDot.setAttribute("cy", y(p.z));
      head.setAttribute("opacity", tNow >= d.T ? 0 : 1);
      if (readout) {
        var status;
        if (p.t < d.WARM) status = "estimating baseline";
        else if (p.t >= d.CP && p.z < -d.SIGMA) status = '<span class="flag">sustained change</span>';
        else if (Math.abs(p.z) > d.SIGMA) status = "transient";
        else status = "within baseline";
        readout.innerHTML = "wk " + p.t.toFixed(1) + " · " + status;
      }
    };
    container.__setT(container.__t || 0);
  }

  // ---------- population vs within-person ----------

  var USERS = (function () {
    var rng = mulberry32(21);
    var defs = [
      { id: "A", mu: 1.05, drop: 1.35, at: 15.5 },
      { id: "B", mu: 0.05, drop: 0, at: 99 },
      { id: "C", mu: -1.35, drop: 0, at: 99 },
    ];
    return defs.map(function (u) {
      var pts = [];
      for (var t = 0.4; t < 24; t += 0.62 + rng() * 0.3) {
        var z = u.mu + 0.22 * Math.sin(t * 1.1 + u.mu * 3) + gauss(rng) * 0.17 - u.drop * sigmoid((t - u.at) * 2);
        pts.push({ t: t, z: z });
      }
      return Object.assign({ pts: pts }, u);
    });
  })();

  var THRESH = -0.95;

  function renderPopulation(container) {
    var W = Math.max(300, container.clientWidth);
    var H = Math.round(Math.max(240, Math.min(300, W * 0.56)));
    var m = { l: 14, r: 14, t: 18, b: 26 };
    var svg = svgFor(container, W, H);
    var x = scale(0, 24, m.l, W - m.r);
    var y = scale(-2.5, 2.1, H - m.b, m.t + 14);

    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: C.line }, svg);
    el("line", { x1: m.l, x2: W - m.r, y1: y(THRESH), y2: y(THRESH), stroke: C.ink, "stroke-dasharray": "4 3", opacity: 0.6 }, svg);
    text(svg, m.l, y(THRESH) - 6, "global threshold", { class: "t-ink" });

    USERS.forEach(function (u) {
      u.pts.forEach(function (p) {
        var flagged = p.z < THRESH;
        el("circle", { cx: x(p.t), cy: y(p.z), r: 2.4, fill: flagged ? C.accent : C.faint, opacity: flagged ? 0.9 : 0.6 }, svg);
      });
    });

    // annotations sit in clear space with thin leaders to the data they describe
    var a = USERS[0], c = USERS[2];
    var aTail = a.pts.filter(function (p) { return p.t > 19; });
    var aMid = aTail[Math.floor(aTail.length / 2)];
    el("path", { d: "M" + x(aMid.t) + "," + (y(aMid.z) - 5) + " V" + (m.t + 14), stroke: C.faint, "stroke-width": 0.8 }, svg);
    text(svg, x(aMid.t) - 6, m.t + 10, "large drop, not flagged", { "text-anchor": "end" });
    var cMin = Math.min.apply(null, c.pts.map(function (p) { return p.z; }));
    text(svg, m.l, y(cMin) + 16, "flagged at their normal", { class: "t-accent" });
    text(svg, m.l, H - 8, "all users, pooled", {});
  }

  function renderWithin(container) {
    var W = Math.max(300, container.clientWidth);
    var H = Math.round(Math.max(240, Math.min(300, W * 0.56)));
    var m = { l: 14, r: 14, t: 6, b: 26 };
    var svg = svgFor(container, W, H);
    var x = scale(0, 24, m.l, W - m.r);
    var laneH = (H - m.t - m.b) / 3;

    USERS.forEach(function (u, i) {
      var top = m.t + i * laneH;
      var y = scale(u.mu - 1.9, u.mu + 0.7, top + laneH - 4, top + 22);
      var sd = 0.34;
      if (i) el("line", { x1: m.l, x2: W - m.r, y1: top, y2: top, stroke: C.line }, svg);
      el("rect", { x: x(0), y: y(u.mu + sd), width: x(24) - x(0), height: y(u.mu - sd) - y(u.mu + sd), fill: "rgba(18,18,17,0.05)" }, svg);
      el("line", { x1: x(0), x2: x(24), y1: y(u.mu), y2: y(u.mu), stroke: C.line2, "stroke-dasharray": "3 3" }, svg);
      var pts = u.pts.map(function (p) { return [x(p.t), y(p.z)]; });
      el("path", { d: linePath(pts), fill: "none", stroke: C.ink, "stroke-width": 1.3, "stroke-linejoin": "round" }, svg);
      u.pts.forEach(function (p) {
        var dev = p.z < u.mu - sd * 1.8 && p.t > u.at;
        if (dev) el("circle", { cx: x(p.t), cy: y(p.z), r: 2.6, fill: C.accent }, svg);
      });
      text(svg, m.l + 2, top + 15, "user " + u.id, { class: "t-ink" });
      var note = { A: ["change detected", "t-accent"], B: ["stable", ""], C: ["stable", ""] }[u.id];
      text(svg, W - m.r, top + 15, note[0], { "text-anchor": "end", class: note[1] });
    });
    text(svg, m.l, H - 8, "each user vs. their own baseline", {});
  }

  // ---------- research: baseline error vs sessions ----------

  function renderBaselineError(container) {
    var W = Math.max(300, container.clientWidth);
    var narrow = W < 520;
    var H = Math.round(Math.max(250, Math.min(340, W * 0.5)));
    var m = { l: 40, r: narrow ? 12 : 110, t: 20, b: 40 };
    var svg = svgFor(container, W, H);
    var N = 120;
    var x = scale(0, N, m.l, W - m.r);
    var y = scale(0, 1, H - m.b, m.t);

    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: C.line }, svg);
      text(svg, m.l - 8, y(v) + 3.5, v.toFixed(2), { "text-anchor": "end" });
    });
    [0, 20, 40, 60, 80, 100, 120].forEach(function (v) {
      text(svg, x(v), H - m.b + 18, String(v), { "text-anchor": "middle" });
    });
    text(svg, W - m.r, H - 6, "sessions observed", { "text-anchor": "end" });

    el("line", { x1: x(21), x2: x(21), y1: m.t, y2: H - m.b, stroke: C.ink, "stroke-dasharray": "3 3", opacity: 0.4 }, svg);
    text(svg, x(21) + 6, m.t + 12, "n₀ = 21", { class: "t-ink" });

    var series = [
      { name: "low disclosure", floor: 0.41, a: 1.9, color: C.faint },
      { name: "mid", floor: 0.26, a: 1.85, color: C.muted },
      { name: "high disclosure", floor: 0.11, a: 1.8, color: C.accent },
    ];
    series.forEach(function (s, i) {
      var pts = [];
      for (var n = 3; n <= N; n++) pts.push([x(n), y(Math.min(0.98, s.floor + s.a / Math.sqrt(n + 3) - 0.08))]);
      var p = el("path", { d: linePath(pts), fill: "none", stroke: s.color, "stroke-width": 1.6 }, svg);
      drawIn(p, i * 0.15);
      var last = pts[pts.length - 1];
      if (!narrow) text(svg, last[0] + 8, last[1] + 3.5, s.name, { fill: s.color });
    });
  }

  // ---------- research: run-length posterior ----------

  function renderRunLength(container) {
    var W = Math.max(300, container.clientWidth);
    var H = Math.round(Math.max(260, Math.min(320, W * 0.46)));
    var m = { l: 40, r: 14, t: 16, b: 36 };
    var svg = svgFor(container, W, H);
    var d = HERO;
    var x = scale(8, d.T, m.l, W - m.r);
    var split = m.t + (H - m.t - m.b) * 0.58;
    var y1 = scale(-2.9, 1.5, split - 10, m.t);
    var y2 = scale(0, 1, H - m.b, split + 12);

    el("line", { x1: m.l, x2: W - m.r, y1: split, y2: split, stroke: C.line }, svg);
    text(svg, m.l - 8, y1(0) + 3.5, "ẑ", { "text-anchor": "end" });
    text(svg, m.l - 8, y2(0.5) + 3.5, "P", { "text-anchor": "end" });

    var pts = d.grid.filter(function (p) { return p.t >= 8; });
    el("rect", { x: m.l, y: y1(d.SIGMA), width: W - m.l - m.r, height: y1(-d.SIGMA) - y1(d.SIGMA), fill: "rgba(18,18,17,0.045)" }, svg);
    el("path", { d: linePath(pts.map(function (p) { return [x(p.t), y1(p.z)]; })), fill: "none", stroke: C.ink, "stroke-width": 1.4 }, svg);

    // P(change in last w days): bars per session
    d.sessions.filter(function (s) { return s.t >= 8; }).forEach(function (s) {
      var dist = s.t - (d.CP + 0.3);
      var p = dist > 0 ? Math.min(0.97, 0.9 * Math.exp(-Math.pow((dist - 1.1) / 1.3, 2)) + 0.06) : 0.03 + 0.05 * Math.abs(Math.sin(s.t * 3));
      if (Math.abs(s.t - 11.6) < 0.4) p = 0.31; // a transient spike that does not persist
      var hot = p > 0.5;
      el("line", { x1: x(s.t), x2: x(s.t), y1: y2(0), y2: y2(p), stroke: hot ? C.accent : C.faint, "stroke-width": 2 }, svg);
    });
    el("line", { x1: m.l, x2: W - m.r, y1: y2(0.5), y2: y2(0.5), stroke: C.ink, "stroke-dasharray": "3 3", opacity: 0.35 }, svg);
    text(svg, W - m.r, y2(0.5) - 5, "α = 0.5", { "text-anchor": "end" });
    text(svg, x(11.6), y2(0.31) - 6, "transient", { "text-anchor": "middle" });

    for (var wk = 8; wk <= d.T; wk += 4) text(svg, x(wk), H - m.b + 18, "wk " + wk, { "text-anchor": "middle" });
  }

  // ---------- mount charts ----------

  var renderers = {
    hero: renderHero,
    population: renderPopulation,
    within: renderWithin,
    "baseline-error": renderBaselineError,
    "run-length": renderRunLength,
  };

  var charts = [].slice.call(document.querySelectorAll("[data-chart]"));

  function mount(node, animate) {
    var fn = renderers[node.getAttribute("data-chart")];
    if (fn) fn(node, animate);
    node.__w = node.clientWidth;
  }

  if ("IntersectionObserver" in window) {
    var chartIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !e.target.__mounted) {
          e.target.__mounted = true;
          mount(e.target, true);
          chartIO.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    charts.forEach(function (c) { chartIO.observe(c); });
  } else {
    charts.forEach(function (c) { c.__mounted = true; mount(c, false); });
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      charts.forEach(function (c) {
        if (c.__mounted && c.clientWidth !== c.__w) mount(c, false);
      });
    }, 120);
  });

  // ---------- scroll-driven sections ----------

  var heroInner = document.querySelector(".hero-inner");
  var story = document.querySelector(".story");
  var storySteps = story ? [].slice.call(story.querySelectorAll(".story-step")) : [];
  var storyChart = story ? story.querySelector("[data-chart='hero']") : null;
  var storyFig = story ? story.querySelector(".figure") : null;
  var statement = document.querySelector(".statement");
  var words = [];

  if (statement) {
    var st = statement.querySelector(".statement-text");
    st.innerHTML = st.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" ");
    words = [].slice.call(st.querySelectorAll(".w"));
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function onScrollFrame() {
    var vh = window.innerHeight;

    // hero recedes as the page slides over it
    if (heroInner && !reduceMotion) {
      var k = clamp01(window.scrollY / (vh * 0.7));
      heroInner.style.opacity = String(1 - k * 0.85);
      heroInner.style.transform = "translateY(" + (-k * 40) + "px) scale(" + (1 - k * 0.03) + ")";
    }

    // story: steps scroll past a sticky chart; progress scrubs the timeline
    if (story && storySteps.length) {
      var mobile = window.innerWidth <= 900;
      var line = vh * (mobile ? 0.82 : 0.5);
      var first = storySteps[0].getBoundingClientRect();
      var last = storySteps[storySteps.length - 1].getBoundingClientRect();
      var p = clamp01((line - first.top) / (last.bottom - first.top));
      var t = p < 0.36 ? (p / 0.36) * 16.4 : p < 0.64 ? 16.4 + ((p - 0.36) / 0.28) * 7.6 : 24;
      if (storyChart) {
        storyChart.__t = t;
        if (storyChart.__setT) storyChart.__setT(t);
      }
      if (storyFig) storyFig.classList.toggle("is-connect", p > 0.68);
      var active = 0;
      storySteps.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) active = i; });
      storySteps.forEach(function (s, i) { s.classList.toggle("is-active", i === active); });
    }

    // statement: words fill in while pinned
    if (statement && words.length) {
      var r = statement.getBoundingClientRect();
      var q = clamp01(-r.top / (r.height - vh));
      var lit = Math.round(clamp01(q / 0.7) * words.length);
      words.forEach(function (w, i) { w.classList.toggle("on", i < lit); });
      var foot = statement.querySelector(".statement-foot");
      if (foot) foot.classList.toggle("on", q > 0.72);
    }
  }

  var ticking = false;
  function requestFrame() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; onScrollFrame(); });
  }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame);
  onScrollFrame();

  // ---------- reveal on scroll ----------

  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add("is-visible"); });
  }

  // ---------- nav border ----------

  var nav = document.querySelector(".nav");
  function onScroll() { if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- research TOC ----------

  var tocLinks = [].slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var tocIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove("active"); });
          var a = byId[e.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) tocIO.observe(s);
    });
  }

  // ---------- Netlify form (progressive enhancement) ----------

  [].slice.call(document.querySelectorAll("form[data-netlify]")).forEach(function (form) {
    var status = form.parentNode.querySelector(".form-status");
    form.addEventListener("submit", function (ev) {
      if (!window.fetch) return;
      ev.preventDefault();
      var btn = form.querySelector("button");
      btn.disabled = true;
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          if (status) { status.textContent = "You’re on the list. We’ll be in touch as cohorts open."; status.className = "form-status ok"; }
        })
        .catch(function () {
          if (status) { status.textContent = "Something went wrong. Please try again."; status.className = "form-status"; }
        })
        .then(function () { btn.disabled = false; });
    });
  });
})();
