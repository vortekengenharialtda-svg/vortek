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

// CFD — WebGL GLSL fluid shader (Overdrive), fallback to 2D particles
function initCFDShader() {
  const canvas = document.getElementById('cfd-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
           || canvas.getContext('experimental-webgl', { antialias: false, alpha: false });
  if (!gl) { initCFD2D(); return; }

  let W = 0, H = 0, animId = null;
  const cursor = { x: 0, y: 0 };

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, `attribute vec4 aPos; void main(){gl_Position=aPos;}`);

  const fs = compile(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;
    float h21(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+74.21);return fract(p.x*p.y);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
      return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);
    }
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.3+vec2(1.7,9.2);a*=.5;}return v;}
    void main(){
      vec2 uv=gl_FragCoord.xy/uRes;
      float ar=uRes.x/uRes.y;
      vec2 p=uv*vec2(ar,1.);
      vec2 m=uMouse/uRes*vec2(ar,1.);
      float md=length(p-m);
      vec2 dist=(p-m)/max(md*md*8.,.002)*.04;
      float t=uTime;
      vec2 q=p*2.+dist+t*.05;
      float eps=.002;
      vec2 qe=q+vec2(0.,t*.06);
      vec2 curl=vec2(
        (fbm(qe+vec2(0.,eps))-fbm(qe-vec2(0.,eps)))/(2.*eps),
        -(fbm(qe+vec2(eps,0.))-fbm(qe-vec2(eps,0.)))/(2.*eps)
      )*.25;
      vec2 r=q+curl+t*.03;
      float f=fbm(r+t*.04);
      float detail=fbm(r*2.5+t*.02);
      float combined=f*.65+detail*.35;
      float stream=(sin(combined*22.+t*.35)*.5+.5)*(sin(detail*14.-t*.15)*.5+.5);
      vec3 col=vec3(1.);
      col=mix(col,vec3(.0,.533,.733),combined*.10+stream*combined*.04);
      col=mix(col,vec3(.416,.686,.0),max(0.,combined-.55)*.18);
      col=mix(col,vec3(.0,.533,.733),smoothstep(.28,0.,md*ar)*.12);
      float fade=smoothstep(0.,.10,uv.x)*smoothstep(1.,.90,uv.x)
                *smoothstep(0.,.06,uv.y)*smoothstep(1.,.94,uv.y);
      col=mix(vec3(1.),col,fade);
      gl_FragColor=vec4(col,1.);
    }
  `);

  if (!vs || !fs) { initCFD2D(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { initCFD2D(); return; }

  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPosLoc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPosLoc);
  gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

  const uTime  = gl.getUniformLocation(prog, 'uTime');
  const uRes   = gl.getUniformLocation(prog, 'uRes');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');

  function resize() {
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    cursor.x = W * 0.5; cursor.y = H * 0.5;
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const hero = document.getElementById('hero');
  hero.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    cursor.x = e.clientX - r.left;
    cursor.y = H - (e.clientY - r.top);
  }, { passive: true });
  hero.addEventListener('mouseleave', () => { cursor.x = W * 0.5; cursor.y = H * 0.5; });

  let t = 0;
  function step() {
    t += 0.008;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, W, H);
    gl.uniform2f(uMouse, cursor.x, cursor.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(step);
  }

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!animId) animId = requestAnimationFrame(step); }
    else { cancelAnimationFrame(animId); animId = null; }
  }, { threshold: 0 }).observe(hero);

  animId = requestAnimationFrame(step);
}

// 2D particle fallback (original)
function initCFD2D() {
  const canvas = document.getElementById('cfd-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const N = 150;
  const cursor = { x: -999, y: -999 };
  let W = 0, H = 0, t = 0, animId = null;

  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const hero = document.getElementById('hero');
  hero.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    cursor.x = e.clientX - r.left; cursor.y = e.clientY - r.top;
  }, { passive: true });
  hero.addEventListener('mouseleave', () => { cursor.x = -999; cursor.y = -999; });

  function field(x, y) {
    const nx = x / W, ny = y / H;
    return 0.18 + Math.sin(ny * 3.6 + t * 0.14) * 0.85
                + Math.cos(nx * 2.9 + t * 0.11) * 0.65
                + Math.sin((nx - ny) * 2.1 + t * 0.07) * 0.4;
  }

  const particles = Array.from({ length: N }, (_, i) => ({
    x: Math.random() * (W || 800), y: Math.random() * (H || 600),
    speed: 0.7 + Math.random() * 0.9, cyan: i % 3 !== 2,
  }));

  function step() {
    ctx.fillStyle = 'rgba(255,255,255,0.065)';
    ctx.fillRect(0, 0, W, H);
    t += 0.007;
    for (const p of particles) {
      const angle = field(p.x, p.y);
      let vx = Math.cos(angle) * p.speed, vy = Math.sin(angle) * p.speed;
      const dx = p.x - cursor.x, dy = p.y - cursor.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 115 && d > 0.5) { const f = (115 - d) / 115; vx += (dx/d)*f*2.8; vy += (dy/d)*f*2.8; }
      p.x += vx; p.y += vy;
      if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, 6.283);
      ctx.fillStyle = p.cyan ? 'rgba(0,136,187,0.72)' : 'rgba(106,175,0,0.68)';
      ctx.fill();
    }
    animId = requestAnimationFrame(step);
  }

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!animId) animId = requestAnimationFrame(step); }
    else { cancelAnimationFrame(animId); animId = null; }
  }, { threshold: 0 }).observe(hero);

  animId = requestAnimationFrame(step);
}

if (!prefersReduced) initCFDShader();

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

// Easter egg — delight para devs curiosos
console.log('%c VORTEK ENGENHARIA ', 'background:#0088BB;color:#fff;font-size:13px;font-weight:700;padding:4px 10px;letter-spacing:2px;');
console.log('%cEngenharia de precisão — Cálculo estrutural, CFD, BIM, Andaimes · Tucuruí, PA\n%cCurioso com o código? Contato: admvortek@gmail.com', 'color:#6AAF00;font-weight:600;font-size:11px;', 'color:#556070;font-size:11px;');

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
