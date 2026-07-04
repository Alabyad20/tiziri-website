/* ============================================
   TIZIRI — Custom Rug Design Wizard
   ============================================ */

'use strict';

const wizard = { style: null, size: null, price: null, colour: null };

const steps = ['step1', 'step2', 'step3'];
let currentStep = 1;

const progressDots = document.querySelectorAll('.finder-progress__dot');
const backBtn = document.getElementById('backBtn');
const summaryEl = document.getElementById('summary');
const resetWrap = document.getElementById('resetWrap');
const resetBtn = document.getElementById('resetBtn');
const notesEl = document.getElementById('wizardNotes');
const sendBtn = document.getElementById('sendBtn');

function updateProgress() {
    progressDots.forEach((dot, i) => {
        dot.classList.toggle('done', i < currentStep - 1);
    });
}

function showStep(n) {
    steps.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.hidden = (i + 1 !== n);
    });
    summaryEl.hidden = true;
    backBtn.hidden = (n === 1);
    currentStep = n;
    updateProgress();
    const el = document.getElementById(steps[n - 1]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function selectOption(stepNum, btn) {
    const stepEl = document.getElementById(`step${stepNum}`);
    stepEl.querySelectorAll('.calc-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (stepNum === 1) wizard.style = btn.dataset.value;
    if (stepNum === 2) { wizard.size = btn.dataset.value; wizard.price = btn.dataset.price; }
    if (stepNum === 3) wizard.colour = btn.dataset.value;

    if (stepNum < 3) {
        showStep(stepNum + 1);
    } else {
        showSummary();
    }
}

function showSummary() {
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
    });
    backBtn.hidden = false;
    currentStep = 4;
    updateProgress();

    document.getElementById('sumStyle').textContent = wizard.style || '—';
    document.getElementById('sumSize').textContent = wizard.size || '—';
    document.getElementById('sumPrice').textContent = wizard.price || '—';
    document.getElementById('sumColour').textContent = wizard.colour || '—';

    const params = new URLSearchParams();
    if (wizard.style) params.set('style', wizard.style);
    if (wizard.size) params.set('size', wizard.size);
    if (wizard.price) params.set('price', wizard.price);
    if (wizard.colour) params.set('colour', wizard.colour);
    const notes = notesEl.value.trim();
    if (notes) params.set('notes', notes);

    sendBtn.href = `../contact/index.html?${params.toString()}`;

    summaryEl.hidden = false;
    resetWrap.hidden = false;
    summaryEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

steps.forEach((stepId, i) => {
    const stepEl = document.getElementById(stepId);
    if (!stepEl) return;
    stepEl.querySelectorAll('.calc-option').forEach(btn => {
        btn.addEventListener('click', () => selectOption(i + 1, btn));
    });
});

backBtn.addEventListener('click', () => {
    if (currentStep > 1) showStep(Math.min(currentStep - 1, 3));
});

resetBtn.addEventListener('click', () => {
    wizard.style = null;
    wizard.size = null;
    wizard.price = null;
    wizard.colour = null;
    notesEl.value = '';
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.querySelectorAll('.calc-option').forEach(b => b.classList.remove('active'));
    });
    summaryEl.hidden = true;
    resetWrap.hidden = true;
    showStep(1);
    document.getElementById('step1').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
