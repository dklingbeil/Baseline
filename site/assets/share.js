/* Baseline — share page: a trajectory on a flat baseline that folds up into a 3D QR code. */
(function () {
  "use strict";

  var INK = "#121211";
  var ACCENT = "#c4532e";
  var LINE = "#d8d7cf";
  var CARD = "#ffffff";
  var QUIET = 4; // quiet-zone modules around the code (QR spec minimum)

  var url = location.origin + "/";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stage = document.getElementById("stage");
  var canvas = document.getElementById("qr");
  var ctx = canvas.getContext("2d");
  var statusEl = document.getElementById("status");
  document.getElementById("url").textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (typeof window.qrcode !== "function") {
    statusEl.textContent = "Couldn’t load the QR generator. Check your connection and reload.";
    return;
  }

  // ---------- QR matrix ----------

  var qr = window.qrcode(0, "M");
  qr.addData(url);
  qr.make();
  var N = qr.getModuleCount();

  // dark modules, ordered left-to-right so they map onto a line in reading order
  var mods = [];
  for (var c = 0; c < N; c++) {
    for (var r = 0; r < N; r++) {
      if (qr.isDark(r, c)) mods.push({ r: r, c: c });
    }
  }
  var M = mods.length;

  // ---------- helpers ----------

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function mix(hexA, hexB, k) {
    var a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
    var rr = Math.round(lerp(a >> 16, b >> 16, k));
    var gg = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k));
    var bb = Math.round(lerp(a & 255, b & 255, k));
    return "rgb(" + rr + "," + gg + "," + bb + ")";
  }
  // deterministic jitter so replays look identical
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // ---------- layout ----------

  var S, DPR, cx, cy, half, cell, D;

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    S = stage.clientWidth;
    canvas.width = Math.round(S * DPR);
    canvas.height = Math.round(S * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = S / 2;
    cy = S / 2;
    half = S * 0.44;               // half-size of the white card
    cell = (half * 2) / (N + QUIET * 2);
    D = S * 2.4;                   // camera distance for perspective

    // the "line" each dark module starts on: a trajectory across a flat baseline, dipping near the end
    var span = cell * N;
    for (var i = 0; i < M; i++) {
      var u = M > 1 ? i / (M - 1) : 0.5;
      var x = lerp(-span / 2, span / 2, u);
      var wave = 0.34 * Math.sin(u * 11 + 0.4) + 0.18 * Math.sin(u * 27 + 1.1);
      var dip = -1.9 / (1 + Math.exp(-(u - 0.74) * 28));
      mods[i].lx = cx + x;
      mods[i].ly = cy - (wave + dip) * S * 0.045;
      mods[i].dev = u > 0.72;
      mods[i].delay = u * 0.95 + hash(i) * 0.18;
    }
  }

  // ---------- 3D ----------

  // rotate a point on the card plane (x, y, z) by plane tilt a (about X) and b (about Y), then project
  function project(x, y, z, a, b) {
    var ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    var y1 = y * ca - z * sa;
    var z1 = y * sa + z * ca;
    var x2 = x * cb + z1 * sb;
    var z2 = -x * sb + z1 * cb;
    var f = D / (D + z2);
    return [cx + x2 * f, cy + y1 * f];
  }

  function quad(p) {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    ctx.lineTo(p[1][0], p[1][1]);
    ctx.lineTo(p[2][0], p[2][1]);
    ctx.lineTo(p[3][0], p[3][1]);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- timeline (seconds) ----------

  var T_LINE = 0.9;    // trajectory draws in
  var T_FLY = 1.15;    // modules start leaving the line
  var FLY = 0.85;      // each module's flight
  var T_END = T_FLY + 1.13 + FLY + 0.35;

  var start = 0;
  var tiltA = 0, tiltB = 0, targetA = 0, targetB = 0;
  var running = false;

  function draw(t) {
    ctx.clearRect(0, 0, S, S);

    // plane tilt: steep while modules land, easing flat so the code is scannable
    var kPlane = easeInOut(clamp01((t - T_FLY) / (T_END - T_FLY - 0.2)));
    var a = lerp(1.05, 0, kPlane) + tiltA;
    var b = lerp(-0.35, 0, kPlane) + tiltB;

    // white card with quiet zone, fading in under the landing modules
    var cardK = easeOut(clamp01((t - T_FLY - 0.25) / 1.1));
    if (cardK > 0) {
      ctx.globalAlpha = cardK;
      ctx.fillStyle = CARD;
      ctx.shadowColor = "rgba(18,18,17,0.12)";
      ctx.shadowBlur = 36 * cardK;
      ctx.shadowOffsetY = 14 * cardK;
      quad([project(-half, -half, 0, a, b), project(half, -half, 0, a, b), project(half, half, 0, a, b), project(-half, half, 0, a, b)]);
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(18,18,17,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // the flat baseline and its band, fading out as the code forms
    var lineK = clamp01(t / T_LINE);
    var lineFade = 1 - clamp01((t - T_FLY) / 0.6);
    if (lineFade > 0) {
      var span = cell * N;
      ctx.globalAlpha = lineFade;
      ctx.fillStyle = "rgba(18,18,17,0.05)";
      ctx.fillRect(cx - span / 2, cy - S * 0.03, span * lineK, S * 0.06);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx - span / 2, cy);
      ctx.lineTo(cx - span / 2 + span * lineK, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    var off = (N / 2) * cell;
    var dotR = Math.max(1.1, cell * 0.22);
    var inkBack = clamp01((t - (T_END - 0.55)) / 0.5); // accent modules settle to ink for scanning

    for (var i = 0; i < M; i++) {
      var m = mods[i];
      var u = M > 1 ? i / (M - 1) : 0;
      if (u > lineK + 0.0001) continue; // not drawn in yet

      var k = easeInOut(clamp01((t - T_FLY - m.delay) / FLY));
      var color = m.dev ? mix(ACCENT, INK, inkBack) : INK;
      ctx.fillStyle = color;

      if (k <= 0) {
        ctx.beginPath();
        ctx.arc(m.lx, m.ly, dotR, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      // target square on the card plane, flipping up about its own horizontal axis as it lands
      var x0 = -off + m.c * cell, y0 = -off + m.r * cell;
      var mcx = x0 + cell / 2, mcy = y0 + cell / 2;
      var flip = (1 - k) * (Math.PI / 2);
      var cf = Math.cos(flip), sf = Math.sin(flip);
      var h = cell / 2 + 0.35; // tiny overlap hides hairline seams between modules
      var lift = (1 - k) * cell * 6; // rises off the plane toward the viewer, then settles
      var corners = [
        project(mcx - h, mcy - h * cf, -h * sf - lift, a, b),
        project(mcx + h, mcy - h * cf, -h * sf - lift, a, b),
        project(mcx + h, mcy + h * cf, h * sf - lift, a, b),
        project(mcx - h, mcy + h * cf, h * sf - lift, a, b),
      ];
      // travel from the dot on the line to the landed square
      for (var j = 0; j < 4; j++) {
        corners[j][0] = lerp(m.lx, corners[j][0], k);
        corners[j][1] = lerp(m.ly, corners[j][1], k);
      }
      quad(corners);
    }
  }

  function frame() {
    var t = (performance.now() - start) / 1000;
    tiltA += (targetA - tiltA) * 0.08;
    tiltB += (targetB - tiltB) * 0.08;
    draw(t);
    var settled = Math.abs(targetA - tiltA) < 0.0005 && Math.abs(targetB - tiltB) < 0.0005;
    if (t < T_END || !settled) requestAnimationFrame(frame);
    else running = false;
  }

  function play() {
    start = performance.now();
    if (reduceMotion) start -= T_END * 1000;
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function wake() {
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  // ---------- gentle tilt: pointer on desktop, gyroscope on phones ----------

  var MAX_TILT = 0.12; // radians; small enough to stay scannable
  stage.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var rect = stage.getBoundingClientRect();
    targetB = ((e.clientX - rect.left) / rect.width - 0.5) * 2 * MAX_TILT;
    targetA = -((e.clientY - rect.top) / rect.height - 0.5) * 2 * MAX_TILT;
    wake();
  });
  stage.addEventListener("pointerleave", function () { targetA = targetB = 0; wake(); });

  var gyroOn = false;
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    var beta = Math.max(-20, Math.min(20, e.beta - 45)); // phone held at ~45°
    var gamma = Math.max(-20, Math.min(20, e.gamma));
    targetA = (-beta / 20) * MAX_TILT;
    targetB = (gamma / 20) * MAX_TILT;
    wake();
  }
  function enableGyro() {
    if (gyroOn || reduceMotion || !window.DeviceOrientationEvent) return;
    var DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === "function") {
      // iOS: needs a user gesture
      DOE.requestPermission().then(function (s) {
        if (s === "granted") { gyroOn = true; window.addEventListener("deviceorientation", onOrient); }
      }).catch(function () {});
    } else {
      gyroOn = true;
      window.addEventListener("deviceorientation", onOrient);
    }
  }

  // ---------- controls ----------

  stage.addEventListener("click", function () { enableGyro(); play(); });
  document.getElementById("replay-btn").addEventListener("click", function () { enableGyro(); play(); });

  document.getElementById("share-btn").addEventListener("click", function () {
    var data = { title: "Baseline", text: "Off your baseline?", url: url };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        statusEl.textContent = "Link copied.";
      }, function () {
        statusEl.textContent = url;
      });
    } else {
      statusEl.textContent = url;
    }
  });

  var lastW = 0;
  window.addEventListener("resize", function () {
    if (stage.clientWidth === lastW) return;
    lastW = stage.clientWidth;
    layout();
    wake();
  });

  lastW = stage.clientWidth;
  layout();
  play();
})();
