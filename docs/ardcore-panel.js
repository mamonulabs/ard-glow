/*
 * ardcore-panel.js
 *
 * Draws the Snazzy FX ArdCore eurorack panel as an SVG and explains each
 * control in a tooltip. One shared tooltip serves every panel on the page,
 * plus any element with a data-tip attribute.
 *
 *   ArdCore.panel(el)                          // plain panel, animated, with tooltips
 *   ArdCore.panel(el, {
 *     notes:   { A0: 'Attack time', D0: 'End of cycle' },  // what this sketch does with each control
 *     animate: false,                           // still knobs and LEDs
 *     tips:    false                            // no tooltips
 *   })
 *
 *   <span data-tip="Text" data-tip-title="Title">…</span>
 *   ArdCore.tip.scan(document)                  // wire up data-tip elements
 *   ArdCore.tip.bind(el, () => ({ title, body }))
 *
 * Coordinates are in a 402 x 1000 box, matching the proportions of the
 * 10HP panel (and the reference photo docs/Ardcor.jpg).
 */
(function (global) {
  'use strict';

  var PRINT = '#b8b8b8';   // silkscreen
  var FRAME = '#4d4d4d';   // label boxes
  var FONT = 'Syne, sans-serif';

  // ── What each control is. Edit the text here and every panel picks it up. ──
  var CONTROLS = {
    A0:   { title: 'A0 knob', body: 'Read with analogRead(A0), 0 to 1023. What it does is up to the sketch.' },
    A1:   { title: 'A1 knob', body: 'Read with analogRead(A1), 0 to 1023. What it does is up to the sketch.' },
    A2k:  { title: 'A2 knob', body: 'With nothing in the A2 jack, this sets the A2 value from 0 to 5V. With a cable in, it attenuates that CV.' },
    A3k:  { title: 'A3 knob', body: 'With nothing in the A3 jack, this sets the A3 value from 0 to 5V. With a cable in, it attenuates that CV.' },
    A2:   { title: 'A2 in', body: 'CV input on analog pin A2. 0 to 5V reads as 0 to 1023. The A2 knob scales it.' },
    CLK:  { title: 'Clock in', body: 'Digital pin 2, on a hardware interrupt. Sketches usually act on the rising edge: step a sequencer, fire an envelope, follow a tempo.' },
    A3:   { title: 'A3 in', body: 'CV input on analog pin A3. 0 to 5V reads as 0 to 1023. The A3 knob scales it.' },
    D0:   { title: 'D0 out', body: 'Gate or trigger out on digital pin 3. Either 0V or 5V. The green LED lights when it is high.' },
    D1:   { title: 'D1 out', body: 'Gate or trigger out on digital pin 4. Either 0V or 5V. The red LED lights when it is high.' },
    D0led:{ title: 'D0 LED', body: 'Lights while D0 is high.' },
    D1led:{ title: 'D1 LED', body: 'Lights while D1 is high.' },
    DAC:  { title: 'DAC out', body: 'The 8-bit R-2R DAC on pins 5 to 12: 256 steps from 0 to 5V. Both jacks carry the same signal, so you get a free mult. Use it for CV or audio.' },
    DATA: { title: 'USB (DATA)', body: 'USB-B socket for uploading sketches and for the serial monitor. It is an Arduino Nano underneath: choose Nano, ATmega328P (Old Bootloader).' },
    DATAled: { title: 'Data LEDs', body: 'Flicker while data moves over USB, so you see them during an upload or when a sketch prints to serial.' }
  };

  // ── Tooltip: one element, shared by everything ──
  var tip = (function () {
    var box = null, cssDone = false;

    function css() {
      if (cssDone) return; cssDone = true;
      var s = document.createElement('style');
      s.textContent =
        '.ac-tip{position:fixed;z-index:1000;max-width:270px;padding:12px 14px;border-radius:10px;' +
        'background:#161616;border:1px solid #333;box-shadow:0 12px 32px rgba(0,0,0,.55);' +
        'font:13px/1.55 "DM Mono",ui-monospace,monospace;color:#d4d4d4;pointer-events:none;' +
        'opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s;text-align:left}' +
        '.ac-tip.on{opacity:1;transform:none}' +
        '.ac-tip b{display:block;font:700 12px/1.3 Syne,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#f59e0b;margin-bottom:6px}' +
        '.ac-tip i{display:block;font-style:normal;color:#fff;margin-bottom:6px}' +
        '.ac-ctl{cursor:help;outline:none}' +
        '.ac-ctl .ac-hl{opacity:0;transition:opacity .12s}' +
        '.ac-ctl:hover .ac-hl,.ac-ctl:focus .ac-hl,.ac-ctl.ac-active .ac-hl{opacity:1}';
      document.head.appendChild(s);
    }

    function el() {
      if (!box) { css(); box = document.createElement('div'); box.className = 'ac-tip'; box.setAttribute('role', 'tooltip'); document.body.appendChild(box); }
      return box;
    }

    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function show(target, c, x, y) {
      var b = el();
      b.innerHTML = (c.title ? '<b>' + esc(c.title) + '</b>' : '') + (c.note ? '<i>' + esc(c.note) + '</i>' : '') + esc(c.body || '');
      b.classList.add('on');
      place(target, x, y);
    }

    function place(target, x, y) {
      var b = el(), pad = 12, w = b.offsetWidth, h = b.offsetHeight;
      if (x == null) { var r = target.getBoundingClientRect(); x = r.right; y = r.top + r.height / 2; }
      var left = x + 16, top = y - h / 2;
      if (left + w > innerWidth - pad) left = x - w - 16;
      left = Math.max(pad, Math.min(left, innerWidth - w - pad));
      top = Math.max(pad, Math.min(top, innerHeight - h - pad));
      b.style.left = left + 'px'; b.style.top = top + 'px';
    }

    function hide() { if (box) box.classList.remove('on'); }

    // get() returns {title, note, body}; called on every show so content can change.
    function bind(target, get) {
      css();
      target.addEventListener('mouseenter', function (e) { show(target, get(), e.clientX, e.clientY); });
      target.addEventListener('mousemove', function (e) { if (box && box.classList.contains('on')) place(target, e.clientX, e.clientY); });
      target.addEventListener('mouseleave', hide);
      target.addEventListener('focus', function () { show(target, get()); });
      target.addEventListener('blur', hide);
      target.addEventListener('touchstart', function () { show(target, get()); }, { passive: true });
    }

    function scan(root) {
      (root || document).querySelectorAll('[data-tip]').forEach(function (n) {
        if (n._acTip) return; n._acTip = true;
        if (!n.hasAttribute('tabindex')) n.setAttribute('tabindex', '0');
        bind(n, function () { return { title: n.getAttribute('data-tip-title'), body: n.getAttribute('data-tip') }; });
      });
    }

    document.addEventListener('touchstart', function (e) {
      if (!e.target.closest || !e.target.closest('.ac-ctl,[data-tip]')) hide();
    }, { passive: true });
    addEventListener('scroll', hide, { passive: true });

    return { bind: bind, scan: scan, show: show, hide: hide, css: css };
  })();

  // ── SVG building ──
  var uid = 0;

  function panelSVG(o) {
    var p = 'ac' + (++uid) + '-';   // id prefix so several panels can share a page
    var s = [];
    var a = function (x) { s.push(x); };
    var ctl = function (id, body) {
      a('<g class="ac-ctl" data-ctl="' + id + '" tabindex="0" aria-label="' + CONTROLS[id].title + '">' + body + '</g>');
    };
    var hl = function (shape) { return shape.replace('/>', ' class="ac-hl" fill="none" stroke="#f59e0b" stroke-width="3"/>'); };

    function label(x, y, w, h, t, len) {
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" stroke="' + FRAME + '" stroke-width="3"/>' +
        '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 10) + '" text-anchor="middle" font-family="' + FONT + '" font-weight="800" font-size="28"' +
        (len ? ' textLength="' + len + '" lengthAdjust="spacingAndGlyphs"' : '') + ' fill="' + PRINT + '">' + t + '</text>';
    }

    function knob(cx, cy, ang, sweep, dur) {
      var R = 52, pts = [];
      for (var i = 0; i < 180; i++) {
        var t = 2 * Math.PI * i / 180, r = R - 4 + 4 * Math.cos(9 * t);
        pts.push((cx + r * Math.cos(t)).toFixed(1) + ',' + (cy + r * Math.sin(t)).toFixed(1));
      }
      var anim = '';
      if (o.animate) {
        var v = [ang, ang + sweep[0], ang + sweep[1], ang].map(function (d) { return d + ' ' + cx + ' ' + cy; }).join(';');
        anim = '<animateTransform attributeName="transform" type="rotate" values="' + v + '" dur="' + dur + 's" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"/>';
      }
      return '<ellipse cx="' + (cx + 3) + '" cy="' + (cy + 6) + '" rx="' + R + '" ry="' + R + '" fill="#000" opacity="0.45"/>' +
        '<polygon points="' + pts.join(' ') + '" fill="url(#' + p + 'knob)" stroke="#0a0a0a" stroke-width="1.5"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="34.3" fill="url(#' + p + 'cap)" stroke="#2c2c2c" stroke-width="1"/>' +
        '<g transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')"><line x1="' + cx + '" y1="' + (cy - 9) + '" x2="' + cx + '" y2="' + (cy - R + 6) + '" stroke="#e8e8e8" stroke-width="5" stroke-linecap="round"/>' + anim + '</g>' +
        hl('<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 6) + '"/>');
    }

    function jack(cx, cy) {
      var pts = [];
      for (var k = 0; k < 6; k++) { var t = Math.PI / 6 + k * Math.PI / 3; pts.push((cx + 32 * Math.cos(t)).toFixed(1) + ',' + (cy + 32 * Math.sin(t)).toFixed(1)); }
      return '<polygon points="' + pts.join(' ') + '" fill="url(#' + p + 'nut)" stroke="#3a3a3a" stroke-width="1.5"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="22" fill="url(#' + p + 'barrel)" stroke="#555" stroke-width="1"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="#050505" stroke="#2e2e2e" stroke-width="2"/>' +
        hl('<circle cx="' + cx + '" cy="' + cy + '" r="38"/>');
    }

    function led(cx, cy, col, blink) {
      var anim = (o.animate && blink) ? '<animate attributeName="opacity" values="' + blink[0] + '" keyTimes="' + blink[1] + '" dur="' + blink[2] + 's" calcMode="discrete" repeatCount="indefinite"/>' : '';
      return '<circle cx="' + cx + '" cy="' + cy + '" r="11" fill="#0a0a0a" stroke="#333" stroke-width="1.5"/>' +
        '<g opacity="0.2">' + anim + '<circle cx="' + cx + '" cy="' + cy + '" r="16" fill="' + col + '" filter="url(#' + p + 'glow)"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="' + col + '"/><circle cx="' + (cx - 2.5) + '" cy="' + (cy - 2.5) + '" r="2.5" fill="#fff" opacity="0.6"/></g>' +
        hl('<circle cx="' + cx + '" cy="' + cy + '" r="17"/>');
    }

    a('<svg viewBox="0 0 402 1000" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Snazzy FX ArdCore eurorack panel" style="display:block;width:100%;height:auto;overflow:visible">');
    a('<defs>' +
      '<linearGradient id="' + p + 'pnl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d1d1d"/><stop offset="1" stop-color="#121212"/></linearGradient>' +
      '<radialGradient id="' + p + 'knob" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#3a3a3a"/><stop offset="0.7" stop-color="#1f1f1f"/><stop offset="1" stop-color="#0d0d0d"/></radialGradient>' +
      '<radialGradient id="' + p + 'cap" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#333"/><stop offset="1" stop-color="#1a1a1a"/></radialGradient>' +
      '<linearGradient id="' + p + 'nut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6d6d6"/><stop offset="0.5" stop-color="#8e8e8e"/><stop offset="1" stop-color="#5c5c5c"/></linearGradient>' +
      '<linearGradient id="' + p + 'barrel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e2e2"/><stop offset="1" stop-color="#7a7a7a"/></linearGradient>' +
      '<linearGradient id="' + p + 'usb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfcfcf"/><stop offset="1" stop-color="#7d7d7d"/></linearGradient>' +
      '<filter id="' + p + 'glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="6"/></filter>' +
      '</defs>');

    // panel, rack slots, title
    a('<rect x="1" y="1" width="400" height="998" rx="6" fill="url(#' + p + 'pnl)" stroke="#2c2c2c" stroke-width="2"/>');
    [46, 320].forEach(function (x) { [12, 966].forEach(function (y) {
      a('<rect x="' + x + '" y="' + y + '" width="64" height="22" rx="11" fill="#070707" stroke="#2a2a2a" stroke-width="1.5"/>');
    }); });
    a(label(124, 18, 156, 44, 'ARDCORE', 132));

    // knobs (label box + knob in one hover group)
    ctl('A0',  label(45, 62, 66, 32, 'A0')   + knob(86, 150, -110, [50, -15], 11));
    ctl('A1',  label(291, 62, 66, 32, 'A1')  + knob(322, 152, 30, [65, -50], 14));
    ctl('A2k', label(45, 257, 66, 32, 'A2')  + knob(80, 362, -95, [65, -35], 17));
    ctl('A3k', label(291, 257, 66, 32, 'A3') + knob(330, 362, 55, [65, -45], 13));

    // input row
    ctl('A2',  label(45, 456, 66, 32, 'A2')        + jack(75, 537));
    ctl('CLK', label(138, 456, 126, 32, 'CLK', 62) + jack(200, 537));
    ctl('A3',  label(291, 456, 66, 32, 'A3')       + jack(325, 537));

    // gate outs + their LEDs
    ctl('D0', label(14, 580, 66, 32, 'D0')  + jack(78, 655));
    ctl('D1', label(322, 580, 66, 32, 'D1') + jack(318, 655));
    ctl('D0led', led(148, 657, '#22d36b', ['1;0.2;0.2', '0;0.15;1', 1.0]));
    ctl('D1led', led(246, 655, '#ff3b30', ['0.2;1;0.2;1;0.2', '0;0.33;0.43;0.66;0.72', 1.5]));

    // DAC pair, arrow between them
    ctl('DAC', label(156, 680, 90, 32, 'DAC', 64) + jack(118, 752) + jack(262, 752) +
      '<path d="M166 755 H236 M166 755 l10 -8 M166 755 l10 8 M236 755 l-10 -8 M236 755 l-10 8" stroke="' + PRINT + '" stroke-width="4" fill="none" stroke-linecap="round"/>');

    // USB with DATA label, and the two data LEDs
    ctl('DATA',
      '<text x="201" y="788" text-anchor="middle" font-family="' + FONT + '" font-weight="800" font-size="22" textLength="64" lengthAdjust="spacingAndGlyphs" fill="' + PRINT + '">DATA</text>' +
      '<rect x="148" y="800" width="106" height="94" rx="4" fill="url(#' + p + 'usb)" stroke="#444" stroke-width="1.5"/>' +
      '<rect x="158" y="810" width="86" height="74" rx="2" fill="#0b0b0b"/>' +
      '<path d="M170 868 V834 L180 822 H222 L232 834 V868 Z" fill="#d9d9d9" stroke="#999" stroke-width="1"/>' +
      '<rect x="183" y="833" width="36" height="22" fill="#f0f0f0" stroke="#aaa" stroke-width="1"/>' +
      hl('<rect x="142" y="766" width="118" height="134" rx="8"/>'));
    ctl('DATAled',
      led(108, 852, '#22d36b', ['0.2;1;0.2;1;0.2', '0;0.8;0.83;0.88;0.9', 4.2]) +
      led(283, 852, '#ff3b30', ['0.2;1;0.2;1;0.2', '0;0.82;0.86;0.9;0.93', 4.2]));

    // maker's mark
    a('<text x="201" y="945" text-anchor="middle" font-family="' + FONT + '" font-weight="800" font-size="46" textLength="200" lengthAdjust="spacingAndGlyphs" fill="none" stroke="' + PRINT + '" stroke-width="2.2">SNAZZY</text>');
    a('<text x="201" y="968" text-anchor="middle" font-family="' + FONT + '" font-weight="800" font-size="20" letter-spacing="4" fill="' + PRINT + '">FX</text>');
    a('</svg>');
    return s.join('');
  }

  // Reading order for lists of controls (top of the panel to the bottom).
  var ORDER = ['A0', 'A1', 'A2k', 'A3k', 'A2', 'CLK', 'A3', 'D0', 'D0led', 'D1', 'D1led', 'DAC', 'DATA', 'DATAled'];

  // ── Public: draw a panel into el ──
  //   opts.notes      { id: 'what this sketch does with it' }
  //   opts.dimUnused  fade out controls that have no note
  //   returns { el, highlight(id | null) }
  function panel(el, opts) {
    var o = { animate: true, tips: true, notes: {}, dimUnused: false };
    for (var k in (opts || {})) o[k] = opts[k];
    el.innerHTML = panelSVG(o);
    var groups = el.querySelectorAll('.ac-ctl');
    groups.forEach(function (g) {
      var id = g.getAttribute('data-ctl');
      if (o.dimUnused && !o.notes[id]) g.style.opacity = '0.3';
      if (o.tips) {
        tip.bind(g, function () {
          var c = CONTROLS[id];
          return { title: c.title, note: o.notes[id] || (o.dimUnused ? 'Not used by this sketch.' : ''), body: c.body };
        });
      }
    });
    tip.css();
    return {
      el: el,
      highlight: function (id) {
        groups.forEach(function (g) { g.classList.toggle('ac-active', g.getAttribute('data-ctl') === id); });
      }
    };
  }

  global.ArdCore = { panel: panel, tip: tip, CONTROLS: CONTROLS, ORDER: ORDER };
})(window);
