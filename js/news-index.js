(function () {
    if (!document.body || document.body.dataset.page !== 'news') {
        return;
    }

    (function () {
        var newsList = document.getElementById('news-list');
            if (!newsList) return;

            var newsData = [];
            var currentLang = detectCurrentLang();
            var filterList = document.querySelector('.item_menu_list');
            var filterItems = [];
            var activeFilterItem = null;
            var activeFilterKey = 'all';
            var filterTagLookup = Object.create(null);

            var EMPTY_MESSAGES = {
                tw: '目前沒有符合條件的消息',
                cn: '目前没有符合条件的消息',
                en: 'No news items match the selected filter right now.',
                jp: '現在、条件に合致するお知らせはありません。'
            };

            function detectCurrentLang() {
                var bodyClass = document.body.className || '';
                var match = bodyClass.match(/lang_(tw|cn|en|jp)/);
                if (match) {
                    return match[1];
                }
                return 'tw';
            }

            function formatDate(value) {
                if (typeof value !== 'string') return '';
                var parts = value.split('-');
                if (parts.length !== 3) return value;
                return [parts[0], parts[1], parts[2]].join('.');
            }

            function pickLocalizedText(map, fallback) {
                if (!map || typeof map !== 'object') {
                    return fallback || '';
                }
                return map[currentLang] || map.tw || map.cn || map.en || map.jp || fallback || '';
            }

            function pickLocalizedArray(map, fallback) {
                var list = [];
                if (map && typeof map === 'object') {
                    list = Array.isArray(map[currentLang]) ? map[currentLang] : [];
                    if (!list.length) {
                        list = Array.isArray(map.tw) ? map.tw : list;
                    }
                    if (!list.length) {
                        list = Array.isArray(map.cn) ? map.cn : list;
                    }
                    if (!list.length) {
                        list = Array.isArray(map.en) ? map.en : list;
                    }
                    if (!list.length) {
                        list = Array.isArray(map.jp) ? map.jp : list;
                    }
                }
                if ((!list || !list.length) && Array.isArray(fallback)) {
                    list = fallback;
                }
                return list.slice();
            }

            function renderError(message) {
                newsList.innerHTML = '';
                var error = document.createElement('div');
                error.className = 'news-empty';
                error.textContent = message;
                newsList.appendChild(error);
            }

            function renderEmptyState(messageMap, fallback) {
                var message = pickLocalizedText(messageMap, fallback || '');
                if (!message) {
                    message = '目前無法載入最新消息';
                }
                renderError(message);
            }

            function renderNews(items) {
                if (!Array.isArray(items) || !items.length) {
                    renderEmptyState(EMPTY_MESSAGES, '目前無法載入最新消息');
                    return;
                }
                newsList.innerHTML = '';
                var fragment = document.createDocumentFragment();
                items.forEach(function (item) {
                    if (!item || !item.permalink) return;
                    var link = document.createElement('a');
                    link.className = 'langUrl';
                    link.href = item.permalink;
                    link.setAttribute('data-slug', item.slug || '');

                    var thumb = document.createElement('div');
                    thumb.className = 'news-thumb';
                    if (item.image) {
                        var thumbImg = document.createElement('img');
                        thumbImg.src = item.image;
                        thumbImg.alt = pickLocalizedText(item.titles, item.title);
                        thumb.appendChild(thumbImg);
                    } else {
                        thumb.classList.add('is-empty');
                    }
                    link.appendChild(thumb);

                    var date = document.createElement('div');
                    date.className = 'mdate';
                    date.textContent = formatDate(item.date || '');
                    link.appendChild(date);

                    var tag = document.createElement('div');
                    tag.className = 'mtag';
                    var tags = pickLocalizedArray(item.tagsByLang, item.tags);
                    tag.textContent = tags.length ? tags.join('、') : '';
                    link.appendChild(tag);

                    var content = document.createElement('div');
                    content.className = 'news-content';

                    var title = document.createElement('div');
                    title.className = 'mtitle';
                    title.textContent = pickLocalizedText(item.titles, item.title);
                    content.appendChild(title);

                    link.appendChild(content);

                    var arrow = document.createElement('img');
                    arrow.src = 'dist/share/arrow.svg';
                    arrow.className = 'svg';
                    arrow.alt = '';
                    link.appendChild(arrow);

                    fragment.appendChild(link);
                });
                if (!fragment.childNodes.length) {
                    renderEmptyState(EMPTY_MESSAGES, '目前無法載入最新消息');
                    return;
                }
                newsList.appendChild(fragment);
            }

            function buildFilterTagLookup(items) {
                var lookup = Object.create(null);
                if (!Array.isArray(items)) {
                    return lookup;
                }
                items.forEach(function (item) {
                    if (!item || !item.dataset) return;
                    var key = (item.dataset.filterKey || '').trim().toLowerCase();
                    if (!key || key === 'all') return;
                    ['filterTagTw', 'filterTagCn', 'filterTagEn', 'filterTagJp'].forEach(function (attr) {
                        var value = item.dataset[attr];
                        if (!value) return;
                        lookup[value.trim().toLowerCase()] = key;
                    });
                });
                return lookup;
            }

            function getItemFilterKeys(item) {
                if (!item) return [];
                if (Array.isArray(item._filterKeys)) {
                    return item._filterKeys;
                }
                var tags = [];
                if (Array.isArray(item.tags)) {
                    tags = tags.concat(item.tags);
                }
                if (item.tagsByLang && typeof item.tagsByLang === 'object') {
                    Object.keys(item.tagsByLang).forEach(function (lang) {
                        var list = item.tagsByLang[lang];
                        if (Array.isArray(list)) {
                            tags = tags.concat(list);
                        }
                    });
                }
                if (!tags.length) {
                    item._filterKeys = [];
                    return item._filterKeys;
                }
                var keys = [];
                var seen = Object.create(null);
                tags.forEach(function (tag) {
                    if (!tag) return;
                    var normalized = tag.trim().toLowerCase();
                    var key = filterTagLookup[normalized];
                    if (!key || seen[key]) return;
                    seen[key] = true;
                    keys.push(key);
                });
                item._filterKeys = keys;
                return keys;
            }

            function filterNewsByActiveTag() {
                var key = (activeFilterKey || '').trim().toLowerCase();
                if (!key || key === 'all') {
                    return newsData.slice();
                }
                return newsData.filter(function (item) {
                    var keys = getItemFilterKeys(item);
                    return keys.indexOf(key) !== -1;
                });
            }

            function rerender() {
                if (!newsData.length) return;
                var items = filterNewsByActiveTag();
                renderNews(items);
            }

            function hookLanguageSwitcher() {
                if (typeof window.lang_set !== 'function') return;
                if (window.__newsLangWrapped) return;
                var originalLangSet = window.lang_set;
                window.lang_set = function (lang) {
                    originalLangSet(lang);
                    currentLang = lang;
                    rerender();
                };
                window.__newsLangWrapped = true;
            }

            function clearActiveFilter() {
                filterItems.forEach(function (item) {
                    item.classList.remove('active');
                });
            }

            function updateActiveFilter(item) {
                if (!item) return;
                clearActiveFilter();
                item.classList.add('active');
                activeFilterItem = item;
                activeFilterKey = (item.dataset.filterKey || '').trim().toLowerCase() || 'all';
                rerender();
            }

            function initializeFilters() {
                if (!filterList) return;
                filterItems = Array.prototype.slice.call(filterList.querySelectorAll('li'));
                if (!filterItems.length) return;
                filterTagLookup = buildFilterTagLookup(filterItems) || Object.create(null);
                var defaultActive = filterItems.find(function (item) {
                    return item.classList.contains('active');
                }) || filterItems[0];
                activeFilterItem = defaultActive;
                activeFilterKey = (defaultActive.dataset.filterKey || '').trim().toLowerCase() || 'all';
                filterList.addEventListener('click', function (event) {
                    var target = event.target;
                    while (target && target !== filterList && target.tagName !== 'LI') {
                        target = target.parentElement;
                    }
                    if (!target || target === filterList) return;
                    var link = target.querySelector('a');
                    if (link) {
                        event.preventDefault();
                    }
                    if (target === activeFilterItem) return;
                    updateActiveFilter(target);
                });
            }

            initializeFilters();

            fetch('dist/news-index.json', { cache: 'no-store' })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error('Failed to load news index: ' + response.status);
                    }
                    return response.json();
                })
                .then(function (data) {
                    if (!Array.isArray(data)) {
                        throw new Error('Invalid news index format');
                    }
                    newsData = data;
                    rerender();
                    hookLanguageSwitcher();
                })
                .catch(function (error) {
                    console.error(error);
                    renderError('目前無法載入最新消息');
                });
            hookLanguageSwitcher();
    })();

    window.setTimeout(function () {
        if (typeof slider_ul_list === 'function') {
            slider_ul_list('topmenu1');
        }
    }, 600);
})();
