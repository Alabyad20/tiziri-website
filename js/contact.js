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
