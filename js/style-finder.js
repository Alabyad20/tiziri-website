/* ============================================
   TIZIRI — Rug Style Finder
   ============================================ */

'use strict';

// Each answer adds weighted points toward one or more styles.
const WEIGHTS = {
    q1: {
        ivory:      { 'beni-ourain': 3, azilal: 2 },
        bold:       { boujaad: 3, mrirt: 2, boucherouite: 2 },
        muted:      { contemporary: 3, mrirt: 1 },
        practical:  { kilim: 3 },
    },
    q2: {
        minimal:  { 'beni-ourain': 2, azilal: 2 },
        dense:    { boujaad: 3, mrirt: 1 },
        graphic:  { mrirt: 3, kilim: 1 },
        abstract: { contemporary: 3 },
    },
    q3: {
        calm:    { 'beni-ourain': 2, mrirt: 1 },
        focal:   { boujaad: 2, mrirt: 2 },
        durable: { kilim: 3 },
        accent:  { azilal: 2, boucherouite: 2 },
    },
};

const STYLES = {
    'beni-ourain': {
        name: 'Beni Ourain',
        why: "Ivory wool, high pile, and a restrained geometric lattice — the classic choice when you want warmth and texture without the rug competing for attention.",
        image: 'IMG-20260607-WA0056.webp',
        shop: '../collections/index.html#beni-ourain',
        guide: '../blog/beni-ourain-rug-guide/index.html',
    },
    boujaad: {
        name: 'Boujaad',
        why: "Bold, dense colour and loose tribal geometry from the Rehamna plains — you want a rug that's the room's obvious focal point, not a supporting player.",
        image: 'IMG-20260530-WA0420.webp',
        shop: '../collections/index.html#boujaad',
        guide: '../blog/boujaad-rug-guide/index.html',
    },
    mrirt: {
        name: 'Mrirt',
        why: "The same high pile as Beni Ourain, paired with a bolder, more graphic palette — warmth and colour in one piece, often called the modern Beni Ourain.",
        image: 'IMG-20260607-WA0149.webp',
        shop: '../collections/index.html#mrirt',
        guide: '../blog/mrirt-rug-guide/index.html',
    },
    kilim: {
        name: 'Kilim',
        why: "Flat-woven, durable, and fully reversible — built for a room where practicality matters as much as looks, like a kitchen, hallway, or dining room.",
        image: 'IMG-20260621-WA0021.webp',
        shop: '../collections/index.html#kilim',
        guide: '../blog/kilim-rug-guide/index.html',
    },
    contemporary: {
        name: 'Contemporary',
        why: "Modern abstract shapes, hand-knotted by the same weavers behind the traditional styles — pattern with a gallery sensibility, not a tribal one.",
        image: 'IMG-20260530-WA0259.webp',
        shop: '../collections/index.html#contemporary',
        guide: '../blog/contemporary-moroccan-rug-guide/index.html',
    },
    azilal: {
        name: 'Azilal & Boucherouite',
        why: "Sparse and improvised, or dense and built from recycled textile — either way, a genuinely one-of-a-kind accent piece rather than a room's foundation.",
        image: 'IMG-20260530-WA0273.webp',
        shop: '../collections/index.html#azilal',
        guide: '../blog/azilal-boucherouite-rug-guide/index.html',
    },
};
// boucherouite scores fold into the same result card as azilal (one combined guide/style)
const SCORE_KEY_TO_STYLE = {
    'beni-ourain': 'beni-ourain',
    boujaad: 'boujaad',
    mrirt: 'mrirt',
    kilim: 'kilim',
    contemporary: 'contemporary',
    azilal: 'azilal',
    boucherouite: 'azilal',
};

const answers = {};
const steps = ['q1', 'q2', 'q3'];
const progressDots = document.querySelectorAll('.finder-progress__dot');
const resultEl = document.getElementById('result');
const resetWrap = document.getElementById('resetWrap');
const resetBtn = document.getElementById('resetBtn');

function updateProgress() {
    const answeredCount = Object.keys(answers).length;
    progressDots.forEach((dot, i) => {
        dot.classList.toggle('done', i < answeredCount);
    });
}

function showStep(stepId) {
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = (id !== stepId);
    });
    resultEl.hidden = true;
    const el = document.getElementById(stepId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function computeResult() {
    const scores = {};
    Object.keys(answers).forEach(q => {
        const a = answers[q];
        const weights = WEIGHTS[q][a];
        if (!weights) return;
        Object.keys(weights).forEach(key => {
            const styleKey = SCORE_KEY_TO_STYLE[key];
            scores[styleKey] = (scores[styleKey] || 0) + weights[key];
        });
    });
    let best = null;
    let bestScore = -Infinity;
    Object.keys(scores).forEach(key => {
        if (scores[key] > bestScore) {
            bestScore = scores[key];
            best = key;
        }
    });
    return best || 'beni-ourain';
}

function showResult() {
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
    });
    const styleKey = computeResult();
    const style = STYLES[styleKey];

    document.getElementById('resultImg').src = `../rug-photos/${style.image}`;
    document.getElementById('resultImg').alt = `${style.name} Moroccan rug`;
    document.getElementById('resultName').textContent = style.name;
    document.getElementById('resultWhy').textContent = style.why;
    document.getElementById('resultShop').href = style.shop;
    document.getElementById('resultGuide').href = style.guide;

    resultEl.hidden = false;
    resetWrap.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function selectAnswer(qNum, value, btn) {
    const stepEl = btn.closest('.calc-step');
    stepEl.querySelectorAll('.calc-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    answers[`q${qNum}`] = value;
    updateProgress();

    if (qNum < 3) {
        showStep(`q${qNum + 1}`);
    } else {
        showResult();
    }
}

steps.forEach(stepId => {
    const stepEl = document.getElementById(stepId);
    if (!stepEl) return;
    stepEl.querySelectorAll('.calc-option').forEach(btn => {
        btn.addEventListener('click', () => selectAnswer(Number(btn.dataset.q), btn.dataset.a, btn));
    });
});

resetBtn.addEventListener('click', () => {
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.hidden = (id !== 'q1');
            el.querySelectorAll('.calc-option').forEach(b => b.classList.remove('active'));
        }
    });
    Object.keys(answers).forEach(k => delete answers[k]);
    updateProgress();
    resultEl.hidden = true;
    resetWrap.hidden = true;
    document.getElementById('q1').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
