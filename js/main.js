(function () {
  'use strict';

  // ── Navbar scroll + active link ──────────────────────────
  function initNavbar() {
    var navbar = document.getElementById('navbar');
    var links = document.querySelectorAll('.navbar__link[href^="#"]');
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) sections.push({ el: el, link: link });
    });

    function onScroll() {
      if (window.scrollY > 80) {
        navbar.classList.add('navbar--scrolled');
      } else {
        navbar.classList.remove('navbar--scrolled');
      }

      var scrollMid = window.scrollY + window.innerHeight / 2;
      var active = null;
      sections.forEach(function (s) {
        if (s.el.offsetTop <= scrollMid) active = s;
      });

      links.forEach(function (l) { l.removeAttribute('aria-current'); });
      if (active) active.link.setAttribute('aria-current', 'page');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile menu ──────────────────────────────────────────
  function initMobileMenu() {
    var navbar = document.getElementById('navbar');
    var burger = document.getElementById('navbar-burger');
    var links = document.querySelectorAll('.navbar__link, .navbar__cta');

    if (!burger) return;

    function closeMenu() {
      navbar.classList.remove('navbar--open');
      burger.setAttribute('aria-expanded', 'false');
    }

    burger.addEventListener('click', function () {
      var isOpen = navbar.classList.toggle('navbar--open');
      burger.setAttribute('aria-expanded', String(isOpen));
    });

    links.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // ── Countdown ─────────────────────────────────────────────
  function initCountdown() {
    var elDays = document.getElementById('cd-days');
    var elHours = document.getElementById('cd-hours');
    var elMins = document.getElementById('cd-minutes');
    var elSecs = document.getElementById('cd-seconds');

    if (!elDays) return;

    var target = new Date('2028-09-01T09:00:00').getTime();

    function pad(n, len) {
      return String(n).padStart(len, '0');
    }

    function tick() {
      var diff = target - Date.now();

      if (diff <= 0) {
        elDays.textContent = '000';
        elHours.textContent = '00';
        elMins.textContent = '00';
        elSecs.textContent = '00';
        return;
      }

      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);

      elDays.textContent = pad(d, 3);
      elHours.textContent = pad(h, 2);
      elMins.textContent = pad(m, 2);
      elSecs.textContent = pad(s, 2);
    }

    tick();
    setInterval(tick, 1000);
  }

  // ── Scroll reveal ─────────────────────────────────────────
  function initScrollReveal() {
    if (!window.IntersectionObserver) return;

    var elements = document.querySelectorAll('[data-reveal]');

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -48px 0px'
    });

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ── Founders form ─────────────────────────────────────────
  function initFoundersForm() {
    var form = document.getElementById('founders-form');
    var successEl = document.getElementById('form-success');

    if (!form || !successEl) return;

    function showError(input, msg) {
      var field = input.closest('.form__field');
      var errorEl = field && field.querySelector('.form__error');
      if (errorEl) errorEl.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
    }

    function clearErrors() {
      form.querySelectorAll('.form__error').forEach(function (el) {
        el.textContent = '';
      });
      form.querySelectorAll('[aria-invalid]').forEach(function (el) {
        el.removeAttribute('aria-invalid');
      });
    }

    function validate() {
      var prenom = form.querySelector('#field-prenom');
      var nom = form.querySelector('#field-nom');
      var email = form.querySelector('#field-email');
      var valid = true;

      if (!prenom.value.trim()) {
        showError(prenom, 'Veuillez entrer votre prénom.');
        valid = false;
      }

      if (!nom.value.trim()) {
        showError(nom, 'Veuillez entrer votre nom.');
        valid = false;
      }

      var emailVal = email.value.trim();
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        showError(email, 'Veuillez entrer un courriel valide.');
        valid = false;
      }

      return valid;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();

      if (!validate()) return;

      var btn = form.querySelector('.form__submit');
      btn.textContent = 'Envoi en cours…';
      btn.disabled = true;

      setTimeout(function () {
        form.style.display = 'none';
        successEl.removeAttribute('hidden');
      }, 1200);
    });

    // Clear error on input
    form.querySelectorAll('.form__input').forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.form__field');
        var errorEl = field && field.querySelector('.form__error');
        if (errorEl) errorEl.textContent = '';
        input.removeAttribute('aria-invalid');
      });
    });
  }

  // ── Smooth scroll fallback for older browsers ─────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var id = this.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-h')) || 72;
        var top = target.getBoundingClientRect().top + window.scrollY - navH;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  // ── Bootstrap ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    initMobileMenu();
    initCountdown();
    initScrollReveal();
    initFoundersForm();
    initSmoothScroll();
  });

}());
