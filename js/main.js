// CWRE Idaho — Main JavaScript

// ── Nav scroll behavior ──
(function () {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── Mobile nav toggle ──
(function () {
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('mobile-open');
    hamburger.setAttribute('aria-expanded', open);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-nav')) {
      navLinks.classList.remove('mobile-open');
    }
  });
})();

// ── Lead Gate Modal ──
const LeadGate = (function () {
  const STORAGE_KEY = 'cwre_lead_registered';

  function isRegistered() {
    return !!localStorage.getItem(STORAGE_KEY);
  }

  function saveRegistration(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
  }

  function getRegistration() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }

  function openModal(onSuccess) {
    if (isRegistered()) { if (onSuccess) onSuccess(getRegistration()); return; }

    const modal = document.getElementById('lead-gate-modal');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    const form = modal.querySelector('#lead-gate-form');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          firstName: form.querySelector('[name=firstName]').value.trim(),
          lastName: form.querySelector('[name=lastName]').value.trim(),
          email: form.querySelector('[name=email]').value.trim(),
          phone: form.querySelector('[name=phone]').value.trim(),
        };
        saveRegistration(data);
        closeModal();
        if (onSuccess) onSuccess(data);
      };
    }
  }

  function closeModal() {
    const modal = document.getElementById('lead-gate-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Close on backdrop click — only if NOT in forced mode
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('lead-gate-modal');
    if (modal && e.target === modal && !modal.classList.contains('forced')) closeModal();
  });

  // Escape key — only if NOT in forced mode
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('lead-gate-modal');
    if (e.key === 'Escape' && modal && !modal.classList.contains('forced')) closeModal();
  });

  // Wire up any element with data-gate attribute
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-gate]');
    if (!trigger) return;
    e.preventDefault();
    const dest = trigger.getAttribute('href') || trigger.dataset.gate;
    openModal((data) => {
      if (dest && dest !== 'true') window.location.href = dest;
    });
  });

  return { open: openModal, close: closeModal, isRegistered, getRegistration };
})();

// ── Hero Carousel ──
(function () {
  const slides = document.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  let current = 0;

  slides[0].classList.add('active');

  function nextSlide() {
    const next = (current + 1) % slides.length;
    // Add active to next first (crossfade in)
    slides[next].style.animation = 'none';
    slides[next].offsetHeight; // force reflow to restart animation
    slides[next].style.animation = '';
    slides[next].classList.add('active');
    // After crossfade completes, remove previous
    const prev = current;
    current = next;
    setTimeout(() => slides[prev].classList.remove('active'), 1200);
  }

  setInterval(nextSlide, 6000);
})();

// ── 60-Second Forced Registration ──
(function () {
  if (LeadGate.isRegistered()) return; // already registered, skip
  setTimeout(function () {
    if (!LeadGate.isRegistered()) {
      const modal = document.getElementById('lead-gate-modal');
      if (modal) modal.classList.add('forced');
      LeadGate.open();
    }
  }, 60000); // 60 seconds
})();

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── Hero search form ──
(function () {
  const form = document.getElementById('hero-search-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = form.querySelector('input').value.trim();
    if (!q) return;
    // IDX will be integrated here — for now open lead gate
    LeadGate.open(() => {
      alert('IDX search integration coming soon. Your info has been saved and a CWRE Idaho agent will reach out!');
    });
  });
})();

// ── Newsletter form ──
(function () {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type=email]').value;
      if (email) {
        form.innerHTML = '<p style="color:#c8a84b;font-size:0.9rem;padding:0.5rem 0;">✓ You\'re subscribed! Thank you.</p>';
      }
    });
  });
})();

// ── Active nav link ──
(function () {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === path || (path === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });
})();

// ── Mobile nav styles injection ──
(function () {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      .nav-links.mobile-open {
        display: flex !important;
        flex-direction: column;
        position: absolute;
        top: 72px;
        left: 0; right: 0;
        background: #fff;
        padding: 1rem;
        box-shadow: 0 8px 30px rgba(25,77,155,0.15);
        gap: 0.25rem;
        z-index: 999;
      }
      .nav-links.mobile-open a {
        color: #4a4f6b !important;
        padding: 0.75rem 1rem;
        border-radius: 8px;
      }
      .nav-links.mobile-open a:hover { background: #f4f5f7 !important; color: #194d9b !important; }
      .nav-links.mobile-open .dropdown-menu {
        display: block !important;
        position: static;
        transform: none;
        box-shadow: none;
        background: #f4f5f7;
        margin-left: 1rem;
        margin-top: 0.25rem;
        margin-bottom: 0.25rem;
      }
    }
  `;
  document.head.appendChild(style);
})();
