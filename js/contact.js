'use strict';

const form    = document.getElementById('contactForm');
const success = document.getElementById('contactSuccess');

if (form && success) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name    = document.getElementById('contactName').value.trim();
        const email   = document.getElementById('contactEmail').value.trim();
        const topic   = document.getElementById('contactTopic').value;
        const message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !topic || !message) return;

        const payload = {
            access_key: '88348fe5-bfcc-4067-850c-5840672658b6',
            name,
            email,
            subject: 'TIZIRI — ' + topic,
            message: 'Topic: ' + topic + '\n\n' + message
        };

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                form.style.display = 'none';
                success.style.display = 'block';
            } else {
                throw new Error('Web3Forms error');
            }
        })
        .catch(() => {
            const subject = encodeURIComponent('TIZIRI — ' + topic);
            const body    = encodeURIComponent(
                'Name: ' + name + '\n' +
                'Email: ' + email + '\n' +
                'Topic: ' + topic + '\n\n' +
                message
            );
            window.location.href =
                'mailto:hello@tizirirugs.com?subject=' + subject + '&body=' + body;
        });
    });
}
