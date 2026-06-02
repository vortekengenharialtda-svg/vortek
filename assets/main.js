// Navbar scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.background = window.scrollY > 40
    ? 'rgba(255,255,255,.99)'
    : 'rgba(255,255,255,.92)';
});

// Mobile menu
function toggleMenu() {
  document.getElementById('navMobile').classList.toggle('open');
}

// Close mobile menu on outside click
document.addEventListener('click', e => {
  const menu = document.getElementById('navMobile');
  const burger = document.querySelector('.nav-burger');
  if (!menu.contains(e.target) && !burger.contains(e.target)) {
    menu.classList.remove('open');
  }
});

// Scroll-reveal
const observer = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(
  '.servico-card, .stat-card, .metodo-step, .setor-item, .contato-item, .sobre-text, .sobre-stats'
).forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

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
});
