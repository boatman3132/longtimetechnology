(function enforceSecureTransportAndHeaders() {
    var locationRef = window.location;
    var isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(locationRef.host);
    var isFileProtocol = locationRef.protocol === 'file:';
    var canonicalHost = 'www.lttech.com.tw';
    var needsCanonicalRedirect = locationRef.hostname && locationRef.hostname !== canonicalHost;

    if (!isLocal && !isFileProtocol && (locationRef.protocol === 'http:' || needsCanonicalRedirect)) {
        var targetHost = needsCanonicalRedirect ? canonicalHost : locationRef.host;
        var target = 'https://' + targetHost + locationRef.pathname + locationRef.search + locationRef.hash;
        window.location.replace(target);
        return;
    }

    var cspPolicy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://i.ytimg.com https://img.youtube.com https://*.googleusercontent.com https://*.gstatic.com; font-src 'self' data:; connect-src 'self'; frame-src 'self' https://*.google.com https://*.youtube.com https://docs.google.com; form-action 'self' https://docs.google.com; base-uri 'self'; object-src 'none'; upgrade-insecure-requests;";

    var metaDirectives = [
        { name: 'Content-Security-Policy', value: cspPolicy },
        { name: 'X-Content-Type-Options', value: 'nosniff' },
        { name: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { name: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
    ];

    metaDirectives.forEach(function (directive) {
        var selector = directive.name === 'Referrer-Policy'
            ? 'meta[name="' + directive.name + '"]'
            : 'meta[http-equiv="' + directive.name + '"]';
        var metaTag = document.querySelector(selector);

        if (!metaTag) {
            metaTag = document.createElement('meta');
            if (directive.name === 'Referrer-Policy') {
                metaTag.setAttribute('name', directive.name);
            } else {
                metaTag.setAttribute('http-equiv', directive.name);
            }
            document.head.appendChild(metaTag);
        }

        metaTag.setAttribute('content', directive.value);
    });

    var externalTargets = document.querySelectorAll('a[target="_blank"]');
    externalTargets.forEach(function (anchor) {
        var relValue = anchor.getAttribute('rel') || '';
        if (!/noopener/i.test(relValue)) {
            relValue = (relValue + ' noopener').trim();
        }
        if (!/noreferrer/i.test(relValue)) {
            relValue = (relValue + ' noreferrer').trim();
        }
        anchor.setAttribute('rel', relValue);
    });
})();
