(function () {
    if (!document.body || document.body.dataset.page !== 'investors') {
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
            const chartCanvas = document.getElementById('revenuePerformanceChart');
            if (!chartCanvas || typeof Chart === 'undefined') {
                return;
            }

            const rangeButtons = Array.from(document.querySelectorAll('.chart-range-btn'));
            const placeholder = document.querySelector('.revenue-chart-placeholder');
            const chartWrapper = document.querySelector('.revenue-chart-wrapper');
            const chartScroll = document.querySelector('.revenue-chart-scroll');
            const sectionElement = document.getElementById('revenue-trends');
            const csvPath = 'investors/榮炭營收股價成交量.csv';
            const localeCopy = {
                tw: {
                    revenueLegend: '營收',
                    priceLegend: '股價',
                    revenueAxis: '營收 (千元)',
                    priceAxis: '股價 (元)',
                    revenueTooltip: '營收',
                    priceTooltip: '股價'
                },
                cn: {
                    revenueLegend: '营收',
                    priceLegend: '股价',
                    revenueAxis: '营收 (千元)',
                    priceAxis: '股价 (元)',
                    revenueTooltip: '营收',
                    priceTooltip: '股价'
                },
                en: {
                    revenueLegend: 'Revenue',
                    priceLegend: 'Share Price',
                    revenueAxis: 'Revenue (NT$1,000)',
                    priceAxis: 'Share Price (NT$)',
                    revenueTooltip: 'Revenue',
                    priceTooltip: 'Share Price'
                },
                jp: {
                    revenueLegend: '売上高',
                    priceLegend: '株価',
                    revenueAxis: '売上高 (千元)',
                    priceAxis: '株価 (元)',
                    revenueTooltip: '売上高',
                    priceTooltip: '株価'
                }
            };

            const revenueFormatter = new Intl.NumberFormat('zh-TW');
            const priceFormatter = new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

            let chartInstance = null;
            let fullData = [];
            let currentLocale = resolveLocale();
            let tooltipElement = null;
            let resizeTimeout = null;
            let dataReady = false;
            let sectionInView = !('IntersectionObserver' in window) || !sectionElement;
            let sectionAnimated = !sectionElement || sectionElement.classList.contains('animated');
            let pendingMonths = 36;
            let hasPlayedInitialAnimation = false;
            let shouldPlayInitialAnimation = false;
            let initialAnimationInProgress = false;
            let initialAnimationTimeoutId = null;
            let pendingMonthsAfterAnimation = null;
            let pendingAnimateAfterAnimation = false;
            let intersectionObserver = null;
            let sectionAnimationObserver = null;
            let sectionAnimationPollId = null;
            const INITIAL_ANIMATION_DELAY = 1500;

            const lineOnTopPlugin = {
                id: 'lineOnTopPlugin',
                afterDatasetsDraw(chart) {
                    const metas = chart.getSortedVisibleDatasetMetas().filter(meta => meta.type === 'line');
                    metas.forEach(meta => {
                        if (!meta.hidden) {
                            chart.ctx.save();
                            meta.controller.draw();
                            chart.ctx.restore();
                        }
                    });
                }
            };

            rangeButtons.forEach(button => {
                button.disabled = true;
            });

            if (sectionElement && !sectionAnimated) {
                if ('MutationObserver' in window) {
                    sectionAnimationObserver = new MutationObserver(() => {
                        if (sectionElement.classList.contains('animated')) {
                            sectionAnimated = true;
                            sectionInView = true;
                            if (sectionAnimationPollId !== null) {
                                window.clearTimeout(sectionAnimationPollId);
                                sectionAnimationPollId = null;
                            }
                            sectionAnimationObserver.disconnect();
                            sectionAnimationObserver = null;
                            if (dataReady) {
                                triggerChartUpdate({ months: pendingMonths, animateInitial: !hasPlayedInitialAnimation });
                            }
                        }
                    });
                    sectionAnimationObserver.observe(sectionElement, { attributes: true, attributeFilter: ['class'] });
                } else if (sectionInView) {
                    startSectionAnimationPolling();
                }
            }

            if (!sectionInView && sectionElement) {
                intersectionObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            sectionInView = true;
                            if (intersectionObserver) {
                                intersectionObserver.disconnect();
                                intersectionObserver = null;
                            }
                            if (sectionElement && sectionElement.classList.contains('animated')) {
                                sectionAnimated = true;
                            } else if (!('MutationObserver' in window)) {
                                startSectionAnimationPolling();
                            }
                            if (dataReady && sectionAnimated) {
                                triggerChartUpdate({ months: pendingMonths, animateInitial: !hasPlayedInitialAnimation });
                            }
                        }
                    });
                }, { threshold: 0.35 });
                intersectionObserver.observe(sectionElement);
            }

            fetch(csvPath, { cache: 'no-cache' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network error');
                    }
                    return response.text();
                })
                .then(text => {
                    fullData = parseCsv(text);
                    if (!fullData.length) {
                        throw new Error('No data');
                    }
                    fullData.sort((a, b) => a.date - b.date);
                    rangeButtons.forEach(button => {
                        button.disabled = false;
                    });
                    dataReady = true;
                    pendingMonths = getActiveMonths();
                    triggerChartUpdate({ months: pendingMonths, animateInitial: true });
                })
                .catch(() => {
                    if (placeholder) {
                        placeholder.classList.add('has-error');
                        placeholder.removeAttribute('aria-hidden');
                        placeholder.innerHTML = `
                            <span class="tw">資料載入失敗，請稍後再試。</span>
                            <span class="cn">资料载入失败，请稍后再试。</span>
                            <span class="en">Unable to load data. Please try again later.</span>
                            <span class="jp">データを読み込めませんでした。後でもう一度お試しください。</span>
                        `;
                    }
                });

            rangeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (!fullData.length || button.classList.contains('is-active')) {
                        return;
                    }
                    rangeButtons.forEach(btn => {
                        btn.classList.remove('is-active');
                        btn.setAttribute('aria-pressed', 'false');
                    });
                    button.classList.add('is-active');
                    button.setAttribute('aria-pressed', 'true');
                    const months = Number.parseInt(button.dataset.months, 10);
                    pendingMonths = Number.isFinite(months) ? months : 36;
                    if (dataReady) {
                        triggerChartUpdate({ months: pendingMonths, animateInitial: false });
                    }
                });
            });

            const bodyObserver = new MutationObserver(() => {
                const nextLocale = resolveLocale();
                if (nextLocale !== currentLocale) {
                    currentLocale = nextLocale;
                    applyLocaleToChart();
                } else {
                    applyLocaleToChart();
                }
            });

            bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

            window.addEventListener('resize', () => {
                if (!fullData.length) {
                    return;
                }
                window.clearTimeout(resizeTimeout);
                resizeTimeout = window.setTimeout(() => {
                    pendingMonths = getActiveMonths();
                    triggerChartUpdate({ months: pendingMonths, animateInitial: false });
                }, 200);
            });

            function triggerChartUpdate({ months = pendingMonths, animateInitial = false } = {}) {
                const targetMonths = Number.isFinite(months) ? months : getActiveMonths();
                pendingMonths = targetMonths;
                if (!fullData.length || !isSectionReadyForAnimation()) {
                    return;
                }
                if (initialAnimationInProgress) {
                    pendingMonthsAfterAnimation = targetMonths;
                    pendingAnimateAfterAnimation = animateInitial;
                    return;
                }
                const willPlayInitial = animateInitial && !hasPlayedInitialAnimation && !initialAnimationInProgress;
                if (willPlayInitial) {
                    initialAnimationInProgress = true;
                }
                if (placeholder && !placeholder.classList.contains('is-hidden')) {
                    hidePlaceholder();
                }
                if (willPlayInitial) {
                    if (initialAnimationTimeoutId !== null) {
                        window.clearTimeout(initialAnimationTimeoutId);
                    }
                    initialAnimationTimeoutId = window.setTimeout(() => {
                        initialAnimationTimeoutId = null;
                        updateChart(pendingMonths, { animateInitial: true });
                    }, INITIAL_ANIMATION_DELAY);
                    return;
                }
                updateChart(targetMonths, { animateInitial: willPlayInitial });
            }

            function resolveLocale() {
                const langClass = Array.from(document.body.classList).find(cls => cls.startsWith('lang_')) || 'lang_tw';
                const langKey = langClass.split('_')[1] || 'tw';
                return localeCopy[langKey] || localeCopy.tw;
            }

            function isSectionReadyForAnimation() {
                return sectionInView && sectionAnimated;
            }

            function startSectionAnimationPolling() {
                if (sectionAnimationPollId !== null || sectionAnimated || !sectionElement) {
                    return;
                }
                const checkAnimation = () => {
                    if (sectionAnimated || !sectionElement) {
                        sectionAnimationPollId = null;
                        return;
                    }
                    if (sectionElement.classList.contains('animated')) {
                        sectionAnimated = true;
                        sectionInView = true;
                        sectionAnimationPollId = null;
                        if (dataReady) {
                            triggerChartUpdate({ months: pendingMonths, animateInitial: !hasPlayedInitialAnimation });
                        }
                        return;
                    }
                    sectionAnimationPollId = window.setTimeout(checkAnimation, 150);
                };
                checkAnimation();
            }

            function parseCsv(text) {
                const lines = text.trim().split(/\r?\n/);
                const result = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) {
                        continue;
                    }
                    const values = [];
                    const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
                    let match;
                    while ((match = regex.exec(line)) !== null) {
                        values.push(match[1].replace(/^"|"$/g, '').trim());
                    }
                    if (values.length < 4) {
                        continue;
                    }
                    const periodLabel = values[0];
                    const [yearString, monthString] = periodLabel.split('/');
                    const year = Number.parseInt(yearString, 10);
                    const monthIndex = Number.parseInt(monthString, 10) - 1;
                    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
                        continue;
                    }
                    const entry = {
                        label: periodLabel,
                        date: new Date(year, monthIndex, 1),
                        revenue: parseNumeric(values[1]),
                        price: parseNumeric(values[2]),
                        volume: parseNumeric(values[3])
                    };
                    result.push(entry);
                }
                return result;
            }

            function parseNumeric(value) {
                if (value === null || value === undefined || value === '') {
                    return null;
                }
                const numeric = value.replace(/,/g, '');
                const parsed = Number(numeric);
                return Number.isFinite(parsed) ? parsed : null;
            }

            function hidePlaceholder() {
                if (placeholder) {
                    placeholder.classList.add('is-hidden');
                    placeholder.setAttribute('aria-hidden', 'true');
                }
            }

            function getActiveMonths() {
                const activeButton = rangeButtons.find(btn => btn.classList.contains('is-active'));
                const months = activeButton ? Number.parseInt(activeButton.dataset.months, 10) : 36;
                return Number.isFinite(months) ? months : 36;
            }

            function getDataForRange(months) {
                if (!fullData.length) {
                    return [];
                }
                if (fullData.length <= months) {
                    return fullData.slice();
                }
                return fullData.slice(fullData.length - months);
            }

            function applyLocaleToChart() {
                if (!chartInstance) {
                    return;
                }
                chartInstance.data.datasets[0].label = currentLocale.revenueLegend;
                chartInstance.data.datasets[1].label = currentLocale.priceLegend;
                chartInstance.options.scales.revenueScale.title.text = currentLocale.revenueAxis;
                chartInstance.options.scales.priceScale.title.text = currentLocale.priceAxis;
                chartInstance.update('none');
            }

            function ensureTooltipElement() {
                if (!chartWrapper) {
                    return null;
                }
                if (!tooltipElement) {
                    tooltipElement = document.createElement('div');
                    tooltipElement.className = 'chartjs-external-tooltip';
                    tooltipElement.style.opacity = '0';
                    tooltipElement.style.pointerEvents = 'none';
                    chartWrapper.appendChild(tooltipElement);
                }
                return tooltipElement;
            }

            function externalTooltipHandler(context) {
                const { chart, tooltip } = context;
                const tooltipEl = ensureTooltipElement();
                if (!tooltipEl) {
                    return;
                }

                if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints?.length) {
                    tooltipEl.style.opacity = '0';
                    return;
                }

                const dataIndex = tooltip.dataPoints[0].dataIndex;
                const revenuePoint = tooltip.dataPoints.find(point => point.dataset?.yAxisID === 'revenueScale');
                const pricePoint = tooltip.dataPoints.find(point => point.dataset?.yAxisID === 'priceScale');
                const priceMeta = chart.getDatasetMeta(1);
                const priceElement = priceMeta?.data?.[dataIndex];
                if (!priceElement) {
                    tooltipEl.style.opacity = '0';
                    return;
                }

                const revenueValue = revenuePoint ? revenuePoint.parsed.y : null;
                const priceValue = pricePoint ? pricePoint.parsed.y : null;
                const titleText = tooltip.title?.[0] || '';

                tooltipEl.innerHTML = `
                    <div class="tooltip-title">${titleText}</div>
                    <div class="tooltip-body">
                        <div>${currentLocale.revenueTooltip}：${revenueValue === null ? '—' : revenueFormatter.format(revenueValue)}</div>
                        <div>${currentLocale.priceTooltip}：${priceValue === null ? '—' : priceFormatter.format(priceValue)}</div>
                    </div>
                `;

                tooltipEl.style.opacity = '1';
                tooltipEl.style.visibility = 'visible';

                const { x, y } = priceElement.getProps(['x', 'y'], true);
                const canvasRect = chart.canvas.getBoundingClientRect();
                const wrapperRect = chartWrapper.getBoundingClientRect();
                const tooltipWidth = tooltipEl.offsetWidth;
                const tooltipHeight = tooltipEl.offsetHeight;

                const relativeX = x + (canvasRect.left - wrapperRect.left);
                const relativeY = y + (canvasRect.top - wrapperRect.top);

                let left = relativeX + 14;
                let top = relativeY - tooltipHeight / 2;

                const maxLeft = chartWrapper.clientWidth - tooltipWidth - 8;
                const maxTop = chartWrapper.clientHeight - tooltipHeight - 8;

                if (left < 8) {
                    left = 8;
                }
                if (left > maxLeft) {
                    left = maxLeft;
                }
                if (top < 8) {
                    top = 8;
                } else if (top > maxTop) {
                    top = maxTop;
                }

                tooltipEl.style.left = `${Math.round(left)}px`;
                tooltipEl.style.top = `${Math.round(top)}px`;
            }

            function updateChart(months, { animateInitial = false } = {}) {
                const data = getDataForRange(months);
                if (!data.length) {
                    if (initialAnimationInProgress) {
                        initialAnimationInProgress = false;
                    }
                    shouldPlayInitialAnimation = false;
                    return;
                }

                pendingMonths = months;
                shouldPlayInitialAnimation = animateInitial;

                const labels = data.map(item => item.label);
                const revenueValues = data.map(item => item.revenue);
                const priceValues = data.map(item => item.price);
                const isMobile = window.matchMedia('(max-width: 768px)').matches;

                if (chartScroll) {
                    if (isMobile) {
                        const wrapperWidth = chartWrapper ? chartWrapper.clientWidth : 0;
                        const mobileMinWidth = 720;
                        const targetWidth = Math.max(wrapperWidth, mobileMinWidth);
                        chartScroll.style.minWidth = `${Math.ceil(targetWidth)}px`;
                    } else {
                        chartScroll.style.minWidth = '';
                    }
                }

                const baseAnimationDuration = animateInitial ? 1100 : 520;
                const axisAnimationDuration = animateInitial ? 880 : 460;
                const animationOptions = {
                    duration: baseAnimationDuration,
                    easing: 'easeOutQuart',
                    delay(context) {
                        if (!shouldPlayInitialAnimation || context.type !== 'data' || context.mode !== 'default') {
                            return 0;
                        }
                        const datasetOffset = context.datasetIndex === 0 ? 0 : 160;
                        return datasetOffset + context.dataIndex * 70;
                    },
                    onComplete() {
                        if (initialAnimationInProgress) {
                            initialAnimationInProgress = false;
                            hasPlayedInitialAnimation = true;
                        }
                        shouldPlayInitialAnimation = false;
                        if (pendingMonthsAfterAnimation !== null) {
                            const monthsToApply = pendingMonthsAfterAnimation;
                            const animateNext = pendingAnimateAfterAnimation && !hasPlayedInitialAnimation;
                            pendingMonthsAfterAnimation = null;
                            pendingAnimateAfterAnimation = false;
                            window.requestAnimationFrame(() => {
                                triggerChartUpdate({ months: monthsToApply, animateInitial: animateNext });
                            });
                        }
                    }
                };

                if (!chartInstance) {
                    const context = chartCanvas.getContext('2d');
                    chartInstance = new Chart(context, {
                        type: 'bar',
                        data: {
                            labels,
                            datasets: [
                                {
                                    type: 'bar',
                                    label: currentLocale.revenueLegend,
                                    data: revenueValues,
                                    yAxisID: 'revenueScale',
                                    order: 1,
                                    backgroundColor: 'rgb(255, 184, 53)',
                                    borderColor: 'rgba(255, 184, 53, 0.65)',
                                    borderWidth: 0,
                                    borderRadius: 10,
                                    maxBarThickness: 36,
                                    hoverBackgroundColor: 'rgb(255, 107, 75)',
                                    hoverBorderColor: 'rgb(255, 107, 75)',
                                    hoverBorderWidth: 0
                                },
                                {
                                    type: 'line',
                                    label: currentLocale.priceLegend,
                                    data: priceValues,
                                    yAxisID: 'priceScale',
                                    order: 2,
                                    borderColor: 'rgb(255, 132, 88)',
                                    backgroundColor: 'rgb(255, 132, 88)',
                                    borderWidth: 3,
                                    pointRadius: 4,
                                    pointBackgroundColor: 'rgb(255, 132, 88)',
                                    pointBorderColor: 'rgb(255, 132, 88)',
                                    pointHoverRadius: 6,
                                    pointHoverBackgroundColor: 'rgb(255, 132, 88)',
                                    pointHoverBorderColor: 'rgb(255, 132, 88)',
                                    tension: 0.35,
                                    spanGaps: true
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: animationOptions,
                            datasets: {
                                bar: {
                                    order: 1
                                },
                                line: {
                                    order: 2
                                }
                            },
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            layout: {
                                padding: {
                                    top: 16,
                                    right: 8,
                                    bottom: 8,
                                    left: 8
                                }
                            },
                            animations: {
                                x: {
                                    duration: axisAnimationDuration,
                                    easing: 'easeOutQuart'
                                },
                                y: {
                                    duration: axisAnimationDuration,
                                    easing: 'easeOutQuart'
                                }
                            },
                            scales: {
                                revenueScale: {
                                    position: 'left',
                                    grid: {
                                        color: 'rgba(15, 23, 42, 0.08)',
                                        drawTicks: false
                                    },
                                    ticks: {
                                        callback(value) {
                                            return revenueFormatter.format(value);
                                        }
                                    },
                                    title: {
                                        display: true,
                                        text: currentLocale.revenueAxis,
                                        font: { weight: '600' }
                                    }
                                },
                                priceScale: {
                                    position: 'right',
                                    grid: {
                                        drawOnChartArea: false,
                                        drawTicks: false
                                    },
                                    ticks: {
                                        callback(value) {
                                            return priceFormatter.format(value);
                                        }
                                    },
                                    title: {
                                        display: true,
                                        text: currentLocale.priceAxis,
                                        font: { weight: '600' }
                                    }
                                },
                                x: {
                                    grid: {
                                        color: 'rgba(15, 23, 42, 0.06)',
                                        drawTicks: false
                                    },
                                    ticks: {
                                        maxRotation: 0,
                                        minRotation: 0,
                                        autoSkip: true,
                                        maxTicksLimit: 12
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    labels: {
                                        usePointStyle: true,
                                        padding: 16
                                    }
                                },
                                tooltip: {
                                    enabled: false,
                                    external: externalTooltipHandler
                                }
                            }
                        },
                        plugins: [lineOnTopPlugin]
                    });
                } else {
                    chartInstance.options.animation = animationOptions;
                    if (chartInstance.options.animations?.x) {
                        chartInstance.options.animations.x.duration = axisAnimationDuration;
                        chartInstance.options.animations.x.easing = 'easeOutQuart';
                    } else {
                        chartInstance.options.animations = chartInstance.options.animations || {};
                        chartInstance.options.animations.x = {
                            duration: axisAnimationDuration,
                            easing: 'easeOutQuart'
                        };
                    }
                    if (chartInstance.options.animations?.y) {
                        chartInstance.options.animations.y.duration = axisAnimationDuration;
                        chartInstance.options.animations.y.easing = 'easeOutQuart';
                    } else {
                        chartInstance.options.animations = chartInstance.options.animations || {};
                        chartInstance.options.animations.y = {
                            duration: axisAnimationDuration,
                            easing: 'easeOutQuart'
                        };
                    }
                    chartInstance.data.labels = labels;
                    chartInstance.data.datasets[0].data = revenueValues;
                    chartInstance.data.datasets[1].data = priceValues;
                    chartInstance.resize();
                    chartInstance.update();
                }
                if (tooltipElement) {
                    tooltipElement.style.opacity = '0';
                }
            }
        });
})();
