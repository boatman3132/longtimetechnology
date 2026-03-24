(function () {
    if (!document.body || document.body.dataset.page !== 'news-detail') {
        return;
    }

    (function () {
            var LANG_CODES = ['tw', 'cn', 'en', 'jp'];
            var DEFAULT_TAGS = {
                tw: ['行業新聞'],
                cn: ['行业新闻'],
                en: ['Industry News'],
                jp: ['業界ニュース']
            };
            var BACK_BUTTON_TEXT = {
                tw: '上一頁',
                cn: '返回上一页',
                en: 'Back',
                jp: '戻る'
            };

            var titleEl = document.getElementById('news-title');
            var dateEl = document.getElementById('news-date');
            var tagsEl = document.getElementById('news-tags');
            var coverEl = document.getElementById('news-cover');
            var contentEl = document.getElementById('news-content');
            var backButtonEl = document.getElementById('news-back-button');
            var params = new URLSearchParams(window.location.search);
            var slug = params.get('slug') || '';
            var escapeHelper = document.createElement('textarea');
            var SITE_ORIGIN = 'https://www.lttech.com.tw';
            var canonicalEl = document.getElementById('news-canonical');
            var descriptionEl = document.querySelector('meta[name="description"]');
            var ogTitleEl = document.querySelector('meta[property="og:title"]');
            var ogDescriptionEl = document.querySelector('meta[property="og:description"]');
            var ogUrlEl = document.querySelector('meta[property="og:url"]');
            var ogImageEl = document.getElementById('news-og-image');
            var ogImageAltEl = document.getElementById('news-og-image-alt');
            var twitterTitleEl = document.getElementById('news-twitter-title');
            var twitterDescriptionEl = document.getElementById('news-twitter-description');
            var twitterImageEl = document.getElementById('news-twitter-image');
            var twitterUrlEl = document.getElementById('news-twitter-url');

            var state = {
                meta: null,
                contentByLang: {},
                parser: null,
                fallbackMeta: null,
                slug: '',
                contentReady: false
            };

            var currentLang = detectCurrentLang();

            function detectCurrentLang() {
                var bodyClass = document.body.className || '';
                var match = bodyClass.match(/lang_(tw|cn|en|jp)/);
                return match ? match[1] : 'tw';
            }

            function cloneDefaultTags() {
                var result = {};
                LANG_CODES.forEach(function (lang) {
                    var defaults = DEFAULT_TAGS[lang] || [];
                    result[lang] = defaults.slice();
                });
                return result;
            }

            function cloneTagMap(source) {
                var clone = {};
                LANG_CODES.forEach(function (lang) {
                    var list = source && source[lang];
                    clone[lang] = Array.isArray(list) ? list.slice() : [];
                });
                return clone;
            }

            function showError(message) {
                titleEl.textContent = '消息內容載入失敗';
                dateEl.textContent = '';
                tagsEl.textContent = '';
                coverEl.innerHTML = '';
                contentEl.innerHTML = '<p class="news-error">' + escapeHtml(message) + '</p>';
            }

            function sanitizeSlug(value) {
                if (!value) return '';
                if (value.indexOf('..') !== -1 || /[\\\/]/.test(value)) {
                    return '';
                }
                return value;
            }

            function toAbsoluteUrl(path) {
                if (!path) return '';
                if (/^https?:\/\//i.test(path)) {
                    return path;
                }
                if (path.indexOf('//') === 0) {
                    return 'https:' + path;
                }
                if (path.indexOf('/') === 0) {
                    return SITE_ORIGIN + path;
                }
                return SITE_ORIGIN + '/' + path.replace(/^\.?\//, '');
            }

            function buildArticleUrl(articleSlug) {
                var safeSlug = sanitizeSlug(articleSlug) || '';
                if (!safeSlug) {
                    return SITE_ORIGIN + '/news/detail/';
                }
                return SITE_ORIGIN + '/news/detail/?slug=' + encodeURIComponent(safeSlug);
            }

            function deriveMeta(value) {
                var safeSlug = value || '';
                var datePart = safeSlug.slice(0, 10);
                var titlePart = safeSlug.slice(10).replace(/^[\s-_]+/, '');
                var dateValid = /^\d{4}-\d{2}-\d{2}$/.test(datePart);
                var fallbackTitle = titlePart || safeSlug;
                var titles = {};
                LANG_CODES.forEach(function (lang) {
                    titles[lang] = fallbackTitle;
                });
                var tagsByLang = cloneDefaultTags();
                return {
                    slug: safeSlug,
                    date: dateValid ? datePart : '',
                    title: fallbackTitle,
                    titles: titles,
                    tagsByLang: tagsByLang,
                    tags: tagsByLang.tw.slice(),
                    image: '',
                    images: [],
                    excerpts: {}
                };
            }

            function stripFrontMatter(source) {
                if (!source || source.indexOf('---') !== 0) {
                    return { content: source || '' };
                }
                var match = source.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]*/);
                if (!match) {
                    return { content: source };
                }
                var content = source.slice(match[0].length);
                return { content: content };
            }

            function extractLanguageSections(content) {
                var sections = {};
                if (!content) {
                    sections.tw = '';
                    return sections;
                }
                var pattern = /<!--\s*lang:([a-z]{2})\s*-->/gi;
                var match;
                var current = null;
                var lastIndex = 0;
                while ((match = pattern.exec(content)) !== null) {
                    var candidate = match[1].toLowerCase();
                    var segment = content.slice(lastIndex, match.index);
                    if (current) {
                        sections[current] = (sections[current] || '') + segment;
                    } else if (segment.trim()) {
                        sections.tw = (sections.tw || '') + segment;
                    }
                    current = LANG_CODES.indexOf(candidate) !== -1 ? candidate : null;
                    lastIndex = pattern.lastIndex;
                }
                var remainder = content.slice(lastIndex);
                if (current) {
                    sections[current] = (sections[current] || '') + remainder;
                } else if (remainder.trim()) {
                    sections.tw = (sections.tw || '') + remainder;
                }
                if (!Object.keys(sections).length) {
                    sections.tw = content;
                }
                Object.keys(sections).forEach(function (lang) {
                    if (LANG_CODES.indexOf(lang) === -1) {
                        delete sections[lang];
                        return;
                    }
                    sections[lang] = sections[lang].trim();
                });
                if (!sections.tw) {
                    var firstLang = Object.keys(sections)[0];
                    sections.tw = firstLang ? sections[firstLang] : '';
                }
                return sections;
            }

            function escapeHtml(value) {
                escapeHelper.textContent = value;
                return escapeHelper.innerHTML;
            }

            function escapeAttribute(value) {
                return escapeHtml(value).replace(/"/g, '&quot;');
            }

            function inlineMarkdown(text) {
                if (!text) return '';
                var pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
                var result = '';
                var lastIndex = 0;
                var match;
                while ((match = pattern.exec(text)) !== null) {
                    result += escapeHtml(text.slice(lastIndex, match.index));
                    if (match[2]) {
                        result += '<strong>' + escapeHtml(match[2]) + '</strong>';
                    } else if (match[3]) {
                        result += '<em>' + escapeHtml(match[3]) + '</em>';
                    } else if (match[4]) {
                        result += '<code>' + escapeHtml(match[4]) + '</code>';
                    } else if (match[5] && match[6]) {
                        var href = match[6].trim();
                        var safeHref = /^https?:\/\//i.test(href) || href.indexOf('/') === 0 || href.indexOf('#') === 0 ? href : '#';
                        result += '<a href="' + escapeAttribute(safeHref) + '">' + escapeHtml(match[5]) + '</a>';
                    }
                    lastIndex = match.index + match[0].length;
                }
                result += escapeHtml(text.slice(lastIndex));
                return result;
            }

            function fallbackParse(markdown) {
                var lines = (markdown || '').split(/\r?\n/);
                var html = [];
                var listBuffer = [];
                var paragraphBuffer = [];

                function flushList() {
                    if (!listBuffer.length) return;
                    html.push('<ul>' + listBuffer.join('') + '</ul>');
                    listBuffer = [];
                }

                function flushParagraph() {
                    if (!paragraphBuffer.length) return;
                    html.push('<p>' + inlineMarkdown(paragraphBuffer.join('<br>')) + '</p>');
                    paragraphBuffer = [];
                }

                lines.forEach(function (line) {
                    var trimmed = line.trim();
                    if (!trimmed) {
                        flushList();
                        flushParagraph();
                        return;
                    }

                    var headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
                    if (headingMatch) {
                        flushList();
                        flushParagraph();
                        var level = headingMatch[1].length;
                        html.push('<h' + level + '>' + inlineMarkdown(headingMatch[2]) + '</h' + level + '>');
                        return;
                    }

                    var listMatch = trimmed.match(/^[-*+]\s+(.*)$/);
                    if (listMatch) {
                        flushParagraph();
                        listBuffer.push('<li>' + inlineMarkdown(listMatch[1]) + '</li>');
                        return;
                    }

                    paragraphBuffer.push(trimmed);
                });

                flushList();
                flushParagraph();

                return html.join('\n');
            }

            function ensureMarked() {
                if (window.marked && typeof window.marked.parse === 'function') {
                    state.parser = window.marked;
                    return Promise.resolve(window.marked);
                }

                function loadScript(src) {
                    return new Promise(function (resolve, reject) {
                        var script = document.createElement('script');
                        script.src = src;
                        script.async = true;
                        script.onload = function () {
                            if (window.marked && typeof window.marked.parse === 'function') {
                                resolve(window.marked);
                            } else {
                                reject(new Error('Parser missing after loading ' + src));
                            }
                        };
                        script.onerror = function () {
                            reject(new Error('Failed to load script ' + src));
                        };
                        document.head.appendChild(script);
                    });
                }

                return loadScript('/js/vendor/marked.min.js')
                    .then(function (parser) {
                        state.parser = parser;
                        return parser;
                    })
                    .catch(function (error) {
                        console.warn(error);
                        window.marked = {
                            parse: fallbackParse
                        };
                        state.parser = window.marked;
                        return window.marked;
                    });
            }

            function formatDate(value) {
                if (!value) return '';
                var parts = value.split('-');
                if (parts.length !== 3) return value;
                return [parts[0], parts[1], parts[2]].join('.');
            }

            function pickLocalizedText(map, lang, fallback) {
                if (!map || typeof map !== 'object') {
                    return fallback || '';
                }
                return map[lang] || map.tw || map.cn || map.en || map.jp || fallback || '';
            }

            function pickLocalizedArray(map, lang, fallback) {
                var list = [];
                if (map && typeof map === 'object') {
                    list = Array.isArray(map[lang]) ? map[lang] : [];
                    if (!list.length) list = Array.isArray(map.tw) ? map.tw : list;
                    if (!list.length) list = Array.isArray(map.cn) ? map.cn : list;
                    if (!list.length) list = Array.isArray(map.en) ? map.en : list;
                    if (!list.length) list = Array.isArray(map.jp) ? map.jp : list;
                }
                if ((!list || !list.length) && Array.isArray(fallback)) {
                    list = fallback;
                }
                return list.slice();
            }

            function applyMeta(meta, lang) {
                var titleText = pickLocalizedText(meta.titles, lang, meta.title);
                titleEl.textContent = titleText;
                if (titleText) {
                    var detailBaseTitle = (typeof pageTitleTranslations !== 'undefined' && pageTitleTranslations['news-detail'])
                        ? (pageTitleTranslations['news-detail'][lang] || '')
                        : '';
                    if (detailBaseTitle) {
                        document.title = titleText + '|' + detailBaseTitle;
                    } else {
                        document.title = titleText;
                    }
                }
                dateEl.textContent = formatDate(meta.date || '');
                var tags = pickLocalizedArray(meta.tagsByLang, lang, meta.tags);
                tagsEl.textContent = tags.length ? tags.join('、') : '';

                var descriptionText = pickLocalizedText(meta.excerpts, lang, meta.excerpts ? meta.excerpts.tw : '');
                if (!descriptionText) {
                    var rawContent = state.contentByLang[lang] || state.contentByLang.tw || '';
                    if (rawContent) {
                        var sanitized = rawContent
                            .replace(/<!--[\s\S]*?-->/g, '')
                            .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
                            .replace(/[#>*_`]/g, '')
                            .replace(/\r?\n+/g, ' ');
                        sanitized = sanitized.replace(/\s+/g, ' ').trim();
                        if (sanitized.length > 160) {
                            descriptionText = sanitized.slice(0, 157) + '…';
                        } else {
                            descriptionText = sanitized;
                        }
                    }
                }
                if (!descriptionText) {
                    descriptionText = titleText || '榮炭科技最新消息';
                }

                if (descriptionEl) {
                    descriptionEl.setAttribute('content', descriptionText);
                }

                var articleUrl = buildArticleUrl(meta.slug);
                if (canonicalEl) {
                    canonicalEl.setAttribute('href', articleUrl);
                }
                if (ogUrlEl) {
                    ogUrlEl.setAttribute('content', articleUrl);
                }
                if (twitterUrlEl) {
                    twitterUrlEl.setAttribute('content', articleUrl);
                }

                if (ogTitleEl && titleText) {
                    ogTitleEl.setAttribute('content', titleText);
                }
                if (ogDescriptionEl) {
                    ogDescriptionEl.setAttribute('content', descriptionText);
                }

                var primaryImage = meta.image || '';
                if (!primaryImage && Array.isArray(meta.images) && meta.images.length) {
                    primaryImage = meta.images[0];
                }
                if (!primaryImage) {
                    primaryImage = 'dist/Website_Metadata_Images/ogimg.jpg';
                }
                var absoluteImage = toAbsoluteUrl(primaryImage);

                if (ogImageEl) {
                    ogImageEl.setAttribute('content', absoluteImage);
                }
                if (ogImageAltEl) {
                    ogImageAltEl.setAttribute('content', titleText || '榮炭科技最新消息');
                }
                if (twitterTitleEl && titleText) {
                    twitterTitleEl.setAttribute('content', titleText);
                }
                if (twitterDescriptionEl) {
                    twitterDescriptionEl.setAttribute('content', descriptionText);
                }
                if (twitterImageEl) {
                    twitterImageEl.setAttribute('content', absoluteImage);
                }

                coverEl.innerHTML = '';
                var coverImages = Array.isArray(meta.images) ? meta.images.slice() : [];
                if (!coverImages.length && meta.image) {
                    coverImages.push(meta.image);
                }
                coverEl.classList.toggle('has-multiple', coverImages.length > 1);
                coverEl.classList.toggle('single-image', coverImages.length === 1);
                coverImages.forEach(function (src) {
                    var img = document.createElement('img');
                    img.src = src;
                    img.alt = titleText;
                    coverEl.appendChild(img);
                });
            }

            function getContentForLang(lang) {
                var content = state.contentByLang[lang];
                if (content && content.trim()) {
                    return content;
                }
                if (lang !== 'tw') {
                    return state.contentByLang.tw || '';
                }
                return '';
            }

            function renderContent(markdown) {
                if (!state.parser || typeof state.parser.parse !== 'function') {
                    contentEl.innerHTML = '<p class="news-error">內容載入中…</p>';
                    return;
                }
                if (!state.contentReady) {
                    contentEl.innerHTML = '<p class="news-error">內容載入中…</p>';
                    return;
                }
                if (typeof state.parser.setOptions === 'function') {
                    state.parser.setOptions({ mangle: false, headerIds: false, breaks: true });
                }
                if (!markdown) {
                    contentEl.innerHTML = '<p class="news-error">此語言尚無內容。</p>';
                    return;
                }
                contentEl.innerHTML = state.parser.parse(markdown || '');
            }

            function renderArticle(lang) {
                if (!state.meta) return;
                applyMeta(state.meta, lang);
                var markdown = getContentForLang(lang);
                renderContent(markdown);
                updateBackButton(lang);
            }

            function updateBackButton(lang) {
                if (!backButtonEl) return;
                var label = BACK_BUTTON_TEXT[lang] || BACK_BUTTON_TEXT.tw || backButtonEl.textContent;
                backButtonEl.textContent = label;
            }

            function bindBackButton() {
                if (!backButtonEl) {
                    return;
                }
                backButtonEl.addEventListener('click', function (event) {
                    if (window.history.length > 1) {
                        event.preventDefault();
                        window.history.back();
                    }
                });
            }

            function loadIndex() {
                return fetch('dist/news-index.json', { cache: 'no-store' })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('Index request failed: ' + response.status);
                        }
                        return response.json();
                    })
                    .catch(function (error) {
                        console.warn('Unable to load news index.', error);
                        return null;
                    });
            }

            function loadMarkdown(path) {
                return fetch(path, { cache: 'no-store' })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('Markdown request failed: ' + response.status);
                        }
                        return response.text();
                    });
            }

            function mergeMeta(base, extra) {
                var result = {
                    slug: base.slug,
                    date: base.date,
                    title: base.title,
                    titles: Object.assign({}, base.titles),
                    tagsByLang: cloneTagMap(base.tagsByLang),
                    tags: base.tags.slice(),
                    image: base.image,
                    images: Array.isArray(base.images) ? base.images.slice() : [],
                    excerpts: Object.assign({}, base.excerpts || {})
                };

                function appendImage(list, value) {
                    if (!value) return;
                    if (list.indexOf(value) === -1) {
                        list.push(value);
                    }
                }

                if (!extra) {
                    if (result.image) {
                        appendImage(result.images, result.image);
                    } else if (result.images.length) {
                        result.image = result.images[0];
                    }
                    return result;
                }

                if (extra.date) {
                    result.date = extra.date;
                }
                if (extra.image) {
                    result.image = extra.image;
                    appendImage(result.images, extra.image);
                }
                if (Array.isArray(extra.images)) {
                    extra.images.forEach(function (value) {
                        if (typeof value === 'string' && value.trim()) {
                            appendImage(result.images, value.trim());
                        }
                    });
                }

                if (extra.titles && typeof extra.titles === 'object') {
                    Object.keys(extra.titles).forEach(function (key) {
                        var lang = key.toLowerCase();
                        if (LANG_CODES.indexOf(lang) === -1) return;
                        var value = extra.titles[key];
                        if (typeof value === 'string' && value.trim()) {
                            result.titles[lang] = value.trim();
                        }
                    });
                } else if (extra.title && typeof extra.title === 'string') {
                    var trimmed = extra.title.trim();
                    if (trimmed) {
                        LANG_CODES.forEach(function (lang) {
                            if (!result.titles[lang]) {
                                result.titles[lang] = trimmed;
                            }
                        });
                        result.title = trimmed;
                    }
                }

                if (extra.tagsByLang && typeof extra.tagsByLang === 'object') {
                    LANG_CODES.forEach(function (lang) {
                        var tags = extra.tagsByLang[lang];
                        if (Array.isArray(tags) && tags.length) {
                            result.tagsByLang[lang] = tags.slice();
                        }
                    });
                } else if (Array.isArray(extra.tags) && extra.tags.length) {
                    LANG_CODES.forEach(function (lang) {
                        result.tagsByLang[lang] = extra.tags.slice();
                    });
                }

                if (extra.excerpts && typeof extra.excerpts === 'object') {
                    Object.keys(extra.excerpts).forEach(function (key) {
                        var lang = key.toLowerCase();
                        if (LANG_CODES.indexOf(lang) === -1) return;
                        var value = extra.excerpts[key];
                        if (typeof value === 'string' && value.trim()) {
                            result.excerpts[lang] = value.trim();
                        }
                    });
                } else if (extra.excerpt && typeof extra.excerpt === 'string') {
                    result.excerpts.tw = extra.excerpt;
                }

                result.title = result.titles.tw || result.title || base.title;
                result.tags = Array.isArray(result.tagsByLang.tw) ? result.tagsByLang.tw.slice() : [];
                if (result.image) {
                    appendImage(result.images, result.image);
                }
                if (!result.image && result.images.length) {
                    result.image = result.images[0];
                }
                return result;
            }

            function hookLanguageSwitcher() {
                if (typeof window.lang_set !== 'function') {
                    return;
                }
                if (window.__newsDetailLangWrapped) {
                    return;
                }
                var originalLangSet = window.lang_set;
                window.lang_set = function (lang) {
                    originalLangSet(lang);
                    currentLang = lang;
                    renderArticle(currentLang);
                };
                window.__newsDetailLangWrapped = true;
            }

            function init() {
                bindBackButton();
                var safeSlug = sanitizeSlug(slug);
                if (!safeSlug) {
                    showError('指定的消息網址有誤。');
                    return;
                }
                state.slug = safeSlug;
                state.fallbackMeta = deriveMeta(safeSlug);
                state.meta = state.fallbackMeta;
                state.meta = state.fallbackMeta;
                applyMeta(state.meta, currentLang);
                updateBackButton(currentLang);
                contentEl.innerHTML = '<p class="news-error">內容載入中…</p>';

                var encodedSlug = encodeURIComponent(safeSlug);
                var markdownPath = 'news/' + encodedSlug + '.md';

                hookLanguageSwitcher();

                Promise.all([
                    ensureMarked(),
                    loadIndex(),
                    loadMarkdown(markdownPath)
                ])
                    .then(function (results) {
                        var indexData = results[1];
                        var markdownRaw = results[2];
                        var metaFromIndex = null;
                        if (Array.isArray(indexData)) {
                            metaFromIndex = indexData.find(function (item) {
                                return item && item.slug === safeSlug;
                            }) || null;
                        }
                        var stripped = stripFrontMatter(markdownRaw);
                        state.contentByLang = extractLanguageSections(stripped.content);
                        state.contentReady = true;
                        state.meta = mergeMeta(state.fallbackMeta, metaFromIndex);
                        renderArticle(currentLang);
                    })
                    .catch(function (error) {
                        console.error(error);
                        showError('無法讀取指定的消息內容。');
                    });
            }

            init();
    })();
})();
