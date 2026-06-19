/* ============================================
   TIZIRI — Product Gallery
   ============================================ */

'use strict';

const mainImage = document.getElementById('mainImage');
const thumbs    = [...document.querySelectorAll('.product__thumb')];

if (mainImage && thumbs.length > 1) {
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            if (thumb.classList.contains('active')) return;

            mainImage.classList.add('switching');

            setTimeout(() => {
                mainImage.src = thumb.dataset.src;
                mainImage.alt = thumb.dataset.alt || '';
                mainImage.classList.remove('switching');
            }, 180);

            thumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    /* Keyboard navigation on the thumb strip */
    thumbs.forEach((thumb, i) => {
        thumb.setAttribute('tabindex', '0');
        thumb.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                thumb.click();
            }
            if (e.key === 'ArrowRight' && thumbs[i + 1]) thumbs[i + 1].focus();
            if (e.key === 'ArrowLeft'  && thumbs[i - 1]) thumbs[i - 1].focus();
        });
    });
}
