(function () {
    'use strict';

    function handleLegacyRedirects() {
        var supportedLanguages = ['tw', 'cn', 'en', 'jp'];
        var pathname = window.location.pathname || '/';
        var normalizedPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
        var langParam = null;

        try {
            langParam = new URL(window.location.href).searchParams.get('lang');
        } catch (error) {
            console.warn('404 redirect: unable to parse URL for lang.', error);
        }

        var redirectPrefixes = [
            { pattern: /^\/wp-content(\/|$)/, target: '/products/' },
            { pattern: /^\/product-category(\/|$)/, target: '/products/' }
        ];

        for (var i = 0; i < redirectPrefixes.length; i += 1) {
            if (redirectPrefixes[i].pattern.test(normalizedPath)) {
                var destination = redirectPrefixes[i].target;
                if (langParam) {
                    destination += '?lang=' + encodeURIComponent(langParam);
                }
                window.location.replace(destination);
                return true;
            }
        }

        var redirectMap = {
            '/about_us': '/about/',
            '/about_us.html': '/about/'
        };

        if (Object.prototype.hasOwnProperty.call(redirectMap, normalizedPath)) {
            window.location.replace(redirectMap[normalizedPath]);
            return true;
        }

        var segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
        if (!segments.length) {
            return false;
        }

        var maybeLang = segments[0].toLowerCase();
        if (!supportedLanguages.includes(maybeLang)) {
            return false;
        }

        segments.shift();
        var remainder = segments.join('/');
        var basePath = remainder.length ? '/' + remainder : '/';

        var searchParams;
        try {
            searchParams = new URLSearchParams(window.location.search);
        } catch (error) {
            console.warn('404 redirect: unable to parse search params.', error);
            return false;
        }

        searchParams.set('lang', maybeLang);
        var queryString = searchParams.toString();
        var hash = window.location.hash || '';
        var nextUrl = basePath + (queryString ? '?' + queryString : '') + hash;
        window.location.replace(nextUrl);
        return true;
    }

    function initCountdown() {
        var redirectDelay = 12;
        var countdownElements = document.querySelectorAll('.countdown-number');
        if (!countdownElements.length) {
            return;
        }

        function getTargetUrl() {
            var target = 'index.html';
            try {
                var current = new URL(window.location.href);
                var lang = current.searchParams.get('lang');
                if (lang) {
                    target += '?lang=' + lang;
                }
            } catch (error) {
                console.warn('404 redirect: unable to parse URL.', error);
            }
            return target;
        }

        var targetUrl = getTargetUrl();

        function updateCountdown(value) {
            countdownElements.forEach(function (element) {
                element.textContent = value;
            });
        }

        updateCountdown(redirectDelay);
        var remaining = redirectDelay;
        var countdownTimer = window.setInterval(function () {
            remaining -= 1;
            if (remaining <= 0) {
                updateCountdown(0);
                window.clearInterval(countdownTimer);
                window.location.href = targetUrl;
                return;
            }
            updateCountdown(remaining);
        }, 1000);
    }

    function onReady(cb) {
        if (typeof cb !== 'function') {
            return;
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cb, { once: true });
        } else {
            cb();
        }
    }

    if (!handleLegacyRedirects()) {
        onReady(initCountdown);
    }
})();
