'use strict';

const form    = document.getElementById('contactForm');
const success = document.getElementById('contactSuccess');

/* Pre-fill from a query string, e.g. ?design=green-wave or
   ?style=Mrirt&size=Large%20(200%20x%20300cm)&price=%24950&color=Bold — used by the
   Made-to-Order page's "Enquire about this design" links and the Custom Rug Design Wizard.
   ?topic=trade is used by the Designer & Trade page's application CTA. */
(function prefillFromQuery() {
    const params = window.TiziriContactParams.read();
    const topicEl   = document.getElementById('contactTopic');
    const messageEl = document.getElementById('contactMessage');
    if (!topicEl || !messageEl) return;

    const topic  = params.topic;
    const design = params.design;
    const style  = params.style;
    const size   = params.size;
    const price  = params.price;
    const color  = params.color;
    const notes  = params.notes;

    if (topic === 'trade') {
        topicEl.value = 'Designer & trade enquiry';
        messageEl.value = [
            "I'd like to apply for the Designer & Trade program.",
            '',
            'Business/studio name:',
            'Website or portfolio:',
            'Type of project (residential, hospitality, commercial):',
            '',
            'Please let me know more.'
        ].join('\n');
        return;
    }

    if (!design && !style && !size && !color) return;

    topicEl.value = 'Specific rug enquiry';

    const lines = [];
    if (design) lines.push(`I'm interested in the "${design.replace(/-/g, ' ')}" made-to-order design.`);
    if (style)  lines.push(`Style: ${style}`);
    if (size)   lines.push(`Size: ${size}`);
    if (price)  lines.push(`Price: ${price}`);
    if (color)  lines.push(`Color direction: ${color}`);
    if (notes)  lines.push(`Notes: ${notes}`);
    lines.push('', 'Please let me know more.');

    messageEl.value = lines.join('\n');
})();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELDS = [
    { id: 'contactName', errorId: 'contactName-error', validate: (v) => v.trim() ? '' : 'Please enter your name.' },
    { id: 'contactEmail', errorId: 'contactEmail-error', validate: (v) => {
        const trimmed = v.trim();
        if (!trimmed) return 'Please enter your email address.';
        if (!EMAIL_RE.test(trimmed)) return 'Please enter a valid email address.';
        return '';
    } },
    { id: 'contactTopic', errorId: 'contactTopic-error', validate: (v) => v ? '' : 'Please select a topic.' },
    { id: 'contactMessage', errorId: 'contactMessage-error', validate: (v) => v.trim() ? '' : 'Please enter a message.' }
];

function validateField(field) {
    const el = document.getElementById(field.id);
    const errorEl = document.getElementById(field.errorId);
    const message = field.validate(el.value);

    if (message) {
        el.setAttribute('aria-invalid', 'true');
        errorEl.textContent = message;
    } else {
        el.removeAttribute('aria-invalid');
        errorEl.textContent = '';
    }
    return message;
}

if (form) {
    FIELDS.forEach((field) => {
        const el = document.getElementById(field.id);
        el.addEventListener('blur', () => validateField(field));
        el.addEventListener('input', () => {
            if (el.getAttribute('aria-invalid') === 'true') validateField(field);
        });
        el.addEventListener('change', () => {
            if (el.getAttribute('aria-invalid') === 'true') validateField(field);
        });
    });
}

if (form && success) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        let firstInvalidEl = null;
        FIELDS.forEach((field) => {
            const message = validateField(field);
            if (message && !firstInvalidEl) firstInvalidEl = document.getElementById(field.id);
        });

        if (firstInvalidEl) {
            firstInvalidEl.focus();
            return;
        }

        const name    = document.getElementById('contactName').value.trim();
        const email   = document.getElementById('contactEmail').value.trim();
        const topic   = document.getElementById('contactTopic').value;
        const message = document.getElementById('contactMessage').value.trim();

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
