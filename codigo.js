AOS.init({
  duration: 1000,
  once: true,
  offset: 50,
});

/* Siempre arrancar en Sobre mí: sin restauración de scroll ni hash */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);

const progress = document.getElementById('progress');
const scrollHint = document.querySelector('.scroll-hint');
const navEl = document.querySelector('nav');
const revealTargets = document.querySelectorAll('.main-section, .tech-stack, .projects, .form');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav ul a');
let lastScrollY = 0;

function setNavHidden(hidden) {
  const menu = document.getElementById('nav-menu');
  if (menu && menu.classList.contains('open')) hidden = false;
  navEl.classList.toggle('is-hidden', hidden);
}

function setProgress(p) {
  progress.style.height = p + '%';
  if (scrollHint) {
    scrollHint.style.setProperty('--sp', (p / 100).toFixed(3));
    scrollHint.classList.toggle('is-end', p >= 99);
  }
}

function updateActiveLink() {
  let current = '';
  sections.forEach((section) => {
    if (window.scrollY >= section.offsetTop - 150) {
      current = section.id;
    }
  });
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
}

/* Transición de entrada de cada sección al hacer scroll */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealTargets.forEach((el) => revealObserver.observe(el));

/* Snap: centrar la sección si entra en pantalla, sino anclarla arriba */
function updateSnapClasses() {
  revealTargets.forEach((el) => {
    const fits = el.offsetHeight <= window.innerHeight - 40;
    el.classList.toggle('snap-center', fits);
    el.classList.toggle('snap-start', !fits);
  });
}

updateSnapClasses();
window.addEventListener('resize', updateSnapClasses);
window.addEventListener('load', updateSnapClasses);

/* Scroll nativo: barra de progreso + scrollspy + nav auto-ocultable */
function onNativeScroll() {
  const scrollTop = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (scrollTop / height) * 100 : 0;
  setProgress(scrolled);
  updateActiveLink();

  const delta = scrollTop - lastScrollY;
  if (scrollTop < 60 || delta < -6) setNavHidden(false);
  else if (delta > 6) setNavHidden(true);
  lastScrollY = scrollTop;
}

let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    if (!document.documentElement.classList.contains('fullpage')) {
      onNativeScroll();
    }
    ticking = false;
  });
});

/* ===== Modo fullpage (una pantalla por sección, vuelo alternado) ===== */
const FP_ANIM_MS = 680;
const fpMQ = window.matchMedia('(min-width: 1000px) and (min-height: 700px) and (hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let fpActive = false;
let fpIndex = 0;
let fpLocked = false;
let touchStartY = 0;
let wheelAccum = 0;
let wheelResetTimer = null;

function fpRemoveAnim(el) {
  el.classList.remove(
    'fp-fly-out-left', 'fp-fly-out-down', 'fp-fly-out-right', 'fp-fly-out-up',
    'fp-fly-in-left', 'fp-fly-in-right', 'fp-fly-in-top', 'fp-fly-in-bottom'
  );
}

function fpCanScrollScreen(el) {
  return el.scrollHeight - el.clientHeight > 4;
}

function fpScreenAtEdge(el, dirDown) {
  if (!fpCanScrollScreen(el)) return true;
  if (dirDown) return el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
  return el.scrollTop <= 2;
}

function fpSyncNav() {
  const id = revealTargets[fpIndex] && revealTargets[fpIndex].id;
  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
  });
}

function fpPaintScreen(idx) {
  revealTargets.forEach((el, i) => {
    el.classList.toggle('is-active', i === idx);
    if (i === idx) el.classList.add('section-visible');
  });
  setProgress(((idx + 1) / revealTargets.length) * 100);
  fpSyncNav();
}

function fpFlyTo(nextIdx, dirDown) {
  if (fpLocked || nextIdx < 0 || nextIdx >= revealTargets.length || nextIdx === fpIndex) return;

  const outEl = revealTargets[fpIndex];
  const inEl = revealTargets[nextIdx];
  const forward = dirDown === true;
  const odd = nextIdx % 2 === 1;

  fpLocked = true;
  setNavHidden(nextIdx > fpIndex);

  /* Dirección de vuelo alternada según destino (ida y vuelta espejada) */
  let outClass, inClass;
  if (odd) {
    outClass = forward ? 'fp-fly-out-left' : 'fp-fly-out-down';
    inClass = forward ? 'fp-fly-in-right' : 'fp-fly-in-top';
  } else {
    outClass = forward ? 'fp-fly-out-down' : 'fp-fly-out-left';
    inClass = forward ? 'fp-fly-in-top' : 'fp-fly-in-right';
  }

  fpRemoveAnim(outEl);
  fpRemoveAnim(inEl);

  inEl.classList.remove('is-active');
  inEl.classList.add('is-active');
  inEl.classList.add('section-visible');
  void inEl.offsetWidth;
  inEl.classList.add(inClass);

  outEl.classList.add('is-exiting');
  void outEl.offsetWidth;
  outEl.classList.add(outClass);

  window.setTimeout(() => {
    outEl.classList.remove('is-active', 'is-exiting', outClass);
    inEl.classList.remove(inClass);
    fpIndex = nextIdx;
    fpLocked = false;
    fpSyncNav();
    setProgress(((fpIndex + 1) / revealTargets.length) * 100);
  }, FP_ANIM_MS);
}

function fpHandleWheel(e) {
  if (!fpActive || fpLocked) return;

  const activeEl = revealTargets[fpIndex];
  const dirDown = e.deltaY > 0;

  if (fpCanScrollScreen(activeEl) && fpScreenAtEdge(activeEl, dirDown) === false) {
    return;
  }

  e.preventDefault();

  wheelAccum += e.deltaY;
  window.clearTimeout(wheelResetTimer);
  wheelResetTimer = window.setTimeout(() => { wheelAccum = 0; }, 200);

  if (Math.abs(wheelAccum) < 40) return;
  const goDown = wheelAccum > 0;
  wheelAccum = 0;

  fpFlyTo(fpIndex + (goDown ? 1 : -1), goDown);
}

function fpHandleKey(e) {
  if (!fpActive || fpLocked) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  let dir = 0;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') dir = 1;
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') dir = -1;
  else if (e.key === 'Home') { e.preventDefault(); fpFlyTo(0, false); return; }
  else if (e.key === 'End') { e.preventDefault(); fpFlyTo(revealTargets.length - 1, true); return; }

  if (!dir) return;

  const activeEl = revealTargets[fpIndex];
  const dirDown = dir > 0;
  if (fpCanScrollScreen(activeEl) && fpScreenAtEdge(activeEl, dirDown) === false) return;

  e.preventDefault();
  fpFlyTo(fpIndex + dir, dirDown);
}

function fpHandleTouchStart(e) {
  if (!fpActive) return;
  touchStartY = e.touches[0].clientY;
}

function fpHandleTouchEnd(e) {
  if (!fpActive || fpLocked) return;
  const dy = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(dy) < 70) return;

  const activeEl = revealTargets[fpIndex];
  const dirDown = dy > 0;
  if (fpCanScrollScreen(activeEl) && fpScreenAtEdge(activeEl, dirDown) === false) return;

  fpFlyTo(fpIndex + (dirDown ? 1 : -1), dirDown);
}

function fpHandleClicks(e) {
  if (!fpActive) return;
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const idx = Array.from(revealTargets).findIndex((el) => el.id === id);
  if (idx === -1) return;
  e.preventDefault();
  fpFlyTo(idx, idx > fpIndex);
}

function fpEnable() {
  if (fpActive) return;
  fpActive = true;
  document.documentElement.classList.add('fullpage');

  /* En fullpage todas las pantallas son visibles (AOS no puede usar IntersectionObserver con display:none) */
  revealTargets.forEach((el) => el.classList.add('section-visible'));

  window.scrollTo(0, 0);
  fpIndex = 0;

  fpPaintScreen(fpIndex);

  window.addEventListener('wheel', fpHandleWheel, { passive: false });
  window.addEventListener('keydown', fpHandleKey);
  window.addEventListener('touchstart', fpHandleTouchStart, { passive: true });
  window.addEventListener('touchend', fpHandleTouchEnd, { passive: true });
  document.addEventListener('click', fpHandleClicks);
}

function fpDisable() {
  if (!fpActive) return;
  fpActive = false;
  fpLocked = false;
  document.documentElement.classList.remove('fullpage');

  revealTargets.forEach((el) => {
    el.classList.remove('is-active', 'is-exiting');
    fpRemoveAnim(el);
    el.style.removeProperty('--fp-ms');
  });

  window.removeEventListener('wheel', fpHandleWheel);
  window.removeEventListener('keydown', fpHandleKey);
  window.removeEventListener('touchstart', fpHandleTouchStart);
  window.removeEventListener('touchend', fpHandleTouchEnd);
  document.removeEventListener('click', fpHandleClicks);

  setNavHidden(false);
  onNativeScroll();
  updateSnapClasses();
}

function fpEvaluate() {
  if (fpMQ.matches && !reducedMotion.matches) fpEnable();
  else fpDisable();
}

fpEvaluate();
fpMQ.addEventListener('change', fpEvaluate);

/* ===== Menú mobile ===== */
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.getElementById('nav-menu');

navToggle.addEventListener('click', () => {
  const open = navMenu.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
  navToggle.innerHTML = open ? '<i class="bx bx-x"></i>' : '<i class="bx bx-menu"></i>';
});

navMenu.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.innerHTML = '<i class="bx bx-menu"></i>';
  }
});

/* ===== Internacionalización ===== */
const translations = {
  es: {
    'nav.about': 'Sobre mi',
    'nav.skills': 'Habilidades',
    'nav.projects': 'Proyectos',
    'nav.contact': 'Contacto',
    'scroll.hint': 'Deslizá para explorar',
    'hero.greeting': 'Hola, soy De Rogatis Ramiro',
    'hero.role': 'Desarrollador',
    'hero.bio': 'Soy estudiante de Ingeniería Informática con orientación a la programación y experiencia en soporte técnico. Me apasiona el desarrollo web y la resolución de problemas tecnológicos, combinando conocimientos académicos con práctica profesional.',
    'hero.hire': 'Contrátame',
    'hero.cv': 'Descargar CV',
    'stack.title': 'Tech Stack',
    'stack.subtitle': 'Lo que uso para construir proyectos digitales',
    'stack.core': 'Core Tech',
    'stack.db': 'Bases de datos',
    'stack.tools': 'Herramientas',
    'projects.title': 'Proyectos',
    'projects.subtitle': 'Trabajos reales publicados en GitHub',
    'projects.moreTitle': 'Conoceme más',
    'projects.moreText': 'Mirá todos mis repositorios, contribuciones y lo que estoy construyendo ahora mismo en GitHub.',
    'projects.moreCta': 'Ver perfil completo',
    'p.dailydex': 'App de tareas multiplataforma (Android e iOS) con una sola base de código en Kotlin Multiplatform + Compose, backend en Supabase y Material 3.',
    'p.goleadores': 'Página interactiva con la tabla de goleadores del equipo: ordenamiento por columnas, buscador en vivo, Puskás de la fecha con video y modo claro/oscuro. Los datos se cargan desde un Excel.',
    'p.estrellas': 'Ranking de estrellas del club cargado desde Excel, con búsqueda en tiempo real, ordenamiento, Botín de Oro destacado, música de fondo y tema oscuro con acentos dorados.',
    'contact.title': 'Contacto',
    'contact.name': 'Nombre',
    'contact.namePh': 'Tu nombre',
    'contact.lastname': 'Apellido',
    'contact.lastnamePh': 'Tu apellido',
    'contact.message': 'Mensaje',
    'contact.messagePh': 'Escribí tu mensaje...',
    'contact.submit': 'Enviar',
  },
  en: {
    'nav.about': 'About me',
    'nav.skills': 'Skills',
    'nav.projects': 'Projects',
    'nav.contact': 'Contact',
    'scroll.hint': 'Scroll to explore',
    'hero.greeting': "Hi, I'm De Rogatis Ramiro",
    'hero.role': 'Developer',
    'hero.bio': 'I am a Computer Science Engineering student focused on programming, with experience in technical support. I am passionate about web development and solving technological problems, combining academic knowledge with professional practice.',
    'hero.hire': 'Hire me',
    'hero.cv': 'Download CV',
    'stack.title': 'Tech Stack',
    'stack.subtitle': 'What I use to build digital projects',
    'stack.core': 'Core Tech',
    'stack.db': 'Databases',
    'stack.tools': 'Tools',
    'projects.title': 'Projects',
    'projects.subtitle': 'Real work published on GitHub',
    'projects.moreTitle': 'Know me more',
    'projects.moreText': 'Check out all my repositories, contributions and what I am building right now on GitHub.',
    'projects.moreCta': 'View full profile',
    'p.dailydex': 'Cross-platform task app (Android and iOS) with a single codebase in Kotlin Multiplatform + Compose, Supabase backend and Material 3.',
    'p.goleadores': 'Interactive page with the team scorers table: column sorting, live search, Puskás of the round with video and light/dark mode. Data is loaded from an Excel file.',
    'p.estrellas': 'Club star ranking loaded from Excel, with real-time search, sorting, featured Golden Boot, background music and a dark theme with golden accents.',
    'contact.title': 'Contact',
    'contact.name': 'First name',
    'contact.namePh': 'Your first name',
    'contact.lastname': 'Last name',
    'contact.lastnamePh': 'Your last name',
    'contact.message': 'Message',
    'contact.messagePh': 'Write your message...',
    'contact.submit': 'Send',
  },
};

let currentLang = localStorage.getItem('lang') || 'es';

function applyLanguage(lang) {
  const dict = translations[lang];
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key]) {
      if (el.children.length && el.tagName === 'LABEL') {
        el.childNodes[0].nodeValue = dict[key] + ' ';
      } else {
        el.textContent = dict[key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (dict[key]) el.placeholder = dict[key];
  });

  document.querySelectorAll('[data-i18n-value]').forEach((el) => {
    const key = el.dataset.i18nValue;
    if (dict[key]) el.value = dict[key];
  });

  document.getElementById('lang-label').textContent = lang === 'es' ? 'EN' : 'ES';
  localStorage.setItem('lang', lang);
  currentLang = lang;
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  applyLanguage(currentLang === 'es' ? 'en' : 'es');
});

applyLanguage(currentLang);
