(function () {
    'use strict';

    var CSV_PATH = 'dist/products/榮炭產品型錄.csv';
    var heatColumns = [
        '振實 (g/ml)',
        '比表 (m²/g)',
        '半電容量 (mAh/g)',
        '半電首效 (%)'
    ];
    var invertHeatColumns = new Set(['比表 (m²/g)']);
    var numericColumns = new Set([
        'D10 (µm)',
        'D50 (µm)',
        'D90 (µm)',
        '振實 (g/ml)',
        '比表 (m²/g)',
        '半電容量 (mAh/g)',
        '半電首效 (%)'
    ]);

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        var tbody = document.querySelector('[data-role="product-table-body"]');
        if (!tbody) return;

        fetch(CSV_PATH)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Failed to load CSV: ' + response.status + ' ' + response.statusText);
                }
                return response.text();
            })
            .then(function (text) {
                var parsed = parseCSV(text);
                if (!parsed.length) {
                    throw new Error('CSV is empty');
                }
                var headers = parsed.shift().map(function (cell) {
                    return cell.trim();
                });
                var rows = parsed
                    .filter(function (row) {
                        return row.some(function (cell) {
                            return cell.trim().length;
                        });
                    })
                    .map(function (row) {
                        return buildRowObject(headers, row);
                    });

                if (!rows.length) {
                    throw new Error('No data rows in CSV');
                }

                var stats = computeStats(rows);
                renderTable(tbody, headers, rows, stats);
            })
            .catch(function (error) {
                console.error(error);
                renderError(tbody, '資料載入失敗，請稍後再試。');
            });
    }

    function parseCSV(text) {
        var rows = [];
        var currentField = '';
        var currentRow = [];
        var insideQuotes = false;

        for (var i = 0; i < text.length; i++) {
            var char = text[i];
            var nextChar = text[i + 1];

            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    currentField += '"';
                    i += 1;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !insideQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    i += 1;
                }
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }

        if (currentField.length || currentRow.length) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        return rows;
    }

    function buildRowObject(headers, row) {
        var record = {};
        for (var i = 0; i < headers.length; i++) {
            var header = headers[i];
            var raw = (row[i] || '').trim();
            var numeric = null;
            if (raw) {
                var normalized = raw.replace(/,/g, '');
                var parsed = Number(normalized);
                if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
                    numeric = parsed;
                }
            }
            record[header] = {
                raw: raw,
                value: numeric
            };
        }
        return record;
    }

    function computeStats(rows) {
        var stats = {
            heat: {},
            particleRange: null
        };

        heatColumns.forEach(function (column) {
            var values = rows
                .map(function (row) {
                    return row[column] ? row[column].value : null;
                })
                .filter(isFiniteNumber);
            stats.heat[column] = buildRange(values);
        });

        var particleValues = [];
        ['D10 (µm)', 'D50 (µm)', 'D90 (µm)'].forEach(function (column) {
            rows.forEach(function (row) {
                var cell = row[column];
                if (cell && isFiniteNumber(cell.value)) {
                    particleValues.push(cell.value);
                }
            });
        });

        stats.particleRange = buildRange(particleValues);
        return stats;
    }

    function buildRange(values) {
        if (!values || !values.length) {
            return null;
        }
        var min = values[0];
        var max = values[0];
        for (var i = 1; i < values.length; i++) {
            var val = values[i];
            if (val < min) min = val;
            if (val > max) max = val;
        }
        return { min: min, max: max };
    }

    function renderTable(tbody, headers, rows, stats) {
        tbody.innerHTML = '';

        rows.forEach(function (row) {
            var tr = document.createElement('tr');
            var skip = 0;

            for (var i = 0; i < headers.length; i++) {
                if (skip > 0) {
                    skip -= 1;
                    continue;
                }

                var header = headers[i];
                var cellData = row[header] || { raw: '', value: null };

                if (header === 'D10 (µm)') {
                    var particleCell = document.createElement('td');
                    particleCell.classList.add('particle-cell', 'particle-span-cell');
                    particleCell.setAttribute('data-column', 'D10-D90');
                    particleCell.colSpan = 3;
                    renderParticleSpanCell(particleCell, row, stats.particleRange);
                    tr.appendChild(particleCell);
                    skip = 2; // Skip D50 and D90 columns because they are merged
                    continue;
                }

                var td = document.createElement('td');
                td.setAttribute('data-column', header);

                if (numericColumns.has(header)) {
                    td.classList.add('numeric');
                }

                if (!cellData.raw) {
                    td.setAttribute('data-empty', 'true');
                }

                if (heatColumns.indexOf(header) !== -1) {
                    td.classList.add('heatmap-cell');
                    renderHeatCell(td, cellData, stats.heat[header], invertHeatColumns.has(header));
                } else {
                    td.textContent = cellData.raw || '–';
                    if (!cellData.raw) {
                        td.classList.remove('numeric');
                        td.style.textAlign = 'center';
                    }
                }

                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        });

        if (!tbody.children.length) {
            renderError(tbody, '目前沒有可顯示的資料。');
        }
    }

    function renderHeatCell(td, cellData, range, invert) {
        var span = document.createElement('span');
        span.textContent = cellData.raw || '–';
        td.appendChild(span);

        if (!isFiniteNumber(cellData.value) || !range) {
            td.classList.remove('numeric');
            td.style.textAlign = 'center';
            td.removeAttribute('data-color');
            td.style.removeProperty('--heat-color');
            return;
        }

        var color = getHeatColor(cellData.value, range, invert);
        if (color) {
            td.dataset.color = 'true';
            td.style.setProperty('--heat-color', color);
            td.style.removeProperty('text-align');
        }
    }

    function renderParticleSpanCell(td, row, range) {
        var d10Cell = row['D10 (µm)'];
        var d50Cell = row['D50 (µm)'];
        var d90Cell = row['D90 (µm)'];
        td.classList.remove('numeric');
        td.style.textAlign = 'center';

        if (!range ||
            !d10Cell || !d50Cell || !d90Cell ||
            !isFiniteNumber(d10Cell.value) ||
            !isFiniteNumber(d50Cell.value) ||
            !isFiniteNumber(d90Cell.value)) {
            td.setAttribute('data-empty', 'true');
            td.textContent = d50Cell && d50Cell.raw ? d50Cell.raw + ' µm' : '–';
            return;
        }

        td.removeAttribute('data-empty');

        var chart = createParticleChart(
            d10Cell.value,
            d50Cell.value,
            d90Cell.value,
            range,
            {
                d10: d10Cell.raw,
                d50: d50Cell.raw,
                d90: d90Cell.raw
            }
        );
        td.appendChild(chart);

    }

    function createParticleChart(d10, d50, d90, range, rawValues) {
        var container = document.createElement('div');
        container.className = 'particle-chart';
        container.setAttribute('role', 'img');
        container.setAttribute('aria-label', [
            'D10 ' + d10,
            'D50 ' + d50,
            'D90 ' + d90
        ].join(', ') + ' µm');

        var min = range.min;
        var max = range.max;
        if (!isFiniteNumber(min) || !isFiniteNumber(max) || min === max) {
            min = Math.min(d10, d90);
            max = Math.max(d10, d90);
            if (min === max) {
                min = min - 0.5;
                max = max + 0.5;
            }
        }
        var scale = max - min;

        function toPercent(value) {
            var ratio = scale ? (value - min) / scale : 0.5;
            return clamp(Math.round(ratio * 10000) / 100, 0, 100);
        }

        var left = toPercent(d10);
        var middle = toPercent(d50);
        var right = toPercent(d90);
        var trackWidth = Math.max(right - left, 2);

        var track = document.createElement('div');
        track.className = 'particle-chart__track';
        track.style.left = left + '%';
        track.style.width = trackWidth + '%';

        var leftTick = document.createElement('div');
        leftTick.className = 'particle-chart__tick';
        leftTick.style.left = left + '%';

        var rightTick = document.createElement('div');
        rightTick.className = 'particle-chart__tick';
        rightTick.style.left = right + '%';

        var marker = document.createElement('div');
        marker.className = 'particle-chart__marker';
        marker.style.left = middle + '%';

        container.appendChild(track);
        container.appendChild(leftTick);
        container.appendChild(rightTick);
        container.appendChild(marker);

        var leftValue = document.createElement('span');
        leftValue.className = 'particle-chart__value particle-chart__value--left';
        leftValue.textContent = (rawValues && rawValues.d10 ? rawValues.d10 : d10) + ' µm';
        leftValue.style.left = left + '%';

        var middleValue = document.createElement('span');
        middleValue.className = 'particle-chart__value particle-chart__value--middle';
        middleValue.textContent = (rawValues && rawValues.d50 ? rawValues.d50 : d50) + ' µm';
        middleValue.style.left = middle + '%';

        var rightValue = document.createElement('span');
        rightValue.className = 'particle-chart__value particle-chart__value--right';
        rightValue.textContent = (rawValues && rawValues.d90 ? rawValues.d90 : d90) + ' µm';
        rightValue.style.left = right + '%';

        container.appendChild(leftValue);
        container.appendChild(middleValue);
        container.appendChild(rightValue);

        return container;
    }

    function getHeatColor(value, range, invert) {
        if (!range || !isFiniteNumber(range.min) || !isFiniteNumber(range.max)) {
            return null;
        }

        if (range.max === range.min) {
            return 'hsl(210 70% 65%)';
        }

        var ratio = (value - range.min) / (range.max - range.min);
        var clamped = clamp(ratio, 0, 1);
        if (invert) {
            clamped = 1 - clamped;
        }

        var lightness = 92 - clamped * 45;
        var saturation = 68;
        return 'hsl(210 ' + saturation + '% ' + lightness.toFixed(1) + '%)';
    }

    function renderError(tbody, message) {
        var headerCells = (tbody.parentElement && tbody.parentElement.querySelectorAll('thead th')) || [];
        var columnCount = headerCells.length || 1;
        tbody.innerHTML = '';
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        td.colSpan = columnCount;
        td.className = 'loading-cell';
        td.textContent = message;
        tr.appendChild(td);
        tbody.appendChild(tr);
    }

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function clamp(value, min, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
})();
