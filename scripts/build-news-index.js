const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const fg = require('fast-glob');
const matter = require('gray-matter');

const ROOT_DIR = path.resolve(__dirname, '..');
const NEWS_DIR = path.join(ROOT_DIR, 'news');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'news-index.json');
const DEFAULT_TAGS = ['行業新聞'];
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

function normalizeTags(value) {
  if (!value) return DEFAULT_TAGS.slice();
  if (Array.isArray(value)) {
    const filtered = value
      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
      .filter(Boolean);
    return filtered.length ? filtered : DEFAULT_TAGS.slice();
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return DEFAULT_TAGS.slice();
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
    const tags = normalizeTags(parsed.data.tags);
    const image = typeof parsed.data.image === 'string' ? parsed.data.image.trim() : '';
    const excerpt = buildExcerpt(parsed.content);
    if (!excerpt) {
      warn(`Excerpt for "${relativePath}" is empty. Consider adding content.`);
    }
    results.push({
      title: meta.title,
      date: meta.date,
      tags,
      image,
      slug: meta.slug,
      url: path.posix.join('news', `${meta.slug}.md`),
      permalink: `news-detail.html?slug=${encodeURIComponent(meta.slug)}`,
      excerpt,
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
