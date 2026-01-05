// dist/js/language-switcher.js

// 1. 建立 Header 的翻譯字典
const headerTranslations = {
    'menu_about':    { tw: '關於LTT', cn: '关于LTT', en: 'About Us', jp: '会社概要' },
    'submenu_about_intro': { tw: '榮炭介紹', cn: '荣炭介绍', en: 'About Atrans', jp: '会社紹介' },
    'esg':   { tw: 'ESG永續', cn: 'ESG永续', en: 'ESG', jp: 'ESG' },
    'menu_products':     { tw: '產品介紹', cn: '产品介绍', en: 'Products', jp: '産品内容' },

    'menu_service':  { tw: '服務內容', cn: '服务内容', en: 'Service', jp: 'サービス内容' },
    'menu_quality':  { tw: '品質與環境', cn: '质量与环境', en: 'Quality', jp: '品質・環境' },
    'submenu_quality_intro': { tw: '品質介紹', cn: '质量介绍', en: 'Quality', jp: '品質紹介' },
    'submenu_quality_equipment': { tw: '設備介紹', cn: '设备介绍', en: 'Equipment', jp: '設備紹介' },
    'menu_news':     { tw: '最新消息', cn: '最新资讯', en: 'News', jp: 'お知らせ' },
    'menu_investors':{ tw: '投資人專區', cn: '投资者专区', en: 'Investor', jp: '投資家向け情報' },
    'menu_recruit':  { tw: '人才招募', cn: '招聘信息', en: 'Careers', jp: '採用情報' },
    'menu_contact':  { tw: '聯絡我們', cn: '联系我们', en: 'Contact', jp: 'お問合せ' },
    'menu_language': { tw: 'Language', cn: 'Language', en: 'Language', jp: 'Language' },
};

// 2. 建立頁籤（document.title）的翻譯字典
const pageTitleTranslations = {
    index: {
        tw: '榮炭科技股份有限公司',
        cn: '荣炭科技股份有限公司',
        en: 'Long Time Technology Co., Ltd.',
        jp: '栄炭科技株式会社',
    },
    about: {
        tw: '關於榮炭｜榮炭科技',
        cn: '关于荣炭｜荣炭科技',
        en: 'About Us｜Long Time Technology',
        jp: '会社概要｜栄炭科技',
    },
    products: {
        tw: '產品介紹｜榮炭科技',
        cn: '产品介绍｜荣炭科技',
        en: 'Products｜Long Time Technology',
        jp: '製品紹介｜栄炭科技',
    },
    service: {
        tw: '服務內容｜榮炭科技',
        cn: '服务内容｜荣炭科技',
        en: 'Service｜Long Time Technology',
        jp: 'サービス内容｜栄炭科技',
    },
    quality: {
        tw: '品質與環境｜榮炭科技',
        cn: '质量与环境｜荣炭科技',
        en: 'Quality｜Long Time Technology',
        jp: '品質・環境｜栄炭科技',
    },
    equipment: {
        tw: '設備介紹｜榮炭科技',
        cn: '设备介绍｜荣炭科技',
        en: 'Equipment｜Long Time Technology',
        jp: '設備紹介｜栄炭科技',
    },
    news: {
        tw: '最新消息｜榮炭科技',
        cn: '最新资讯｜荣炭科技',
        en: 'News｜Long Time Technology',
        jp: 'お知らせ｜栄炭科技',
    },
    'news-detail': {
        tw: '最新消息內容｜榮炭科技',
        cn: '最新资讯内容｜荣炭科技',
        en: 'News Detail｜Long Time Technology',
        jp: 'お知らせ詳細｜栄炭科技',
    },
    esg: {
        tw: 'ESG永續｜榮炭科技',
        cn: 'ESG永续｜荣炭科技',
        en: 'ESG｜Long Time Technology',
        jp: 'ESG｜栄炭科技',
    },
    investors: {
        tw: '投資人專區｜榮炭科技',
        cn: '投资者专区｜荣炭科技',
        en: 'Investor Relations｜Long Time Technology',
        jp: '投資家向け情報｜栄炭科技',
    },
    recruit: {
        tw: '人才招募｜榮炭科技',
        cn: '招聘信息｜荣炭科技',
        en: 'Careers｜Long Time Technology',
        jp: '採用情報｜栄炭科技',
    },
    contact: {
        tw: '聯絡我們｜榮炭科技',
        cn: '联系我们｜荣炭科技',
        en: 'Contact Us｜Long Time Technology',
        jp: 'お問合せ｜栄炭科技',
    },
    error: {
        tw: '找不到頁面｜榮炭科技',
        cn: '找不到页面｜荣炭科技',
        en: 'Page Not Found｜Long Time Technology',
        jp: 'ページが見つかりません｜栄炭科技',
    },
};

/**
 * 更新 Header 中所有帶有 data-lang-key 屬性的文字
 * @param {string} lang - 目標語言 ('tw', 'cn', 'en', 'jp')
 */
function updateHeaderText(lang) {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        // 尋找元素內部的 <span> 來更新文字
        const span = element.querySelector('span');
        if (span && headerTranslations[key] && headerTranslations[key][lang]) {
            span.innerText = headerTranslations[key][lang];
        }
    });
}

/**
 * 更新具備多語 placeholder 的輸入欄位
 * @param {string} lang - 目標語言 ('tw', 'cn', 'en', 'jp')
 */
function updatePlaceholders(lang) {
    const attribute = `data-placeholder-${lang}`;
    document.querySelectorAll('[data-placeholder-tw]').forEach(element => {
        const translatedPlaceholder = element.getAttribute(attribute);
        const fallbackPlaceholder = element.getAttribute('data-placeholder-tw') || '';
        element.setAttribute('placeholder', translatedPlaceholder || fallbackPlaceholder);
    });
}

/**
 * 將語系同步到需要的表單或其他元素
 * @param {string} lang - 目標語言 ('tw', 'cn', 'en', 'jp')
 */
function syncLanguageAttributes(lang) {
    document.querySelectorAll('[data-sync-lang]').forEach(element => {
        if (element.tagName === 'FORM') {
            const baseAction = element.dataset.baseAction || element.getAttribute('action') || '';
            if (!element.dataset.baseAction && baseAction) {
                element.dataset.baseAction = baseAction;
            }

            if (element.dataset.baseAction) {
                const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(element.dataset.baseAction);
                const url = isAbsolute ? new URL(element.dataset.baseAction) : new URL(element.dataset.baseAction, window.location.origin);
                url.searchParams.set('lang', lang);
                const nextAction = isAbsolute ? url.toString() : `${url.pathname}${url.search}`;
                element.setAttribute('action', nextAction);
            }

            const langInput = element.querySelector('input[name="lang"]');
            if (langInput) {
                langInput.value = lang;
            }
        } else {
            element.setAttribute('data-current-lang', lang);
        }
    });
}

/**
 * 更新站內主要導覽與頁尾連結的語言參數
 * @param {string} lang - 目標語言 ('tw', 'cn', 'en', 'jp')
 */
function updateLanguageLinks(lang) {
    if (typeof document === 'undefined') {
        return;
    }

    const selectors = [
        'a.langUrl',
        'nav .mmenu a:not(.hasmenu)',
        'footer .sitemap a'
    ];
    const links = document.querySelectorAll(selectors.join(', '));
    if (!links.length) {
        return;
    }

    links.forEach(link => {
        const href = (link.getAttribute('href') || '').trim();
        if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:')) {
            return;
        }

        try {
            const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);
            const url = isAbsolute ? new URL(href) : new URL(href, window.location.origin);
            url.searchParams.set('lang', lang);
            const nextHref = isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
            link.setAttribute('href', nextHref);
        } catch (error) {
            console.warn('language-switcher: unable to update link URL', href, error);
        }
    });
}

/**
 * 根據目前頁面與語言更新瀏覽器標籤標題
 * @param {string} lang - 目標語言 ('tw', 'cn', 'en', 'jp')
 */
function updatePageTitle(lang) {
    const pageKey = document.body.dataset.page || 'index';
    const translations = pageTitleTranslations[pageKey];
    if (translations && translations[lang]) {
        document.title = translations[lang];
    }
}

/**
 * 設置網站語言的函數
 * @param {string} lang - 要設置的語言 ('tw', 'cn', 'en', 'jp')
 */
function lang_set(lang) {
    if (typeof lang === 'string') {
        lang = lang.toLowerCase();
    }
    // 更新 <body> class 以切換頁面主要內容
    document.body.classList.remove('lang_tw', 'lang_cn', 'lang_en', 'lang_jp');
    document.body.classList.add('lang_' + lang);

    const htmlLangMap = {
        tw: 'zh-Hant-TW',
        cn: 'zh-Hans-CN',
        en: 'en',
        jp: 'ja',
    };
    document.documentElement.setAttribute('lang', htmlLangMap[lang] || 'zh-Hant-TW');

    // 更新 Header 的文字
    updateHeaderText(lang);

    // 更新頁籤標題
    updatePageTitle(lang);

    // 更新表單 placeholder
    updatePlaceholders(lang);

    // 同步語系設定至需要的元素
    syncLanguageAttributes(lang);

    // 更新語言按鈕的 'active' 狀態
    document.querySelectorAll('.langbtngroup .langbtn').forEach(btn => {
        const code = (btn.dataset.langCode || '').toLowerCase();
        const isActive = code === lang;
        btn.classList.toggle('active', isActive);
        if (isActive) {
            btn.setAttribute('aria-current', 'true');
        } else {
            btn.removeAttribute('aria-current');
        }
    });
    
    // 將選擇的語言存儲起來
    localStorage.setItem('preferredLanguage', lang);

    if (typeof window !== 'undefined') {
        window.lang = lang;
        if (typeof updateLanguageLinks === 'function') {
            updateLanguageLinks(lang);
        }
    }
}

// 當頁面加載時，自動應用已保存的語言設定
document.addEventListener('DOMContentLoaded', function() {
    const supportedLanguages = ['tw', 'cn', 'en', 'jp'];
    const savedLang = (localStorage.getItem('preferredLanguage') || '').toLowerCase();
    const queryLang = new URLSearchParams(window.location.search).get('lang');
    const normalizedQueryLang = queryLang ? queryLang.toLowerCase() : '';
    const pathLang = window.location.pathname
        .toLowerCase()
        .split('/')
        .filter(Boolean)[0];

    let currentLang = 'tw';

    if (normalizedQueryLang && supportedLanguages.includes(normalizedQueryLang)) {
        currentLang = normalizedQueryLang;
    } else if (pathLang && supportedLanguages.includes(pathLang)) {
        // Allow URLs like /en or /en/about to force the initial language.
        currentLang = pathLang;
    } else if (savedLang && supportedLanguages.includes(savedLang)) {
        currentLang = savedLang;
    }

    const applyLanguage = function () {
        lang_set(currentLang);
    };
    applyLanguage();
    if (typeof window.onLayoutReady === 'function') {
        window.onLayoutReady(applyLanguage);
    }
});

document.addEventListener('click', function (event) {
    const button = event.target.closest('.langbtn');
    if (!button) {
        return;
    }
    const langCode = (button.dataset.langCode || '').toLowerCase();
    if (!langCode) {
        return;
    }
    event.preventDefault();
    lang_set(langCode);
});
