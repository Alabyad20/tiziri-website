/* ============================================
   TIZIRI — Collections Page
   ============================================ */

'use strict';

const grid      = document.getElementById('catalogueGrid');
const countEl   = document.getElementById('visibleCount');
const emptyEl   = document.getElementById('catalogueEmpty');
const titleEl   = document.getElementById('collectionTitle');
const subEl     = document.getElementById('collectionSub');
const crumbEl   = document.getElementById('breadcrumbCurrent');

if (!grid) throw new Error('No catalogue grid found');

const cards = [...grid.querySelectorAll('.product-card')];

let activeStyle  = 'all';
let activeSize   = 'all';
let activeSearch = '';

const meta = {
    'all':          { title: 'All Rugs',        sub: 'Every piece hand-selected. Each one woven once.' },
    'beni-ourain':  { title: 'Beni Ourain',      sub: 'The classic. Ivory wool, geometric form.' },
    'azilal':       { title: 'Azilal & Vintage', sub: 'Bold colour. Tribal pattern. Alive in any room.' },
    'boujaad':      { title: 'Boujaad',           sub: 'Vivid colour. Bold tribal pattern. From the Khouribga plains.' },
    'boucherouite': { title: 'Boucherouite',     sub: 'Woven from recycled textile. Nothing wasted.' },
    'mrirt':        { title: 'Mrirt',            sub: 'Fine-pile rugs from the Middle Atlas. Traditional form.' },
    'contemporary': { title: 'Contemporary',     sub: 'Moroccan craft. Modern sensibility.' },
    'kilim':        { title: 'Kilim',            sub: 'Flat weave. Graphic. Reversible.' },
};

function applyFilters() {
    const q = activeSearch.toLowerCase();
    let visible = 0;
    cards.forEach(card => {
        const styleMatch  = activeStyle === 'all' || card.dataset.style === activeStyle;
        const sizeMatch   = activeSize  === 'all' || card.dataset.size  === activeSize;
        const name        = card.querySelector('.product-card__name')?.textContent.toLowerCase() || '';
        const searchMatch = !q || name.includes(q);
        const show = styleMatch && sizeMatch && searchMatch;
        card.hidden = !show;
        if (show) visible++;
    });
    if (countEl)  countEl.textContent = visible;
    if (emptyEl)  emptyEl.hidden = visible > 0;
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

document.querySelectorAll('[data-filter="style"]').forEach(btn =>
    btn.addEventListener('click', () => setStyle(btn.dataset.value))
);

document.querySelectorAll('[data-filter="size"]').forEach(btn =>
    btn.addEventListener('click', () => setSize(btn.dataset.value))
);

document.getElementById('resetFilters')?.addEventListener('click', () => {
    setStyle('all');
    setSize('all');
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

function applyHash() {
    const hash = location.hash.slice(1);
    if (styleValues.has(hash)) setStyle(hash);
    else if (sizeValues.has(hash)) setSize(hash);
    else { setStyle('all'); setSize('all'); }
}

applyHash();
window.addEventListener('hashchange', applyHash);
