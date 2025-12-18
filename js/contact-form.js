(function () {
    if (!document.body || document.body.dataset.page !== 'contact') {
        return;
    }

    function syncToGoogleForm() {
        var form = document.getElementById('contact');
        if (!form) {
            return;
        }
        var mappings = [
            { field: 'unit', target: 'g_unit' },
            { field: 'name', target: 'g_name' },
            { field: 'tel', target: 'g_tel' },
            { field: 'mail', target: 'g_mail' },
            { field: 'title', target: 'g_title' },
            { field: 'text', target: 'g_text' },
            { field: 'lang', target: 'g_lang' }
        ];
        mappings.forEach(function (mapping) {
            var source = form[mapping.field];
            var target = document.getElementById(mapping.target);
            if (source && target) {
                target.value = source.value || '';
            }
        });
    }

    function showSuccessModal() {
        var modal = document.getElementById('successModal');
        if (!modal) {
            alert('您的留言已送出，我們將儘快與您聯繫。');
            return;
        }
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        var closeBtn = document.getElementById('successModalClose');
        if (closeBtn) {
            closeBtn.focus();
        }
        window.setTimeout(function () {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
            }
        }, 4000);
    }

    function handleSubmit(event) {
        if (event) {
            event.preventDefault();
        }
        if (typeof id_name !== 'undefined') {
            id_name = '';
        }
        var input_error = '*必填';
        if (typeof check === 'function') {
            check('name', 1, input_error);
            check('tel', 1, input_error);
            check('mail', 2, input_error);
            check('title', 1, input_error);
            check('text', 5, input_error);
        }

        var requiresAttachmentCheck = Array.from(document.querySelectorAll('input[type="file"]')).some(function (input) {
            return Boolean(input.value);
        });
        if (requiresAttachmentCheck && typeof check === 'function') {
            check('check', 3, input_error);
        }

        if (typeof id_name !== 'undefined' && id_name !== '') {
            var errorSpan = document.getElementById(id_name + '_span');
            if (errorSpan) {
                errorSpan.focus();
            }
            return;
        }

        syncToGoogleForm();
        var iframe = document.getElementById('hidden_iframe');
        var form = document.getElementById('contact');
        if (!iframe || !form) {
            return;
        }
        iframe.onload = null;
        iframe.onload = function () {
            var statusBox = document.getElementById('contact-status');
            if (statusBox) {
                statusBox.hidden = false;
                statusBox.classList.add('is-success');
            }
            showSuccessModal();
            form.reset();
        };
        form.submit();
    }

    function initModalControls() {
        var modal = document.getElementById('successModal');
        var close = document.getElementById('successModalClose');
        if (!modal || !close) {
            return;
        }
        close.addEventListener('click', function () {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
            }
        });
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                modal.classList.remove('show');
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var trigger = document.querySelector('[data-contact-submit]');
        var form = document.getElementById('contact');
        if (trigger) {
            trigger.addEventListener('click', handleSubmit);
        }
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
        initModalControls();
    });
})();
