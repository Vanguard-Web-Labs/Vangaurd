/* ============================================================
   VANGUARD WEB LAB — LIQUID GOLD & COCOA PARTICLE FIELD
   HTML5 Canvas mouse-repel physics + constellation lines
   ============================================================ */

(function () {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');

  const COLORS = ['#E5B869', '#C88A54', '#FAF3EB'];
  const PARTICLE_COUNT = 140;
  const LINK_DIST = 130;
  const MOUSE_RADIUS = 160;
  const REPEL_FORCE = 2.6;

  let width, height, dpr;
  let particles = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let vortices = []; // click bursts

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(initial) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.baseVX = (Math.random() - 0.5) * 0.25;
      this.baseVY = (Math.random() - 0.5) * 0.25;
      this.vx = this.baseVX;
      this.vy = this.baseVY;
      this.radius = Math.random() * 1.8 + 0.6;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.twinklePhase = Math.random() * Math.PI * 2;
    }
    update(time) {
      // gentle drift
      this.vx += (this.baseVX - this.vx) * 0.02;
      this.vy += (this.baseVY - this.vy) * 0.02;

      // mouse repulsion with velocity wave
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < MOUSE_RADIUS) {
          const force = (1 - dist / MOUSE_RADIUS) * REPEL_FORCE;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
        }
      }

      // vortex click bursts
      for (let i = vortices.length - 1; i >= 0; i--) {
        const v = vortices[i];
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < v.radius) {
          const angle = Math.atan2(dy, dx) + Math.PI / 2; // tangential = vortex swirl
          const strength = v.strength * (1 - dist / v.radius);
          this.vx += Math.cos(angle) * strength;
          this.vy += Math.sin(angle) * strength;
          // outward push too
          this.vx += (dx / dist) * strength * 0.4;
          this.vy += (dy / dist) * strength * 0.4;
        }
      }

      this.x += this.vx;
      this.y += this.vy;

      // damping
      this.vx *= 0.96;
      this.vy *= 0.96;

      // wrap edges
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;

      this.twinkle = 0.55 + Math.sin(time * 0.002 + this.twinklePhase) * 0.35;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.twinkle;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
  }

  function drawLinks() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(229,184,105,' + (1 - dist / LINK_DIST) * 0.25 + ')';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function loop(time) {
    ctx.clearRect(0, 0, width, height);

    for (let i = vortices.length - 1; i >= 0; i--) {
      vortices[i].life -= 1;
      vortices[i].radius += 4;
      vortices[i].strength *= 0.95;
      if (vortices[i].life <= 0) vortices.splice(i, 1);
    }

    for (const p of particles) {
      p.update(time);
    }
    drawLinks();
    for (const p of particles) {
      p.draw();
    }

    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);

  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  document.documentElement.addEventListener('mouseleave', () => { mouse.active = false; });

  window.addEventListener('pointerdown', (e) => {
    vortices.push({
      x: e.clientX,
      y: e.clientY,
      radius: 20,
      strength: 6,
      life: 60
    });
  });

  init();
  requestAnimationFrame(loop);
})();
