function scrollNum() {
    (function ($) {
        $.fn.countTo = function (options) {
            options = options || {};
            return $(this).each(function () {
                var settings = $.extend({}, $.fn.countTo.defaults, {
                    from: $(this).data("from"),
                    to: $(this).data("to"),
                    speed: $(this).data("speed"),
                    refreshInterval: $(this).data("refresh-interval"),
                    decimals: $(this).data("decimals")
                }, options);

                var loops = Math.ceil(settings.speed / settings.refreshInterval);
                var increment = (settings.to - settings.from) / loops;
                var self = this;
                var $self = $(this);
                var loopCount = 0;
                var value = settings.from;
                var data = $self.data("countTo") || {};

                function render(val) {
                    var formattedValue = settings.formatter.call(self, val, settings);
                    $self.html(formattedValue);
                }

                $self.data("countTo", data);
                if (data.interval) {
                    clearInterval(data.interval);
                }

                data.interval = setInterval(function () {
                    loopCount += 1;
                    render(value += increment);

                    if (typeof settings.onUpdate === "function") {
                        settings.onUpdate.call(self, value);
                    }

                    if (loopCount >= loops) {
                        $self.removeData("countTo");
                        clearInterval(data.interval);
                        value = settings.to;
                        if (typeof settings.onComplete === "function") {
                            settings.onComplete.call(self, value);
                        }
                    }
                }, settings.refreshInterval);

                render(value);
            });
        };

        $.fn.countTo.defaults = {
            from: 0,
            to: 0,
            speed: 1000,
            refreshInterval: 100,
            decimals: 0,
            formatter: function (value, opts) {
                return value.toFixed(opts.decimals);
            },
            onUpdate: null,
            onComplete: null
        };
    }(jQuery));

    jQuery(function ($) {
        $(".count-number").data("countToOptions", {
            formatter: function (value, opts) {
                return value.toFixed(opts.decimals).replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
            }
        });

        $(".timer").each(function (opts) {
            var $this = $(this);
            opts = $.extend({}, opts || {}, $this.data("countToOptions") || {});
            $this.countTo(opts);
        });
    });
}

function initPartnersMarquee() {
    document.querySelectorAll(".partners-marquee__track").forEach(function (track) {
        if (track.dataset.marqueeBuilt) {
            return;
        }

        var items = Array.from(track.children);
        if (!items.length) {
            return;
        }

        var spacer = document.createElement("li");
        spacer.className = "partners-marquee__spacer";
        spacer.setAttribute("aria-hidden", "true");

        var pattern = items.slice();
        pattern.push(spacer);

        var clones = pattern.map(function (node) {
            var clone = node.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            return clone;
        });

        track.innerHTML = "";

        if (track.classList.contains("partners-marquee__track--right")) {
            clones.forEach(function (node) {
                track.appendChild(node);
            });
            pattern.forEach(function (node) {
                track.appendChild(node);
            });
        } else {
            pattern.forEach(function (node) {
                track.appendChild(node);
            });
            clones.forEach(function (node) {
                track.appendChild(node);
            });
        }

        track.style.setProperty("--marquee-distance", "100%");
        track.dataset.marqueeBuilt = "true";
    });
}

$(function () {
    window.setTimeout(function () {
        $(".slick-banner").on("init", function (event, slick) {
            var slideCount = slick.slideCount;
            slideCount = slideCount < 10 ? "0" + slideCount : slideCount;
            $(".banner .slideCount ").text(slideCount);
            $(".slick-banner").addClass("slickinit");
        });

        $(".slick-banner").slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            autoplaySpeed: 5000,
            autoplay: true,
            pauseOnHover: false,
            fade: true,
            speed: 1500,
            arrows: false,
            dots: true,
            dotsClass: "custom_paging",
            customPaging: function () {
                return '<i></i><svg><circle cx="13.5" cy="13.5" r="12.5" /></svg>';
            },
            appendDots: ".banner .dots"
        });
    }, 60);

    window.setTimeout(function () {
        scrollNum();
    }, 2000);

    initPartnersMarquee();

    var $prev = $(".exhi-wrap .ltbn");
    var $next = $(".exhi-wrap .rtbn");
    var percent = 0;

    $(".exhi").on("init", function (event, slick) {
        var slideCount = slick.slideCount;
        percent = 100 / slideCount;
        $(".dots-container .line").css("width", percent + "%");
    });

    $(".exhi").slick({
        slidesToScroll: 1,
        slidesToShow: 1.5,
        pauseOnHover: false,
        autoplay: false,
        speed: 1500,
        arrows: false,
        dots: false,
        infinite: false,
        variableWidth: true,
        responsive: [
            {
                breakpoint: 769,
                settings: {
                    slidesToShow: 1
                }
            }
        ]
    });

    $prev.click(function () {
        $(".exhi-wrap .exhi").slick("slickPrev");
    });

    $next.click(function () {
        $(".exhi-wrap .exhi").slick("slickNext");
    });

    $(".exhi").on("beforeChange", function (event, slick, currentSlide, nextSlide) {
        var width = (nextSlide + 1) * percent;
        console.log(nextSlide);
        $(".dots-container .line").css("width", width + "%");
    });

    var countTriggered = 0;
    $(window).on("scroll", function () {
        if ($(".p3").hasClass("animated")) {
            if (countTriggered === 0) {
                scrollNum();
            }
            countTriggered += 1;
        }
    }).scroll();
});
