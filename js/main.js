(function () {
  'use strict';

  // ── Navbar scroll ────────────────────────────────────────
  function initNavbar() {
    var nav = document.getElementById('navbar');
    if (!nav) return;
    window.addEventListener('scroll', function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 60);
    }, { passive: true });

    // Mark current page link
    var links = nav.querySelectorAll('.navbar__link');
    var path  = window.location.pathname.split('/').pop() || 'index.html';
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ── Mobile drawer ────────────────────────────────────────
  function initMobileMenu() {
    var burger = document.getElementById('navbar-burger');
    var drawer = document.getElementById('navbar-drawer');
    if (!burger || !drawer) return;

    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    drawer.querySelectorAll('.navbar__link').forEach(function (link) {
      link.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        document.body.style.overflow = '';
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── Countdown — target: 1 September 2027 ─────────────────
  function initCountdown() {
    var elDays = document.getElementById('cd-days');
    var elHrs  = document.getElementById('cd-hours');
    var elMins = document.getElementById('cd-minutes');
    var elSecs = document.getElementById('cd-seconds');
    if (!elDays) return;

    var target = new Date('2027-09-01T09:00:00').getTime();

    function tick() {
      var now  = Date.now();
      var diff = target - now;

      if (diff <= 0) {
        elDays.textContent = '000';
        elHrs.textContent  = '00';
        elMins.textContent = '00';
        elSecs.textContent = '00';
        return;
      }

      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000)  / 60000);
      var s = Math.floor((diff % 60000)    / 1000);

      elDays.textContent = String(d).padStart(3, '0');
      elHrs.textContent  = String(h).padStart(2, '0');
      elMins.textContent = String(m).padStart(2, '0');
      elSecs.textContent = String(s).padStart(2, '0');
    }

    tick();
    setInterval(tick, 1000);
  }

  // ── Scroll reveal ─────────────────────────────────────────
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      observer.observe(el);
    });
  }

  // ── Founding member form ──────────────────────────────────
  function initFoundersForm() {
    var form    = document.getElementById('founders-form');
    var success = document.getElementById('form-success');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors(form);

      if (!validate(form)) return;

      var btn = form.querySelector('[type="submit"]');
      var originalText = btn.textContent;
      btn.textContent = '...';
      btn.disabled    = true;

      setTimeout(function () {
        form.style.display = 'none';
        if (success) {
          success.removeAttribute('hidden');
          success.classList.add('is-visible');
        }
      }, 1100);
    });

    // Clear error on input
    form.querySelectorAll('.form__input').forEach(function (input) {
      input.addEventListener('input', function () {
        input.removeAttribute('aria-invalid');
        var err = input.closest('.form__field').querySelector('.form__error');
        if (err) err.textContent = '';
      });
    });
  }

  function validate(form) {
    var ok = true;

    var prenom = form.querySelector('#field-prenom');
    var nom    = form.querySelector('#field-nom');
    var email  = form.querySelector('#field-email');

    if (prenom && !prenom.value.trim()) {
      showError(prenom, langMsg('Veuillez entrer votre prénom.', 'Please enter your first name.'));
      ok = false;
    }
    if (nom && !nom.value.trim()) {
      showError(nom, langMsg('Veuillez entrer votre nom.', 'Please enter your last name.'));
      ok = false;
    }
    if (email && !email.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showError(email, langMsg('Veuillez entrer un courriel valide.', 'Please enter a valid email address.'));
      ok = false;
    }

    return ok;
  }

  function showError(input, msg) {
    input.setAttribute('aria-invalid', 'true');
    var field = input.closest('.form__field');
    if (!field) return;
    var err = field.querySelector('.form__error');
    if (err) err.textContent = msg;
  }

  function clearErrors(form) {
    form.querySelectorAll('.form__error').forEach(function (el) { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  // ── Bilingual toggle ──────────────────────────────────────
  function initLang() {
    var savedLang = localStorage.getItem('cmer-lang') || 'fr';
    setLang(savedLang);

    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLang(btn.getAttribute('data-lang'));
      });
    });
  }

  function setLang(lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.classList.toggle('lang-en', lang === 'en');
    localStorage.setItem('cmer-lang', lang);

    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
    });
  }

  // ── Helper: return FR or EN string based on current lang ─
  function langMsg(fr, en) {
    return document.documentElement.classList.contains('lang-en') ? en : fr;
  }

  // ── Boot ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    initMobileMenu();
    initCountdown();
    initScrollReveal();
    initFoundersForm();
    initLang();
  });

}());
