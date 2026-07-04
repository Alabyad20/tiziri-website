/* ============================================
   TIZIRI — Wool Rug Care Guide (situation picker)
   ============================================ */

'use strict';

const situationBtns = document.querySelectorAll('.situation-btn');
const panels = document.querySelectorAll('.situation-panel');

situationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const situation = btn.dataset.situation;

        situationBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        panels.forEach(p => { p.hidden = true; });
        const panel = document.getElementById(`panel-${situation}`);
        if (panel) {
            panel.hidden = false;
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
});
