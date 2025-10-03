// dist/js/language-switcher.js

// 1. 建立 Header 的翻譯字典
const headerTranslations = {
    'menu_about':    { tw: '關於榮炭', en: 'ABOUT US', jp: '会社概要' },
    'submenu_about_intro': { tw: '榮炭介紹', en: 'About Atrans', jp: '会社紹介' },
    'submenu_about_cmp':   { tw: '勤美集團', en: 'CMP Group', jp: '勤美グループ' },
    'submenu_about_esg':   { tw: 'ESG永續', en: 'ESG', jp: 'ESG' },
    'menu_products':     { tw: '產品介紹', en: 'Products', jp: '産品内容' },

    'menu_service':  { tw: '服務內容', en: 'SERVICE', jp: 'サービス内容' },
    'menu_quality':  { tw: '品質與環境', en: 'QUALITY', jp: '品質・環境' },
    'submenu_quality_intro': { tw: '品質介紹', en: 'Quality', jp: '品質紹介' },
    'submenu_quality_equipment': { tw: '設備介紹', en: 'Equipment', jp: '設備紹介' },
    'menu_news':     { tw: '最新消息', en: 'NEWS', jp: 'お知らせ' },
    'menu_investors':{ tw: '投資人專區', en: 'INVESTORS', jp: '投資家向け情報' },
    'menu_recruit':  { tw: '徵才情報', en: 'CAREERS', jp: '採用情報' },
    'menu_contact':  { tw: '聯絡我們', en: 'CONTACT', jp: 'お問合せ' },
    'menu_language': { tw: 'Language', en: 'Language', jp: 'Language' },
};

// 2. 建立頁籤（document.title）的翻譯字典
const pageTitleTranslations = {
    about: {
        tw: '榮炭介紹 | 榮炭科技股份有限公司',
        en: 'About Us | Long Time Technology Co., Ltd.',
        jp: '会社概要 | 栄炭科技株式会社',
    },
    service: {
        tw: '服務內容 | 榮炭科技股份有限公司',
        en: 'Service | Long Time Technology Co., Ltd.',
        jp: 'サービス内容 | 栄炭科技株式会社',
    },
    products: {
        tw: '產品介紹 | 榮炭科技股份有限公司',
        en: 'Products | Long Time Technology Co., Ltd.',
        jp: '産品内容 | 栄炭科技株式会社',
    },
    quality: {
        tw: '品質與環境 | 榮炭科技股份有限公司',
        en: 'Quality | Long Time Technology Co., Ltd.',
        jp: '品質・環境 | 栄炭科技株式会社',
    },
    news: {
        tw: '最新消息 | 榮炭科技股份有限公司',
        en: 'News | Long Time Technology Co., Ltd.',
        jp: 'お知らせ | 栄炭科技株式会社',
    },
    investors: {
        tw: '投資人專區 | 榮炭科技股份有限公司',
        en: 'Investor Relations | Long Time Technology Co., Ltd.',
        jp: '投資家向け情報 | 栄炭科技株式会社',
    },
    recruit: {
        tw: '徵才情報 | 榮炭科技股份有限公司',
        en: 'Careers | Long Time Technology Co., Ltd.',
        jp: '採用情報 | 栄炭科技株式会社',
    },
    contact: {
        tw: '聯絡我們 | 榮炭科技股份有限公司',
        en: 'Contact Us | Long Time Technology Co., Ltd.',
        jp: 'お問合せ | 栄炭科技株式会社',
    },
    index: {
        tw: '榮炭科技股份有限公司',
        en: 'Long Time Technology Co., Ltd.',
        jp: '栄炭科技株式会社',
    },
};

/**
 * 更新 Header 中所有帶有 data-lang-key 屬性的文字
 * @param {string} lang - 目標語言 ('tw', 'en', 'jp')
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
 * @param {string} lang - 目標語言 ('tw', 'en', 'jp')
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
 * @param {string} lang - 目標語言 ('tw', 'en', 'jp')
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
 * 根據目前頁面與語言更新瀏覽器標籤標題
 * @param {string} lang - 目標語言 ('tw', 'en', 'jp')
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
 * @param {string} lang - 要設置的語言 ('tw', 'en', 'jp')
 */
function lang_set(lang) {
    // 更新 <body> class 以切換頁面主要內容
    document.body.classList.remove('lang_tw', 'lang_en', 'lang_jp');
    document.body.classList.add('lang_' + lang);

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
        btn.classList.remove('active');
    });
    document.querySelectorAll(`.langbtngroup a[href="javascript:lang_set('${lang}');"]`).forEach(btn => {
        btn.classList.add('active');
    });
    
    // 將選擇的語言存儲起來
    localStorage.setItem('preferredLanguage', lang);
}

// 當頁面加載時，自動應用已保存的語言設定
document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('preferredLanguage');
    const currentLang = savedLang || 'tw';
    const applyLanguage = function () {
        lang_set(currentLang);
    };
    if (typeof window.onLayoutReady === 'function') {
        window.onLayoutReady(applyLanguage);
    } else {
        applyLanguage();
    }
});
