const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Navbar scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.background = window.scrollY > 40
    ? 'rgba(255,255,255,.99)'
    : 'rgba(255,255,255,.92)';
}, { passive: true });

// Mobile menu + burger X
function toggleMenu() {
  const menu   = document.getElementById('navMobile');
  const burger = document.querySelector('.nav-burger');
  menu.classList.toggle('open');
  burger.classList.toggle('active');
}

document.addEventListener('click', e => {
  const menu   = document.getElementById('navMobile');
  const burger = document.querySelector('.nav-burger');
  if (!menu.contains(e.target) && !burger.contains(e.target)) {
    menu.classList.remove('open');
    burger.classList.remove('active');
  }
});

// Hero entrance
if (!prefersReduced) {
  document.getElementById('hero').classList.add('hero-ready');
}

// CFD Particle Field
function initCFD() {
  const canvas = document.getElementById('cfd-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const N = 150;
  const cursor = { x: -999, y: -999 };
  let W = 0, H = 0, t = 0, animId = null;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const hero = document.getElementById('hero');
  hero.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    cursor.x = e.clientX - r.left;
    cursor.y = e.clientY - r.top;
  }, { passive: true });
  hero.addEventListener('mouseleave', () => { cursor.x = -999; cursor.y = -999; });

  function field(x, y) {
    const nx = x / W, ny = y / H;
    return 0.18
      + Math.sin(ny * 3.6 + t * 0.14) * 0.85
      + Math.cos(nx * 2.9 + t * 0.11) * 0.65
      + Math.sin((nx - ny) * 2.1 + t * 0.07) * 0.4;
  }

  const particles = Array.from({ length: N }, (_, i) => ({
    x: Math.random() * (W || 800),
    y: Math.random() * (H || 600),
    speed: 0.7 + Math.random() * 0.9,
    cyan: i % 3 !== 2,
  }));

  function step() {
    // Fade-trail via semi-transparent white fill (no clearRect — accumulation is the effect)
    ctx.fillStyle = 'rgba(255,255,255,0.065)';
    ctx.fillRect(0, 0, W, H);
    t += 0.007;

    for (const p of particles) {
      const angle = field(p.x, p.y);
      let vx = Math.cos(angle) * p.speed;
      let vy = Math.sin(angle) * p.speed;

      // cursor deflection
      const dx = p.x - cursor.x, dy = p.y - cursor.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 115 && d > 0.5) {
        const f = (115 - d) / 115;
        vx += (dx / d) * f * 2.8;
        vy += (dy / d) * f * 2.8;
      }

      p.x += vx;
      p.y += vy;

      // wrap edges
      if (p.x < 0) p.x = W;
      else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      else if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, 6.283);
      ctx.fillStyle = p.cyan ? 'rgba(0,136,187,0.72)' : 'rgba(106,175,0,0.68)';
      ctx.fill();
    }
    animId = requestAnimationFrame(step);
  }

  // Pause when hero leaves viewport (perf)
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!animId) animId = requestAnimationFrame(step); }
    else { cancelAnimationFrame(animId); animId = null; }
  }, { threshold: 0 }).observe(hero);

  animId = requestAnimationFrame(step);
}

if (!prefersReduced) initCFD();

// Método step stagger indices
document.querySelectorAll('.metodo-step').forEach((el, i) => {
  el.style.setProperty('--i', i);
});

// Scroll-reveal — progressive enhancement
// Content visible by default; JS hides then reveals with motion
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const DURATION = '0.55s';

function setupReveal(el, delayMs = 0) {
  if (prefersReduced) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = `opacity ${DURATION} ${EASE} ${delayMs}ms, transform ${DURATION} ${EASE} ${delayMs}ms`;
}

function reveal(el) {
  el.style.opacity = '1';
  el.style.transform = '';
  setTimeout(() => { el.style.transitionDelay = '0ms'; }, 600);
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      reveal(entry.target);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

['.stat-card', '.setor-item', '.contato-item', '.sobre-text', '.sobre-stats', '.parceiro-card']
  .forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      setupReveal(el);
      revealObserver.observe(el);
    });
  });

// Servico cards — stagger within grid
document.querySelectorAll('.servico-card').forEach((el, i) => {
  setupReveal(el, i * 65);
  revealObserver.observe(el);
});

// Método section — trigger CSS stagger animation
const metodoObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    document.getElementById('metodo').classList.add('metodo-visible');
    metodoObserver.disconnect();
  }
}, { threshold: 0.1 });
const metodoSection = document.getElementById('metodo');
if (metodoSection) metodoObserver.observe(metodoSection);

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a, .nav-mobile a');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 100) current = s.id;
  });
  navLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}, { passive: true });
