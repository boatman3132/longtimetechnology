const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const fg = require('fast-glob');
const matter = require('gray-matter');

const ROOT_DIR = path.resolve(__dirname, '..');
const NEWS_DIR = path.join(ROOT_DIR, 'news');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'news-index.json');
const LANG_CODES = ['tw', 'cn', 'en', 'jp'];
const DEFAULT_TAGS = {
  tw: ['行業新聞'],
  cn: ['行业新闻'],
  en: ['Industry News'],
  jp: ['業界ニュース'],
};
const MIN_EXCERPT_LENGTH = 120;
const MAX_EXCERPT_LENGTH = 160;

function warn(message, error) {
  if (error) {
    console.warn(`[build-news-index] ${message}`, error);
  } else {
    console.warn(`[build-news-index] ${message}`);
  }
}

function extractMetaFromFilename(filename) {
  const base = path.basename(filename, '.md');
  const datePart = base.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new Error(`Invalid date prefix in filename "${filename}". Expected YYYY-MM-DD.`);
  }
  const rawTitle = base.slice(10).replace(/^[\s-_]+/, '');
  if (!rawTitle) {
    throw new Error(`Title missing in filename "${filename}". Expected format YYYY-MM-DDTitle.md.`);
  }
  return {
    date: datePart,
    title: rawTitle,
    slug: base,
  };
}

function stripMarkdown(input) {
  if (!input) return '';
  let text = input;
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]*`/g, ' ');
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  text = text.replace(/\[([^\]]+)\]\((?:[^()]+|\([^()]*\))*\)/g, '$1');
  text = text.replace(/[#>*_~`]/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&[a-zA-Z]+;/g, ' ');
  text = text.replace(/\r?\n/g, ' ');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

function buildExcerpt(content) {
  const plain = stripMarkdown(content);
  if (!plain) return '';
  const chars = Array.from(plain);
  let sliceLength;
  if (chars.length === 0) {
    return '';
  } else if (chars.length <= MIN_EXCERPT_LENGTH) {
    sliceLength = chars.length;
  } else {
    sliceLength = Math.min(MAX_EXCERPT_LENGTH, chars.length);
  }
  let excerpt = chars.slice(0, sliceLength).join('');
  excerpt = excerpt.replace(/[ \t]+$/g, '').replace(/[，,。！？!?；;:：、]+$/g, '');
  return `${excerpt.trim()}…`;
}

function cloneDefaultTags() {
  const result = {};
  LANG_CODES.forEach((lang) => {
    const defaults = DEFAULT_TAGS[lang] || [];
    result[lang] = defaults.slice();
  });
  return result;
}

function normalizeLocalizedStrings(raw, fallbackMap) {
  const result = {};
  LANG_CODES.forEach((lang) => {
    result[lang] = (fallbackMap && fallbackMap[lang]) || '';
  });
  if (!raw) {
    return result;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    LANG_CODES.forEach((lang) => {
      if (trimmed) {
        result[lang] = trimmed;
      }
    });
    return result;
  }
  if (typeof raw === 'object') {
    Object.keys(raw).forEach((key) => {
      const lang = key.toLowerCase();
      if (!LANG_CODES.includes(lang)) return;
      const value = raw[key];
      if (typeof value === 'string' && value.trim()) {
        result[lang] = value.trim();
      }
    });
    return result;
  }
  return result;
}

function normalizeLocalizedTags(value) {
  const result = cloneDefaultTags();
  if (!value) {
    return result;
  }

  function sanitizeTagArray(input) {
    if (!Array.isArray(input)) return [];
    return input
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    const tags = sanitizeTagArray(value);
    if (!tags.length) return result;
    LANG_CODES.forEach((lang) => {
      result[lang] = tags.slice();
    });
    return result;
  }

  if (typeof value === 'string' && value.trim()) {
    const rawTags = value.split(/[,、，]/g).map((tag) => tag.trim()).filter(Boolean);
    if (!rawTags.length) return result;
    LANG_CODES.forEach((lang) => {
      result[lang] = rawTags.slice();
    });
    return result;
  }

  if (typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      const lang = key.toLowerCase();
      if (!LANG_CODES.includes(lang)) return;
      const entry = value[key];
      if (Array.isArray(entry)) {
        const tags = sanitizeTagArray(entry);
        if (tags.length) {
          result[lang] = tags.slice();
        }
      } else if (typeof entry === 'string' && entry.trim()) {
        const tags = entry.split(/[,、，]/g).map((tag) => tag.trim()).filter(Boolean);
        if (tags.length) {
          result[lang] = tags.slice();
        }
      }
    });
    return result;
  }

  return result;
}

function pickLocalized(map, lang) {
  if (!map || typeof map !== 'object') return '';
  return map[lang] || map.tw || map.cn || map.en || map.jp || '';
}

function extractLanguageSections(content) {
  const sections = {};
  if (!content) {
    sections.tw = '';
    return sections;
  }

  const pattern = /<!--\s*lang:([a-z]{2})\s*-->/gi;
  let match;
  let currentLang = null;
  let lastIndex = 0;
  while ((match = pattern.exec(content)) !== null) {
    const langCandidate = match[1].toLowerCase();
    const segment = content.slice(lastIndex, match.index);
    if (currentLang) {
      sections[currentLang] = (sections[currentLang] || '') + segment;
    } else if (segment.trim()) {
      sections.tw = (sections.tw || '') + segment;
    }
    currentLang = LANG_CODES.includes(langCandidate) ? langCandidate : null;
    lastIndex = pattern.lastIndex;
  }

  const remainder = content.slice(lastIndex);
  if (currentLang) {
    sections[currentLang] = (sections[currentLang] || '') + remainder;
  } else if (remainder.trim()) {
    sections.tw = (sections.tw || '') + remainder;
  }

  if (!Object.keys(sections).length) {
    sections.tw = content;
  }

  Object.keys(sections).forEach((lang) => {
    sections[lang] = sections[lang].trim();
  });

  return sections;
}

function resolveImagePath(rawValue, sourceFile) {
  if (!rawValue || typeof rawValue !== 'string') {
    return '';
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }
  const normalized = trimmed.replace(/\\/g, '/');
  if (/^(?:https?:)?\/\//i.test(normalized)) {
    return normalized;
  }
  let candidate = normalized;
  if (candidate.startsWith('/')) {
    candidate = candidate.replace(/^\/+/, '');
  }
  if (!candidate.startsWith('news/photo/')) {
    candidate = path.posix.join('news/photo', candidate.replace(/^\.?\//, ''));
  }
  const diskPath = path.join(ROOT_DIR, candidate);
  if (!fs.existsSync(diskPath)) {
    warn(`Referenced image "${candidate}" in "${sourceFile}" not found. Ensure images are stored under /news/photo/.`);
  }
  return candidate;
}

function normalizeImageList(rawValue, sourceFile) {
  const list = [];

  function append(value) {
    const resolved = resolveImagePath(value, sourceFile);
    if (resolved && !list.includes(resolved)) {
      list.push(resolved);
    }
  }

  if (Array.isArray(rawValue)) {
    rawValue.forEach((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        append(entry);
      }
    });
  } else if (typeof rawValue === 'string' && rawValue.trim()) {
    append(rawValue);
  }

  return list;
}

async function collectNewsEntries() {
  const patterns = ['**/*.md', '*.md'];
  const files = await fg(patterns, {
    cwd: NEWS_DIR,
    onlyFiles: true,
    dot: false,
    followSymbolicLinks: false,
  });
  if (!files.length) {
    warn('No markdown files found under /news. Output will be empty.');
    return [];
  }
  const results = [];
  for (const relativePath of files) {
    const diskPath = path.join(NEWS_DIR, relativePath);
    let raw;
    try {
      raw = await fsp.readFile(diskPath, 'utf8');
    } catch (err) {
      warn(`Unable to read file "${relativePath}". Skipping.`, err);
      continue;
    }
    let meta;
    try {
      meta = extractMetaFromFilename(relativePath);
    } catch (err) {
      warn(err.message);
      continue;
    }
    let parsed;
    try {
      parsed = matter(raw);
    } catch (err) {
      warn(`Failed to parse frontmatter in "${relativePath}". Skipping.`, err);
      continue;
    }
    const titleFallback = {};
    LANG_CODES.forEach((lang) => {
      titleFallback[lang] = meta.title;
    });
    const titles = normalizeLocalizedStrings(parsed.data.titles || parsed.data.title, titleFallback);
    const tagsByLang = normalizeLocalizedTags(parsed.data.tags);
    const images = normalizeImageList(parsed.data.images, relativePath);
    if (typeof parsed.data.image === 'string' && parsed.data.image.trim()) {
      const singleImage = resolveImagePath(parsed.data.image, relativePath);
      if (singleImage && !images.includes(singleImage)) {
        images.unshift(singleImage);
      }
    }
    const filteredImages = images.filter(Boolean);
    const image = filteredImages[0] || '';
    const contentByLang = extractLanguageSections(parsed.content);
    const excerpts = {};
    LANG_CODES.forEach((lang) => {
      const source = contentByLang[lang] || contentByLang.tw || '';
      const excerpt = buildExcerpt(source);
      if (!excerpt && lang === 'tw') {
        warn(`Excerpt for "${relativePath}" is empty. Consider adding content.`);
      }
      excerpts[lang] = excerpt;
    });
    results.push({
      title: titles.tw,
      titles,
      date: meta.date,
      tags: tagsByLang.tw,
      tagsByLang,
      image,
      images: filteredImages,
      slug: meta.slug,
      url: path.posix.join('news', `${meta.slug}.md`),
      permalink: `news/detail/?slug=${encodeURIComponent(meta.slug)}`,
      excerpt: excerpts.tw,
      excerpts,
    });
  }
  return results;
}

function sortEntries(entries) {
  return entries.sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    if (a.slug < b.slug) return 1;
    if (a.slug > b.slug) return -1;
    return 0;
  });
}

async function writeOutput(entries) {
  await fsp.mkdir(DIST_DIR, { recursive: true });
  await fsp.writeFile(OUTPUT_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

async function build() {
  const entries = await collectNewsEntries();
  const sorted = sortEntries(entries);
  await writeOutput(sorted);
  console.log(`[build-news-index] Generated ${sorted.length} entr${sorted.length === 1 ? 'y' : 'ies'} at dist/news-index.json`);
}

async function main() {
  try {
    await build();
  } catch (err) {
    console.error('[build-news-index] Failed to build news index.', err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  if (!fs.existsSync(NEWS_DIR)) {
    warn(`News directory not found at ${NEWS_DIR}`);
  }
  main();
}

module.exports = {
  build,
};
