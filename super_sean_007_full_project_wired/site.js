/* Super Sean 007 — progressive homepage behavior and runtime module loading. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadStylesheet(href, marker) {
    if (document.querySelector(`link[data-ssg-style="${marker}"]`)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    stylesheet.dataset.ssgStyle = marker;
    document.head.appendChild(stylesheet);
  }

  loadStylesheet('accessibility.css', 'accessibility');
  loadStylesheet('player-preferences.css', 'player-preferences');

  function loadRuntime(src) {
    if (document.querySelector(`script[data-ssg-runtime="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.ssgRuntime = src;
    document.body.appendChild(script);
  }

  ['turn-config.js', 'cloud-controls.js', 'player-preferences.js', 'accessibility.js', 'runtime-hardening.js'].forEach(loadRuntime);

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll(
      '.section-heading, .split > *, .character-card, .region-grid article, ' +
      '.mechanic-grid article, .guide-step, .gallery-grid figure, .lore-panel, ' +
      '.quest-card, details'
    );
    targets.forEach((element, index) => {
      element.classList.add('reveal');
      element.style.transitionDelay = `${(index % 4) * 70}ms`;
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0.08});
    targets.forEach(element => observer.observe(element));
  }

  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, {rootMargin: '-30% 0px -60% 0px'});
    sections.forEach(section => sectionObserver.observe(section));
  }

  const navToggle = document.querySelector('.nav-toggle');
  const navPanel = document.querySelector('.nav-links');
  if (navToggle && navPanel) {
    if (!navPanel.id) navPanel.id = 'mainNavLinks';
    navToggle.setAttribute('aria-controls', navPanel.id);
    navToggle.setAttribute('aria-expanded', String(document.body.classList.contains('nav-open')));
    navToggle.addEventListener('click', () => {
      requestAnimationFrame(() => navToggle.setAttribute('aria-expanded', String(document.body.classList.contains('nav-open'))));
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  window.SSGTheater = () => {
    const on = document.body.classList.toggle('theater');
    const button = document.getElementById('theaterBtn');
    if (button) {
      button.textContent = on ? '🖥 Normal' : '🖥 Theater';
      button.setAttribute('aria-pressed', String(on));
    }
    const frame = document.getElementById('gameFrame');
    if (frame) frame.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: on ? 'start' : 'center'});
  };

  const supportsNativeFullscreen = () => document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen;
  window.SSGFullscreen = () => {
    const frame = document.getElementById('gameFrame');
    if (!frame) return;
    if (supportsNativeFullscreen()) {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const request = frame.requestFullscreen || frame.webkitRequestFullscreen;
        if (request) { request.call(frame); return; }
      }
    }
    document.body.classList.toggle('ssg-maximize');
    frame.scrollIntoView({block: 'start'});
  };

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.body.classList.remove('ssg-maximize');
  });
})();
