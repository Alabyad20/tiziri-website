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

        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(new FormData(form)).toString()
        })
        .then(() => {
            form.style.display = 'none';
            success.style.display = 'block';
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
                'mailto:abdelkebirlabyad@gmail.com?subject=' + subject + '&body=' + body;
        });
    });
}
