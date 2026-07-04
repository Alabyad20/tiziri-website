/* ============================================
   TIZIRI — Rug Size Calculator
   ============================================ */

'use strict';

const RESULTS = {
    'living-allin':   { w: 300, h: 400, note: 'Every seat in your seating group sits entirely on the rug — the most grounded, "finished" look, best for formal or larger living rooms.' },
    'living-front':   { w: 250, h: 300, note: 'Only the front legs of each seat rest on the rug. This is the size that works for the widest range of living rooms.' },
    'living-float':   { w: 250, h: 300, note: 'Sized to read as a defined seating zone without touching any furniture — the minimum that still looks intentional rather than like a mat.' },

    'bed-twin':  { w: 200, h: 250, note: 'Extends roughly 45–60cm beyond a twin/single bed frame, so your feet land on wool on the open side.' },
    'bed-full':  { w: 230, h: 300, note: 'Extends roughly 45–60cm beyond a full/double bed frame on the open sides.' },
    'bed-queen': { w: 250, h: 300, note: 'Extends roughly 45–60cm beyond a queen bed frame on both open sides — the most common bedroom size.' },
    'bed-king':  { w: 300, h: 350, note: 'Extends well beyond a king bed frame on both sides — large enough that your feet land on wool no matter which side you get up on.' },

    'dining-4':     { w: 250, h: 200, note: 'Sized so all four chair legs stay on the rug even pulled fully out from a 4-seat table.' },
    'dining-6':     { w: 300, h: 220, note: 'Sized so all chair legs stay on the rug even pulled fully out from a 6-seat table.' },
    'dining-8':     { w: 340, h: 250, note: 'Sized so all chair legs stay on the rug even pulled fully out from a larger 8-seat table.' },
    'dining-round': { w: 270, h: 270, note: 'A round or square rug sized generously past the chairs of a round table that seats about 6.' },

    'hall-narrow':   { w: 70, h: null, note: 'A runner around 70cm wide suits a narrow passage without touching either wall. Length depends on your hallway — measure the full run.' },
    'hall-standard': { w: 80, h: null, note: 'A runner around 80cm wide is the standard fit for most hallways and entryways. Length depends on your hallway — measure the full run.' },
    'hall-wide':     { w: 100, h: null, note: 'A runner around 90–100cm wide suits a wider passage. Length depends on your hallway — measure the full run.' },
};

const ROOM_STEPS = {
    living:  'step2-living',
    bedroom: 'step2-bedroom',
    dining:  'step2-dining',
    hallway: 'step2-hallway',
};

function cmToFtIn(cm) {
    const totalInches = cm / 2.54;
    let feet = Math.floor(totalInches / 12);
    let inches = Math.round(totalInches % 12);
    if (inches === 12) { feet += 1; inches = 0; }
    return `${feet} ft ${inches} in`;
}

function sizeBucket(longestCm) {
    if (longestCm < 150) return 'small';
    if (longestCm <= 250) return 'medium';
    return 'large';
}

const roomOptions = document.getElementById('roomOptions');
const resultEl = document.getElementById('result');
const resultSize = document.getElementById('resultSize');
const resultSizeFt = document.getElementById('resultSizeFt');
const resultNote = document.getElementById('resultNote');
const resultShopLink = document.getElementById('resultShopLink');
const resetWrap = document.getElementById('resetWrap');
const resetBtn = document.getElementById('resetBtn');

function hideAllStep2() {
    Object.values(ROOM_STEPS).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
    });
}

function selectRoom(room, btn) {
    roomOptions.querySelectorAll('.calc-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    hideAllStep2();
    resultEl.hidden = true;
    const stepId = ROOM_STEPS[room];
    const stepEl = document.getElementById(stepId);
    if (stepEl) {
        stepEl.hidden = false;
        stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    resetWrap.hidden = false;
}

function showResult(key, groupEl, activeBtn) {
    const data = RESULTS[key];
    if (!data) return;
    groupEl.querySelectorAll('.calc-option').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');

    if (data.h) {
        resultSize.textContent = `${data.w} × ${data.h} cm`;
        resultSizeFt.textContent = `${cmToFtIn(data.w)} × ${cmToFtIn(data.h)}`;
    } else {
        resultSize.textContent = `${data.w} cm wide`;
        resultSizeFt.textContent = `${cmToFtIn(data.w)} wide`;
    }
    resultNote.textContent = data.note;

    const longest = Math.max(data.w, data.h || 0);
    const bucket = sizeBucket(longest);
    resultShopLink.href = `../collections/index.html#${bucket}`;

    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

roomOptions.querySelectorAll('.calc-option').forEach(btn => {
    btn.addEventListener('click', () => selectRoom(btn.dataset.room, btn));
});

Object.values(ROOM_STEPS).forEach(stepId => {
    const stepEl = document.getElementById(stepId);
    if (!stepEl) return;
    stepEl.querySelectorAll('.calc-option[data-result]').forEach(btn => {
        btn.addEventListener('click', () => showResult(btn.dataset.result, stepEl.querySelector('.calc-options'), btn));
    });
});

resetBtn.addEventListener('click', () => {
    roomOptions.querySelectorAll('.calc-option').forEach(b => b.classList.remove('active'));
    hideAllStep2();
    resultEl.hidden = true;
    resetWrap.hidden = true;
    document.getElementById('step1').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
