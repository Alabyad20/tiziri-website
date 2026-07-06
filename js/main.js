/* ============================================
   TIZIRI — Main JavaScript
   ============================================ */

'use strict';

/* --- NAV SCROLL STATE --- */
try {
    const nav = document.getElementById('nav');
    const hasHero = !!document.querySelector('.hero');

    if (nav) {
        function updateNavState() {
            nav.classList.toggle('scrolled', !hasHero || window.scrollY > 60);
        }
        updateNavState();
        window.addEventListener('scroll', updateNavState, { passive: true });
    }
} catch (err) {
    console.error('Nav scroll state failed to initialize:', err);
}


/* --- MOBILE MENU --- */
try {
    const hamburger   = document.getElementById('hamburger');
    const mobileMenu  = document.getElementById('mobileMenu');
    const closeMenu   = document.getElementById('closeMenu');

    if (hamburger && mobileMenu && closeMenu) {
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
    }
} catch (err) {
    console.error('Mobile menu failed to initialize:', err);
}


/* --- SCROLL ANIMATIONS (Intersection Observer) --- */
try {
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
} catch (err) {
    console.error('Fade-up scroll animation failed to initialize:', err);
    // Fallback: force every fade-up element visible so content is never stuck hidden
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
}


/* --- VIDEO AUTOPLAY ON SCROLL --- */
try {
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
} catch (err) {
    console.error('Video autoplay failed to initialize:', err);
}


/* --- MEGA MENU --- */
try {
    const megaItem  = document.querySelector('.nav__item--has-mega');
    const megaPanel = megaItem && megaItem.querySelector('.nav__mega');

    if (megaItem && megaPanel) {
        let closeTimer = null;

        function openMega() {
            clearTimeout(closeTimer);
            megaItem.classList.add('mega-open');
        }

        function scheduleMegaClose() {
            closeTimer = setTimeout(() => megaItem.classList.remove('mega-open'), 300);
        }

        megaItem.addEventListener('mouseenter', openMega);
        megaItem.addEventListener('mouseleave', scheduleMegaClose);
        megaPanel.addEventListener('mouseenter', openMega);
        megaPanel.addEventListener('mouseleave', scheduleMegaClose);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') megaItem.classList.remove('mega-open');
        });
    }
} catch (err) {
    console.error('Mega menu failed to initialize:', err);
}


/* --- NEWSLETTER FORM --- */
try {
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
} catch (err) {
    console.error('Newsletter form failed to initialize:', err);
}
