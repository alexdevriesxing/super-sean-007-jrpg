/* Super Sean 007 — homepage motion: scroll-reveal sections and nav highlighting.
   Progressive enhancement only; the page is fully usable without it. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal-on-scroll for section content.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll(
      '.section-heading, .split > *, .character-card, .region-grid article, ' +
      '.mechanic-grid article, .guide-step, .gallery-grid figure, .lore-panel, ' +
      '.quest-card, details'
    );
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${(i % 4) * 70}ms`;
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0.08});
    targets.forEach(el => observer.observe(el));
  }

  // Highlight the nav link of the section in view.
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, {rootMargin: '-30% 0px -60% 0px'});
    sections.forEach(section => sectionObserver.observe(section));
  }

  // Close the mobile nav after choosing a link.
  navLinks.forEach(link => {
    link.addEventListener('click', () => document.body.classList.remove('nav-open'));
  });

  // Theater mode: game spans the full container, ads reflow below (still visible).
  window.SSGTheater = () => {
    const on = document.body.classList.toggle('theater');
    const btn = document.getElementById('theaterBtn');
    if (btn) btn.textContent = on ? '🖥 Normal' : '🖥 Theater';
    const frame = document.getElementById('gameFrame');
    if (frame) frame.scrollIntoView({behavior: 'smooth', block: on ? 'start' : 'center'});
  };

  // Fullscreen on the game frame (touch controls stay inside it).
  window.SSGFullscreen = () => {
    const frame = document.getElementById('gameFrame');
    if (!frame) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      (frame.requestFullscreen || frame.webkitRequestFullscreen || (() => {})).call(frame);
    }
  };
})();
