/* Badrinath Nandaluri — portfolio interactions (no build step, no framework) */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var params = new URLSearchParams(location.search);
  var skipIntro = reduced || params.has('nointro');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Failsafe: never leave content hidden if something below throws.
  var failsafe = setTimeout(function () { body.classList.add('loaded'); }, 6000);

  /* ---------------- Smooth scroll ---------------- */
  var lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    try {
      lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { lenis = null; }
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.4 });
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------------- Text splitting ---------------- */
  function splitWords(el, outerClass, innerClass) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var outer = document.createElement('span');
            outer.className = outerClass;
            if (innerClass) {
              var inner = document.createElement('span');
              inner.className = innerClass;
              inner.style.setProperty('--i', i);
              inner.textContent = part;
              outer.appendChild(inner);
            } else {
              outer.textContent = part;
            }
            i++;
            frag.appendChild(outer);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
    return i;
  }
  $$('[data-split]').forEach(function (el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    splitWords(el, 'w', 'wi');
  });
  var scrubEls = $$('[data-scrub]').map(function (el) {
    splitWords(el, 'sw', null);
    return { el: el, words: $$('.sw', el) };
  });

  /* ---------------- Reveal on scroll ---------------- */
  var revealTargets = $$('.reveal, [data-split]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        var counter = en.target.querySelector('[data-count]');
        if (counter) countUp(counter);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------------- Counters ---------------- */
  function fmt(v, decimals, sep) {
    var s = v.toFixed(decimals);
    return sep ? Number(s).toLocaleString('en-US') : s;
  }
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var sep = el.hasAttribute('data-sep');
    if (reduced) { el.textContent = fmt(target, decimals, sep); return; }
    var start = performance.now(), dur = 1600;
    (function tick(now) {
      var p = clamp((now - start) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(target * eased, decimals, sep);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------------- Loader ---------------- */
  function finishLoad() {
    clearTimeout(failsafe);
    body.classList.add('loaded');
  }
  (function loader() {
    var countEl = document.getElementById('loaderCount');
    var barEl = document.getElementById('loaderBar');
    if (skipIntro || !countEl) { finishLoad(); return; }
    var start = performance.now(), dur = 1500;
    (function tick(now) {
      var p = clamp((now - start) / dur, 0, 1);
      var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var v = Math.round(eased * 100);
      countEl.textContent = v;
      barEl.style.width = v + '%';
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finishLoad, 180);
    })(start);
  })();

  /* ---------------- Scroll-driven bits ---------------- */
  var nav = document.getElementById('nav');
  var canvas = document.getElementById('gl');
  var contact = document.getElementById('contact');
  var cards = $$('.card').map(function (c) { return { el: c, inner: c.querySelector('.card__in') }; });
  var lastY = 0, scrollNorm = 0, ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;

    // nav: hide going down, show going up
    nav.classList.toggle('is-solid', y > 40);
    if (y > vh * 0.6 && y > lastY + 4) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y < vh * 0.6) nav.classList.remove('is-hidden');
    lastY = y;

    // background: vivid in hero, quiet through content, back for the finale
    var heroFade = 1 - clamp(y / (vh * 0.9), 0, 1);
    var cRect = contact.getBoundingClientRect();
    var finale = clamp((vh - cRect.top) / (vh * 0.9), 0, 1);
    canvas.style.opacity = (0.16 + 0.84 * Math.max(heroFade, finale * 0.9)).toFixed(3);
    scrollNorm = y / Math.max(1, doc.scrollHeight - vh);

    // about statement: words light up as you read
    scrubEls.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25), 0, 1);
      var n = Math.round(p * s.words.length);
      for (var i = 0; i < s.words.length; i++) s.words[i].classList.toggle('on', i < n);
    });

    // stacked cards: the one underneath recedes
    for (var i = 0; i < cards.length; i++) {
      var next = cards[i + 1];
      var p2 = 0;
      if (next && getComputedStyle(cards[i].el).position === 'sticky') {
        var a = cards[i].el.getBoundingClientRect();
        var b = next.el.getBoundingClientRect();
        p2 = clamp(1 - (b.top - a.top - 20) / a.height, 0, 1);
      }
      cards[i].inner.style.transform = p2 ? 'scale(' + (1 - p2 * 0.06).toFixed(4) + ')' : '';
      cards[i].inner.style.filter = p2 ? 'brightness(' + (1 - p2 * 0.45).toFixed(3) + ')' : '';
    }
    ticking = false;
  }
  function requestScroll() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);
  onScroll();

  /* ---------------- Cursor, magnets, tilt, spotlight ---------------- */
  var mouse = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }, { passive: true });

  if (fine && !reduced) {
    var cursor = document.querySelector('.cursor');
    var label = cursor.querySelector('.cursor__label');
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add('is-on');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('a, button') : null;
      var lab = t && t.getAttribute('data-cursor');
      cursor.classList.toggle('is-label', !!lab);
      cursor.classList.toggle('is-link', !!t && !lab);
      if (lab) label.textContent = lab;
    });

    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.3).toFixed(1) + 'px)';
        el.style.transition = 'transform .15s ease-out, background .35s, color .35s, border-color .3s';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1), background .35s, color .35s, border-color .3s';
        el.style.transform = '';
      });
    });

    $$('[data-tilt]').forEach(function (el) {
      var inner = el.firstElementChild;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        inner.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
        inner.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        inner.style.setProperty('--ry', '0deg'); inner.style.setProperty('--rx', '0deg');
      });
    });

    $$('.skill').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------------- Clock + year ---------------- */
  var clock = document.getElementById('clock');
  function tickClock() {
    try {
      clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date());
    } catch (e) { /* older browsers: leave placeholder */ }
  }
  if (clock) { tickClock(); setInterval(tickClock, 20000); }
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------- WebGL background ---------------- */
  (function background() {
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return; // CSS gradient fallback stays

    var vsrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fsrc = [
      'precision highp float;',
      'uniform vec2 uRes;uniform float uTime;uniform vec2 uMouse;uniform float uScroll;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
      ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
      'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);',
      ' for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}',
      'void main(){',
      ' vec2 uv=gl_FragCoord.xy/uRes;',
      ' vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;',
      ' float t=uTime*.045;',
      ' vec2 m=uMouse-.5;',
      ' p+=m*vec2(.22,-.22);',
      ' p.y+=uScroll*.9;',
      ' vec2 q=vec2(fbm(p*1.25+vec2(0.,t)),fbm(p*1.25+vec2(5.2,-t*1.1)));',
      ' vec2 r=vec2(fbm(p*1.25+3.2*q+vec2(1.7,9.2)+t*1.4),fbm(p*1.25+3.2*q+vec2(8.3,2.8)-t*1.2));',
      ' float f=fbm(p*1.25+3.6*r);',
      ' vec3 col=vec3(.030,.030,.036);',
      ' col=mix(col,vec3(.085,.110,.330),smoothstep(.25,.85,f));',
      ' col=mix(col,vec3(.780,.240,.110),smoothstep(.45,1.,f*length(r)*1.2)*.62);',
      ' col=mix(col,vec3(.950,.480,.240),pow(smoothstep(.6,1.1,f*r.x*1.8),2.4)*.3);',
      ' float d=length(p-vec2(m.x*1.2,-m.y*1.2));',
      ' col+=vec3(.9,.35,.2)*.05*exp(-d*d*5.);',
      ' col*=1.-.42*dot(uv-.5,uv-.5)*2.2;',
      ' col*=mix(.55,1.,smoothstep(0.,.55,uv.y+.12));',
      ' col+=(hash(gl_FragCoord.xy+fract(uTime)*91.7)-.5)*.03;',
      ' gl_FragColor=vec4(col,1.);',
      '}'
    ].join('\n');

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, vsrc), fs = compile(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uMouse = gl.getUniformLocation(prog, 'uMouse');
    var uScroll = gl.getUniformLocation(prog, 'uScroll');

    function resize() {
      // The field is soft, so render well below native resolution — cheap on any GPU.
      var scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.55;
      var w = Math.max(2, Math.floor(window.innerWidth * scale));
      var h = Math.max(2, Math.floor(window.innerHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    }
    window.addEventListener('resize', resize);
    resize();

    var mx = 0.5, my = 0.5, sc = 0, t0 = performance.now(), running = true;
    function frame(now) {
      if (!running) return;
      mx += (mouse.x - mx) * 0.04; my += (mouse.y - my) * 0.04;
      sc += (scrollNorm - sc) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduced ? 12.0 : (now - t0) / 1000 + 12.0);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uScroll, sc);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () {
      var was = running;
      running = !document.hidden;
      if (running && !was && !reduced) requestAnimationFrame(frame);
    });
  })();
})();
