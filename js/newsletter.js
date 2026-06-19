'use strict';

const form    = document.getElementById('newsletterForm');
const success = document.getElementById('newsletterSuccess');
const input   = form ? form.querySelector('.newsletter__input') : null;
const btn     = form ? form.querySelector('.newsletter__btn') : null;

if (form && input && btn && success) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = input.value.trim();
        if (!email) return;

        btn.textContent = 'Subscribing…';
        btn.disabled = true;

        const url = 'https://tizirirugs.us10.list-manage.com/subscribe/post-json'
            + '?u=889c1e9a473495b663abe6c0e'
            + '&id=664108de2c'
            + '&f_id=00044be4f0'
            + '&EMAIL=' + encodeURIComponent(email)
            + '&b_889c1e9a473495b663abe6c0e_664108de2c='
            + '&c=__mc_callback__';

        window.__mc_callback__ = function (data) {
            const script = document.getElementById('__mc_script__');
            if (script) script.remove();
            delete window.__mc_callback__;

            if (data.result === 'success') {
                form.style.display = 'none';
                success.style.display = 'block';
            } else {
                btn.textContent = 'Subscribe';
                btn.disabled = false;
                let msg = (data.msg || '').replace(/<[^>]+>/g, '').trim();
                if (msg.toLowerCase().includes('already subscribed')) {
                    msg = 'You are already subscribed.';
                } else if (!msg) {
                    msg = 'Something went wrong. Please try again.';
                }
                let err = form.querySelector('.newsletter__error');
                if (!err) {
                    err = document.createElement('p');
                    err.className = 'newsletter__error';
                    form.appendChild(err);
                }
                err.textContent = msg;
            }
        };

        const script = document.createElement('script');
        script.id  = '__mc_script__';
        script.src = url;
        document.body.appendChild(script);
    });
}
