/* ============================================================
   VANGUARD WEB LAB — GSAP ANIMATION SYSTEM
   Every feature runs inside safe(): if one throws, it is logged
   to the console and every other feature keeps working.
   ============================================================ */

const CONFIG = {
  contactEmail: 'vanguardweblab@gmail.com'
};

function safe(fn, label) {
  try { fn(); }
  catch (err) { console.error('[Vanguard Web Lab] "' + label + '" failed to initialize:', err); }
}

if (typeof ScrollToPlugin !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, TextPlugin, ScrollToPlugin);
} else {
  gsap.registerPlugin(ScrollTrigger, TextPlugin);
}

let scrollVelocity = 0;
let lenis = null;
let heroIntro = null;
let preloaderDone = false;
let entranceDone = false;

/* ============================================================
   SPLIT TEXT — walks child nodes so <em>/<br> inside a heading
   keep their styling (textContent would flatten them).
   ============================================================ */
function splitNode(node, chars) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 3) {
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach((part) => {
        if (part === '') return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const word = document.createElement('span');
        word.className = 'word';
        word.setAttribute('aria-hidden', 'true');
        word.style.display = 'inline-block';
        word.style.whiteSpace = 'nowrap';
        Array.from(part).forEach((ch) => {
          const s = document.createElement('span');
          s.className = 'char';
          s.textContent = ch;
          word.appendChild(s);
          chars.push(s);
        });
        frag.appendChild(word);
      });
      node.replaceChild(frag, child);
    } else if (child.nodeType === 1 && child.tagName !== 'BR') {
      splitNode(child, chars);
    }
  });
}

function runSplitHeadlines() {
  document.querySelectorAll('[data-split-chars]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const chars = [];
    splitNode(el, chars);
    el.__chars = chars;

    // each char of an <em> gets its slice of the gradient
    el.querySelectorAll('em').forEach((em) => {
      const ec = em.querySelectorAll('.char');
      const n = ec.length;
      ec.forEach((c, i) => {
        c.style.backgroundSize = (n * 100) + '% 100%';
        c.style.backgroundPosition = (n > 1 ? (i / (n - 1)) * 100 : 0) + '% 0';
      });
    });

    gsap.set(chars, { display: 'inline-block', transformPerspective: 600 });

    const intro = {
      rotateY: 90, opacity: 0, y: 24,
      duration: 0.7, stagger: 0.018, ease: 'back.out(1.6)'
    };
    if (el.classList.contains('hero-headline')) {
      // hero headline plays after the preloader, not behind it
      heroIntro = gsap.from(chars, Object.assign({ paused: true }, intro));
    } else {
      gsap.from(chars, Object.assign({}, intro, {
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      }));
    }

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      chars.forEach((c) => {
        const cRect = c.getBoundingClientRect();
        const cx = cRect.left - rect.left + cRect.width / 2;
        const influence = Math.max(0, 1 - Math.abs(mx - cx) / 90);
        if (influence > 0.02) {
          gsap.to(c, {
            y: -10 * influence,
            color: influence > 0.15 ? '#E5B869' : '',
            textShadow: influence > 0.15 ? '0 0 ' + (14 * influence) + 'px #E5B869' : 'none',
            duration: 0.25,
            overwrite: 'auto'
          });
        }
      });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(chars, { y: 0, color: '', textShadow: 'none', duration: 0.5, overwrite: 'auto' });
    });
  });
}

/* ============================================================
   1. PRELOADER — scrambling counter, cycling words, 5 shutters
   ============================================================ */
function finishPreloader() {
  if (preloaderDone) return;
  preloaderDone = true;
  const preloader = document.getElementById('preloader');
  if (preloader) preloader.style.display = 'none';
  document.querySelectorAll('.shutter-col').forEach((s) => (s.style.display = 'none'));
  document.body.classList.remove('is-loading');
  document.body.classList.add('loaded');
  if (lenis) lenis.start();
  safe(runEntrance, 'hero entrance');
  safe(() => ScrollTrigger.refresh(), 'refresh after preloader');
}

function runPreloader() {
  const words = ['BREWING PIXELS', 'CRAFTING GRAPHICS', 'LAUNCHING VANGUARD'];
  const wordEl = document.getElementById('preloaderWord');
  const countEl = document.getElementById('preloaderCount');
  const barFill = document.getElementById('preloaderBarFill');
  const preloader = document.getElementById('preloader');
  const shutters = gsap.utils.toArray('.shutter-col');

  let wordIndex = 0;
  const wordInterval = setInterval(() => {
    wordIndex = (wordIndex + 1) % words.length;
    gsap.to(wordEl, { duration: 0.3, text: words[wordIndex], ease: 'none' });
  }, 650);

  const scramble = '0123456789';
  const counter = { val: 0 };
  gsap.to(counter, {
    val: 100,
    duration: 2.3,
    ease: 'power2.inOut',
    onUpdate: () => {
      const v = Math.floor(counter.val);
      const settled = String(v).padStart(2, '0');
      const flicker = counter.val < 99 && Math.random() < 0.35;
      countEl.textContent = flicker
        ? settled.replace(/\d/g, () => scramble[Math.floor(Math.random() * 10)])
        : settled;
      barFill.style.width = counter.val + '%';
    },
    onComplete: () => {
      clearInterval(wordInterval);
      countEl.textContent = '100';
      barFill.style.width = '100%';
      gsap.timeline({ onComplete: finishPreloader })
        .to('.preloader-inner', { opacity: 0, y: -30, duration: 0.35, ease: 'power2.in' })
        .to(shutters, { scaleY: 1, duration: 0.7, ease: 'expo.inOut', stagger: 0.08 }, '-=0.1')
        .add(() => { preloader.style.display = 'none'; })
        .to(shutters, { scaleY: 0, transformOrigin: 'top center', duration: 0.9, ease: 'expo.inOut', stagger: 0.08 }, '+=0.1');
    }
  });
}

function runEntrance() {
  if (entranceDone) return;
  entranceDone = true;
  if (heroIntro) heroIntro.play();
  gsap.fromTo('.hero-badge, .hero-sub, .hero-ctas',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.15 });
  gsap.fromTo('.hero-card',
    { opacity: 0, y: 60 },
    { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: 'power3.out', delay: 0.2 });
}

/* failsafe: a blocked CDN can never trap the visitor behind the loader */
function armPreloaderFailsafe() {
  setTimeout(finishPreloader, 8000);
}

/* ============================================================
   2. LENIS SMOOTH SCROLL & STANDALONE SMOOTH ANCHOR LINKS
   ============================================================ */
function runLenis() {
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.stop(); // locked until the preloader finishes

  lenis.on('scroll', ScrollTrigger.update);
  lenis.on('scroll', (e) => { scrollVelocity = e.velocity || 0; });
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
}

function runSmoothAnchorLinks() {
  let lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
  window.addEventListener('scroll', () => {
    const currentY = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (!lenis) {
      scrollVelocity = (currentY - lastScrollY) * 0.35;
    }
    lastScrollY = currentY;
  }, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      ScrollTrigger.refresh();

      // Calculate exact target position (accounting for any pinned sections)
      const offset = id === '#work' ? 0 : -10;
      const targetY = Math.max(0, target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) + offset);

      if (lenis) {
        lenis.scrollTo(targetY, {
          duration: 1.4,
          easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
        });
      } else if (typeof ScrollToPlugin !== 'undefined') {
        gsap.to(window, {
          duration: 1.35,
          scrollTo: { y: targetY, autoKill: true },
          ease: 'expo.inOut',
          overwrite: 'auto',
          onUpdate: ScrollTrigger.update
        });
      } else {
        const proxy = { y: window.pageYOffset || document.documentElement.scrollTop || 0 };
        gsap.to(proxy, {
          y: targetY,
          duration: 1.35,
          ease: 'expo.inOut',
          overwrite: 'auto',
          onUpdate: () => {
            window.scrollTo(0, proxy.y);
            ScrollTrigger.update();
          }
        });
      }
    });
  });
}

/* ============================================================
   3. 3-LAYER MORPHING PHYSICS CURSOR
   ============================================================ */
function runCustomCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  const ringText = document.getElementById('cursorRingText');
  const cometSeed = document.getElementById('cometTail');
  if (!dot || !ring) return;
  if (cometSeed) cometSeed.style.display = 'none';

  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let dotX = mouseX, dotY = mouseY, ringX = mouseX, ringY = mouseY;

  const COMET_LENGTH = 10;
  const cometNodes = [];
  for (let i = 0; i < COMET_LENGTH; i++) {
    const node = document.createElement('div');
    const size = 5 - i * 0.35;
    node.style.cssText =
      'position:fixed;top:0;left:0;border-radius:50%;pointer-events:none;z-index:9499;' +
      'background:#fff;mix-blend-mode:difference;visibility:hidden;' +
      'width:' + size + 'px;height:' + size + 'px;opacity:' + ((1 - i / COMET_LENGTH) * 0.5);
    document.body.appendChild(node);
    cometNodes.push({ el: node, x: mouseX, y: mouseY });
  }

  let seen = false;
  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!seen) {
      seen = true;
      dotX = ringX = mouseX; dotY = ringY = mouseY;
      cometNodes.forEach((n) => { n.x = mouseX; n.y = mouseY; n.el.style.visibility = 'visible'; });
    }
    document.body.classList.add('cursor-ready');
  });
  document.documentElement.addEventListener('mouseleave', () => {
    document.body.classList.remove('cursor-ready');
    cometNodes.forEach((n) => (n.el.style.visibility = 'hidden'));
  });
  document.documentElement.addEventListener('mouseenter', () => {
    if (seen) cometNodes.forEach((n) => (n.el.style.visibility = 'visible'));
  });

  function raf() {
    dotX += (mouseX - dotX) * 0.9;
    dotY += (mouseY - dotY) * 0.9;
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    dot.style.transform = 'translate(' + dotX + 'px,' + dotY + 'px) translate(-50%,-50%)';
    ring.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px) translate(-50%,-50%)';

    let px = mouseX, py = mouseY;
    cometNodes.forEach((n, i) => {
      n.x += (px - n.x) * (0.55 - i * 0.02);
      n.y += (py - n.y) * (0.55 - i * 0.02);
      n.el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px) translate(-50%,-50%)';
      px = n.x; py = n.y;
    });
    requestAnimationFrame(raf);
  }
  raf();

  document.querySelectorAll('a, button, [data-cursor-text]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const label = el.getAttribute('data-cursor-text');
      if (label) {
        ring.classList.remove('is-hover');
        ring.classList.add('is-active');
        ringText.textContent = label;
      } else {
        ring.classList.add('is-hover');
      }
    });
    el.addEventListener('mouseleave', () => {
      ring.classList.remove('is-active', 'is-hover');
      ringText.textContent = '';
    });
  });

  // only now is it safe to hide the native pointer
  document.body.classList.add('has-custom-cursor');
}

/* ============================================================
   4. MAGNETIC SPRING BUTTONS
   ============================================================ */
function runMagneticButtons() {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const radius = 60;
    let bounds;
    el.addEventListener('mouseenter', () => { bounds = el.getBoundingClientRect(); });
    el.addEventListener('mousemove', (e) => {
      if (!bounds) bounds = el.getBoundingClientRect();
      const relX = e.clientX - (bounds.left + bounds.width / 2);
      const relY = e.clientY - (bounds.top + bounds.height / 2);
      const dist = Math.sqrt(relX * relX + relY * relY);
      const maxDist = radius + bounds.width / 2;
      if (dist < maxDist) {
        const pull = 1 - dist / maxDist;
        gsap.to(el, { x: relX * 0.35 * pull, y: relY * 0.35 * pull, duration: 0.3, ease: 'power2.out' });
      }
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.35)' });
    });
  });
}

/* ============================================================
   5. 3D HOLOGRAPHIC CARD TILT + SPECULAR GLARE
   ============================================================ */
function runCardTilt() {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    const maxTilt = parseFloat(card.getAttribute('data-tilt-max')) || 8;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      gsap.to(card, {
        rotateX: (0.5 - py) * maxTilt * 2,
        rotateY: (px - 0.5) * maxTilt * 2,
        transformPerspective: 1000,
        duration: 0.4,
        ease: 'power2.out'
      });
      const glare = card.querySelector('.service-card-glare');
      if (glare) {
        glare.style.background = 'radial-gradient(circle at ' + (px * 100) + '% ' + (py * 100) + '%, rgba(229,184,105,0.35), transparent 55%)';
      }
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ============================================================
   HERO — 3D floating mockup stack that separates on mouse move
   ============================================================ */
function runHeroStack() {
  const stack = document.getElementById('heroStack');
  if (!stack) return;
  const rig = stack.querySelector('.hero-stack-rig');
  const cards = gsap.utils.toArray('.hero-card', stack);
  const baseZ = [90, 10, -70];

  gsap.to(rig, { y: -12, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  const rotY = gsap.quickTo(rig, 'rotationY', { duration: 0.9, ease: 'power3.out' });
  const rotX = gsap.quickTo(rig, 'rotationX', { duration: 0.9, ease: 'power3.out' });

  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    rotY(nx * 22);
    rotX(-ny * 16);
    const spread = 1 + Math.min(Math.hypot(nx, ny), 1.4) * 0.9;
    cards.forEach((c, i) => {
      gsap.to(c, { z: baseZ[i] * spread, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
    });
  });
}

/* ============================================================
   6. CRISS-CROSS MARQUEES — speed + skew follow scroll velocity
   ============================================================ */
function runMarquee() {
  gsap.set('.marquee-row-up', { rotation: -3, yPercent: -50 });
  gsap.set('.marquee-row-down', { rotation: 3, yPercent: -50 });

  const tweens = [];
  document.querySelectorAll('[data-marquee]').forEach((t) => {
    tweens.push(gsap.to(t, { xPercent: -100, repeat: -1, duration: 22, ease: 'none' }));
  });
  document.querySelectorAll('[data-marquee-rev]').forEach((t) => {
    tweens.push(gsap.fromTo(t, { xPercent: -100 }, { xPercent: 0, repeat: -1, duration: 26, ease: 'none' }));
  });

  let boost = 1;
  gsap.ticker.add(() => {
    const target = 1 + Math.min(Math.abs(scrollVelocity) * 0.5, 8);
    boost += (target - boost) * 0.08;
    tweens.forEach((t) => t.timeScale(boost));
    const skew = gsap.utils.clamp(-14, 14, scrollVelocity * -1.3);
    gsap.set('.marquee-row-up', { skewX: skew });
    gsap.set('.marquee-row-down', { skewX: -skew });
    scrollVelocity *= 0.92;
  });
}

/* ============================================================
   7. HORIZONTAL SCROLL-HIJACK PORTFOLIO (desktop only —
   on phones the row is a normal swipeable strip)
   ============================================================ */
function runHorizontalWork() {
  const track = document.getElementById('workTrack');
  const pinSection = document.querySelector('.work-pin');
  if (!track || !pinSection) return;

  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    const getDist = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const tween = gsap.to(track, {
      x: () => -getDist(),
      ease: 'none',
      scrollTrigger: {
        trigger: pinSection,
        start: 'top top',
        end: () => '+=' + getDist(),
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    gsap.utils.toArray('.work-card').forEach((card) => {
      const visual = card.querySelector('.work-card-visual');
      gsap.set(card, { transformPerspective: 1000 });
      const makeST = () => ({
        trigger: card,
        containerAnimation: tween,
        start: 'left 100%',
        end: 'right 0%',
        scrub: true
      });
      gsap.timeline({ scrollTrigger: makeST() })
        .fromTo(card, { rotateY: -14, scale: 0.92 }, { rotateY: 0, scale: 1, ease: 'none', duration: 0.5 })
        .to(card, { rotateY: 14, scale: 0.92, ease: 'none', duration: 0.5 });
      if (visual) {
        gsap.fromTo(visual, { x: 22 }, { x: -22, ease: 'none', scrollTrigger: makeST() });
      }
    });
  });
}

/* ============================================================
   8. BENTO COUNTERS
   ============================================================ */
function runCounters() {
  const els = document.querySelectorAll('[data-counter]');
  if (!els.length) return;

  function render(el, value) {
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const unit = el.getAttribute('data-unit') || '';
    el.innerHTML = prefix + value + suffix + (unit ? '<span class="bento-unit">' + unit + '</span>' : '');
  }
  function animate(el) {
    const target = parseFloat(el.getAttribute('data-target'));
    const c = { val: 0 };
    gsap.to(c, {
      val: target, duration: 1.6, ease: 'power2.out',
      onUpdate: () => render(el, Math.floor(c.val)),
      onComplete: () => render(el, target)
    });
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach(animate);
  }
}

/* ============================================================
   9. PRICING TIMELINE — SVG LINE DRAWS ITSELF ON SCROLL
   ============================================================ */
function runTimelineDraw() {
  const line = document.getElementById('timelineDraw');
  const wrap = document.getElementById('timeline');
  if (!line || !wrap) return;
  const length = line.getTotalLength ? line.getTotalLength() : 600;
  line.style.strokeDasharray = length;
  line.style.strokeDashoffset = length;
  gsap.to(line, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: wrap, start: 'top 70%', end: 'bottom 60%', scrub: 0.6 }
  });
}

/* ============================================================
   10. SVG LIQUID WAVE DIVIDERS
   ============================================================ */
function runWaveDividers() {
  const BOTTOM_B = 'M0,80 C240,20 480,140 720,80 C960,20 1200,140 1440,80 L1440,160 L0,160 Z';
  const TOP_B = 'M0,0 L1440,0 L1440,80 C1200,20 960,140 720,80 C480,20 240,140 0,80 Z';
  document.querySelectorAll('[data-wave]').forEach((svg, i) => {
    const path = svg.querySelector('.wave-path');
    if (!path) return;
    gsap.to(path, {
      duration: 4.5 + (i % 3) * 0.7, repeat: -1, yoyo: true, ease: 'sine.inOut',
      attr: { d: svg.classList.contains('wave-top') ? TOP_B : BOTTOM_B }
    });
  });
}

/* ============================================================
   11. LIVE ANIMATION SANDBOX
   ============================================================ */
function runSandbox() {
  const mock = document.getElementById('sandboxMock');
  if (!mock) return;
  const buyBtn = document.getElementById('sandboxBuy');
  const toast = document.getElementById('sandboxToast');
  let motionOn = false;
  let floatTween = null;
  let resetTimer = null;

  gsap.set(mock, { transformPerspective: 800 });

  document.querySelectorAll('[data-sandbox]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-sandbox');
      btn.classList.toggle('active');

      if (type === 'motion') {
        motionOn = !motionOn;
        mock.classList.toggle('motion-on', motionOn);
        if (motionOn) {
          gsap.to(mock, { rotationX: 6, rotationY: -9, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
          floatTween = gsap.to(mock, { y: -6, duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        } else {
          if (floatTween) floatTween.kill();
          gsap.to(mock, { rotationX: 0, rotationY: 0, y: 0, duration: 0.6, ease: 'power3.out' });
        }
      }
      if (type === 'theme') mock.classList.toggle('theme-dark');
      if (type === 'convert') {
        mock.classList.toggle('convert-on');
        gsap.fromTo(buyBtn, { scale: 1 }, { scale: 1.18, duration: 0.25, yoyo: true, repeat: 1 });
      }
    });
  });

  mock.addEventListener('mousemove', (e) => {
    if (!motionOn) return;
    const r = mock.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(mock, { rotationY: px * 22, rotationX: -py * 16, duration: 0.4, overwrite: 'auto' });
  });
  mock.addEventListener('mouseleave', () => {
    if (motionOn) gsap.to(mock, { rotationX: 6, rotationY: -9, duration: 0.7, ease: 'power3.out', overwrite: 'auto' });
  });

  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      const r = buyBtn.getBoundingClientRect();
      burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
      buyBtn.textContent = 'Ordered ✓';
      gsap.fromTo(buyBtn, { scale: 0.88 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      const boosted = mock.classList.contains('convert-on');
      toast.textContent = boosted
        ? '🎉 New order — your customers convert like this'
        : '🎉 New order received';
      gsap.killTweensOf(toast);
      gsap.fromTo(toast, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
      gsap.to(toast, { opacity: 0, duration: 0.4, delay: 2.4 });
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { buyBtn.textContent = 'Buy Now'; }, 2000);
    });
  }
}

/* ============================================================
   12. FAQ ACCORDIONS
   ============================================================ */
function runFaqAccordions() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          gsap.to(other.querySelector('.faq-answer'), { height: 0, duration: 0.4, ease: 'power2.inOut' });
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        gsap.to(answer, { height: 0, duration: 0.4, ease: 'power2.inOut' });
      } else {
        item.classList.add('open');
        gsap.set(answer, { height: 'auto' });
        const h = answer.offsetHeight;
        gsap.fromTo(answer, { height: 0 }, {
          height: h, duration: 0.45, ease: 'power2.inOut',
          onComplete: () => { gsap.set(answer, { height: 'auto' }); ScrollTrigger.refresh(); }
        });
      }
    });
  });
}

/* ============================================================
   13. CLICK-TO-COPY + GOLDEN CONFETTI
   ============================================================ */
function burstConfetti(x, y) {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  const colors = ['#E5B869', '#C88A54', '#FAF3EB', '#4ADE80'];
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.left = x + 'px';
    piece.style.top = y + 'px';
    layer.appendChild(piece);
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 120;
    gsap.to(piece, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist + 40,
      rotation: Math.random() * 360,
      opacity: 0,
      duration: 0.9 + Math.random() * 0.5,
      ease: 'power2.out',
      onComplete: () => piece.remove()
    });
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* ignore */ }
  ta.remove();
}
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function runClickToCopy() {
  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', (e) => {
      copyText(el.getAttribute('data-copy'));
      burstConfetti(e.clientX, e.clientY);
      const icon = el.querySelector('.contact-card-icon');
      if (icon) {
        const original = icon.textContent;
        icon.textContent = '✓';
        gsap.fromTo(icon, { scale: 0.5 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
        setTimeout(() => (icon.textContent = original), 1400);
      }
    });
  });
}

/* ============================================================
   14. ESTIMATOR FORM
   ============================================================ */
function runEstimatorForm() {
  const pills = document.querySelectorAll('#serviceToggles .pill-toggle');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  const slider = document.getElementById('budgetSlider');
  const output = document.getElementById('budgetOutput');
  if (slider) {
    slider.addEventListener('input', () => {
      output.textContent = '₹' + Number(slider.value).toLocaleString('en-IN') + (Number(slider.value) >= 2500 ? '+' : '');
    });
  }

  const form = document.getElementById('estimatorForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const service = (document.querySelector('#serviceToggles .pill-toggle.active') || {}).textContent || 'Website';
    const body =
      'Name: ' + (data.get('name') || '') + '\n' +
      'Business: ' + (data.get('business') || '') + '\n' +
      'Service: ' + service + '\n' +
      'Budget: ' + (output ? output.textContent : '') + '\n\n' +
      (data.get('message') || '');
    success.textContent = 'Thanks! Opening your email app with your details — or WhatsApp us for a faster reply.';
    success.classList.add('visible');
    gsap.fromTo(success, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
    burstConfetti(window.innerWidth / 2, window.innerHeight / 2);
    setTimeout(() => {
      window.location.href = 'mailto:' + CONFIG.contactEmail +
        '?subject=' + encodeURIComponent('New project enquiry — ' + service) +
        '&body=' + encodeURIComponent(body);
    }, 900);
  });
}

/* ============================================================
   BOOT
   ============================================================ */
safe(armPreloaderFailsafe, 'preloader failsafe');
safe(runLenis, 'lenis smooth scroll');
safe(runSmoothAnchorLinks, 'smooth anchor links');
safe(runHorizontalWork, 'horizontal work showcase');
safe(runSplitHeadlines, 'split headlines');
safe(runPreloader, 'preloader');
safe(runCustomCursor, 'custom cursor');
safe(runMagneticButtons, 'magnetic buttons');
safe(runCardTilt, 'card tilt');
safe(runHeroStack, 'hero 3d stack');
safe(runMarquee, 'marquee');
safe(runCounters, 'bento counters');
safe(runTimelineDraw, 'timeline draw');
safe(runWaveDividers, 'wave dividers');
safe(runSandbox, 'sandbox widget');
safe(runFaqAccordions, 'faq accordions');
safe(runClickToCopy, 'click to copy');
safe(runEstimatorForm, 'estimator form');

window.addEventListener('load', () => safe(() => ScrollTrigger.refresh(), 'scrolltrigger refresh'));
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => safe(() => ScrollTrigger.refresh(), 'refresh after fonts'));
}