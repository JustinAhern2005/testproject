/* ==========================================
   MAXILO FACIAL CLINIC — Main JavaScript
   ========================================== */

// --- Navbar: scroll behavior + mobile menu ---
const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
});

// Close mobile menu on nav link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// --- Intersection Observer: fade-in on scroll ---
const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll(
  '.service-card, .team-card, .testimonial-card, .about-grid, .contact-grid, .section-header'
).forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(28px)';
  el.style.transition = `opacity 0.55s ease ${i * 0.06}s, transform 0.55s ease ${i * 0.06}s`;
  el.classList.add('fade-target');
  fadeObserver.observe(el);
});

document.head.insertAdjacentHTML('beforeend', `
  <style>
    .fade-target.visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  </style>
`);

// --- Contact form ---
const form = document.getElementById('contact-form');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  // Basic client-side validation
  const required = form.querySelectorAll('[required]');
  let valid = true;

  required.forEach(field => {
    field.style.borderColor = '';
    if (!field.value.trim()) {
      field.style.borderColor = '#e05c5c';
      valid = false;
    }
  });

  if (!valid) return;

  // Simulate submission (replace with real API call)
  const btn = form.querySelector('button[type="submit"]');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  setTimeout(() => {
    form.innerHTML = `
      <div class="form-success">
        <div class="success-icon">✓</div>
        <h3>Message Sent!</h3>
        <p>Thank you for reaching out. A member of our team will contact you within one business day to confirm your consultation.</p>
      </div>
    `;
  }, 1200);
});

// --- Active nav link highlighting on scroll ---
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navItems.forEach(link => {
          link.classList.toggle('active-link', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  },
  { threshold: 0.35 }
);

sections.forEach(section => sectionObserver.observe(section));

document.head.insertAdjacentHTML('beforeend', `
  <style>
    .nav-links a.active-link { color: var(--gold) !important; }
  </style>
`);
