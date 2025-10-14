# 長天科技官網建置筆記

## 最新消息內容維護流程
- 新文章請放在 `news/` 目錄，檔名格式：`YYYY-MM-DD標題.md`（例：`2025-10-13AI 新創融資.md`）。
- 發佈日期仍由檔名前 10 個字推導，slug 亦延續檔名。
- Frontmatter 需描述多語資訊（YAML 語法）：
  - `titles`: 物件，鍵為 `tw` / `cn` / `en` / `jp`，值為各語言標題。
  - `tags`: 物件，鍵為語言代碼，值為字串陣列；未填則預設為「行業新聞 / 行业新闻 / Industry News / 業界ニュース」。
  - `image`: 可選，縮圖相對路徑（例：`dist/news/covers/ai-news.jpg`）。
- 內文需以語言標記區塊撰寫，每段以前後各一行的 `<!-- lang:xx -->` 起始，後接該語言的 Markdown 內容：

```markdown
---
titles:
  tw: "AI 新創融資"
  cn: "AI 新创融资"
  en: "AI Startup Funding"
  jp: "AIスタートアップ資金調達"
tags:
  tw: ["行業新聞"]
  cn: ["行业新闻"]
  en: ["Industry News"]
  jp: ["業界ニュース"]
image: "dist/news/covers/ai-news.jpg"
---
<!-- lang:tw -->
繁體中文版 Markdown 內容…

<!-- lang:cn -->
简体中文版 Markdown 內容…

<!-- lang:en -->
English Markdown content…

<!-- lang:jp -->
日本語の Markdown コンテンツ…
```

- 若某語言區塊暫時缺席，可保留標記並視需求補上內容；前台會自動回退顯示繁中版本。

## 建置腳本
- 指令：`npm run build:news`（執行 `scripts/build-news-index.js`）。
- 功能：
  - 以 `fast-glob` 掃描 `news/**/*.md`，並解析多語 Frontmatter 與內容區段。
  - 依日期（新→舊）及 slug 反向排序，輸出 `dist/news-index.json`。
  - 索引物件包含 `titles`、`tagsByLang`、`excerpts` 等多語欄位，前台自動依目前語系顯示對應文字。
  - 自動建立 `dist/` 目錄並覆寫舊索引；遇到格式錯誤會略過該檔並在終端機警示。
- 先執行 `npm install` 確保依賴（`fast-glob`, `gray-matter`）存在。

## CI / Deploy 整合
- 在正式建置或部署之前插入 `npm run build:news`，確保最新索引寫入 `dist/news-index.json`。
- GitHub Actions 範例：

```yaml
- name: Install dependencies
  run: npm install

- name: Generate news index
  run: npm run build:news

- name: Build / Deploy
  run: npm run build
```

## 本機驗證步驟
- 於 `news/` 建立三篇測試 Markdown（包含中文、空白、符號），至少兩個日期需相同，用以確認排序規則。
- 執行 `npm run build:news`，檢查 `dist/news-index.json`：
  - 陣列是否依日期新→舊排序，且同日 slug 採反向字典序。
  - 確認 `titles`、`tagsByLang`、`excerpts` 皆包含四語資料（若語段缺少將以繁中備援）。
  - `slug`、`permalink`、`url` 是否正確，`excerpts.*` 內容為單行純文字。
- 啟動靜態伺服器（如 `npx serve .`）瀏覽：
  - `news.html` 切換語系時應重繪列表，顯示對應語言標題／摘要／標籤。
  - 點擊任一項目跳轉 `news-detail.html?slug=...`，詳情頁會讀取 `.md` 中對應語言段落，語系切換時內容同步更新。
- 新增或刪除 Markdown 後重新執行 `npm run build:news`，確認清單與詳情頁同步更新。

## 常見問題排除
- **Module not found**：未執行 `npm install` 或 `node_modules` 缺少套件。請重新安裝依賴後再跑腳本。
- **檔名格式錯誤**：未遵守 `YYYY-MM-DD` 前綴會被跳過，終端機可見警示。
- **摘要異常**：某語言段落過短或缺少標記會影響 `excerpts`；請確認對應 `<!-- lang:xx -->` 區塊的內容長度與格式。
- **詳情頁顯示失敗**：檢查網址中的 `slug` 是否正確、檔案是否存在，以及靜態伺服器是否允許讀取 `news/*.md` 檔案。
- **語言未更新**：若切換語系後仍顯示原文，確認 `language-switcher.js` 是否載入以及 `news.html`、`news-detail.html` 是否有加入最新腳本。
