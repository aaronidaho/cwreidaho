// CWRE Idaho — Main JavaScript

// ── Netlify Forms submission helper ──
function submitToNetlify(form, formName) {
  const data = new FormData(form);
  data.set('form-name', formName);
  return fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data).toString(),
  });
}

function showFormSuccess(form, message) {
  const container = form.closest('.contact-form-card, .lead-form-card') || form.parentNode;
  container.innerHTML = '<div class="form-success">✓ ' + message + '</div>';
}

// Wires a lead form to POST to Netlify Forms and show an inline confirmation.
function wireLeadForm(formEl, formName, successMessage) {
  if (!formEl) return;
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = formEl.querySelector('.form-submit');
    const originalLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    submitToNetlify(formEl, formName)
      .then((res) => {
        if (!res.ok) throw new Error('Bad response');
        showFormSuccess(formEl, successMessage);
      })
      .catch(() => {
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        alert("Something went wrong sending your info. Please call/text (208) 870-4279 or email clintwalkeridaho@gmail.com directly.");
      });
  });
}

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
        submitToNetlify(form, 'lead-gate').catch(() => {});
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

// ── Newsletter form ──
(function () {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type=email]');
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;
      submitToNetlify(form, 'newsletter')
        .then((res) => {
          if (!res.ok) throw new Error('Bad response');
          form.innerHTML = '<p style="color:#c8a84b;font-size:0.9rem;padding:0.5rem 0;">✓ You\'re subscribed! Thank you.</p>';
        })
        .catch(() => {
          form.innerHTML = '<p style="color:#c8a84b;font-size:0.9rem;padding:0.5rem 0;">Something went wrong. Please try again later.</p>';
        });
    });
  });
})();

// ── Lead forms (contact pages, buyer/seller inquiry) ──
(function () {
  wireLeadForm(document.getElementById('contact-form'), 'contact-home', "Thanks! We'll be in touch shortly.");
  wireLeadForm(document.getElementById('contact-page-form'), 'contact-page', 'Thanks! Clint will respond within one business day.');
  wireLeadForm(document.getElementById('buyer-form'), 'buyer-inquiry', "Thanks! Clint will reach out to start your home search.");
  wireLeadForm(document.getElementById('seller-form'), 'seller-cma', "Thanks! Clint will follow up with your free home value estimate.");
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
    @media (max-width: 1300px) {
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
