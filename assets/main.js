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
