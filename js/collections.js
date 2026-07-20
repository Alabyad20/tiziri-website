/* ============================================
   TIZIRI — Collections Page
   ============================================ */

'use strict';

const grid    = document.getElementById('catalogueGrid');
const countEl = document.getElementById('visibleCount');
const emptyEl = document.getElementById('catalogueEmpty');
const titleEl = document.getElementById('collectionTitle');
const subEl   = document.getElementById('collectionSub');
const crumbEl = document.getElementById('breadcrumbCurrent');

if (!grid) throw new Error('No catalogue grid found');

const cards = [...grid.querySelectorAll('.product-card')];

// Save original DOM order for "featured" sort
const originalOrder = [...cards];

let activeStyle  = 'all';
let activeSize   = 'all';
let activeRoom   = 'all';
let activeColor  = 'all';
let activeSort   = 'featured';
let activeSearch = '';

const meta = {
    'all':          { title: 'All Rugs',        sub: 'Every piece hand-selected. Each one woven once.' },
    'beni-ourain':  { title: 'Beni Ourain',      sub: 'The classic. Ivory wool, geometric form.' },
    'azilal':       { title: 'Azilal & Vintage', sub: 'Bold color. Tribal pattern. Alive in any room.' },
    'boujaad':      { title: 'Boujaad',           sub: 'Vivid color. Bold tribal pattern. From the Khouribga plains.' },
    'boucherouite': { title: 'Boucherouite',     sub: 'Woven from recycled textile. Nothing wasted.' },
    'mrirt':        { title: 'Mrirt',            sub: 'Fine-pile rugs from the Middle Atlas. Traditional form.' },
    'contemporary': { title: 'Contemporary',     sub: 'Moroccan craft. Modern sensibility.' },
    'kilim':        { title: 'Kilim',            sub: 'Flat weave. Graphic. Reversible.' },
};

function applySort() {
    const sorted = [...cards];
    if (activeSort === 'price-asc') {
        sorted.sort((a, b) => {
            const pa = parseFloat(a.dataset.priceNum) || Infinity;
            const pb = parseFloat(b.dataset.priceNum) || Infinity;
            return pa - pb;
        });
    } else if (activeSort === 'price-desc') {
        sorted.sort((a, b) => {
            const pa = parseFloat(a.dataset.priceNum) || -Infinity;
            const pb = parseFloat(b.dataset.priceNum) || -Infinity;
            return pb - pa;
        });
    } else {
        // featured = original DOM order
        sorted.sort((a, b) => originalOrder.indexOf(a) - originalOrder.indexOf(b));
    }
    sorted.forEach(card => grid.appendChild(card));
}

function applyFilters() {
    const q = activeSearch.toLowerCase();
    let visible = 0;
    cards.forEach(card => {
        const styleMatch  = activeStyle === 'all' || card.dataset.style === activeStyle;
        const sizeMatch   = activeSize  === 'all' || card.dataset.size  === activeSize;
        const roomMatch   = activeRoom  === 'all' || card.dataset.room  === activeRoom;
        const colorMatch  = activeColor === 'all' || card.dataset.color === activeColor;
        const name        = card.querySelector('.product-card__name')?.textContent.toLowerCase() || '';
        const searchMatch = !q || name.includes(q);
        const show = styleMatch && sizeMatch && roomMatch && colorMatch && searchMatch;
        card.hidden = !show;
        if (show) visible++;
    });
    if (countEl) countEl.textContent = visible;
    if (emptyEl) emptyEl.hidden = visible > 0;
}

function setStyle(value) {
    activeStyle = value;
    document.querySelectorAll('[data-filter="style"]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.value === value)
    );
    const m = meta[value] || meta['all'];
    if (titleEl) titleEl.textContent = m.title;
    if (subEl)   subEl.textContent   = m.sub;
    if (crumbEl) crumbEl.textContent = m.title;
    applyFilters();
}

function setSize(value) {
    activeSize = value;
    document.querySelectorAll('[data-filter="size"]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.value === value)
    );
    applyFilters();
}

function setRoom(value) {
    activeRoom = value;
    document.querySelectorAll('[data-filter="room"]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.value === value)
    );
    applyFilters();
}

function setColor(value) {
    activeColor = value;
    document.querySelectorAll('[data-filter="color"]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.value === value)
    );
    applyFilters();
}

document.querySelectorAll('[data-filter="style"]').forEach(btn =>
    btn.addEventListener('click', () => setStyle(btn.dataset.value))
);
document.querySelectorAll('[data-filter="size"]').forEach(btn =>
    btn.addEventListener('click', () => setSize(btn.dataset.value))
);
document.querySelectorAll('[data-filter="room"]').forEach(btn =>
    btn.addEventListener('click', () => setRoom(btn.dataset.value))
);
document.querySelectorAll('[data-filter="color"]').forEach(btn =>
    btn.addEventListener('click', () => setColor(btn.dataset.value))
);

const sortEl = document.getElementById('sortSelect');
if (sortEl) {
    sortEl.addEventListener('change', () => {
        activeSort = sortEl.value;
        applySort();
        applyFilters();
    });
}

document.getElementById('resetFilters')?.addEventListener('click', () => {
    setStyle('all');
    setSize('all');
    setRoom('all');
    setColor('all');
    if (sortEl) { sortEl.value = 'featured'; activeSort = 'featured'; applySort(); }
});

const searchEl = document.getElementById('rugSearch');
if (searchEl) {
    searchEl.addEventListener('input', e => {
        activeSearch = e.target.value.trim();
        applyFilters();
    });
}

/* Read URL hash on load and on change */
const styleValues = new Set(['beni-ourain', 'azilal', 'boujaad', 'boucherouite', 'mrirt', 'contemporary', 'kilim']);
const sizeValues  = new Set(['small', 'medium', 'large']);
const roomValues  = new Set(['living-room', 'bedroom', 'dining-room', 'hallway']);
const colorValues = new Set(['ivory', 'blue', 'green', 'orange', 'pink', 'yellow', 'brown', 'grey', 'black', 'purple', 'multicolor']);

function applyHash() {
    const hash = location.hash.slice(1);
    if (styleValues.has(hash))     setStyle(hash);
    else if (sizeValues.has(hash)) setSize(hash);
    else if (roomValues.has(hash)) setRoom(hash);
    else if (colorValues.has(hash)) setColor(hash);
    else { setStyle('all'); setSize('all'); setRoom('all'); setColor('all'); }
}

applyHash();
window.addEventListener('hashchange', applyHash);

/* Read ?q= on load (populates the Name search box, e.g. from Google's sitelinks search box) */
const initialQuery = new URLSearchParams(location.search).get('q');
if (initialQuery && searchEl) {
    searchEl.value = initialQuery;
    activeSearch = initialQuery.trim();
    applyFilters();
}

/* ============================================
   Mobile filter panel
   Reuses the existing .filter-btn handlers — this only opens/closes the
   sheet and reflects state, so filtering logic stays in one place.
   ============================================ */
(function () {
    const bar      = document.getElementById('filterBar');
    const toggle   = document.getElementById('filterToggle');
    const panel    = document.getElementById('filterPanel');
    const backdrop = document.getElementById('filterBackdrop');
    const closeBtn = document.getElementById('filterClose');
    const applyBtn = document.getElementById('filterApply');
    const resetBtn = document.getElementById('filterPanelReset');
    const countEl  = document.getElementById('filterActiveCount');
    if (!bar || !toggle || !panel) return;

    function activeCount() {
        return ['style', 'size', 'room', 'color'].reduce((n, k) => {
            const on = document.querySelector(`[data-filter="${k}"].active`);
            return n + (on && on.dataset.value !== 'all' ? 1 : 0);
        }, 0) + (document.getElementById('rugSearch')?.value.trim() ? 1 : 0);
    }

    function visibleRugs() {
        return document.getElementById('visibleCount')?.textContent.trim() || '';
    }

    function sync() {
        const n = activeCount();
        countEl.textContent = n;
        countEl.hidden = n === 0;
        if (applyBtn) {
            const v = visibleRugs();
            applyBtn.textContent = v
                ? (v === '0' ? 'No matches' : `Show ${v} rug${v === '1' ? '' : 's'}`)
                : 'Show results';
        }
    }

    function open() {
        bar.classList.add('is-open');
        document.body.classList.add('filters-open');
        toggle.setAttribute('aria-expanded', 'true');
        sync();
        closeBtn?.focus();
    }

    function close() {
        bar.classList.remove('is-open');
        document.body.classList.remove('filters-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    }

    toggle.addEventListener('click', () =>
        bar.classList.contains('is-open') ? close() : open());
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    applyBtn?.addEventListener('click', close);
    resetBtn?.addEventListener('click', () => {
        document.getElementById('resetFilters')?.click();
        const s = document.getElementById('rugSearch');
        if (s) { s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); }
        sync();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && bar.classList.contains('is-open')) close();
    });

    /* keep the badge and the Show-N button honest as filters change */
    panel.addEventListener('click', e => {
        if (e.target.closest('.filter-btn')) setTimeout(sync, 0);
    });
    document.getElementById('rugSearch')?.addEventListener('input', () => setTimeout(sync, 0));
    window.addEventListener('hashchange', () => setTimeout(sync, 0));

    sync();
})();
