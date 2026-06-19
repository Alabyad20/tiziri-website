/* ============================================
   TIZIRI — Main JavaScript
   ============================================ */

'use strict';

/* --- NAV SCROLL STATE --- */
const nav = document.getElementById('nav');
const hasHero = !!document.querySelector('.hero');

function updateNavState() {
    nav.classList.toggle('scrolled', !hasHero || window.scrollY > 60);
}
updateNavState();
window.addEventListener('scroll', updateNavState, { passive: true });


/* --- MOBILE MENU --- */
const hamburger   = document.getElementById('hamburger');
const mobileMenu  = document.getElementById('mobileMenu');
const closeMenu   = document.getElementById('closeMenu');

function openMobileMenu() {
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

hamburger.addEventListener('click', openMobileMenu);
closeMenu.addEventListener('click', closeMobileMenu);

// Close on outside click
mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) closeMobileMenu();
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
});


/* --- SCROLL ANIMATIONS (Intersection Observer) --- */
const fadeEls = document.querySelectorAll('.fade-up');

if (fadeEls.length) {
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    fadeEls.forEach(el => fadeObserver.observe(el));
}


/* --- VIDEO AUTOPLAY ON SCROLL --- */
const video = document.getElementById('heroVideo');

if (video) {
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                video.play().catch(() => {
                    // Autoplay blocked — poster image is shown as fallback
                });
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.25 });

    videoObserver.observe(video);
}


/* --- NEWSLETTER FORM --- */
const newsletterForm = document.getElementById('newsletterForm');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const input = newsletterForm.querySelector('.newsletter__input');
        const btn   = newsletterForm.querySelector('.newsletter__btn');
        const email = input.value.trim();

        if (!email || !email.includes('@')) {
            input.style.borderBottom = '1px solid #B5593C';
            input.focus();
            return;
        }

        // Success state — swap in real API call (Klaviyo, Mailchimp, etc.) here
        btn.textContent = 'Subscribed ✓';
        btn.classList.add('success');
        btn.disabled  = true;
        input.disabled = true;
        input.value    = '';
    });
}
