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


/* --- SHARED: block background interaction while an overlay (mobile menu, offer popup) is open --- */
function setSiblingsInert(exceptEl, isInert) {
    Array.from(document.body.children).forEach((el) => {
        if (el === exceptEl || el.tagName === 'SCRIPT') return;
        el.inert = isInert;
    });
}

// Traps Tab/Shift+Tab within `container`'s focusable elements. Re-queries on every
// keypress so it stays correct even if the container's contents change while open
// (e.g. the offer popup's MailerLite embed loading in asynchronously).
function trapFocusWithin(container, e) {
    if (e.key !== 'Tab') return;
    const focusables = Array.from(
        container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}


/* --- MOBILE MENU --- */
try {
    const hamburger   = document.getElementById('hamburger');
    const mobileMenu  = document.getElementById('mobileMenu');
    const closeMenu   = document.getElementById('closeMenu');

    if (hamburger && mobileMenu && closeMenu) {
        mobileMenu.setAttribute('role', 'dialog');
        mobileMenu.setAttribute('aria-modal', 'true');
        mobileMenu.setAttribute('aria-label', 'Menu');
        hamburger.setAttribute('aria-expanded', 'false');

        let lastFocused = null;
        const trapMenuFocus = (e) => trapFocusWithin(mobileMenu, e);

        function openMobileMenu() {
            lastFocused = document.activeElement;
            mobileMenu.classList.add('open');
            mobileMenu.setAttribute('aria-hidden', 'false');
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            setSiblingsInert(mobileMenu, true);
            mobileMenu.addEventListener('keydown', trapMenuFocus);
            closeMenu.focus();
        }

        function closeMobileMenu() {
            mobileMenu.classList.remove('open');
            mobileMenu.setAttribute('aria-hidden', 'true');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            setSiblingsInert(mobileMenu, false);
            mobileMenu.removeEventListener('keydown', trapMenuFocus);
            if (lastFocused) lastFocused.focus();
        }

        hamburger.addEventListener('click', openMobileMenu);
        closeMenu.addEventListener('click', closeMobileMenu);

        // Close on outside click
        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) closeMobileMenu();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMobileMenu();
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


/* --- LAZY VIDEOS (data-src swapped in near-viewport, then autoplay on scroll) --- */
try {
    const lazyVideos = document.querySelectorAll('video.lazy-video[data-src]');

    if (lazyVideos.length) {
        const lazyVideoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const el = entry.target;
                if (entry.isIntersecting) {
                    if (!el.src) {
                        el.src = el.dataset.src;
                        el.load();
                    }
                    el.play().catch(() => {
                        // Autoplay blocked — poster image is shown as fallback
                    });
                } else if (el.src) {
                    el.pause();
                }
            });
        }, { threshold: 0.2, rootMargin: '200px 0px' });

        lazyVideos.forEach(el => lazyVideoObserver.observe(el));
    }
} catch (err) {
    console.error('Lazy video loading failed to initialize:', err);
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


/* --- OFFER POPUP ($50 off first rug — email capture) --- */
try {
    const OFFER_KEY = 'tiziri_offer_dismissed_at';
    const SNOOZE_DAYS = 30;
    const dismissedAt = parseInt(localStorage.getItem(OFFER_KEY) || '0', 10);
    const snoozed = dismissedAt && (Date.now() - dismissedAt) < SNOOZE_DAYS * 24 * 60 * 60 * 1000;

    if (!snoozed) {
        let shown = false;
        let lastFocused = null;

        const popup = document.createElement('div');
        popup.className = 'offer-popup';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-modal', 'true');
        popup.setAttribute('aria-label', 'Get $50 off your first rug');
        popup.innerHTML =
            '<div class="offer-popup__card">' +
                '<button class="offer-popup__close" aria-label="Close">&times;</button>' +
                '<p class="offer-popup__eyebrow">A gift, from Morocco</p>' +
                '<h2 class="offer-popup__headline">$50 off your first rug</h2>' +
                '<p class="offer-popup__text">Join the TIZIRI list and we’ll send your private $50 code — plus first look at new one-of-one arrivals. No noise, unsubscribe any time.</p>' +
                '<div class="offer-popup__form"><div class="ml-embedded" data-form="LDu1BC"></div></div>' +
                '<button class="offer-popup__dismiss">No thanks, full price is fine</button>' +
            '</div>';
        document.body.appendChild(popup);

        // Ensure the MailerLite universal script is present (most pages don't load it).
        if (typeof window.ml === 'undefined') {
            (function (w, d, e, u, f, l, n) {
                w[f] = w[f] || function () { (w[f].q = w[f].q || []).push(arguments); };
                l = d.createElement(e); l.async = 1; l.src = u;
                n = d.getElementsByTagName(e)[0]; n.parentNode.insertBefore(l, n);
            })(window, document, 'script', 'https://assets.mailerlite.com/js/universal.js', 'ml');
            window.ml('account', '2460383');
        }

        const trapPopupFocus = (e) => trapFocusWithin(popup, e);

        function dismissOffer() {
            popup.classList.remove('open');
            document.body.style.overflow = '';
            setSiblingsInert(popup, false);
            popup.removeEventListener('keydown', trapPopupFocus);
            localStorage.setItem(OFFER_KEY, String(Date.now()));
            if (lastFocused) lastFocused.focus();
        }

        function showOffer() {
            if (shown) return;
            shown = true;
            lastFocused = document.activeElement;
            // If MailerLite failed to render a form, fall back to the contact page.
            const embed = popup.querySelector('.ml-embedded');
            if (embed && !embed.children.length) {
                embed.outerHTML = '<a class="offer-popup__fallback" href="/contact/">Claim your $50 code &rarr;</a>';
            }
            popup.classList.add('open');
            document.body.style.overflow = 'hidden';
            setSiblingsInert(popup, true);
            popup.addEventListener('keydown', trapPopupFocus);
            popup.querySelector('.offer-popup__close').focus();
        }

        popup.querySelector('.offer-popup__close').addEventListener('click', dismissOffer);
        popup.querySelector('.offer-popup__dismiss').addEventListener('click', dismissOffer);
        popup.addEventListener('click', (e) => { if (e.target === popup) dismissOffer(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popup.classList.contains('open')) dismissOffer();
        });

        // Triggers: exit intent (desktop) or 30s dwell — whichever comes first.
        document.addEventListener('mouseout', (e) => {
            if (!e.relatedTarget && e.clientY <= 0) showOffer();
        });
        setTimeout(showOffer, 30000);
    }
} catch (err) {
    console.error('Offer popup failed to initialize:', err);
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


/* ============================================
   META PIXEL — Facebook/Instagram ads tracking
   Fires: PageView (all pages), ViewContent + InitiateCheckout (rug pages).
   Purchase is tracked server-side (Stripe → Meta CAPI); see netlify/functions.
   ============================================ */
(function () {
    // 1) Paste your Meta Pixel ID here (Events Manager → Data Sources → your dataset).
    //    Until this is set to a real ID, the whole block is a no-op — nothing loads.
    var META_PIXEL_ID = '1677465513542864';

    if (!META_PIXEL_ID || META_PIXEL_ID === 'REPLACE_WITH_PIXEL_ID') return;

    try {
        // Standard Meta Pixel bootstrap
        !function (f, b, e, v, n, t, s) {
            if (f.fbq) return;
            n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
            t = b.createElement(e); t.async = !0;
            t.src = v; s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', META_PIXEL_ID);
        fbq('track', 'PageView');

        // On a rug page, read the product: id/slug from the canonical URL, price from meta tags.
        function currentProduct() {
            var priceEl = document.querySelector('meta[property="product:price:amount"]');
            if (!priceEl) return null; // not a product page
            var canonical = document.querySelector('link[rel="canonical"]');
            var url = canonical ? canonical.href : location.href;
            var m = url.match(/\/rugs\/([^\/.]+)\.html/);
            if (!m) return null;
            var curEl = document.querySelector('meta[property="product:price:currency"]');
            return {
                id: m[1],
                price: parseFloat(priceEl.content) || 0,
                currency: (curEl && curEl.content) || 'USD'
            };
        }

        var product = currentProduct();
        if (product) {
            fbq('track', 'ViewContent', {
                content_type: 'product',
                content_ids: [product.id],
                content_name: (document.title || product.id),
                value: product.price,
                currency: product.currency
            });

            // Buyer clicks a "Buy Now" button (main CTA or sticky bar) → InitiateCheckout,
            // right before the redirect to Stripe. Matches by href so WhatsApp/Enquire are ignored.
            document.addEventListener('click', function (e) {
                var buyBtn = e.target.closest('a[href*="buy.stripe.com"]');
                if (!buyBtn) return;
                fbq('track', 'InitiateCheckout', {
                    content_type: 'product',
                    content_ids: [product.id],
                    value: product.price,
                    currency: product.currency
                });
            }, true);
        }
    } catch (err) {
        console.error('Meta Pixel failed to initialize:', err);
    }
})();
