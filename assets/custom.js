/* ============================================================
   HIGH LEVEL TRAINING — interaction layer (DUDA code injection)
   Deploy: DUDA > Site Settings > Site HTML > BODY END (inside <script>)
   No dependencies. Respects prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Brand film overlay: fade out fully once playback ends */
  document.querySelectorAll('.hlt-brand-video').forEach(function (v) {
    if (reduced) { v.classList.add('is-done'); return; }
    v.addEventListener('ended', function () { v.classList.add('is-done'); });
  });

  /* Letter-by-letter construction: <el data-hlt-build="6.2" data-hlt-build-step="0.07"> */
  document.querySelectorAll('[data-hlt-build]').forEach(function (el) {
    var base = parseFloat(el.getAttribute('data-hlt-build')) || 0;
    var step = parseFloat(el.getAttribute('data-hlt-build-step')) || 0.07;
    var words = el.textContent.split(' ');
    el.textContent = '';
    var i = 0;
    words.forEach(function (word, w) {
      var wordSpan = document.createElement('span');
      wordSpan.className = 'hlt-build-word';
      Array.from(word).forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'hlt-build-letter';
        s.textContent = ch;
        s.style.animationDelay = (base + i * step) + 's';
        /* deterministic scatter — golden-angle spread so each letter
           converges from a different direction (reversed deconstruction) */
        var angle = (i * 137.5) * Math.PI / 180;
        var radius = 0.7 + ((i * 73) % 50) / 50 * 0.9;
        s.style.setProperty('--bx', (Math.cos(angle) * radius).toFixed(2) + 'em');
        s.style.setProperty('--by', (Math.sin(angle) * radius).toFixed(2) + 'em');
        s.style.setProperty('--br', (((i % 2) ? 1 : -1) * (6 + (i * 29) % 14)) + 'deg');
        wordSpan.appendChild(s);
        i++;
      });
      el.appendChild(wordSpan);
      if (w < words.length - 1) { el.appendChild(document.createTextNode(' ')); i++; }
    });
    el.classList.add('is-split'); /* letters are hidden individually now */
  });

  /* Scroll-entrance reveals */
  var revealEls = document.querySelectorAll('[data-hlt-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* Stat counters: <span data-hlt-count="1200" data-hlt-suffix="+">0</span> */
  var counters = document.querySelectorAll('[data-hlt-count]');
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-hlt-count'));
    var suffix = el.getAttribute('data-hlt-suffix') || '';
    var decimals = (el.getAttribute('data-hlt-count').split('.')[1] || '').length;
    if (reduced) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    var start = null;
    var dur = 1200;
    var done = false;
    function step(ts) {
      if (done) return;
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else done = true;
    }
    requestAnimationFrame(step);
    /* rAF is throttled in background tabs — guarantee the final value lands */
    setTimeout(function () {
      done = true;
      el.textContent = target.toFixed(decimals) + suffix;
    }, dur + 200);
  }
  if (!('IntersectionObserver' in window)) {
    counters.forEach(runCounter);
  } else {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }
})();

/* ============================================================
   v0.4 — Film Room gallery: category filters + lightbox
   Markup contract:
   <button class="hlt-filter" data-filter="all|camps|...">
   <figure class="hlt-gallery__item" data-cat="camps" data-full="...">
     <img|video ...>
   </figure>
   ============================================================ */
(function () {
  'use strict';
  var gallery = document.querySelector('.hlt-gallery');
  if (!gallery) return;

  var items = Array.prototype.slice.call(gallery.querySelectorAll('.hlt-gallery__item'));

  /* filters */
  document.querySelectorAll('.hlt-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.hlt-filter').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var f = btn.getAttribute('data-filter');
      items.forEach(function (it) {
        it.classList.toggle('is-hidden', f !== 'all' && it.getAttribute('data-cat') !== f);
      });
    });
  });

  /* lightbox */
  var lb = document.createElement('div');
  lb.className = 'hlt-lightbox';
  lb.innerHTML = '<button class="hlt-lightbox__close" aria-label="Close">&times;</button>' +
    '<button class="hlt-lightbox__nav prev" aria-label="Previous">&#8249;</button>' +
    '<button class="hlt-lightbox__nav next" aria-label="Next">&#8250;</button>' +
    '<div class="hlt-lightbox__stage"></div>';
  document.body.appendChild(lb);
  var stage = lb.querySelector('.hlt-lightbox__stage');
  var current = -1;

  function visibleItems() {
    return items.filter(function (it) { return !it.classList.contains('is-hidden'); });
  }
  function show(i) {
    var vis = visibleItems();
    if (!vis.length) return;
    current = (i + vis.length) % vis.length;
    var it = vis[current];
    var isVideo = it.hasAttribute('data-video');
    var src = it.getAttribute('data-full') ||
      (isVideo ? it.querySelector('video source').src : it.querySelector('img').src);
    stage.innerHTML = isVideo
      ? '<video src="' + src + '" controls autoplay playsinline></video>'
      : '<img src="' + src + '" alt="">';
    lb.classList.add('is-open');
  }
  function close() {
    lb.classList.remove('is-open');
    stage.innerHTML = '';
  }
  items.forEach(function (it) {
    it.addEventListener('click', function () { show(visibleItems().indexOf(it)); });
  });
  lb.querySelector('.hlt-lightbox__close').addEventListener('click', close);
  lb.querySelector('.prev').addEventListener('click', function () { show(current - 1); });
  lb.querySelector('.next').addEventListener('click', function () { show(current + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();

/* ============================================================
   v0.5 — scroll-gated hero sequence
   Markup: <div data-hlt-scrollseq> containing [data-hlt-step="1..4"]
   elements whose animations (incl. child .hlt-earn / build letters)
   start paused. The page locks at the hero after load; once the
   brand film's assembly lands, each scroll gesture (wheel down,
   upward swipe, ArrowDown/PageDown/Space) reveals one step. After
   the last step the page unlocks. State is in-memory only, so the
   sequence persists until the page is refreshed.
   ============================================================ */
(function () {
  'use strict';
  var root = document.querySelector('[data-hlt-scrollseq]');
  if (!root) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* elements sharing a step number fire together on the same scroll */
  var groups = {};
  Array.prototype.slice.call(root.querySelectorAll('[data-hlt-step]')).forEach(function (el) {
    var n = +el.getAttribute('data-hlt-step');
    (groups[n] = groups[n] || []).push(el);
  });
  var steps = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; })
    .map(function (n) { return groups[n]; });

  function targetsOf(stepEl) {
    var t = [];
    if (stepEl.classList.contains('hlt-seq')) t.push(stepEl);
    t = t.concat(Array.prototype.slice.call(stepEl.querySelectorAll('.hlt-build-letter, .hlt-earn')));
    return t;
  }

  /* reduced motion (CSS already shows everything), deep links, or a
     mid-page load: skip the gate and run the whole sequence at once */
  function setGroup(group, state) {
    group.forEach(function (s) { targetsOf(s).forEach(function (el) { el.style.animationPlayState = state; }); });
  }

  if (reduced || location.hash || window.scrollY > 60) {
    steps.forEach(function (g) { setGroup(g, 'running'); });
    return;
  }

  /* pause every step's animations (delay countdowns pause too) */
  steps.forEach(function (g) { setGroup(g, 'paused'); });

  /* lock the page at the hero (via event cancellation — no overflow
     juggling, which shifts layout when the scrollbar disappears) */
  window.scrollTo(0, 0);

  var index = 0;
  var last = 0;
  var COOLDOWN = 550;

  function unlock() {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchmove', onTouchMove);
  }

  var EMPTY_BEATS = 1; /* settle gestures between the reveal and release */
  var settled = 0;

  /* returns true if the triggering event should be cancelled */
  function gesture() {
    if (!armed) return true;
    var now = Date.now();
    if (now - last < COOLDOWN) return true;
    last = now;
    if (index < steps.length) {
      setGroup(steps[index], 'running');
      index++;
      return true;
    }
    if (settled < EMPTY_BEATS) { settled++; return true; }
    unlock();
    return false; /* this same gesture starts moving the page */
  }
  function advance() { gesture(); }

  /* arm once the brand film's assembly has landed (~3s), with fallbacks */
  var armed = false;
  var brand = document.querySelector('.hlt-brand-video');
  function arm() { armed = true; }
  if (brand) {
    var poll = setInterval(function () {
      if (brand.currentTime >= 3 || brand.ended) { arm(); clearInterval(poll); }
    }, 200);
    setTimeout(function () { arm(); clearInterval(poll); }, 5000);
  } else {
    arm();
  }

  /* cancel the scroll itself while locked — required inside embedded
     frames where the PARENT document owns the scrollbar and overflow
     on this document alone cannot hold the page */
  /* deliberate navigation (anchor clicks) completes the sequence */
  window.__hltSeqSkip = function () {
    while (index < steps.length) {
      setGroup(steps[index], 'running');
      index++;
    }
    unlock();
  };

  function onWheel(e) {
    if (e.deltaY > 8) {
      if (gesture()) e.preventDefault();
      return;
    }
    e.preventDefault();
  }
  function onKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      if (gesture()) e.preventDefault();
    }
  }
  var touchY = null;
  function onTouchStart(e) { touchY = e.touches[0].clientY; }
  function onTouchMove(e) { e.preventDefault(); }
  function onTouchEnd(e) {
    if (touchY === null) return;
    if (touchY - e.changedTouches[0].clientY > 40) advance();
    touchY = null;
  }
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
})();


/* ============================================================
   v0.6 — nav anchor scrolling: smooth, with the Coach section
   centered in the viewport; other targets respect scroll-margin
   ============================================================ */
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (window.__hltSeqSkip) window.__hltSeqSkip(); /* release the hero gate first */
    el.scrollIntoView({ behavior: 'smooth', block: id === 'coach' ? 'center' : 'start' });
  });
})();

/* ============================================================
   v0.7 — anchored popovers (contact + affiliates). Open from
   a[href="#contact"] / a[href="#affiliates"], materializing at the
   trigger point with the site's fragment-assembly motion. Close via
   the X, the backdrop, or Escape.
   ============================================================ */
(function () {
  'use strict';
  var wrap = null;
  var panel = null;

  function ensure() {
    if (wrap) return;
    wrap = document.createElement('div');
    wrap.className = 'hlt-contact';
    wrap.hidden = true;
    wrap.innerHTML = '<div class="hlt-contact__backdrop"></div><div class="hlt-contact__panel" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(wrap);
    panel = wrap.querySelector('.hlt-contact__panel');
    wrap.querySelector('.hlt-contact__backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !wrap.hidden) close();
    });
  }

  var CLOSE_BTN = '<button type="button" class="hlt-contact__close" aria-label="Close">&times;</button>';

  function renderContact() {
    panel.innerHTML = CLOSE_BTN +
      '<form novalidate style="display:grid; gap:.95rem">' +
      '<p class="hlt-eyebrow frag">Contact Coach Mich</p>' +
      '<h3 class="hlt-contact__title frag">Let\u2019s talk<span style="color:var(--hlt-accent)">.</span></h3>' +
      '<div class="hlt-field frag"><label for="hltc-email">Email</label>' +
      '<input id="hltc-email" type="email" autocomplete="email" placeholder="you@email.com"></div>' +
      '<div class="hlt-field frag"><label for="hltc-phone">Phone</label>' +
      '<input id="hltc-phone" type="tel" autocomplete="tel" placeholder="(919) 555-0100"></div>' +
      '<label class="hlt-contact__check frag"><input type="checkbox" id="hltc-text"> I prefer text</label>' +
      '<div class="hlt-field frag"><label for="hltc-msg">Message</label>' +
      '<textarea id="hltc-msg" rows="3" maxlength="500" placeholder="What\u2019s on your mind?"></textarea></div>' +
      '<button class="hlt-btn frag" type="submit" style="justify-self:start">Send to Coach Mich</button>' +
      '</form>';
    panel.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      panel.innerHTML = CLOSE_BTN +
        '<div class="hlt-contact__sent">' +
        '<p class="hlt-contact__title frag" style="animation:hlt-frag-in .6s var(--hlt-ease) forwards">Sent<span style="color:var(--hlt-accent)">.</span></p>' +
        '<p class="frag" style="color:var(--hlt-ink-dim); font-size:.9rem; animation:hlt-frag-in .6s var(--hlt-ease) .15s forwards">Coach Mich personally reads every message and replies within 24 hours.</p>' +
        '</div>';
      wireClose();
    });
  }

  function renderAffiliates() {
    panel.innerHTML = CLOSE_BTN +
      '<div style="display:grid; gap:.95rem; padding:.5rem 0">' +
      '<p class="hlt-eyebrow frag">Affiliates</p>' +
      '<h3 class="hlt-contact__title frag">Coming Soon<span style="color:var(--hlt-accent)">.</span></h3>' +
      '<p class="frag" style="color:var(--hlt-ink-dim); font-size:.9rem; max-width:34ch">The full roster of AAU partners and program affiliates is on its way.</p>' +
      '</div>';
  }

  function wireClose() {
    var btn = panel.querySelector('.hlt-contact__close');
    if (btn) btn.addEventListener('click', close);
  }

  function scatter() {
    panel.querySelectorAll('.frag').forEach(function (el, i) {
      var angle = (i * 137.5) * Math.PI / 180;
      var radius = 26 + (i * 31) % 34;
      el.style.setProperty('--fx', Math.round(Math.cos(angle) * radius) + 'px');
      el.style.setProperty('--fy', Math.round(Math.sin(angle) * radius) + 'px');
      el.style.setProperty('--fr', (((i % 2) ? 1 : -1) * (3 + (i * 17) % 6)) + 'deg');
      el.style.animationDelay = (0.12 + i * 0.07) + 's';
    });
  }

  function open(trigger, mode) {
    ensure();
    if (mode === 'affiliates') renderAffiliates();
    else renderContact();
    wireClose();
    wrap.hidden = false;
    scatter();
    panel.style.visibility = 'hidden';
    requestAnimationFrame(function () {
      var r = trigger.getBoundingClientRect();
      var docTop = r.top + (window.scrollY || 0);
      var docLeft = r.left + (window.scrollX || 0);
      var pw = panel.offsetWidth;
      var ph = panel.offsetHeight;
      var pageW = document.documentElement.clientWidth;
      var left = Math.max(10, Math.min(docLeft + r.width / 2 - pw / 2, pageW - pw - 10));
      var top = Math.max(10, docTop - ph - 16);
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.visibility = '';
      wrap.classList.add('is-in');
      var email = panel.querySelector('#hltc-email');
      if (email) email.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!wrap || wrap.hidden) return;
    wrap.classList.remove('is-in');
    wrap.classList.add('is-closing');
    setTimeout(function () {
      wrap.classList.remove('is-closing');
      wrap.hidden = true;
    }, 300);
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href="#contact"], a[href="#affiliates"]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    open(a, a.getAttribute('href') === '#affiliates' ? 'affiliates' : 'contact');
  }, true);
})();

/* ============================================================
   v0.8 — mobile hamburger: toggle injected into every .hlt-nav;
   menu closes on any link tap or outside tap
   ============================================================ */
(function () {
  'use strict';
  document.querySelectorAll('.hlt-nav').forEach(function (nav) {
    var links = nav.querySelector('.hlt-nav__links');
    if (!links) return;
    var btn = document.createElement('button');
    btn.className = 'hlt-nav__toggle';
    btn.setAttribute('aria-label', 'Menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span>';
    nav.appendChild(btn);
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function () {
      nav.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.hlt-nav.menu-open').forEach(function (nav) {
      if (!nav.contains(e.target)) nav.classList.remove('menu-open');
    });
  });
})();
