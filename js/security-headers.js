(function enforceSecureTransportAndHeaders() {
    var locationRef = window.location;
    var isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(locationRef.host);
    var isFileProtocol = locationRef.protocol === 'file:';

    if (!isLocal && !isFileProtocol && locationRef.protocol === 'http:') {
        var target = 'https://' + locationRef.host + locationRef.pathname + locationRef.search + locationRef.hash;
        window.location.replace(target);
        return;
    }

    var metaDirectives = [
        { name: 'X-Content-Type-Options', value: 'nosniff' },
        { name: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
    ];

    metaDirectives.forEach(function (directive) {
        var selector = 'meta[http-equiv="' + directive.name + '"]';
        var metaTag = document.querySelector(selector);

        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.setAttribute('http-equiv', directive.name);
            document.head.appendChild(metaTag);
        }

        metaTag.setAttribute('content', directive.value);
    });
})();
