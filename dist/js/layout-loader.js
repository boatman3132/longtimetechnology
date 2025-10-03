(function () {
    var callbacks = [];
    var layoutReady = false;

    window.onLayoutReady = function (cb) {
        if (typeof cb !== 'function') return;
        if (layoutReady) {
            cb();
        } else {
            callbacks.push(cb);
        }
    };

    function runCallbacks() {
        layoutReady = true;
        if (!callbacks.length) return;
        callbacks.forEach(function (cb) {
            try {
                cb();
            } catch (err) {
                console.error('onLayoutReady callback failed:', err);
            }
        });
        callbacks = [];
    }

    function loadPartial(target, fallbackSrc) {
        var src = target.getAttribute('data-src') || fallbackSrc;
        if (!src) return Promise.resolve();
        return fetch(src)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load partial: ' + src + ' (' + response.status + ')');
                }
                return response.text();
            })
            .then(function (html) {
                target.insertAdjacentHTML('afterend', html);
                target.remove();
            })
            .catch(function (error) {
                console.error(error);
            });
    }

    function closeMenu($header, $navBox) {
        $header.removeClass('menu-expanded');
        $header.find('li.in-active').removeClass('in-active');
        $navBox.stop(true, true).fadeOut(function () {
            $(this).removeAttr('style');
        });
    }

    function initNavigation() {
        var $ = window.jQuery;
        if (!$) return;
        var $header = $('header');
        var $navBox = $header.find('.navBox');
        var $menuIcon = $header.find('.menuicon');

        $menuIcon.off('.layoutLoader').on('click.layoutLoader', function () {
            if ($header.hasClass('menu-expanded')) {
                closeMenu($header, $navBox);
            } else {
                $header.addClass('menu-expanded');
                $navBox.stop(true, true).fadeIn();
            }
            return false;
        });

        $header.find('a.hasmenu').off('.layoutLoader').on('click.layoutLoader', function () {
            var $item = $(this).parent();
            if ($item.hasClass('in-active')) {
                $item.toggleClass('in-active');
            } else {
                $('ul.mmenu > li').removeClass('in-active');
                $item.addClass('in-active');
            }
            return false;
        });

        $header.find('.navBox a').off('.layoutLoader').on('click.layoutLoader', function () {
            if ($(window).width() > 990) {
                return;
            }

            var $link = $(this);
            if ($link.hasClass('hasmenu')) {
                return;
            }

            var href = ($link.attr('href') || '').trim().toLowerCase();
            var isJavascriptLink = !href || href === '#' || href.indexOf('javascript:') === 0;
            if (isJavascriptLink) {
                return;
            }

            var delay = $link.closest('.subBox').length ? 120 : 0;
            window.setTimeout(function () {
                closeMenu($header, $navBox);
            }, delay);
        });

        $(window)
            .off('.layoutLoader')
            .on('resize.layoutLoader', function () {
                if ($(window).width() > 990) {
                    $navBox.stop(true, true).fadeIn(0);
                    $navBox.removeAttr('style');
                    $header.removeClass('menu-expanded');
                }
            });
    }

    function waitForjQuery(attempt) {
        if (typeof attempt === 'undefined') attempt = 0;
        if (window.jQuery) {
            initNavigation();
            runCallbacks();
            return;
        }
        if (attempt > 200) {
            console.warn('layout-loader: jQuery not detected – layout callbacks cancelled.');
            runCallbacks();
            return;
        }
        setTimeout(function () {
            waitForjQuery(attempt + 1);
        }, 25);
    }

    function init() {
        var headerPlaceholder = document.querySelector('[data-include="header"]');
        var footerPlaceholder = document.querySelector('[data-include="footer"]');
        var tasks = [];
        if (headerPlaceholder) {
            tasks.push(loadPartial(headerPlaceholder, 'header.html'));
        }
        if (footerPlaceholder) {
            tasks.push(loadPartial(footerPlaceholder, 'footer.html'));
        }
        Promise.all(tasks).then(function () {
            waitForjQuery(0);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
