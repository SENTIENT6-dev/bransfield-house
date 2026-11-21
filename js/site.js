// Mobile menu toggle. The site works without JavaScript; this only opens and closes the menu on small screens.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

// Expandable photos. Clicking a photo enlarges it over a blurred page. Scrolling, Escape or another click sends it
// back to wherever its place on the page is at that moment, so it lands correctly even while the page keeps moving.
(function () {
  var thumbs = document.querySelectorAll('.media img, .gallery img');
  if (!thumbs.length || !window.requestAnimationFrame) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DURATION = reduceMotion ? 1 : 360;   // milliseconds for the zoom in either direction
  var active = null;                        // the photo that is currently expanded, or on its way in or out

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Where the enlarged photo sits: centred, whole photo visible, never larger than the file itself.
  function expandedRect(img) {
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var margin = Math.max(12, Math.min(vw, vh) * 0.04);
    var nw = img.naturalWidth || 3;
    var nh = img.naturalHeight || 2;
    var scale = Math.min((vw - 2 * margin) / nw, (vh - 2 * margin) / nh, 1);
    var w = nw * scale;
    var h = nh * scale;
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  }

  function frame(now) {
    var a = active;
    if (!a) return;
    var step = (now - a.last) / DURATION;       // by the clock, so a slow device still finishes on time
    a.last = now;
    a.progress = a.opening ? Math.min(1, a.progress + step) : Math.max(0, a.progress - step);

    var t = ease(a.progress);
    var from = a.thumb.getBoundingClientRect();   // read every frame: this is where the photo belongs right now
    var to = expandedRect(a.thumb);
    var s = a.clone.style;
    s.left = (from.left + (to.left - from.left) * t) + 'px';
    s.top = (from.top + (to.top - from.top) * t) + 'px';
    s.width = (from.width + (to.width - from.width) * t) + 'px';
    s.height = (from.height + (to.height - from.height) * t) + 'px';
    s.borderRadius = (10 - 4 * t) + 'px';
    s.boxShadow = '0 ' + (24 * t) + 'px ' + (70 * t) + 'px rgba(0, 0, 0, ' + (0.35 * t) + ')';
    a.backdrop.style.opacity = t;

    if (!a.opening && a.progress === 0) { finish(); return; }
    a.raf = window.requestAnimationFrame(frame);
  }

  function open(thumb) {
    if (active || !thumb.complete || !thumb.naturalWidth) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'zoom-backdrop';

    var clone = document.createElement('img');
    clone.className = 'zoom-photo';
    clone.src = thumb.currentSrc || thumb.src;
    clone.alt = thumb.alt;

    var r = thumb.getBoundingClientRect();
    clone.style.left = r.left + 'px';
    clone.style.top = r.top + 'px';
    clone.style.width = r.width + 'px';
    clone.style.height = r.height + 'px';

    document.body.appendChild(backdrop);
    document.body.appendChild(clone);
    thumb.style.visibility = 'hidden';

    active = { thumb: thumb, clone: clone, backdrop: backdrop, progress: 0, opening: true, last: performance.now(), raf: 0, scrollY: window.pageYOffset };

    backdrop.addEventListener('click', close);
    clone.addEventListener('click', close);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('touchmove', close, { passive: true });
    document.addEventListener('keydown', onKey);

    active.raf = window.requestAnimationFrame(frame);
  }

  function close() {
    if (active) active.opening = false;
  }

  // Only a real change of position counts, so a scroll event left over from before the click does not close it.
  function onScroll() {
    if (active && Math.abs(window.pageYOffset - active.scrollY) > 2) close();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function finish() {
    var a = active;
    if (!a) return;
    window.cancelAnimationFrame(a.raf);
    a.thumb.style.visibility = '';
    a.clone.remove();
    a.backdrop.remove();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', close);
    window.removeEventListener('touchmove', close);
    document.removeEventListener('keydown', onKey);
    active = null;
  }

  Array.prototype.forEach.call(thumbs, function (thumb) {
    thumb.classList.add('zoomable');
    thumb.tabIndex = 0;
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('aria-label', 'Enlarge photo: ' + thumb.alt);
    thumb.addEventListener('click', function () { open(thumb); });
    thumb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (active) { close(); } else { open(thumb); }
      }
    });
  });
})();
