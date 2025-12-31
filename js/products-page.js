(function () {
    if (!document.body || document.body.dataset.page !== 'products') {
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var filterButtons = Array.from(document.querySelectorAll('.product-catalog__filter-list button'));
        var listContainer = document.querySelector('[data-catalog-list]');
        if (!listContainer) {
            return;
        }

        var activeFilterButton = filterButtons.find(function (btn) {
            return btn.classList.contains('active');
        });
        var activeFilter = activeFilterButton ? activeFilterButton.getAttribute('data-filter') : 'all';
        var productCards = [];

        filterButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                var selected = button.getAttribute('data-filter');
                if (selected === activeFilter) {
                    return;
                }
                filterButtons.forEach(function (btn) {
                    btn.classList.toggle('active', btn === button);
                });
                activeFilter = selected;
                applyFilter();
            });
        });

        function escapeHtml(value) {
            return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (char) {
                switch (char) {
                    case '&': return '&amp;';
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '"': return '&quot;';
                    case "'": return '&#39;';
                    default: return char;
                }
            });
        }

        function buildLocalizedSpanSet(labels) {
            return ['tw', 'cn', 'en', 'jp'].map(function (lang) {
                if (!labels[lang]) {
                    return '';
                }
                return '<span class="' + lang + '">' + escapeHtml(labels[lang]) + '</span>';
            }).join('');
        }

        var SERIES_SUFFIX_LABELS = {
            tw: ' 系列',
            cn: ' 系列',
            en: ' Series',
            jp: ' シリーズ'
        };

        function buildLocalizedSeriesTitle(rawTitle) {
            if (rawTitle === undefined || rawTitle === null) {
                return '';
            }
            var trimmed = String(rawTitle).trim();
            if (!trimmed) {
                return '';
            }
            var baseTitle = trimmed.replace(/\s*(系列|Series|シリーズ)$/i, '').trim();
            if (!baseTitle) {
                baseTitle = trimmed;
            }
            var labels = {};
            Object.keys(SERIES_SUFFIX_LABELS).forEach(function (lang) {
                var suffix = SERIES_SUFFIX_LABELS[lang] || '';
                labels[lang] = baseTitle + suffix;
            });
            return buildLocalizedSpanSet(labels);
        }

        function setStatusMessage(labels) {
            listContainer.innerHTML = '<p class="product-catalog__status">' + buildLocalizedSpanSet(labels) + '</p>';
        }

        function applyFilter() {
            if (!productCards.length) {
                return;
            }
            var animationDelayBase = 60;
            var visibleIndex = 0;
            productCards.forEach(function (card) {
                var category = card.getAttribute('data-category');
                var shouldShow = activeFilter === 'all' || category === activeFilter;
                if (shouldShow) {
                    card.style.display = '';
                    card.classList.remove('is-visible');
                    var delay = visibleIndex * animationDelayBase;
                    visibleIndex += 1;
                    setTimeout(function () {
                        card.classList.add('is-visible');
                    }, delay);
                } else {
                    card.style.display = 'none';
                    card.classList.remove('is-visible');
                }
            });
        }

        function splitCSVLine(line) {
            var result = [];
            var current = '';
            var inQuotes = false;
            for (var i = 0; i < line.length; i++) {
                var char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current);
            return result;
        }

        function parseCSV(text) {
            var lines = text.trim().split(/\r?\n/);
            if (!lines.length) {
                return [];
            }
            var headers = splitCSVLine(lines.shift());
            if (headers.length) {
                headers[0] = headers[0].replace(/^\ufeff/, '');
            }
            var rows = [];
            lines.forEach(function (line) {
                if (!line.trim()) {
                    return;
                }
                var cols = splitCSVLine(line);
                var record = {};
                headers.forEach(function (header, idx) {
                    record[header.trim()] = (cols[idx] || '').trim();
                });
                rows.push(record);
            });
            return rows;
        }

        function groupByMajor(records) {
            var order = [];
            var grouped = {};
            records.forEach(function (record) {
                // If '型號大項' is present, use it. Otherwise derive from '型號'.
                // Custom logic: if model contains hyphen (e.g. 6EQ-4), take the part before hyphen (6EQ).
                // Exception: if model is just letters and numbers, it might be the series itself.
                var model = record['型號'] || '';
                var major = record['型號大項'];

                if (!major && model) {
                    if (model.startsWith('9R')) {
                        major = '9R';
                    } else if (model.startsWith('7P')) {
                        major = '7P';
                    } else if (model.startsWith('6E') && !model.startsWith('6EQ')) {
                        major = '6E';
                    } else if (model.startsWith('N8')) {
                        major = 'N8';
                    } else {
                        var hyphenIndex = model.indexOf('-');
                        if (hyphenIndex > 0) {
                            major = model.substring(0, hyphenIndex);
                        } else {
                            major = model;
                        }
                    }
                }

                if (!major) {
                    major = model || 'Unknown';
                }

                if (!grouped[major]) {
                    grouped[major] = [];
                    order.push(major);
                }
                grouped[major].push(record);
            });
            return order.map(function (major) {
                return { major: major, rows: grouped[major] };
            });
        }

        function getValue(row, key) {
            var value = row[key];
            return value === undefined || value === null || value === '' ? '-' : value;
        }

        function appendUnit(value, csvKey) {
            if (!value || value === '-') {
                return value;
            }
            var trimmed = String(value);
            switch (csvKey) {
                case 'D50 (µm)':
                    return trimmed + (trimmed.includes('µm') ? '' : 'µm');
                case '振實密度 (g/cm³)':
                case '建議壓實密度 (g/cm³)':
                    if (trimmed.includes('g/ml')) {
                        trimmed = trimmed.replace(/g\/ml/g, 'g/cm³');
                    }
                    return trimmed + (trimmed.includes('g/cm³') ? '' : 'g/cm³');
                case '半電容量 (mAh/g)':
                    return trimmed + (trimmed.includes('mAh/g') ? '' : 'mAh/g');
                case '比表面積 (m²/g)':
                    return trimmed + (trimmed.includes('m²/g') ? '' : 'm²/g');
                case '半電首效 (%)':
                    return trimmed + (trimmed.includes('%') ? '' : '%');
                default:
                    return trimmed;
            }
        }

        var CATEGORY_CONFIG = {
            '人造石墨－儲能型': {
                key: 'artificial-storage',
                labels: { tw: '人造石墨－儲能型', cn: '人造石墨－储能型', en: 'Artificial Graphite - Energy Storage', jp: '人造黒鉛 - エネルギー貯蔵' }
            },
            '人造石墨－快充型': {
                key: 'artificial-fast',
                labels: { tw: '人造石墨－快充型', cn: '人造石墨－快充型', en: 'Artificial Graphite - Fast Charge', jp: '人造黒鉛 - 急速充電' }
            },
            '人造石墨－高能量型': {
                key: 'artificial-energy',
                labels: { tw: '人造石墨－高能量型', cn: '人造石墨－高能量型', en: 'Artificial Graphite - High Energy', jp: '人造黒鉛 - 高エネルギー' }
            },
            'MCMB': {
                key: 'mcmb',
                labels: { tw: 'MCMB', cn: 'MCMB', en: 'MCMB', jp: 'MCMB' }
            },
            '高性價比': {
                key: 'cost-effective',
                labels: { tw: '高性價比', cn: '高性价比', en: 'Cost Effective', jp: '高コストパフォーマンス' }
            },
            '天然石墨': {
                key: 'natural',
                labels: { tw: '天然石墨', cn: '天然石墨', en: 'Natural Graphite', jp: '天然黒鉛' }
            },
            '新型產品': {
                key: 'new-products',
                labels: { tw: '新型產品', cn: '新型产品', en: 'New Products', jp: '新製品' }
            }
        };

        var TABLE_COLUMNS = [
            {
                csvKey: '型號',
                headerHtml: buildLocalizedSpanSet({ tw: '型號', cn: '型号', en: 'Model', jp: '型番' }),
                labelHtml: buildLocalizedSpanSet({ tw: '型號', cn: '型号', en: 'Model', jp: '型番' }),
                cellClass: 'product-card__cell product-card__cell--model',
                headerClass: 'product-card__table-header product-card__table-header--model'
            },
            {
                csvKey: '結構',
                headerHtml: buildLocalizedSpanSet({ tw: '結構', cn: '结构', en: 'Structure', jp: '構造' }),
                labelHtml: buildLocalizedSpanSet({ tw: '結構', cn: '结构', en: 'Structure', jp: '構造' }),
                cellClass: 'product-card__cell',
                headerClass: 'product-card__table-header'
            },
            {
                csvKey: '焦/原料',
                headerHtml: buildLocalizedSpanSet({ tw: '焦/原料', cn: '焦/原料', en: 'Coke/Material', jp: 'コークス/原料' }),
                labelHtml: buildLocalizedSpanSet({ tw: '焦/原料', cn: '焦/原料', en: 'Coke/Material', jp: 'コークス/原料' }),
                cellClass: 'product-card__cell',
                headerClass: 'product-card__table-header'
            },
            {
                csvKey: '包覆',
                headerHtml: buildLocalizedSpanSet({ tw: '包覆', cn: '包覆', en: 'Coating', jp: 'コーティング' }),
                labelHtml: buildLocalizedSpanSet({ tw: '包覆', cn: '包覆', en: 'Coating', jp: 'コーティング' }),
                cellClass: 'product-card__cell',
                headerClass: 'product-card__table-header'
            },
            {
                csvKey: 'D50 (µm)',
                headerHtml: escapeHtml('D50'),
                labelHtml: buildLocalizedSpanSet({ tw: 'D50', cn: 'D50', en: 'D50', jp: 'D50' }),
                cellClass: 'product-card__cell product-card__cell--numeric',
                headerClass: 'product-card__table-header product-card__table-header--numeric'
            },
            {
                csvKey: '振實密度 (g/cm³)',
                headerHtml: buildLocalizedSpanSet({ tw: '振實密度', cn: '振实密度', en: 'Tap Density', jp: '振実密度' }),
                labelHtml: buildLocalizedSpanSet({ tw: '振實密度', cn: '振实密度', en: 'Tap Density', jp: '振実密度' }),
                cellClass: 'product-card__cell product-card__cell--numeric',
                headerClass: 'product-card__table-header product-card__table-header--numeric'
            },
            {
                csvKey: '比表面積 (m²/g)',
                headerHtml: buildLocalizedSpanSet({ tw: '比表面積', cn: '比表面积', en: 'Specific Surface Area', jp: '比表面積' }),
                labelHtml: buildLocalizedSpanSet({ tw: '比表面積', cn: '比表面积', en: 'Specific Surface Area', jp: '比表面積' }),
                cellClass: 'product-card__cell product-card__cell--numeric',
                headerClass: 'product-card__table-header product-card__table-header--numeric'
            },
            {
                csvKey: '半電容量 (mAh/g)',
                headerHtml: buildLocalizedSpanSet({ tw: '半電容量', cn: '半电容量', en: 'Half-Cell Capacity', jp: '半電容量' }),
                labelHtml: buildLocalizedSpanSet({ tw: '半電容量', cn: '半电容量', en: 'Half-Cell Capacity', jp: '半電容量' }),
                cellClass: 'product-card__cell product-card__cell--numeric',
                headerClass: 'product-card__table-header product-card__table-header--numeric'
            },
            {
                csvKey: '建議壓實密度 (g/cm³)',
                headerHtml: buildLocalizedSpanSet({ tw: '建議壓實', cn: '建议压实', en: 'Press Density', jp: '推奨プレス密度' }),
                labelHtml: buildLocalizedSpanSet({ tw: '建議壓實', cn: '建议压实', en: 'Press Density', jp: '推奨プレス密度' }),
                cellClass: 'product-card__cell product-card__cell--numeric',
                headerClass: 'product-card__table-header product-card__table-header--numeric'
            },
            {
                csvKey: '主要應用 / 備註',
                headerHtml: buildLocalizedSpanSet({ tw: '主要應用 / 備註', cn: '主要应用 / 备注', en: 'Application / Note', jp: '主な用途 / 備考' }),
                labelHtml: buildLocalizedSpanSet({ tw: '主要應用 / 備註', cn: '主要应用 / 备注', en: 'Application / Note', jp: '主な用途 / 備考' }),
                cellClass: 'product-card__cell',
                headerClass: 'product-card__table-header'
            }
        ];

        var TABLE_HEADER_HTML = '<thead><tr>' + TABLE_COLUMNS.map(function (column) {
            var headerClass = column.headerClass ? ' class="' + column.headerClass + '"' : '';
            return '<th' + headerClass + '>' + column.headerHtml + '</th>';
        }).join('') + '</tr></thead>';

        var CSV_URL = encodeURI('dist/products/榮炭產品型錄.csv');

        function renderCatalog(groups) {
            productCards = [];
            if (!groups.length) {
                setStatusMessage({
                    tw: '目前沒有可顯示的資料。',
                    cn: '目前没有可显示的资料。',
                    en: 'No data available.',
                    jp: '表示できるデータがありません。'
                });
                return;
            }

            listContainer.innerHTML = '';
            listContainer.classList.add('is-loading');

            groups.forEach(function (group) {
                var firstRow = group.rows[0] || {};
                var categoryCfg = CATEGORY_CONFIG[firstRow['產品類別']] || null;
                var categoryKey = categoryCfg ? categoryCfg.key : 'all';
                var fallbackText = (firstRow['產品類別'] || '其他').trim();
                var labels = categoryCfg ? categoryCfg.labels : {
                    tw: fallbackText,
                    cn: fallbackText,
                    en: fallbackText || 'Others',
                    jp: fallbackText || 'その他'
                };
                var card = document.createElement('article');
                card.className = 'product-card';
                card.setAttribute('data-category', categoryKey);

                var header = document.createElement('div');
                header.className = 'product-card__header';

                var headerText = document.createElement('div');

                var title = document.createElement('h3');
                title.className = 'product-card__title';
                var majorTitle = group.major || '';
                var localizedMajorTitle = buildLocalizedSeriesTitle(majorTitle);
                if (localizedMajorTitle) {
                    title.innerHTML = localizedMajorTitle;
                } else {
                    title.textContent = majorTitle;
                }
                headerText.appendChild(title);

                header.appendChild(headerText);

                var tag = document.createElement('span');
                tag.className = 'product-card__tag';
                tag.innerHTML = buildLocalizedSpanSet(labels);
                header.appendChild(tag);

                card.appendChild(header);

                var tableWrapper = document.createElement('div');
                tableWrapper.className = 'product-card__table-wrapper';

                var table = document.createElement('table');
                table.className = 'product-card__table';
                table.innerHTML = TABLE_HEADER_HTML;

                var tbody = document.createElement('tbody');
                group.rows.forEach(function (row) {
                    var tr = document.createElement('tr');
                    var rowHtml = TABLE_COLUMNS.map(function (column) {
                        var value = escapeHtml(appendUnit(getValue(row, column.csvKey), column.csvKey));
                        var cellClass = column.cellClass || 'product-card__cell';
                        return '<td class="' + cellClass + '"><span class="product-card__cell-label">' + column.labelHtml + '</span><span class="product-card__cell-value">' + value + '</span></td>';
                    }).join('');
                    tr.innerHTML = rowHtml;
                    tbody.appendChild(tr);
                });

                table.appendChild(tbody);
                tableWrapper.appendChild(table);
                card.appendChild(tableWrapper);

                listContainer.appendChild(card);
                productCards.push(card);
            });

            requestAnimationFrame(function () {
                listContainer.classList.remove('is-loading');
                applyFilter();
            });
        }

        function loadCatalog() {
            setStatusMessage({
                tw: '資料載入中...',
                cn: '资料载入中...',
                en: 'Loading catalog...',
                jp: 'カタログを読み込み中...'
            });

            fetch(CSV_URL, { cache: 'no-cache' })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then(function (text) {
                    var records = parseCSV(text);
                    var groups = groupByMajor(records);
                    renderCatalog(groups);
                })
                .catch(function (error) {
                    console.error('Failed to load product catalog:', error);
                    setStatusMessage({
                        tw: '無法載入產品資料，請稍後再試。',
                        cn: '无法载入产品资料，请稍后再试。',
                        en: 'Unable to load product data. Please try again later.',
                        jp: '製品データを読み込めませんでした。時間を置いて再度お試しください。'
                    });
                });
        }

        loadCatalog();
    });
})();
